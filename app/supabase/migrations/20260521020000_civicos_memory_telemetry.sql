-- 20260521020000_civicos_memory_telemetry.sql
--
-- Phase A · institutional memory + telemetry RPC contracts.
--
-- Adds SECURITY DEFINER write paths for the remaining declared tables:
--   • directives     — record_directive / sign_directive / rescind_directive
--   • dispatches     — record_dispatch / acknowledge_dispatch / close_dispatch
--   • escalations    — record_escalation / acknowledge_escalation / resolve_escalation
--   • telemetry      — define_telemetry_stream / record_telemetry_sample
--
-- After this migration every persistent table in civicos.* has a
-- sanctioned RPC write path; no caller needs to touch the tables directly.

set search_path = civicos, pg_catalog;

-- ┌────────────────────────────────────────────────────────────────┐
-- │ Directives                                                      │
-- └────────────────────────────────────────────────────────────────┘

create or replace function civicos.record_directive(
  p_ref text, p_kind text, p_issued_by_charter_id text, p_title text,
  p_citation text default null, p_targets text[] default '{}',
  p_payload jsonb default '{}'::jsonb,
  p_issued_by_name text default null,
  p_status text default 'drafting'
) returns civicos.directives
language plpgsql security definer
set search_path = pg_catalog, civicos
as $fn$
declare rec civicos.directives;
begin
  if p_ref is null or length(p_ref) = 0 then raise exception 'ref required'; end if;
  insert into civicos.directives
    (ref, kind, issued_by_charter_id, issued_by_name, title, citation,
     status, targets, payload)
  values (p_ref, p_kind, p_issued_by_charter_id, p_issued_by_name, p_title,
          p_citation, coalesce(p_status, 'drafting'),
          coalesce(p_targets, '{}'), coalesce(p_payload, '{}'::jsonb))
  on conflict (ref) do update set
    kind = excluded.kind, title = excluded.title, citation = excluded.citation,
    issued_by_charter_id = excluded.issued_by_charter_id,
    issued_by_name = coalesce(excluded.issued_by_name, civicos.directives.issued_by_name),
    targets = excluded.targets,
    payload = civicos.directives.payload || excluded.payload,
    updated_at = now()
  returning * into rec;
  return rec;
end $fn$;

create or replace function civicos.sign_directive(
  p_ref text, p_signed_by_officer_id uuid default null,
  p_effective_at timestamptz default null
) returns civicos.directives
language plpgsql security definer
set search_path = pg_catalog, civicos
as $fn$
declare rec civicos.directives;
begin
  update civicos.directives
     set status = case when p_effective_at is not null and p_effective_at <= now()
                       then 'effective' else 'signed' end,
         signed_at = coalesce(signed_at, now()),
         signed_by_id = coalesce(p_signed_by_officer_id, signed_by_id),
         effective_at = coalesce(p_effective_at, effective_at),
         updated_at = now()
   where ref = p_ref
   returning * into rec;
  if rec.id is null then raise exception 'directive % not found', p_ref; end if;
  return rec;
end $fn$;

create or replace function civicos.rescind_directive(p_ref text)
returns civicos.directives
language plpgsql security definer
set search_path = pg_catalog, civicos
as $fn$
declare rec civicos.directives;
begin
  update civicos.directives
     set status = 'rescinded', rescinded_at = now(), updated_at = now()
   where ref = p_ref
   returning * into rec;
  if rec.id is null then raise exception 'directive % not found', p_ref; end if;
  return rec;
end $fn$;

revoke all on function civicos.record_directive(text,text,text,text,text,text[],jsonb,text,text) from public;
revoke all on function civicos.sign_directive(text,uuid,timestamptz) from public;
revoke all on function civicos.rescind_directive(text) from public;
grant execute on function civicos.record_directive(text,text,text,text,text,text[],jsonb,text,text) to anon, authenticated;
grant execute on function civicos.sign_directive(text,uuid,timestamptz) to anon, authenticated;
grant execute on function civicos.rescind_directive(text) to anon, authenticated;

-- ┌────────────────────────────────────────────────────────────────┐
-- │ Dispatches                                                      │
-- └────────────────────────────────────────────────────────────────┘

create or replace function civicos.record_dispatch(
  p_ref text, p_issued_by_charter_id text, p_kind text,
  p_priority civicos.priority default 'priority',
  p_detail text default null, p_payload jsonb default '{}'::jsonb,
  p_target_facility_id uuid default null,
  p_target_charter_id text default null,
  p_issued_by_officer_id uuid default null
) returns civicos.dispatches
language plpgsql security definer
set search_path = pg_catalog, civicos
as $fn$
declare rec civicos.dispatches;
begin
  if p_ref is null or length(p_ref) = 0 then raise exception 'ref required'; end if;
  insert into civicos.dispatches
    (ref, issued_by_charter_id, issued_by_officer_id, target_facility_id,
     target_charter_id, kind, priority, status, detail, payload)
  values (p_ref, p_issued_by_charter_id, p_issued_by_officer_id,
          p_target_facility_id, p_target_charter_id, p_kind, p_priority,
          'dispatched', p_detail, coalesce(p_payload, '{}'::jsonb))
  on conflict (ref) do nothing
  returning * into rec;
  if rec.id is null then
    select * into rec from civicos.dispatches where ref = p_ref;
  end if;
  return rec;
