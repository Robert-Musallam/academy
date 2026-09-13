import { NextResponse } from 'next/server';
import { z } from 'zod';
import { actor, sameOrigin } from '@/lib/training/access';
import { allowed, touch } from '@/lib/training/progress';
import { rows } from '@/lib/training/db';
import { DatabaseSimStore } from '@/lib/sim/database';
import { SimEngine, publicRun } from '@/lib/sim/engine';
import { personaSchema } from '@/lib/sim/schema';
import { configuredProvider } from '@/lib/llm/provider';
import type { Roster, SimRow } from '@/lib/training/types';
const schema = z.discriminatedUnion('action', [
  z
    .object({
      action: z.literal('start'),
      persona: z.string(),
      scenario: z.string(),
    })
    .strict(),
  z
    .object({
      action: z.literal('send'),
      id: z.uuid(),
      text: z.string().trim().min(1).max(4000),
    })
    .strict(),
  z.object({ action: z.literal('end'), id: z.uuid() }).strict(),
]);
async function history(m: Roster, store: DatabaseSimStore) {
  const runs = (
    await rows<SimRow>('sim_runs', { roster_id: m.id, tenant_id: m.tenant_id })
  ).sort((a, b) => a.started_at.localeCompare(b.started_at));
  return Promise.all(
    runs.map(async (r) => publicRun(await store.get(m.id, r.id))),
  );
}
export async function GET() {
  const m = await actor();
  await allowed(m, 'simulator');
  return NextResponse.json({
    history: await history(m, new DatabaseSimStore()),
  });
}
export async function POST(request: Request) {
  const m = await actor();
  try {
    await sameOrigin(request);
    const mod = await allowed(m, 'simulator'),
      input = schema.parse(await request.json()),
      store = new DatabaseSimStore(),
      engine = new SimEngine(store, configuredProvider());
    let run;
    if (input.action === 'start') {
      const p = (
        await rows<{ brief: unknown }>('personas', {
          slug: input.persona,
          tenant_id: m.tenant_id,
          track_id: m.track_id,
        })
      )[0];
      if (!p) throw new Error('Homeowner unavailable');
      run = publicRun(
        await engine.start(m.id, personaSchema.parse(p.brief), input.scenario),
      );
    } else if (input.action === 'send')
      run = await engine.send(m.id, input.id, input.text);
    else run = await engine.end(m.id, input.id);
    await touch(m, mod.id);
    return NextResponse.json({ run, history: await history(m, store) });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Appointment unavailable' },
      { status: 400 },
    );
  }
}
