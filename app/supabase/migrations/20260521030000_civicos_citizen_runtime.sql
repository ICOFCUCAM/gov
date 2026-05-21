-- 20260521030000_civicos_citizen_runtime.sql
--
-- Phase A · citizen runtime RPC contracts.
--
-- Completes the substrate's write-path coverage:
--   • register_citizen          — provision a citizen (idempotent on national_id)
--   • submit_service_request    — file a service request against a charter
--   • update_service_request    — ack / resolve / record satisfaction
--   • grant_consent             — citizen grants scoped data sharing to a charter
--   • revoke_consent            — citizen withdraws prior grant
--   • file_appeal               — citizen appeals an originating decision
--   • decide_appeal             — adjudicating body records decision
--
-- After this migration EVERY persistent table in civicos.* has a
-- sanctioned, SECURITY DEFINER write path. The substrate contract
-- surface is closed.

set search_path = civicos, pg_catalog;

-- ┌────────────────────────────────────────────────────────────────┐
-- │ Citizens                                                        │
-- └────────────────────────────────────────────────────────────────┘

create or replace function civicos.register_citizen(
  p_national_id text default null,
  p_display_name text default null,
  p_region text default null,
  p_auth_user_id uuid default null,
  p_meta jsonb default '{}'::jsonb
) returns civicos.citizens
language plpgsql security definer
set search_path = pg_catalog, civicos
as $fn$
declare rec civicos.citizens;
begin
  if p_national_id is not null then
    insert into civicos.citizens (national_id, display_name, region, auth_user_id, meta)
    values (p_national_id, p_display_name, p_region, p_auth_user_id, coalesce(p_meta, '{}'::jsonb))
    on conflict (national_id) do update set
      display_name = coalesce(excluded.display_name, civicos.citizens.display_name),
      region       = coalesce(excluded.region, civicos.citizens.region),
      auth_user_id = coalesce(excluded.auth_user_id, civicos.citizens.auth_user_id),
      meta         = civicos.citizens.meta || coalesce(excluded.meta, '{}'::jsonb),
      updated_at   = now()
    returning * into rec;
  else
    insert into civicos.citizens (display_name, region, auth_user_id, meta)
    values (p_display_name, p_region, p_auth_user_id, coalesce(p_meta, '{}'::jsonb))
    returning * into rec;
  end if;
  return rec;
end $fn$;

revoke all on function civicos.register_citizen(text,text,text,uuid,jsonb) from public;
grant execute on function civicos.register_citizen(text,text,text,uuid,jsonb) to anon, authenticated;

-- ┌────────────────────────────────────────────────────────────────┐
-- │ Service requests                                                │
-- └────────────────────────────────────────────────────────────────┘

create or replace function civicos.submit_service_request(
  p_ref text, p_citizen_id uuid, p_target_charter_id text,
  p_service text, p_domain text default null,
  p_title text default null, p_payload jsonb default '{}'::jsonb,
  p_linked_work_item_id uuid default null
) returns civicos.service_requests
language plpgsql security definer
set search_path = pg_catalog, civicos
as $fn$
declare rec civicos.service_requests;
begin
  if p_ref is null or length(p_ref) = 0 then raise exception 'ref required'; end if;
  if p_citizen_id is null then raise exception 'citizen_id required'; end if;

  insert into civicos.service_requests
    (ref, citizen_id, target_charter_id, service, domain, title, status,
     payload, linked_work_item_id)
  values (p_ref, p_citizen_id, p_target_charter_id, p_service, p_domain,
          p_title, 'submitted', coalesce(p_payload, '{}'::jsonb),
          p_linked_work_item_id)
  returning * into rec;
  return rec;
end $fn$;

create or replace function civicos.update_service_request(
  p_ref text,
  p_status text default null,
  p_satisfaction int default null,
  p_payload_patch jsonb default null,
  p_linked_work_item_id uuid default null
) returns civicos.service_requests
language plpgsql security definer
set search_path = pg_catalog, civicos
as $fn$
declare rec civicos.service_requests;
begin
  update civicos.service_requests
     set status = coalesce(p_status, status),
         acknowledged_at = case
           when p_status in ('acknowledged','in-progress','resolved')
            and acknowledged_at is null then now() else acknowledged_at end,
         resolved_at = case
           when p_status = 'resolved' and resolved_at is null then now()
           else resolved_at end,
         satisfaction = coalesce(p_satisfaction, satisfaction),
         payload = case when p_payload_patch is null then payload
                        else payload || p_payload_patch end,
         linked_work_item_id = coalesce(p_linked_work_item_id, linked_work_item_id),
         updated_at = now()
   where ref = p_ref
   returning * into rec;
  if rec.id is null then raise exception 'service request % not found', p_ref; end if;
  return rec;
