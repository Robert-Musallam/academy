import { actor } from '@/lib/training/access';
import { rows } from '@/lib/training/db';
import type { Attempt, FreeAttempt, Module } from '@/lib/training/types';
export default async function History() {
  const m = await actor();
  const [attempts, free, modules] = await Promise.all([
    rows<Attempt>('quiz_attempts', { roster_id: m.id, tenant_id: m.tenant_id }),
    rows<FreeAttempt>('freetext_attempts', {
      roster_id: m.id,
      tenant_id: m.tenant_id,
    }),
    rows<Module>('modules', { track_id: m.track_id, tenant_id: m.tenant_id }),
  ]);
  return (
    <>
      <h1>Your practice history</h1>
      <p>
        <a className="text-link" href="/sim">
          Appointment history →
        </a>
      </p>
      {attempts
        .sort((a, b) => b.started_at.localeCompare(a.started_at))
        .map((a) => (
          <section className="training-card" key={a.id}>
            <h2>{modules.find((m) => m.id === a.module_id)?.title}</h2>
            <p>
              {a.completed_at
                ? `${Number(a.score_percent)}% · ${a.passed ? 'Passed' : 'Practice again'}`
                : 'Unfinished attempt'}{' '}
              · {new Date(a.started_at).toLocaleDateString('en-US')}
            </p>
          </section>
        ))}
      {free.map((a) => (
        <section className="training-card" key={a.id}>
          <h2>
            Written explanation · {a.passed ? 'Passed' : 'Practice again'}
          </h2>
          <p>{a.answer}</p>
          <p>{a.feedback}</p>
        </section>
      ))}
    </>
  );
}
