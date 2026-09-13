import { execFileSync } from 'node:child_process';
import { it, expect } from 'vitest';

it('auth: actual Postgres RLS isolates trainee progress and enforces manager/admin roles', () => {
  const output = execFileSync(
    'psql',
    [
      'postgres://postgres:postgres@127.0.0.1:54322/postgres',
      '-v',
      'ON_ERROR_STOP=1',
      '-f',
      'tests/sql/schema-rls.sql',
    ],
    { encoding: 'utf8' },
  );
  expect(output).toContain('schema/RLS assertions passed');
});
