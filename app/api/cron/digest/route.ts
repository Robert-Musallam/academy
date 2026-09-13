import { NextResponse } from 'next/server';
import { rows, rpc, write } from '@/lib/training/db';
import { buildDigest, scheduledNow } from '@/lib/digest/build';
import { authorized, deliverDigest } from '@/lib/digest/delivery';
import type {
  Roster,
  Progress,
  Module,
  SimRow,
  GradeRow,
} from '@/lib/training/types';
export const dynamic = 'force-dynamic';
export async function GET(request: Request) {
  if (
    !authorized(request.headers.get('authorization'), process.env.CRON_SECRET)
  )
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const url = new URL(request.url),
    dryRun = url.searchParams.get('dry-run') === '1',
    manual = url.searchParams.get('manual') === '1',
    now = new Date();
  if (!dryRun && !manual && !scheduledNow(now))
    return NextResponse.json({
      skipped: 'Outside Monday 07:00 America/Denver',
    });
  try {
    // v1 webhook belongs to RNB. Never send another tenant's records into it.
    const tenant = (
      await rows<{ id: string; name: string }>('tenants', { slug: 'rnb' })
    )[0];
    const [members, progress, modules, runs, grades] = await Promise.all([
      rows<Roster>('roster', {
        tenant_id: tenant.id,
        role: 'trainee',
        active: true,
      }),
      rows<Progress & { started_at: string | null }>('module_progress', {
        tenant_id: tenant.id,
      }),
      rows<Module>('modules', { tenant_id: tenant.id }),
      rows<SimRow>('sim_runs', { tenant_id: tenant.id }),
      rows<GradeRow>('sim_grades', { tenant_id: tenant.id }),
    ]);
    const { week, payload } = buildDigest(
      tenant.name,
      members.map((m) => {
        const p = progress.filter((p) => p.roster_id === m.id);
        return {
          id: m.id,
          email: m.email,
          created_at: m.created_at,
          activity: p.map((p) => p.last_activity_at),
          started: p.flatMap((p) => (p.started_at ? [p.started_at] : [])),
          passes: p
            .filter((p) => p.passed_at)
            .map((p) => ({
              title:
                modules.find((m) => m.id === p.module_id)?.title ?? 'Module',
              at: p.passed_at!,
            })),
          sims: runs
            .filter(
              (r) =>
                r.roster_id === m.id &&
                r.ended_at &&
                grades.some((g) => g.sim_run_id === r.id && g.passed),
            )
            .map((r) => ({ tier: r.tier, at: r.ended_at! })),
        };
      }),
      now,
    );
    const result = await deliverDigest(
      payload,
      {
        claim: () =>
          rpc<string | null>('academy_digest_claim', {
            p_tenant: tenant.id,
            p_week: week.start,
            p_payload: payload,
          }),
        post: async (body) => {
          const webhook = process.env.TEAMS_WEBHOOK_URL;
          if (!webhook || new URL(webhook).protocol !== 'https:')
            throw new Error('Webhook unavailable');
          const response = await fetch(webhook, {
            method: 'POST',
            redirect: 'error',
            signal: AbortSignal.timeout(15000),
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
          });
          if (!response.ok) throw new Error('Teams rejected delivery');
        },
        finish: async (id, status) => {
          await write(
            'digest_log',
            {
              status,
              sent_at: status === 'sent' ? new Date().toISOString() : null,
              error_summary:
                status === 'failed'
                  ? 'Delivery or acknowledgement failed; check Teams before retrying.'
                  : null,
            },
            { id, tenant_id: tenant.id },
          );
        },
      },
      dryRun,
    );
    return NextResponse.json(result, {
      headers: { 'Cache-Control': 'no-store' },
    });
  } catch {
    return NextResponse.json(
      { error: 'Digest unavailable. Check configuration and delivery logs.' },
      { status: 502 },
    );
  }
}
