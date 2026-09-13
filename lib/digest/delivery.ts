import { timingSafeEqual } from 'node:crypto';
export function authorized(header: string | null, secret: string | undefined) {
  if (!secret || !header) return false;
  const a = Buffer.from(header),
    b = Buffer.from(`Bearer ${secret}`);
  return a.length === b.length && timingSafeEqual(a, b);
}
export async function deliverDigest(
  payload: unknown,
  deps: {
    claim: () => Promise<string | null>;
    post: (payload: unknown) => Promise<void>;
    finish: (id: string, status: 'sent' | 'failed') => Promise<void>;
  },
  dryRun = false,
) {
  if (dryRun) return { dryRun: true, payload };
  const id = await deps.claim();
  if (!id) return { skipped: 'Already sent or delivery in progress' };
  try {
    await deps.post(payload);
    await deps.finish(id, 'sent');
    return { sent: true };
  } catch {
    await deps.finish(id, 'failed');
    throw new Error(
      'Digest delivery failed; inspect workflow history before retrying.',
    );
  }
}
