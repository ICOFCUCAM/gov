-- 20260521390000_civicos_extend_my_consent.sql
--
-- Phase B · let a citizen extend their own consent before it lapses.
--
-- The expiring-soon warning tells a citizen a grant is about to expire, but
-- the only remedy was to re-grant (which supersedes the old row and resets
-- its history) or let it lapse and grant anew. This adds a first-class
-- extension: push out expires_at on an existing granted consent, in place.
--
-- Unlike the older grant/revoke RPCs (which trust a caller-supplied
-- citizen_id), this resolves the citizen from auth.uid() and only touches a
-- consent the caller actually OWNS and that is still 'granted' — so one
-- citizen can never extend another's consent. The new expiry must be in the
-- future. Authenticated only.

set search_path = civicos, pg_catalog;

create or replace function civicos.extend_my_consent(p_consent_id uuid, p_new_expires_at timestamptz)
returns boolean
language plpgsql
security definer
set search_path = civicos, pg_catalog
as $$
declare v_citizen uuid; v_found boolean;
begin
  if p_new_expires_at is null or p_new_expires_at <= now() then
    raise exception 'new expiry must be in the future';
  end if;
  select id into v_citizen from civicos.citizens where auth_user_id = (select auth.uid());
  if v_citizen is null then
    return false;  -- no linked citizen
  end if;
  update civicos.consents
  set expires_at = p_new_expires_at, updated_at = now()
  where id = p_consent_id
    and citizen_id = v_citizen
    and status = 'granted'
  returning true into v_found;
  return coalesce(v_found, false);
end$$;

create or replace function public.civicos_extend_my_consent(p_consent_id uuid, p_new_expires_at timestamptz)
returns boolean language sql security definer set search_path = public, pg_catalog
as $$ select civicos.extend_my_consent(p_consent_id, p_new_expires_at); $$;

revoke execute on function public.civicos_extend_my_consent(uuid, timestamptz) from public, anon;
grant  execute on function public.civicos_extend_my_consent(uuid, timestamptz) to authenticated;
