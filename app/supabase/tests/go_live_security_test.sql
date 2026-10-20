-- supabase/tests/go_live_security_test.sql
--
-- Substrate regression tests · go-live review H-1, H-2, M-5.
--   is_service_context() not fooled by SECURITY DEFINER   (20261024090000)
--   witness attestations: platform only, registered key,
--     signature required, insert-only                      (20261024100000)
--   cron_call: no fallback host, skips say why             (20261024110000)
--   event webhooks: administrators only, address checked   (20261024120000)
--
-- Runs as the migration connection (postgres); switches to anon /
-- authenticated with SET LOCAL SESSION AUTHORIZATION to act as API callers.
-- begin/rollback keeps it clean.

begin;
set local search_path = civicos, pg_catalog;

-- Fixtures: an auditor and an administrator of the platform tier.
insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-00000000a0d1', 'auditor@test.invalid'),
  ('00000000-0000-0000-0000-00000000ad01', 'admin@test.invalid'),
  ('00000000-0000-0000-0000-00000000c171', 'citizen@test.invalid');
insert into civicos.officers (auth_user_id, role, name, email) values
  ('00000000-0000-0000-0000-00000000a0d1', 'auditor', 'Test Auditor', 'auditor@test.invalid'),
  ('00000000-0000-0000-0000-00000000ad01', 'platform-admin', 'Test Admin', 'admin@test.invalid');

-- ════ H-1 · witness attestations ════

-- The write RPC is no longer callable by anon or authenticated.
do $$
begin
  if has_function_privilege('anon', 'public.civicos_record_witness_attestation(text,bigint,text,text,jsonb,text)', 'execute') then
    raise exception 'FAIL: anon can still execute civicos_record_witness_attestation'; end if;
  if has_function_privilege('authenticated', 'public.civicos_record_witness_attestation(text,bigint,text,text,jsonb,text)', 'execute') then
    raise exception 'FAIL: authenticated can still execute civicos_record_witness_attestation'; end if;
  if not has_function_privilege('service_role', 'public.civicos_record_witness_attestation(text,bigint,text,text,jsonb,text)', 'execute') then
    raise exception 'FAIL: service_role lost execute on civicos_record_witness_attestation'; end if;
  if has_function_privilege('anon', 'public.civicos_register_witness_key(text,jsonb,text)', 'execute')
     or has_function_privilege('authenticated', 'public.civicos_register_witness_key(text,jsonb,text)', 'execute') then
    raise exception 'FAIL: API callers can register witness keys'; end if;
  raise notice 'PASS: witness write RPCs are service-role only';
end$$;

-- An anonymous caller is refused outright.
set local session authorization anon;
do $$
declare v_refused boolean := false;
begin
  begin
    perform public.civicos_record_witness_attestation('x', 1, 'h', 'forger', null, null);
  exception when insufficient_privilege then v_refused := true;
  end;
  if not v_refused then raise exception 'FAIL: anon recorded a witness attestation'; end if;
  raise notice 'PASS: anon cannot record a witness attestation';
end$$;
reset session authorization;

-- Signature and registered key are required; rows are insert-only.
do $$
declare
  v_jwk   jsonb := '{"kty":"EC","crv":"P-256","x":"AAAA","y":"BBBB"}';
  v_other jsonb := '{"kty":"EC","crv":"P-256","x":"CCCC","y":"DDDD"}';
  v_sig   text  := repeat('ab', 64);
  v_key   civicos.audit_witness_keys;
  v_row   civicos.audit_witnesses;
  v_threw boolean;
