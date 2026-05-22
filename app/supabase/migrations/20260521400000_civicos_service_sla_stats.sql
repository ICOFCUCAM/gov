-- 20260521400000_civicos_service_sla_stats.sql
--
-- Phase 1 metric · publish service-delivery SLAs.
--
-- The roadmap's Phase 1 success metric calls for "permit median decision
-- time published". The substrate has the timing (service_requests carries
-- submitted_at / acknowledged_at / resolved_at) but nothing computed or
-- exposed it publicly.
--
-- This RPC returns per-charter AGGREGATE service stats over a window:
-- volume, acknowledgement/resolution counts, median + p90 turnaround, and
-- the oldest still-open request's age. It is deliberately anon-callable
-- (Public Observatory): it is SECURITY DEFINER to read across RLS, but it
-- only ever returns charter-level aggregates — never a citizen identifier,
-- request ref, or any row-level field — so there is nothing personal to
-- leak. Charters are institutions, not people; publishing how fast a
-- ministry decides is exactly the accountability this is for.

set search_path = civicos, pg_catalog;

create or replace function civicos.service_sla_stats(
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
  oldest_open_hours numeric
)
language sql
security definer
stable
set search_path = civicos, pg_catalog
as $$
  with win as (
    select target_charter_id, submitted_at, acknowledged_at, resolved_at
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
      filter (where w.resolved_at is null)::numeric, 1)
  from win w
  group by w.target_charter_id
  order by count(*) desc;
$$;

create or replace function public.civicos_service_sla_stats(
  p_charter_id text default null, p_days int default 30
)
returns table(
  charter_id text, submitted bigint, acknowledged bigint, resolved bigint, open bigint,
  median_ack_hours numeric, median_resolve_hours numeric, p90_resolve_hours numeric,
  oldest_open_hours numeric
) language sql security definer stable set search_path = public, pg_catalog
as $$ select * from civicos.service_sla_stats(p_charter_id, p_days); $$;

-- Public-observatory read: aggregate-only, intentionally anon-callable.
revoke execute on function public.civicos_service_sla_stats(text, int) from public;
grant  execute on function public.civicos_service_sla_stats(text, int) to anon, authenticated;
