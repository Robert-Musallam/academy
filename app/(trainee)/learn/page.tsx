import Link from 'next/link';
import { actor } from '@/lib/training/access';
import { overview } from '@/lib/training/progress';
export default async function Dashboard() {
  const member = await actor(),
    state = await overview(member);
  return (
    <>
      <p className="training-status">Learn · Practice · Apply</p>
      <h1>Your path to confident consultations.</h1>
      <p>
        {member.email} ·{' '}
        {state.modules.filter((m) => m.status === 'passed').length} of{' '}
        {state.modules.length} modules passed
      </p>
      {!state.modules.length && (
        <p>Your manager will assign a training track.</p>
      )}
      <div className="training-grid">
        {state.modules.map((m) => (
          <section key={m.id} className="training-card" aria-label={m.title}>
            <span className="training-status">
              Module {m.position} · {m.status}
            </span>
            <h2>{m.title}</h2>
            {m.status === 'locked' ? (
              <p>Pass Module {m.position - 1} to unlock.</p>
            ) : (
              <Link href={`/learn/${m.slug}`}>Open module →</Link>
            )}
          </section>
        ))}
      </div>
    </>
  );
}
