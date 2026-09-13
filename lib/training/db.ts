import 'server-only';
import { adminClient } from '@/lib/supabase/server';
// The direct connection exists only for an explicitly launched local test server.
// Production always uses the configured Supabase client, never this fixture path.
export const localTest = () =>
  process.env.NODE_ENV !== 'production' && process.env.ACADEMY_E2E === '1';
type Filter = Record<string, string | number | boolean | null>;
const tables = [
  'tenants',
  'tracks',
  'roster',
  'modules',
  'lessons',
  'quizzes',
  'questions',
  'quiz_attempts',
  'freetext_attempts',
  'module_progress',
  'personas',
  'sim_runs',
  'sim_grades',
  'sim_turns',
  'sim_cost_log',
  'manager_forms',
  'digest_log',
];
const ident = (s: string) => {
  if (!/^[a-z_]+$/.test(s)) throw new Error('Invalid identifier');
  return `"${s}"`;
};
async function sql(text: string, values: unknown[]) {
  if (!localTest()) throw new Error('Test database unavailable');
  const { Client } = await import('pg');
  const client = new Client({
    connectionString: 'postgres://postgres:postgres@127.0.0.1:54322/postgres',
  });
  await client.connect();
  try {
    return (await client.query(text, values)).rows;
  } finally {
    await client.end();
  }
}
export async function rows<T>(
  table: string,
  filter: Filter = {},
): Promise<T[]> {
  if (!tables.includes(table)) throw new Error('Unknown table');
  if (localTest()) {
    const entries = Object.entries(filter);
    return sql(
      `select * from public.${ident(table)}${entries.length ? ' where ' + entries.map(([k], i) => `${ident(k)} is not distinct from $${i + 1}`).join(' and ') : ''}`,
      entries.map(([, v]) => v),
    );
  }
  let query = adminClient().from(table).select('*');
  for (const [k, v] of Object.entries(filter))
    query = v === null ? query.is(k, null) : query.eq(k, v);
  const { data, error } = await query;
  if (error) throw new Error('Unable to load Academy data');
  return (data ?? []) as T[];
}
export async function write<T>(
  table: string,
  value: Record<string, unknown>,
  filter?: Filter,
): Promise<T[]> {
  if (!tables.includes(table)) throw new Error('Unknown table');
  if (filter && !Object.keys(filter).length)
    throw new Error('Update requires scope');
  if (localTest()) {
    const entries = Object.entries(value),
      where = Object.entries(filter ?? {});
    const vals = [...entries, ...where].map(([, v]) =>
      v && typeof v === 'object' && !Array.isArray(v) ? JSON.stringify(v) : v,
    );
    const command = filter
      ? `update public.${ident(table)} set ${entries.map(([k], i) => `${ident(k)}=$${i + 1}`).join(',')} where ${where.map(([k], i) => `${ident(k)} is not distinct from $${entries.length + i + 1}`).join(' and ')}`
      : `insert into public.${ident(table)} (${entries.map(([k]) => ident(k)).join(',')}) values (${entries.map((_, i) => `$${i + 1}`).join(',')})`;
    return sql(`${command} returning *`, vals);
  }
  let query = filter
    ? adminClient().from(table).update(value)
    : adminClient().from(table).insert(value);
  for (const [k, v] of Object.entries(filter ?? {}))
    query = v === null ? query.is(k, null) : query.eq(k, v);
  const { data, error } = await query.select();
  if (error) throw new Error('Unable to save Academy data');
  return (data ?? []) as T[];
}
export async function rpc<T>(
  name: string,
  args: Record<string, unknown>,
): Promise<T> {
  if (localTest()) {
    const entries = Object.entries(args);
    const result = await sql(
      `select public.${ident(name)}(${entries.map(([k], i) => `${ident(k)} => $${i + 1}`).join(',')}) as result`,
      entries.map(([, v]) => (typeof v === 'object' ? JSON.stringify(v) : v)),
    );
    return result[0].result as T;
  }
  const { data, error } = await adminClient().rpc(name, args);
  if (error)
    throw new Error(
      error.code === 'P0001' ? error.message : 'Unable to save Academy data',
    );
  return data as T;
}
