-- 20260521800000_civicos_directive_stats.sql
--
-- Phase 1 transparency · directive (governance output) statistics.
--
-- Directives are each charter's binding output. service_sla_stats covers
-- service delivery and appeals_stats covers contestation; nothing summarised
-- how much each charter actually legislates/decrees and how it ages. This
-- aggregates, per issuing charter over a window (by signed date — a directive
-- becomes public record once signed): how many were signed, how many reached
-- effect, how many are currently in force, how many have been rescinded, and
-- the median signed→effective lag in days.
--
-- Counts a directive only once it is SIGNED, so drafts never leak. Anon-
-- callable (Public Observatory), aggregate-only — no payload or row.

set search_path = civicos, pg_catalog;

create or replace function civicos.directive_stats(
  p_charter_id text default null, p_days int default 365
)
returns table(
  charter_id text,
  signed bigint,
  effective bigint,
  in_force bigint,
  rescinded bigint,
  median_sign_to_effective_days numeric
)
language sql
security definer
stable
set search_path = civicos, pg_catalog
as $$
  with win as (
    select issued_by_charter_id, signed_at, effective_at, rescinded_at
    from civicos.directives
    where signed_at is not null
      and signed_at >= now() - make_interval(days => greatest(1, least(coalesce(p_days, 365), 1825)))
      and (p_charter_id is null or issued_by_charter_id = p_charter_id)
  )
  select
    w.issued_by_charter_id,
    count(*)::bigint,
    count(w.effective_at)::bigint,
    count(*) filter (
      where w.effective_at is not null and w.effective_at <= now() and w.rescinded_at is null
    )::bigint,
    count(w.rescinded_at)::bigint,
    round(percentile_cont(0.5) within group (
      order by extract(epoch from (w.effective_at - w.signed_at)) / 86400
    ) filter (where w.effective_at is not null)::numeric, 1)
  from win w
  group by w.issued_by_charter_id
  order by count(*) desc;
$$;

create or replace function public.civicos_directive_stats(
  p_charter_id text default null, p_days int default 365
)
returns table(
  charter_id text, signed bigint, effective bigint, in_force bigint, rescinded bigint,
  median_sign_to_effective_days numeric
) language sql security definer stable set search_path = public, pg_catalog
as $$ select * from civicos.directive_stats(p_charter_id, p_days); $$;

revoke execute on function public.civicos_directive_stats(text, int) from public;
grant  execute on function public.civicos_directive_stats(text, int) to anon, authenticated;
