-- 20260521810000_civicos_directive_trend.sql
--
-- Phase 1 transparency · directive (governance output) trend.
--
-- directive_stats publishes a current snapshot of governance output; this
-- publishes the trajectory. For each of the last p_weeks ISO weeks it returns
-- how many directives were SIGNED that week, how many of them have since
-- become effective, and the median signed→effective lag in days — bucketed
-- by the week the directive was signed, so a reader can see whether a
-- charter's legislative cadence is rising or falling.
--
-- Counts a directive only once signed (drafts never leak). Anon-callable
-- (Public Observatory / charter profile), aggregate-only.

set search_path = civicos, pg_catalog;

create or replace function civicos.directive_trend(
  p_charter_id text default null, p_weeks int default 12
)
returns table(
  week_start date,
  signed bigint,
  effective bigint,
  median_sign_to_effective_days numeric
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
    select signed_at, effective_at
    from civicos.directives, bounded
    where signed_at is not null
      and signed_at >= date_trunc('week', now()) - make_interval(weeks => bounded.wks - 1)
      and (p_charter_id is null or issued_by_charter_id = p_charter_id)
  )
  select
    date_trunc('week', w.signed_at)::date as week_start,
    count(*)::bigint,
    count(w.effective_at)::bigint,
    round(percentile_cont(0.5) within group (
      order by extract(epoch from (w.effective_at - w.signed_at)) / 86400
    ) filter (where w.effective_at is not null)::numeric, 1)
  from win w
  group by date_trunc('week', w.signed_at)
  order by week_start asc;
$$;

create or replace function public.civicos_directive_trend(
  p_charter_id text default null, p_weeks int default 12
)
returns table(
  week_start date, signed bigint, effective bigint, median_sign_to_effective_days numeric
) language sql security definer stable set search_path = public, pg_catalog
as $$ select * from civicos.directive_trend(p_charter_id, p_weeks); $$;

revoke execute on function public.civicos_directive_trend(text, int) from public;
grant  execute on function public.civicos_directive_trend(text, int) to anon, authenticated;
