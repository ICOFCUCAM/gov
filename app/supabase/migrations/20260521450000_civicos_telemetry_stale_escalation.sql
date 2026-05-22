-- 20260521450000_civicos_telemetry_stale_escalation.sql
--
-- Phase B · telemetry observability — auto-escalate silent sensors.
--
-- The auto-escalate trigger fires when a sample CROSSES a threshold, but a
-- sensor that goes SILENT emits nothing — the most dangerous failure
-- (you're flying blind) produces no signal at all. This RPC, run
-- periodically, finds every active stream with no sample inside the window
-- and records a 'minor' escalation against its charter, so a silent stream
-- surfaces in the escalation floor like any other operational problem.
--
-- Per-stream idempotency mirrors escalate_stale_service_requests: a stream
-- already escalated in the last 24h is skipped, so frequent runs don't
-- multiply noise. Service-role or platform-tier (it mutates).

set search_path = civicos, pg_catalog;

create or replace function civicos.escalate_stale_telemetry_streams(p_stale_minutes int default 120)
returns int
language plpgsql security definer
set search_path = civicos, pg_catalog
as $fn$
declare
  r record;
  escalated int := 0;
  v_window int := greatest(1, least(coalesce(p_stale_minutes, 120), 43200));
  v_prefix text;
  v_minutes numeric;
begin
  if not (civicos.is_service_context() or civicos.is_platform_officer()) then
    raise exception 'escalate_stale_telemetry_streams requires service_role or a platform-tier role'
      using errcode = 'insufficient_privilege';
  end if;

  for r in
    select s.stream_id, s.charter_id, s.label,
           (select max(sm.ts) from civicos.telemetry_samples sm where sm.stream_id = s.stream_id) as last_ts
      from civicos.telemetry_streams s
     where s.active
  loop
    -- fresh stream: a sample landed inside the window
    if r.last_ts is not null and r.last_ts >= now() - make_interval(mins => v_window) then
      continue;
    end if;
    v_prefix := 'stale telemetry stream ' || r.stream_id || '%';
    if exists (
      select 1 from civicos.escalations e
       where e.source_charter_id = r.charter_id
         and e.reason like v_prefix
         and e.triggered_at > now() - interval '24 hours'
    ) then
      continue;
    end if;
    v_minutes := case when r.last_ts is null then null
                      else round((extract(epoch from (now() - r.last_ts)) / 60.0)::numeric, 0) end;
    insert into civicos.escalations
      (source_charter_id, severity, reason, triggered_by_actor, payload)
    values (
      r.charter_id, 'minor',
      format('stale telemetry stream %s · %s', r.stream_id,
             case when r.last_ts is null then 'no samples on record'
                  else v_minutes || ' minutes since last sample' end),
      'telemetry-stale-cron',
      jsonb_build_object(
        'stream_id', r.stream_id, 'label', r.label,
        'last_sample_at', r.last_ts, 'minutes_silent', v_minutes
      ));
    escalated := escalated + 1;
  end loop;
  return escalated;
end $fn$;

create or replace function public.civicos_escalate_stale_telemetry_streams(p_stale_minutes int default 120)
returns int language sql security definer set search_path = public, pg_catalog
as $$ select civicos.escalate_stale_telemetry_streams(p_stale_minutes); $$;

revoke execute on function public.civicos_escalate_stale_telemetry_streams(int) from public, anon, authenticated;
