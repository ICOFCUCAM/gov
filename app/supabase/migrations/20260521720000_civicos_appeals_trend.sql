-- 20260521720000_civicos_appeals_trend.sql
--
-- Phase 1 transparency · contestation (appeals) decision-time trend.
--
-- appeals_stats publishes a current snapshot; this publishes the trajectory.
-- For each of the last p_weeks ISO weeks it returns the count decided and the
-- median + p90 days-to-decision, bucketed by the week the appeal was DECIDED
-- — the contestation analogue of service_sla_trend, so a reader can see
-- whether decision times on appeals are improving or sliding, not just where
-- they stand today.
--
-- Anon-callable (Public Observatory), aggregate-only — no citizen id, ref,
-- ground, or reasoning. Charters are institutions, not people.

set search_path = civicos, pg_catalog;

create or replace function civicos.appeals_trend(
  p_charter_id text default null, p_weeks int default 12
)
returns table(
  week_start date,
  decided bigint,
  median_decision_days numeric,
  p90_decision_days numeric
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
    select filed_at, decided_at
    from civicos.appeals, bounded
    where decided_at is not null
      and decided_at >= date_trunc('week', now()) - make_interval(weeks => bounded.wks - 1)
      and (p_charter_id is null or originating_charter_id = p_charter_id)
  )
  select
    date_trunc('week', w.decided_at)::date as week_start,
    count(*)::bigint,
    round(percentile_cont(0.5) within group (
      order by extract(epoch from (w.decided_at - w.filed_at)) / 86400
    )::numeric, 1),
    round(percentile_cont(0.9) within group (
      order by extract(epoch from (w.decided_at - w.filed_at)) / 86400
    )::numeric, 1)
  from win w
  group by date_trunc('week', w.decided_at)
  order by week_start asc;
$$;

create or replace function public.civicos_appeals_trend(
  p_charter_id text default null, p_weeks int default 12
)
returns table(
  week_start date, decided bigint, median_decision_days numeric, p90_decision_days numeric
) language sql security definer stable set search_path = public, pg_catalog
as $$ select * from civicos.appeals_trend(p_charter_id, p_weeks); $$;

revoke execute on function public.civicos_appeals_trend(text, int) from public;
grant  execute on function public.civicos_appeals_trend(text, int) to anon, authenticated;
