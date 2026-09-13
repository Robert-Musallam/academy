# Graph execution

| Node                      | Status            | Verification                                                                                                                                   |
| ------------------------- | ----------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| 0 — Decision manifest     | Supplied by human | Retained in `docs/KICKOFF.md`                                                                                                                  |
| 1 — Repo scaffold         | Verified          | `pnpm install && pnpm build && pnpm test` exited 0; Next.js 15.5.25 production build and 1 source-asset test passed; `supabase init` completed |
| 2–18 and final acceptance | Not started       | Depend on earlier verified outputs and human gates                                                                                             |

Next unverified node: Node 2 — Schema. No human gate has been reached.
