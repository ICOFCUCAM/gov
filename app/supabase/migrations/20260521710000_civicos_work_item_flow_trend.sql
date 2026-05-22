-- 20260521710000_civicos_work_item_flow_trend.sql
--
-- Phase B · internal throughput trend.
--
-- work_item_flow_stats is a snapshot; this is the trajectory — the
-- work-item analogue of service_sla_trend. For each of the last p_weeks
-- ISO weeks (bucketed by the week an item CLOSED) it returns the count
-- closed and the median cycle time (created → closed) in hours, so a
-- supervisor can see whether a workflow is clearing work faster or slower.
--
-- Authenticated-tier (work items are operator data).

set search_path = civicos, pg_catalog;

create or replace function civicos.work_item_flow_trend(
  p_workflow_id text default null, p_charter_id text default null, p_weeks int default 12
)
returns table(
  week_start date,
  closed bigint,
  median_cycle_hours numeric
)
language sql
security definer
stable
set search_path = civicos, pg_catalog
as $$
  with bounded as (select greatest(1, least(coalesce(p_weeks, 12), 104)) as wks),
  win as (
    select created_at, closed_at
    from civicos.work_items, bounded
    where closed and closed_at is not null
      and closed_at >= date_trunc('week', now()) - make_interval(weeks => bounded.wks - 1)
      and (p_workflow_id is null or workflow_id = p_workflow_id)
      and (p_charter_id is null or originating_charter_id = p_charter_id)
  )
  select
    date_trunc('week', w.closed_at)::date as week_start,
    count(*)::bigint,
    round(percentile_cont(0.5) within group (
      order by extract(epoch from (w.closed_at - w.created_at)) / 3600
    )::numeric, 1)
  from win w
  group by date_trunc('week', w.closed_at)
  order by week_start asc;
$$;

create or replace function public.civicos_work_item_flow_trend(
  p_workflow_id text default null, p_charter_id text default null, p_weeks int default 12
)
returns table(week_start date, closed bigint, median_cycle_hours numeric)
language sql security definer stable set search_path = public, pg_catalog
as $$ select * from civicos.work_item_flow_trend(p_workflow_id, p_charter_id, p_weeks); $$;

revoke execute on function public.civicos_work_item_flow_trend(text, text, int) from public, anon;
grant  execute on function public.civicos_work_item_flow_trend(text, text, int) to authenticated;
