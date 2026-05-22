-- 20260521530000_civicos_dispatch_response_stats.sql
--
-- Phase B · command-and-control accountability — dispatch response stats.
--
-- Dispatches carry a four-point lifecycle (dispatched → acknowledged →
-- on_scene → closed) but nothing summarised how quickly each issuing
-- charter's dispatches are answered. This RPC publishes, per issuing
-- charter over a window: volume, acknowledged / on-scene / closed counts,
-- the open backlog, median time-to-acknowledge (minutes), median
-- time-to-on-scene (minutes), median time-to-close (hours), and the oldest
-- still-open dispatch age. The emergency-response analogue of the
-- escalation and SLA stats.
--
-- Authenticated-tier (dispatches are operator data).

set search_path = civicos, pg_catalog;

create or replace function civicos.dispatch_response_stats(
  p_charter_id text default null, p_days int default 30
)
returns table(
  charter_id text,
  total bigint,
  acknowledged bigint,
  on_scene bigint,
  closed bigint,
  open bigint,
  median_ack_minutes numeric,
  median_on_scene_minutes numeric,
  median_close_hours numeric,
  oldest_open_hours numeric
)
language sql
security definer
stable
set search_path = civicos, pg_catalog
as $$
  with win as (
    select issued_by_charter_id, dispatched_at, acknowledged_at, on_scene_at, closed_at
    from civicos.dispatches
    where dispatched_at >= now() - make_interval(days => greatest(1, least(coalesce(p_days, 30), 365)))
      and (p_charter_id is null or issued_by_charter_id = p_charter_id)
  )
  select
    w.issued_by_charter_id,
    count(*)::bigint,
    count(w.acknowledged_at)::bigint,
    count(w.on_scene_at)::bigint,
    count(w.closed_at)::bigint,
    count(*) filter (where w.closed_at is null)::bigint,
    round(percentile_cont(0.5) within group (
      order by extract(epoch from (w.acknowledged_at - w.dispatched_at)) / 60
    ) filter (where w.acknowledged_at is not null)::numeric, 1),
    round(percentile_cont(0.5) within group (
      order by extract(epoch from (w.on_scene_at - w.dispatched_at)) / 60
    ) filter (where w.on_scene_at is not null)::numeric, 1),
    round(percentile_cont(0.5) within group (
      order by extract(epoch from (w.closed_at - w.dispatched_at)) / 3600
    ) filter (where w.closed_at is not null)::numeric, 1),
    round(max(extract(epoch from (now() - w.dispatched_at)) / 3600)
      filter (where w.closed_at is null)::numeric, 1)
  from win w
  group by w.issued_by_charter_id
  order by count(*) filter (where w.closed_at is null) desc, count(*) desc;
$$;

create or replace function public.civicos_dispatch_response_stats(
  p_charter_id text default null, p_days int default 30
)
returns table(
  charter_id text, total bigint, acknowledged bigint, on_scene bigint, closed bigint, open bigint,
  median_ack_minutes numeric, median_on_scene_minutes numeric, median_close_hours numeric,
  oldest_open_hours numeric
) language sql security definer stable set search_path = public, pg_catalog
as $$ select * from civicos.dispatch_response_stats(p_charter_id, p_days); $$;

revoke execute on function public.civicos_dispatch_response_stats(text, int) from public, anon;
grant  execute on function public.civicos_dispatch_response_stats(text, int) to authenticated;
