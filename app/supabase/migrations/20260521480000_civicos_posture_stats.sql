-- 20260521480000_civicos_posture_stats.sql
--
-- Phase B · operational accountability — posture stats.
--
-- posture_history records readiness/stress snapshots per charter, plotted
-- raw on the posture timeline. This RPC summarises the window per charter:
-- the latest posture + readiness/stress, and the average / extreme
-- readiness and stress — so an operator can see which charters are under
-- sustained stress rather than reading every snapshot. Ordered by current
-- stress, worst first.
--
-- Authenticated-tier (posture is operator data).

set search_path = civicos, pg_catalog;

create or replace function civicos.posture_stats(
  p_charter_id text default null, p_days int default 30
)
returns table(
  charter_id text,
  snapshots bigint,
  latest_posture civicos.posture,
  latest_readiness int,
  latest_stress int,
  latest_at timestamptz,
  avg_readiness numeric,
  avg_stress numeric,
  max_stress int,
  min_readiness int
)
language sql
security definer
stable
set search_path = civicos, pg_catalog
as $$
  with win as (
    select charter_id, posture, readiness, stress, snapshot_at
    from civicos.posture_history
    where snapshot_at >= now() - make_interval(days => greatest(1, least(coalesce(p_days, 30), 365)))
      and (p_charter_id is null or charter_id = p_charter_id)
  ),
  agg as (
    select charter_id,
      count(*) as snapshots,
      round(avg(readiness)::numeric, 1) as avg_readiness,
      round(avg(stress)::numeric, 1) as avg_stress,
      max(stress) as max_stress,
      min(readiness) as min_readiness
    from win group by charter_id
  )
  select
    a.charter_id, a.snapshots,
    l.posture, l.readiness, l.stress, l.snapshot_at,
    a.avg_readiness, a.avg_stress, a.max_stress, a.min_readiness
  from agg a
  cross join lateral (
    select posture, readiness, stress, snapshot_at
    from win w where w.charter_id = a.charter_id
    order by w.snapshot_at desc limit 1
  ) l
  order by l.stress desc nulls last, a.charter_id;
$$;

create or replace function public.civicos_posture_stats(
  p_charter_id text default null, p_days int default 30
)
returns table(
  charter_id text, snapshots bigint, latest_posture civicos.posture,
  latest_readiness int, latest_stress int, latest_at timestamptz,
  avg_readiness numeric, avg_stress numeric, max_stress int, min_readiness int
) language sql security definer stable set search_path = public, pg_catalog
as $$ select * from civicos.posture_stats(p_charter_id, p_days); $$;

revoke execute on function public.civicos_posture_stats(text, int) from public, anon;
grant  execute on function public.civicos_posture_stats(text, int) to authenticated;
