import { NextResponse } from 'next/server';
import { sessionClient } from '@/lib/supabase/server';

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get('code');
  if (code) {
    const client = await sessionClient();
    const { data, error } = await client.auth.exchangeCodeForSession(code);
    if (!error && data.user) {
      const { data: memberships } = await client
        .from('roster')
        .select('role')
        .eq('user_id', data.user.id)
        .eq('active', true);
      if (memberships?.length)
        return NextResponse.redirect(
          new URL(
            memberships.some((m) => m.role === 'admin')
              ? '/admin/roster'
              : memberships.some((m) => m.role === 'manager')
                ? '/manager'
                : '/learn',
            url.origin,
          ),
        );
      await client.auth.signOut();
    }
  }
  return NextResponse.redirect(new URL('/login?error=link', url.origin));
}
