# Graph execution

| Node                      | Status                                 | Verification                                                                                                                                                     |
| ------------------------- | -------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 0 — Decision manifest     | Supplied by human                      | Retained in `docs/KICKOFF.md`                                                                                                                                    |
| 1 — Repo scaffold         | Verified and committed                 | `pnpm install && pnpm build && pnpm test` exited 0; Next.js 15.5.25 build and 1 source-asset test passed; Supabase initialized; lint and typecheck also exited 0 |
| 2 — Schema                | Draft committed; BLOCKED, not verified | Both local database attempts failed before migration execution; details below                                                                                    |
| 3–18 and final acceptance | Not started                            | Blocked by Node 2; no human gate reached                                                                                                                         |

## Node 2 — stopped under the two-failure rule

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

## Resume

Provide a running Docker-compatible local environment with `psql`, or the prescribed local Postgres 16 environment and its setup script (including Supabase auth/RLS fixtures). Resume at Node 2 and rerun its verification. Expected: 17 public tables and 2 tenants. Do not start Node 3 until it passes.

The project CLI uses `SUPABASE_HOME` set to the checkout's `work/supabase-home`; the bundled Node executable directory was added to PATH for commands in this environment. No production project was accessed, and no Gate 9 or Gate 16 approval has been requested.
