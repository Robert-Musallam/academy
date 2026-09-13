import { notFound } from 'next/navigation';
import { tenantTarget } from '@/lib/training/access';
import { overview } from '@/lib/training/progress';
import { rows } from '@/lib/training/db';
import type { Attempt, FreeAttempt } from '@/lib/training/types';
import { Evaluation } from '@/components/manager/evaluation';
import { saveEvaluation } from './actions';
export default async function Detail({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ saved?: string; error?: string }>;
}) {
  const { id } = await params;
  const { target } = await tenantTarget(id).catch(() => notFound());
  const state = await overview(target),
    status = await searchParams;
  const [attempts, free] = await Promise.all([
    rows<Attempt>('quiz_attempts', {
      roster_id: id,
      tenant_id: target.tenant_id,
    }),
    rows<FreeAttempt>('freetext_attempts', {
      roster_id: id,
      tenant_id: target.tenant_id,
    }),
  ]);
  return (
    <>
      <h1>{target.email}</h1>
      {status.saved && <p role="status">Evaluation saved.</p>}
      {status.error && (
        <p role="alert">
          Unable to save. Check required ratings, the trainee’s module access
          and your tenant membership.
        </p>
      )}
      <section className="training-card">
        <h2>Training progress</h2>
        {state.modules.map((m) => (
          <p key={m.id}>
            M{m.position} {m.title}: <strong>{m.status}</strong>
          </p>
        ))}
      </section>
      <section className="training-card">
        <h2>Quiz attempts</h2>
        {attempts.map((a) => (
          <p key={a.id}>
            {state.modules.find((m) => m.id === a.module_id)?.title}:{' '}
            {a.completed_at ? `${Number(a.score_percent)}%` : 'Unfinished'}
          </p>
        ))}
        <h2>Written explanations</h2>
        {free.map((a) => (
          <div key={a.id}>
            <p>{a.answer}</p>
            <p>
              {a.feedback} · {a.passed ? 'Passed' : 'Practice again'}
            </p>
          </div>
        ))}
      </section>
      <section className="training-card">
        <h2>Appointment results</h2>
        {state.runs.map((r) => {
          const g = state.grades.find((g) => g.sim_run_id === r.id);
          return (
            <details key={r.id}>
              <summary>
                {r.tier}:{' '}
                {g
                  ? `${Number(g.total_score)}/100 · ${g.passed ? 'Passed' : 'Practice again'}`
                  : `${r.turn_count} turns · ${r.status}`}
              </summary>
              {g?.grade.dimensions && (
                <>
                  <p>{g.grade.done_well}</p>
                  {Object.entries(g.grade.dimensions).map(([key, d]) => (
                    <p key={key}>
                      {key}: {d.score} — {d.reason}
                    </p>
                  ))}
                  {g.grade.fixes.map((f, i) => (
                    <p key={i}>
                      “{f.quote}” → {f.suggestion}
                    </p>
                  ))}
                </>
              )}
            </details>
          );
        })}
      </section>
      {(['ride_along', 'day5_eval', 'hcp_exercise'] as const).map((type) => (
        <Evaluation
          key={type}
          type={type}
          existing={state.forms.find((f) => f.type === type)}
          action={saveEvaluation.bind(null, id)}
        />
      ))}
    </>
  );
}
