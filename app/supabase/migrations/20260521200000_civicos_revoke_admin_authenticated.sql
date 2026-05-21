-- 20260521200000_civicos_revoke_admin_authenticated.sql
--
-- Phase A · hardening (security): the four admin / cron-only RPCs were
-- callable by any authenticated session. They each enforce
-- `is_platform_officer()` (or shared-secret HTTP gating for the cron
-- one) internally, so revoking EXECUTE for `authenticated` is a
-- defense-in-depth change — the catalog now matches the contract.
--
-- These functions are still called from server-side code with the
-- `service_role` key, which keeps default EXECUTE privileges.

set search_path = public, pg_catalog;

do $$
declare
  admin_only text[] := array[
    'civicos_admin_create_officer',
    'civicos_admin_deactivate_officer',
    'civicos_link_officer_by_email',
    'civicos_escalate_stale_service_requests'
  ];
  proc record;
begin
  for proc in
    select p.proname, pg_get_function_identity_arguments(p.oid) as args
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.proname = any(admin_only)
  loop
    execute format('revoke execute on function public.%I(%s) from authenticated',
                   proc.proname, proc.args);
  end loop;
end$$;
