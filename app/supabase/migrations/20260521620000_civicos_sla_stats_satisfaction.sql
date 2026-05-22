-- 20260521620000_civicos_sla_stats_satisfaction.sql
--
-- Phase 1 transparency · publish citizen satisfaction with service.
--
-- rate_my_service_request now lets citizens score resolved requests 1–5.
-- Satisfaction is a service-delivery KPI, so it belongs in service_sla_stats
-- alongside turnaround — not in a separate RPC. This extends the aggregate
-- with `rated` (count of resolved requests that carry a score) and
-- `avg_satisfaction` (mean score, 1 dp). Still aggregate-only and
-- anon-callable; charter-level means reveal nothing personal.
--
-- Changing the OUT columns requires a drop + recreate of both the civicos
-- and public functions.

set search_path = civicos, pg_catalog;

drop function if exists civicos.service_sla_stats(text, int);
create function civicos.service_sla_stats(
  p_charter_id text default null, p_days int default 30
)
returns table(
  charter_id text,
  submitted bigint,
  acknowledged bigint,
  resolved bigint,
  open bigint,
  median_ack_hours numeric,
  median_resolve_hours numeric,
  p90_resolve_hours numeric,
  oldest_open_hours numeric,
  rated bigint,
  avg_satisfaction numeric
)
language sql
security definer
stable
set search_path = civicos, pg_catalog
as $$
  with win as (
    select target_charter_id, submitted_at, acknowledged_at, resolved_at, satisfaction
    from civicos.service_requests
    where submitted_at >= now() - make_interval(days => greatest(1, least(coalesce(p_days, 30), 365)))
      and (p_charter_id is null or target_charter_id = p_charter_id)
  )
  select
    w.target_charter_id,
    count(*)::bigint,
    count(w.acknowledged_at)::bigint,
    count(w.resolved_at)::bigint,
    count(*) filter (where w.resolved_at is null)::bigint,
    round(percentile_cont(0.5) within group (
      order by extract(epoch from (w.acknowledged_at - w.submitted_at)) / 3600
    ) filter (where w.acknowledged_at is not null)::numeric, 1),
    round(percentile_cont(0.5) within group (
      order by extract(epoch from (w.resolved_at - w.submitted_at)) / 3600
    ) filter (where w.resolved_at is not null)::numeric, 1),
    round(percentile_cont(0.9) within group (
      order by extract(epoch from (w.resolved_at - w.submitted_at)) / 3600
    ) filter (where w.resolved_at is not null)::numeric, 1),
    round(max(extract(epoch from (now() - w.submitted_at)) / 3600)
      filter (where w.resolved_at is null)::numeric, 1),
    count(*) filter (where w.satisfaction is not null)::bigint,
    round(avg(w.satisfaction) filter (where w.satisfaction is not null)::numeric, 1)
  from win w
  group by w.target_charter_id
  order by count(*) desc;
$$;

drop function if exists public.civicos_service_sla_stats(text, int);
create function public.civicos_service_sla_stats(
  p_charter_id text default null, p_days int default 30
)
returns table(
  charter_id text, submitted bigint, acknowledged bigint, resolved bigint, open bigint,
  median_ack_hours numeric, median_resolve_hours numeric, p90_resolve_hours numeric,
  oldest_open_hours numeric, rated bigint, avg_satisfaction numeric
) language sql security definer stable set search_path = public, pg_catalog
as $$ select * from civicos.service_sla_stats(p_charter_id, p_days); $$;

revoke execute on function public.civicos_service_sla_stats(text, int) from public;
grant  execute on function public.civicos_service_sla_stats(text, int) to anon, authenticated;
