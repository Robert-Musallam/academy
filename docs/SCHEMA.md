# Academy schema — Node 2

Status: drafted; not verified against a running local database yet.

The migration creates exactly 17 tables in `public`. IDs are UUIDs. Every tenant-owned relationship uses a composite foreign key including `tenant_id`, preventing links to another tenant's rows. Seed is idempotent: two tenants (`rnb`, `gcv`), with the Sales & Design Consultant track and the empty Project Manager placeholder under `rnb`.

| Table             | Purpose                                                        | Non-admin access                                                                |
| ----------------- | -------------------------------------------------------------- | ------------------------------------------------------------------------------- |
| tenants           | Tenant identity                                                | Read own tenant membership                                                      |
| tracks            | Tenant training tracks                                         | Read own tenant tracks                                                          |
| roster            | Invitations, auth user mapping, roles, track, assigned manager | Trainees read own active membership; managers read tenant                       |
| modules           | Ordered seven-step path                                        | Trainees read assigned track; managers read tenant                              |
| lessons           | MDX metadata and source hash                                   | Trainees read published lessons in track; managers read tenant including drafts |
| quizzes           | Lesson checks, module exams, free-text and diagram metadata    | Trainees read available metadata; managers read tenant                          |
| questions         | Prompts, options, answers, grading rubrics                     | Managers read tenant; trainee questions served without answers by server        |
| quiz_attempts     | Drawn questions, submissions, exam results                     | Read own / managed tenant                                                       |
| freetext_attempts | Text submissions and grades                                    | Read own / managed tenant                                                       |
| module_progress   | Computed completion state                                      | Read own / managed tenant                                                       |
| personas          | Hidden homeowner briefs                                        | Managers read tenant; safe persona summary served by server                     |
| sim_runs          | Run state and daily quota slots                                | Read own / managed tenant                                                       |
| sim_turns         | User and homeowner messages                                    | Read own / managed tenant                                                       |
| sim_grades        | Validated rubric output                                        | Read own / managed tenant                                                       |
| sim_cost_log      | Per-request token counts and estimated cost                    | Read own / managed tenant                                                       |
| manager_forms     | Ride-along, Day 5, HCP sign-off                                | Trainees read own; managers read/write tenant forms                             |
| digest_log        | Weekly delivery state and idempotency                          | Managers read tenant                                                            |

All tables enable RLS and deny anonymous access. An active admin roster membership grants access across tenants. No role decision trusts user-editable JWT metadata. `user_id` is nullable while a roster invitation awaits account creation; Node 3 must bind it to the verified Supabase identity using trusted server code.

`private.memberships()` is the sole security-definer function. It reads only the caller's active roster memberships, using `auth.uid()`, and avoids recursively evaluating roster policies. The function has an empty search path, schema-qualified names, no writes, and no anonymous execute grant. `private` must remain outside Data API exposed schemas. The admin helper runs as the invoker. See [Supabase RLS guidance](https://supabase.com/docs/guides/database/postgres/row-level-security).

Trainees cannot insert or update their own scores, progress, simulator turns, or grades. Server handlers validate identity, current roster membership, assigned track, unlock prerequisites, and submissions before privileged writes. Managers cannot change roles or roster membership. Their form writes require a same-tenant evaluator that is their own manager membership, and prohibit self-evaluation.

The schema constrains exams to a 90% threshold and 10–15 draws. Node 6 validates a pool of at least 20, computes grades, and enforces unlocks. Simulation daily quota slots are unique per roster/calendar date, restricted to 1–10; turn numbers are limited to 1–40 per user/assistant pair. Node 10 must allocate quota slots and append turns transactionally, select the calendar timezone explicitly, validate persona tier against the run, and implement the rubric's per-dimension pass floor.

RLS prevents tenant escapes; server validation must additionally enforce within-tenant business rules: manager assignments target a manager/admin, modules/personas match the trainee's assigned track, questions in a draw belong to the selected quiz, and manager forms target the Field module. The later nodes implement these rules before exposing the corresponding actions.

Foreign-key and RLS lookup columns have supporting indexes. Content sync must upsert by the scoped slug keys and preserve IDs, because attempts reference these IDs. Quiz answers and hidden briefs are not public content.

## Local verification

Run the exact Node 2 verification in `docs/KICKOFF.md`, using `pnpm exec supabase` for the project CLI. Keep `SUPABASE_HOME` under `work/supabase-home` and do not print Supabase status credentials. The supplied database-only Postgres 16 fallback is permitted only when available; it also needs the minimal Supabase `auth.users`, `auth.uid()`, and database roles for RLS tests. Those fixtures belong in local setup, not a production migration.

Expected results: 17 public tables, 2 tenants, 2 `rnb` tracks, no `gcv` tracks, and RLS enabled on all 17 tables. Do not advance to Node 3 until verification succeeds.
