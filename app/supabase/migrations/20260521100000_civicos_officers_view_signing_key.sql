-- 20260521100000_civicos_officers_view_signing_key.sql
--
-- Recreate public.civicos_officers view to expose signing_public_key
-- (added by 20260521080000). Postgres' CREATE OR REPLACE VIEW refuses
-- to add columns mid-list, so we DROP + CREATE. RLS scoping comes from
-- the underlying civicos.officers table via security_invoker.

drop view if exists public.civicos_officers;
create view public.civicos_officers with (security_invoker = true) as
  select id, auth_user_id, institution_id, charter_id, role, title, name, email,
         active, joined_at, meta, signing_public_key, created_at, updated_at
    from civicos.officers;

grant select on public.civicos_officers to anon, authenticated;
