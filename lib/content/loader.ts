import { readdirSync, readFileSync, existsSync } from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import matter from 'gray-matter';
import {
  frontmatterSchema,
  moduleSchema,
  quizSchema,
  slugSchema,
  type Quiz,
} from './schemas';

const directories = (p: string) =>
  readdirSync(p, { withFileTypes: true })
    .filter((e) => e.isDirectory())
    .map((e) => e.name);
export function loadContent(root = path.join(process.cwd(), 'content')) {
  const modules = [];
  for (const tenant of directories(root)) {
    for (const track of directories(path.join(root, tenant))) {
      for (const slug of directories(path.join(root, tenant, track))) {
        const dir = path.join(root, tenant, track, slug);
        if (!existsSync(path.join(dir, 'module.json'))) continue;
        [tenant, track, slug].forEach((s) => slugSchema.parse(s));
        const meta = moduleSchema.parse(
          JSON.parse(readFileSync(path.join(dir, 'module.json'), 'utf8')),
        );
        const lessons = readdirSync(dir)
          .filter((file) => file.endsWith('.mdx'))
          .map((file) => {
            const lessonSlug = slugSchema.parse(file.slice(0, -4));
            const raw = readFileSync(path.join(dir, file), 'utf8');
            if (/^\s*(import|export)\s/m.test(raw))
              throw new Error(`${file}: MDX imports/exports are not permitted`);
            const parsed = matter(raw);
            return {
              slug: lessonSlug,
              ...frontmatterSchema.parse(parsed.data),
              body: parsed.content,
              path: path.relative(process.cwd(), path.join(dir, file)),
              hash: createHash('sha256').update(raw).digest('hex'),
            };
          })
          .sort((a, b) => a.order - b.order);
        if (new Set(lessons.map((l) => l.order)).size !== lessons.length)
          throw new Error(`${dir}: duplicate lesson order`);
        const quizzes: {
          slug: string;
          lessonSlug: string | null;
          data: Quiz;
        }[] = [];
        for (const lesson of lessons) {
          const file = path.join(dir, lesson.slug, 'quiz.json');
          if (existsSync(file))
            quizzes.push({
              slug: `${lesson.slug}-check`,
              lessonSlug: lesson.slug,
              data: quizSchema.parse(JSON.parse(readFileSync(file, 'utf8'))),
            });
        }
        for (const type of ['exam', 'freetext'] as const) {
          const file = path.join(dir, `${type}.json`);
          if (existsSync(file))
            quizzes.push({
              slug: type,
              lessonSlug: null,
              data: quizSchema.parse(JSON.parse(readFileSync(file, 'utf8'))),
            });
        }
        const normalize = (s: string) => s.replace(/\s+/g, ' ').trim();
        for (const quiz of quizzes)
          for (const question of quiz.data.questions) {
            const source = lessons.find(
              (l) => l.slug === question.source_reference,
            );
            if (
              !source ||
              !normalize(source.body).includes(normalize(question.source_quote))
            )
              throw new Error(
                `${dir}/${quiz.slug}/${question.id}: source quote is not traceable to its lesson`,
              );
          }
        modules.push({ tenant, track, slug, ...meta, lessons, quizzes });
      }
    }
  }
  const positions = modules.map((m) => `${m.tenant}/${m.track}/${m.order}`);
  if (new Set(positions).size !== positions.length)
    throw new Error('Duplicate module order');
  return modules.sort((a, b) => a.order - b.order);
}
export type ContentModule = ReturnType<typeof loadContent>[number];
export function traineeLessons(module: ContentModule) {
  return module.lessons.filter((l) => !l.draft);
}
