-- 20260521410000_civicos_appeals_stats.sql
--
-- Phase 1 transparency · publish contestation (appeals) statistics.
--
-- Sibling to service_sla_stats, for the contestation path. The roadmap
-- treats reachable, accountable contestation as a Phase 1 concern; this
-- publishes how the appeals pipeline actually performs per originating
-- charter: how many appeals are filed, how many reach a decision, how long
-- that takes (median + p90 days), and how stale the oldest undecided one
-- is.
--
-- Counts use timestamp presence (admitted_at / decided_at / published_at)
-- rather than the status text, so the figures are robust regardless of
-- status vocabulary. Anon-callable (Public Observatory) and aggregate-only
-- — no citizen id, ref, ground, or reasoning — so nothing personal leaks.

set search_path = civicos, pg_catalog;

create or replace function civicos.appeals_stats(
  p_charter_id text default null, p_days int default 90
)
returns table(
  charter_id text,
  filed bigint,
  admitted bigint,
  decided bigint,
  published bigint,
  pending bigint,
  median_decision_days numeric,
  p90_decision_days numeric,
  oldest_pending_days numeric
)
language sql
security definer
stable
set search_path = civicos, pg_catalog
as $$
  with win as (
    select originating_charter_id, filed_at, admitted_at, decided_at, published_at
    from civicos.appeals
    where filed_at >= now() - make_interval(days => greatest(1, least(coalesce(p_days, 90), 365)))
      and (p_charter_id is null or originating_charter_id = p_charter_id)
  )
  select
    w.originating_charter_id,
    count(*)::bigint,
    count(w.admitted_at)::bigint,
    count(w.decided_at)::bigint,
    count(w.published_at)::bigint,
    count(*) filter (where w.decided_at is null)::bigint,
    round(percentile_cont(0.5) within group (
      order by extract(epoch from (w.decided_at - w.filed_at)) / 86400
    ) filter (where w.decided_at is not null)::numeric, 1),
    round(percentile_cont(0.9) within group (
      order by extract(epoch from (w.decided_at - w.filed_at)) / 86400
    ) filter (where w.decided_at is not null)::numeric, 1),
    round(max(extract(epoch from (now() - w.filed_at)) / 86400)
      filter (where w.decided_at is null)::numeric, 1)
  from win w
  group by w.originating_charter_id
  order by count(*) desc;
$$;

create or replace function public.civicos_appeals_stats(
  p_charter_id text default null, p_days int default 90
)
returns table(
  charter_id text, filed bigint, admitted bigint, decided bigint, published bigint,
  pending bigint, median_decision_days numeric, p90_decision_days numeric, oldest_pending_days numeric
) language sql security definer stable set search_path = public, pg_catalog
as $$ select * from civicos.appeals_stats(p_charter_id, p_days); $$;

revoke execute on function public.civicos_appeals_stats(text, int) from public;
grant  execute on function public.civicos_appeals_stats(text, int) to anon, authenticated;
