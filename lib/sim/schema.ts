import { z } from 'zod';

export const tierSchema = z.enum(['warm', 'standard', 'hard']);
export const scenarioSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  territory: z.string().min(1),
  project: z.string().min(1),
  size: z.string().min(1),
  opening: z.string().min(1),
  hidden_budget: z.string().min(1),
  priority: z.string().min(1),
  constraint: z.string().min(1),
});
export const personaSchema = z
  .object({
    slug: z.string().regex(/^[a-z0-9-]+$/),
    name: z.string().min(1),
    tier: tierSchema,
    market: z.string().min(1),
    primary_objection: z.string().min(1),
    secondary_objection: z.string().nullable(),
    trust_unlock: z.string().min(1),
    spouse_status: z.string().min(1),
    same_day_close_condition: z.string().min(1),
    competitor_quote: z.string().nullable(),
    triggers: z
      .array(
        z.object({
          after_turn: z.number().int().min(1).max(40),
          line: z.string().min(1),
        }),
      )
      .length(3),
    scenarios: z.array(scenarioSchema).min(3),
  })
  .superRefine((p, ctx) => {
    if (new Set(p.scenarios.map((s) => s.id)).size !== p.scenarios.length)
      ctx.addIssue({ code: 'custom', message: 'Duplicate scenario IDs' });
    if (p.tier === 'hard' && (!p.secondary_objection || !p.competitor_quote))
      ctx.addIssue({
        code: 'custom',
        message:
          'Hard persona requires secondary objection and competitor quote',
      });
  });
export type Persona = z.infer<typeof personaSchema>;
export type Scenario = z.infer<typeof scenarioSchema>;
export const weights = {
  rapport: 10,
  discovery: 15,
  measurement: 10,
  education: 20,
  objections: 15,
  close: 20,
  next_step: 10,
} as const;
export type Dimension = keyof typeof weights;
const dimension = (max: number) =>
  z
    .object({
      score: z.number().min(0).max(max),
      reason: z.string().min(1).max(800),
    })
    .strict();
export const gradeSchema = z
  .object({
    dimensions: z
      .object({
        rapport: dimension(10),
        discovery: dimension(15),
        measurement: dimension(10),
        education: dimension(20),
        objections: dimension(15),
        close: dimension(20),
        next_step: dimension(10),
      })
      .strict(),
    fixes: z
      .array(
        z
          .object({
            quote: z.string().min(1).max(4000),
            suggestion: z.string().min(1).max(800),
          })
          .strict(),
      )
      .length(3),
    done_well: z.string().min(1).max(800),
    early_drop: z.boolean(),
    passed: z.boolean(),
  })
  .strict();
export type RawGrade = z.infer<typeof gradeSchema>;
export type Grade = RawGrade & { total_score: number };
export type Message = { role: 'user' | 'assistant'; content: string };
