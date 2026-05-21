-- 20260521090000_civicos_officer_intake_rls.sql
--
-- Phase A.5 · officer-side read access for citizen intake.
--
-- The v1 policies on service_requests / consents / appeals are
-- citizen-self only. Officers handling intake need to SEE rows
-- addressed to their charter to be able to act on them (the writes
-- go through SECURITY DEFINER RPCs so they already work). This
-- migration adds the read side.

set search_path = civicos, pg_catalog;

-- service_requests: officers in the target charter can read; platform
-- tier sees all.
create policy service_requests_read_officer
  on civicos.service_requests for select to authenticated
  using (
    civicos.is_platform_officer()
    or (civicos.current_officer_charter() is not null
        and target_charter_id = civicos.current_officer_charter())
  );

-- appeals: officers in the originating charter can read.
create policy appeals_read_officer
  on civicos.appeals for select to authenticated
  using (
    civicos.is_platform_officer()
    or (civicos.current_officer_charter() is not null
        and originating_charter_id = civicos.current_officer_charter())
  );

-- consents: target-charter officers can see which consents apply to
-- their charter (read-only — the grant/revoke RPCs gate the citizen
-- side). Platform-tier sees all.
create policy consents_read_officer
  on civicos.consents for select to authenticated
  using (
    civicos.is_platform_officer()
    or (civicos.current_officer_charter() is not null
        and target_charter_id = civicos.current_officer_charter())
  );
