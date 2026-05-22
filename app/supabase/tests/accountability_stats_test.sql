-- supabase/tests/accountability_stats_test.sql
--
-- Substrate regression tests · public accountability aggregates.
--
-- Pins the arithmetic of the anon-callable aggregate RPCs so a future change
-- can't silently skew the published numbers:
--   service_sla_stats  (incl. satisfaction)  (20260521400000 / 620000)
--   appeals_stats                            (20260521410000)
--
-- Dependency-free; begin/rollback keeps it clean. Fabricates one citizen and
-- a fixed set of requests/appeals with known timings, then asserts the
-- aggregates exactly. Run with:
--   psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f supabase/tests/accountability_stats_test.sql

begin;
set local search_path = civicos, pg_catalog;

do $$
declare
  v_cit uuid;
  r record;
begin
  insert into civicos.citizens (national_id, display_name, active)
    values ('TEST-STATS-CIT', 'Stats Probe', true) returning id into v_cit;

  -- 4 requests for TEST-SLA: resolve cycles 2h,4h,10h (+1 open 50h); ratings 5,3,(null)
  insert into civicos.service_requests (ref, citizen_id, target_charter_id, service, status, submitted_at, acknowledged_at, resolved_at, satisfaction) values
    ('TEST-SLA-1', v_cit, 'TEST-SLA', 'svc', 'resolved', now()-interval '20 h', now()-interval '19 h', now()-interval '18 h', 5),
    ('TEST-SLA-2', v_cit, 'TEST-SLA', 'svc', 'resolved', now()-interval '20 h', now()-interval '19 h', now()-interval '16 h', 3),
    ('TEST-SLA-3', v_cit, 'TEST-SLA', 'svc', 'resolved', now()-interval '20 h', null,                  now()-interval '10 h', null),
    ('TEST-SLA-4', v_cit, 'TEST-SLA', 'svc', 'submitted', now()-interval '50 h', null, null, null);

  select * into r from civicos.service_sla_stats('TEST-SLA', 365);
  if r.submitted <> 4 then raise exception 'FAIL sla.submitted = % (want 4)', r.submitted; end if;
  if r.resolved <> 3 then raise exception 'FAIL sla.resolved = % (want 3)', r.resolved; end if;
  if r.open <> 1 then raise exception 'FAIL sla.open = % (want 1)', r.open; end if;
  if r.median_resolve_hours <> 4.0 then raise exception 'FAIL sla.median_resolve = % (want 4.0)', r.median_resolve_hours; end if;
  if r.rated <> 2 then raise exception 'FAIL sla.rated = % (want 2)', r.rated; end if;
  if r.avg_satisfaction <> 4.0 then raise exception 'FAIL sla.avg_satisfaction = % (want 4.0)', r.avg_satisfaction; end if;
  raise notice 'PASS: service_sla_stats arithmetic (incl. satisfaction)';

  -- appeals for TEST-AP: decided 2d,4d,10d (+1 pending 30d)
  insert into civicos.appeals (ref, citizen_id, originating_charter_id, ground, status, filed_at, admitted_at, decided_at) values
    ('TEST-AP-1', v_cit, 'TEST-AP', 'g', 'decided', now()-interval '10 d', now()-interval '9 d', now()-interval '8 d'),
    ('TEST-AP-2', v_cit, 'TEST-AP', 'g', 'decided', now()-interval '10 d', now()-interval '9 d', now()-interval '6 d'),
    ('TEST-AP-3', v_cit, 'TEST-AP', 'g', 'decided', now()-interval '10 d', now()-interval '9 d', now()-interval '0 d'),
    ('TEST-AP-4', v_cit, 'TEST-AP', 'g', 'filed',   now()-interval '30 d', null, null);

  select * into r from civicos.appeals_stats('TEST-AP', 365);
  if r.filed <> 4 then raise exception 'FAIL appeals.filed = % (want 4)', r.filed; end if;
  if r.decided <> 3 then raise exception 'FAIL appeals.decided = % (want 3)', r.decided; end if;
  if r.pending <> 1 then raise exception 'FAIL appeals.pending = % (want 1)', r.pending; end if;
  if r.median_decision_days <> 4.0 then raise exception 'FAIL appeals.median_decision_days = % (want 4.0)', r.median_decision_days; end if;
  raise notice 'PASS: appeals_stats arithmetic';

  -- cleanup (begin/rollback also covers this; explicit for non-tx runners)
  delete from civicos.appeals where citizen_id = v_cit;
  delete from civicos.service_requests where citizen_id = v_cit;
  delete from civicos.citizens where id = v_cit;
end$$;

-- ── appeals_trend: weekly decided buckets + median decision days ──
-- All three decided "now" so they share one ISO week; decision days are
-- 2/4/10 (median 4.0), bucketed by the week the appeal was decided.
do $$
declare
  v_cit uuid;
  r record;
  n  int;
begin
  insert into civicos.citizens (national_id, display_name, active)
    values ('TEST-APT-CIT', 'Appeals Trend Probe', true) returning id into v_cit;

  insert into civicos.appeals (ref, citizen_id, originating_charter_id, ground, status, filed_at, admitted_at, decided_at) values
    ('TEST-APT-1', v_cit, 'TEST-APT', 'g', 'decided', now()-interval '2 d',  now()-interval '2 d',  now()),
    ('TEST-APT-2', v_cit, 'TEST-APT', 'g', 'decided', now()-interval '4 d',  now()-interval '4 d',  now()),
    ('TEST-APT-3', v_cit, 'TEST-APT', 'g', 'decided', now()-interval '10 d', now()-interval '10 d', now());

  select count(*) into n from civicos.appeals_trend('TEST-APT', 12);
  if n <> 1 then raise exception 'FAIL appeals_trend bucket count = % (want 1)', n; end if;

  select * into r from civicos.appeals_trend('TEST-APT', 12) limit 1;
  if r.week_start <> date_trunc('week', now())::date then raise exception 'FAIL appeals_trend week_start = %', r.week_start; end if;
  if r.decided <> 3 then raise exception 'FAIL appeals_trend decided = % (want 3)', r.decided; end if;
  if r.median_decision_days <> 4.0 then raise exception 'FAIL appeals_trend median = % (want 4.0)', r.median_decision_days; end if;
  raise notice 'PASS: appeals_trend weekly buckets + median';

  delete from civicos.appeals where citizen_id = v_cit;
  delete from civicos.citizens where id = v_cit;
end$$;

rollback;
