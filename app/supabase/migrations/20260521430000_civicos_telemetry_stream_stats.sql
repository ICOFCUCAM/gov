-- 20260521430000_civicos_telemetry_stream_stats.sql
--
-- Phase B · telemetry observability — per-stream statistics.
--
-- The stream detail surface plotted recent samples but offered no summary:
-- an operator could not see the distribution (min/max/avg/median/p95), how
-- volatile a stream is, or how often it has been in the warn / alert zone.
-- This RPC computes that over a window, joining the stream's thresholds so
-- breach counts use the same `value >= threshold` rule as the auto-escalate
-- trigger.
--
-- telemetry_samples is authenticated-tier (RLS), so this is SECURITY
-- DEFINER granted to authenticated only — never anon. It returns aggregates
-- for one stream; no escalation of who-can-read beyond the existing policy.

set search_path = civicos, pg_catalog;

create or replace function civicos.telemetry_stream_stats(p_stream_id text, p_hours int default 24)
returns table(
  samples bigint,
  min_value double precision,
  max_value double precision,
  avg_value double precision,
  median_value double precision,
  p95_value double precision,
  stddev_value double precision,
  latest_value double precision,
  latest_ts timestamptz,
  warn_breaches bigint,
  alert_breaches bigint
)
language sql
security definer
stable
set search_path = civicos, pg_catalog
as $$
  with str as (
    select warn_threshold, alert_threshold
    from civicos.telemetry_streams where stream_id = p_stream_id
  ),
  win as (
    select value, ts
    from civicos.telemetry_samples
    where stream_id = p_stream_id
      and ts >= now() - make_interval(hours => greatest(1, least(coalesce(p_hours, 24), 8760)))
  )
  select
    count(*)::bigint,
    min(w.value),
    max(w.value),
    round(avg(w.value)::numeric, 4)::double precision,
    percentile_cont(0.5) within group (order by w.value),
    percentile_cont(0.95) within group (order by w.value),
    round(stddev_samp(w.value)::numeric, 4)::double precision,
    (select value from win order by ts desc limit 1),
    (select ts from win order by ts desc limit 1),
    count(*) filter (where (select warn_threshold from str) is not null
                       and w.value >= (select warn_threshold from str))::bigint,
    count(*) filter (where (select alert_threshold from str) is not null
                       and w.value >= (select alert_threshold from str))::bigint
  from win w;
$$;

create or replace function public.civicos_telemetry_stream_stats(p_stream_id text, p_hours int default 24)
returns table(
  samples bigint, min_value double precision, max_value double precision,
  avg_value double precision, median_value double precision, p95_value double precision,
  stddev_value double precision, latest_value double precision, latest_ts timestamptz,
  warn_breaches bigint, alert_breaches bigint
) language sql security definer stable set search_path = public, pg_catalog
as $$ select * from civicos.telemetry_stream_stats(p_stream_id, p_hours); $$;

revoke execute on function public.civicos_telemetry_stream_stats(text, int) from public, anon;
grant  execute on function public.civicos_telemetry_stream_stats(text, int) to authenticated;