end $fn$;

create or replace function civicos.acknowledge_dispatch(p_ref text)
returns civicos.dispatches
language plpgsql security definer
set search_path = pg_catalog, civicos
as $fn$
declare rec civicos.dispatches;
begin
  update civicos.dispatches
     set acknowledged_at = coalesce(acknowledged_at, now()),
         status = case when status = 'dispatched' then 'acknowledged' else status end,
         updated_at = now()
   where ref = p_ref
   returning * into rec;
  if rec.id is null then raise exception 'dispatch % not found', p_ref; end if;
  return rec;
end $fn$;

create or replace function civicos.close_dispatch(p_ref text)
returns civicos.dispatches
language plpgsql security definer
set search_path = pg_catalog, civicos
as $fn$
declare rec civicos.dispatches;
begin
  update civicos.dispatches
     set closed_at = coalesce(closed_at, now()),
         status = 'closed', updated_at = now()
   where ref = p_ref
   returning * into rec;
  if rec.id is null then raise exception 'dispatch % not found', p_ref; end if;
  return rec;
end $fn$;

revoke all on function civicos.record_dispatch(text,text,text,civicos.priority,text,jsonb,uuid,text,uuid) from public;
revoke all on function civicos.acknowledge_dispatch(text) from public;
revoke all on function civicos.close_dispatch(text) from public;
grant execute on function civicos.record_dispatch(text,text,text,civicos.priority,text,jsonb,uuid,text,uuid) to anon, authenticated;
grant execute on function civicos.acknowledge_dispatch(text) to anon, authenticated;
grant execute on function civicos.close_dispatch(text) to anon, authenticated;

-- ┌────────────────────────────────────────────────────────────────┐
-- │ Escalations                                                     │
-- └────────────────────────────────────────────────────────────────┘

create or replace function civicos.record_escalation(
  p_source_charter_id text, p_severity civicos.severity, p_reason text,
  p_target_charter_id text default null,
  p_linked_work_item_id uuid default null,
  p_linked_dispatch_id uuid default null,
  p_triggered_by_actor text default null,
  p_payload jsonb default '{}'::jsonb
) returns civicos.escalations
language plpgsql security definer
set search_path = pg_catalog, civicos
as $fn$
declare rec civicos.escalations;
begin
  insert into civicos.escalations
    (source_charter_id, target_charter_id, severity, reason,
     linked_work_item_id, linked_dispatch_id, triggered_by_actor, payload)
  values (p_source_charter_id, p_target_charter_id, p_severity, p_reason,
          p_linked_work_item_id, p_linked_dispatch_id, p_triggered_by_actor,
          coalesce(p_payload, '{}'::jsonb))
  returning * into rec;
  return rec;
end $fn$;

create or replace function civicos.acknowledge_escalation(
  p_id uuid, p_acknowledged_by uuid default null
) returns civicos.escalations
language plpgsql security definer
set search_path = pg_catalog, civicos
as $fn$
declare rec civicos.escalations;
begin
  update civicos.escalations
     set acknowledged_at = coalesce(acknowledged_at, now()),
         acknowledged_by = coalesce(p_acknowledged_by, acknowledged_by)
   where id = p_id
   returning * into rec;
  if rec.id is null then raise exception 'escalation % not found', p_id; end if;
  return rec;
end $fn$;

create or replace function civicos.resolve_escalation(p_id uuid)
returns civicos.escalations
language plpgsql security definer
set search_path = pg_catalog, civicos
as $fn$
declare rec civicos.escalations;
begin
  update civicos.escalations
     set resolved_at = coalesce(resolved_at, now())
   where id = p_id
   returning * into rec;
  if rec.id is null then raise exception 'escalation % not found', p_id; end if;
  return rec;
end $fn$;

revoke all on function civicos.record_escalation(text,civicos.severity,text,text,uuid,uuid,text,jsonb) from public;
revoke all on function civicos.acknowledge_escalation(uuid,uuid) from public;
revoke all on function civicos.resolve_escalation(uuid) from public;
grant execute on function civicos.record_escalation(text,civicos.severity,text,text,uuid,uuid,text,jsonb) to anon, authenticated;
grant execute on function civicos.acknowledge_escalation(uuid,uuid) to anon, authenticated;
grant execute on function civicos.resolve_escalation(uuid) to anon, authenticated;

