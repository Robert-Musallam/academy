# Node 9 — HUMAN GATE: content review

Depends on verified Nodes 6, 7, and 8. Execution stops here; Node 10 has not started.

## Local review

```sh
pnpm install
pnpm dev
```

Open [the local review page](http://localhost:3000/review). This development-only page renders all lessons, draft badges, original source links, answer-marked checks, module exam pools, and free-text rubrics. `/review` and its source-file route return 404 in production. No credentials are needed for this local content review. No Vercel preview is available because infrastructure creation is deferred to Gate 16.

## Read all four drafts

- [Pre-Appointment Prep Checklist](../content/rnb/sales-design-consultant/foundations/pre-appointment-prep.mdx)
- [Presenting the Price](../content/rnb/sales-design-consultant/closing/presenting-the-price.mdx)
- [The Same-Day Drop & Financing](../content/rnb/sales-design-consultant/closing/same-day-drop-and-financing.mdx)
- [When They Don't Sign — the Exit Script](../content/rnb/sales-design-consultant/closing/exit-script.mdx)

## Confirm or correct the diagram

Read [every geometric assumption and alternative](DIAGRAM_ASSUMPTIONS.md) alongside the [original diagram](../content/source/IMG_1384.jpeg) and [proposed key](../content/rnb/sales-design-consultant/measurement/diagram-exercise/answer-key.json). The proposed key uses 184 sqft turf, 180 sqft rock (1.8 tons), 180 sqft pavers, and 56 LF edger. Turf including waste is 202.4 sqft; pavers including waste are 198 sqft. These are conditional on the stated 34 × 16-foot model, not uniquely determined by the drawing.

The key remains unapproved and cannot grade trainees. Confirm the 13-foot label interpretation, work depth, lower-left gap, and equipment strip position, or provide corrected dimensions.

## Spot-check three source lessons

Suggested checks: [Turf](../content/rnb/sales-design-consultant/products/turf.mdx), [What We Sell By](../content/rnb/sales-design-consultant/measurement/sold-by.mdx), and [Fencing & Gates](../content/rnb/sales-design-consultant/products/fencing-gates.mdx). [Source index](SOURCE_INDEX.md) links each lesson to its sheet. Fencing preserves A9's materials/craftsmanship wording and separately instructs reps to use the manifest's 25-year product / 3-year labor wording in proposals; confirm this treatment.

## Resume signal — from the kickoff

Human must: Read the 4 draft lessons and either approve or edit; confirm or correct the diagram answer key; spot-check 3 transcribed lessons against the sheets.

Resume signal: PR merged, or reply **GATE 9 APPROVED** with any edits listed. On approval, flip the 4 drafts to `draft: false` and mark the confirmed diagram key approved, then sync and verify before proceeding.
