create function public.academy_digest_claim(p_tenant uuid,p_week date,p_payload jsonb)
returns uuid language plpgsql security invoker set search_path='' as $$
declare delivery uuid;
begin
 insert into public.digest_log(tenant_id,week_start,status,payload,attempts)
 values(p_tenant,p_week,'pending',p_payload,1)
 on conflict(tenant_id,week_start) do update set status='pending',payload=excluded.payload,attempts=public.digest_log.attempts+1,created_at=now(),error_summary=null
 where public.digest_log.status='failed' or (public.digest_log.status='pending' and public.digest_log.created_at<now()-interval '5 minutes')
 returning id into delivery;
 return delivery;
end $$;
revoke all on function public.academy_digest_claim(uuid,date,jsonb) from public,anon,authenticated;
grant execute on function public.academy_digest_claim(uuid,date,jsonb) to service_role;
