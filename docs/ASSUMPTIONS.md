> Current state and approved overrides: [EXECUTION.md](EXECUTION.md) and [AMENDMENTS.md](AMENDMENTS.md). Earlier blocker notes below are historical and have been resolved.

# Assumptions and execution decisions

- The supplied kickoff appears twice, first as plain text and then as Markdown. The Markdown copy is retained in `docs/KICKOFF.md` as the execution manifest; both describe the same graph.
- The sandbox started without a checkout. The existing `Robert-Musallam/academy` repository was cloned into `academy/`; all project changes take place there on branch `content-v1`.
- All 13 PNG sheets and `IMG_1384.jpeg` were already committed on `main`. Original assets remain unchanged.
- Node 1 uses the latest available Next.js 15 patch, TypeScript strict mode, Tailwind 3, and pinned dependencies. Node 24 and pnpm 11 are provided by the local runtime. No remote font download is required to build.
- `.env.example` contains names only, as requested. It is an inventory, not a populated dotenv file. No environment value or credential is read or written by scaffold code.
- Supabase CLI is a pinned project development dependency, invoked as `pnpm exec supabase`.
- The CLI's documented `SUPABASE_HOME` override points to `work/supabase-home` to keep machine state inside the checkout and avoid using existing credentials. See [Supabase CLI state layout](https://github.com/supabase/cli/blob/develop/apps/cli/docs/supabase-home.md).
- No local Git author identity was configured. Node commits use the repository-local automation identity `Codex <codex@users.noreply.github.com>`.
- Initial inspection found neither a Docker runtime nor the prescribed Postgres 16 setup. Node 2 cannot be marked verified without a working authorized local database.
- Gate 9 and Gate 16 remain mandatory stops. No production services are accessed during local implementation.

## Items to resolve in their dependent nodes

- The module-specific pass table governs simulator and field completion. Node 13's abbreviated verification must also include the HCP sign-off and prerequisites required by the manifest.
- Multiple lessons in one module need unique quiz paths; the content pipeline must document a deterministic layout before Node 4 verification.
- The fixed UTC cron in Node 14 does not track Denver daylight saving time year-round; resolve that scheduling conflict before implementing the digest.

## Node 2 environment substitution attempt

- Local Supabase startup failed. The single recovery attempt used the kickoff's prescribed Postgres 16 fallback URL instead of obtaining a URL from `supabase status`, which can print credentials.
- The recovery failed because `psql` is not installed. No database migration or seed ran; the schema is an unverified draft. Execution stops at Node 2 under the user's two-failure rule.

## Node 2 resumed verification

- Docker Desktop and psql are now available. Tests use Docker Supabase (Postgres 17 from the initialized config), not the Postgres 16 fallback.
- The literal status/grep expression supplied no usable DB URL. The verified command uses the configured local Supabase endpoint at 127.0.0.1:54322; credentials are never displayed by status.

## Progress and content sequencing

- The module-specific pass table governs M6 and M7. Their required free-text prompts are practice; simulator tiers and manager forms determine passing.
- Node 6 creates quizzes for existing lessons. Node 7 introduces the four draft lessons together with their lesson checks. Draft checks stay unavailable through the lesson RLS policy, and existing module exams do not draw draft lesson questions.
