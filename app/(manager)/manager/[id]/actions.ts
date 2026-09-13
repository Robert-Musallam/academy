'use server';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { tenantTarget } from '@/lib/training/access';
import { rows, write } from '@/lib/training/db';
import { allowed, touch } from '@/lib/training/progress';
import { formSchema, rideItems, dayItems } from '@/lib/manager/forms';
import type { Module, FormRow } from '@/lib/training/types';
export async function saveEvaluation(id: string, form: FormData) {
  let saved = false;
  try {
    const { caller, target } = await tenantTarget(id);
    if (
      !target.active ||
      target.role !== 'trainee' ||
      caller.tenant_id !== target.tenant_id
    )
      throw new Error('Select a manager membership in this tenant');
    const type = String(form.get('type')),
      notes = String(form.get('notes') ?? '');
    const ratings = Object.fromEntries(
      Object.keys(type === 'ride_along' ? rideItems : dayItems).map((k) => [
        k,
        {
          score: Number(form.get(k)),
          notes: String(form.get(`${k}_notes`) ?? ''),
        },
      ]),
    );
    const input = formSchema.parse(
      type === 'hcp_exercise'
        ? { type, passed: form.get('passed') === 'on', notes }
        : type === 'ride_along'
          ? { type, ratings, notes }
          : {
              type,
              ratings,
              notes,
              strengths: form.get('strengths'),
              weaknesses: form.get('weaknesses'),
              passed: form.get('passed') === 'on',
            },
    );
    await allowed(target, type === 'hcp_exercise' ? 'measurement' : 'field');
    const module = (
      await rows<Module>('modules', {
        track_id: target.track_id,
        tenant_id: target.tenant_id,
        position: 7,
      })
    )[0];
    const existing = (
      await rows<FormRow>('manager_forms', {
        roster_id: id,
        module_id: module.id,
        type: input.type,
      })
    )[0];
    const value = {
      tenant_id: target.tenant_id,
      roster_id: id,
      module_id: module.id,
      evaluator_id: caller.id,
      type: input.type,
      responses: input,
      notes: input.notes,
      passed: input.type === 'ride_along' || input.passed,
      completed_at: new Date().toISOString(),
    };
    await write(
      'manager_forms',
      value,
      existing ? { id: existing.id, tenant_id: target.tenant_id } : undefined,
    );
    // A withdrawn field sign-off must revoke M7 completion, then recompute from evidence.
    await write(
      'module_progress',
      { status: 'in_progress', passed_at: null },
      { roster_id: id, module_id: module.id },
    );
    await touch(target, module.id);
    saved = true;
  } catch {
    saved = false;
  }
  revalidatePath('/manager');
  revalidatePath(`/manager/${id}`);
  revalidatePath('/learn');
  redirect(`/manager/${id}?${saved ? 'saved=1' : 'error=invalid'}`);
}
