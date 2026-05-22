-- 20260521670000_civicos_telemetry_stream_active.sql
--
-- Phase B · decommission / reactivate a telemetry stream.
--
-- telemetry_streams.active defaults true and NO RPC ever changed it —
-- define_telemetry_stream only upserts metadata. So a decommissioned sensor
-- couldn't be turned off, and it would keep tripping the stale-sensor
-- escalation cron forever. This adds the toggle: deactivating drops the
-- stream from fleet status, the public catalog, and stale escalation;
-- reactivating restores it.
--
-- Platform-tier / service (managing the telemetry fleet is an operator act).

set search_path = civicos, pg_catalog;

create or replace function civicos.set_telemetry_stream_active(p_stream_id text, p_active boolean)
returns boolean
language plpgsql
security definer
set search_path = civicos, pg_catalog
as $$
declare v_found boolean;
begin
  if not (civicos.is_service_context() or civicos.is_platform_officer()) then
    raise exception 'set_telemetry_stream_active requires a platform-tier role'
      using errcode = 'insufficient_privilege';
  end if;
  update civicos.telemetry_streams
  set active = p_active, updated_at = now()
  where stream_id = p_stream_id
  returning true into v_found;
  return coalesce(v_found, false);
end$$;

create or replace function public.civicos_set_telemetry_stream_active(p_stream_id text, p_active boolean)
returns boolean language sql security definer set search_path = public, pg_catalog
as $$ select civicos.set_telemetry_stream_active(p_stream_id, p_active); $$;

revoke execute on function public.civicos_set_telemetry_stream_active(text, boolean) from public, anon;
grant  execute on function public.civicos_set_telemetry_stream_active(text, boolean) to authenticated;
