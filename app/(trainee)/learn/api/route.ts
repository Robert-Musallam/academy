import { NextResponse } from 'next/server';
import { actor, sameOrigin } from '@/lib/training/access';
import { learning, learningAction } from '@/lib/training/learning';
export async function POST(request: Request) {
  const member = await actor();
  try {
    await sameOrigin(request);
    const input = learningAction.parse(await request.json());
    return NextResponse.json(await learning(member, input));
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unable to submit' },
      { status: 400 },
    );
  }
}