begin
  -- no signature
  v_threw := false;
  begin perform civicos.record_witness_attestation('t:scope', 1, 'h1', 'auditor-1', v_jwk, null);
  exception when others then v_threw := true; end;
  if not v_threw then raise exception 'FAIL: unsigned attestation accepted'; end if;

  -- signature of the wrong shape
  v_threw := false;
  begin perform civicos.record_witness_attestation('t:scope', 1, 'h1', 'auditor-1', v_jwk, '0011');
  exception when others then v_threw := true; end;
  if not v_threw then raise exception 'FAIL: malformed signature accepted'; end if;

  -- no registered key for the label
  v_threw := false;
  begin perform civicos.record_witness_attestation('t:scope', 1, 'h1', 'auditor-1', v_jwk, v_sig);
  exception when insufficient_privilege then v_threw := true; end;
  if not v_threw then raise exception 'FAIL: attestation accepted without a registered key'; end if;

  -- a private key is refused at registration
  v_threw := false;
  begin perform civicos.register_witness_key('auditor-1', v_jwk || '{"d":"secret"}', 'Test Admin');
  exception when others then v_threw := true; end;
  if not v_threw then raise exception 'FAIL: private JWK registered'; end if;

  v_key := civicos.register_witness_key('auditor-1', v_jwk, 'Test Admin');
  if v_key.id is null then raise exception 'FAIL: key not registered'; end if;

  -- a different key under the same label is still refused
  v_threw := false;
  begin perform civicos.record_witness_attestation('t:scope', 1, 'h1', 'auditor-1', v_other, v_sig);
  exception when insufficient_privilege then v_threw := true; end;
  if not v_threw then raise exception 'FAIL: attestation accepted with an unregistered key'; end if;

  v_row := civicos.record_witness_attestation('t:scope', 1, 'h1', 'auditor-1', v_jwk, v_sig);
  if v_row.key_id is distinct from v_key.id then raise exception 'FAIL: attestation not tied to its key'; end if;

  -- a second statement for the same (scope, seq, label) is refused, the first is kept
  v_threw := false;
  begin perform civicos.record_witness_attestation('t:scope', 1, 'FORGED', 'auditor-1', v_jwk, v_sig);
  exception when unique_violation then v_threw := true; end;
  if not v_threw then raise exception 'FAIL: attestation overwritten'; end if;
  if (select observed_hash from civicos.audit_witnesses where scope = 't:scope' and observed_seq = 1 and witness_label = 'auditor-1') <> 'h1' then
    raise exception 'FAIL: original attestation changed'; end if;

  -- UPDATE and DELETE are refused even for the owner
  v_threw := false;
  begin update civicos.audit_witnesses set observed_hash = 'X' where id = v_row.id;
  exception when insufficient_privilege then v_threw := true; end;
  if not v_threw then raise exception 'FAIL: attestation updated'; end if;
  v_threw := false;
  begin delete from civicos.audit_witnesses where id = v_row.id;
  exception when insufficient_privilege then v_threw := true; end;
  if not v_threw then raise exception 'FAIL: attestation deleted'; end if;

  -- a revoked key no longer attests
  perform civicos.revoke_witness_key(v_key.id, 'Test Admin');
  v_threw := false;
  begin perform civicos.record_witness_attestation('t:scope', 2, 'h2', 'auditor-1', v_jwk, v_sig);
  exception when insufficient_privilege then v_threw := true; end;
  if not v_threw then raise exception 'FAIL: revoked key attested'; end if;

  -- an older unsigned row (written before this change) is history, never "signed"
  insert into civicos.audit_witnesses (scope, observed_seq, observed_hash, witness_label)
    values ('t:scope', 9, 'legacy', 'old-witness');
  if exists (select 1 from public.civicos_signed_witnesses where witness_label = 'old-witness') then
    raise exception 'FAIL: unsigned row listed as signed'; end if;
  if not exists (select 1 from public.civicos_signed_witnesses where id = v_row.id and public_jwk = v_jwk) then
    raise exception 'FAIL: signed row missing from civicos_signed_witnesses'; end if;
  if (select registered_key from public.civicos_audit_witnesses where witness_label = 'old-witness') then
    raise exception 'FAIL: legacy row reported as registered'; end if;

  raise notice 'PASS: attestations need a registered key and a signature, and are insert-only';
end$$;

-- ════ M-5 · is_service_context() and webhook registration ════

