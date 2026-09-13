import { Client } from 'pg';
export const ids = {
  trainee: 'eeeeeeee-0000-4000-8000-000000000001',
  sim: 'eeeeeeee-0000-4000-8000-000000000002',
  manager: 'eeeeeeee-0000-4000-8000-000000000003',
  foreign: 'eeeeeeee-0000-4000-8000-000000000004',
  field: 'eeeeeeee-0000-4000-8000-000000000005',
  admin: 'eeeeeeee-0000-4000-8000-000000000006',
};
export async function query(text: string, values: unknown[] = []) {
  const c = new Client({
    connectionString: 'postgres://postgres:postgres@127.0.0.1:54322/postgres',
  });
  await c.connect();
  try {
    return (await c.query(text, values)).rows;
  } finally {
    await c.end();
  }
}
export async function seed(
  id: string,
  mode: 'trainee' | 'sim' | 'field' | 'manager' | 'foreign' | 'admin',
) {
  const [{ id: tenant }] = await query('select id from tenants where slug=$1', [
    mode === 'foreign' ? 'gcv' : 'rnb',
  ]);
  const [{ id: track }] = await query(
    "select id from tracks where slug='sales-design-consultant' and tenant_id=(select id from tenants where slug='rnb')",
  );
  await query(
    `insert into roster(id,tenant_id,track_id,email,role,active) values($1,$2,$3,$4,$5,true) on conflict(id) do update set active=true`,
    [
      id,
      tenant,
      mode === 'foreign' ? null : track,
      `${id === ids[mode as keyof typeof ids] ? mode : mode + '-' + id.slice(-4)}@academy-test.invalid`,
      ['manager', 'admin', 'foreign'].includes(mode)
        ? mode === 'admin'
          ? 'admin'
          : 'manager'
        : 'trainee',
    ],
  );
  await query('delete from private.yard_practice where owner=$1', [id]);
  for (const t of ['sim_cost_log', 'sim_grades', 'sim_turns'])
    await query(`delete from ${t} where roster_id=$1`, [id]);
  await query('delete from sim_runs where roster_id=$1', [id]);
  for (const t of [
    'quiz_attempts',
    'freetext_attempts',
    'manager_forms',
    'module_progress',
  ])
    await query(`delete from ${t} where roster_id=$1`, [id]);
  if (['sim', 'field'].includes(mode))
    await query(
      `insert into module_progress(tenant_id,roster_id,module_id,status,exam_passed,freetext_passed,diagram_passed,passed_at) select tenant_id,$1,id,'passed',true,true,true,now() from modules where track_id=$2 and position<=5`,
      [id, track],
    );
  if (mode === 'field') {
    const personas = await query(
      'select id,tier from personas where track_id=$1',
      [track],
    );
    for (const [i, p] of [
      personas.find((p) => p.tier === 'warm'),
      personas.find((p) => p.tier === 'standard'),
      personas.find((p) => p.tier === 'hard'),
    ].entries()) {
      const [run] = await query(
        "insert into sim_runs(tenant_id,roster_id,persona_id,tier,status,run_date,daily_sequence) values($1,$2,$3,$4,'completed',current_date,$5) returning id",
        [tenant, id, p.id, p.tier, i + 1],
      );
      await query(
        "insert into sim_grades(tenant_id,roster_id,sim_run_id,total_score,passed,grade) values($1,$2,$3,80,true,'{}')",
        [tenant, id, run.id],
      );
    }
  }
}