end $fn$;

revoke all on function civicos.submit_service_request(text,uuid,text,text,text,text,jsonb,uuid) from public;
revoke all on function civicos.update_service_request(text,text,int,jsonb,uuid) from public;
grant execute on function civicos.submit_service_request(text,uuid,text,text,text,text,jsonb,uuid) to anon, authenticated;
grant execute on function civicos.update_service_request(text,text,int,jsonb,uuid) to anon, authenticated;

-- ┌────────────────────────────────────────────────────────────────┐
-- │ Consents                                                        │
-- └────────────────────────────────────────────────────────────────┘
-- A citizen grants a charter access to a named scope ('health.records',
-- 'tax.filings', etc). Grant supersedes any pending or active prior
-- consent for the same (citizen, charter, scope) tuple — the unique
-- partial index on (status in pending,granted) blocks concurrent active
-- duplicates at the DB level.

create or replace function civicos.grant_consent(
  p_citizen_id uuid, p_target_charter_id text, p_scope text,
  p_expires_at timestamptz default null,
  p_payload jsonb default '{}'::jsonb
) returns civicos.consents
language plpgsql security definer
set search_path = pg_catalog, civicos
as $fn$
declare rec civicos.consents;
begin
  -- Supersede any existing active/pending consent for this tuple by
  -- marking it expired; ensures the new grant is the only active row.
  update civicos.consents
     set status = 'expired', updated_at = now()
   where citizen_id = p_citizen_id
     and target_charter_id = p_target_charter_id
     and scope = p_scope
     and status in ('pending', 'granted');

  insert into civicos.consents
    (citizen_id, target_charter_id, scope, status, granted_at,
     expires_at, payload)
  values (p_citizen_id, p_target_charter_id, p_scope, 'granted', now(),
          p_expires_at, coalesce(p_payload, '{}'::jsonb))
  returning * into rec;
  return rec;
end $fn$;

create or replace function civicos.revoke_consent(p_consent_id uuid)
returns civicos.consents
language plpgsql security definer
set search_path = pg_catalog, civicos
as $fn$
declare rec civicos.consents;
begin
  update civicos.consents
     set status = 'revoked', revoked_at = coalesce(revoked_at, now()),
         updated_at = now()
   where id = p_consent_id
   returning * into rec;
  if rec.id is null then raise exception 'consent % not found', p_consent_id; end if;
  return rec;
end $fn$;

revoke all on function civicos.grant_consent(uuid,text,text,timestamptz,jsonb) from public;
revoke all on function civicos.revoke_consent(uuid) from public;
grant execute on function civicos.grant_consent(uuid,text,text,timestamptz,jsonb) to anon, authenticated;
grant execute on function civicos.revoke_consent(uuid) to anon, authenticated;

-- ┌────────────────────────────────────────────────────────────────┐
-- │ Appeals                                                         │
-- └────────────────────────────────────────────────────────────────┘

create or replace function civicos.file_appeal(
  p_ref text, p_citizen_id uuid, p_originating_charter_id text,
  p_ground text,
  p_originating_decision_ref text default null,
  p_linked_work_item_id uuid default null
) returns civicos.appeals
language plpgsql security definer
set search_path = pg_catalog, civicos
as $fn$
declare rec civicos.appeals;
begin
  if p_ref is null or length(p_ref) = 0 then raise exception 'ref required'; end if;
  if p_citizen_id is null then raise exception 'citizen_id required'; end if;
  if p_ground is null or length(p_ground) = 0 then raise exception 'ground required'; end if;

  insert into civicos.appeals
    (ref, citizen_id, originating_charter_id, originating_decision_ref,
     ground, status, linked_work_item_id)
  values (p_ref, p_citizen_id, p_originating_charter_id, p_originating_decision_ref,
          p_ground, 'filed', p_linked_work_item_id)
  returning * into rec;
  return rec;
end $fn$;

create or replace function civicos.decide_appeal(
  p_ref text, p_decision text, p_reasoning text default null,
  p_publish boolean default true
) returns civicos.appeals
language plpgsql security definer
set search_path = pg_catalog, civicos
as $fn$
declare rec civicos.appeals;
begin
  if p_decision is null or length(p_decision) = 0 then raise exception 'decision required'; end if;
  update civicos.appeals
     set status = 'decided',
         decision = p_decision, reasoning = p_reasoning,
         decided_at = coalesce(decided_at, now()),
         published_at = case when p_publish and published_at is null then now() else published_at end,
         updated_at = now()
   where ref = p_ref
   returning * into rec;
  if rec.id is null then raise exception 'appeal % not found', p_ref; end if;
  return rec;
end $fn$;

