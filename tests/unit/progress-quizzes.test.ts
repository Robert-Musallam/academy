import { describe, it, expect } from 'vitest';
import { loadContent } from '@/lib/content/loader';
import {
  drawQuestions,
  gradeChoices,
  publicQuestion,
  freeTextGradeSchema,
} from '@/lib/content/quizzes';
import {
  examPassed,
  trainingPath,
  type ProgressEvidence,
} from '@/lib/progress';

const blank = (): ProgressEvidence => ({
  courses: {},
  passingSimTiers: [],
  field: { rideAlongCompleted: false, day5Passed: false, hcpCompleted: false },
});
const completedCourses = (): ProgressEvidence => ({
  ...blank(),
  courses: Object.fromEntries(
    [1, 2, 3, 4, 5].map((n) => [
      n,
      { examScores: [90], freeTextPassed: true, diagramPassed: true },
    ]),
  ),
});

describe('progress', () => {
  it('locks M2 until M1 has both a passing exam and free-text', () => {
    const e = blank();
    expect(trainingPath(e)[1].status).toBe('locked');
    e.courses[1] = { examScores: [90], freeTextPassed: false };
    expect(trainingPath(e)[1].status).toBe('locked');
    e.courses[1].freeTextPassed = true;
    expect(trainingPath(e)[1].status).toBe('unlocked');
  });
  it('fails 89% and passes 90% without rounding', () => {
    expect(examPassed(89)).toBe(false);
    expect(examPassed(89.999)).toBe(false);
    expect(examPassed(90)).toBe(true);
    expect(examPassed(NaN)).toBe(false);
    expect(examPassed(101)).toBe(false);
  });
  it('requires M3 diagram success in addition to exam and free-text', () => {
    const e = completedCourses();
    e.courses[3]!.diagramPassed = false;
    expect(trainingPath(e)[2].status).toBe('unlocked');
    expect(trainingPath(e)[3].status).toBe('locked');
  });
  it('allows unlimited exam retries and preserves earlier passing attempts', () => {
    const e = blank();
    e.courses[1] = {
      examScores: [...Array(100).fill(80), 90, 50],
      freeTextPassed: true,
    };
    expect(trainingPath(e)[0].status).toBe('passed');
  });
  it('requires all three sim tiers and all Field sign-offs', () => {
    const e = completedCourses();
    e.passingSimTiers = ['warm', 'standard'];
    expect(trainingPath(e)[6].status).toBe('locked');
    e.passingSimTiers.push('hard');
    e.field = {
      rideAlongCompleted: true,
      day5Passed: true,
      hcpCompleted: false,
    };
    expect(trainingPath(e)[6].status).toBe('unlocked');
    e.field.hcpCompleted = true;
    expect(trainingPath(e).every((m) => m.status === 'passed')).toBe(true);
  });
  it('ignores future evidence until prior modules pass', () => {
    const e = completedCourses();
    e.courses[1]!.freeTextPassed = false;
    expect(trainingPath(e)[4].status).toBe('locked');
  });
});

describe('quizzes', () => {
  const modules = loadContent();
  it('has ≥20 traceable questions in each M1–M5 pool and a free-text rubric in every module', () => {
    for (const m of modules) {
      const free = m.quizzes.find((q) => q.data.kind === 'freetext');
      expect(free?.data.questions[0].rubric?.criteria.length).toBeGreaterThan(
        0,
      );
      if (m.order <= 5)
        expect(
          m.quizzes.find((q) => q.data.kind === 'exam')!.data.questions.length,
        ).toBeGreaterThanOrEqual(20);
      for (const l of m.lessons)
        expect(
          m.quizzes.find((q) => q.lessonSlug === l.slug)?.data.questions.length,
        ).toBeGreaterThanOrEqual(3);
    }
  });
  const exam = modules[0].quizzes.find((q) => q.data.kind === 'exam')!.data;
  it('shuffles without replacement and returns the configured draw size', () => {
    const draw = drawQuestions(exam, () => 0);
    expect(draw).toHaveLength(10);
    expect(new Set(draw.map((q) => q.id)).size).toBe(10);
    expect(draw.map((q) => q.id)).not.toEqual(
      exam.questions.slice(0, 10).map((q) => q.id),
    );
  });
  it('scores persisted draws with a 90% threshold', () => {
    const draw = drawQuestions(exam, () => 0);
    const answers = Object.fromEntries(
      draw.map((q) => [q.id, q.correct_answer]),
    );
    delete answers[draw[0].id];
    expect(gradeChoices(draw, answers).passed).toBe(true);
    delete answers[draw[1].id];
    expect(gradeChoices(draw, answers).passed).toBe(false);
  });
  it('strips answers, rubrics, and source quotes from the trainee question payload', () => {
    expect(Object.keys(publicQuestion(exam.questions[0]))).toEqual([
      'id',
      'kind',
      'prompt',
      'options',
    ]);
  });
  it('rejects answers outside the attempt and malformed free-text grades', () => {
    expect(() =>
      gradeChoices(exam.questions.slice(0, 10), { foreign: 0 }),
    ).toThrow();
    expect(
      freeTextGradeSchema.safeParse({ pass: 'yes', feedback: 'ok' }).success,
    ).toBe(false);
  });
});
