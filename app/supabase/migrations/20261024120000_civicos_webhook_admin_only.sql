-- 20261024120000_civicos_webhook_admin_only.sql
--
-- Go-live review M-5: substrate event webhooks.
--
--   * Registering, pausing/resuming and rotating the secret of a federation
--     webhook are for platform administrators only (is_platform_admin()),
--     not every platform-tier role: an auditor reads, it does not subscribe
--     outside systems to the nation's events. Reads (listing, delivery log,
--     health) stay with the platform tier.
--   * The address is checked when it is registered: http(s) only, no user
--     name or password, no spaces, at most 2000 characters, and never a
--     loopback, link-local or unspecified literal address (127.x, 169.254.x
--     such as cloud metadata, 0.x, ::1, localhost). Whether a host resolves
--     to a private network is decided at delivery by the platform's safe
--     fetch (lib/net/safe-fetch.ts), which refuses private addresses unless
--     the nation allows its own network (CIVICOS_WEBHOOKS_PRIVATE=1), and
--     never follows redirects for deliveries.
--   * The same check guards the table itself (NOT VALID: rows registered
--     earlier are left as they are and are still checked at delivery).
--
-- Relies on is_service_context() as corrected in 20261024090000.

set search_path = civicos, pg_catalog;

-- Administrators of the platform tier (the substrate's officer roles).
create or replace function civicos.is_platform_admin()
returns boolean language sql stable security definer
set search_path = pg_catalog, civicos
as $fn$
  select exists(
    select 1 from civicos.officers
    where auth_user_id = auth.uid() and active and role = 'platform-admin'
  );
$fn$;
revoke all on function civicos.is_platform_admin() from public;
grant execute on function civicos.is_platform_admin() to authenticated, service_role;

-- Null when the address may be registered, otherwise the reason.
create or replace function civicos.webhook_url_refusal(p_url text)
returns text
language plpgsql immutable
set search_path = civicos, pg_catalog
as $$
declare v_auth text; v_host text;
begin
  if p_url is null or length(p_url) = 0 then return 'address required'; end if;
  if length(p_url) > 2000 then return 'address longer than 2000 characters'; end if;
  if p_url ~ '\s' then return 'address contains spaces'; end if;
  if p_url !~* '^https?://[^/]' then return 'use an http or https address'; end if;
  v_auth := lower(substring(p_url from '^[A-Za-z]+://([^/?#]*)'));
  if position('@' in v_auth) > 0 then return 'addresses with a user name or password are not accepted'; end if;
  if v_auth like '[%' then
    v_host := substring(v_auth from '^\[([^\]]*)\]');
  else
    v_host := split_part(v_auth, ':', 1);
  end if;
  v_host := rtrim(coalesce(v_host, ''), '.');
  if v_host = '' then return 'address has no host'; end if;
  if v_host = 'localhost' or v_host like '%.localhost' then return 'loopback addresses are not accepted'; end if;
  if v_host ~ '^127\.' or v_host ~ '^0\.' or v_host ~ '^169\.254\.'
     or v_host in ('::1', '::', '0:0:0:0:0:0:0:1') or v_host ~ '^fe[89ab][0-9a-f]:' or v_host ~ '^::ffff:' then
    return 'loopback, link-local and unspecified addresses are not accepted';
  end if;
  return null;
end$$;

alter table civicos.event_webhooks drop constraint if exists event_webhooks_url_check;
alter table civicos.event_webhooks
  add constraint event_webhooks_url_check check (civicos.webhook_url_refusal(url) is null) not valid;

-- ── Registration: administrators (or the service) only, address checked ──
create or replace function civicos.register_event_webhook(
  p_channel text, p_url text, p_secret text, p_description text default null
) returns uuid
language plpgsql security definer
set search_path = civicos, pg_catalog
as $$
declare v_id uuid; v_refusal text;
begin
  if not (civicos.is_service_context() or civicos.is_platform_admin()) then
    raise exception 'register_event_webhook requires a platform administrator'
      using errcode = 'insufficient_privilege';
  end if;
  if p_channel is null or length(p_channel)=0 or p_url is null or length(p_url)=0
     or p_secret is null or length(p_secret) < 8 then
    raise exception 'channel, url required; secret must be >= 8 chars';
  end if;
  v_refusal := civicos.webhook_url_refusal(trim(p_url));
  if v_refusal is not null then
    raise exception 'webhook address refused: %', v_refusal using errcode = 'check_violation';
  end if;
  insert into civicos.event_webhooks (channel, url, secret, description, created_by)
  values (p_channel, trim(p_url), p_secret, p_description,
          coalesce((select name from civicos.officers where auth_user_id = auth.uid()), 'service'))
  returning id into v_id;
  return v_id;
end$$;

-- ── Pause / resume: administrators (or the service; the breaker) ──
create or replace function civicos.set_event_webhook_active(p_id uuid, p_active boolean)
returns boolean
language plpgsql security definer
set search_path = civicos, pg_catalog
as $$
declare v_found boolean;
begin
  if not (civicos.is_service_context() or civicos.is_platform_admin()) then
    raise exception 'set_event_webhook_active requires a platform administrator'
      using errcode = 'insufficient_privilege';
  end if;
  update civicos.event_webhooks
  set active        = p_active,
      failures      = case when p_active then 0    else failures end,
      last_error    = case when p_active then null else last_error end,
      paused_reason = case when p_active then null else 'manual pause' end,
      updated_at    = now()
  where id = p_id
  returning true into v_found;
  return coalesce(v_found, false);
end$$;

-- ── Secret rotation: administrators (or the service) ──
create or replace function civicos.rotate_event_webhook_secret(p_id uuid, p_new_secret text)
returns boolean
language plpgsql security definer
set search_path = civicos, pg_catalog
as $$
declare v_found boolean;
begin
  if not (civicos.is_service_context() or civicos.is_platform_admin()) then
    raise exception 'rotate_event_webhook_secret requires a platform administrator'
      using errcode = 'insufficient_privilege';
  end if;
  if p_new_secret is null or length(p_new_secret) < 8 then
    raise exception 'secret must be >= 8 chars';
  end if;
  update civicos.event_webhooks
  set secret = p_new_secret, updated_at = now()
  where id = p_id
  returning true into v_found;
  return coalesce(v_found, false);
end$$;

-- CREATE OR REPLACE keeps grants, but re-assert the intended ones.
revoke execute on function public.civicos_register_event_webhook(text,text,text,text) from public, anon;
grant  execute on function public.civicos_register_event_webhook(text,text,text,text) to authenticated;
revoke execute on function public.civicos_set_event_webhook_active(uuid, boolean) from public, anon;
grant  execute on function public.civicos_set_event_webhook_active(uuid, boolean) to authenticated;
revoke execute on function public.civicos_rotate_event_webhook_secret(uuid, text) from public, anon;
grant  execute on function public.civicos_rotate_event_webhook_secret(uuid, text) to authenticated;
