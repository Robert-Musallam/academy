import { NextResponse } from 'next/server';
import { actor, sameOrigin } from '@/lib/training/access';
import { allowed, touch } from '@/lib/training/progress';
import { savedYard } from '@/lib/yard/database';
import { yardActionSchema } from '@/lib/yard/schema';
export async function GET() {
  const m = await actor();
  await allowed(m, 'simulator');
  return NextResponse.json(await savedYard(m));
}
export async function POST(request: Request) {
  const m = await actor();
  try {
    await sameOrigin(request);
    const mod = await allowed(m, 'simulator');
    const result = await savedYard(
      m,
      yardActionSchema.parse(await request.json()),
    );
    await touch(m, mod.id);
    return NextResponse.json(result);
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Unable to save practice' },
      { status: 400 },
    );
  }
}
