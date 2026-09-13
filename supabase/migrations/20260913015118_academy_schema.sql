-- Academy v1. All tenant relationships are enforced by composite foreign keys.
-- Auth identity comes from auth.uid(); roster is the authority for membership.
create schema if not exists private;
revoke all on schema private from public, anon;
grant usage on schema private to authenticated, service_role;

create table public.tenants (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  name text not null,
  created_at timestamptz not null default now()
);

create table public.tracks (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id),
  slug text not null,
  title text not null,
  is_placeholder boolean not null default false,
  created_at timestamptz not null default now(),
  unique (tenant_id, slug),
  unique (id, tenant_id)
);

create table public.roster (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id),
  user_id uuid references auth.users(id) on delete set null,
  email text not null check (email = lower(btrim(email)) and position('@' in email) > 1),
  role text not null default 'trainee' check (role in ('trainee', 'manager', 'admin')),
  manager_id uuid,
  track_id uuid,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  unique (tenant_id, email),
  unique (tenant_id, user_id),
  unique (id, tenant_id),
  foreign key (track_id, tenant_id) references public.tracks(id, tenant_id),
  foreign key (manager_id, tenant_id) references public.roster(id, tenant_id),
  check (manager_id is distinct from id),
  check (role <> 'trainee' or track_id is not null)
);
create index roster_user_id_idx on public.roster(user_id) where active;
create index roster_track_id_idx on public.roster(track_id);
create index roster_manager_id_idx on public.roster(manager_id);

create table public.modules (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id),
  track_id uuid not null,
  slug text not null,
  title text not null,
  position integer not null check (position between 1 and 7),
  kind text not null check (kind in ('course', 'simulator', 'field')),
  created_at timestamptz not null default now(),
  foreign key (track_id, tenant_id) references public.tracks(id, tenant_id),
  unique (track_id, slug),
  unique (track_id, position),
  unique (id, tenant_id)
);
create index modules_tenant_id_idx on public.modules(tenant_id);

create table public.lessons (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id),
  module_id uuid not null,
  slug text not null,
  title text not null,
  position integer not null check (position > 0),
  estimated_minutes integer not null check (estimated_minutes > 0),
  draft boolean not null default true,
  source_sheet text not null,
  content_path text not null,
  content_hash text not null,
  created_at timestamptz not null default now(),
  foreign key (module_id, tenant_id) references public.modules(id, tenant_id),
  unique (module_id, slug),
  unique (module_id, position),
  unique (id, module_id, tenant_id)
);
create index lessons_tenant_id_idx on public.lessons(tenant_id);

create table public.quizzes (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id),
  module_id uuid not null,
  lesson_id uuid,
  slug text not null,
  kind text not null check (kind in ('lesson', 'exam', 'freetext', 'diagram')),
  draw_count integer not null check (draw_count > 0),
  pass_percent numeric(5,2) check (pass_percent between 0 and 100),
  created_at timestamptz not null default now(),
  foreign key (module_id, tenant_id) references public.modules(id, tenant_id),
  foreign key (lesson_id, module_id, tenant_id) references public.lessons(id, module_id, tenant_id),
  unique (module_id, slug),
  unique (id, module_id, tenant_id),
  check (kind <> 'lesson' or lesson_id is not null),
  check (kind <> 'exam' or (draw_count between 10 and 15 and pass_percent is not null and pass_percent = 90))
);
create index quizzes_lesson_id_idx on public.quizzes(lesson_id);
create index quizzes_tenant_id_idx on public.quizzes(tenant_id);

-- Correct answers and rubrics are never directly readable by trainees.
create table public.questions (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id),
  module_id uuid not null,
  quiz_id uuid not null,
  slug text not null,
  prompt text not null,
  kind text not null check (kind in ('single_choice', 'multiple_choice', 'freetext', 'numeric')),
  options jsonb not null default '[]'::jsonb check (jsonb_typeof(options) = 'array'),
  correct_answer jsonb,
  rubric jsonb,
  source_reference text not null,
  created_at timestamptz not null default now(),
  foreign key (quiz_id, module_id, tenant_id) references public.quizzes(id, module_id, tenant_id),
  unique (quiz_id, slug),
  unique (id, module_id, tenant_id)
);
create index questions_module_id_idx on public.questions(module_id);
create index questions_tenant_id_idx on public.questions(tenant_id);

