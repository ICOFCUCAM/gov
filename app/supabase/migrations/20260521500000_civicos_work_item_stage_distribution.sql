-- 20260521500000_civicos_work_item_stage_distribution.sql
--
-- Phase B · internal throughput — stage bottleneck distribution.
--
-- Flow stats show how long a workflow takes end-to-end; this shows WHERE
-- the open items are sitting right now. For one workflow it returns the
-- count of still-open items in each current_stage plus the oldest such
-- item's age and the median age in that stage — so a stage that is
-- accumulating a backlog (the bottleneck) is obvious at a glance.
--
-- Authenticated-tier (work items are operator data).

set search_path = civicos, pg_catalog;

create or replace function civicos.work_item_stage_distribution(p_workflow_id text)
returns table(
  stage text,
  open_items bigint,
  oldest_hours numeric,
  median_age_hours numeric
)
language sql
security definer
stable
set search_path = civicos, pg_catalog
as $$
  select
    w.current_stage,
    count(*)::bigint,
    round(max(extract(epoch from (now() - w.updated_at)) / 3600)::numeric, 1),
    round(percentile_cont(0.5) within group (
      order by extract(epoch from (now() - w.updated_at)) / 3600
    )::numeric, 1)
  from civicos.work_items w
  where w.workflow_id = p_workflow_id and not w.closed
  group by w.current_stage
  order by count(*) desc, max(w.updated_at) asc;
$$;

create or replace function public.civicos_work_item_stage_distribution(p_workflow_id text)
returns table(
  stage text, open_items bigint, oldest_hours numeric, median_age_hours numeric
) language sql security definer stable set search_path = public, pg_catalog
as $$ select * from civicos.work_item_stage_distribution(p_workflow_id); $$;

revoke execute on function public.civicos_work_item_stage_distribution(text) from public, anon;
grant  execute on function public.civicos_work_item_stage_distribution(text) to authenticated;
