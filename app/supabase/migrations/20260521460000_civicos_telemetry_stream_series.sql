-- 20260521460000_civicos_telemetry_stream_series.sql
--
-- Phase B · telemetry observability — downsampled time series.
--
-- The stream detail charts raw samples, which is fine for the last few
-- hundred points but can't show a 7- or 30-day window without pulling
-- thousands of rows. This RPC downsamples a stream into at most p_buckets
-- evenly-spaced time buckets over the window, returning avg/min/max and
-- the sample count per bucket — enough to draw a faithful trend line plus
-- a min/max band, at a bounded payload size.
--
-- Authenticated-tier (sample values aren't public).

set search_path = civicos, pg_catalog;

create or replace function civicos.telemetry_stream_series(
  p_stream_id text, p_hours int default 168, p_buckets int default 96
)
returns table(
  bucket_ts timestamptz,
  avg_value double precision,
  min_value double precision,
  max_value double precision,
  samples bigint
)
language sql
security definer
stable
set search_path = civicos, pg_catalog
as $$
  with bounds as (
    select
      greatest(1, least(coalesce(p_hours, 168), 8760)) as hours,
      greatest(2, least(coalesce(p_buckets, 96), 500)) as buckets
  ),
  params as (
    select hours, buckets,
      (hours * 3600.0) / buckets as bucket_secs,
      now() - make_interval(hours => hours) as start_ts
    from bounds
  ),
  win as (
    select s.value,
      to_timestamp(
        floor(extract(epoch from s.ts) / (select bucket_secs from params))
        * (select bucket_secs from params)
      ) as bucket_ts
    from civicos.telemetry_samples s, params
    where s.stream_id = p_stream_id
      and s.ts >= (select start_ts from params)
  )
  select
    w.bucket_ts,
    round(avg(w.value)::numeric, 4)::double precision,
    min(w.value),
    max(w.value),
    count(*)::bigint
  from win w
  group by w.bucket_ts
  order by w.bucket_ts asc;
$$;

create or replace function public.civicos_telemetry_stream_series(
  p_stream_id text, p_hours int default 168, p_buckets int default 96
)
returns table(
  bucket_ts timestamptz, avg_value double precision, min_value double precision,
  max_value double precision, samples bigint
) language sql security definer stable set search_path = public, pg_catalog
as $$ select * from civicos.telemetry_stream_series(p_stream_id, p_hours, p_buckets); $$;

revoke execute on function public.civicos_telemetry_stream_series(text, int, int) from public, anon;
grant  execute on function public.civicos_telemetry_stream_series(text, int, int) to authenticated;
