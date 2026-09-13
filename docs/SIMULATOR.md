# Simulator design

Six core homeowners, initially three appointment scenarios each. Tier is attached to the persona; scenario changes project dimensions, budget, priorities, timing or site constraints. Hidden information is available only to server-side prompt construction. Public picker fields are explicitly allowlisted.

A run snapshots its scenario, persona and territory rules. Limits are 40 trainee messages (each with a homeowner response) per appointment and 10 starts per trainee per UTC calendar day. End is idempotent; a failed provider operation can be retried. The store contract requires atomic ownership and concurrency checks; MemorySimStore is confined to preview/tests.

Grading validates the seven weighted dimensions, recalculates total and pass on the server, requires real trainee quotations, and caps close at 9/20 for an early drop. Pass requires 75/100 and at least half in every dimension. Mock grades are fixed illustrative examples with a deterministic early-drop check, never a claim of model assessment quality.

Node 10 verification: `LLM_PROVIDER=mock pnpm test -- sim` passed all 33 tests; typecheck passed. Limits, repeat end, ownership, hidden brief projection, configurable territory, strict grade JSON, exact quote validation and the four required grading fixtures passed.

Provider is selected by runtime environment. No model is chosen before Gate 16. OpenAI implementation uses the Responses API with `store: false`, bounded output/timeout and strict structured output. Runtime requires explicit model and pricing configuration; no default model or price is invented. The adapter has not made a live request. Official implementation references: https://developers.openai.com/api/docs/guides/structured-outputs and https://developers.openai.com/api/reference/typescript/resources/responses/methods/create (reviewed September 13, 2026).

Node 11 verification: content sync passed. Database personas are hard 2, standard 2, warm 2. Six validated briefs contain 18 distinct scenarios and 18 scripted triggers; all 34 tests passed. Scenarios use the unconfigured/default territory until real service areas and caps are supplied.

The immersive extension uses the same MockProvider and SimEngine. Validated scene context is supplied atomically with each turn; it is not added to the public run payload. The new field assessment is distinct from the original seven-dimension sales rubric and is not written to trainee completion. See YARD_REVIEW.md.
