> Current policy corrections and added simulator review gate: [AMENDMENTS.md](AMENDMENTS.md). These supersede conflicting original text below.

> Paste this entire file into Codex (GPT-6 Astra) as the opening prompt. Execute nodes strictly in dependency order. Do not proceed past a node until its `verify` command returns the expected result. Stop and surface HUMAN GATE nodes exactly as written. Where you have a question that does not change the outcome, proceed on the manifest default and note the assumption in `docs/ASSUMPTIONS.md`. Where a question could change the outcome, ask asynchronously and keep working on nodes that don't depend on the answer.

## Mission

Build **Academy**, a multi-tenant training platform (Next.js 15 / TypeScript / Tailwind / Supabase / Vercel) for Robert's businesses, launching with tenant `rnb` (Rock N Block Turf N Hardscapes) and track `sales-design-consultant`. A trainee logs in via magic link, works through 7 gated modules (lessons transcribed from the existing RNB training sheets, quizzes at 90%, one LLM-graded free-text per module), then runs text-based simulated customer appointments against 6 fixed homeowner personas graded on a 100-point rubric, and finally has ride-along and Day-5 evaluation forms completed by a manager. Managers see a roster and trainee detail; a weekly digest posts to Microsoft Teams. **Done** = a new trainee can be added to the roster, complete every module, pass one sim per tier, be evaluated by a manager, and appear in a Teams digest, on the deployed Vercel URL, with all automated tests green.

## Operating rules

- Work only inside the GitHub repo `academy` (root of this sandbox).

- Systems in scope: this repo; a local Supabase instance via `supabase start` for all tests and migrations (if Docker is unavailable in this sandbox, use the local Postgres 16 started by the environment setup script at `postgres://postgres:postgres@localhost:5432/academy`, apply migrations with `psql`, and record the substitution in `docs/ASSUMPTIONS.md`; every `verify` that references `supabase status` then uses that URL instead); the production Supabase project and Vercel project **only** in nodes 17–18 after the infra HUMAN GATE.

- Systems explicitly out of scope: HouseCall Pro, Make.com, any existing Supabase project (gcvpmOS, blackboard), Slack, QuickBooks, Microsoft Entra SSO (v2), voice (v2), in-app content editor (v2).

- Never create, read, print, or commit any API key, secret, or `.env` value. Read env var _names_ only. All secrets are supplied by the human in Vercel/Supabase dashboards.

- On any verify failure: attempt one fix, re-verify; on second failure, stop and report the node id, the command output, and your diagnosis. Do not improvise past a failed gate.

- On interruption: resume by re-running the last unverified node. Node inputs come only from named outputs below, never from prior conversation.

- Commit at the end of every node with message `node N: <name>`; open one PR per HUMAN GATE that requires review.

- Package manager: pnpm. Tests: vitest (unit), playwright (e2e). Lint: eslint + prettier. Content validation: zod schemas.

## Node 0 — DECISION MANIFEST (already resolved)

**Architecture**

- Monorepo layout: single Next.js app at repo root, `supabase/` for migrations and seed, `content/` for MDX, `docs/` for generated docs.

- Multi-tenant from day one: tables `tenants` (`rnb`, `gcv` seeded; `gcv` has no tracks yet) and `tracks` (`sales-design-consultant` under `rnb`; `project-manager` under `rnb` created as a placeholder with no modules).

- Auth: Supabase email magic link. A user can only sign in if their email exists in `roster` for a tenant. No self-signup.

- Roles: `trainee`, `manager`, `admin`. Stored in `roster.role`. Admin assigns manager. Row-Level Security enforces: trainee sees own rows; manager sees rows for their tenant; admin sees all.

- LLM access goes through exactly one file: `lib/llm/provider.ts` exporting `chat()` and `gradeJSON()`. Implement `MockProvider` (deterministic, for tests) and `OpenAIProvider` (reads `LLM_API_KEY`, `LLM_SIM_MODEL`, `LLM_GRADER_MODEL` from env). Provider selected by `LLM_PROVIDER` env (`mock` | `openai`). Structure so an `AnthropicProvider` is a one-file addition.

- Content: MDX files in `content/<tenant>/<track>/<module-slug>/<lesson-slug>.mdx` with zod-validated frontmatter (`title`, `order`, `estimated_minutes`, `draft`, `source_sheet`). Quizzes as `quiz.json` alongside each lesson and `exam.json` per module. A seed script syncs content to Supabase tables so progress can be tracked by id; MDX remains the source of truth.

