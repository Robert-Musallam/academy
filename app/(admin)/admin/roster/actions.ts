'use server';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { actor } from '@/lib/training/access';
import { rosterInput } from '@/lib/auth';
import { adminClient } from '@/lib/supabase/server';
import { rows, write, localTest } from '@/lib/training/db';
import type { Roster, Progress } from '@/lib/training/types';
export async function addRoster(form: FormData) {
  await actor('admin');
  let success = false;
  try {
    const input = rosterInput.parse(Object.fromEntries(form));
    await validate(input);
    const existing = (
      await rows<Roster>('roster', { email: input.email })
    ).find((r) => r.user_id);
    let userId = existing?.user_id;
    if (!userId && !localTest()) {
      const { data, error } = await adminClient().auth.admin.createUser({
        email: input.email,
        email_confirm: false,
      });
      if (error || !data.user) throw new Error('Account unavailable');
      userId = data.user.id;
    }
    await write('roster', { ...input, user_id: userId ?? null });
    success = true;
  } catch {
    success = false;
  }
  revalidatePath('/admin/roster');
  redirect(`/admin/roster?${success ? 'added=1' : 'error=save'}`);
}
async function validate(input: ReturnType<typeof rosterInput.parse>) {
  if (!(await rows('tenants', { id: input.tenant_id })).length)
    throw new Error('Unknown tenant');
  if (
    input.track_id &&
    !(
      await rows('tracks', {
        id: input.track_id,
        tenant_id: input.tenant_id,
        is_placeholder: false,
      })
    ).length
  )
    throw new Error('Track unavailable');
  if (input.manager_id) {
    const m = (
      await rows<Roster>('roster', {
        id: input.manager_id,
        tenant_id: input.tenant_id,
        active: true,
      })
    )[0];
    if (!m || m.role === 'trainee') throw new Error('Manager unavailable');
  }
}
export async function editRoster(form: FormData) {
  const caller = await actor('admin');
  let success = false;
  try {
    const id = String(form.get('id')),
      existing = (await rows<Roster>('roster', { id }))[0];
    if (!existing) throw new Error('Member unavailable');
    const input = rosterInput.parse({
      email: existing.email,
      tenant_id: existing.tenant_id,
      track_id: form.get('track_id'),
      role: form.get('role'),
      manager_id: form.get('manager_id'),
    });
    await validate(input);
    const active = form.get('active') === 'on';
    if (id === caller.id && (!active || input.role !== 'admin'))
      throw new Error('Cannot remove your own administration');
    if (input.manager_id === id) throw new Error('Cannot manage self');
    if (
      existing.track_id !== input.track_id &&
      (await rows<Progress>('module_progress', { roster_id: id })).length
    )
      throw new Error(
        'Existing training history requires keeping the assigned track',
      );
    if (
      (input.role === 'trainee' || !active) &&
      (await rows('roster', { manager_id: id, active: true })).length
    )
      throw new Error('Reassign this manager’s trainees first');
    await write(
      'roster',
      { ...input, active },
      { id, tenant_id: existing.tenant_id },
    );
    success = true;
  } catch {
    success = false;
  }
  revalidatePath('/admin/roster');
  revalidatePath('/manager');
  redirect(`/admin/roster?${success ? 'updated=1' : 'error=edit'}`);
}
