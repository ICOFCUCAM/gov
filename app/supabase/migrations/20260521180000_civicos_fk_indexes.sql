-- 20260521180000_civicos_fk_indexes.sql
--
-- Phase A · hardening (perf): add covering indexes for the foreign keys
-- the database linter flagged. Without these, PostgreSQL falls back to
-- sequential scans whenever a parent row referenced by these FKs is
-- updated or deleted (and on JOIN paths that filter through the FK).
--
-- All eight indexes are additive — no semantic change, only query plan.

set search_path = civicos, pg_catalog;

create index if not exists appeals_linked_work_item_idx
  on civicos.appeals (linked_work_item_id)
  where linked_work_item_id is not null;

create index if not exists directives_signed_by_idx
  on civicos.directives (signed_by_id)
  where signed_by_id is not null;

create index if not exists dispatches_issued_by_officer_idx
  on civicos.dispatches (issued_by_officer_id)
  where issued_by_officer_id is not null;

create index if not exists escalations_acknowledged_by_idx
  on civicos.escalations (acknowledged_by)
  where acknowledged_by is not null;

create index if not exists escalations_linked_dispatch_idx
  on civicos.escalations (linked_dispatch_id)
  where linked_dispatch_id is not null;

create index if not exists escalations_linked_work_item_idx
  on civicos.escalations (linked_work_item_id)
  where linked_work_item_id is not null;

create index if not exists service_requests_linked_work_item_idx
  on civicos.service_requests (linked_work_item_id)
  where linked_work_item_id is not null;

create index if not exists telemetry_streams_facility_idx
  on civicos.telemetry_streams (facility_id)
  where facility_id is not null;
