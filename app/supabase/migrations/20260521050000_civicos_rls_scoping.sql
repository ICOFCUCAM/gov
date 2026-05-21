-- 20260521050000_civicos_rls_scoping.sql
--
-- Phase A.5 · officer-scoped RLS.
--
-- The v1 substrate enabled `using (true)` on every operationally
-- sensitive table for any authenticated session. That was correct for
-- bootstrap (the platform had no real identity), but with Phase A.5
-- identity online it leaves an open door — a signed-in citizen could
-- read every ministry's work items, every audit trail.
--
-- This migration tightens the read policies on:
--   work_items / work_item_steps / dispatches / escalations
--   audit_entries / officers
--
-- The scoping rules:
--   • Platform-tier roles (platform-admin, noc-officer, cabinet-officer,
--     auditor) — cross-cutting visibility (NOC dashboards, audit
--     observatories, cabinet briefings need this).
--   • Charter-scoped officers — rows where the originating /
--     issuing / source charter matches their own; plus rows where
--     they are the named assignee / officer.
--   • Citizens — only their own records (already enforced on
--     citizen-side tables; this also extends to work items where they
--     are the named citizen_id).
--
-- Federation events, posture history, telemetry samples, and the
-- already-public directive surfaces are intentionally left broad —
-- they ARE the cross-cutting operational fabric and a signed-in user
-- needs to see them.

set search_path = civicos, pg_catalog;

-- ┌────────────────────────────────────────────────────────────────┐
-- │ Identity helpers                                                │
-- └────────────────────────────────────────────────────────────────┘

create or replace function civicos.current_officer_id()
returns uuid language sql stable security definer
set search_path = pg_catalog, civicos
as $fn$
  select id from civicos.officers
  where auth_user_id = auth.uid() and active limit 1;
$fn$;

create or replace function civicos.current_officer_charter()
returns text language sql stable security definer
set search_path = pg_catalog, civicos
as $fn$
  select charter_id from civicos.officers
  where auth_user_id = auth.uid() and active limit 1;
$fn$;

create or replace function civicos.current_citizen_id()
returns uuid language sql stable security definer
set search_path = pg_catalog, civicos
as $fn$
  select id from civicos.citizens
  where auth_user_id = auth.uid() and active limit 1;
$fn$;

-- Platform-tier roles see across charters. Encoded centrally so any
-- future role additions land in one place.
create or replace function civicos.is_platform_officer()
returns boolean language sql stable security definer
set search_path = pg_catalog, civicos
as $fn$
  select exists(
    select 1 from civicos.officers
    where auth_user_id = auth.uid() and active
      and role = any(ARRAY[
        'platform-admin', 'noc-officer', 'cabinet-officer', 'auditor'
      ])
  );
$fn$;

revoke all on function civicos.current_officer_id() from public;
revoke all on function civicos.current_officer_charter() from public;
revoke all on function civicos.current_citizen_id() from public;
revoke all on function civicos.is_platform_officer() from public;
grant execute on function civicos.current_officer_id()      to anon, authenticated;
grant execute on function civicos.current_officer_charter() to anon, authenticated;
grant execute on function civicos.current_citizen_id()      to anon, authenticated;
grant execute on function civicos.is_platform_officer()     to anon, authenticated;

-- ┌────────────────────────────────────────────────────────────────┐
-- │ work_items — scope by charter / assignee / citizen             │
-- └────────────────────────────────────────────────────────────────┘

drop policy if exists work_items_read_authenticated on civicos.work_items;
create policy work_items_read_scoped on civicos.work_items for select to authenticated
  using (
    civicos.is_platform_officer()
    or (civicos.current_officer_charter() is not null
        and (originating_charter_id = civicos.current_officer_charter()
             or scope = civicos.current_officer_charter()
             or scope like civicos.current_officer_charter() || ':%'))
    or assignee_id = civicos.current_officer_id()
    or citizen_id  = civicos.current_citizen_id()
  );

-- ┌────────────────────────────────────────────────────────────────┐
-- │ work_item_steps — visible iff parent work_item is              │
-- └────────────────────────────────────────────────────────────────┘

