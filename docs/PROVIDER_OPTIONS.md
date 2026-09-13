# Gate 16 — provider and model choices

No live provider has been selected or called. Robert chooses the provider, simulation model and grader model before deployment. These are three supported OpenAI configurations for an initial text-only quality evaluation; they are not claims that any model has passed Academy's sales-training acceptance.

## Three concrete configurations

| Option                    | Provider | Simulation model | Grader model   | Estimated 40-turn run + grade |
| ------------------------- | -------- | ---------------- | -------------- | ----------------------------: |
| Economy baseline          | OpenAI   | `gpt-4.1-mini`   | `gpt-4.1-mini` |                         $0.15 |
| Separate grading baseline | OpenAI   | `gpt-4.1-mini`   | `gpt-4.1`      |                         $0.19 |
| Larger model throughout   | OpenAI   | `gpt-4.1`        | `gpt-4.1`      |                         $0.75 |

I recommend evaluating the middle option first: it spends more on the single rubric judgment while keeping the repeated homeowner turns inexpensive. This is an engineering starting point, not an observed quality ranking. Compare it against the other two on the same representative conversations before treating grades as reliable. These non-reasoning models fit the current adapter's output limits and support Responses plus structured outputs. They are not presented as the latest model family. A newer reasoning model is also a valid Gate 16 choice, but its reasoning/output budget and latency need an explicit adapter/configuration review.

Current official published standard text rates, checked September 13, 2026: GPT-4.1 mini input $0.40 and output $1.60 per million tokens; GPT-4.1 input $2.00 and output $8.00. Sources: [GPT-4.1 mini model page](https://developers.openai.com/api/docs/models/gpt-4.1-mini), [GPT-4.1 model page](https://developers.openai.com/api/docs/models/gpt-4.1). Verify account availability and rates in the provider dashboard before choosing. These examples use one implemented provider; Anthropic or another provider requires an adapter and new contract tests in `lib/llm/provider.ts`.

## How the estimates were computed

Assumptions: 40 trainee messages of 120 tokens each, homeowner replies of 180 tokens each, a 120-token opening, 2,000 tokens of persona/policy instructions per chat call, and the full transcript resent each turn. No prompt-cache discount is assumed. The actual prompt includes the persona and its scenarios, so token counts vary with edited content.

- Chat input: `40 × (2,000 + 120 + 120) + (120 + 180) × (0 + … + 39)` = **323,600 tokens**.
- Chat output: `40 × 180` = **7,200 tokens**.
- Final grading input: `2,000 + 120 + 40 × (120 + 180)` = **14,120 tokens**.
- Final grading output allowance: **2,000 tokens**.
- Cost: `(chat input × chat input rate + chat output × chat output rate + grade input × grade input rate + grade output × grade output rate) / 1,000,000`.

Unrounded totals are $0.149808, $0.185200 and $0.749040. Approximately 1,000 such runs would be $150, $185 or $749 in model usage alone. These are estimates, not per-run caps. Longer replies, large prompts, retries and reasoning tokens (if a reasoning model is chosen) can increase costs; shorter appointments and caching can reduce them. Hosting, database, email, taxes, voice and image generation are excluded. The current 3D geometry and material diagrams run locally in the browser and incur no model-rendering charge.

## Dashboard configuration

Set `LLM_PROVIDER`, `LLM_API_KEY`, `LLM_SIM_MODEL`, `LLM_GRADER_MODEL`, and the four nonsecret pricing settings listed in `.env.example`. The adapter requires all four prices so cost logs are not silently zero. For the middle option, use mini's rates for SIM and GPT-4.1's for GRADER. The field-lab chat uses the simulation provider with scene context; its field calculations remain deterministic and separate from sales grading.

Do not paste any key or dashboard secret into chat. Do not use the browser fixture test mode in production. Mock scores are illustrative and should not be accepted as real trainee proficiency.

## Real-provider acceptance after the gate

At Node 18, run an authorized warm appointment and grade; confirm complete structured feedback, exact quoted trainee lines, policy correctness, persona consistency, refusal to reveal hidden briefs, nonzero cost logging and reasonable latency. Include deliberately bad sales behavior when calibrating the rubric, particularly early discounts, missing financing and missing agreed follow-up. Voice/headset VR and additional avatars remain outside this v1 choice.
