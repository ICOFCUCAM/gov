-- 20260521760000_civicos_cancel_service_request.sql
--
-- Phase B · citizen-initiated service-request cancellation.
--
-- Symmetric to withdraw_my_appeal: a citizen who filed a service request
-- they no longer need had no sanctioned way to close it out themselves —
-- update_service_request is the unscoped officer-side RPC. Without a citizen
-- exit the request sat as "open" forever, inflating each charter's SLA
-- backlog with work nobody is waiting on. This adds:
--   • service_requests.cancelled_at — a terminal timestamp distinct from
--     resolved_at
--   • cancel_my_service_request(ref, reason) — scoped to auth.uid()'s citizen,
--     only on a request they own that is neither resolved nor already
--     cancelled, audit-logged on the citizen scope.
--   • service_sla_stats — open / oldest-open now exclude cancelled requests,
--     and a cancelled count is published, so the backlog stays honest.

set search_path = civicos, pg_catalog;

alter table civicos.service_requests add column if not exists cancelled_at timestamptz;

-- ── cancel_my_service_request ──
create or replace function civicos.cancel_my_service_request(p_ref text, p_reason text default null)
returns civicos.service_requests
language plpgsql
security definer
set search_path = civicos, pg_catalog
as $$
declare
  v_citizen uuid;
  rec civicos.service_requests;
begin
  select id into v_citizen from civicos.citizens where auth_user_id = (select auth.uid());
  if v_citizen is null then
    raise exception 'cancel_my_service_request requires a linked citizen'
      using errcode = 'insufficient_privilege';
  end if;

  update civicos.service_requests
     set status = 'cancelled',
         cancelled_at = now(),
         payload = case when p_reason is null then payload
                        else payload || jsonb_build_object('cancel_reason', p_reason) end,
         updated_at = now()
   where ref = p_ref
     and citizen_id = v_citizen
     and resolved_at is null
     and cancelled_at is null
   returning * into rec;

  if rec.id is null then
    raise exception 'service request % not found, not yours, or already resolved/cancelled', p_ref;
  end if;

  perform civicos.append_audit(
    'citizen:' || v_citizen::text, 'citizen', 'service_cancelled', rec.ref,
    'cancelled request ' || rec.ref || coalesce(' — ' || p_reason, ''));
  return rec;
end$$;

create or replace function public.civicos_cancel_my_service_request(p_ref text, p_reason text default null)
returns civicos.service_requests
language sql security definer set search_path = public, pg_catalog
as $$ select * from civicos.cancel_my_service_request(p_ref, p_reason); $$;

revoke execute on function public.civicos_cancel_my_service_request(text, text) from public, anon;
grant  execute on function public.civicos_cancel_my_service_request(text, text) to authenticated;

-- ── service_sla_stats: exclude cancelled from open, publish cancelled count ──
-- Return shape changes (new `cancelled` column), so drop + recreate.
drop function if exists public.civicos_service_sla_stats(text, int);
drop function if exists civicos.service_sla_stats(text, int);

create function civicos.service_sla_stats(
  p_charter_id text default null, p_days int default 30
)
returns table(
  charter_id text,
  submitted bigint,
  acknowledged bigint,
  resolved bigint,
  open bigint,
  cancelled bigint,
  median_ack_hours numeric,
  median_resolve_hours numeric,
  p90_resolve_hours numeric,
  oldest_open_hours numeric,
  rated bigint,
  avg_satisfaction numeric
)
language sql
security definer
stable
set search_path = civicos, pg_catalog
as $$
  with win as (
    select target_charter_id, submitted_at, acknowledged_at, resolved_at, cancelled_at, satisfaction
    from civicos.service_requests
    where submitted_at >= now() - make_interval(days => greatest(1, least(coalesce(p_days, 30), 365)))
      and (p_charter_id is null or target_charter_id = p_charter_id)
  )
  select
    w.target_charter_id,
    count(*)::bigint,
    count(w.acknowledged_at)::bigint,
    count(w.resolved_at)::bigint,
    count(*) filter (where w.resolved_at is null and w.cancelled_at is null)::bigint,
    count(w.cancelled_at)::bigint,
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
      filter (where w.resolved_at is null and w.cancelled_at is null)::numeric, 1),
    count(*) filter (where w.satisfaction is not null)::bigint,
    round(avg(w.satisfaction) filter (where w.satisfaction is not null)::numeric, 1)
  from win w
  group by w.target_charter_id
  order by count(*) desc;
$$;

create function public.civicos_service_sla_stats(
  p_charter_id text default null, p_days int default 30
)
returns table(
  charter_id text, submitted bigint, acknowledged bigint, resolved bigint, open bigint,
  cancelled bigint, median_ack_hours numeric, median_resolve_hours numeric, p90_resolve_hours numeric,
  oldest_open_hours numeric, rated bigint, avg_satisfaction numeric
) language sql security definer stable set search_path = public, pg_catalog
as $$ select * from civicos.service_sla_stats(p_charter_id, p_days); $$;

revoke execute on function public.civicos_service_sla_stats(text, int) from public;
grant  execute on function public.civicos_service_sla_stats(text, int) to anon, authenticated;
