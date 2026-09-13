import { actor } from '@/lib/training/access';
import { rows } from '@/lib/training/db';
import type { Roster } from '@/lib/training/types';
import { addRoster, editRoster } from './actions';

export const dynamic = 'force-dynamic';

export default async function RosterPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; added?: string; updated?: string }>;
}) {
  await actor('admin');
  const [members, tenantList, trackList] = await Promise.all([
    rows<Roster>('roster'),
    rows<{ id: string; name: string }>('tenants'),
    rows<{ id: string; title: string; tenant_id: string }>('tracks', {
      is_placeholder: false,
    }),
  ]);
  const roster = { data: members },
    tenants = { data: tenantList },
    tracks = { data: trackList };
  const state = await searchParams;
  return (
    <main className="mx-auto max-w-4xl px-6 py-12">
      <h1 className="text-3xl font-bold">Academy roster</h1>
      {state.error && (
        <p role="alert" className="mt-4 text-red-800">
          Unable to add trainee. Check the email, tenant, track, and manager,
          then retry. Existing training history keeps its assigned track;
          reassign direct reports before archiving a manager.
        </p>
      )}
      {(state.added || state.updated) && (
        <p role="status" className="mt-4">
          Roster saved. Active members can request a magic link.
        </p>
      )}
      <form
        action={addRoster}
        className="my-8 grid gap-4 rounded border border-stone-300 bg-white p-6 sm:grid-cols-2"
      >
        <label>
          Email
          <input
            required
            name="email"
            type="email"
            className="mt-1 block w-full rounded border p-2"
          />
        </label>
        <label>
          Tenant
          <select
            required
            name="tenant_id"
            className="mt-1 block w-full rounded border p-2"
          >
            {tenants.data?.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          Track
          <select
            name="track_id"
            className="mt-1 block w-full rounded border p-2"
          >
            <option value="">No track (staff only)</option>
            {tracks.data?.map((t) => (
              <option key={t.id} value={t.id}>
                {t.title}
              </option>
            ))}
          </select>
        </label>
        <label>
          Role
          <select name="role" className="mt-1 block w-full rounded border p-2">
            <option>trainee</option>
            <option>manager</option>
            <option>admin</option>
          </select>
        </label>
        <label>
          Manager
          <select
            name="manager_id"
            className="mt-1 block w-full rounded border p-2"
          >
            <option value="">Unassigned</option>
            {roster.data
              ?.filter((r) => r.active && r.role !== 'trainee')
              .map((r) => (
                <option key={r.id} value={r.id}>
                  {r.email}
                </option>
              ))}
          </select>
        </label>
        <button className="self-end rounded bg-emerald-900 px-4 py-3 font-semibold text-white">
          Add to roster
        </button>
      </form>
      <ul className="divide-y divide-stone-300">
        {roster.data?.map((r) => (
          <li key={r.id} className="py-4">
            <strong>{r.email}</strong>
            <span className="ml-3 text-sm">
              {r.role} · {tenants.data?.find((t) => t.id === r.tenant_id)?.name}
              {!r.active && ' · inactive'}
            </span>
            <details className="mt-3">
              <summary>Edit membership</summary>
              <form
                action={editRoster}
                className="grid gap-3 border p-4 mt-3 sm:grid-cols-2"
              >
                <input type="hidden" name="id" value={r.id} />
                <label>
                  Role
                  <select
                    name="role"
                    defaultValue={r.role}
                    className="block border p-2"
                  >
                    <option>trainee</option>
                    <option>manager</option>
                    <option>admin</option>
                  </select>
                </label>
                <label>
                  Track
                  <select
                    name="track_id"
                    defaultValue={r.track_id ?? ''}
                    className="block border p-2"
                  >
                    <option value="">No track</option>
                    {trackList
                      .filter((t) => t.tenant_id === r.tenant_id)
                      .map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.title}
                        </option>
                      ))}
                  </select>
                </label>
                <label>
                  Manager
                  <select
                    name="manager_id"
                    defaultValue={r.manager_id ?? ''}
                    className="block border p-2"
                  >
                    <option value="">Unassigned</option>
                    {members
                      .filter(
                        (m) =>
                          m.id !== r.id &&
                          m.tenant_id === r.tenant_id &&
                          m.active &&
                          m.role !== 'trainee',
                      )
                      .map((m) => (
                        <option key={m.id} value={m.id}>
                          {m.email}
                        </option>
                      ))}
                  </select>
                </label>
                <label>
                  <input
                    name="active"
                    type="checkbox"
                    defaultChecked={r.active}
                  />{' '}
                  Active membership
                </label>
                <p className="text-sm">
                  Clear Active to remove access while retaining training
                  history.
                </p>
                <button className="bg-emerald-900 text-white rounded p-2">
                  Save membership
                </button>
              </form>
            </details>
          </li>
        ))}
      </ul>
    </main>
  );
}
