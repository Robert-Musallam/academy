-- Private snapshots contain hidden briefs; never expose them through sim_runs.
create table private.sim_state (
  run_id uuid primary key references public.sim_runs(id) on delete cascade,
  state jsonb not null,
  lease_token uuid,
  lease_until timestamptz
);
revoke all on private.sim_state from public, anon, authenticated;
grant all on private.sim_state to service_role;

create function public.academy_progress(p_owner uuid,p_module uuid,p_flags jsonb)
returns void language plpgsql security invoker set search_path='' as $$
declare t uuid;
begin
 select r.tenant_id into t from public.roster r join public.modules m on m.track_id=r.track_id and m.tenant_id=r.tenant_id where r.id=p_owner and r.active and m.id=p_module;
 if t is null then raise exception 'Membership unavailable'; end if;
 insert into public.module_progress(tenant_id,roster_id,module_id,status,started_at,exam_passed,freetext_passed,diagram_passed,passed_at)
 values(t,p_owner,p_module,case when coalesce((p_flags->>'passed')::boolean,false) then 'passed' else 'in_progress' end,now(),coalesce((p_flags->>'exam')::boolean,false),coalesce((p_flags->>'freetext')::boolean,false),coalesce((p_flags->>'diagram')::boolean,false),case when (p_flags->>'passed')::boolean then now() end)
 on conflict(roster_id,module_id) do update set
 exam_passed=public.module_progress.exam_passed or excluded.exam_passed,
 freetext_passed=public.module_progress.freetext_passed or excluded.freetext_passed,
 diagram_passed=public.module_progress.diagram_passed or excluded.diagram_passed,
 status=case when public.module_progress.status='passed' or excluded.status='passed' then 'passed' else 'in_progress' end,
 passed_at=coalesce(public.module_progress.passed_at,excluded.passed_at),last_activity_at=now();
end $$;

create function public.academy_sim_start(p_owner uuid,p_slug text,p_state jsonb)
returns jsonb language plpgsql security invoker set search_path='' as $$
declare r public.roster; p public.personas; n integer; run_id uuid; state jsonb;
begin
 perform pg_advisory_xact_lock(hashtextextended(p_owner::text,0));
 select * into r from public.roster where id=p_owner and active;
 select * into p from public.personas where track_id=r.track_id and tenant_id=r.tenant_id and slug=p_slug;
 if r.id is null or p.id is null then raise exception 'Appointment unavailable'; end if;
 select count(*)+1 into n from public.sim_runs where roster_id=p_owner and run_date=(now() at time zone 'UTC')::date;
 if n>10 then raise exception 'Daily limit: 10 appointments. Try again tomorrow.'; end if;
 insert into public.sim_runs(tenant_id,roster_id,persona_id,tier,run_date,daily_sequence)
 values(r.tenant_id,r.id,p.id,p.tier,(now() at time zone 'UTC')::date,n) returning id into run_id;
 state=p_state || jsonb_build_object('id',run_id,'owner',p_owner,'sequence',n,'date',(now() at time zone 'UTC')::date);
 insert into private.sim_state values(run_id,state,null,null);
 return state;
end $$;
create function public.academy_sim_get(p_owner uuid,p_id uuid)
returns jsonb language plpgsql security invoker set search_path='' as $$
declare result jsonb;
begin
 select s.state into result from private.sim_state s join public.sim_runs r on r.id=s.run_id join public.roster o on o.id=r.roster_id where r.id=p_id and r.roster_id=p_owner and o.active;
 if result is null then raise exception 'Appointment not found'; end if;
 return result;
end $$;
create function public.academy_sim_claim(p_owner uuid,p_id uuid,p_token uuid)
returns jsonb language plpgsql security invoker set search_path='' as $$
declare result jsonb;
begin
 perform public.academy_sim_get(p_owner,p_id);
 update private.sim_state set lease_token=p_token,lease_until=now()+interval '2 minutes' where run_id=p_id and (lease_until is null or lease_until<now()) returning state into result;
 if result is null then raise exception 'A response is already in progress'; end if;
 return result;
end $$;
create function public.academy_sim_release(p_owner uuid,p_id uuid,p_token uuid)
returns void language plpgsql security invoker set search_path='' as $$
begin
 perform public.academy_sim_get(p_owner,p_id);
 update private.sim_state set lease_token=null,lease_until=null where run_id=p_id and lease_token=p_token;
