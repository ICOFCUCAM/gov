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

  -- 5 requests for TEST-SLA: resolve cycles 2h,4h,10h (+1 open 50h, +1 cancelled); ratings 5,3,(null)
  insert into civicos.service_requests (ref, citizen_id, target_charter_id, service, status, submitted_at, acknowledged_at, resolved_at, cancelled_at, satisfaction) values
    ('TEST-SLA-1', v_cit, 'TEST-SLA', 'svc', 'resolved',  now()-interval '20 h', now()-interval '19 h', now()-interval '18 h', null, 5),
    ('TEST-SLA-2', v_cit, 'TEST-SLA', 'svc', 'resolved',  now()-interval '20 h', now()-interval '19 h', now()-interval '16 h', null, 3),
    ('TEST-SLA-3', v_cit, 'TEST-SLA', 'svc', 'resolved',  now()-interval '20 h', null,                  now()-interval '10 h', null, null),
    ('TEST-SLA-4', v_cit, 'TEST-SLA', 'svc', 'submitted', now()-interval '50 h', null, null, null, null),
    ('TEST-SLA-5', v_cit, 'TEST-SLA', 'svc', 'cancelled', now()-interval '30 h', null, null, now()-interval '25 h', null);

  select * into r from civicos.service_sla_stats('TEST-SLA', 365);
  if r.submitted <> 5 then raise exception 'FAIL sla.submitted = % (want 5)', r.submitted; end if;
  if r.resolved <> 3 then raise exception 'FAIL sla.resolved = % (want 3)', r.resolved; end if;
  if r.open <> 1 then raise exception 'FAIL sla.open = % (want 1, excludes cancelled)', r.open; end if;
  if r.cancelled <> 1 then raise exception 'FAIL sla.cancelled = % (want 1)', r.cancelled; end if;
  if r.median_resolve_hours <> 4.0 then raise exception 'FAIL sla.median_resolve = % (want 4.0)', r.median_resolve_hours; end if;
  if r.rated <> 2 then raise exception 'FAIL sla.rated = % (want 2)', r.rated; end if;
  if r.avg_satisfaction <> 4.0 then raise exception 'FAIL sla.avg_satisfaction = % (want 4.0)', r.avg_satisfaction; end if;
  raise notice 'PASS: service_sla_stats arithmetic (incl. satisfaction + cancelled)';

  -- appeals for TEST-AP: decided 2d,4d,10d (+1 pending 30d, +1 withdrawn)
  insert into civicos.appeals (ref, citizen_id, originating_charter_id, ground, status, filed_at, admitted_at, decided_at, withdrawn_at) values
    ('TEST-AP-1', v_cit, 'TEST-AP', 'g', 'decided',   now()-interval '10 d', now()-interval '9 d', now()-interval '8 d', null),
    ('TEST-AP-2', v_cit, 'TEST-AP', 'g', 'decided',   now()-interval '10 d', now()-interval '9 d', now()-interval '6 d', null),
    ('TEST-AP-3', v_cit, 'TEST-AP', 'g', 'decided',   now()-interval '10 d', now()-interval '9 d', now()-interval '0 d', null),
    ('TEST-AP-4', v_cit, 'TEST-AP', 'g', 'filed',     now()-interval '30 d', null, null, null),
    ('TEST-AP-5', v_cit, 'TEST-AP', 'g', 'withdrawn', now()-interval '20 d', null, null, now()-interval '15 d');

  select * into r from civicos.appeals_stats('TEST-AP', 365);
  if r.filed <> 5 then raise exception 'FAIL appeals.filed = % (want 5)', r.filed; end if;
  if r.decided <> 3 then raise exception 'FAIL appeals.decided = % (want 3)', r.decided; end if;
  if r.pending <> 1 then raise exception 'FAIL appeals.pending = % (want 1, excludes withdrawn)', r.pending; end if;
  if r.withdrawn <> 1 then raise exception 'FAIL appeals.withdrawn = % (want 1)', r.withdrawn; end if;
  if r.median_decision_days <> 4.0 then raise exception 'FAIL appeals.median_decision_days = % (want 4.0)', r.median_decision_days; end if;
  raise notice 'PASS: appeals_stats arithmetic (incl. withdrawn)';

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