-- ┌────────────────────────────────────────────────────────────────┐
-- │ Telemetry                                                       │
-- └────────────────────────────────────────────────────────────────┘

create or replace function civicos.define_telemetry_stream(
  p_stream_id text, p_charter_id text, p_label text,
  p_unit text default null, p_aggregation text default 'instantaneous',
  p_retention_days int default 365,
  p_warn_threshold double precision default null,
  p_alert_threshold double precision default null,
  p_facility_id uuid default null
) returns civicos.telemetry_streams
language plpgsql security definer
set search_path = pg_catalog, civicos
as $fn$
declare rec civicos.telemetry_streams;
begin
  insert into civicos.telemetry_streams
    (stream_id, charter_id, facility_id, label, unit, aggregation,
     retention_days, warn_threshold, alert_threshold)
  values (p_stream_id, p_charter_id, p_facility_id, p_label, p_unit,
          coalesce(p_aggregation, 'instantaneous'),
          coalesce(p_retention_days, 365),
          p_warn_threshold, p_alert_threshold)
  on conflict (stream_id) do update set
    charter_id = excluded.charter_id, label = excluded.label,
    unit = excluded.unit, aggregation = excluded.aggregation,
    retention_days = excluded.retention_days,
    warn_threshold = excluded.warn_threshold,
    alert_threshold = excluded.alert_threshold,
    facility_id = excluded.facility_id,
    updated_at = now()
  returning * into rec;
  return rec;
end $fn$;

create or replace function civicos.record_telemetry_sample(
  p_stream_id text, p_value double precision,
  p_ts timestamptz default null,
  p_facility_id uuid default null,
  p_meta jsonb default '{}'::jsonb
) returns civicos.telemetry_samples
language plpgsql security definer
set search_path = pg_catalog, civicos
as $fn$
declare rec civicos.telemetry_samples;
begin
  if p_value is null then raise exception 'value required'; end if;
  insert into civicos.telemetry_samples (stream_id, ts, value, facility_id, meta)
  values (p_stream_id, coalesce(p_ts, now()), p_value, p_facility_id,
          coalesce(p_meta, '{}'::jsonb))
  returning * into rec;
  return rec;
end $fn$;

revoke all on function civicos.define_telemetry_stream(text,text,text,text,text,int,double precision,double precision,uuid) from public;
revoke all on function civicos.record_telemetry_sample(text,double precision,timestamptz,uuid,jsonb) from public;
grant execute on function civicos.define_telemetry_stream(text,text,text,text,text,int,double precision,double precision,uuid) to anon, authenticated;
grant execute on function civicos.record_telemetry_sample(text,double precision,timestamptz,uuid,jsonb) to anon, authenticated;

-- ┌────────────────────────────────────────────────────────────────┐
-- │ Public wrappers                                                 │
-- └────────────────────────────────────────────────────────────────┘

create or replace function public.civicos_record_directive(
  p_ref text, p_kind text, p_issued_by_charter_id text, p_title text,
  p_citation text default null, p_targets text[] default '{}',
  p_payload jsonb default '{}'::jsonb,
  p_issued_by_name text default null,
  p_status text default 'drafting'
) returns civicos.directives language sql security definer
set search_path = pg_catalog, civicos
as $fn$ select civicos.record_directive(p_ref, p_kind, p_issued_by_charter_id,
  p_title, p_citation, p_targets, p_payload, p_issued_by_name, p_status); $fn$;
revoke all on function public.civicos_record_directive(text,text,text,text,text,text[],jsonb,text,text) from public;
grant execute on function public.civicos_record_directive(text,text,text,text,text,text[],jsonb,text,text) to anon, authenticated;

create or replace function public.civicos_sign_directive(
  p_ref text, p_signed_by_officer_id uuid default null,
  p_effective_at timestamptz default null
) returns civicos.directives language sql security definer
set search_path = pg_catalog, civicos
as $fn$ select civicos.sign_directive(p_ref, p_signed_by_officer_id, p_effective_at); $fn$;
revoke all on function public.civicos_sign_directive(text,uuid,timestamptz) from public;
grant execute on function public.civicos_sign_directive(text,uuid,timestamptz) to anon, authenticated;

create or replace function public.civicos_rescind_directive(p_ref text)
returns civicos.directives language sql security definer
set search_path = pg_catalog, civicos
as $fn$ select civicos.rescind_directive(p_ref); $fn$;
revoke all on function public.civicos_rescind_directive(text) from public;
grant execute on function public.civicos_rescind_directive(text) to anon, authenticated;

