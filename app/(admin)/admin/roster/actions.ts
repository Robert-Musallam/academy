'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { requireMembership } from '@/lib/auth-server';
import { rosterInput } from '@/lib/auth';
import { adminClient } from '@/lib/supabase/server';

export async function addRoster(form: FormData) {
  await requireMembership('admin');
  const parsed = rosterInput.safeParse(Object.fromEntries(form));
  if (!parsed.success) redirect('/admin/roster?error=invalid');
  const input = parsed.data;
  const db = adminClient();
  const { data: tenant } = await db
    .from('tenants')
    .select('id')
    .eq('id', input.tenant_id)
    .single();
  if (!tenant) redirect('/admin/roster?error=tenant');
  if (input.track_id) {
    const { data: track } = await db
      .from('tracks')
      .select('id')
      .eq('id', input.track_id)
      .eq('tenant_id', input.tenant_id)
      .eq('is_placeholder', false)
      .single();
    if (!track) redirect('/admin/roster?error=track');
  }
  if (input.manager_id) {
    const { data: manager } = await db
      .from('roster')
      .select('id')
      .eq('id', input.manager_id)
      .eq('tenant_id', input.tenant_id)
      .eq('active', true)
      .in('role', ['manager', 'admin'])
      .single();
    if (!manager) redirect('/admin/roster?error=manager');
  }
  const { data: existing } = await db
    .from('roster')
    .select('user_id')
    .eq('email', input.email)
    .not('user_id', 'is', null)
    .limit(1);
  let userId = existing?.[0]?.user_id as string | undefined;
  if (!userId) {
    const { data, error } = await db.auth.admin.createUser({
      email: input.email,
      email_confirm: false,
    });
    if (error || !data.user) redirect('/admin/roster?error=account');
    userId = data.user.id;
  }
  const { error } = await db
    .from('roster')
    .insert({ ...input, user_id: userId });
  if (error) redirect('/admin/roster?error=save');
  revalidatePath('/admin/roster');
  redirect('/admin/roster?added=1');
}
