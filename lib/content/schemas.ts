import { z } from 'zod';

export const slugSchema = z.string().regex(/^[a-z0-9]+(-[a-z0-9]+)*$/);
export const frontmatterSchema = z.object({
  title: z.string().min(1),
  order: z.number().int().positive(),
  estimated_minutes: z.number().int().positive(),
  draft: z.boolean(),
  source_sheet: z.string().min(1),
});
export const moduleSchema = z.object({
  title: z.string().min(1),
  order: z.number().int().min(1).max(7),
  kind: z.enum(['course', 'simulator', 'field']),
});
export const questionSchema = z
  .object({
    id: slugSchema,
    kind: z.enum(['single_choice', 'multiple_choice', 'freetext', 'numeric']),
    prompt: z.string().min(1),
    options: z.array(z.string()).default([]),
    correct_answer: z.union([z.number(), z.array(z.number()), z.null()]),
    rubric: z
      .object({
        criteria: z.array(z.string()).min(1),
        pass_rule: z.string().min(1),
      })
      .optional(),
    source_reference: slugSchema,
    source_quote: z.string().min(1),
  })
  .superRefine((q, ctx) => {
    if (
      q.kind === 'single_choice' &&
      (q.options.length < 2 ||
        typeof q.correct_answer !== 'number' ||
        !Number.isInteger(q.correct_answer) ||
        q.correct_answer < 0 ||
        q.correct_answer >= q.options.length)
    )
      ctx.addIssue({ code: 'custom', message: 'Invalid choice answer' });
    if (q.kind === 'freetext' && !q.rubric)
      ctx.addIssue({ code: 'custom', message: 'Free-text needs a rubric' });
  });
export const quizSchema = z
  .object({
    kind: z.enum(['lesson', 'exam', 'freetext', 'diagram']),
    draw_count: z.number().int().positive(),
    pass_percent: z.number().min(0).max(100).nullable(),
    questions: z.array(questionSchema).min(1),
  })
  .superRefine((q, ctx) => {
    if (q.draw_count > q.questions.length)
      ctx.addIssue({ code: 'custom', message: 'Draw exceeds pool' });
    if (new Set(q.questions.map((v) => v.id)).size !== q.questions.length)
      ctx.addIssue({ code: 'custom', message: 'Duplicate question id' });
    if (
      q.kind === 'lesson' &&
      (q.questions.length < 3 || q.questions.length > 5)
    )
      ctx.addIssue({
        code: 'custom',
        message: 'Lesson checks need 3–5 questions',
      });
    if (
      q.kind === 'exam' &&
      (q.questions.length < 20 ||
        q.draw_count < 10 ||
        q.draw_count > 15 ||
        q.pass_percent !== 90)
    )
      ctx.addIssue({
        code: 'custom',
        message: 'Exam requires ≥20 pool, 10–15 draws, 90% pass',
      });
  });
export type Question = z.infer<typeof questionSchema>;
export type Quiz = z.infer<typeof quizSchema>;