end $$;
create function public.academy_sim_commit(p_owner uuid,p_id uuid,p_token uuid,p_state jsonb)
returns void language plpgsql security invoker set search_path='' as $$
declare r public.sim_runs; old jsonb; i integer; cost jsonb; g jsonb;
begin
 select * into r from public.sim_runs where id=p_id and roster_id=p_owner for update;
 select state into old from private.sim_state where run_id=p_id and lease_token=p_token and lease_until>now() for update;
 if r.id is null or old is null then raise exception 'Appointment lease expired; reload'; end if;
 if (p_state->>'turns')::integer>40 then raise exception '40-turn limit reached'; end if;
 for i in 1..(p_state->>'turns')::integer loop
   insert into public.sim_turns(tenant_id,roster_id,sim_run_id,turn_number,role,content)
   values(r.tenant_id,p_owner,p_id,i,'user',p_state->'messages'->(i*2-1)->>'content'),(r.tenant_id,p_owner,p_id,i,'assistant',p_state->'messages'->(i*2)->>'content') on conflict do nothing;
 end loop;
 for cost in select value from jsonb_array_elements(p_state->'costs') with ordinality a(value,n) where n>jsonb_array_length(old->'costs') loop
  insert into public.sim_cost_log(tenant_id,roster_id,sim_run_id,operation,provider,model,prompt_tokens,completion_tokens,estimated_cost_usd)
  values(r.tenant_id,p_owner,p_id,cost->>'operation',cost->>'provider',cost->>'model',(cost->>'prompt_tokens')::integer,(cost->>'completion_tokens')::integer,(cost->>'estimated_cost_usd')::numeric);
 end loop;
 g=p_state->'grade';
 if g is not null and g<>'null'::jsonb then
 insert into public.sim_grades(tenant_id,roster_id,sim_run_id,total_score,passed,grade) values(r.tenant_id,p_owner,p_id,(g->>'total_score')::numeric,(g->>'passed')::boolean,g) on conflict(sim_run_id) do nothing;
 end if;
 update public.sim_runs set turn_count=(p_state->>'turns')::integer,status=p_state->>'status',ended_at=case when p_state->>'status'='completed' then coalesce(ended_at,now()) end where id=p_id;
 update private.sim_state set state=p_state,lease_token=null,lease_until=null where run_id=p_id;
end $$;
-- Only trusted server evaluation may call write/hidden-state RPCs.
revoke all on function public.academy_progress(uuid,uuid,jsonb),public.academy_sim_start(uuid,text,jsonb),public.academy_sim_get(uuid,uuid),public.academy_sim_claim(uuid,uuid,uuid),public.academy_sim_release(uuid,uuid,uuid),public.academy_sim_commit(uuid,uuid,uuid,jsonb) from public,anon,authenticated;
grant execute on function public.academy_progress(uuid,uuid,jsonb),public.academy_sim_start(uuid,text,jsonb),public.academy_sim_get(uuid,uuid),public.academy_sim_claim(uuid,uuid,uuid),public.academy_sim_release(uuid,uuid,uuid),public.academy_sim_commit(uuid,uuid,uuid,jsonb) to service_role;
create table private.yard_practice(owner uuid primary key references public.roster(id),snapshot jsonb not null);
revoke all on private.yard_practice from public,anon,authenticated;
grant all on private.yard_practice to service_role;
create function public.academy_yard_open(p_owner uuid,p_initial jsonb)
returns jsonb language plpgsql security invoker set search_path='' as $$
declare saved jsonb; run jsonb;
begin
 perform pg_advisory_xact_lock(hashtextextended(p_owner::text,0));
 select snapshot into saved from private.yard_practice where owner=p_owner;
 if saved is null then
   run=public.academy_sim_start(p_owner,'maya-and-dan',p_initial->'runState');
   saved=(p_initial-'runState') || jsonb_build_object('runId',run->>'id');
   insert into private.yard_practice values(p_owner,saved);
 end if;
 return saved;
end $$;
create function public.academy_yard_save(p_owner uuid,p_snapshot jsonb)
returns void language plpgsql security invoker set search_path='' as $$
begin
 update private.yard_practice set snapshot=p_snapshot where owner=p_owner and snapshot->>'runId'=p_snapshot->>'runId';
 if not found then raise exception 'Practice unavailable'; end if;
end $$;
revoke all on function public.academy_yard_open(uuid,jsonb),public.academy_yard_save(uuid,jsonb) from public,anon,authenticated;
grant execute on function public.academy_yard_open(uuid,jsonb),public.academy_yard_save(uuid,jsonb) to service_role;
