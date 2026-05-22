-- 20260521470000_civicos_escalation_response_stats.sql
--
-- Phase B · operational accountability — escalation response times.
--
-- Escalations carry triggered_at / acknowledged_at / resolved_at, but
-- nothing summarised how responsive each charter is to them. This RPC
-- publishes per-source-charter MTTA (median minutes to acknowledge) and
-- MTTR (median hours to resolve), plus p90s and the open backlog, over a
-- window — the incident-response analogue of service_sla_stats.
--
-- Escalations are authenticated-tier (operator data), so this is SECURITY
-- DEFINER granted to authenticated only.

set search_path = civicos, pg_catalog;

create or replace function civicos.escalation_response_stats(
  p_charter_id text default null, p_days int default 30
)
returns table(
  charter_id text,
  total bigint,
  acknowledged bigint,
  resolved bigint,
  open bigint,
  median_ack_minutes numeric,
  p90_ack_minutes numeric,
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
    select source_charter_id, triggered_at, acknowledged_at, resolved_at
    from civicos.escalations
    where triggered_at >= now() - make_interval(days => greatest(1, least(coalesce(p_days, 30), 365)))
      and (p_charter_id is null or source_charter_id = p_charter_id)
  )
  select
    w.source_charter_id,
    count(*)::bigint,
    count(w.acknowledged_at)::bigint,
    count(w.resolved_at)::bigint,
    count(*) filter (where w.resolved_at is null)::bigint,
    round(percentile_cont(0.5) within group (
      order by extract(epoch from (w.acknowledged_at - w.triggered_at)) / 60
    ) filter (where w.acknowledged_at is not null)::numeric, 1),
    round(percentile_cont(0.9) within group (
      order by extract(epoch from (w.acknowledged_at - w.triggered_at)) / 60
    ) filter (where w.acknowledged_at is not null)::numeric, 1),
    round(percentile_cont(0.5) within group (
      order by extract(epoch from (w.resolved_at - w.triggered_at)) / 3600
    ) filter (where w.resolved_at is not null)::numeric, 1),
    round(percentile_cont(0.9) within group (
      order by extract(epoch from (w.resolved_at - w.triggered_at)) / 3600
    ) filter (where w.resolved_at is not null)::numeric, 1),
    round(max(extract(epoch from (now() - w.triggered_at)) / 3600)
      filter (where w.resolved_at is null)::numeric, 1)
  from win w
  group by w.source_charter_id
  order by count(*) filter (where w.resolved_at is null) desc, count(*) desc;
$$;

create or replace function public.civicos_escalation_response_stats(
  p_charter_id text default null, p_days int default 30
)
returns table(
  charter_id text, total bigint, acknowledged bigint, resolved bigint, open bigint,
  median_ack_minutes numeric, p90_ack_minutes numeric,
  median_resolve_hours numeric, p90_resolve_hours numeric, oldest_open_hours numeric
) language sql security definer stable set search_path = public, pg_catalog
as $$ select * from civicos.escalation_response_stats(p_charter_id, p_days); $$;

revoke execute on function public.civicos_escalation_response_stats(text, int) from public, anon;
grant  execute on function public.civicos_escalation_response_stats(text, int) to authenticated;
