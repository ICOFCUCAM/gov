-- 20260521650000_civicos_my_notifications.sql
--
-- Phase B · citizen actionable notifications.
--
-- The receipt timeline is a complete history; this is the short, forward-
-- looking "what needs your attention" feed derived from the citizen's own
-- substrate state:
--   • resolved service requests not yet rated   → action: rate
--   • appeals decided in the last 30 days        → action: view
--   • consents expiring within 14 days           → action: extend
-- Scoped to auth.uid()'s citizen; authenticated only. Read-only.

set search_path = civicos, pg_catalog;

create or replace function civicos.my_notifications(p_limit int default 30)
returns table(
  kind text,
  ref text,
  at timestamptz,
  detail text,
  action text
)
language sql
security definer
stable
set search_path = civicos, pg_catalog
as $$
  with me as (
    select id from civicos.citizens where auth_user_id = (select auth.uid())
  ),
  items as (
    select 'request_unrated'::text as kind, sr.ref, sr.resolved_at as at,
           coalesce(sr.title, sr.service) as detail, 'rate'::text as action
    from civicos.service_requests sr
    where sr.citizen_id = (select id from me)
      and sr.resolved_at is not null and sr.satisfaction is null
    union all
    select 'appeal_decided', a.ref, a.decided_at,
           'appeal ' || coalesce(a.decision, 'decided'), 'view'
    from civicos.appeals a
    where a.citizen_id = (select id from me)
      and a.decided_at is not null and a.decided_at >= now() - interval '30 days'
    union all
    select 'consent_expiring', c.id::text, c.expires_at,
           c.target_charter_id || ' · ' || c.scope, 'extend'
    from civicos.consents c
    where c.citizen_id = (select id from me)
      and c.status = 'granted' and c.expires_at is not null
      and c.expires_at >= now() and c.expires_at < now() + interval '14 days'
  )
  select kind, ref, at, detail, action
  from items
  order by at desc nulls last
  limit greatest(1, least(coalesce(p_limit, 30), 200));
$$;

create or replace function public.civicos_my_notifications(p_limit int default 30)
returns table(kind text, ref text, at timestamptz, detail text, action text)
language sql security definer stable set search_path = public, pg_catalog
as $$ select * from civicos.my_notifications(p_limit); $$;

revoke execute on function public.civicos_my_notifications(int) from public, anon;
grant  execute on function public.civicos_my_notifications(int) to authenticated;
