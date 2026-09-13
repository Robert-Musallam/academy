import { z } from 'zod';

const metric = z
  .object({
    value: z.number().finite().positive(),
    unit: z.enum(['sqft', 'lf', 'tons']),
    calculation: z.string().min(1),
  })
  .strict();
export const diagramKeySchema = z
  .object({
    version: z.literal(1),
    approved: z.boolean(),
    model: z.string().min(1),
    tolerance_percent: z.literal(5),
    source: z.string().min(1),
    metrics: z
      .object({
        turf_sqft: metric,
        rock_sqft: metric,
        rock_tons: metric,
        paver_sqft: metric,
        paver_edger_lf: metric,
        turf_waste_sqft: metric,
        turf_order_sqft: metric,
        paver_waste_sqft: metric,
        paver_order_sqft: metric,
      })
      .strict(),
  })
  .strict();
export type DiagramKey = z.infer<typeof diagramKeySchema>;
export type DiagramMetric = keyof DiagramKey['metrics'];

export function gradeDiagram(
  input: Record<string, unknown>,
  rawKey: unknown,
  review = false,
) {
  const key = diagramKeySchema.parse(rawKey);
  if (!key.approved && !review)
    throw new Error('Diagram answer key requires Gate 9 approval');
  const fields = Object.entries(key.metrics).map(([name, metric]) => {
    const value = input[name];
    const allowed = (metric.value * key.tolerance_percent) / 100;
    const epsilon = Number.EPSILON * Math.max(1, metric.value) * 8;
    const passed =
      typeof value === 'number' &&
      Number.isFinite(value) &&
      value >= 0 &&
      Math.abs(value - metric.value) <= allowed + epsilon;
    return { name: name as DiagramMetric, passed };
  });
  return { passed: fields.every((f) => f.passed), fields };
}
