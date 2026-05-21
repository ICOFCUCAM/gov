-- 20260521190000_civicos_revoke_anon_writes.sql
--
-- Phase A · hardening (security): revoke EXECUTE from the `anon` role
-- on every SECURITY DEFINER write/admin RPC in public.civicos_*. Two
-- read-side helpers remain anon-callable because the Public Observatory
-- and unsigned-in shells need them:
--
--   • civicos_verify_audit_chain — read-only chain integrity check
--   • civicos_current_actor      — returns null for anon, the actor
--                                  snapshot otherwise; needed for the
--                                  identity bridge to render the same
--                                  shell whether signed-in or not
--
-- Every other RPC requires an authenticated identity to do anything
-- meaningful — `auth.uid()` checks gate the work inside each function,
-- and unauthenticated calls fail there anyway. Revoking EXECUTE at the
-- catalog level closes the surface earlier so the lint stops flagging
-- it.
--
-- Addresses `anon_security_definer_function_executable` for 32 of 34
-- functions.

set search_path = public, pg_catalog;

do $$
declare
  fn text;
  keep text[] := array['civicos_verify_audit_chain', 'civicos_current_actor'];
  proc record;
begin
  for proc in
    select p.proname, pg_get_function_identity_arguments(p.oid) as args
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.proname like 'civicos\_%' escape '\'
  loop
    if proc.proname = any(keep) then continue; end if;
    execute format('revoke execute on function public.%I(%s) from anon', proc.proname, proc.args);
  end loop;
end$$;