- `draft: true` content is never rendered to trainees.

- Teams digest: Vercel Cron, Mondays 07:00 America/Denver, POST to `TEAMS_WEBHOOK_URL` (Adaptive Card). Content: trainees started this week, modules passed, sims passed per tier, trainees with no activity > 3 days.

- Sim limits: 40 turns max per run; 10 runs per trainee per calendar day; every run logs prompt/completion tokens and estimated cost to `sim_cost_log`.

- No leaderboard in v1.

**Training path (the deliberate sequence — do not reorder)**

| # | Module | Unlocks when | Pass rule |

|---|--------|--------------|-----------|

| 1 | Foundations | roster added | exam ≥ 90% + free-text graded pass |

| 2 | Products & Selling Points | M1 passed | same |

| 3 | Measurement & Pricing | M2 passed | same + diagram exercise correct within tolerance |

| 4 | Objection Handling | M3 passed | same |

| 5 | Closing & Follow-up | M4 passed | same |

| 6 | Simulator | M5 passed | one passing run at each tier: warm, standard, hard |

| 7 | Field | M6 passed | manager completes ride-along checklist (Day 3/4) and Day 5 evaluation form; manager marks HCP estimate exercise complete |

Lesson checks: 3–5 questions per lesson, informational only (no gate). Module exams: 10–15 questions drawn shuffled from a pool of ≥ 20, unlimited retries, 90% to pass. One free-text question per module graded by `gradeJSON()` against a rubric (pass/fail + one-sentence feedback).

Lessons per module (source sheet in brackets; `NEW` = drafted by you, `draft: true` until gate 9):

- M1 Foundations: Our Mission & the RNB Standard [Manual cover]; The 5-Day Path [Manual p2]; The 7-Step Consultation [Training Scenario]; Key Principles [Training Scenario sidebar]; Pre-Appointment Prep Checklist `NEW`.

- M2 Products: How to Sell Materials — value framing [Sheet 1]; Turf [Turf KSP]; Pavers [Pavers KSP]; Patio Covers [Patio Covers KSP]; Outdoor Kitchens [Outdoor Kitchens KSP]; Fencing & Gates [Fencing KSP]; Plants, Irrigation & Lighting [PIL KSP].

- M3 Measurement & Pricing: SQFT vs Linear Feet [Sheet 2]; What We Sell By [Sheet 3 sold-by list]; Reading a Diagram + the Sample Diagram Exercise [Appendix B]; Building the Estimate in HCP (procedural walkthrough, marked complete by manager).

- M4 Objections: Acknowledge → Understand → Educate → Reframe → Close [Cheat Sheet]; one lesson per objection (7).

- M5 Closing & Follow-up: Presenting the Price `NEW`; The Same-Day Drop & Financing `NEW`; When They Don't Sign — the Exit Script `NEW`; Your Personal Follow-up Cadence (rules below).

- M6 Simulator: How the Sim Works & the Rubric; Sim (3 tiers).

- M7 Field: Ride-Along Notes (manager form); Day 5 Evaluation (manager form); HCP Exercise sign-off.

**Sales rules the grader and lessons must enforce**

- First-call close is the goal. Price is never presented before education (products, install process, warranty, why we're different).

- Drop = same-day discount, max 10%, offered only after the full proposal has been presented and value reinforced. Offering a drop early is a grading penalty. Financing is presented alongside every proposal.

- Warranties to state: 25-year product warranty (turf, pavers, fencing), 3-year labor warranty, Bull lifetime warranty on kitchen equipment. Company facts: 15+ years in the industry, licensed and insured.

- Follow-up: company automation contacts the customer by email and text on day 0, 1, 3, 7. The rep's personal cadence lands on the days the company is silent and is always personal (from the rep's own number, referencing something specific from the visit): day 0 evening text, day 2 call, day 5 photo/value touch, day 10 "reserve your spot" call, then every 2 weeks to day 60, then monthly. Non-negotiable: an agreed next contact before leaving the house, and the rep gives their personal number.

**Sim grading rubric (100 points)**

- Introduction & rapport — 10

- Discovery before products (vision, use, pain points) — 15

- Measurement/pricing accuracy (correct unit, edger, waste, tons) — 10

- Education before price — 20

- Objection handling (5-step pattern) — 15

- Close attempt (asked for business, drop + financing used correctly, never dropped early) — 20

