import Link from 'next/link';
import { actor } from '@/lib/training/access';
import { rows } from '@/lib/training/db';
import { overview } from '@/lib/training/progress';
import type { Roster, Attempt } from '@/lib/training/types';
export default async function Manager() {
  const caller = await actor('manager');
  const roster = await rows<Roster>(
    'roster',
    caller.role === 'admin'
      ? { role: 'trainee', active: true }
      : { tenant_id: caller.tenant_id, role: 'trainee', active: true },
  );
  const members = await Promise.all(
    roster.map(async (m) => ({
      member: m,
      state: await overview(m),
      attempts: await rows<Attempt>('quiz_attempts', {
        roster_id: m.id,
        tenant_id: m.tenant_id,
      }),
    })),
  );
  return (
    <>
      <p className="training-status">Coach the next step</p>
      <h1>Your training team</h1>
      <p>Module progress, assessment results and appointments in one place.</p>
      {!members.length && <p>No active trainees in this tenant.</p>}
      {members.map(({ member: m, state, attempts }) => (
        <section key={m.id} className="training-card">
          <h2>
            <Link href={`/manager/${m.id}`}>{m.email}</Link>
          </h2>
          <p>
            {state.modules.filter((m) => m.status === 'passed').length}/7
            modules passed · Best quiz score:{' '}
            {attempts.some((a) => a.score_percent !== null)
              ? `${Math.max(...attempts.map((a) => Number(a.score_percent ?? 0)))}%`
              : 'No attempts'}
          </p>
          <p>
            {state.modules.map((m) => `${m.position}: ${m.status}`).join(' · ')}
          </p>
          <p>
            {(['warm', 'standard', 'hard'] as const)
              .map(
                (t) =>
                  `${t}: ${state.runs.filter((r) => r.tier === t).length} runs, ${state.runs.filter((r) => r.tier === t && state.grades.some((g) => g.sim_run_id === r.id && g.passed)).length} passed`,
              )
              .join(' · ')}
          </p>
          <Link href={`/manager/${m.id}`}>
            Review results and evaluations →
          </Link>
        </section>
      ))}
    </>
  );
}
