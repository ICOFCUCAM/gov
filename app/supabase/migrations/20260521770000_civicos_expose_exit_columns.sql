-- 20260521770000_civicos_expose_exit_columns.sql
--
-- Phase B · expose the citizen-exit columns on the read views.
--
-- The previous two migrations added civicos.service_requests.cancelled_at
-- (760000) and civicos.appeals.withdrawn_at (750000) to the base tables, but
-- the public read views (civicos_service_requests / civicos_appeals) have a
-- frozen explicit column list — a `select *`-style view does not pick up new
-- columns automatically. So PostgREST never surfaced them: the wallet's
-- withdrawn/cancelled reads came back undefined and any filter on those
-- columns errored. This recreates both views with the new column appended,
-- preserving security_invoker so RLS on the base table still governs
-- visibility.

set search_path = civicos, pg_catalog;

create or replace view public.civicos_service_requests
with (security_invoker = true) as
  select id, ref, citizen_id, target_charter_id, service, domain, title, status,
         payload, linked_work_item_id, submitted_at, acknowledged_at, resolved_at,
         satisfaction, created_at, updated_at, cancelled_at
  from civicos.service_requests;

create or replace view public.civicos_appeals
with (security_invoker = true) as
  select id, ref, citizen_id, originating_charter_id, originating_decision_ref,
         ground, status, decision, reasoning, linked_work_item_id, filed_at,
         admitted_at, heard_at, decided_at, published_at, created_at, updated_at,
         withdrawn_at
  from civicos.appeals;
