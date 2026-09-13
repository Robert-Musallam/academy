# Academy

Training for Rock N Block's Sales & Design Consultants. The execution graph and authoritative training text are in [docs/KICKOFF.md](docs/KICKOFF.md).

## Development

Use Node.js 22 or newer and pnpm 11.19.0.

```sh
pnpm install
pnpm dev
```

Open http://localhost:3000. The scaffold builds without credentials. `.env.example` lists variable names only; configure values in the designated dashboards at Gate 16. Never paste secrets into a task or commit populated environment files.

## Verification

```sh
pnpm build
pnpm test
pnpm lint
pnpm typecheck
pnpm exec playwright install chromium
pnpm test:e2e
```

Local database commands use `pnpm exec supabase`. Node 2 requires a Docker-compatible runtime, or the Postgres 16 fallback provisioned by the environment setup script as described in the kickoff.

## Execution status

See [docs/EXECUTION.md](docs/EXECUTION.md) for completed verifies and the next unverified node. Content review is Gate 9; infrastructure and provider selection are Gate 16. The production platform is not yet deployed.
