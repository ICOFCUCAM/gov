-- 20260521840000_civicos_charter_attention_workitems.sql
--
-- Phase B · add stalled work items to the officer attention feed.
--
-- charter_attention surfaced requests, escalations, appeals and dispatches
-- but not the internal workflow engine. An open work item that hasn't moved
-- in days is exactly the kind of silent backlog the feed exists to catch.
-- Recreates the function to add: open work items originating from the
-- charter with no update in 72 hours → action: progress (at = last activity).
-- All other arms are unchanged.

set search_path = civicos, pg_catalog;

create or replace function civicos.charter_attention(p_limit int default 50)
returns table(
  kind text,
  ref text,
  at timestamptz,
  age_hours numeric,
  detail text,
  action text
)
language sql
security definer
stable
set search_path = civicos, pg_catalog
as $$
  with me as (select civicos.current_officer_charter() as charter),
  items as (
    select 'request_overdue'::text as kind, sr.ref, sr.submitted_at as at,
           coalesce(sr.title, sr.service) as detail, 'ack'::text as action
    from civicos.service_requests sr, me
    where me.charter is not null and sr.target_charter_id = me.charter
      and sr.resolved_at is null and sr.cancelled_at is null
      and sr.acknowledged_at is null
      and sr.submitted_at < now() - interval '48 hours'
    union all
    select 'escalation_unacked', e.id::text, e.triggered_at,
           e.severity || ' · ' || coalesce(e.reason, '—'), 'ack'
    from civicos.escalations e, me
    where me.charter is not null and e.source_charter_id = me.charter
      and e.acknowledged_at is null and e.resolved_at is null
    union all
    select 'appeal_pending', a.ref, a.filed_at,
           coalesce(a.ground, 'appeal'), 'decide'
    from civicos.appeals a, me
    where me.charter is not null and a.originating_charter_id = me.charter
      and a.decided_at is null and a.withdrawn_at is null
      and a.filed_at < now() - interval '7 days'
    union all
    select 'dispatch_unacked', d.ref, d.dispatched_at,
           d.kind, 'respond'
    from civicos.dispatches d, me
    where me.charter is not null and d.issued_by_charter_id = me.charter
      and d.acknowledged_at is null and d.closed_at is null
    union all
    select 'workitem_stalled', w.ref, w.updated_at,
           w.title || ' · ' || w.current_stage, 'progress'
    from civicos.work_items w, me
    where me.charter is not null and w.originating_charter_id = me.charter
      and not w.closed
      and w.updated_at < now() - interval '72 hours'
  )
  select kind, ref, at,
         round((extract(epoch from (now() - at)) / 3600)::numeric, 1) as age_hours,
         detail, action
  from items
  order by at asc nulls last
  limit greatest(1, least(coalesce(p_limit, 50), 200));
$$;

create or replace function public.civicos_charter_attention(p_limit int default 50)
returns table(kind text, ref text, at timestamptz, age_hours numeric, detail text, action text)
language sql security definer stable set search_path = public, pg_catalog
as $$ select * from civicos.charter_attention(p_limit); $$;

revoke execute on function public.civicos_charter_attention(int) from public, anon;
grant  execute on function public.civicos_charter_attention(int) to authenticated;