-- A signed-in user with no officer record: not the service, cannot register.
set local session authorization authenticated;
set local request.jwt.claims = '{"role":"authenticated","sub":"00000000-0000-0000-0000-00000000c171"}';
do $$
declare v_refused boolean := false;
begin
  begin
    perform public.civicos_register_event_webhook('metric', 'https://hooks.test.invalid/a', '12345678', null);
  exception when insufficient_privilege then v_refused := true;
  end;
  if not v_refused then raise exception 'FAIL: a plain signed-in user registered a webhook (definer bypass)'; end if;
  raise notice 'PASS: is_service_context() is not satisfied inside a definer RPC';
end$$;

-- An auditor (platform tier, read only) cannot register, pause or rotate.
set local request.jwt.claims = '{"role":"authenticated","sub":"00000000-0000-0000-0000-00000000a0d1"}';
do $$
declare v_refused int := 0;
begin
  begin perform public.civicos_register_event_webhook('metric', 'https://hooks.test.invalid/a', '12345678', null);
  exception when insufficient_privilege then v_refused := v_refused + 1; end;
  begin perform public.civicos_set_event_webhook_active(gen_random_uuid(), false);
  exception when insufficient_privilege then v_refused := v_refused + 1; end;
  begin perform public.civicos_rotate_event_webhook_secret(gen_random_uuid(), 'new-secret-123');
  exception when insufficient_privilege then v_refused := v_refused + 1; end;
  if v_refused <> 3 then raise exception 'FAIL: auditor allowed % of 3 webhook changes', 3 - v_refused; end if;
  raise notice 'PASS: auditors cannot register, pause or rotate webhooks';
end$$;

-- An administrator can, but not to loopback / metadata / credentialed addresses.
set local request.jwt.claims = '{"role":"authenticated","sub":"00000000-0000-0000-0000-00000000ad01"}';
do $$
declare v_id uuid; v_bad text; v_refused int := 0;
begin
  v_id := public.civicos_register_event_webhook('metric', 'https://hooks.test.invalid/a', '12345678', null);
  if v_id is null then raise exception 'FAIL: administrator could not register a webhook'; end if;
  foreach v_bad in array array[
    'http://169.254.169.254/latest/meta-data/', 'http://127.0.0.1:4000/x', 'http://localhost/x',
    'http://[::1]/x', 'https://user:pw@hooks.test.invalid/', 'ftp://hooks.test.invalid/', 'gopher://x', 'https://'
  ] loop
    begin perform public.civicos_register_event_webhook('metric', v_bad, '12345678', null);
    exception when check_violation then v_refused := v_refused + 1; end;
  end loop;
  if v_refused <> 8 then raise exception 'FAIL: % of 8 bad webhook addresses accepted', 8 - v_refused; end if;
  raise notice 'PASS: administrators register webhooks; bad addresses refused';
end$$;
reset session authorization;

-- ════ H-2 · cron_call never sends the secret without a configured base URL ════

do $$
begin
  if has_function_privilege('anon', 'civicos.cron_call(text,text,text)', 'execute')
     or has_function_privilege('authenticated', 'civicos.cron_call(text,text,text)', 'execute') then
    raise exception 'FAIL: API callers can execute cron_call'; end if;
  raise notice 'PASS: cron_call is not callable through the API';
end$$;

-- Stand-ins for Supabase Vault and pg_net, only where the real ones are absent.
do $$
begin
  if to_regnamespace('vault') is null then
    create schema vault;
    create table vault.decrypted_secrets (name text primary key, decrypted_secret text);
  end if;
  if to_regnamespace('net') is null then
    create schema net;
    create table net._calls (url text, headers jsonb, method text);
    create function net.http_get(url text, params jsonb default '{}', headers jsonb default '{}', timeout_milliseconds int default 5000)
      returns bigint language sql as $f$ insert into net._calls values (url, headers, 'GET') returning 1::bigint $f$;
    create function net.http_post(url text, body jsonb default '{}', params jsonb default '{}', headers jsonb default '{}', timeout_milliseconds int default 5000)
      returns bigint language sql as $f$ insert into net._calls values (url, headers, 'POST') returning 1::bigint $f$;
  end if;
end$$;

