-- 20260521270000_civicos_event_webhooks.sql
--
-- Phase B · outbound federation webhook delivery.
--
-- External systems subscribe to a federation channel and receive each
-- new event as an HMAC-signed HTTP POST. The delivery pipeline:
--
--   civicos.event_webhooks  — service-role-only config + per-sub cursor.
--   register_event_webhook  — platform-tier registration RPC.
--   list_event_webhooks     — SECRET-FREE listing RPC (platform-tier).
--   mark_webhook_delivered  — advance the cursor after a 2xx (cron only).
--   record_webhook_failure  — capture a non-2xx / error (cron only).
--
-- The secret never leaves the table except to the service-role delivery
-- worker. The base table has RLS enabled with NO anon/authenticated
-- policies, so only service_role (which bypasses RLS) and the SECURITY
-- DEFINER RPCs can touch it — there is no path by which a browser can
-- read the secret. (Postgres RLS is row-level, not column-level, so
-- column hiding is done by the secret-free listing RPC, not a view.)

set search_path = civicos, pg_catalog;

create table if not exists civicos.event_webhooks (
  id                uuid primary key default gen_random_uuid(),
  channel           text not null,
  url               text not null,
  secret            text not null,
  description       text,
  active            boolean not null default true,
  cursor_at_ms      bigint not null default 0,   -- highest delivered event at_ms
  last_event_id     uuid,
  last_delivered_at timestamptz,
  delivered_count   bigint not null default 0,
  failures          int not null default 0,
  last_error        text,
  created_by        text,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

create index if not exists event_webhooks_active_channel_idx
  on civicos.event_webhooks (channel) where active;

alter table civicos.event_webhooks enable row level security;
-- Intentionally NO policies: anon/authenticated have no access. service_role
-- bypasses RLS; the SECURITY DEFINER RPCs below are the only sanctioned
-- path for everyone else.

-- ── Registration (platform-tier / service_role) ──
create or replace function civicos.register_event_webhook(
  p_channel text, p_url text, p_secret text, p_description text default null
) returns uuid
language plpgsql security definer
set search_path = civicos, pg_catalog
as $$
declare
  v_id uuid;
  v_privileged boolean := session_user in ('service_role','postgres') or civicos.is_platform_officer();
begin
  if not v_privileged then
    raise exception 'register_event_webhook requires a platform-tier role'
      using errcode = 'insufficient_privilege';
  end if;
  if p_channel is null or length(p_channel)=0 or p_url is null or length(p_url)=0
     or p_secret is null or length(p_secret) < 8 then
    raise exception 'channel, url required; secret must be >= 8 chars';
  end if;
  insert into civicos.event_webhooks (channel, url, secret, description, created_by)
  values (p_channel, p_url, p_secret, p_description,
          coalesce((select name from civicos.officers where auth_user_id = auth.uid()), session_user))
  returning id into v_id;
  return v_id;
end$$;

-- ── Secret-free listing (platform-tier / service_role) ──
create or replace function civicos.list_event_webhooks()
returns table(
  id uuid, channel text, url text, description text, active boolean,
  cursor_at_ms bigint, last_delivered_at timestamptz,
  delivered_count bigint, failures int, last_error text, created_at timestamptz
)
language plpgsql security definer stable
set search_path = civicos, pg_catalog
as $$
begin
  if not (session_user in ('service_role','postgres') or civicos.is_platform_officer()) then
    raise exception 'list_event_webhooks requires a platform-tier role'
      using errcode = 'insufficient_privilege';
  end if;
  return query
    select w.id, w.channel, w.url, w.description, w.active,
           w.cursor_at_ms, w.last_delivered_at, w.delivered_count,
           w.failures, w.last_error, w.created_at
    from civicos.event_webhooks w
    order by w.created_at desc;
end$$;

-- ── Cursor advance after a successful delivery (cron / service_role) ──
create or replace function civicos.mark_webhook_delivered(
  p_id uuid, p_last_event_id uuid, p_cursor_at_ms bigint, p_delivered int
) returns void
language plpgsql security definer
set search_path = civicos, pg_catalog
as $$
begin
  if session_user not in ('service_role','postgres') then
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
      updated_at        = now()
  where id = p_id;
end$$;

-- ── Failure capture (cron / service_role) ──
create or replace function civicos.record_webhook_failure(p_id uuid, p_error text)
returns void
language plpgsql security definer
set search_path = civicos, pg_catalog
as $$
begin
  if session_user not in ('service_role','postgres') then
    raise exception 'record_webhook_failure requires service_role'
      using errcode = 'insufficient_privilege';
  end if;
  update civicos.event_webhooks
  set failures   = failures + 1,
      last_error = left(coalesce(p_error,'error'), 500),
      updated_at = now()
  where id = p_id;
end$$;

-- Public wrappers.
create or replace function public.civicos_register_event_webhook(
  p_channel text, p_url text, p_secret text, p_description text default null
) returns uuid language sql security definer set search_path = public, pg_catalog
as $$ select civicos.register_event_webhook(p_channel, p_url, p_secret, p_description); $$;

create or replace function public.civicos_list_event_webhooks()
returns table(
  id uuid, channel text, url text, description text, active boolean,
  cursor_at_ms bigint, last_delivered_at timestamptz,
  delivered_count bigint, failures int, last_error text, created_at timestamptz
) language sql security definer stable set search_path = public, pg_catalog
as $$ select * from civicos.list_event_webhooks(); $$;

create or replace function public.civicos_mark_webhook_delivered(
  p_id uuid, p_last_event_id uuid, p_cursor_at_ms bigint, p_delivered int
) returns void language sql security definer set search_path = public, pg_catalog
as $$ select civicos.mark_webhook_delivered(p_id, p_last_event_id, p_cursor_at_ms, p_delivered); $$;

create or replace function public.civicos_record_webhook_failure(p_id uuid, p_error text)
returns void language sql security definer set search_path = public, pg_catalog
as $$ select civicos.record_webhook_failure(p_id, p_error); $$;

-- Lock the privilege model: registration + listing are platform-tier
-- (callable by authenticated, gated inside); the cursor/failure RPCs are
-- service_role only. Revoke from PUBLIC too (CREATE OR REPLACE re-grants).
revoke execute on function public.civicos_register_event_webhook(text,text,text,text) from public, anon;
grant  execute on function public.civicos_register_event_webhook(text,text,text,text) to authenticated;
revoke execute on function public.civicos_list_event_webhooks() from public, anon;
grant  execute on function public.civicos_list_event_webhooks() to authenticated;
revoke execute on function public.civicos_mark_webhook_delivered(uuid,uuid,bigint,int) from public, anon, authenticated;
revoke execute on function public.civicos_record_webhook_failure(uuid,text) from public, anon, authenticated;
