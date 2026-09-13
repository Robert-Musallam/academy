\set ON_ERROR_STOP on
begin;

-- Transactional fixtures: no persisted users, secrets, or training content.
insert into auth.users (id, email) values
('10000000-0000-0000-0000-000000000001', 'trainee-a@example.test'),
('10000000-0000-0000-0000-000000000002', 'trainee-b@example.test'),
('10000000-0000-0000-0000-000000000003', 'manager@example.test'),
('10000000-0000-0000-0000-000000000004', 'admin@example.test');

insert into public.tracks (tenant_id,slug,title)
select id,'rls-test-track','Transactional RLS test' from public.tenants where slug='rnb';

insert into public.roster (id, user_id, email, tenant_id, track_id, role)
select v.id::uuid, v.id::uuid, v.email, t.id, tr.id, v.role
from (values
('10000000-0000-0000-0000-000000000001','trainee-a@example.test','trainee'),
('10000000-0000-0000-0000-000000000002','trainee-b@example.test','trainee'),
('10000000-0000-0000-0000-000000000003','manager@example.test','manager'),
('10000000-0000-0000-0000-000000000004','admin@example.test','admin')
) v(id,email,role)
join public.tenants t on t.slug='rnb'
join public.tracks tr on tr.tenant_id=t.id and tr.slug='rls-test-track';

insert into public.modules (id,tenant_id,track_id,slug,title,position,kind)
select '20000000-0000-0000-0000-000000000001',t.id,tr.id,'rls-fixture','RLS fixture',1,'course'
from public.tenants t join public.tracks tr on tr.tenant_id=t.id
where t.slug='rnb' and tr.slug='rls-test-track';

insert into public.module_progress (tenant_id,roster_id,module_id)
select tenant_id,id,'20000000-0000-0000-0000-000000000001'
from public.roster where email in ('trainee-a@example.test','trainee-b@example.test');

do $$ begin
  if (select count(*) from information_schema.tables where table_schema='public') <> 17 then
    raise exception 'Expected 17 public tables';
  end if;
  if (select count(*) from pg_tables where schemaname='public' and rowsecurity) <> 17 then
    raise exception 'All 17 tables must enable RLS';
  end if;
end $$;

set local role authenticated;
set local request.jwt.claim.sub = '10000000-0000-0000-0000-000000000001';
do $$ begin
  if (select count(*) from public.roster) <> 1 then raise exception 'Trainee roster isolation failed'; end if;
  if (select count(*) from public.module_progress) <> 1 then raise exception 'Trainee progress isolation failed'; end if;
  if exists (select 1 from public.module_progress where roster_id <> '10000000-0000-0000-0000-000000000001') then
    raise exception 'Another trainee progress exposed';
  end if;
  update public.roster set role='admin';
  if found then raise exception 'Trainee role escalation succeeded'; end if;
  update public.module_progress set exam_passed=true;
  if found then raise exception 'Trainee forged own grade'; end if;
  if (select count(*) from public.tenants) <> 1 then raise exception 'Trainee tenant isolation failed'; end if;
end $$;

set local request.jwt.claim.sub = '10000000-0000-0000-0000-000000000003';
do $$ begin
  if (select count(*) from public.module_progress where module_id='20000000-0000-0000-0000-000000000001') <> 2 then raise exception 'Manager cannot see tenant progress'; end if;
  if (select count(*) from public.tenants) <> 1 then raise exception 'Manager tenant isolation failed'; end if;
  update public.roster set role='admin' where email='manager@example.test';
  if found then raise exception 'Manager role escalation succeeded'; end if;
end $$;

set local request.jwt.claim.sub = '10000000-0000-0000-0000-000000000004';
do $$ begin
  if (select count(*) from public.tenants) <> 2 then raise exception 'Admin cross-tenant access failed'; end if;
end $$;

reset role;
update public.roster set active=false where email='trainee-a@example.test';
set local role authenticated;
set local request.jwt.claim.sub = '10000000-0000-0000-0000-000000000001';
do $$ begin
  if exists (select 1 from public.module_progress) then raise exception 'Inactive trainee retained access'; end if;
end $$;

set local role anon;
do $$ begin
  begin
    perform count(*) from public.roster;
    raise exception 'Anonymous roster access succeeded';
  exception when insufficient_privilege then null;
  end;
end $$;

rollback;
\echo 'schema/RLS assertions passed; all fixtures rolled back'
