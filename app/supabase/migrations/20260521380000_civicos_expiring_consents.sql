-- 20260521380000_civicos_expiring_consents.sql
--
-- Phase B · proactive consent-expiry surfacing for citizens.
--
-- Consents can be time-bound (expires_at), and expire_due_consents revokes
-- them once past due — but a citizen only saw the expiry date by opening
-- each consent's detail page. There was no "these grants lapse soon" view,
-- so an access grant could quietly expire (or a citizen could forget to
-- renew one they still rely on) with no warning.
--
-- This read-only RPC returns the caller's still-active grants whose
-- expires_at falls within the next p_within_days, with days_remaining, so
-- the wallet can warn ahead of time. Scoped to auth.uid(); authenticated.

set search_path = civicos, pg_catalog;

create or replace function civicos.my_expiring_consents(p_within_days int default 14)
returns table(
  id uuid, target_charter_id text, scope text,
  granted_at timestamptz, expires_at timestamptz, days_remaining int
)
language sql
security definer
stable
set search_path = civicos, pg_catalog
as $$
  select
    c.id, c.target_charter_id, c.scope, c.granted_at, c.expires_at,
    greatest(0, ceil(extract(epoch from (c.expires_at - now())) / 86400)::int) as days_remaining
  from civicos.consents c
  where c.citizen_id = (
    select id from civicos.citizens where auth_user_id = (select auth.uid())
  )
    and c.status = 'granted'
    and c.expires_at is not null
    and c.expires_at >= now()
    and c.expires_at < now() + make_interval(days => greatest(1, least(coalesce(p_within_days, 14), 365)))
  order by c.expires_at asc;
$$;

create or replace function public.civicos_my_expiring_consents(p_within_days int default 14)
returns table(
  id uuid, target_charter_id text, scope text,
  granted_at timestamptz, expires_at timestamptz, days_remaining int
) language sql security definer stable set search_path = public, pg_catalog
as $$ select * from civicos.my_expiring_consents(p_within_days); $$;

revoke execute on function public.civicos_my_expiring_consents(int) from public, anon;
grant  execute on function public.civicos_my_expiring_consents(int) to authenticated;