create or replace function public.civicos_record_dispatch(
  p_ref text, p_issued_by_charter_id text, p_kind text,
  p_priority text default 'priority',
  p_detail text default null, p_payload jsonb default '{}'::jsonb,
  p_target_facility_id uuid default null, p_target_charter_id text default null,
  p_issued_by_officer_id uuid default null
) returns civicos.dispatches language sql security definer
set search_path = pg_catalog, civicos
as $fn$ select civicos.record_dispatch(p_ref, p_issued_by_charter_id, p_kind,
  p_priority::civicos.priority, p_detail, p_payload, p_target_facility_id,
  p_target_charter_id, p_issued_by_officer_id); $fn$;
revoke all on function public.civicos_record_dispatch(text,text,text,text,text,jsonb,uuid,text,uuid) from public;
grant execute on function public.civicos_record_dispatch(text,text,text,text,text,jsonb,uuid,text,uuid) to anon, authenticated;

create or replace function public.civicos_acknowledge_dispatch(p_ref text)
returns civicos.dispatches language sql security definer
set search_path = pg_catalog, civicos
as $fn$ select civicos.acknowledge_dispatch(p_ref); $fn$;
revoke all on function public.civicos_acknowledge_dispatch(text) from public;
grant execute on function public.civicos_acknowledge_dispatch(text) to anon, authenticated;

create or replace function public.civicos_close_dispatch(p_ref text)
returns civicos.dispatches language sql security definer
set search_path = pg_catalog, civicos
as $fn$ select civicos.close_dispatch(p_ref); $fn$;
revoke all on function public.civicos_close_dispatch(text) from public;
grant execute on function public.civicos_close_dispatch(text) to anon, authenticated;

create or replace function public.civicos_record_escalation(
  p_source_charter_id text, p_severity text, p_reason text,
  p_target_charter_id text default null, p_linked_work_item_id uuid default null,
  p_linked_dispatch_id uuid default null, p_triggered_by_actor text default null,
  p_payload jsonb default '{}'::jsonb
) returns civicos.escalations language sql security definer
set search_path = pg_catalog, civicos
as $fn$ select civicos.record_escalation(p_source_charter_id,
  p_severity::civicos.severity, p_reason, p_target_charter_id,
  p_linked_work_item_id, p_linked_dispatch_id, p_triggered_by_actor, p_payload); $fn$;
revoke all on function public.civicos_record_escalation(text,text,text,text,uuid,uuid,text,jsonb) from public;
grant execute on function public.civicos_record_escalation(text,text,text,text,uuid,uuid,text,jsonb) to anon, authenticated;

create or replace function public.civicos_acknowledge_escalation(p_id uuid, p_acknowledged_by uuid default null)
returns civicos.escalations language sql security definer
set search_path = pg_catalog, civicos
as $fn$ select civicos.acknowledge_escalation(p_id, p_acknowledged_by); $fn$;
revoke all on function public.civicos_acknowledge_escalation(uuid,uuid) from public;
grant execute on function public.civicos_acknowledge_escalation(uuid,uuid) to anon, authenticated;

create or replace function public.civicos_resolve_escalation(p_id uuid)
returns civicos.escalations language sql security definer
set search_path = pg_catalog, civicos
as $fn$ select civicos.resolve_escalation(p_id); $fn$;
revoke all on function public.civicos_resolve_escalation(uuid) from public;
grant execute on function public.civicos_resolve_escalation(uuid) to anon, authenticated;

create or replace function public.civicos_define_telemetry_stream(
  p_stream_id text, p_charter_id text, p_label text, p_unit text default null,
  p_aggregation text default 'instantaneous', p_retention_days int default 365,
  p_warn_threshold double precision default null,
  p_alert_threshold double precision default null,
  p_facility_id uuid default null
) returns civicos.telemetry_streams language sql security definer
set search_path = pg_catalog, civicos
as $fn$ select civicos.define_telemetry_stream(p_stream_id, p_charter_id,
  p_label, p_unit, p_aggregation, p_retention_days, p_warn_threshold,
  p_alert_threshold, p_facility_id); $fn$;
revoke all on function public.civicos_define_telemetry_stream(text,text,text,text,text,int,double precision,double precision,uuid) from public;
grant execute on function public.civicos_define_telemetry_stream(text,text,text,text,text,int,double precision,double precision,uuid) to anon, authenticated;

create or replace function public.civicos_record_telemetry_sample(
  p_stream_id text, p_value double precision,
  p_ts timestamptz default null, p_facility_id uuid default null,
  p_meta jsonb default '{}'::jsonb
) returns civicos.telemetry_samples language sql security definer
set search_path = pg_catalog, civicos
as $fn$ select civicos.record_telemetry_sample(p_stream_id, p_value, p_ts,
  p_facility_id, p_meta); $fn$;
revoke all on function public.civicos_record_telemetry_sample(text,double precision,timestamptz,uuid,jsonb) from public;
grant execute on function public.civicos_record_telemetry_sample(text,double precision,timestamptz,uuid,jsonb) to anon, authenticated;
