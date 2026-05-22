-- 20260521740000_civicos_dispatch_response_trend.sql
--
-- Phase B · command-and-control accountability — dispatch response trend.
--
-- dispatch_response_stats publishes a current snapshot of the dispatch
-- lifecycle medians; this publishes the trajectory. For each of the last
-- p_weeks ISO weeks it returns the count closed and the median minutes-to-
-- acknowledge, minutes-to-on-scene, and hours-to-close, bucketed by the
-- week the dispatch was CLOSED — so a duty officer can see whether
-- emergency response is getting faster or slower, the dispatch analogue of
-- escalation_response_trend.
--
-- Authenticated-tier (dispatches are operator data); SECURITY DEFINER
-- granted to authenticated only. Aggregate-only — no ref, unit, or
-- row-level field.

set search_path = civicos, pg_catalog;

create or replace function civicos.dispatch_response_trend(
  p_charter_id text default null, p_weeks int default 12
)
returns table(
  week_start date,
  closed bigint,
  median_ack_minutes numeric,
  median_on_scene_minutes numeric,
  median_close_hours numeric
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
    select dispatched_at, acknowledged_at, on_scene_at, closed_at
    from civicos.dispatches, bounded
    where closed_at is not null
      and closed_at >= date_trunc('week', now()) - make_interval(weeks => bounded.wks - 1)
      and (p_charter_id is null or issued_by_charter_id = p_charter_id)
  )
  select
    date_trunc('week', w.closed_at)::date as week_start,
    count(*)::bigint,
    round(percentile_cont(0.5) within group (
      order by extract(epoch from (w.acknowledged_at - w.dispatched_at)) / 60
    ) filter (where w.acknowledged_at is not null)::numeric, 1),
    round(percentile_cont(0.5) within group (
      order by extract(epoch from (w.on_scene_at - w.dispatched_at)) / 60
    ) filter (where w.on_scene_at is not null)::numeric, 1),
    round(percentile_cont(0.5) within group (
      order by extract(epoch from (w.closed_at - w.dispatched_at)) / 3600
    )::numeric, 1)
  from win w
  group by date_trunc('week', w.closed_at)
  order by week_start asc;
$$;

create or replace function public.civicos_dispatch_response_trend(
  p_charter_id text default null, p_weeks int default 12
)
returns table(
  week_start date, closed bigint, median_ack_minutes numeric,
  median_on_scene_minutes numeric, median_close_hours numeric
) language sql security definer stable set search_path = public, pg_catalog
as $$ select * from civicos.dispatch_response_trend(p_charter_id, p_weeks); $$;

revoke execute on function public.civicos_dispatch_response_trend(text, int) from public, anon;
grant  execute on function public.civicos_dispatch_response_trend(text, int) to authenticated;
