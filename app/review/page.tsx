import Link from 'next/link';
import { notFound } from 'next/navigation';
import { loadContent } from '@/lib/content/loader';
import { renderLesson } from '@/lib/content/render';
import answerKey from '@/content/rnb/sales-design-consultant/measurement/diagram-exercise/answer-key.json';

export const dynamic = 'force-dynamic';

export default async function ReviewPage({
  searchParams,
}: {
  searchParams: Promise<{ module?: string; lesson?: string }>;
}) {
  // Review-only surface. It must never serve draft content in a deployment.
  if (process.env.NODE_ENV !== 'development') notFound();
  const modules = loadContent();
  const selected = await searchParams;
  const selectedModule =
    modules.find((m) => m.slug === selected.module) ?? modules[0];
  const lesson =
    selectedModule.lessons.find((l) => l.slug === selected.lesson) ??
    selectedModule.lessons[0];
  const check = selectedModule.quizzes.find(
    (q) => q.lessonSlug === lesson.slug,
  );
  const exam = selectedModule.quizzes.find((q) => q.data.kind === 'exam');
  const reflection = selectedModule.quizzes.find(
    (q) => q.data.kind === 'freetext',
  );
  const source = lesson.source_sheet.match(
    /content\/source\/([A-Za-z0-9_.-]+)/,
  )?.[1];
  const href = (m: string, l: string) => `/review?module=${m}&lesson=${l}`;
  return (
    <div className="min-h-screen">
      <header className="border-b border-stone-300 bg-emerald-950 px-6 py-6 text-white">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-emerald-200">
              Rock N Block · Academy
            </p>
            <h1 className="mt-1 text-2xl font-bold">Content review</h1>
          </div>
          <p className="text-sm text-emerald-100">
            Approved content · 7 modules · 33 lessons · 0 drafts
          </p>
        </div>
      </header>
      <div className="mx-auto max-w-7xl px-6 pt-6">
        <section
          aria-label="Review checklist"
          className="rounded-lg border border-amber-300 bg-amber-50 p-5"
        >
          <h2 className="font-bold">Content approved with your corrections</h2>
          <p className="mt-2 text-sm leading-relaxed">
            All 33 lessons are published. Warranty terms, territory-dependent
            base materials, and adjustable drop caps reflect your September 13
            edits. Original sheets are retained as historical source references.
          </p>
          <Link
            className="mt-3 inline-block font-semibold underline"
            href="/review/simulator"
          >
            Try the simulator preview →
          </Link>
          <div className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-sm font-semibold underline underline-offset-4">
            <Link href={href('foundations', 'pre-appointment-prep')}>
              Prep checklist
            </Link>
            <Link href={href('closing', 'presenting-the-price')}>
              Presenting the price
            </Link>
            <Link href={href('closing', 'same-day-drop-and-financing')}>
              Drop & financing
            </Link>
            <Link href={href('closing', 'exit-script')}>Exit script</Link>
            <Link href={href('measurement', 'diagram-exercise')}>
              Diagram key
            </Link>
          </div>
        </section>
      </div>
      <div className="mx-auto grid max-w-7xl gap-8 px-6 py-8 lg:grid-cols-[260px_minmax(0,1fr)]">
        <nav aria-label="Modules and lessons" className="space-y-5 text-sm">
          {modules.map((m) => (
            <section key={m.slug}>
              <h2 className="mb-2 font-bold">
                {m.order}. {m.title}
              </h2>
              <ul className="space-y-1">
                {m.lessons.map((l) => (
                  <li key={l.slug}>
                    <Link
                      href={href(m.slug, l.slug)}
                      aria-current={
                        l.slug === lesson.slug && m.slug === selectedModule.slug
                          ? 'page'
                          : undefined
                      }
                      className={`block rounded px-3 py-2 ${l.slug === lesson.slug && m.slug === selectedModule.slug ? 'bg-emerald-900 text-white' : 'hover:bg-stone-200'}`}
                    >
                      {l.title}
                      {l.draft && (
                        <span className="ml-2 text-xs font-bold">DRAFT</span>
                      )}
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </nav>
        <main className="min-w-0 rounded-lg border border-stone-200 bg-white p-6 shadow-sm sm:p-10">
          <p className="text-xs font-semibold uppercase tracking-widest text-stone-500">
            Module {selectedModule.order} · {lesson.estimated_minutes} minutes ·{' '}
            {lesson.draft
              ? 'Draft — approval required'
              : 'Source transcription'}
          </p>
          <h2 className="mt-3 text-3xl font-bold tracking-tight">
            {lesson.title}
          </h2>
          <p className="mt-3 break-words text-xs leading-relaxed text-stone-500">
            {lesson.source_sheet}
          </p>
          {source && (
            <a
              className="mt-3 inline-block text-sm font-semibold underline"
              href={`/review/source/${source}`}
              target="_blank"
              rel="noreferrer"
            >
              Open original source sheet ↗
            </a>
          )}
          <article className="lesson-content mt-8">
            {await renderLesson(lesson, true)}
          </article>
          {lesson.slug === 'diagram-exercise' && (
            <section className="mt-8 rounded border border-amber-400 bg-amber-50 p-5">
              <h3 className="text-xl font-bold">Approved answer key</h3>
              <p className="my-3 text-sm leading-relaxed">
                {answerKey.model}. The PNG arrows may include the top border in
                their 13-foot measurement. The accepted model and alternate
                interpretations are documented in docs/DIAGRAM_ASSUMPTIONS.md.
              </p>
              <dl className="grid grid-cols-[1fr_auto] gap-x-5 gap-y-2 text-sm">
                {Object.entries(answerKey.metrics).map(([name, metric]) => (
                  <div key={name} className="contents">
                    <dt>{name.replaceAll('_', ' ')}</dt>
                    <dd className="font-semibold">
                      {metric.value} {metric.unit}
                    </dd>
                  </div>
                ))}
              </dl>
            </section>
          )}
          {check && (
            <section className="mt-10 border-t pt-6">
              <h3 className="text-xl font-bold">
                Lesson check · informational only
              </h3>
              <ol className="mt-5 space-y-6">
                {check.data.questions.map((q, i) => (
                  <li key={q.id}>
                    <p className="font-semibold">
                      {i + 1}. {q.prompt}
                    </p>
                    <ul className="mt-2 space-y-1 text-sm">
                      {q.options.map((o, j) => (
                        <li key={j}>
                          {j === q.correct_answer ? '✓' : '○'} {o}
                        </li>
                      ))}
                    </ul>
                    <p className="mt-2 text-xs text-stone-500">
                      Source: {q.source_quote}
                    </p>
                  </li>
                ))}
              </ol>
            </section>
          )}
          {exam && (
            <details className="mt-8 border-t pt-5">
              <summary className="cursor-pointer font-bold">
                Module exam pool · {exam.data.questions.length} questions · 10
                drawn · 90% pass
              </summary>
              <ol className="mt-5 space-y-4">
                {exam.data.questions.map((q, i) => (
                  <li key={q.id} className="text-sm">
                    <p className="font-semibold">
                      {i + 1}. {q.prompt}
                    </p>
                    <p>Answer: {q.options[Number(q.correct_answer)]}</p>
                    <p className="text-xs text-stone-500">
                      {q.source_reference}: {q.source_quote}
                    </p>
                  </li>
                ))}
              </ol>
            </details>
          )}
          {reflection && (
            <details className="mt-6 border-t pt-5">
              <summary className="cursor-pointer font-bold">
                Free-text prompt and rubric
              </summary>
              <p className="my-4">{reflection.data.questions[0].prompt}</p>
              <ul className="list-disc space-y-2 pl-5 text-sm">
                {reflection.data.questions[0].rubric?.criteria.map((c) => (
                  <li key={c}>{c}</li>
                ))}
              </ul>
              <p className="mt-4 text-sm">
                {reflection.data.questions[0].rubric?.pass_rule}
              </p>
            </details>
          )}
        </main>
      </div>
    </div>
  );
}
