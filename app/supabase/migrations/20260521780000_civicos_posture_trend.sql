-- 20260521780000_civicos_posture_trend.sql
--
-- Phase B · operational accountability — posture trend.
--
-- posture_stats publishes a current snapshot (latest + window averages);
-- this publishes the trajectory. For each of the last p_weeks ISO weeks it
-- returns the snapshot count and the average readiness / average + peak
-- stress, bucketed by the week the snapshot was taken — so command can see
-- whether a charter's stress is climbing or easing over time, the posture
-- analogue of the response-time trends.
--
-- Authenticated-tier (posture is operator data); SECURITY DEFINER granted
-- to authenticated only. Aggregate-only.

set search_path = civicos, pg_catalog;

create or replace function civicos.posture_trend(
  p_charter_id text default null, p_weeks int default 12
)
returns table(
  week_start date,
  snapshots bigint,
  avg_readiness numeric,
  avg_stress numeric,
  max_stress int
)
language sql
security definer
stable
set search_path = civicos, pg_catalog
as $$
  with bounded as (
    select greatest(1, least(coalesce(p_weeks, 12), 104)) as wks
  ),
  win as (
    select readiness, stress, snapshot_at
    from civicos.posture_history, bounded
    where snapshot_at >= date_trunc('week', now()) - make_interval(weeks => bounded.wks - 1)
      and (p_charter_id is null or charter_id = p_charter_id)
  )
  select
    date_trunc('week', w.snapshot_at)::date as week_start,
    count(*)::bigint,
    round(avg(w.readiness)::numeric, 1),
    round(avg(w.stress)::numeric, 1),
    max(w.stress)
  from win w
  group by date_trunc('week', w.snapshot_at)
  order by week_start asc;
$$;

create or replace function public.civicos_posture_trend(
  p_charter_id text default null, p_weeks int default 12
)
returns table(
  week_start date, snapshots bigint, avg_readiness numeric, avg_stress numeric, max_stress int
) language sql security definer stable set search_path = public, pg_catalog
as $$ select * from civicos.posture_trend(p_charter_id, p_weeks); $$;

revoke execute on function public.civicos_posture_trend(text, int) from public, anon;
grant  execute on function public.civicos_posture_trend(text, int) to authenticated;
