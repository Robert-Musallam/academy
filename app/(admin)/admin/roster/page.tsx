import { requireMembership } from '@/lib/auth-server';
import { addRoster } from './actions';

export const dynamic = 'force-dynamic';

export default async function RosterPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; added?: string }>;
}) {
  const { client } = await requireMembership('admin');
  const [roster, tenants, tracks] = await Promise.all([
    client
      .from('roster')
      .select('id,email,role,tenant_id,active')
      .order('created_at'),
    client.from('tenants').select('id,name'),
    client
      .from('tracks')
      .select('id,title,tenant_id')
      .eq('is_placeholder', false),
  ]);
  const state = await searchParams;
  return (
    <main className="mx-auto max-w-4xl px-6 py-12">
      <h1 className="text-3xl font-bold">Academy roster</h1>
      {state.error && (
        <p role="alert" className="mt-4 text-red-800">
          Unable to add trainee. Check the email, tenant, track, and manager,
          then retry.
        </p>
      )}
      {state.added && (
        <p role="status" className="mt-4">
          Roster member added. They can now request a magic link.
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
          </li>
        ))}
      </ul>
    </main>
  );
}
