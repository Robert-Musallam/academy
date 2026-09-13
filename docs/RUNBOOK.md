# Academy v1 runbook

## Current delivery boundary

The local build contains the complete trainee, manager and admin workflow plus the approved first 3D property. Infrastructure creation, production migrations, real model quality, live email and Teams delivery wait for Gates 16–18. The six personas have 18 written appointment variations; the field lab is one reusable property with turf and paver cutaways. It is browser 3D, with a 2D alternative, not headset VR.

## Add a trainee

1. Sign in as an active admin and open `/admin/roster`.
2. Enter the email, tenant, non-placeholder track, trainee role and optional manager from that tenant. Save. Academy creates an auth identity without sending an unsolicited invitation.
3. Ask the trainee to visit `/login` and request their own magic link. Non-roster/inactive emails are rejected; self-signup is disabled.
4. The callback opens `/learn` for trainees, `/manager` for managers and `/admin/roster` for admins. Set the Supabase site/redirect URLs and production SMTP at Gate 16 before expecting real delivery.
5. To remove access, edit the membership and clear **Active membership**. Historical results remain. Reassign a manager's active direct reports before deactivating that manager. You cannot remove your own admin role/access through this screen. Email/tenant changes are not casual edits; preserve the identity and history. Existing activity prevents changing its track.

## Trainee path

`/learn` displays all seven modules and their status. Published MDX lessons have informational checks. M1–M5 require a shuffled 10-question exam at 90% and a passing written explanation. Retries create new attempts; submitted attempts cannot be rewritten. M3 also requires all approved diagram values within ±5%. Read its diagram lesson for the source image and geometric assumptions.

M6 unlocks after M5. `/learn/field-lab` opens the approved spatial practice property. Explore, measure, assess slope, inspect material layers, propose a layout, talk to Maya and submit a field debrief. **Save practice** before leaving; chat/debrief also save. Saved practice is account-scoped. The field score does not replace the sales rubric. Opening a new field practice conversation uses one daily appointment slot; subsequent visits resume it. Its conversation also appears in appointment history.

`/sim` offers six homeowners, three scenarios each. Each appointment permits 40 trainee turns; end it to see the rubric, three quoted fixes and one strength. One passing run at each tier (warm, standard, hard) completes M6. The limit is 10 runs per roster membership per UTC calendar day, including field practice. History persists across reloads and server restarts. Provider errors leave committed turns unchanged; retry after a failed operation or a two-minute abandoned lease.

`/learn/history` shows checks/exams and written explanations. Mock mode is clearly labeled and produces illustrative feedback; it must not be treated as validated sales assessment.

## Coach and complete field training

Managers open `/manager` to see active trainees in their tenant, module statuses, quiz results and simulator counts. Open a trainee for explanations, rubric dimensions, fixes and forms. Admins can review all tenants; saving a form requires an evaluator membership in the trainee's tenant.

The ride-along has four 1–5 ratings plus notes. Day 5 has the eight manual items, strengths, weaknesses, coaching notes and an explicit pass decision. HCP sign-off records the manager's observation only; Academy never connects to HCP. HCP can be signed off after Measurement unlocks; ride-along/Day 5 require Field access. M7 passes only after M6 plus completed ride-along, passing Day 5 and completed HCP. Withdrawing Day 5 pass or HCP sign-off removes M7 completion.

## Add or update a lesson

Edit MDX under `content/<tenant>/<track>/<module>/`, with the required frontmatter. Keep imports/exports out of MDX; only approved callouts are available. Use a unique slug/order and preserve existing slugs for stable IDs. Put the 3–5-question check at `<lesson-slug>/quiz.json`. Every question's source reference/quote must match its lesson. Exam pools require at least 20 questions and draw 10–15 at 90%. Free-text prompts carry a rubric. Set `draft: true` until human review; drafts are hidden from trainee pages and checks.

Run `pnpm content:lint --complete`, review the diff, then `pnpm content:sync` against the authorized local database. All database upserts preserve scoped slug identities. Changes to existing questions require reviewing outstanding attempts; historical results are not retroactively rescored. Production content sync is introduced in Node 17, after infrastructure approval. No content editor exists in v1.

## Add a persona or scenario

