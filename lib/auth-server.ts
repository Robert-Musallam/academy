import 'server-only';
import { redirect } from 'next/navigation';
import { sessionClient } from '@/lib/supabase/server';
import { hasRole, type Membership, type Role } from '@/lib/auth';

export async function requireMembership(role?: Role) {
  const client = await sessionClient();
  const {
    data: { user },
    error,
  } = await client.auth.getUser();
  if (error || !user) redirect('/login');
  const { data, error: rosterError } = await client
    .from('roster')
    .select('id,tenant_id,track_id,role,email')
    .eq('user_id', user.id)
    .eq('active', true);
  const memberships = (data ?? []) as Membership[];
  if (rosterError || !memberships.length) redirect('/login?error=roster');
  if (role && !hasRole(memberships, role)) redirect('/');
  return { user, memberships, client };
}
