import { loadContent } from '../lib/content/loader';

const rootIndex = process.argv.indexOf('--root');
const modules = loadContent(
  rootIndex < 0 ? undefined : process.argv[rootIndex + 1],
);
if (!modules.length) throw new Error('No content modules found');
if (process.argv.includes('--complete')) {
  for (const module of modules) {
    for (const lesson of module.lessons)
      if (!module.quizzes.some((q) => q.lessonSlug === lesson.slug))
        throw new Error(`Missing check: ${module.slug}/${lesson.slug}`);
    if (
      module.kind === 'course' &&
      !module.quizzes.some((q) => q.data.kind === 'exam')
    )
      throw new Error(`Missing exam: ${module.slug}`);
    if (!module.quizzes.some((q) => q.data.kind === 'freetext'))
      throw new Error(`Missing free-text: ${module.slug}`);
  }
}
console.log(
  `Content valid: ${modules.length} modules, ${modules.reduce((n, m) => n + m.lessons.length, 0)} lessons, ${modules.reduce((n, m) => n + m.quizzes.length, 0)} quizzes.`,
);
