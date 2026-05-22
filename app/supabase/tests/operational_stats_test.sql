-- supabase/tests/operational_stats_test.sql
--
-- Substrate regression tests · operational stat aggregates.
--   escalation_response_stats  (20260521470000)
--   dispatch_response_stats    (20260521530000)
--   posture_stats              (20260521480000)
--   work_item_flow_stats       (20260521490000)
--
-- Authenticated-tier; run as service_role or platform. Dependency-free;
-- begin/rollback keeps it clean. Rows are INSERTed with their terminal
-- timestamps directly, so the AFTER-UPDATE auto-resolve triggers don't fire.

begin;
set local search_path = civicos, pg_catalog;

-- ── escalation_response_stats: MTTA / MTTR ──
do $$
declare r record;
begin
  insert into civicos.escalations (source_charter_id, severity, reason, triggered_at, acknowledged_at, resolved_at) values
    ('TEST-ESC', 'minor', 'a', now()-interval '10 h', now()-interval '9 h 30 min', now()-interval '8 h'),
    ('TEST-ESC', 'minor', 'b', now()-interval '10 h', now()-interval '9 h',        now()-interval '6 h'),
    ('TEST-ESC', 'minor', 'c', now()-interval '10 h', null, null);
  select * into r from civicos.escalation_response_stats('TEST-ESC', 365);
  if r.total <> 3 or r.acknowledged <> 2 or r.resolved <> 2 or r.open <> 1 then raise exception 'FAIL esc counts'; end if;
  if r.median_ack_minutes <> 45.0 then raise exception 'FAIL esc mtta = % (want 45.0)', r.median_ack_minutes; end if;
  if r.median_resolve_hours <> 3.0 then raise exception 'FAIL esc mttr = % (want 3.0)', r.median_resolve_hours; end if;
  raise notice 'PASS: escalation_response_stats MTTA/MTTR';
end$$;

-- ── dispatch_response_stats: ack / on-scene / close medians ──
do $$
declare r record;
begin
  insert into civicos.dispatches (ref, issued_by_charter_id, kind, status, dispatched_at, acknowledged_at, on_scene_at, closed_at) values
    ('TEST-DRS-1', 'TEST-DRS', 'unit', 'closed', now()-interval '10 h', now()-interval '9 h 30 min', now()-interval '9 h', now()-interval '8 h'),
    ('TEST-DRS-2', 'TEST-DRS', 'unit', 'closed', now()-interval '10 h', now()-interval '9 h',        now()-interval '8 h', now()-interval '6 h'),
    ('TEST-DRS-3', 'TEST-DRS', 'unit', 'dispatched', now()-interval '10 h', null, null, null);
  select * into r from civicos.dispatch_response_stats('TEST-DRS', 365);
  if r.total <> 3 or r.acknowledged <> 2 or r.on_scene <> 2 or r.closed <> 2 or r.open <> 1 then raise exception 'FAIL dispatch counts'; end if;
  if r.median_ack_minutes <> 45.0 then raise exception 'FAIL dispatch ack = % (want 45.0)', r.median_ack_minutes; end if;
  if r.median_on_scene_minutes <> 90.0 then raise exception 'FAIL dispatch on-scene = % (want 90.0)', r.median_on_scene_minutes; end if;
  if r.median_close_hours <> 3.0 then raise exception 'FAIL dispatch close = % (want 3.0)', r.median_close_hours; end if;
  raise notice 'PASS: dispatch_response_stats medians';
end$$;

-- ── posture_stats: latest + averages ──
do $$
declare r record;
begin
  insert into civicos.posture_history (charter_id, posture, readiness, stress, snapshot_at) values
    ('TEST-POS', 'steady',   80, 20, now()-interval '3 d'),
    ('TEST-POS', 'steady',   60, 40, now()-interval '2 d'),
    ('TEST-POS', 'elevated', 50, 70, now()-interval '1 d');
  select * into r from civicos.posture_stats('TEST-POS', 30);
  if r.snapshots <> 3 then raise exception 'FAIL posture snapshots'; end if;
  if r.latest_stress <> 70 or r.latest_posture <> 'elevated' then raise exception 'FAIL posture latest'; end if;
  if r.avg_stress <> 43.3 then raise exception 'FAIL posture avg_stress = % (want 43.3)', r.avg_stress; end if;
  raise notice 'PASS: posture_stats latest + averages';
end$$;

-- ── work_item_flow_stats: cycle time + backlog ──
do $$
declare r record;
begin
  insert into civicos.work_items (scope, workflow_id, ref, kind, title, current_stage, originating_charter_id, closed, closed_at, created_at) values
    ('TEST-WF', 'test.flow', 'TEST-WF-1', 'case', 't', 'done', 'TEST-WFC', true,  now()-interval '18 h', now()-interval '20 h'),
    ('TEST-WF', 'test.flow', 'TEST-WF-2', 'case', 't', 'done', 'TEST-WFC', true,  now()-interval '16 h', now()-interval '20 h'),
    ('TEST-WF', 'test.flow', 'TEST-WF-3', 'case', 't', 'done', 'TEST-WFC', true,  now()-interval '10 h', now()-interval '20 h'),
    ('TEST-WF', 'test.flow', 'TEST-WF-4', 'case', 't', 'intake', 'TEST-WFC', false, null, now()-interval '50 h');
  select * into r from civicos.work_item_flow_stats('test.flow', null, 365);
  if r.opened <> 4 or r.closed <> 3 or r.open <> 1 then raise exception 'FAIL flow counts'; end if;
  if r.median_cycle_hours <> 4.0 then raise exception 'FAIL flow median cycle = % (want 4.0)', r.median_cycle_hours; end if;
  raise notice 'PASS: work_item_flow_stats cycle time + backlog';
end$$;

-- ── escalation_response_trend: weekly MTTA / MTTR ──
-- All three resolved "now" so they share one ISO week; ack minutes are
-- 30/60/90 (median 60.0) and resolve hours 2/3/4 (median 3.0), bucketed by
-- the week the escalation was resolved.
do $$
declare r record; n int;
begin
  insert into civicos.escalations (source_charter_id, severity, reason, triggered_at, acknowledged_at, resolved_at) values
    ('TEST-ERT', 'minor', 'a', now()-interval '2 h', now()-interval '90 min',  now()),
    ('TEST-ERT', 'minor', 'b', now()-interval '3 h', now()-interval '2 h',     now()),
    ('TEST-ERT', 'minor', 'c', now()-interval '4 h', now()-interval '150 min', now());
  select count(*) into n from civicos.escalation_response_trend('TEST-ERT', 12);
  if n <> 1 then raise exception 'FAIL esc trend bucket count = % (want 1)', n; end if;
  select * into r from civicos.escalation_response_trend('TEST-ERT', 12) limit 1;
  if r.week_start <> date_trunc('week', now())::date then raise exception 'FAIL esc trend week_start = %', r.week_start; end if;
  if r.resolved <> 3 then raise exception 'FAIL esc trend resolved = % (want 3)', r.resolved; end if;
  if r.median_ack_minutes <> 60.0 then raise exception 'FAIL esc trend mtta = % (want 60.0)', r.median_ack_minutes; end if;
  if r.median_resolve_hours <> 3.0 then raise exception 'FAIL esc trend mttr = % (want 3.0)', r.median_resolve_hours; end if;
  raise notice 'PASS: escalation_response_trend weekly MTTA/MTTR';
end$$;

rollback;
