-- 20260521260000_civicos_relock_definer_grants.sql
--
-- Phase A · hardening (security): re-lock SECURITY DEFINER RPCs whose
-- EXECUTE grants were silently re-applied by `CREATE OR REPLACE FUNCTION`.
--
-- Postgres / Supabase default privileges grant EXECUTE to anon +
-- authenticated whenever the function owner (re)creates a function.
-- Migrations 220000 / 230000 / 250000 each ran a later `create or
-- replace` that undid their own earlier REVOKE. This migration revokes
-- from PUBLIC too (belt and braces) and re-grants only what's intended.
--
-- Intended privilege model:
--   admin_bulk_create_officers  → service_role only
--   expire_due_consents         → service_role only
--   my_receipt_timeline         → authenticated only
-- Left intentionally anon-callable (unchanged here):
--   current_actor, record_witness_attestation, verify_audit_chain

set search_path = public, pg_catalog;

revoke execute on function public.civicos_admin_bulk_create_officers(jsonb) from public, anon, authenticated;
revoke execute on function public.civicos_expire_due_consents()           from public, anon, authenticated;
revoke execute on function public.civicos_my_receipt_timeline(int)        from public, anon;
grant  execute on function public.civicos_my_receipt_timeline(int)        to authenticated;
