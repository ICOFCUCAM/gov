-- 20260521750000_civicos_withdraw_appeal.sql
--
-- Phase B · citizen-initiated appeal withdrawal.
--
-- The appeal lifecycle had file → admit → hear → decide, all of them
-- charter/officer-side once filed. A citizen who filed an appeal had no
-- sanctioned way to withdraw it before a decision — the only "exits" were
-- an officer deciding it or the row sitting open forever, inflating the
-- pending backlog. This adds:
--   • appeals.withdrawn_at — a terminal timestamp distinct from decided_at
--   • withdraw_my_appeal(ref, reason) — scoped to auth.uid()'s citizen, only
--     on an appeal they own that is neither decided nor already withdrawn.
--     Audit-logged on the citizen's scope.
--   • appeals_stats — pending / oldest-pending now exclude withdrawn rows,
--     and a withdrawn count is published, so the backlog stays honest.

set search_path = civicos, pg_catalog;

alter table civicos.appeals add column if not exists withdrawn_at timestamptz;

-- ── withdraw_my_appeal ──
create or replace function civicos.withdraw_my_appeal(p_ref text, p_reason text default null)
returns civicos.appeals
language plpgsql
security definer
set search_path = civicos, pg_catalog
as $$
declare
  v_citizen uuid;
  rec civicos.appeals;
begin
  select id into v_citizen from civicos.citizens where auth_user_id = (select auth.uid());
  if v_citizen is null then
    raise exception 'withdraw_my_appeal requires a linked citizen'
      using errcode = 'insufficient_privilege';
  end if;

  update civicos.appeals
     set status = 'withdrawn',
         withdrawn_at = now(),
         reasoning = coalesce(p_reason, reasoning),
         updated_at = now()
   where ref = p_ref
     and citizen_id = v_citizen
     and decided_at is null
     and withdrawn_at is null
   returning * into rec;

  if rec.id is null then
    raise exception 'appeal % not found, not yours, or already decided/withdrawn', p_ref;
  end if;

  perform civicos.append_audit(
    'citizen:' || v_citizen::text, 'citizen', 'appeal_withdrawn', rec.ref,
    'withdrew appeal ' || rec.ref || coalesce(' — ' || p_reason, ''));
  return rec;
end$$;

create or replace function public.civicos_withdraw_my_appeal(p_ref text, p_reason text default null)
returns civicos.appeals
language sql security definer set search_path = public, pg_catalog
as $$ select * from civicos.withdraw_my_appeal(p_ref, p_reason); $$;

revoke execute on function public.civicos_withdraw_my_appeal(text, text) from public, anon;
grant  execute on function public.civicos_withdraw_my_appeal(text, text) to authenticated;

-- ── appeals_stats: exclude withdrawn from pending, publish withdrawn count ──
-- Return shape changes (new `withdrawn` column), so drop + recreate.
drop function if exists public.civicos_appeals_stats(text, int);
drop function if exists civicos.appeals_stats(text, int);

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
  withdrawn bigint,
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
    select originating_charter_id, filed_at, admitted_at, decided_at, published_at, withdrawn_at
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
    count(*) filter (where w.decided_at is null and w.withdrawn_at is null)::bigint,
    count(w.withdrawn_at)::bigint,
    round(percentile_cont(0.5) within group (
      order by extract(epoch from (w.decided_at - w.filed_at)) / 86400
    ) filter (where w.decided_at is not null)::numeric, 1),
    round(percentile_cont(0.9) within group (
      order by extract(epoch from (w.decided_at - w.filed_at)) / 86400
    ) filter (where w.decided_at is not null)::numeric, 1),
    round(max(extract(epoch from (now() - w.filed_at)) / 86400)
      filter (where w.decided_at is null and w.withdrawn_at is null)::numeric, 1)
  from win w
  group by w.originating_charter_id
  order by count(*) desc;
$$;

create or replace function public.civicos_appeals_stats(
  p_charter_id text default null, p_days int default 90
)
returns table(
  charter_id text, filed bigint, admitted bigint, decided bigint, published bigint,
  pending bigint, withdrawn bigint, median_decision_days numeric, p90_decision_days numeric, oldest_pending_days numeric
) language sql security definer stable set search_path = public, pg_catalog
as $$ select * from civicos.appeals_stats(p_charter_id, p_days); $$;

revoke execute on function public.civicos_appeals_stats(text, int) from public;
grant  execute on function public.civicos_appeals_stats(text, int) to anon, authenticated;
