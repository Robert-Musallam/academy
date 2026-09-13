import { it, expect } from 'vitest';
import { Client } from 'pg';
import { query } from '../support/database';
import { loadPersonas } from '@/lib/sim/personas';
const owner = 'eeeeeeee-0000-4000-8000-000000000020';
it('database: atomic daily quota, run leases, owner isolation and private RPC grants', async () => {
  // Use an independent synthetic roster so parallel UI fixtures cannot affect quota.
  const [{ id: tenant }] = await query(
    "select id from tenants where slug='rnb'",
  );
  const [{ id: track }] = await query(
    "select id from tracks where slug='sales-design-consultant'",
  );
  await query(
    "insert into roster(id,tenant_id,track_id,email,role) values($1,$2,$3,'persistence@academy-test.invalid','trainee') on conflict(id) do nothing",
    [owner, tenant, track],
  );
  await query('delete from sim_runs where roster_id=$1', [owner]);
  const persona = loadPersonas()[0],
    state = {
      persona,
      scenario: persona.scenarios[0],
      policy: {},
      messages: [{ role: 'assistant', content: 'Welcome' }],
      costs: [],
      turns: 0,
      status: 'active',
    };
  const results = await Promise.allSettled(
    Array.from({ length: 11 }, () =>
      query('select academy_sim_start($1,$2,$3::jsonb) as run', [
        owner,
        persona.slug,
        JSON.stringify(state),
      ]),
    ),
  );
  expect(results.filter((r) => r.status === 'fulfilled')).toHaveLength(10);
  expect(results.filter((r) => r.status === 'rejected')).toHaveLength(1);
  const first = results.find((r) => r.status === 'fulfilled');
  if (first?.status !== 'fulfilled') throw new Error('No run');
  const run = first.value[0].run;
  await expect(
    query('select academy_sim_get($1,$2)', [
      'eeeeeeee-0000-4000-8000-000000000021',
      run.id,
    ]),
  ).rejects.toThrow('Appointment not found');
  const token = 'eeeeeeee-0000-4000-8000-000000000099';
  await query('select academy_sim_claim($1,$2,$3)', [owner, run.id, token]);
  await expect(
    query('select academy_sim_claim($1,$2,$3)', [owner, run.id, token]),
  ).rejects.toThrow('already in progress');
  await query('select academy_sim_release($1,$2,$3)', [owner, run.id, token]);
  const c = new Client({
    connectionString: 'postgres://postgres:postgres@127.0.0.1:54322/postgres',
  });
  await c.connect();
  try {
    await c.query('set role authenticated');
    await expect(c.query('select * from private.sim_state')).rejects.toThrow(
      'permission denied',
    );
    await expect(
      c.query('select academy_sim_get($1,$2)', [owner, run.id]),
    ).rejects.toThrow('permission denied');
  } finally {
    await c.end();
  }
  await query('delete from sim_runs where roster_id=$1', [owner]);
  await query('delete from roster where id=$1', [owner]);
});
it('database: digest claim is once per tenant/week while pending or sent', async () => {
  const [{ id: tenant }] = await query(
    "select id from tenants where slug='rnb'",
  );
  const week = '1999-01-04';
  await query('delete from digest_log where tenant_id=$1 and week_start=$2', [
    tenant,
    week,
  ]);
  const claims = await Promise.all(
    Array.from({ length: 5 }, () =>
      query('select academy_digest_claim($1,$2,$3) as id', [
        tenant,
        week,
        '{}',
      ]),
    ),
  );
  expect(claims.filter((c) => c[0].id)).toHaveLength(1);
  await query(
    "update digest_log set status='sent',sent_at=now() where tenant_id=$1 and week_start=$2",
    [tenant, week],
  );
  expect(
    (
      await query('select academy_digest_claim($1,$2,$3) as id', [
        tenant,
        week,
        '{}',
      ])
    )[0].id,
  ).toBeNull();
  await query('delete from digest_log where tenant_id=$1 and week_start=$2', [
    tenant,
    week,
  ]);
});
