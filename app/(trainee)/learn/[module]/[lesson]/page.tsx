import Link from 'next/link';
import { notFound } from 'next/navigation';
import { actor } from '@/lib/training/access';
import { allowed } from '@/lib/training/progress';
import { course } from '@/lib/training/learning';
import { renderLesson } from '@/lib/content/render';
import { Assessment } from '@/components/training/assessment';
export default async function LessonPage({
  params,
}: {
  params: Promise<{ module: string; lesson: string }>;
}) {
  const member = await actor(),
    { module: slug, lesson: ls } = await params;
  const m = await allowed(member, slug).catch(() => notFound()),
    content = await course(member, m);
  const lesson = content.lessons.find((l) => l.slug === ls && !l.draft);
  if (!lesson) notFound();
  return (
    <>
      <Link className="text-link" href={`/learn/${slug}`}>
        ← {m.title}
      </Link>
      <h1 className="mt-8">{lesson.title}</h1>
      <article className="lesson-body">{await renderLesson(lesson)}</article>
      {ls === 'diagram-exercise' && (
        <img
          src="/learn/diagram-image"
          alt="Sample measurement diagram with labeled turf, rock and paver dimensions"
        />
      )}
      <Assessment module={slug} quiz={`${ls}-check`} />
    </>
  );
}
