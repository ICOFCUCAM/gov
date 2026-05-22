-- 20260521510000_civicos_officer_workload.sql
--
-- Phase B · internal throughput — officer workload.
--
-- Flow + stage stats describe the work; this describes who is carrying it.
-- For each assignee with at least one open work item (optionally scoped to
-- a charter) it returns the open count, how many are urgent/critical, the
-- oldest open item's age, and the median open age — so a supervisor can
-- see who is overloaded or sitting on stale items, and rebalance.
--
-- Unassigned open items are bucketed under a null assignee so the backlog
-- nobody owns is visible too. Authenticated-tier (work items are operator
-- data).

set search_path = civicos, pg_catalog;

create or replace function civicos.officer_workload(p_charter_id text default null)
returns table(
  assignee_id uuid,
  assignee_name text,
  open_items bigint,
  high_priority bigint,
  oldest_open_hours numeric,
  median_open_hours numeric
)
language sql
security definer
stable
set search_path = civicos, pg_catalog
as $$
  select
    w.assignee_id,
    coalesce(max(w.assignee_name), '(unassigned)'),
    count(*)::bigint,
    count(*) filter (where w.priority in ('urgent', 'critical'))::bigint,
    round(max(extract(epoch from (now() - w.created_at)) / 3600)::numeric, 1),
    round(percentile_cont(0.5) within group (
      order by extract(epoch from (now() - w.created_at)) / 3600
    )::numeric, 1)
  from civicos.work_items w
  where not w.closed
    and (p_charter_id is null or w.originating_charter_id = p_charter_id)
  group by w.assignee_id
  order by count(*) filter (where w.priority in ('urgent', 'critical')) desc, count(*) desc;
$$;

create or replace function public.civicos_officer_workload(p_charter_id text default null)
returns table(
  assignee_id uuid, assignee_name text, open_items bigint, high_priority bigint,
  oldest_open_hours numeric, median_open_hours numeric
) language sql security definer stable set search_path = public, pg_catalog
as $$ select * from civicos.officer_workload(p_charter_id); $$;

revoke execute on function public.civicos_officer_workload(text) from public, anon;
grant  execute on function public.civicos_officer_workload(text) to authenticated;
