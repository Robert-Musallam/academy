# Content pipeline

Each module has `module.json` (title, order, kind) and lessons as `<lesson-slug>.mdx`. Lesson-specific checks live at `<lesson-slug>/quiz.json`; `exam.json` and `freetext.json` live at module level. This resolves multiple lessons sharing a directory without filename collisions. Frontmatter fields are required, including an explicit boolean `draft`.

Questions have stable IDs, options, a zero-based correct answer for single choice, a source lesson slug, and a verbatim source quote. Lint verifies the quote exists in that lesson. Exams require at least 20 questions, 10–15 draws, and 90% to pass. Lesson checks require 3–5 questions. Use `pnpm content:lint --complete` after Node 6 to require all checks, exams, and free-text prompts.

`pnpm content:sync` performs one transaction against local Docker Supabase. Content upserts by scoped slug, preserving IDs; missing lessons are hidden as drafts rather than deleted. Source files remain authoritative. Production sync is intentionally deferred to Node 17. No environment file or credential inventory is loaded for local content sync.

`traineeLessons()` and `renderLesson()` exclude drafts. Review preview may render drafts only when explicitly requested by trusted local review code. Questions with correct answers, hidden simulator briefs, and grading rubrics must never be included in a trainee response.

The Node 4 fixture uses Foundations with a draft lesson at order 99. It remains hidden after the real lessons are synced and is not counted as published content.