revoke all on function civicos.file_appeal(text,uuid,text,text,text,uuid) from public;
revoke all on function civicos.decide_appeal(text,text,text,boolean) from public;
grant execute on function civicos.file_appeal(text,uuid,text,text,text,uuid) to anon, authenticated;
grant execute on function civicos.decide_appeal(text,text,text,boolean) to anon, authenticated;

-- ┌────────────────────────────────────────────────────────────────┐
-- │ Public wrappers                                                 │
-- └────────────────────────────────────────────────────────────────┘

create or replace function public.civicos_register_citizen(
  p_national_id text default null, p_display_name text default null,
  p_region text default null, p_auth_user_id uuid default null,
  p_meta jsonb default '{}'::jsonb
) returns civicos.citizens language sql security definer
set search_path = pg_catalog, civicos
as $fn$ select civicos.register_citizen(p_national_id, p_display_name, p_region, p_auth_user_id, p_meta); $fn$;
revoke all on function public.civicos_register_citizen(text,text,text,uuid,jsonb) from public;
grant execute on function public.civicos_register_citizen(text,text,text,uuid,jsonb) to anon, authenticated;

create or replace function public.civicos_submit_service_request(
  p_ref text, p_citizen_id uuid, p_target_charter_id text,
  p_service text, p_domain text default null,
  p_title text default null, p_payload jsonb default '{}'::jsonb,
  p_linked_work_item_id uuid default null
) returns civicos.service_requests language sql security definer
set search_path = pg_catalog, civicos
as $fn$ select civicos.submit_service_request(p_ref, p_citizen_id, p_target_charter_id,
  p_service, p_domain, p_title, p_payload, p_linked_work_item_id); $fn$;
revoke all on function public.civicos_submit_service_request(text,uuid,text,text,text,text,jsonb,uuid) from public;
grant execute on function public.civicos_submit_service_request(text,uuid,text,text,text,text,jsonb,uuid) to anon, authenticated;

create or replace function public.civicos_update_service_request(
  p_ref text, p_status text default null, p_satisfaction int default null,
  p_payload_patch jsonb default null, p_linked_work_item_id uuid default null
) returns civicos.service_requests language sql security definer
set search_path = pg_catalog, civicos
as $fn$ select civicos.update_service_request(p_ref, p_status, p_satisfaction, p_payload_patch, p_linked_work_item_id); $fn$;
revoke all on function public.civicos_update_service_request(text,text,int,jsonb,uuid) from public;
grant execute on function public.civicos_update_service_request(text,text,int,jsonb,uuid) to anon, authenticated;

create or replace function public.civicos_grant_consent(
  p_citizen_id uuid, p_target_charter_id text, p_scope text,
  p_expires_at timestamptz default null, p_payload jsonb default '{}'::jsonb
) returns civicos.consents language sql security definer
set search_path = pg_catalog, civicos
as $fn$ select civicos.grant_consent(p_citizen_id, p_target_charter_id, p_scope, p_expires_at, p_payload); $fn$;
revoke all on function public.civicos_grant_consent(uuid,text,text,timestamptz,jsonb) from public;
grant execute on function public.civicos_grant_consent(uuid,text,text,timestamptz,jsonb) to anon, authenticated;

create or replace function public.civicos_revoke_consent(p_consent_id uuid)
returns civicos.consents language sql security definer
set search_path = pg_catalog, civicos
as $fn$ select civicos.revoke_consent(p_consent_id); $fn$;
revoke all on function public.civicos_revoke_consent(uuid) from public;
grant execute on function public.civicos_revoke_consent(uuid) to anon, authenticated;

create or replace function public.civicos_file_appeal(
  p_ref text, p_citizen_id uuid, p_originating_charter_id text,
  p_ground text, p_originating_decision_ref text default null,
  p_linked_work_item_id uuid default null
) returns civicos.appeals language sql security definer
set search_path = pg_catalog, civicos
as $fn$ select civicos.file_appeal(p_ref, p_citizen_id, p_originating_charter_id,
  p_ground, p_originating_decision_ref, p_linked_work_item_id); $fn$;
revoke all on function public.civicos_file_appeal(text,uuid,text,text,text,uuid) from public;
grant execute on function public.civicos_file_appeal(text,uuid,text,text,text,uuid) to anon, authenticated;

create or replace function public.civicos_decide_appeal(
  p_ref text, p_decision text, p_reasoning text default null,
  p_publish boolean default true
) returns civicos.appeals language sql security definer
set search_path = pg_catalog, civicos
as $fn$ select civicos.decide_appeal(p_ref, p_decision, p_reasoning, p_publish); $fn$;
revoke all on function public.civicos_decide_appeal(text,text,text,boolean) from public;
grant execute on function public.civicos_decide_appeal(text,text,text,boolean) to anon, authenticated;