do $$
declare v_stub boolean := to_regclass('net._calls') is not null;
        v_vault_stub boolean := (select count(*) = 0 from pg_views where schemaname = 'vault' and viewname = 'decrypted_secrets');
        v_ret bigint; v_reason text;
begin
  if not v_stub or not v_vault_stub then
    raise notice 'SKIP: real Vault / pg_net present; cron_call behaviour checked only on a plain Postgres';
    return;
  end if;

  -- 1. nothing seeded: no call, reason recorded
  delete from vault.decrypted_secrets;
  v_ret := civicos.cron_call('t-job', '/api/cron/witness-sweep');
  if v_ret is not null or exists (select 1 from net._calls) then raise exception 'FAIL: cron_call sent a request with nothing seeded'; end if;
  select reason into v_reason from civicos.cron_skips where job = 't-job';
  if v_reason is null or v_reason not like '%civicos_base_url is not set%' then raise exception 'FAIL: skip reason not recorded: %', v_reason; end if;

  -- 2. the cron secret alone (the old fallback case): still nothing is sent anywhere
  insert into vault.decrypted_secrets values ('civicos_cron_secret', 'the-nations-secret');
  v_ret := civicos.cron_call('t-job', '/api/cron/witness-sweep');
  if v_ret is not null or exists (select 1 from net._calls) then raise exception 'FAIL: secret sent without a base URL'; end if;
  if (select skipped from civicos.cron_skips where job = 't-job') <> 2 then raise exception 'FAIL: skip count not kept'; end if;

  -- 3. a base URL that is not a plain origin is refused
  insert into vault.decrypted_secrets values ('civicos_base_url', 'https://user:pw@evil.test.invalid/path');
  v_ret := civicos.cron_call('t-job', '/api/cron/witness-sweep');
  if v_ret is not null or exists (select 1 from net._calls) then raise exception 'FAIL: secret sent to a malformed base URL'; end if;

  -- 4. a proper base URL: one call, to that host only, skip row cleared
  update vault.decrypted_secrets set decrypted_secret = 'https://gov.nation.test.invalid/' where name = 'civicos_base_url';
  v_ret := civicos.cron_call('t-job', '/api/cron/witness-sweep');
  if (select count(*) from net._calls) <> 1 then raise exception 'FAIL: expected exactly one call'; end if;
  if (select url from net._calls) <> 'https://gov.nation.test.invalid/api/cron/witness-sweep' then
    raise exception 'FAIL: wrong URL %', (select url from net._calls); end if;
  if (select headers->>'Authorization' from net._calls) <> 'Bearer the-nations-secret' then raise exception 'FAIL: secret not sent as bearer'; end if;
  -- the scheduled slot as the run key, so a doubled call changes nothing twice (20261027010000)
  if (select headers->>'X-CivicOS-Scheduler' from net._calls) is distinct from 'pg_cron'
     or (select headers->>'X-CivicOS-Run-Key' from net._calls) !~ '^slot:[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}Z$' then
    raise exception 'FAIL: scheduler and run key headers not sent: %', (select headers from net._calls); end if;
  if exists (select 1 from civicos.cron_skips where job = 't-job') then raise exception 'FAIL: skip row not cleared after a run'; end if;

  -- 5. POST jobs
  perform civicos.cron_call('t-post', '/api/cron/sla', 'POST');
  if not exists (select 1 from net._calls where method = 'POST' and url like 'https://gov.nation.test.invalid/api/cron/sla') then
    raise exception 'FAIL: POST job not sent'; end if;

  -- 6. only cron paths
  begin
    perform civicos.cron_call('t-x', 'https://elsewhere.test.invalid/steal');
    raise exception 'FAIL: arbitrary path accepted';
  exception when raise_exception then
    if sqlerrm like 'FAIL:%' then raise; end if;
  end;
  raise notice 'PASS: cron_call sends nothing until the base URL is set, and only there';
end$$;

-- (supabase/cron/schedule.sql itself — no fallback host, every job through
-- cron_call — is checked by src/lib/ops/cron-schedule.test.ts.)

rollback;
