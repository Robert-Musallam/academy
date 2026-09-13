import Link from 'next/link';
import { notFound } from 'next/navigation';
import { actor } from '@/lib/training/access';
import { allowed } from '@/lib/training/progress';
import { course } from '@/lib/training/learning';
import { Assessment } from '@/components/training/assessment';
import key from '@/content/rnb/sales-design-consultant/measurement/diagram-exercise/answer-key.json';
export default async function ModulePage({
  params,
}: {
  params: Promise<{ module: string }>;
}) {
  const member = await actor(),
    { module: slug } = await params;
  const m = await allowed(member, slug).catch(() => notFound()),
    content = await course(member, m);
  return (
    <>
      <p className="training-status">
        Module {m.position} · {m.status}
      </p>
      <h1>{m.title}</h1>
      <section className="training-card">
        <h2>Your lessons</h2>
        {content.lessons
          .filter((l) => !l.draft)
          .map((l) => (
            <p key={l.slug}>
              <Link href={`/learn/${slug}/${l.slug}`}>{l.title} →</Link>{' '}
              <small>{l.estimated_minutes} min</small>
            </p>
          ))}
      </section>
      {m.position <= 5 && (
        <>
          <Assessment module={slug} quiz="exam" />
          <Assessment
            module={slug}
            prompt={
              content.quizzes.find((q) => q.slug === 'freetext')?.data
                .questions[0].prompt
            }
          />
        </>
      )}
      {m.position >= 6 && (
        <Assessment
          module={slug}
          prompt={
            content.quizzes.find((q) => q.slug === 'freetext')?.data
              .questions[0].prompt
          }
        />
      )}
      {m.position === 3 && (
        <>
          <Link
            className="text-link"
            href="/learn/measurement/diagram-exercise"
          >
            Read the sample diagram and assumptions →
          </Link>
          <Assessment module={slug} diagram={Object.keys(key.metrics)} />
        </>
      )}
      {m.position === 6 && (
        <section className="training-card">
          <h2>Explore, then practice the appointment.</h2>
          <p>
            <Link href="/learn/field-lab">Enter the 3D field lab →</Link>
          </p>
          <p>
            <Link href="/sim">Choose a homeowner appointment →</Link>
          </p>
          <p>
            Pass one appointment in each tier: warm, standard and hard.
            Field-lab scores are separate learning feedback.
          </p>
        </section>
      )}
      {m.position === 7 && (
        <section className="training-card">
          <h2>Apply it in the field.</h2>
          <p>
            Your manager completes the ride-along, Day 5 evaluation and HCP
            exercise sign-off. All three are required.
          </p>
        </section>
      )}
    </>
  );
}
