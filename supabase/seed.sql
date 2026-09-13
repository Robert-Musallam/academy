-- Idempotent manifest seed. No users, credentials, or production data.
insert into public.tenants (slug, name)
values ('rnb', 'Rock N Block Turf N Hardscapes'), ('gcv', 'GCV')
on conflict (slug) do update set name = excluded.name;

insert into public.tracks (tenant_id, slug, title, is_placeholder)
select t.id, v.slug, v.title, v.is_placeholder
from public.tenants t
cross join (values
  ('sales-design-consultant', 'Sales & Design Consultant', false),
  ('project-manager', 'Project Manager', true)
) as v(slug, title, is_placeholder)
where t.slug = 'rnb'
on conflict (tenant_id, slug) do update
set title = excluded.title, is_placeholder = excluded.is_placeholder;
