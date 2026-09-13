import 'server-only';
import { compileMDX } from 'next-mdx-remote/rsc';
import { PhrasesToUse, WhyItMatters } from '@/components/content/callouts';

export async function renderLesson(
  lesson: { draft: boolean; body: string },
  preview = false,
) {
  if (lesson.draft && !preview)
    throw new Error('Draft lessons are unavailable to trainees');
  return (
    await compileMDX({
      source: lesson.body,
      components: { PhrasesToUse, WhyItMatters },
    })
  ).content;
}
