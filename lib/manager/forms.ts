import { z } from 'zod';
export const rideItems = {
  trust_building: 'Build trust quickly',
  drawing: 'Drawing technique',
  closing: 'Closing and appropriate drops',
  expectations: 'Set clear expectations',
};
export const dayItems = {
  appointments: 'Run appointments with supervision',
  questions: 'Handle customer questions',
  proposal: 'Build the design and proposal',
  price: 'Present price confidently',
  drops: 'Use drops appropriately',
  review: 'Review performance',
  reflection: 'Identify strengths and weaknesses',
  pitch: 'Refine the pitch',
};
const rating = z
  .object({
    score: z.number().int().min(1).max(5),
    notes: z.string().max(2000),
  })
  .strict();
export const formSchema = z.discriminatedUnion('type', [
  z
    .object({
      type: z.literal('ride_along'),
      ratings: z
        .object({
          trust_building: rating,
          drawing: rating,
          closing: rating,
          expectations: rating,
        })
        .strict(),
      notes: z.string().max(4000),
    })
    .strict(),
  z
    .object({
      type: z.literal('day5_eval'),
      ratings: z
        .object({
          appointments: rating,
          questions: rating,
          proposal: rating,
          price: rating,
          drops: rating,
          review: rating,
          reflection: rating,
          pitch: rating,
        })
        .strict(),
      strengths: z.string().trim().min(1).max(3000),
      weaknesses: z.string().trim().min(1).max(3000),
      passed: z.boolean(),
      notes: z.string().max(4000),
    })
    .strict(),
  z
    .object({
      type: z.literal('hcp_exercise'),
      passed: z.boolean(),
      notes: z.string().max(4000),
    })
    .strict(),
]);
