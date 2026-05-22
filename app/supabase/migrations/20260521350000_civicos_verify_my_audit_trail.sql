-- 20260521350000_civicos_verify_my_audit_trail.sql
--
-- Phase B · let a citizen verify their own audit-trail integrity.
--
-- my_audit_trail returns the hash chain so the trail can be checked, but a
-- citizen shouldn't have to know their internal `citizen:<id>` scope (or
-- reimplement FNV-1a) to do it. This wrapper resolves the scope from
-- auth.uid() server-side and delegates to the existing, proven
-- verify_audit_chain — returning the same {entries, intact, broken_at}
-- shape the Public Observatory uses, but scoped to the caller.
--
-- Authenticated only; a caller with no linked citizen gets a trivially
-- intact empty result.

set search_path = civicos, pg_catalog;

create or replace function civicos.verify_my_audit_trail()
returns table(entries bigint, intact boolean, broken_at bigint)
language plpgsql
security definer
stable
set search_path = civicos, pg_catalog
as $$
declare v_scope text;
begin
  select 'citizen:' || c.id::text into v_scope
  from civicos.citizens c where c.auth_user_id = (select auth.uid());
  if v_scope is null then
    return query select 0::bigint, true, null::bigint;
    return;
  end if;
  return query select * from civicos.verify_audit_chain(v_scope);
end$$;

create or replace function public.civicos_verify_my_audit_trail()
returns table(entries bigint, intact boolean, broken_at bigint)
language sql security definer stable set search_path = public, pg_catalog
as $$ select * from civicos.verify_my_audit_trail(); $$;

revoke execute on function public.civicos_verify_my_audit_trail() from public, anon;
grant  execute on function public.civicos_verify_my_audit_trail() to authenticated;
