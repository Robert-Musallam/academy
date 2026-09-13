import { readFile } from 'node:fs/promises';
import path from 'node:path';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ name: string }> },
) {
  if (process.env.NODE_ENV !== 'development')
    return new Response(null, { status: 404 });
  const { name } = await params;
  if (!/^(?:[A-F0-9-]+\.PNG|IMG_1384\.jpeg)$/.test(name))
    return new Response(null, { status: 404 });
  try {
    const bytes = await readFile(
      path.join(process.cwd(), 'content/source', name),
    );
    return new Response(bytes, {
      headers: {
        'Content-Type': name.endsWith('.PNG') ? 'image/png' : 'image/jpeg',
        'Cache-Control': 'no-store',
        'X-Content-Type-Options': 'nosniff',
      },
    });
  } catch {
    return new Response(null, { status: 404 });
  }
}
