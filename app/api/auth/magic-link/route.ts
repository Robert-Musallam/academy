import { NextResponse } from 'next/server';
import { requestMagicLink } from '@/lib/auth';
import { adminClient, sessionClient } from '@/lib/supabase/server';

export async function POST(request: Request) {
  if (request.headers.get('origin') !== new URL(request.url).origin)
    return NextResponse.json(
      { message: 'Invalid request origin.' },
      { status: 403 },
    );
  try {
    const form = await request.formData();
    const result = await requestMagicLink(form.get('email'), {
      isRostered: async (email) => {
        const { data, error } = await adminClient()
          .from('roster')
          .select('id')
          .eq('email', email)
          .eq('active', true)
          .not('user_id', 'is', null)
          .limit(1);
        if (error) throw new Error('Roster lookup unavailable');
        return !!data?.length;
      },
      send: async (email) => {
        const client = await sessionClient();
        const { error } = await client.auth.signInWithOtp({
          email,
          options: {
            shouldCreateUser: false,
            emailRedirectTo: new URL('/auth/callback', request.url).href,
          },
        });
        if (error) throw new Error('Magic link unavailable');
      },
    });
    return NextResponse.json(result, {
      status: result.status,
      headers: { 'Cache-Control': 'no-store' },
    });
  } catch {
    return NextResponse.json(
      {
        message:
          'Sign-in is temporarily unavailable. Please contact your manager.',
      },
      { status: 503 },
    );
  }
}
