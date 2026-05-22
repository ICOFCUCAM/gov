-- 20260521370000_civicos_webhooks_health.sql
--
-- Phase B · federation webhook fleet health summary.
--
-- The listing RPC gives per-hook detail, but an operator watching a large
-- fleet wants the at-a-glance roll-up: how many hooks exist, how many are
-- live, how many a human paused, how many the circuit breaker tripped, and
-- the cumulative delivered / failure totals. This read-only platform-tier
-- RPC returns that single summary row.

set search_path = civicos, pg_catalog;

create or replace function civicos.event_webhooks_health()
returns table(
  total bigint, active bigint, paused bigint, circuit_open bigint,
  total_delivered bigint, total_failures bigint
)
language plpgsql security definer stable
set search_path = civicos, pg_catalog
as $$
begin
  if not (civicos.is_service_context() or civicos.is_platform_officer()) then
    raise exception 'event_webhooks_health requires a platform-tier role'
      using errcode = 'insufficient_privilege';
  end if;
  return query
    select
      count(*)::bigint,
      count(*) filter (where w.active)::bigint,
      count(*) filter (where not w.active and coalesce(w.paused_reason, '') not like 'circuit-open%')::bigint,
      count(*) filter (where not w.active and coalesce(w.paused_reason, '') like 'circuit-open%')::bigint,
      coalesce(sum(w.delivered_count), 0)::bigint,
      coalesce(sum(w.failures), 0)::bigint
    from civicos.event_webhooks w;
end$$;

create or replace function public.civicos_event_webhooks_health()
returns table(
  total bigint, active bigint, paused bigint, circuit_open bigint,
  total_delivered bigint, total_failures bigint
) language sql security definer stable set search_path = public, pg_catalog
as $$ select * from civicos.event_webhooks_health(); $$;

revoke execute on function public.civicos_event_webhooks_health() from public, anon;
grant  execute on function public.civicos_event_webhooks_health() to authenticated;
