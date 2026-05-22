-- supabase/tests/federation_cascade_test.sql
--
-- Substrate regression test · escalation cascade propagation (Phase C).
--
-- Pins the AFTER-INSERT trigger on civicos.escalations: a major/national
-- escalation against a registered institution emits an `escalation.cascade`
-- federation event to each dependent charter along PROVIDES/MUTUAL edges
-- (never CONSUMES), and minor/watch escalations do not cascade.
--
-- Dependency-free; begin/rollback keeps it clean. Run with:
--   psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f supabase/tests/federation_cascade_test.sql

begin;
set local search_path = civicos, pg_catalog;

do $$
declare
  v_esc uuid;
  n_total int; n_transport int; n_generic int; n_finance int;
begin
  -- HEALTH provides→GENERIC, mutual↔TRANSPORT, consumes←FINANCE.
  insert into civicos.institutions (charter_id, label, kind, domain, archetype_or_branch, activated) values
    ('CAS-HEALTH',    'H', 'ministry', 'cas-health',    'HEALTH',    true),
    ('CAS-TRANSPORT', 'T', 'ministry', 'cas-transport', 'TRANSPORT', true),
    ('CAS-GENERIC',   'G', 'branch',   'cas-generic',   'GENERIC',   true),
    ('CAS-FINANCE',   'F', 'ministry', 'cas-finance',   'FINANCE',   true);

  insert into civicos.escalations (source_charter_id, severity, reason, triggered_at)
    values ('CAS-HEALTH', 'major', 'cascade probe', now()) returning id into v_esc;

  select count(*) into n_total     from civicos.federation_events where source = 'escalation:'||v_esc::text;
  select count(*) into n_transport from civicos.federation_events where source='escalation:'||v_esc::text and target='CAS-TRANSPORT';
  select count(*) into n_generic   from civicos.federation_events where source='escalation:'||v_esc::text and target='CAS-GENERIC';
  select count(*) into n_finance   from civicos.federation_events where source='escalation:'||v_esc::text and target='CAS-FINANCE';

  if n_transport <> 1 then raise exception 'FAIL cascade→transport (mutual) = % (want 1)', n_transport; end if;
  if n_generic   <> 1 then raise exception 'FAIL cascade→generic (provides) = % (want 1)', n_generic; end if;
  if n_finance   <> 0 then raise exception 'FAIL cascade→finance (consumes, must NOT cascade) = % (want 0)', n_finance; end if;
  if n_total     <> 2 then raise exception 'FAIL cascade total = % (want 2)', n_total; end if;

  -- minor severity must not cascade
  insert into civicos.escalations (source_charter_id, severity, reason, triggered_at)
    values ('CAS-HEALTH', 'minor', 'no cascade', now()) returning id into v_esc;
  select count(*) into n_total from civicos.federation_events where source='escalation:'||v_esc::text;
  if n_total <> 0 then raise exception 'FAIL minor escalation cascaded = % (want 0)', n_total; end if;

  -- escalation against a non-institution charter must not cascade
  insert into civicos.escalations (source_charter_id, severity, reason, triggered_at)
    values ('CAS-UNKNOWN', 'national', 'orphan', now()) returning id into v_esc;
  select count(*) into n_total from civicos.federation_events where source='escalation:'||v_esc::text;
  if n_total <> 0 then raise exception 'FAIL orphan escalation cascaded = % (want 0)', n_total; end if;

  raise notice 'PASS: escalation cascade — provides/mutual only, severity-gated, institution-gated';
end$$;

rollback;
