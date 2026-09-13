import { randomInt } from 'node:crypto';
import { z } from 'zod';
import { type Question, type Quiz, quizSchema } from './schemas';

export function drawQuestions(
  quiz: Quiz,
  random = (limit: number) => randomInt(limit),
) {
  const valid = quizSchema.parse(quiz);
  const pool = [...valid.questions];
  for (let i = pool.length - 1; i > 0; i--) {
    const j = random(i + 1);
    if (!Number.isInteger(j) || j < 0 || j > i)
      throw new Error('Invalid shuffle index');
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  return pool.slice(0, valid.draw_count);
}

export function publicQuestion(question: Question) {
  return {
    id: question.id,
    kind: question.kind,
    prompt: question.prompt,
    options: question.options,
  };
}

// Server must load the exact persisted draw for the attempt, never one supplied
// by the client. Unlimited retries create separate immutable attempts.
export function gradeChoices(
  draw: Question[],
  answers: Record<string, unknown>,
) {
  if (!draw.length || new Set(draw.map((q) => q.id)).size !== draw.length)
    throw new Error('Invalid attempt draw');
  if (Object.keys(answers).some((id) => !draw.some((q) => q.id === id)))
    throw new Error('Answer outside attempt');
  let correct = 0;
  for (const q of draw) {
    if (q.kind !== 'single_choice')
      throw new Error('Use the appropriate grader for this question type');
    const answer = answers[q.id];
    if (Number.isInteger(answer) && answer === q.correct_answer) correct++;
  }
  return {
    correct,
    total: draw.length,
    score: (correct / draw.length) * 100,
    passed: correct * 10 >= draw.length * 9,
  };
}

export const freeTextGradeSchema = z
  .object({ pass: z.boolean(), feedback: z.string().trim().min(1).max(500) })
  .strict();
export type FreeTextGrade = z.infer<typeof freeTextGradeSchema>;
