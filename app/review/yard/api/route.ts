import { NextResponse, type NextRequest } from 'next/server';
import { yardActionSchema } from '@/lib/yard/schema';
import {
  getYardSession,
  yardSnapshot,
  yardChat,
  yardAssessment,
} from '@/lib/yard/preview-server';
const allowed = (r: NextRequest) =>
  process.env.NODE_ENV === 'development' &&
  ['localhost', '127.0.0.1'].includes(r.nextUrl.hostname);
function reply(data: unknown, owner: string) {
  const response = NextResponse.json(data, {
    headers: { 'Cache-Control': 'no-store' },
  });
  response.cookies.set('academy-yard', owner, {
    httpOnly: true,
    sameSite: 'strict',
    path: '/review/yard',
    maxAge: 86400,
  });
  return response;
}
export async function GET(request: NextRequest) {
  if (!allowed(request)) return new NextResponse(null, { status: 404 });
  const session = getYardSession(request.cookies.get('academy-yard')?.value);
  return reply(await yardSnapshot(session), session.owner);
}
export async function POST(request: NextRequest) {
  if (!allowed(request)) return new NextResponse(null, { status: 404 });
  if (request.headers.get('origin') !== `http://${request.headers.get('host')}`)
    return new NextResponse(null, { status: 403 });
  if (Number(request.headers.get('content-length') ?? 0) > 18000)
    return new NextResponse(null, { status: 413 });
  const input = yardActionSchema.safeParse(
    await request.json().catch(() => null),
  );
  if (!input.success)
    return NextResponse.json(
      { error: 'Check the submitted measurements and selections.' },
      { status: 400 },
    );
  try {
    const session = getYardSession(request.cookies.get('academy-yard')?.value),
      data = input.data;
    let snapshot;
    if (data.action === 'chat')
      snapshot = await yardChat(session, data.text, data.evidence);
    else if (data.action === 'assess')
      snapshot = await yardAssessment(session, data.answers, data.evidence);
    else {
      if (JSON.stringify(session.evidence) !== JSON.stringify(data.evidence))
        session.result = undefined;
      session.evidence = data.evidence;
      snapshot = await yardSnapshot(session);
    }
    return reply(snapshot, session.owner);
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Preview operation failed' },
      { status: 400 },
    );
  }
}
