-- 20260521300000_civicos_webhook_circuit_breaker.sql
--
-- Phase B · self-healing federation webhook delivery (circuit breaker).
--
-- Problem: a dead endpoint fails on every deliver-events run forever. The
-- cursor holds (correct — we don't want to skip undelivered events), but
-- the worker keeps hammering a URL that is clearly down, wastes a delivery
-- slot every run, and the only signal is an ever-growing `failures` count
-- nobody is watching.
--
-- Fix: a consecutive-failure circuit breaker. `failures` already behaves
-- as a CONSECUTIVE counter (mark_webhook_delivered resets it to 0 on any
-- 2xx). When it reaches CIRCUIT_THRESHOLD, record_webhook_failure trips
-- the breaker: it deactivates the row and stamps `paused_reason` so the
-- worker stops retrying and the platform surface shows WHY it stopped.
--
-- A platform officer resumes it with the existing set_event_webhook_active
-- toggle, which now clears the failure state for a clean restart. Manual
-- pauses are distinguished from breaker trips via paused_reason.

set search_path = civicos, pg_catalog;

alter table civicos.event_webhooks
  add column if not exists paused_reason text;

-- ── Failure capture with circuit breaker (cron / service_role) ──
create or replace function civicos.record_webhook_failure(p_id uuid, p_error text)
returns void
language plpgsql security definer
set search_path = civicos, pg_catalog
as $$
declare
  v_threshold constant int := 10;   -- consecutive failures before tripping
  v_failures int;
begin
  if not civicos.is_service_context() then
    raise exception 'record_webhook_failure requires service_role'
      using errcode = 'insufficient_privilege';
  end if;
  update civicos.event_webhooks
  set failures   = failures + 1,
      last_error = left(coalesce(p_error,'error'), 500),
      updated_at = now()
  where id = p_id
  returning failures into v_failures;

  -- Trip the breaker: deactivate so the worker skips it next run.
  if v_failures is not null and v_failures >= v_threshold then
    update civicos.event_webhooks
    set active        = false,
        paused_reason = 'circuit-open: ' || v_failures || ' consecutive delivery failures',
        updated_at    = now()
    where id = p_id and active;
  end if;
end$$;

-- ── Cursor advance clears the breaker state too (cron / service_role) ──
create or replace function civicos.mark_webhook_delivered(
  p_id uuid, p_last_event_id uuid, p_cursor_at_ms bigint, p_delivered int
) returns void
language plpgsql security definer
set search_path = civicos, pg_catalog
as $$
begin
  if not civicos.is_service_context() then
    raise exception 'mark_webhook_delivered requires service_role'
      using errcode = 'insufficient_privilege';
  end if;
  update civicos.event_webhooks
  set cursor_at_ms      = greatest(cursor_at_ms, p_cursor_at_ms),
      last_event_id     = p_last_event_id,
      last_delivered_at = now(),
      delivered_count   = delivered_count + greatest(0, p_delivered),
      failures          = 0,
      last_error        = null,
      paused_reason     = null,
      updated_at        = now()
  where id = p_id;
end$$;

-- ── Pause/resume now stamps a reason and resets state on resume ──
create or replace function civicos.set_event_webhook_active(p_id uuid, p_active boolean)
returns boolean
language plpgsql security definer
set search_path = civicos, pg_catalog
as $$
declare v_found boolean;
begin
  if not (civicos.is_service_context() or civicos.is_platform_officer()) then
    raise exception 'set_event_webhook_active requires a platform-tier role'
      using errcode = 'insufficient_privilege';
  end if;
  update civicos.event_webhooks
  set active        = p_active,
      -- resume gives the endpoint a clean slate so the breaker doesn't
      -- re-trip on the stale count; manual pause records the intent.
      failures      = case when p_active then 0    else failures end,
      last_error    = case when p_active then null else last_error end,
      paused_reason = case when p_active then null else 'manual pause' end,
      updated_at    = now()
  where id = p_id
  returning true into v_found;
  return coalesce(v_found, false);
end$$;

-- ── Listing must expose paused_reason; OUT-column change needs a drop ──
drop function if exists civicos.list_event_webhooks();
create function civicos.list_event_webhooks()
returns table(
  id uuid, channel text, url text, description text, active boolean,
  cursor_at_ms bigint, last_delivered_at timestamptz,
  delivered_count bigint, failures int, last_error text,
  paused_reason text, created_at timestamptz
)
language plpgsql security definer stable
set search_path = civicos, pg_catalog
as $$
begin
  if not (civicos.is_service_context() or civicos.is_platform_officer()) then
    raise exception 'list_event_webhooks requires a platform-tier role'
      using errcode = 'insufficient_privilege';
  end if;
  return query
    select w.id, w.channel, w.url, w.description, w.active,
           w.cursor_at_ms, w.last_delivered_at, w.delivered_count,
           w.failures, w.last_error, w.paused_reason, w.created_at
    from civicos.event_webhooks w
    order by w.created_at desc;
end$$;

drop function if exists public.civicos_list_event_webhooks();
create function public.civicos_list_event_webhooks()
returns table(
  id uuid, channel text, url text, description text, active boolean,
  cursor_at_ms bigint, last_delivered_at timestamptz,
  delivered_count bigint, failures int, last_error text,
  paused_reason text, created_at timestamptz
) language sql security definer stable set search_path = public, pg_catalog
as $$ select * from civicos.list_event_webhooks(); $$;

-- Re-lock the listing wrapper (CREATE re-applies default grants).
revoke execute on function public.civicos_list_event_webhooks() from public, anon;
grant  execute on function public.civicos_list_event_webhooks() to authenticated;
