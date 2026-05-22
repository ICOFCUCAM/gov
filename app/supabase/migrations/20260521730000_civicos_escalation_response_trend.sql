-- 20260521730000_civicos_escalation_response_trend.sql
--
-- Phase B · operational accountability — escalation response-time trend.
--
-- escalation_response_stats publishes a current snapshot of MTTA / MTTR;
-- this publishes the trajectory. For each of the last p_weeks ISO weeks it
-- returns the count resolved and the median minutes-to-acknowledge +
-- median hours-to-resolve, bucketed by the week the escalation was RESOLVED
-- — so a duty officer can see whether incident response is getting faster
-- or slower, the escalation analogue of service_sla_trend.
--
-- Escalations are authenticated-tier (operator data); SECURITY DEFINER
-- granted to authenticated only. Aggregate-only — no reason, source actor,
-- or row-level field.

set search_path = civicos, pg_catalog;

create or replace function civicos.escalation_response_trend(
  p_charter_id text default null, p_weeks int default 12
)
returns table(
  week_start date,
  resolved bigint,
  median_ack_minutes numeric,
  median_resolve_hours numeric
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
    select triggered_at, acknowledged_at, resolved_at
    from civicos.escalations, bounded
    where resolved_at is not null
      and resolved_at >= date_trunc('week', now()) - make_interval(weeks => bounded.wks - 1)
      and (p_charter_id is null or source_charter_id = p_charter_id)
  )
  select
    date_trunc('week', w.resolved_at)::date as week_start,
    count(*)::bigint,
    round(percentile_cont(0.5) within group (
      order by extract(epoch from (w.acknowledged_at - w.triggered_at)) / 60
    ) filter (where w.acknowledged_at is not null)::numeric, 1),
    round(percentile_cont(0.5) within group (
      order by extract(epoch from (w.resolved_at - w.triggered_at)) / 3600
    )::numeric, 1)
  from win w
  group by date_trunc('week', w.resolved_at)
  order by week_start asc;
$$;

create or replace function public.civicos_escalation_response_trend(
  p_charter_id text default null, p_weeks int default 12
)
returns table(
  week_start date, resolved bigint, median_ack_minutes numeric, median_resolve_hours numeric
) language sql security definer stable set search_path = public, pg_catalog
as $$ select * from civicos.escalation_response_trend(p_charter_id, p_weeks); $$;

revoke execute on function public.civicos_escalation_response_trend(text, int) from public, anon;
grant  execute on function public.civicos_escalation_response_trend(text, int) to authenticated;
