-- 20261024090000_civicos_service_context_definer_fix.sql
--
-- Go-live review H-1 / M-5 (root cause on the SQL side).
--
-- is_service_context() (20260521280000) accepted `current_user in
-- ('postgres','service_role')`. Inside a SECURITY DEFINER function owned by
-- postgres, current_user IS postgres, and this helper is not itself a
-- definer function, so it inherits it: every definer RPC gated by
-- is_service_context() therefore accepted ANY caller holding EXECUTE. For
-- example, any signed-in user (no officer record at all) could register a
-- federation webhook and receive every event of a channel, or mark webhook
-- deliveries, through the RPCs granted to `authenticated`.
--
-- The service is now recognised only by:
--   * the verified JWT role (PostgREST with the service key: auth.role()),
--   * the session's own login role (direct postgres / service_role
--     connections, pg_cron jobs, migrations), which a definer function
--     cannot change.

set search_path = civicos, pg_catalog;

create or replace function civicos.is_service_context()
returns boolean
language sql
stable
set search_path = civicos, pg_catalog
as $$
  select coalesce((select auth.role()) = 'service_role', false)
      or session_user in ('postgres', 'service_role', 'supabase_admin');
$$;
