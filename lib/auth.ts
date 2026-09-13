import { z } from 'zod';

export const roleSchema = z.enum(['trainee', 'manager', 'admin']);
export type Role = z.infer<typeof roleSchema>;
export const rosterInput = z
  .object({
    email: z.string().trim().toLowerCase().pipe(z.email()),
    tenant_id: z.uuid(),
    track_id: z.union([z.uuid(), z.literal('')]).transform((v) => v || null),
    role: roleSchema,
    manager_id: z.union([z.uuid(), z.literal('')]).transform((v) => v || null),
  })
  .refine(
    (v) => v.role !== 'trainee' || v.track_id !== null,
    'Trainees need a track',
  );

export type Membership = {
  id: string;
  tenant_id: string;
  track_id: string | null;
  role: Role;
  email: string;
};

export async function requestMagicLink(
  input: unknown,
  deps: {
    isRostered: (email: string) => Promise<boolean>;
    send: (email: string) => Promise<void>;
  },
): Promise<{ status: number; message: string }> {
  const parsed = z
    .string()
    .trim()
    .toLowerCase()
    .pipe(z.email())
    .safeParse(input);
  if (!parsed.success)
    return { status: 400, message: 'Enter a valid email address.' };
  if (!(await deps.isRostered(parsed.data)))
    return {
      status: 403,
      message: 'Ask your manager to add you to the Academy roster.',
    };
  await deps.send(parsed.data);
  return { status: 200, message: 'Check your email for your sign-in link.' };
}

export function hasRole(memberships: Membership[], role: Role) {
  return memberships.some((m) => m.role === role || m.role === 'admin');
}
