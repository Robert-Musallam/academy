import { z } from 'zod';
import config from '@/content/rnb/sales-design-consultant/territories.json';
const policySchema = z
  .object({
    max_same_day_drop_percent: z.number().min(0).max(100),
    turf_base: z.string().min(1),
  })
  .strict();
const configSchema = z
  .object({
    version: z.literal(1),
    default: policySchema,
    areas: z.record(z.string(), policySchema),
  })
  .strict();
export type SalesPolicy = z.infer<typeof policySchema>;
export function territoryPolicy(
  area: string,
  settings: unknown = config,
): SalesPolicy {
  const parsed = configSchema.parse(settings);
  return { ...(parsed.areas[area] ?? parsed.default) };
}
export function policyPrompt(policy: SalesPolicy) {
  return `Approved policy: lifetime turf warranty; 3-year pavers and other materials warranty; 3-year labor warranty. Separate Bull equipment lifetime warranty. Turf base: ${policy.turf_base}, 2–3 inches after grading 2–4 inches. Company 15+ years, licensed and insured. Educate about product, installation, warranty and value before price. Full proposal and reinforced value BEFORE any same-day drop. Area cap ${policy.max_same_day_drop_percent}%. Financing accompanies every proposal; never invent finance terms. Use Acknowledge, Understand, Educate, Reframe, Close. Ask for the business. Agree next contact and give personal number. Measure by correct units; paver sailor edger included; turf/paver waste 10%; rock 1 ton/100 sqft at 2 inch depth.`;
}
