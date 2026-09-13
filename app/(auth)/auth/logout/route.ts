import { sessionClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import { sameOrigin } from '@/lib/training/access';
export async function POST(request: Request) {
  await sameOrigin(request);
  await (await sessionClient()).auth.signOut();
  return NextResponse.redirect(new URL('/login', request.url), 303);
}
