> Superseded by the approved immersive scope. Current human review: [First playable yard](YARD_REVIEW.md) at `/review/yard`. The text preview below remains available as a reference.

# Human review: simulator preview

Open http://127.0.0.1:3000/review/simulator while the local dev server is running.

Choose a tier, homeowner and scenario. Start, send a few replies, then select **End & see feedback**. Review the seven scoring dimensions, three quoted lines to improve and history. Try another scenario with the same homeowner to compare the project scope and discovery response.

Review whether the selection flow, scenario variety, chat layout and feedback format match your expectations. The preview is responsive for phone use. It includes current warranty guidance and the configured area drop cap. The 18 scenario briefs are synthetic training examples, not customer records or live price quotes.

**This is a scripted preview.** The MockProvider replies and sample scores demonstrate flow, not realistic customer intelligence or validated sales assessment. The fixed 80-point example can be reduced for a detected early drop. Hidden budgets and concerns are revealed only through the scripted discovery paths. Production provider and model selection still happen at Gate 16.

Preview state is separate from training and resets when the server restarts. The real trainee dashboard, exams, progress writes and durable simulator persistence will be finished after this early human review. Node 12 is not marked passed.

Territory adjustment: edit `content/rnb/sales-design-consultant/territories.json`. Keep `default` as the fallback and add real area names under `areas`, each with `max_same_day_drop_percent` and `turf_base`. Set a scenario’s `territory` to its matching area. New appointments use the new settings; an active appointment retains the snapshot it started with. No in-app content editor is introduced.

When approved, resume Node 12 and then continue the dependency graph. Node 13 has not started.

Validation: 34 unit/integration tests, 3 browser/API tests, lint, typecheck and production build pass. Review routes return 404 in production mode. No live provider requests have run.
