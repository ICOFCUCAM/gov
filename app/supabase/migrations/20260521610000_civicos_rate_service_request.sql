-- 20260521610000_civicos_rate_service_request.sql
--
-- Phase B · citizen-scoped service rating.
--
-- service_requests carries a satisfaction score, but the only way to set it
-- was update_service_request — an unscoped officer-side RPC that can touch
-- any request. There was no path for a CITIZEN to rate their own resolved
-- service. This adds one: scoped to auth.uid()'s citizen, only on a request
-- they own and that is resolved, score 1–5. Audit-logged on the citizen's
-- scope. Feeds the satisfaction metric with first-party feedback.

set search_path = civicos, pg_catalog;

create or replace function civicos.rate_my_service_request(p_ref text, p_satisfaction int)
returns civicos.service_requests
language plpgsql
security definer
set search_path = civicos, pg_catalog
as $$
declare
  v_citizen uuid;
  rec civicos.service_requests;
begin
  if p_satisfaction is null or p_satisfaction < 1 or p_satisfaction > 5 then
    raise exception 'satisfaction must be between 1 and 5';
  end if;

  select id into v_citizen from civicos.citizens where auth_user_id = (select auth.uid());
  if v_citizen is null then
    raise exception 'rate_my_service_request requires a linked citizen'
      using errcode = 'insufficient_privilege';
  end if;

  update civicos.service_requests
  set satisfaction = p_satisfaction, updated_at = now()
  where ref = p_ref and citizen_id = v_citizen and resolved_at is not null
  returning * into rec;

  if rec.id is null then
    raise exception 'service request % not found, not yours, or not yet resolved', p_ref;
  end if;

  perform civicos.append_audit(
    'citizen:' || v_citizen::text, 'citizen', 'service_rating', rec.ref,
    'rated resolved request ' || rec.ref || ' = ' || p_satisfaction || '/5');
  return rec;
end$$;

create or replace function public.civicos_rate_my_service_request(p_ref text, p_satisfaction int)
returns civicos.service_requests
language sql security definer set search_path = public, pg_catalog
as $$ select * from civicos.rate_my_service_request(p_ref, p_satisfaction); $$;

revoke execute on function public.civicos_rate_my_service_request(text, int) from public, anon;
grant  execute on function public.civicos_rate_my_service_request(text, int) to authenticated;
