-- 20260521490000_civicos_work_item_flow_stats.sql
--
-- Phase B · internal throughput — work-item flow stats.
--
-- Service-request SLAs measure the citizen-facing clock; this measures the
-- internal one. Per workflow (optionally scoped to an originating charter),
-- over a window: items opened, closed, still open, median + p90 cycle time
-- (created → closed) in hours, and the oldest open item's age. So an
-- operator can see which workflows clear quickly and which accumulate a
-- backlog.
--
-- Authenticated-tier (work items are operator data). SECURITY DEFINER
-- granted to authenticated only.

set search_path = civicos, pg_catalog;

create or replace function civicos.work_item_flow_stats(
  p_workflow_id text default null, p_charter_id text default null, p_days int default 30
)
returns table(
  workflow_id text,
  opened bigint,
  closed bigint,
  open bigint,
  median_cycle_hours numeric,
  p90_cycle_hours numeric,
  oldest_open_hours numeric
)
language sql
security definer
stable
set search_path = civicos, pg_catalog
as $$
  with win as (
    select workflow_id, created_at, closed, closed_at
    from civicos.work_items
    where created_at >= now() - make_interval(days => greatest(1, least(coalesce(p_days, 30), 365)))
      and (p_workflow_id is null or workflow_id = p_workflow_id)
      and (p_charter_id is null or originating_charter_id = p_charter_id)
  )
  select
    w.workflow_id,
    count(*)::bigint,
    count(*) filter (where w.closed)::bigint,
    count(*) filter (where not w.closed)::bigint,
    round(percentile_cont(0.5) within group (
      order by extract(epoch from (w.closed_at - w.created_at)) / 3600
    ) filter (where w.closed and w.closed_at is not null)::numeric, 1),
    round(percentile_cont(0.9) within group (
      order by extract(epoch from (w.closed_at - w.created_at)) / 3600
    ) filter (where w.closed and w.closed_at is not null)::numeric, 1),
    round(max(extract(epoch from (now() - w.created_at)) / 3600)
      filter (where not w.closed)::numeric, 1)
  from win w
  group by w.workflow_id
  order by count(*) filter (where not w.closed) desc, count(*) desc;
$$;

create or replace function public.civicos_work_item_flow_stats(
  p_workflow_id text default null, p_charter_id text default null, p_days int default 30
)
returns table(
  workflow_id text, opened bigint, closed bigint, open bigint,
  median_cycle_hours numeric, p90_cycle_hours numeric, oldest_open_hours numeric
) language sql security definer stable set search_path = public, pg_catalog
as $$ select * from civicos.work_item_flow_stats(p_workflow_id, p_charter_id, p_days); $$;

revoke execute on function public.civicos_work_item_flow_stats(text, text, int) from public, anon;
grant  execute on function public.civicos_work_item_flow_stats(text, text, int) to authenticated;
