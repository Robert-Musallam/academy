import { it, expect } from 'vitest';
import key from '@/content/rnb/sales-design-consultant/measurement/diagram-exercise/answer-key.json';
import { diagramKeySchema, gradeDiagram } from '@/lib/content/diagram';

const values = (factor = 1) =>
  Object.fromEntries(
    Object.entries(key.metrics).map(([name, metric]) => [
      name,
      metric.value * factor,
    ]),
  );
it('diagram: proposed key has the required schema and reconciles the selected geometry', () => {
  expect(diagramKeySchema.safeParse(key).success).toBe(true);
  expect(
    key.metrics.turf_sqft.value +
      key.metrics.rock_sqft.value +
      key.metrics.paver_sqft.value,
  ).toBe(34 * 16);
  expect(key.metrics.rock_tons.value * 100).toBe(key.metrics.rock_sqft.value);
  expect(key.metrics.paver_edger_lf.value).toBe(2 * (18 + 10));
});
it('diagram: accepts the proposed key and inclusive ±5% in review mode', () => {
  for (const factor of [0.95, 1, 1.05])
    expect(gradeDiagram(values(factor), key, true).passed).toBe(true);
});
it('diagram: rejects ±8% on each field independently', () => {
  for (const name of Object.keys(key.metrics))
    for (const factor of [0.92, 1.08]) {
      const submission = values();
      submission[name] *= factor;
      expect(gradeDiagram(submission, key, true).passed).toBe(false);
    }
});
it('diagram: rejects missing, non-finite, negative, and textual answers', () => {
  for (const invalid of [undefined, NaN, Infinity, -1, '184'])
    expect(
      gradeDiagram({ ...values(), turf_sqft: invalid }, key, true).passed,
    ).toBe(false);
});
it('diagram: cannot grade trainees using an unapproved answer key', () => {
  expect(() => gradeDiagram(values(), { ...key, approved: false })).toThrow(
    'Gate 9',
  );
  expect(gradeDiagram(values(), { ...key, approved: true }).passed).toBe(true);
});
