import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { previewSession, previewHistory } from '@/lib/sim/preview';
import { loadPersonas } from '@/lib/sim/personas';
import { publicRun } from '@/lib/sim/engine';
const allowed = (request: NextRequest) =>
  process.env.NODE_ENV === 'development' &&
  ['localhost', '127.0.0.1', '[::1]'].includes(request.nextUrl.hostname);
const actionSchema = z.discriminatedUnion('action', [
  z
    .object({
      action: z.literal('start'),
      persona: z.string(),
      scenario: z.string(),
    })
    .strict(),
  z
    .object({
      action: z.literal('send'),
      id: z.string().uuid(),
      text: z.string().trim().min(1).max(4000),
    })
    .strict(),
  z.object({ action: z.literal('end'), id: z.string().uuid() }).strict(),
]);
export async function GET(request: NextRequest) {
  if (!allowed(request)) return new NextResponse(null, { status: 404 });
  const session = previewSession(request.cookies.get('academy-preview')?.value);
  const response = NextResponse.json({
    history: await previewHistory(session.owner),
  });
  response.cookies.set('academy-preview', session.owner, {
    httpOnly: true,
    sameSite: 'strict',
    path: '/review/simulator',
    maxAge: 86400,
  });
  return response;
}
export async function POST(request: NextRequest) {
  if (!allowed(request)) return new NextResponse(null, { status: 404 });
  if (request.headers.get('origin') !== `http://${request.headers.get('host')}`)
    return new NextResponse(null, { status: 403 });
  if (Number(request.headers.get('content-length') ?? 0) > 16000)
    return new NextResponse(null, { status: 413 });
  const parsed = actionSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success)
    return NextResponse.json(
      { error: 'Check your appointment request.' },
      { status: 400 },
    );
  try {
    const session = previewSession(
        request.cookies.get('academy-preview')?.value,
      ),
      input = parsed.data;
    let run;
    if (input.action === 'start') {
      const persona = loadPersonas().find((p) => p.slug === input.persona);
      if (!persona) throw new Error('Choose a homeowner');
      const created = await session.engine.start(
        session.owner,
        persona,
        input.scenario,
      );
      session.ids.push(created.id);
      run = publicRun(created);
    } else if (input.action === 'send')
      run = await session.engine.send(session.owner, input.id, input.text);
    else run = await session.engine.end(session.owner, input.id);
    const response = NextResponse.json({
      run,
      history: await previewHistory(session.owner),
    });
    response.cookies.set('academy-preview', session.owner, {
      httpOnly: true,
      sameSite: 'strict',
      path: '/review/simulator',
      maxAge: 86400,
    });
    return response;
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : 'Preview request failed.',
      },
      { status: 400 },
    );
  }
}
