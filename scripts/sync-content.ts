import { execFileSync } from 'node:child_process';
import { loadContent } from '../lib/content/loader';

// Only the graph's local Docker database is targeted before Gate 16.
const rootIndex = process.argv.indexOf('--root');
const modules = loadContent(
  rootIndex < 0 ? undefined : process.argv[rootIndex + 1],
);
if (!modules.length) throw new Error('No modules to sync');
const quote = (v: string) => `'${v.replaceAll("'", "''")}'`;
const json = (v: unknown) => `${quote(JSON.stringify(v))}::jsonb`;
const sql: string[] = ['begin;'];
for (const m of modules) {
  const tenant = `(select id from public.tenants where slug=${quote(m.tenant)})`;
  const track = `(select id from public.tracks where tenant_id=${tenant} and slug=${quote(m.track)})`;
  const moduleId = `(select id from public.modules where track_id=${track} and slug=${quote(m.slug)})`;
  sql.push(
    `insert into public.modules(tenant_id,track_id,slug,title,position,kind) values(${tenant},${track},${quote(m.slug)},${quote(m.title)},${m.order},${quote(m.kind)}) on conflict(track_id,slug) do update set title=excluded.title,position=excluded.position,kind=excluded.kind;`,
  );
  // Missing files are hidden rather than deleting identifiers referenced by progress.
  sql.push(`update public.lessons set draft=true where module_id=${moduleId};`);
  for (const l of m.lessons)
    sql.push(
      `insert into public.lessons(tenant_id,module_id,slug,title,position,estimated_minutes,draft,source_sheet,content_path,content_hash) values(${tenant},${moduleId},${quote(l.slug)},${quote(l.title)},${l.order},${l.estimated_minutes},${l.draft},${quote(l.source_sheet)},${quote(l.path)},${quote(l.hash)}) on conflict(module_id,slug) do update set title=excluded.title,position=excluded.position,estimated_minutes=excluded.estimated_minutes,draft=excluded.draft,source_sheet=excluded.source_sheet,content_path=excluded.content_path,content_hash=excluded.content_hash;`,
    );
  for (const q of m.quizzes) {
    const lessonId = q.lessonSlug
      ? `(select id from public.lessons where module_id=${moduleId} and slug=${quote(q.lessonSlug)})`
      : 'null';
    sql.push(
      `insert into public.quizzes(tenant_id,module_id,lesson_id,slug,kind,draw_count,pass_percent) values(${tenant},${moduleId},${lessonId},${quote(q.slug)},${quote(q.data.kind)},${q.data.draw_count},${q.data.pass_percent ?? 'null'}) on conflict(module_id,slug) do update set lesson_id=excluded.lesson_id,kind=excluded.kind,draw_count=excluded.draw_count,pass_percent=excluded.pass_percent;`,
    );
    const quizId = `(select id from public.quizzes where module_id=${moduleId} and slug=${quote(q.slug)})`;
    for (const question of q.data.questions)
      sql.push(
        `insert into public.questions(tenant_id,module_id,quiz_id,slug,prompt,kind,options,correct_answer,rubric,source_reference) values(${tenant},${moduleId},${quizId},${quote(question.id)},${quote(question.prompt)},${quote(question.kind)},${json(question.options)},${json(question.correct_answer)},${question.rubric ? json(question.rubric) : 'null'},${quote(`${question.source_reference}: ${question.source_quote}`)}) on conflict(quiz_id,slug) do update set prompt=excluded.prompt,kind=excluded.kind,options=excluded.options,correct_answer=excluded.correct_answer,rubric=excluded.rubric,source_reference=excluded.source_reference;`,
      );
  }
}
sql.push('commit;');
execFileSync(
  'psql',
  [
    'postgres://postgres:postgres@127.0.0.1:54322/postgres',
    '-v',
    'ON_ERROR_STOP=1',
    '-q',
  ],
  { input: sql.join('\n'), stdio: ['pipe', 'ignore', 'pipe'] },
);
console.log(`Synced ${modules.length} modules to local Docker Supabase.`);