For RNB, edit validated JSON in `content/rnb/sales-design-consultant/simulator/personas/`. Keep six core personas and the 2 warm / 2 standard / 2 hard split unless Robert approves changing it. Add scenario variants under a persona with unique IDs, public project/size and private discovery/objection details. Hidden budgets and briefs stay server-side; never place them in client props. Run content lint, persona/simulator tests and content sync. Material territory choices and the same-day drop cap live in `territories.json`; new runs snapshot their selected policy. Historical runs retain theirs.

## Add a tenant or track

Create tenant/track rows in a reviewed migration, using unique slugs and composite tenant relationships. Add content under matching slugs with module positions 1–7. Use `is_placeholder` until the track is ready; placeholders are not available for new trainee assignment. Create staff memberships in the correct tenant and review RLS tests before launch. GCV currently has no published track. The first 3D field lab is RNB-specific; additional tenant property libraries require their own content configuration. The single Teams webhook is RNB-only; do not send a second tenant into that channel.

## Configure or rotate a provider

Review PROVIDER_OPTIONS.md and select at Gate 16. All provider calls live in `lib/llm/provider.ts`. Set model, provider and price variables only in the hosting dashboard; never paste credentials into a task, terminal output, PR, or file. Redeploy to apply changes. New calls use the selected model; each usage record stores the actual provider/model and estimated cost. The OpenAI adapter uses the Responses API with structured grading. Another provider requires an adapter in that file and contract tests. Run the mock suite, then one explicitly authorized live smoke and human quality review. Free-text and simulator graders need real-world calibration; passing mock tests does not establish rubric quality.

## Weekly Teams digest

Vercel checks Mondays at 13:00 and 14:00 UTC; the handler only sends during 07:00 America/Denver. The reporting period is the previous complete local calendar week. Lists are bounded to keep the card below Teams' payload size; totals include all matching records. Activity is the latest saved module work (including simulator/field work). Completed field graduates are not marked stalled.

The route requires the configured cron authorization header on every call. `?dry-run=1` returns payload without a post or delivery-log mutation. `?manual=1` bypasses the time guard only; it still requires authorization and a delivery claim. Never expose the credential in a URL. `digest_log` records pending/sent/failed weeks and attempts. A sent or active pending week is skipped. After a timeout or failed acknowledgement, inspect Teams workflow history before retrying: the external service may have accepted the card despite the failed response. A successful HTTP response still needs channel confirmation at live acceptance.

Use a Teams Workflows incoming webhook that accepts the Adaptive Card attachment envelope, with a maintained owner and co-owner. Set its generated URL only as TEAMS_WEBHOOK_URL in Vercel. [Microsoft setup](https://learn.microsoft.com/en-us/microsoftteams/platform/webhooks-and-connectors/how-to/add-incoming-webhook), [Vercel cron authorization](https://vercel.com/docs/cron-jobs/manage-cron-jobs).

## Local development and verification

Use the project's pinned pnpm/runtime. Start Docker Desktop, then `pnpm exec supabase start` with credential-bearing CLI output suppressed. The local database is the configured loopback port 54322. Apply migrations and sync local content before browser tests; do not reset populated databases without a deliberate fixture-reset decision. No existing production project is in scope.

`pnpm lint && pnpm build && LLM_PROVIDER=mock pnpm test && LLM_PROVIDER=mock pnpm test:e2e`

Browser tests start their own loopback dev server; stop any other dev server on port 3000 first. The test server enables ACADEMY_E2E only for synthetic local identities, bypassing email transport while exercising real local database persistence. Production ignores the switch. Never configure ACADEMY_E2E in hosting. Fixture cookies are not real sessions or credentials. JWT/RLS checks run separately against Postgres; live SMTP, real model behavior and workflow delivery require deployed acceptance. The test support does not populate or access any API key.

Review production 404 behavior for `/review`, `/review/simulator` and `/review/yard`; these remain development-only. The production trainee/manager/admin routes require active Supabase membership. Operations are not complete until Gates 16–18 and the final real-trainee acceptance pass.

## v2 scope

Headset VR, voice and avatars; more spatial properties and full 3D material catalog; Entra SSO; in-app content editing; HCP sandbox integration; project-manager and GCV tracks. Current tenant isolation, six-persona variation and approved field lab remain the v1 foundation.
