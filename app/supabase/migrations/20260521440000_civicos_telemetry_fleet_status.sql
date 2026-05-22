-- 20260521440000_civicos_telemetry_fleet_status.sql
--
-- Phase B · telemetry observability — fleet status roll-up.
--
-- The telemetry wall lists streams but to know the live state of each an
-- operator had to open every one. This RPC returns, for every active
-- stream, its latest value and a computed status: alert / warn (latest
-- sample crosses the threshold, same `value >= threshold` rule as the
-- auto-escalate trigger), stale (no sample within p_stale_minutes — a
-- silent sensor, which is itself a problem), or ok. Ordered worst-first.
--
-- Authenticated-tier (sample values aren't public). SECURITY DEFINER
-- granted to authenticated only.

set search_path = civicos, pg_catalog;

create or replace function civicos.telemetry_fleet_status(
  p_charter_id text default null, p_stale_minutes int default 60
)
returns table(
  stream_id text, charter_id text, label text, unit text,
  latest_value double precision, latest_ts timestamptz, age_minutes int,
  warn_threshold double precision, alert_threshold double precision, status text
)
language sql
security definer
stable
set search_path = civicos, pg_catalog
as $$
  with bounded as (select greatest(1, least(coalesce(p_stale_minutes, 60), 43200)) as stale_min)
  select
    s.stream_id, s.charter_id, s.label, s.unit,
    ls.value, ls.ts,
    case when ls.ts is null then null
         else floor(extract(epoch from (now() - ls.ts)) / 60)::int end,
    s.warn_threshold, s.alert_threshold,
    case
      when ls.ts is null
        or ls.ts < now() - make_interval(mins => (select stale_min from bounded)) then 'stale'
      when s.alert_threshold is not null and ls.value >= s.alert_threshold then 'alert'
      when s.warn_threshold is not null and ls.value >= s.warn_threshold then 'warn'
      else 'ok'
    end as status
  from civicos.telemetry_streams s
  left join lateral (
    select value, ts from civicos.telemetry_samples
    where stream_id = s.stream_id order by ts desc limit 1
  ) ls on true
  where s.active and (p_charter_id is null or s.charter_id = p_charter_id)
  order by
    case
      when ls.ts is null
        or ls.ts < now() - make_interval(mins => (select stale_min from bounded)) then 1  -- stale
      when s.alert_threshold is not null and ls.value >= s.alert_threshold then 0          -- alert worst
      when s.warn_threshold is not null and ls.value >= s.warn_threshold then 2            -- warn
      else 3                                                                                -- ok
    end,
    s.charter_id, s.stream_id;
$$;

create or replace function public.civicos_telemetry_fleet_status(
  p_charter_id text default null, p_stale_minutes int default 60
)
returns table(
  stream_id text, charter_id text, label text, unit text,
  latest_value double precision, latest_ts timestamptz, age_minutes int,
  warn_threshold double precision, alert_threshold double precision, status text
) language sql security definer stable set search_path = public, pg_catalog
as $$ select * from civicos.telemetry_fleet_status(p_charter_id, p_stale_minutes); $$;

revoke execute on function public.civicos_telemetry_fleet_status(text, int) from public, anon;
grant  execute on function public.civicos_telemetry_fleet_status(text, int) to authenticated;
