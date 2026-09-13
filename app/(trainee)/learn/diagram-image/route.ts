import { readFile } from 'node:fs/promises';
import { actor } from '@/lib/training/access';
import { allowed } from '@/lib/training/progress';
export async function GET() {
  const m = await actor();
  await allowed(m, 'measurement');
  return new Response(await readFile('content/source/IMG_1384.jpeg'), {
    headers: {
      'Content-Type': 'image/jpeg',
      'Cache-Control': 'private, no-store',
    },
  });
}
