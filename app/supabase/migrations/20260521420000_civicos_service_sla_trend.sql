-- 20260521420000_civicos_service_sla_trend.sql
--
-- Phase 1 transparency · service-delivery SLA trend over time.
--
-- service_sla_stats publishes a current snapshot; this publishes the
-- trajectory. For each of the last p_weeks ISO weeks it returns the count
-- resolved and the median + p90 turnaround hours, bucketed by the week the
-- request was RESOLVED — so a reader can see whether decision times are
-- improving or sliding, not just where they stand today.
--
-- Anon-callable (Public Observatory), aggregate-only — no citizen id, ref,
-- or row-level field. Charters are institutions, not people.

set search_path = civicos, pg_catalog;

create or replace function civicos.service_sla_trend(
  p_charter_id text default null, p_weeks int default 12
)
returns table(
  week_start date,
  resolved bigint,
  median_resolve_hours numeric,
  p90_resolve_hours numeric
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
    select submitted_at, resolved_at
    from civicos.service_requests, bounded
    where resolved_at is not null
      and resolved_at >= date_trunc('week', now()) - make_interval(weeks => bounded.wks - 1)
      and (p_charter_id is null or target_charter_id = p_charter_id)
  )
  select
    date_trunc('week', w.resolved_at)::date as week_start,
    count(*)::bigint,
    round(percentile_cont(0.5) within group (
      order by extract(epoch from (w.resolved_at - w.submitted_at)) / 3600
    )::numeric, 1),
    round(percentile_cont(0.9) within group (
      order by extract(epoch from (w.resolved_at - w.submitted_at)) / 3600
    )::numeric, 1)
  from win w
  group by date_trunc('week', w.resolved_at)
  order by week_start asc;
$$;

create or replace function public.civicos_service_sla_trend(
  p_charter_id text default null, p_weeks int default 12
)
returns table(
  week_start date, resolved bigint, median_resolve_hours numeric, p90_resolve_hours numeric
) language sql security definer stable set search_path = public, pg_catalog
as $$ select * from civicos.service_sla_trend(p_charter_id, p_weeks); $$;

revoke execute on function public.civicos_service_sla_trend(text, int) from public;
grant  execute on function public.civicos_service_sla_trend(text, int) to anon, authenticated;
