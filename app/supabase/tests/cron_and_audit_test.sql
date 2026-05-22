-- supabase/tests/cron_and_audit_test.sql
--
-- Substrate regression tests · scheduled-worker RPCs, telemetry state, and
-- the audit hash chain.
--   promote_due_directives             (20260521590000)
--   escalate_stale_telemetry_streams   (20260521450000)
--   set_telemetry_stream_active        (20260521670000)
--   append_audit + verify_audit_chain  (20260521000000)
--
-- is_service_context()-gated; run as service_role. Dependency-free;
-- begin/rollback keeps it clean.

begin;
set local search_path = civicos, pg_catalog;

-- ── promote_due_directives flips a past-due signed directive to effective ──
do $$
begin
  insert into civicos.directives (ref, kind, issued_by_charter_id, title, status, effective_at, signed_at)
    values ('TEST-DIR-DUE', 'policy', 'platform', 't', 'signed', now()-interval '1 h', now()-interval '2 h');
  -- a future-dated signed directive must NOT be promoted
  insert into civicos.directives (ref, kind, issued_by_charter_id, title, status, effective_at, signed_at)
    values ('TEST-DIR-FUTURE', 'policy', 'platform', 't', 'signed', now()+interval '7 d', now());

  perform civicos.promote_due_directives();

  if (select status from civicos.directives where ref = 'TEST-DIR-DUE') <> 'effective' then
    raise exception 'FAIL: due directive not promoted'; end if;
  if (select status from civicos.directives where ref = 'TEST-DIR-FUTURE') <> 'signed' then
    raise exception 'FAIL: future-dated directive wrongly promoted'; end if;
  raise notice 'PASS: promote_due_directives promotes only past-due signed directives';
  delete from civicos.directives where ref in ('TEST-DIR-DUE','TEST-DIR-FUTURE');
end$$;

-- ── escalate_stale_telemetry_streams flags a silent active stream ──
do $$
declare v_n int;
begin
  insert into civicos.telemetry_streams (stream_id, charter_id, label, active)
    values ('test.silent.stream', 'TEST-TEL', 'silent', true);
  -- no samples → silent
  v_n := civicos.escalate_stale_telemetry_streams(60);
  if not exists (
    select 1 from civicos.escalations
    where source_charter_id = 'TEST-TEL' and reason like 'stale telemetry stream test.silent.stream%'
  ) then raise exception 'FAIL: silent stream did not escalate'; end if;
  raise notice 'PASS: escalate_stale_telemetry_streams flags a silent stream';
  delete from civicos.escalations where source_charter_id = 'TEST-TEL';
  delete from civicos.telemetry_streams where stream_id = 'test.silent.stream';
end$$;

-- ── set_telemetry_stream_active deactivation drops it from fleet status ──
do $$
begin
  insert into civicos.telemetry_streams (stream_id, charter_id, label, active)
    values ('test.toggle.stream', 'TEST-TEL', 'toggle', true);
  perform civicos.set_telemetry_stream_active('test.toggle.stream', false);
  if exists (select 1 from civicos.telemetry_fleet_status('TEST-TEL', 60) where stream_id = 'test.toggle.stream') then
    raise exception 'FAIL: deactivated stream still in fleet status';
  end if;
  raise notice 'PASS: deactivated telemetry stream leaves fleet status';
  delete from civicos.telemetry_streams where stream_id = 'test.toggle.stream';
end$$;

-- ── append_audit builds a chain that verify_audit_chain reports intact ──
do $$
declare r record;
begin
  perform civicos.append_audit('test:chain', 'tester', 'a', 's1', 'one');
  perform civicos.append_audit('test:chain', 'tester', 'b', 's2', 'two');
  perform civicos.append_audit('test:chain', 'tester', 'c', 's3', 'three');
  select * into r from civicos.verify_audit_chain('test:chain');
  if r.entries <> 3 then raise exception 'FAIL: chain length % (want 3)', r.entries; end if;
  if not r.intact then raise exception 'FAIL: fresh chain reported not intact (broken at %)', r.broken_at; end if;
  raise notice 'PASS: append_audit chain verifies intact';
  -- (audit_entries is append-only; the enclosing rollback discards these.)
end$$;

rollback;
