-- 20260521640000_civicos_revoke_all_my_consents.sql
--
-- Phase B · citizen "revoke all access" kill switch.
--
-- A citizen could revoke consents one at a time, but had no way to cut off
-- ALL charter access at once — the response you want in a breach or when
-- you simply change your mind about sharing. This revokes every still-
-- granted consent the caller owns in one call, one audit entry summarising
-- the action, and returns the count revoked.
--
-- Scoped to auth.uid()'s citizen; authenticated only.

set search_path = civicos, pg_catalog;

create or replace function civicos.revoke_all_my_consents()
returns integer
language plpgsql
security definer
set search_path = civicos, pg_catalog
as $$
declare
  v_citizen uuid;
  v_count int;
begin
  select id into v_citizen from civicos.citizens where auth_user_id = (select auth.uid());
  if v_citizen is null then
    raise exception 'revoke_all_my_consents requires a linked citizen'
      using errcode = 'insufficient_privilege';
  end if;

  with revoked as (
    update civicos.consents
    set status = 'revoked', revoked_at = coalesce(revoked_at, now()), updated_at = now()
    where citizen_id = v_citizen and status = 'granted'
    returning 1
  )
  select count(*) into v_count from revoked;

  if v_count > 0 then
    perform civicos.append_audit(
      'citizen:' || v_citizen::text, 'citizen', 'consent_revoke_all', v_citizen::text,
      'revoked all (' || v_count || ') active consents');
  end if;
  return v_count;
end$$;

create or replace function public.civicos_revoke_all_my_consents()
returns integer language sql security definer set search_path = public, pg_catalog
as $$ select civicos.revoke_all_my_consents(); $$;

revoke execute on function public.civicos_revoke_all_my_consents() from public, anon;
grant  execute on function public.civicos_revoke_all_my_consents() to authenticated;