- Next step secured (agreed follow-up, personal number) — 10

- Pass = total ≥ 75 AND every dimension ≥ 50% of its weight. Grader returns JSON: per-dimension score and reason, three quoted trainee lines to fix, one thing done well, pass boolean.

**Personas (6 fixed; tier: 2 warm, 2 standard, 2 hard)** — full sheets written in node 11 to this shape: name, market, project type + size, hidden budget, primary objection (from cheat sheet), secondary objection (hard only), trust unlock (the discovery question that softens them), spouse status, same-day close condition, competitor quote (hard only). Persona never volunteers hidden info; reveals only when earned.

1. warm — turf backyard, dogs, no competitor, spouse present

2. warm — paver patio + fire pit, referral, ready to buy

3. standard — patio cover, "need to think about it", spouse absent

4. standard — outdoor kitchen, "too expensive", wants financing

5. hard — turf, competitor quote with black backing, "competitor is cheaper" + "email me the quote"

6. hard — fencing + gate, "need other estimates" + "not ready yet", price shopper

**Open decisions deferred to gates** (do not guess these)

- LLM provider and models → gate 16 (Robert chooses; `MockProvider` used until then).

- Diagram answer key → gate 9 (you compute, Robert confirms).

- Wording of the 4 NEW lessons → gate 9.

- Teams channel and webhook, Supabase and Vercel project creation → gate 16.

## Graph

### Node 1 — Repo scaffold

- **depends_on:** node 0

- **inputs:** empty repo with `content/source/*.PNG` (13 sheets + diagram) already committed by human

- **work:** Scaffold Next.js 15 app router, TypeScript strict, Tailwind, pnpm, eslint/prettier, vitest, playwright, `supabase init`, `.env.example` listing var names only (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `LLM_PROVIDER`, `LLM_API_KEY`, `LLM_SIM_MODEL`, `LLM_GRADER_MODEL`, `TEAMS_WEBHOOK_URL`, `CRON_SECRET`). Add `docs/ASSUMPTIONS.md`.

- **outputs:** buildable app; `docs/ASSUMPTIONS.md`

- **verify:** `pnpm install && pnpm build && pnpm test` → exit 0

- **rollback:** idempotent — safe to re-run

### Node 2 — Schema

- **depends_on:** node 1

- **inputs:** manifest tables

- **work:** Migrations for: `tenants`, `tracks`, `roster` (email, tenant_id, role, manager_id, track_id), `modules`, `lessons`, `quizzes`, `questions`, `quiz_attempts`, `freetext_attempts`, `module_progress`, `personas`, `sim_runs`, `sim_turns`, `sim_grades`, `sim_cost_log`, `manager_forms` (type: ride_along | day5_eval | hcp_exercise), `digest_log`. RLS policies per manifest roles. Seed `tenants` (`rnb`, `gcv`) and `tracks`.

- **outputs:** `supabase/migrations/*`, `supabase/seed.sql`, `docs/SCHEMA.md`

- **verify:** `supabase start && supabase db reset && psql "$(supabase status -o env | grep DB_URL | cut -d= -f2-)" -c "select count(*) from information_schema.tables where table_schema='public'"` → 17; `select count(*) from tenants` → 2

- **rollback:** `supabase db reset` (idempotent)

### Node 3 — Auth + roster gating

- **depends_on:** node 2

- **inputs:** schema

- **work:** Magic-link sign-in page; server-side check that email exists in `roster` before sending link; session middleware; role helper; `/admin/roster` page (admin adds email, tenant, track, role, manager).

- **outputs:** `app/(auth)/*`, `lib/auth.ts`, tests

- **verify:** `pnpm test -- auth` → passes: roster email gets link, non-roster email gets 403, trainee cannot read another trainee's `module_progress`

- **rollback:** idempotent

### Node 4 — Content pipeline

- **depends_on:** node 2

- **inputs:** manifest content layout

- **work:** MDX loader, zod frontmatter/quiz schemas, `scripts/sync-content.ts` (upserts modules/lessons/quizzes/questions by slug), `pnpm content:lint`.

- **outputs:** `lib/content/*`, `scripts/sync-content.ts`

- **verify:** `pnpm content:lint` on a fixture module → exit 0; `pnpm content:sync && psql ... -c "select count(*) from lessons"` → fixture count

- **rollback:** sync is upsert-by-slug (idempotent)

