-- supabase/tests/webhook_delivery_test.sql
--
-- Substrate regression tests · federation webhook delivery state machine.
--
-- Covers the circuit breaker, the cursor/failure reset on success, the
-- bounded delivery log, and secret rotation validation:
--   record_webhook_failure / mark_webhook_delivered (20260521280000/300000)
--   record_webhook_delivery_attempt trim              (20260521310000)
--   rotate_event_webhook_secret validation            (20260521360000)
--
-- These RPCs are gated to is_service_context(); run as service_role (the
-- migration / CI connection). Dependency-free; begin/rollback keeps it
-- clean. Run with:
--   psql "$SERVICE_ROLE_URL" -v ON_ERROR_STOP=1 -f supabase/tests/webhook_delivery_test.sql

begin;
set local search_path = civicos, pg_catalog;

-- ── circuit breaker trips at 10 consecutive failures ──
do $$
declare v_id uuid; v_active boolean; v_reason text;
begin
  insert into civicos.event_webhooks (channel, url, secret, failures, active)
    values ('metric', 'https://test.invalid/cb', 'secret-12345', 9, true) returning id into v_id;
  perform civicos.record_webhook_failure(v_id, 'connection refused');  -- 10th
  select active, paused_reason into v_active, v_reason from civicos.event_webhooks where id = v_id;
  if v_active then raise exception 'FAIL: breaker did not deactivate at 10 failures'; end if;
  if v_reason not like 'circuit-open%' then raise exception 'FAIL: paused_reason not circuit-open: %', v_reason; end if;

  -- a successful delivery clears the breaker
  perform civicos.mark_webhook_delivered(v_id, gen_random_uuid(), 123, 1);
  select failures, paused_reason into v_active, v_reason from civicos.event_webhooks where id = v_id; -- reuse vars loosely
  if (select failures from civicos.event_webhooks where id = v_id) <> 0 then raise exception 'FAIL: delivered did not reset failures'; end if;
  if (select paused_reason from civicos.event_webhooks where id = v_id) is not null then raise exception 'FAIL: delivered did not clear paused_reason'; end if;
  if (select cursor_at_ms from civicos.event_webhooks where id = v_id) <> 123 then raise exception 'FAIL: cursor not advanced'; end if;
  raise notice 'PASS: circuit breaker trips at 10 and clears on delivery';

  delete from civicos.event_webhooks where id = v_id;
end$$;

-- ── delivery log is trimmed to the last 50 per webhook ──
do $$
declare v_id uuid; i int; v_kept int;
begin
  insert into civicos.event_webhooks (channel, url, secret, active)
    values ('metric', 'https://test.invalid/log', 'secret-12345', true) returning id into v_id;
  for i in 1..55 loop
    perform civicos.record_webhook_delivery_attempt(v_id, 'metric', i, true, null, (i-1)*10, i*10);
  end loop;
  select count(*) into v_kept from civicos.webhook_deliveries where webhook_id = v_id;
  if v_kept <> 50 then raise exception 'FAIL: delivery log not trimmed to 50, got %', v_kept; end if;
  raise notice 'PASS: delivery log trimmed to 50';
  delete from civicos.event_webhooks where id = v_id;  -- cascades deliveries
end$$;

-- ── secret rotation rejects a short secret, preserves cursor on success ──
do $$
declare v_id uuid; v_threw boolean := false;
begin
  insert into civicos.event_webhooks (channel, url, secret, cursor_at_ms, active)
    values ('metric', 'https://test.invalid/rot', 'secret-12345', 4242, true) returning id into v_id;
  begin
    perform civicos.rotate_event_webhook_secret(v_id, 'short');
  exception when others then v_threw := true;
  end;
  if not v_threw then raise exception 'FAIL: rotation accepted a <8 char secret'; end if;

  perform civicos.rotate_event_webhook_secret(v_id, 'brand-new-secret');
  if (select secret from civicos.event_webhooks where id = v_id) <> 'brand-new-secret' then raise exception 'FAIL: secret not rotated'; end if;
  if (select cursor_at_ms from civicos.event_webhooks where id = v_id) <> 4242 then raise exception 'FAIL: rotation disturbed the cursor'; end if;
  raise notice 'PASS: secret rotation validates length and preserves cursor';
  delete from civicos.event_webhooks where id = v_id;
end$$;

rollback;