create table public.quiz_attempts (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id),
  roster_id uuid not null,
  module_id uuid not null,
  quiz_id uuid not null,
  question_ids uuid[] not null,
  answers jsonb not null default '{}'::jsonb,
  score_percent numeric(5,2) check (score_percent between 0 and 100),
  passed boolean not null default false,
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  foreign key (roster_id, tenant_id) references public.roster(id, tenant_id),
  foreign key (quiz_id, module_id, tenant_id) references public.quizzes(id, module_id, tenant_id),
  check (not passed or (completed_at is not null and score_percent is not null)),
  check (completed_at is null or completed_at >= started_at)
);
create index quiz_attempts_roster_time_idx on public.quiz_attempts(roster_id, started_at desc);
create index quiz_attempts_quiz_id_idx on public.quiz_attempts(quiz_id);
create index quiz_attempts_tenant_time_idx on public.quiz_attempts(tenant_id, completed_at);

create table public.freetext_attempts (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id),
  roster_id uuid not null,
  module_id uuid not null,
  question_id uuid not null,
  answer text not null,
  passed boolean not null default false,
  feedback text,
  grade jsonb,
  created_at timestamptz not null default now(),
  graded_at timestamptz,
  foreign key (roster_id, tenant_id) references public.roster(id, tenant_id),
  foreign key (question_id, module_id, tenant_id) references public.questions(id, module_id, tenant_id),
  check (not passed or (graded_at is not null and grade is not null))
);
create index freetext_attempts_roster_time_idx on public.freetext_attempts(roster_id, created_at desc);
create index freetext_attempts_question_id_idx on public.freetext_attempts(question_id);
create index freetext_attempts_tenant_time_idx on public.freetext_attempts(tenant_id, graded_at);

create table public.module_progress (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id),
  roster_id uuid not null,
  module_id uuid not null,
  status text not null default 'not_started' check (status in ('not_started', 'in_progress', 'passed')),
  exam_passed boolean not null default false,
  freetext_passed boolean not null default false,
  diagram_passed boolean not null default false,
  started_at timestamptz,
  passed_at timestamptz,
  last_activity_at timestamptz not null default now(),
  foreign key (roster_id, tenant_id) references public.roster(id, tenant_id),
  foreign key (module_id, tenant_id) references public.modules(id, tenant_id),
  unique (roster_id, module_id),
  check ((status = 'passed') = (passed_at is not null))
);
create index module_progress_module_id_idx on public.module_progress(module_id);
create index module_progress_tenant_activity_idx on public.module_progress(tenant_id, last_activity_at);

-- Hidden persona briefs must only be loaded by trusted server code.
create table public.personas (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id),
  track_id uuid not null,
  slug text not null,
  name text not null,
  tier text not null check (tier in ('warm', 'standard', 'hard')),
  brief jsonb not null check (jsonb_typeof(brief) = 'object'),
  created_at timestamptz not null default now(),
  foreign key (track_id, tenant_id) references public.tracks(id, tenant_id),
  unique (track_id, slug),
  unique (id, tenant_id)
);
create index personas_tenant_tier_idx on public.personas(tenant_id, tier);

create table public.sim_runs (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id),
  roster_id uuid not null,
  persona_id uuid not null,
  tier text not null check (tier in ('warm', 'standard', 'hard')),
  status text not null default 'active' check (status in ('active', 'grading', 'completed', 'failed', 'abandoned')),
  turn_count integer not null default 0 check (turn_count between 0 and 40),
  run_date date not null,
  daily_sequence integer not null check (daily_sequence between 1 and 10),
  started_at timestamptz not null default now(),
  ended_at timestamptz,
  foreign key (roster_id, tenant_id) references public.roster(id, tenant_id),
  foreign key (persona_id, tenant_id) references public.personas(id, tenant_id),
  unique (roster_id, run_date, daily_sequence),
  unique (id, roster_id, tenant_id),
  check (ended_at is null or ended_at >= started_at)
);
create index sim_runs_persona_id_idx on public.sim_runs(persona_id);
create index sim_runs_tenant_time_idx on public.sim_runs(tenant_id, started_at);

