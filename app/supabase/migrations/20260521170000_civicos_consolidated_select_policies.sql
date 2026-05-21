-- 20260521170000_civicos_consolidated_select_policies.sql
--
-- Phase A · hardening (perf): merge the two permissive SELECT policies
-- on appeals / consents / service_requests into one, so PostgreSQL only
-- has to evaluate one policy per row at read time instead of two.
--
-- Before: `*_self` (FOR ALL, citizen-owns) + `*_read_officer` (SELECT,
-- charter-officer) both permissive on the same role/action.
-- After:  `*_select` (SELECT, OR'd condition) + `*_insert/update/delete`
--         (citizen-only). Splitting modify into per-command avoids
--         re-introducing a second SELECT permissive policy via FOR ALL.
--
-- Semantics are identical — citizen sees own rows, officer sees rows
-- addressed to their charter, platform tier sees everything; only the
-- citizen can write. Addresses the `multiple_permissive_policies`
-- advisor warning.

set search_path = civicos, pg_catalog;

-- ── service_requests ──
drop policy if exists service_requests_self          on civicos.service_requests;
drop policy if exists service_requests_read_officer  on civicos.service_requests;

create policy service_requests_select on civicos.service_requests for select to authenticated
  using (
    citizen_id in (select id from civicos.citizens where auth_user_id = (select auth.uid()))
    or civicos.is_platform_officer()
    or (civicos.current_officer_charter() is not null
        and target_charter_id = civicos.current_officer_charter())
  );

create policy service_requests_insert on civicos.service_requests for insert to authenticated
  with check (citizen_id in (select id from civicos.citizens where auth_user_id = (select auth.uid())));

create policy service_requests_update on civicos.service_requests for update to authenticated
  using (citizen_id in (select id from civicos.citizens where auth_user_id = (select auth.uid())))
  with check (citizen_id in (select id from civicos.citizens where auth_user_id = (select auth.uid())));

create policy service_requests_delete on civicos.service_requests for delete to authenticated
  using (citizen_id in (select id from civicos.citizens where auth_user_id = (select auth.uid())));

-- ── appeals ──
drop policy if exists appeals_self          on civicos.appeals;
drop policy if exists appeals_read_officer  on civicos.appeals;

create policy appeals_select on civicos.appeals for select to authenticated
  using (
    citizen_id in (select id from civicos.citizens where auth_user_id = (select auth.uid()))
    or civicos.is_platform_officer()
    or (civicos.current_officer_charter() is not null
        and originating_charter_id = civicos.current_officer_charter())
  );

create policy appeals_insert on civicos.appeals for insert to authenticated
  with check (citizen_id in (select id from civicos.citizens where auth_user_id = (select auth.uid())));

create policy appeals_update on civicos.appeals for update to authenticated
  using (citizen_id in (select id from civicos.citizens where auth_user_id = (select auth.uid())))
  with check (citizen_id in (select id from civicos.citizens where auth_user_id = (select auth.uid())));

create policy appeals_delete on civicos.appeals for delete to authenticated
  using (citizen_id in (select id from civicos.citizens where auth_user_id = (select auth.uid())));

-- ── consents ──
drop policy if exists consents_self          on civicos.consents;
drop policy if exists consents_read_officer  on civicos.consents;

create policy consents_select on civicos.consents for select to authenticated
  using (
    citizen_id in (select id from civicos.citizens where auth_user_id = (select auth.uid()))
    or civicos.is_platform_officer()
    or (civicos.current_officer_charter() is not null
        and target_charter_id = civicos.current_officer_charter())
  );

create policy consents_insert on civicos.consents for insert to authenticated
  with check (citizen_id in (select id from civicos.citizens where auth_user_id = (select auth.uid())));

create policy consents_update on civicos.consents for update to authenticated
  using (citizen_id in (select id from civicos.citizens where auth_user_id = (select auth.uid())))
  with check (citizen_id in (select id from civicos.citizens where auth_user_id = (select auth.uid())));

create policy consents_delete on civicos.consents for delete to authenticated
  using (citizen_id in (select id from civicos.citizens where auth_user_id = (select auth.uid())));