drop policy if exists work_item_steps_read_authenticated on civicos.work_item_steps;
create policy work_item_steps_read_scoped on civicos.work_item_steps for select to authenticated
  using (
    civicos.is_platform_officer()
    or actor_id = civicos.current_officer_id()
    or exists(
      select 1 from civicos.work_items w
      where w.id = work_item_id
        and (
          (civicos.current_officer_charter() is not null
           and (w.originating_charter_id = civicos.current_officer_charter()
                or w.scope = civicos.current_officer_charter()
                or w.scope like civicos.current_officer_charter() || ':%'))
          or w.assignee_id = civicos.current_officer_id()
          or w.citizen_id  = civicos.current_citizen_id()
        )
    )
  );

-- ┌────────────────────────────────────────────────────────────────┐
-- │ dispatches — scope by issuer / target charter or officer        │
-- └────────────────────────────────────────────────────────────────┘

drop policy if exists dispatches_read_authenticated on civicos.dispatches;
create policy dispatches_read_scoped on civicos.dispatches for select to authenticated
  using (
    civicos.is_platform_officer()
    or (civicos.current_officer_charter() is not null
        and (issued_by_charter_id = civicos.current_officer_charter()
             or target_charter_id  = civicos.current_officer_charter()))
    or issued_by_officer_id = civicos.current_officer_id()
  );

-- ┌────────────────────────────────────────────────────────────────┐
-- │ escalations — scope by source / target charter                  │
-- └────────────────────────────────────────────────────────────────┘

drop policy if exists escalations_read_authenticated on civicos.escalations;
create policy escalations_read_scoped on civicos.escalations for select to authenticated
  using (
    civicos.is_platform_officer()
    or (civicos.current_officer_charter() is not null
        and (source_charter_id = civicos.current_officer_charter()
             or target_charter_id = civicos.current_officer_charter()))
  );

-- ┌────────────────────────────────────────────────────────────────┐
-- │ audit_entries — most sensitive; scope by audit `scope`          │
-- └────────────────────────────────────────────────────────────────┘
-- Scope strings follow `<charter>` or `<charter>:<sub-scope>` (e.g.
-- 'ministry-health:MIN-1', 'app:judiciary'). Officer match is exact or
-- prefix; platform/auditor sees everything.

drop policy if exists audit_entries_read_authenticated on civicos.audit_entries;
create policy audit_entries_read_scoped on civicos.audit_entries for select to authenticated
  using (
    civicos.is_platform_officer()
    or (civicos.current_officer_charter() is not null
        and (scope = civicos.current_officer_charter()
             or scope like civicos.current_officer_charter() || ':%'))
  );

-- ┌────────────────────────────────────────────────────────────────┐
-- │ officers — visible to platform tier, to fellow officers in     │
-- │             your charter, and to yourself                       │
-- └────────────────────────────────────────────────────────────────┘

drop policy if exists officers_read_authenticated on civicos.officers;
create policy officers_read_scoped on civicos.officers for select to authenticated
  using (
    civicos.is_platform_officer()
    or auth_user_id = auth.uid()
    or (civicos.current_officer_charter() is not null
        and charter_id = civicos.current_officer_charter())
  );

-- ┌────────────────────────────────────────────────────────────────┐
-- │ Table-level SELECT grants                                       │
-- └────────────────────────────────────────────────────────────────┘
-- The public.civicos_* views are security_invoker, so reads through
-- them require the calling role to hold SELECT on the underlying
-- civicos.* table. RLS policies above still scope which rows are
-- returned — these grants only open the cursor.

grant select on civicos.institutions, civicos.officers, civicos.citizens,
                civicos.facilities, civicos.workflow_definitions,
                civicos.work_items, civicos.work_item_steps,
                civicos.federation_events, civicos.event_subscriptions,
                civicos.audit_entries, civicos.directives,
                civicos.dispatches, civicos.escalations,
                civicos.posture_history, civicos.telemetry_streams,
                civicos.telemetry_samples, civicos.service_requests,
                civicos.consents, civicos.appeals
  to anon, authenticated;
