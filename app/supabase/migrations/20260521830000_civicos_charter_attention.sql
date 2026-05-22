-- 20260521830000_civicos_charter_attention.sql
--
-- Phase B · officer attention feed.
--
-- The officer counterpart to my_notifications: a short, forward-looking
-- "what needs your charter's attention" feed derived from the charter's own
-- operational backlog, scoped to the signed-in officer's charter via
-- current_officer_charter():
--   • service requests open >48h and still unacknowledged  → action: ack
--   • escalations raised against the charter, unacknowledged → action: ack
--   • appeals filed against the charter, pending >7 days      → action: decide
--   • dispatches issued by the charter, open and unacknowledged → action: respond
--
-- Citizen-exited work (cancelled requests / withdrawn appeals) is excluded —
-- it isn't pending. Authenticated only; read-only. Oldest-first so the most
-- overdue item leads.

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
