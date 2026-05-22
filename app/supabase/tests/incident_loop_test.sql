-- supabase/tests/incident_loop_test.sql
--
-- Substrate regression tests · incident-loop triggers.
--
-- Covers the two AFTER-UPDATE triggers that auto-resolve an escalation when
-- the response linked to it closes:
--   • dispatch_close_resolves_escalation   (20260521690000)
--   • work_item_close_resolves_escalation  (20260521700000)
--
-- Dependency-free: plain SQL with DO-block assertions that RAISE on failure,
-- wrapped in begin/rollback so the run never persists data. Run with:
--   psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f supabase/tests/incident_loop_test.sql
-- A clean run prints the NOTICE lines and commits nothing; any failure
-- aborts with a non-zero exit.

begin;
set local search_path = civicos, pg_catalog;

-- ── dispatch close → linked escalation resolves ──
do $$
declare v_disp uuid; v_esc uuid; v_resolved timestamptz; v_ack timestamptz;
begin
  insert into civicos.dispatches (ref, issued_by_charter_id, kind, status)
    values ('TEST-IL-DSP', 'platform', 'unit-deploy', 'dispatched') returning id into v_disp;
  insert into civicos.escalations (source_charter_id, severity, reason, linked_dispatch_id)
    values ('platform', 'minor', 'test incident', v_disp) returning id into v_esc;

  -- precondition: open
  if (select resolved_at from civicos.escalations where id = v_esc) is not null then
    raise exception 'FAIL: escalation should start unresolved';
  end if;

  update civicos.dispatches set closed_at = now(), status = 'closed' where id = v_disp;

  select resolved_at, acknowledged_at into v_resolved, v_ack
    from civicos.escalations where id = v_esc;
  if v_resolved is null then raise exception 'FAIL: dispatch close did not resolve linked escalation'; end if;
  if v_ack is null then raise exception 'FAIL: dispatch close did not backfill acknowledged_at'; end if;
  raise notice 'PASS: dispatch close resolves + acknowledges linked escalation';
end$$;

-- ── work item close → linked escalation resolves ──
do $$
declare v_wi uuid; v_esc uuid; v_resolved timestamptz;
begin
  insert into civicos.work_items (scope, workflow_id, ref, kind, title, current_stage)
    values ('platform', 'wf.test', 'TEST-IL-WI', 'case', 'test', 'intake') returning id into v_wi;
  insert into civicos.escalations (source_charter_id, severity, reason, linked_work_item_id)
    values ('platform', 'minor', 'test incident', v_wi) returning id into v_esc;

  update civicos.work_items set closed = true, closed_at = now() where id = v_wi;

  select resolved_at into v_resolved from civicos.escalations where id = v_esc;
  if v_resolved is null then raise exception 'FAIL: work item close did not resolve linked escalation'; end if;
  raise notice 'PASS: work item close resolves linked escalation';
end$$;

-- ── an UNlinked escalation is NOT touched when an unrelated dispatch closes ──
do $$
declare v_disp uuid; v_esc uuid;
begin
  insert into civicos.dispatches (ref, issued_by_charter_id, kind, status)
    values ('TEST-IL-DSP2', 'platform', 'unit-deploy', 'dispatched') returning id into v_disp;
  insert into civicos.escalations (source_charter_id, severity, reason)
    values ('platform', 'minor', 'unrelated incident') returning id into v_esc;

  update civicos.dispatches set closed_at = now(), status = 'closed' where id = v_disp;

  if (select resolved_at from civicos.escalations where id = v_esc) is not null then
    raise exception 'FAIL: unrelated escalation must not be resolved by a dispatch close';
  end if;
  raise notice 'PASS: unrelated escalation untouched';
end$$;

rollback;
