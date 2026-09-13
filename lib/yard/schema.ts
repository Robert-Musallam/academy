import { z } from 'zod';
export const pointSchema = z.tuple([
  z.number().finite().min(-24).max(24),
  z.number().finite().min(0).max(36),
]);
export const designSchema = z
  .object({
    turf: z.boolean(),
    pavers: z.boolean(),
    bench: pointSchema,
    base: z.enum(['limestone-chat', 'granite-breeze', 'washed-sand']),
  })
  .strict();
export const fieldEvidenceSchema = z
  .object({
    observed: z.array(z.enum(['drainage', 'access', 'tree', 'bed'])).max(4),
    trace: z.array(pointSchema).max(12),
    stations: z.array(z.enum(['S1', 'S2'])).max(2),
    layers: z.array(z.string().max(40)).max(12),
    design: designSchema,
  })
  .strict();
export const answersSchema = z
  .object({
    area: z.number().finite().min(0).max(10000),
    order: z.number().finite().min(0).max(10000),
    slope: z.number().finite().min(0).max(100),
    direction: z.enum(['toward-house', 'away-house', 'unsure']),
  })
  .strict();
export const yardActionSchema = z.discriminatedUnion('action', [
  z
    .object({ action: z.literal('save'), evidence: fieldEvidenceSchema })
    .strict(),
  z
    .object({
      action: z.literal('chat'),
      text: z.string().trim().min(1).max(4000),
      evidence: fieldEvidenceSchema,
    })
    .strict(),
  z
    .object({
      action: z.literal('assess'),
      answers: answersSchema,
      evidence: fieldEvidenceSchema,
    })
    .strict(),
]);
