# Graph execution

**Current stop: HUMAN GATE — first playable 3D yard.** Robert approved replacing the text-only simulator target with an immersive landscape prototype. The first spatial learning loop is built at `/review/yard`. Nodes 1–11 remain verified. Node 12 remains in progress; its full authenticated trainee workflow and `trainee` e2e verify have not passed. Review this property before expanding the library or starting Node 13.

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
| 9 — Content review                    | APPROVED WITH EDITS          | PR `content-v1`, local review page, four drafts, diagram key/assumptions, and source index staged                                           |
| 10 — Simulator engine                 | PASS                         | 40-turn cap, 10 daily runs, four grading fixtures, usage logging                                                                            |
| 11 — Persona roster                   | PASS                         | 6 personas, hard/standard/warm 2 each, 18 scenarios                                                                                         |
| 12 — Trainee UI                       | IN PROGRESS / HUMAN PREVIEW  | Simulator preview verified; full trainee workflow verify remains pending                                                                    |
| 13–18 and final acceptance            | Not started                  | Require preceding verifies and human gates                                                                                                  |

## Historical Gate 9 staging validation

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

## September 13 approval and simulator preview

Robert’s “otherwise proceed” approved Gate 9 with the corrections in AMENDMENTS.md. Four drafts were published and the diagram key approved; all 33 source lessons are now published. The fixture stays hidden. Content lint/sync and 25 tests passed following the policy corrections.

Node 10 PASS: `LLM_PROVIDER=mock pnpm test -- sim` passed (33 total tests), including 40-turn cap, 11th daily run rejection, strict grade schema, four required grading fixtures, owner isolation and area policy override.

Node 11 PASS: `pnpm content:sync` and the exact persona count query returned hard 2, standard 2, warm 2. There are 18 scenarios, three per core persona. All 34 tests passed.

Node 12 IN PROGRESS: shared simulator client surface and isolated loopback-only development preview are built. This is the user-requested early review checkpoint. The authenticated dashboard, lesson/exam/free-text interactions, durable Supabase simulator store and full Node 12 `trainee` e2e verification remain to implement. Preview uses the real simulator engine with MemorySimStore and MockProvider; it cannot alter trainee progress or bypass authentication on real trainee routes.

Preview verification: `LLM_PROVIDER=mock pnpm test:e2e -- simulator-preview` passed all 3 browser/API tests. A 390px viewport completed scenario selection, chat, grade card, three fixes and history; no horizontal overflow. API tests checked cross-origin rejection, malformed messages, cross-session ownership and hidden-brief omission. Manual browser review also completed a three-turn appointment and sample grade.

Implementation check notes: initial preview typecheck reported an inferred `any` for the Map callback. The first replacement script matched no text; the corrected explicit Map type resolved it. Initial browser start hit a 403 because Next’s normalized URL origin differed from the request Host; comparing against the loopback request Host fixed it, and browser/API checks passed. These were supplementary preview checks, not the full Node 12 verify.

## Earlier text-preview resume signal (superseded below)

Robert reviews `/review/simulator` and supplies approval or edits. Then finish Node 12, pass its full verify, and proceed to Node 13. Gate 16 remains mandatory. Real provider/model selection and realistic conversation-quality acceptance are deferred to Gate 16 and deployed acceptance; sample scores are illustrative.

## Final preview checks

Production build, lint, typecheck and all 34 unit/integration tests passed. Browser/API preview tests: 3 passed. Local production HTTP checks returned 404 for `/review`, `/review/simulator`, and `/review/simulator/api`; `/login` returned 200. Database counts: 17 public tables, 2 tenants, 33 published lessons, 6 personas.

The approved content remains on `content-v1` (PR #1). Simulator work is stacked on `simulator-preview`, targeting `content-v1`, so nothing is merged to main or deployed before the later graph gates.

## Immersive preview milestone

Implemented a procedural 3D property with orbit, overhead and walk controls; six-corner area trace and virtual tape; elevation stations and fall arrows; interactive turf/paver cutaways; selectable finishes and movable bench with access checks; scene-aware scripted homeowner; deterministic field debrief; cookie-scoped local practice saving and restoration. A 2D plan provides alternative measurement/inspection controls. No schema, production service or actual credential changes.

Read `docs/YARD_REVIEW.md` for the walkthrough, reference calculations and explicit prototype boundaries. Existing source content, auth, RLS and prior simulator tests remain in the suite. React was aligned to the renderer’s declared supported range and peer checks pass.

Validation recovery: first browser run exposed a toolbar covering point A on the phone plan and exhausted the 30-second budget for the full 40-plus-action workflow. Plan padding now keeps its points below controls; rendering on demand eliminates idle frame work; the full workflow has a 60-second test allowance. The rerun passed all 6 browser/API tests, with the whole suite finishing in 12.6 seconds. Typecheck caught the OrbitControls change-event callback passing an event to Fiber’s numeric invalidation argument; a zero-argument wrapper corrected it.

Production build, lint, typecheck and all 40 unit/integration tests pass. All 6 browser/API tests passed in the final full run (12.5 seconds), including the complete 100-point field workflow, reload restoration, phone plan controls and API boundaries. Local production HTTP checks return 404 for the yard page and both GET/POST yard API, 404 for the prior simulator preview, and 200 for login.

Manual review at 1440 × 960 and 390 × 844 confirmed the rendered property, installation explorer and phone walk controls. The material marker positions initially applied the layer height twice; removing the duplicate offset aligned each numbered marker with its layer, verified visually on desktop and phone. The browser viewport override was reset and the playable yard left open for Robert.

Resume on Robert’s review of the playable yard. Apply requested edits, then expand only the approved scope and finish Node 12 before Node 13. Gate 16 still controls real infrastructure and provider selection.
