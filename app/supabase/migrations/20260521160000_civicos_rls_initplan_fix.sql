-- 20260521160000_civicos_rls_initplan_fix.sql
--
-- Phase A · hardening (perf): wrap `auth.uid()` in `(select auth.uid())`
-- inside RLS policies so PostgreSQL evaluates the auth lookup once per
-- query instead of once per row. Semantics are identical — only the
-- query plan changes (initplan vs per-row subplan).
--
-- Addresses the `auth_rls_initplan` advisor warning on:
--   civicos.citizens.citizens_self_read
--   civicos.service_requests.service_requests_self
--   civicos.consents.consents_self
--   civicos.appeals.appeals_self
--   civicos.officers.officers_read_scoped
--
-- See https://supabase.com/docs/guides/database/postgres/row-level-security#call-functions-with-select

set search_path = civicos, pg_catalog;

-- citizens: self-read
drop policy if exists citizens_self_read on civicos.citizens;
create policy citizens_self_read on civicos.citizens for select to authenticated
  using (auth_user_id = (select auth.uid()));

-- service_requests: citizen-self (FOR ALL)
drop policy if exists service_requests_self on civicos.service_requests;
create policy service_requests_self on civicos.service_requests for all to authenticated
  using (citizen_id in (select id from civicos.citizens where auth_user_id = (select auth.uid())))
  with check (citizen_id in (select id from civicos.citizens where auth_user_id = (select auth.uid())));

-- consents: citizen-self (FOR ALL)
drop policy if exists consents_self on civicos.consents;
create policy consents_self on civicos.consents for all to authenticated
  using (citizen_id in (select id from civicos.citizens where auth_user_id = (select auth.uid())))
  with check (citizen_id in (select id from civicos.citizens where auth_user_id = (select auth.uid())));

-- appeals: citizen-self (FOR ALL)
drop policy if exists appeals_self on civicos.appeals;
create policy appeals_self on civicos.appeals for all to authenticated
  using (citizen_id in (select id from civicos.citizens where auth_user_id = (select auth.uid())))
  with check (citizen_id in (select id from civicos.citizens where auth_user_id = (select auth.uid())));

-- officers: scoped read
drop policy if exists officers_read_scoped on civicos.officers;
create policy officers_read_scoped on civicos.officers for select to authenticated
  using (
    civicos.is_platform_officer()
    or auth_user_id = (select auth.uid())
    or (civicos.current_officer_charter() is not null
        and charter_id = civicos.current_officer_charter())
  );
