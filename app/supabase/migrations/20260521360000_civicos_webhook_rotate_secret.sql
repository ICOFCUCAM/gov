-- 20260521360000_civicos_webhook_rotate_secret.sql
--
-- Phase B · federation webhook secret rotation.
--
-- A webhook's HMAC signing secret was write-only at registration and
-- otherwise immutable: the only way to change it (leak response, routine
-- rotation, compliance) was to delete and re-register, which throws away
-- the delivery cursor and history. This adds an in-place rotation that
-- preserves all delivery state and only swaps the secret.
--
-- Platform-tier (or service) gated, like registration. The secret is
-- still never readable — rotation is write-only too. Bumps updated_at so
-- the change is visible in listings.

set search_path = civicos, pg_catalog;

create or replace function civicos.rotate_event_webhook_secret(p_id uuid, p_new_secret text)
returns boolean
language plpgsql security definer
set search_path = civicos, pg_catalog
as $$
declare v_found boolean;
begin
  if not (civicos.is_service_context() or civicos.is_platform_officer()) then
    raise exception 'rotate_event_webhook_secret requires a platform-tier role'
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

create or replace function public.civicos_rotate_event_webhook_secret(p_id uuid, p_new_secret text)
returns boolean language sql security definer set search_path = public, pg_catalog
as $$ select civicos.rotate_event_webhook_secret(p_id, p_new_secret); $$;

revoke execute on function public.civicos_rotate_event_webhook_secret(uuid, text) from public, anon;
grant  execute on function public.civicos_rotate_event_webhook_secret(uuid, text) to authenticated;