### Node 5 — Transcribe the 13 sheets into lessons

- **depends_on:** node 4

- **inputs:** `content/source/*.PNG`, Appendix A below

- **work:** Write every lesson listed in the manifest for M1–M4 and the non-NEW lessons of M5–M7 as MDX, faithful to the sheets (Appendix A is the authoritative text where the PNG is ambiguous). Preserve every warranty number, measurement rule, and quoted phrase. Add a "Phrases to use" callout component and a "Why it matters" component.

- **outputs:** `content/rnb/sales-design-consultant/**` (7 modules)

- **verify:** `pnpm content:lint` → exit 0; `pnpm content:sync && psql ... -c "select count(*) from modules where track_id=(select id from tracks where slug='sales-design-consultant')"` → 7; `select count(*) from lessons where draft=false` → ≥ 28

- **rollback:** delete files, re-sync (idempotent)

### Node 6 — Quizzes, exams, free-text, gating

- **depends_on:** node 5

- **inputs:** lesson MDX

- **work:** For every lesson a `quiz.json` (3–5 q); for every module M1–M5 an `exam.json` pool ≥ 20 with correct answers traceable to lesson text; one free-text prompt + grading rubric per module; gating engine (`lib/progress.ts`) implementing the unlock table; 90% pass; shuffled draws.

- **outputs:** quiz/exam JSON, `lib/progress.ts`, tests

- **verify:** `pnpm test -- progress quizzes` → passes: M2 locked until M1 passed; 89% fails; 90% passes; pool ≥ 20 per module

- **rollback:** idempotent

### Node 7 — Draft the 4 NEW lessons

- **depends_on:** node 5

- **inputs:** manifest sales rules

- **work:** Write `pre-appointment-prep`, `presenting-the-price`, `same-day-drop-and-financing`, `exit-script` from home-service in-home sales best practice, consistent with every manifest rule. All `draft: true`.

- **outputs:** 4 MDX files

- **verify:** `pnpm content:lint` → exit 0; `grep -l "draft: true" content/rnb/**/*.mdx | wc -l` → 4

- **rollback:** idempotent

### Node 8 — Diagram exercise answer key

- **depends_on:** node 5

- **inputs:** `content/source/IMG_1384.jpeg`, Appendix B

