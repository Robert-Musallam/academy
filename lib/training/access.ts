import 'server-only';
import { cookies, headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { requireMembership } from '@/lib/auth-server';
import { localTest, rows } from './db';
import type { Role } from '@/lib/auth';
import type { Roster } from './types';
export async function actor(role?: Role): Promise<Roster> {
  let memberships;
  if (
    localTest() &&
    /^(localhost|127\.0\.0\.1)(:\d+)?$/.test(
      (await headers()).get('host') ?? '',
    )
  ) {
    const id = (await cookies()).get('academy-test-roster')?.value;
    memberships =
      id && /^eeeeeeee-/.test(id)
        ? await rows<Roster>('roster', { id, active: true })
        : [];
  } else {
    const auth = await requireMembership();
    memberships = await rows<Roster>('roster', {
      user_id: auth.user.id,
      active: true,
    });
  }
  const selected = (await cookies()).get('academy-membership')?.value;
  const member = memberships.find((m) => m.id === selected) ?? memberships[0];
  if (!member) redirect('/login');
  if (role && member.role !== role && member.role !== 'admin')
    redirect('/learn');
  return member;
}
export async function tenantTarget(
  id: string,
  role: 'manager' | 'admin' = 'manager',
) {
  const caller = await actor(role);
  const target = (await rows<Roster>('roster', { id }))[0];
  if (
    !target ||
    (caller.role !== 'admin' && target.tenant_id !== caller.tenant_id)
  )
    throw new Error('Trainee unavailable');
  return { caller, target };
}
export async function sameOrigin(request: Request) {
  const origin = request.headers.get('origin');
  if (!origin || new URL(origin).host !== request.headers.get('host'))
    throw new Error('Cross-origin request rejected');
  if (Number(request.headers.get('content-length') ?? 0) > 20000)
    throw new Error('Request too large');
}
