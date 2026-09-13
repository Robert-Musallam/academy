import { it, expect } from 'vitest';
import { loadContent, traineeLessons } from '@/lib/content/loader';
import { frontmatterSchema, quizSchema } from '@/lib/content/schemas';

it('loads valid frontmatter and excludes drafts from trainee lessons', () => {
  const modules = loadContent('tests/fixtures/content');
  expect(modules).toHaveLength(1);
  expect(modules[0].lessons).toHaveLength(1);
  expect(traineeLessons(modules[0])).toEqual([]);
});
it('rejects missing draft flags and undersized exam pools', () => {
  expect(
    frontmatterSchema.safeParse({
      title: 'Example',
      order: 1,
      estimated_minutes: 2,
      source_sheet: 'A1',
    }).success,
  ).toBe(false);
  expect(
    quizSchema.safeParse({
      kind: 'exam',
      draw_count: 10,
      pass_percent: 90,
      questions: [],
    }).success,
  ).toBe(false);
});