- **work:** Compute turf sqft, rock sqft and tons (1 ton = 100 sqft at 2"), paver sqft, paver edger LF (perimeter of paver area), with a 10% waste line for turf and pavers. Write `content/.../measurement/diagram-exercise/answer-key.json` and `docs/DIAGRAM_ASSUMPTIONS.md` listing every geometric assumption (the 17' vs 3'+13' left side, what the lower 25'-wide shape is, the 4'9"×11' strip). Quiz accepts ±5% on each figure.

- **outputs:** answer key, assumptions doc

- **verify:** `pnpm test -- diagram` → answer-key schema valid; quiz grader accepts key ±5% and rejects ±8%

- **rollback:** idempotent

### Node 9 — HUMAN GATE: content review

- **depends_on:** nodes 6, 7, 8

- **staged for human:** PR `content-v1` containing all lessons, quizzes, the 4 drafts, `docs/DIAGRAM_ASSUMPTIONS.md` and the answer key; a Vercel preview URL if available, else `pnpm dev` instructions.

- **human must:** Read the 4 draft lessons and either approve or edit; confirm or correct the diagram answer key; spot-check 3 transcribed lessons against the sheets.

- **resume signal:** PR merged, or reply `GATE 9 APPROVED` with any edits listed. On approval, flip the 4 drafts to `draft: false`.

### Node 10 — LLM provider + sim engine + grader

- **depends_on:** node 6

- **inputs:** manifest provider design, rubric, limits

- **work:** `lib/llm/provider.ts` with `MockProvider` and `OpenAIProvider`; `lib/sim/engine.ts` (load persona, system prompt builder, turn loop, 40-turn cap, daily cap, cost logging); `lib/sim/grader.ts` (rubric → JSON via `gradeJSON`, pass logic). Mock provider returns scripted persona lines and a fixed grade so tests are deterministic.

- **outputs:** provider, engine, grader, tests

- **verify:** `LLM_PROVIDER=mock pnpm test -- sim` → passes: turn cap enforced; 11th daily run rejected; grade JSON validates; pass/fail logic matches rubric on 4 fixtures (pass; total ≥75 but one dim <50%; total <75; early-drop penalty)

- **rollback:** idempotent

### Node 11 — Persona roster

- **depends_on:** node 10

- **inputs:** manifest persona list

- **work:** Write the 6 persona sheets as `content/rnb/sales-design-consultant/simulator/personas/*.json` and seed to `personas`. Each includes the hidden-brief fields and 3 scripted objection triggers.

- **outputs:** 6 persona files

- **verify:** `pnpm content:sync && psql ... -c "select tier, count(*) from personas group by tier order by tier"` → hard 2, standard 2, warm 2

- **rollback:** idempotent

### Node 12 — Trainee UI

- **depends_on:** nodes 3, 6, 10, 11

- **inputs:** all prior outputs

- **work:** Dashboard (path with locked/unlocked/passed), lesson reader, lesson check, module exam, free-text answer, sim chat (persona picker by tier, chat, end-run → grade card with three fixes), history of attempts. Mobile-first; reps use phones.

- **outputs:** `app/(trainee)/*`

- **verify:** `LLM_PROVIDER=mock pnpm test:e2e -- trainee` → passes: seeded trainee completes M1 exam at 90%, M2 unlocks; runs a warm sim to completion; grade card renders

- **rollback:** idempotent

### Node 13 — Manager + admin UI

- **depends_on:** node 12

- **inputs:** `manager_forms` schema

- **work:** Roster page (module status, quiz scores, sim runs per tier with scores), trainee detail (grader notes), ride-along checklist form (trust-building, drawing technique, closing/drops, expectation setting — each rated 1–5 + notes), Day 5 evaluation form (8 items from the manual + strengths/weaknesses + pass), HCP exercise sign-off toggle. Admin: roster CRUD.

- **outputs:** `app/(manager)/*`, `app/(admin)/*`

- **verify:** `pnpm test:e2e -- manager` → passes: manager sees only own tenant; completing both forms marks M7 passed

- **rollback:** idempotent

### Node 14 — Teams weekly digest

- **depends_on:** node 13

- **inputs:** `digest_log`

- **work:** `app/api/cron/digest/route.ts` protected by `CRON_SECRET`; `vercel.json` cron `0 13 * * 1` (07:00 Denver); builds Adaptive Card; `--dry-run` query param returns the payload without posting.

- **outputs:** route, `vercel.json`

- **verify:** `pnpm test -- digest` → payload matches Adaptive Card schema; includes a seeded stalled trainee

- **rollback:** idempotent

### Node 15 — Full local acceptance

- **depends_on:** nodes 9, 12, 13, 14

- **work:** Run the complete suite; write `docs/RUNBOOK.md` (how to add a trainee, add a lesson, add a persona, add a tenant/track, rotate provider).

- **verify:** `pnpm lint && pnpm build && LLM_PROVIDER=mock pnpm test && LLM_PROVIDER=mock pnpm test:e2e` → all exit 0

- **rollback:** n/a

### Node 16 — HUMAN GATE: infrastructure + provider decision

- **depends_on:** node 15

- **staged for human:** `docs/INFRA_CHECKLIST.md` listing exactly: (1) create Supabase project `academy`, (2) create Vercel project from this repo, (3) set the env vars named in `.env.example` in Vercel, (4) create a Teams incoming webhook in the chosen channel and set `TEAMS_WEBHOOK_URL`, (5) choose LLM provider and models and set `LLM_PROVIDER`, `LLM_API_KEY`, `LLM_SIM_MODEL`, `LLM_GRADER_MODEL`; plus `docs/PROVIDER_OPTIONS.md` with a cost estimate per sim run for 3 provider/model combinations at 40 turns.

- **human must:** Complete the checklist. Never paste secrets into this session.

- **resume signal:** reply `GATE 16 DONE` with the Vercel URL and the Supabase project ref.

### Node 17 — Deploy + migrate production

- **depends_on:** node 16

- **inputs:** Vercel URL, Supabase project ref

- **work:** `supabase link --project-ref <ref>`, `supabase db push`, run content sync against production via a GitHub Action `sync-content.yml` (uses repo secrets set by human). Merge to `main` to trigger Vercel deploy.

- **outputs:** live URL

- **verify:** `curl -s -o /dev/null -w "%{http_code}" <url>/login` → 200; via the deployed admin API (authenticated as admin roster user created by human), `GET /api/health` → `{ modules: 7, personas: 6, tenants: 2 }`

- **rollback:** `supabase migration repair` + redeploy previous Vercel deployment

### Node 18 — Live smoke with real provider

- **depends_on:** node 17

- **work:** With the human's admin account, run one warm sim end-to-end and one grade; confirm cost logged; trigger `GET /api/cron/digest?dry-run=1` and then one real post.

- **verify:** `sim_grades` has 1 row with valid JSON; `sim_cost_log` has 1 row with tokens > 0; Teams channel shows one card (human confirms in reply)

- **rollback:** delete the smoke rows; digest post is a one-off

### Final node — ACCEPTANCE

- **depends_on:** node 18

- **verify:** Human adds one real trainee to the roster; trainee receives magic link; Mission sentence holds when walked in order. Summarize every node's verify result in order.

- **deliverable to human:** Vercel URL, Supabase project ref, `docs/RUNBOOK.md`, `docs/ASSUMPTIONS.md`, list of v2 items (Entra SSO, voice sim, in-app editor, HCP sandbox, PM track, GCV tracks).

---

## Appendix A — Authoritative text of the source sheets

Use the PNGs in `content/source/` for layout and images; this appendix is the canonical copy for numbers and phrases.

**A1. How to Sell Materials (value sheet).** Principle: educate on why quality materials and proper installation create the best long-term result; "People don't buy materials, they buy the results." Rows (benefits / phrases):

- Turf: soft, clean, safe for kids and pets; green all year, no watering; superior drainage and odor control; 25-year product warranty; increases home value. Phrases: "This turf is designed to handle our extreme climate and still look beautiful year-round." / "You'll love how plush it feels and how easy it is to maintain."

- Pavers: stronger and more flexible than concrete; withstands extreme heat and heavy use; many colors/patterns; easy to repair; enhances beauty and function. Phrases: "Pavers won't crack like concrete and they hold up beautifully over time." / "You can create a custom look that fits your style perfectly."

- Walls/retaining walls: engineered for strength; prevents soil erosion, manages grade; adds usable space; built to last decades. Phrases: "A well-built wall is both functional and beautiful—it's an investment that lasts." / "It gives you more usable space and protects your property."

- Outdoor kitchens: extends living/entertaining space; high-quality components; increases home value; built for our climate; custom designs. Phrases: "You'll enjoy more time with family and friends in a space that feels like a resort." / "Built with premium components that are made to last."

- Fire features: warm inviting atmosphere; extends outdoor living year-round; many styles/sizes; quality materials for safety; focal point. Phrases: "There's nothing like gathering around a fire with family and friends." / "It becomes the favorite spot in your backyard."

- Lighting: highlights features; safety and security; extends enjoyment; energy-efficient, low maintenance; adds value. Phrases: "Lighting transforms your yard at night and makes everything stand out." / "It's the finishing touch that brings the whole project to life."

- Plants & trees: beauty, color, privacy; air quality; shade and comfort; selected for our climate; completes the landscape. Phrases: "The right plants and trees bring your space to life." / "They grow with your home and become more beautiful every year."

- Pro tip: always connect the material to the customer's goals — less maintenance, more enjoyment, long-term value, a space they'll be proud of.

**A2. SQFT vs Linear Feet.** SQFT = area (length × width): artificial turf, pavers/patios, concrete slabs, decomposed granite, bocce courts, putting greens. Example 20' × 15' = 300 sqft. Steps: measure length (longest side), measure width (perpendicular), multiply, always double check before entering into the proposal. Always account for waste, cuts, and edging. LF = length along the run: walls, CMU walls, bender board, edging, steps (per tread), drainage channels. Steps: identify start/end, measure in a straight line (follow contour, total developed length), record LF, note returns/corners/steps/height changes. Always clarify if pricing includes caps, columns, or additional features. Remember: measure it right the first time.

**A3. What we sell by.** SQFT: turf; pavers; rock & soils (1 ton = 100 sqft at 2" depth; add delivery on orders under 300 sqft); retaining walls including 8" CMU walls; countertops for BBQs; travertine and porcelain; patio covers (posts and footers sold separately); painting; stucco and paint; concrete (minimum required for less than 150 sqft); double dig (sold by 2" increments); rock relocation. LINEAR FEET: 6" CMU walls; paver edger; poly tubing; electrical wire; fencing; Romex wire (add 14' if tapping from panel); AWG wire for spas (add 14'); edging; gas lines (add 8' to any linear footage needed). Remember: measure twice, sell with confidence.

**A4. Turf key selling points.** Always carry a competitor sample. Competitor turf: neon colors, black backing with large holes, painted black backing, retains heat, doesn't drain properly, not permeable around trees/shrubs, blades and colors fade sooner, 10–15 yr warranty. RNB turf: natural colors, white proprietary Hydroflow backing (non-painted mesh that reflects sun/heat), micro-perforated for drainage and breathability, breathable around roots, superior blade structure and fade-resistant colors, 25-year warranty. Installation: (1) The base — grade 2–4" to match existing surfaces, install 2–3" of chat (crushed limestone) while others use washed concrete sand; prevents settling, improves drainage. (2) Secure — compact and level chat, lay turf, galvanized nails every 5–6" around the perimeter; galvanized resists rust vs regular nails that rust and stain. (3) Premium infill — power-broomed enviro-green infill (Zeodorizer, Camofill): pet odor control, inhibits bacterial growth, more natural look; stays cooler than plain silica sand. Competitor way: cheaper materials, skip base prep, inferior nails, silica sand. Close: "With a cheaper company you are not getting a discounted price, you are getting a discounted project. We don't cut corners. We build it right the first time."

**A5. Patio covers.** Aircraft-grade aluminum; withstands extreme heat, wind, heavy rain; decades with minimal maintenance; multiple styles/colors/finishes; custom-built to fit; cooling shade, year-round comfort; won't warp, crack, rot, or attract termites; no painting/staining/sealing; wash with water; adds usable living space, curb appeal, long-term value. Rust/corrosion resistant, UV-protected finish, engineered for extreme weather. Options: Solid (maximum shade/protection), Lattice (partial shade with airflow), Insulated (superior temperature control with insulated roof panels). Pro tip: always show photos and material samples. Sold by sqft; posts and footers separate.

**A6. Plants, irrigation & outdoor lighting.** Plants: curb appeal, property value, climate-appropriate (desert), low-water/low-maintenance options, privacy and shade, expert design and placement. Irrigation: water efficiency, healthy plants, custom zoned systems (trees, shrubs, turf, planters), WiFi smart controllers, drip irrigation, high-quality parts. Lighting: extends living space, safety/security, highlights landscape/architecture/trees/water, low-voltage LED, custom design, clean concealed wiring.

**A7. Outdoor kitchens.** Two styles: Stucco finish (clean modern, any stucco color, seamless with home, low-maintenance) and Veneer finish (natural stone veneer, texture and depth, variety of stone, built to impress). Bull equipment in every kitchen — only true lifetime warranty on grills, burners, components. Pricing: outdoor kitchens by LF; gas lines & electrical by LF; granite slabs/Delton by sqft; granite fabrication by sqft; all accessories by unit. Close: "an investment in unforgettable moments with family and friends."

**A8. Pavers.** 45mm for patios, walkways, pool decks, side yards (foot traffic); 60mm for driveways and heavy vehicle traffic. Why pavers: 25-year warranty; more affordable than concrete for a high-end look; stained/damaged — replace that paver; flex with temperature, won't crack like concrete; endless styles/colors; increases property value. Pricing: sold by square footage; Sailor-style edger included in the sqft at no extra charge. Pro tip: pavers outperform concrete in beauty, durability, value.

**A9. Fencing & gates.** Standard fencing: ¼" or ½" vertical bars, wide spacing, see-through, minimal privacy, standard latch. Modern fencing: 2"×1" steel panels, ~1" gap, maximum privacy/security, clean high-end look, stronger, increases value. Standard gate: bars, see-through, no key lock, basic. Modern gate: solid steel panel, minimal gap, key lock, custom look. Why modern: privacy, security, curb appeal, built to last, adds value. 25-year warranty on materials and craftsmanship. Pricing: fencing by LF, gates by unit, includes professional installation.

**A10. 5-Day Training Manual.** Mission: "To deliver exceptional landscapes through quality craftsmanship, honest communication, and an outstanding customer experience." Learn / Practice / Apply / Serve / Succeed. "We build more than landscapes. We build trust. We build relationships. We build a company we are proud of." Day 1 — accounts setup & HCP training: intro email and accounts; HCP leads and navigation; product intro (turf, pavers, rock); installation processes; LF vs sqft cheat sheet; consultation scenario with sample script; get square footage from sample diagram and build the estimate in HCP. Day 2 — product/sales: covered patios incl. electrical, fan beams, footers; built-in kitchens with gas, electrical, water; change orders in HCP; readable diagrams; objection sheet. Day 3/4 — ride along: how to build trust quickly, drawing techniques, closing techniques by doing drops, setting expectations. Day 5 — final evaluation: run real appointments with supervision, handle questions, build design and proposal, present price confidently, do your drops, performance review, strengths & weaknesses, refine pitch. Success tips: be prepared for every appointment; listen more than you talk; follow the process; build trust with every client; practice daily and ask questions; stay hungry, stay humble, keep growing.

**A11. Landscape Consultation Training Scenario.** Objective: build trust, understand needs, educate on installation process, present a solution that provides value before discussing price. Step 1 Introduction — confidence, smile: "Hi, I'm … with Rock N Block. It's a pleasure to meet you. Thank you for having me out today. How are you doing?" Step 2 Discover their vision — before products or pricing: "Tell me about the project you're envisioning." / "What would you like to accomplish with this space?" Listen, take notes, reinforce. Step 3 Build rapport while measuring — "Perfect. I'd love to make that vision come to life." Walk the property, measure accurately, ask questions, point out opportunities, create ideas. Step 4 Build the proposal in HCP — right materials and methods, multiple options, highlight value of each. Step 5 Educate before presenting price — products/materials, installation process, warranty, design benefits, long-term value, why we do things differently. Step 6 Reinforce our value — premium products, expert craftsmanship, exceptional reviews, licensed & insured, 25-year product warranty, 3-year labor warranty. Step 7 Present the proposal — confidently, answer final questions, review once more before revealing price; present financing options. Key principles: listen more than you speak; ask the right questions; offer ideas, don't be an order taker; build rapport and trust; educate before discussing price; respect the customer's time; treat every home like your own; be confident, professional, genuine. "People don't buy the cheapest price… they buy the best value from the people they trust."

**A12. Sales Objection Cheat Sheet.** Pattern: Acknowledge → Understand → Educate → Reframe → Close. "An objection is not a rejection."

1. "It's too expensive." Means: don't see enough value / comparing prices. Response: understand; "If price wasn't the concern, would this be the solution you'd want for your home?" Quality materials, proper installation, results that last save money over time.

2. "We need to get other estimates." Means: want to compare. Response: compare more than price — materials, installation process, warranty, reputation; "we have been in the industry for over 15 years."

3. "We need to think about it." Means: something holding them back. Response: usually one thing — investment, design, timing, or something else? (find the real objection). If none: "What would you need to feel comfortable making a decision today?"

4. "We need to talk to my spouse." Means: someone else must approve. Response: both should be comfortable; "if your spouse was here and loved the design and investment, would you personally feel ready to move forward?"

5. "Your competitor is cheaper." Means: price shopping. Response: ask what the other company included (listen); difference is usually materials, preparation, drainage, installation standards, warranty; build it right the first time so you're not paying twice.

6. "We're not ready yet." Means: timing/budget/other. Response: what needs to happen first? If timing: scheduling and material availability change — "Would it make sense to reserve your spot and plan around your timeline?"

7. "Can you just email me the quote?" Means: price without commitment. Response: happy to; first make sure the proposal matches — "Can I quickly review what's most important to you about this project?"

## Appendix B — Sample diagram dimensions (`content/source/IMG_1384.jpeg`)

Plan view, north up. Labels as drawn:

- Outer boundary width across the top: 34'. Left outer edge height: 17'. Right outer edge height: 25'.

- "Rock Area": a 3'-wide border along the top edge and down both sides; the side runs are labeled 13' (left and right). Left side also shows 3' width; right side 3' width.

- "Turf Area": the region inside the rock border.

- "Paver Area": a rectangle 18' wide × 10' tall, positioned inside the turf area, centered-ish, its bottom edge touching the top of the lower shape.

- Lower shape: 25' wide, with 7' vertical marks on its left and right sides near the top; it extends far below (unlabeled, likely existing house/patio — treat as excluded from all areas). A 5' gap is marked at the lower-left between the outer boundary and this shape.

- Right side, below the rock run: a strip labeled 4'9" wide × 11' tall containing an AC/equipment icon — treat as excluded (equipment pad).

- Ambiguities to document: whether the left 17' equals 3' top + 13' side + 1' remainder, or whether turf extends the full 17'; whether the 5' lower-left gap is rock, turf, or excluded; exact vertical extent of the turf area between the rock border and the lower shape.