create table public.sim_turns (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id),
  roster_id uuid not null,
  sim_run_id uuid not null,
  turn_number integer not null check (turn_number between 1 and 40),
  role text not null check (role in ('user', 'assistant')),
  content text not null,
  created_at timestamptz not null default now(),
  foreign key (sim_run_id, roster_id, tenant_id) references public.sim_runs(id, roster_id, tenant_id),
  unique (sim_run_id, turn_number, role)
);
create index sim_turns_roster_id_idx on public.sim_turns(roster_id);
create index sim_turns_tenant_id_idx on public.sim_turns(tenant_id);

create table public.sim_grades (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id),
  roster_id uuid not null,
  sim_run_id uuid not null unique,
  total_score numeric(5,2) not null check (total_score between 0 and 100),
  passed boolean not null,
  grade jsonb not null check (jsonb_typeof(grade) = 'object'),
  created_at timestamptz not null default now(),
  foreign key (sim_run_id, roster_id, tenant_id) references public.sim_runs(id, roster_id, tenant_id),
  check (not passed or total_score >= 75)
);
create index sim_grades_roster_id_idx on public.sim_grades(roster_id);
create index sim_grades_tenant_time_idx on public.sim_grades(tenant_id, created_at);

create table public.sim_cost_log (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id),
  roster_id uuid not null,
  sim_run_id uuid not null,
  operation text not null check (operation in ('chat', 'grade')),
  provider text not null,
  model text not null,
  prompt_tokens integer not null check (prompt_tokens >= 0),
  completion_tokens integer not null check (completion_tokens >= 0),
  estimated_cost_usd numeric(14,8) not null check (estimated_cost_usd >= 0),
  created_at timestamptz not null default now(),
  foreign key (sim_run_id, roster_id, tenant_id) references public.sim_runs(id, roster_id, tenant_id)
);
create index sim_cost_log_run_id_idx on public.sim_cost_log(sim_run_id);
create index sim_cost_log_roster_id_idx on public.sim_cost_log(roster_id);
create index sim_cost_log_tenant_time_idx on public.sim_cost_log(tenant_id, created_at);

create table public.manager_forms (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id),
  roster_id uuid not null,
  module_id uuid not null,
  evaluator_id uuid not null,
  type text not null check (type in ('ride_along', 'day5_eval', 'hcp_exercise')),
  responses jsonb not null default '{}'::jsonb check (jsonb_typeof(responses) = 'object'),
  notes text not null default '',
  passed boolean not null default false,
  created_at timestamptz not null default now(),
  completed_at timestamptz,
  foreign key (roster_id, tenant_id) references public.roster(id, tenant_id),
  foreign key (module_id, tenant_id) references public.modules(id, tenant_id),
  foreign key (evaluator_id, tenant_id) references public.roster(id, tenant_id),
  unique (roster_id, module_id, type),
  check (not passed or completed_at is not null)
);
create index manager_forms_module_id_idx on public.manager_forms(module_id);
create index manager_forms_evaluator_id_idx on public.manager_forms(evaluator_id);
create index manager_forms_tenant_id_idx on public.manager_forms(tenant_id);

create table public.digest_log (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id),
  week_start date not null,
  status text not null check (status in ('pending', 'sent', 'failed')),
  payload jsonb not null,
  attempts integer not null default 0 check (attempts >= 0),
  error_summary text,
  created_at timestamptz not null default now(),
  sent_at timestamptz,
  unique (tenant_id, week_start),
  check (status <> 'sent' or sent_at is not null)
);

-- Narrow read-only helper breaks roster policy recursion. It exposes only the
-- caller's own active membership, never another user's authorization record.
create function private.memberships()
returns table (roster_id uuid, tenant_id uuid, role text, track_id uuid)
language sql stable security definer set search_path = ''
as $$
  select r.id, r.tenant_id, r.role, r.track_id
  from public.roster r
  where (select auth.uid()) is not null
    and r.user_id = (select auth.uid()) and r.active;
