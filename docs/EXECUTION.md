# Graph execution

| Node                      | Status                 | Verification                                                                                                                                                     |
| ------------------------- | ---------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 0 — Decision manifest     | Supplied by human      | Retained in `docs/KICKOFF.md`                                                                                                                                    |
| 1 — Repo scaffold         | Verified and committed | `pnpm install && pnpm build && pnpm test` exited 0; Next.js 15.5.25 build and 1 source-asset test passed; Supabase initialized; lint and typecheck also exited 0 |
| 2 — Schema                | VERIFIED (2026-09-13)  | Docker Supabase start/reset passed; public tables = 17; tenants = 2; transactional RLS assertions passed                                                         |
| 3–18 and final acceptance | Not started            | Next: Node 3; no human gate reached                                                                                                                              |

## Previous Node 2 environment blockage (resolved 2026-09-13)

The migration, idempotent seed, and `docs/SCHEMA.md` are drafts. They have not been applied to a database or tested for SQL correctness or RLS behavior. A commit preserves this work; it does not mark the node complete.

First verification attempt:

```sh
pnpm exec supabase start > /dev/null && pnpm exec supabase db reset --local > /dev/null && psql 'postgres://postgres:postgres@127.0.0.1:54322/postgres' -v ON_ERROR_STOP=1 -c "select count(*) from information_schema.tables where table_schema='public'" -c 'select count(*) from tenants'
```

Result: exit 1 at Supabase startup. No command output was returned; startup stdout was suppressed because it can contain credentials. Diagnostic checks reported:

```text
zsh:1: command not found: docker
zsh:2: command not found: psql
```

The one recovery attempt substituted the exact local Postgres 16 URL provided in the kickoff:

```sh
psql 'postgres://postgres:postgres@localhost:5432/academy' -v ON_ERROR_STOP=1 -1 -f supabase/migrations/20260913015118_academy_schema.sql -f supabase/seed.sql -c "select count(*) from information_schema.tables where table_schema='public'" -c 'select count(*) from tenants'
```

Result: exit 127.

```text
zsh:1: command not found: psql
```

Diagnosis: this local macOS environment lacks the Docker runtime and PostgreSQL client required by the graph. No environment setup script was found in this repository. The fallback database's availability could not be verified. Neither migration nor seed executed.

## Resumed verification: PASS

Docker Desktop and psql are now installed. `pnpm exec supabase start` succeeded. The literal kickoff verification reset the database successfully, but its `status -o env | grep DB_URL` expression supplied no usable connection string to psql. One fix used the local Supabase endpoint configured in `supabase/config.toml` (port 54322), then repeated start/reset and both count queries: **17** public tables and **2** tenants. `tests/sql/schema-rls.sql` also passed: all tables have RLS, trainee isolation, manager tenant restriction, admin access, disabled membership denial, anonymous denial, and prevention of role/score forgery. All test fixtures rolled back. The Postgres 16 fallback is no longer used.

Next unverified node: **Node 3**.

### Historical resume requirements (satisfied)

Provide a running Docker-compatible local environment with `psql`, or the prescribed local Postgres 16 environment and its setup script (including Supabase auth/RLS fixtures). Resume at Node 2 and rerun its verification. Expected: 17 public tables and 2 tenants. Do not start Node 3 until it passes.

The project CLI uses `SUPABASE_HOME` set to the checkout's `work/supabase-home`; the bundled Node executable directory was added to PATH for commands in this environment. No production project was accessed, and no Gate 9 or Gate 16 approval has been requested.

## Node 3 — VERIFIED

`pnpm test -- auth` passed (7 tests including the real Postgres RLS suite); `pnpm build` passed after marking the protected roster page dynamic. Unit tests confirm rostered email dispatch and non-roster 403 without dispatch. Email transport is stubbed for these tests; actual email delivery remains part of deployed acceptance. Admin creates the auth identity when adding a roster row; public signup is disabled in Supabase config and every magic-link request sets `shouldCreateUser: false`. Session checks use verified auth identity plus active roster membership. Next: Node 4.

## Node 4 — VERIFIED

Fixture content lint exited 0; fixture sync exited 0; `select count(*) from lessons` returned **1**. Both content validation tests passed. The fixture is draft-only at lesson order 99. Next: Node 5.

## Node 5 — VERIFIED

Content lint and content sync exited 0. Database counts: **7** modules in the Sales & Design Consultant track and **29** non-draft lessons. All 29 MDX bodies compiled successfully through `next-mdx-remote/serialize`. `docs/SOURCE_INDEX.md` maps the source sheets to every lesson. Next: Node 6.
