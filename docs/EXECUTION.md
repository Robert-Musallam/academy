# Graph execution

**Current stop: Node 9 — HUMAN GATE: content review.** Nodes 1–8 are verified and committed. Node 10 has not started. Four lessons remain drafts and the diagram key remains unapproved.

| Node                                  | Status                       | Verify result                                                                                                                               |
| ------------------------------------- | ---------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| 0 — Decision manifest                 | Supplied                     | Canonical kickoff retained in `docs/KICKOFF.md`                                                                                             |
| 1 — Repo scaffold                     | PASS                         | Install, Next.js 15.5.25 production build, initial test, lint, and typecheck exited 0; Supabase initialized                                 |
| 2 — Schema                            | PASS                         | Docker Supabase start/reset; **17 public tables**, **2 tenants**; transactional RLS checks passed                                           |
| 3 — Auth + roster gating              | PASS                         | `pnpm test -- auth`; rostered dispatch, non-roster 403, actual Postgres trainee isolation; build passed                                     |
| 4 — Content pipeline                  | PASS                         | Fixture content lint/sync; lesson count **1**; draft filtering tests passed                                                                 |
| 5 — Source transcription              | PASS                         | Lint/sync; **7 modules**, **29 non-draft lessons**; all MDX compiled                                                                        |
| 6 — Quizzes, exams, free-text, gating | PASS                         | `pnpm test -- progress quizzes`; 89% fails, 90% passes, prerequisites enforced; exam pools **20/22/20/24/20**                               |
| 7 — Four NEW lessons                  | PASS                         | Content lint; exact draft grep **4**; each new lesson has a check                                                                           |
| 8 — Diagram key                       | PASS (arithmetic/tests only) | `pnpm test -- diagram`; schema, inclusive ±5%, per-field ±8% rejection, invalid input rejection; trainee grading blocked until key approval |
| 9 — Content review                    | WAITING FOR HUMAN            | PR `content-v1`, local review page, four drafts, diagram key/assumptions, and source index staged                                           |
| 10–18 and final acceptance            | Not started                  | Require preceding verifies and human gates                                                                                                  |

## Gate 9 staging validation

- `pnpm content:lint --complete` and `pnpm content:sync` passed: **7 modules, 33 lessons, 45 quizzes** in source content.
- `pnpm lint`, `pnpm build`, and `pnpm test` passed: **25 tests across 6 files**, including real local Postgres RLS tests.
- All **33** MDX lessons, including all four drafts, compiled using `next-mdx-remote/serialize`.
- The local review page was visually inspected in the browser. It renders drafts, source links, callouts, checks with answers, exam pools, and free-text rubrics.
- Local production-mode HTTP checks returned **404** for `/review` and `/review/source/IMG_1384.jpeg`, and **200** for `/login`.
- Final database counts remain **17 tables, 2 tenants, 7 modules, 29 published lessons**. The hidden Node 4 fixture adds one draft-only database row beyond the 33 source lessons.
- No live-email delivery, simulator, manager UI, Teams digest, or full acceptance claim is made. Those belong to later nodes. No production project was accessed.

## Node 2 recovery record

The first session stopped because Docker and psql were unavailable. On 2026-09-13, Robert supplied a working Docker Desktop and psql installation. `pnpm exec supabase start` then succeeded, applying the schema and seed.

The literal kickoff verification reset the database successfully, but `supabase status -o env | grep DB_URL | cut -d= -f2-` supplied no usable connection string to psql. That psql call failed against the default local socket (exit 2). The one fix used the local Docker Supabase endpoint configured on port 54322 and repeated start/reset and both count queries; they returned **17** and **2**. The Postgres 16 fallback is no longer used.

Verified command:

```sh
pnpm exec supabase start > /dev/null && pnpm exec supabase db reset > /dev/null && psql 'postgres://postgres:postgres@127.0.0.1:54322/postgres' -v ON_ERROR_STOP=1 -c "select count(*) from information_schema.tables where table_schema='public'" -c 'select count(*) from tenants'
```

Startup stdout is suppressed to avoid displaying generated credentials. The project CLI uses `SUPABASE_HOME` under `work/supabase-home`, separate from any existing machine credentials. `tests/sql/schema-rls.sql` verifies all-table RLS, trainee ownership, manager tenant access, admin access, revoked membership, anonymous denial, and prevention of role/score forgery; fixtures roll back.

## Node 3 testing boundary

Unit tests stub the email transport and verify dispatch only after roster lookup. The RLS test runs against actual local Postgres. Actual email delivery remains part of deployed acceptance. Protected pages are dynamic so the app builds without credentials. Public signup is disabled in config; magic links use `shouldCreateUser: false`. Admin roster creation provisions an auth identity first.

## Content and grading decisions

The module-specific pass table governs M6/M7: their free-text prompts are practice, while tiers/forms determine completion. Node 7 includes checks for its new draft lessons; existing exam pools do not draw those draft questions. The diagram's numeric tests do not establish that the proposed geometry is the correct interpretation of the source; Robert must confirm or correct it at Gate 9.

## Resume signal

PR merged, or reply **GATE 9 APPROVED** with any edits listed. On approval, apply the edits, flip the four drafts to `draft: false`, mark the confirmed diagram model approved, sync/reverify, and commit Node 9 approval before beginning Node 10.