-- ── consent_footprint_stats: active / expiring-30d / revoked by scope ──
-- The (citizen, charter, scope) unique partial index forbids two granted
-- rows for the same tuple, so distinct citizens are used. For health.records:
-- 2 active (one no-expiry, one expiring in 10d), 1 expired (past), 1 revoked.
do $$
declare c1 uuid; c2 uuid; c3 uuid; c4 uuid; c5 uuid; r record;
begin
  insert into civicos.citizens (national_id, display_name, active) values ('TEST-CF-1','p1',true) returning id into c1;
  insert into civicos.citizens (national_id, display_name, active) values ('TEST-CF-2','p2',true) returning id into c2;
  insert into civicos.citizens (national_id, display_name, active) values ('TEST-CF-3','p3',true) returning id into c3;
  insert into civicos.citizens (national_id, display_name, active) values ('TEST-CF-4','p4',true) returning id into c4;
  insert into civicos.citizens (national_id, display_name, active) values ('TEST-CF-5','p5',true) returning id into c5;
  insert into civicos.consents (citizen_id, target_charter_id, scope, status, granted_at, expires_at, revoked_at) values
    (c1, 'TEST-CF', 'health.records', 'granted', now()-interval '5 d', null, null),
    (c2, 'TEST-CF', 'health.records', 'granted', now()-interval '5 d', now()+interval '10 d', null),
    (c3, 'TEST-CF', 'health.records', 'granted', now()-interval '5 d', now()-interval '1 d', null),
    (c4, 'TEST-CF', 'health.records', 'revoked', now()-interval '5 d', null, now()-interval '2 d'),
    (c5, 'TEST-CF', 'tax.filings',    'granted', now()-interval '5 d', now()+interval '60 d', null);

  select * into r from civicos.consent_footprint_stats('TEST-CF') where scope = 'health.records';
  if r.active <> 2 then raise exception 'FAIL footprint health active = % (want 2)', r.active; end if;
  if r.expiring_30d <> 1 then raise exception 'FAIL footprint health expiring = % (want 1)', r.expiring_30d; end if;
  if r.revoked <> 1 then raise exception 'FAIL footprint health revoked = % (want 1)', r.revoked; end if;
  select * into r from civicos.consent_footprint_stats('TEST-CF') where scope = 'tax.filings';
  if r.active <> 1 or r.expiring_30d <> 0 then raise exception 'FAIL footprint tax = %/%', r.active, r.expiring_30d; end if;
  raise notice 'PASS: consent_footprint_stats active/expiring/revoked';

  delete from civicos.consents where target_charter_id = 'TEST-CF';
  delete from civicos.citizens where national_id like 'TEST-CF-%';
end$$;

-- ── directive_stats: signed / effective / in-force / rescinded + lag ──
-- 4 signed: one effective in force (lag 2d), one effective then rescinded
-- (lag 4d), one effective in the future (lag 15d, not yet in force), one
-- signed-not-effective. median effective lag = median(2,4,15) = 4.0.
do $$
declare r record;
begin
  insert into civicos.directives (ref, kind, issued_by_charter_id, title, status, signed_at, effective_at, rescinded_at) values
    ('TEST-DIR-1', 'order', 'TEST-DIR', 't', 'effective', now()-interval '10 d', now()-interval '8 d', null),
    ('TEST-DIR-2', 'order', 'TEST-DIR', 't', 'rescinded', now()-interval '10 d', now()-interval '6 d', now()-interval '1 d'),
    ('TEST-DIR-3', 'order', 'TEST-DIR', 't', 'signed',    now()-interval '10 d', now()+interval '5 d', null),
    ('TEST-DIR-4', 'order', 'TEST-DIR', 't', 'signed',    now()-interval '10 d', null, null);
  select * into r from civicos.directive_stats('TEST-DIR', 1825);
  if r.signed <> 4 then raise exception 'FAIL directive signed = % (want 4)', r.signed; end if;
  if r.effective <> 3 then raise exception 'FAIL directive effective = % (want 3)', r.effective; end if;
  if r.in_force <> 1 then raise exception 'FAIL directive in_force = % (want 1)', r.in_force; end if;
  if r.rescinded <> 1 then raise exception 'FAIL directive rescinded = % (want 1)', r.rescinded; end if;
  if r.median_sign_to_effective_days <> 4.0 then raise exception 'FAIL directive median = % (want 4.0)', r.median_sign_to_effective_days; end if;
  raise notice 'PASS: directive_stats signed/effective/in-force/rescinded';
  delete from civicos.directives where issued_by_charter_id = 'TEST-DIR';
end$$;

rollback;