$$;
revoke all on function private.memberships() from public, anon;
grant execute on function private.memberships() to authenticated, service_role;

create function private.is_admin()
returns boolean language sql stable security invoker set search_path = ''
as $$ select exists (select 1 from private.memberships() m where m.role = 'admin'); $$;
revoke all on function private.is_admin() from public, anon;
grant execute on function private.is_admin() to authenticated, service_role;

-- Revoke default privileges, then grant only what the policies authorize.
do $$
declare table_name text;
begin
  foreach table_name in array array[
    'tenants', 'tracks', 'roster', 'modules', 'lessons', 'quizzes', 'questions',
    'quiz_attempts', 'freetext_attempts', 'module_progress', 'personas',
    'sim_runs', 'sim_turns', 'sim_grades', 'sim_cost_log', 'manager_forms', 'digest_log'
  ] loop
    execute format('alter table public.%I enable row level security', table_name);
    execute format('revoke all on public.%I from public, anon, authenticated', table_name);
    execute format('grant select, insert, update, delete on public.%I to authenticated, service_role', table_name);
    execute format(
      'create policy admin_all on public.%I for all to authenticated using ((select private.is_admin())) with check ((select private.is_admin()))',
      table_name
    );
  end loop;
end;
$$;

create policy tenant_read on public.tenants for select to authenticated
using (id in (select m.tenant_id from private.memberships() m));

create policy track_read on public.tracks for select to authenticated
using (tenant_id in (select m.tenant_id from private.memberships() m));

create policy roster_read on public.roster for select to authenticated
using (
  id in (select m.roster_id from private.memberships() m)
  or tenant_id in (select m.tenant_id from private.memberships() m where m.role = 'manager')
);

create policy module_read on public.modules for select to authenticated
using (
  track_id in (select m.track_id from private.memberships() m)
  or tenant_id in (select m.tenant_id from private.memberships() m where m.role = 'manager')
);

create policy lesson_read on public.lessons for select to authenticated
using (
  tenant_id in (select m.tenant_id from private.memberships() m where m.role = 'manager')
  or (not draft and module_id in (select id from public.modules))
);

create policy quiz_read on public.quizzes for select to authenticated
using (
  tenant_id in (select m.tenant_id from private.memberships() m where m.role = 'manager')
  or (
    module_id in (select id from public.modules)
    and (lesson_id is null or lesson_id in (select id from public.lessons where not draft))
  )
);

-- Scores, progress, grades, costs, and chat transcripts can be read by their
-- owner and tenant managers. Writes go through the trusted server evaluator.
do $$
declare table_name text;
begin
  foreach table_name in array array[
    'quiz_attempts', 'freetext_attempts', 'module_progress', 'sim_runs',
    'sim_turns', 'sim_grades', 'sim_cost_log', 'manager_forms'
  ] loop
    execute format(
      'create policy owned_or_manager_read on public.%I for select to authenticated using (
        roster_id in (select m.roster_id from private.memberships() m)
        or tenant_id in (select m.tenant_id from private.memberships() m where m.role = ''manager'')
      )', table_name
    );
  end loop;
  foreach table_name in array array['questions', 'personas', 'digest_log'] loop
    execute format(
      'create policy manager_read on public.%I for select to authenticated using (
        tenant_id in (select m.tenant_id from private.memberships() m where m.role = ''manager'')
      )', table_name
    );
  end loop;
end;
$$;

create policy manager_form_insert on public.manager_forms for insert to authenticated
with check (
  tenant_id in (select m.tenant_id from private.memberships() m where m.role = 'manager')
  and evaluator_id in (select m.roster_id from private.memberships() m where m.role = 'manager')
  and roster_id <> evaluator_id
);

create policy manager_form_update on public.manager_forms for update to authenticated
using (tenant_id in (select m.tenant_id from private.memberships() m where m.role = 'manager'))
with check (
  tenant_id in (select m.tenant_id from private.memberships() m where m.role = 'manager')
  and evaluator_id in (select m.roster_id from private.memberships() m where m.role = 'manager')
  and roster_id <> evaluator_id
);
