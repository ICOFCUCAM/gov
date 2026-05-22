-- 20260521290000_civicos_webhook_set_active.sql
--
-- Phase B · let platform-tier officers pause/resume an outbound webhook.
-- The delivery worker only processes active rows, so deactivating stops
-- delivery without losing the cursor or config; reactivating resumes
-- from where it left off.

set search_path = civicos, pg_catalog;

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
  set active = p_active, updated_at = now()
  where id = p_id
  returning true into v_found;
  return coalesce(v_found, false);
end$$;

create or replace function public.civicos_set_event_webhook_active(p_id uuid, p_active boolean)
returns boolean language sql security definer set search_path = public, pg_catalog
as $$ select civicos.set_event_webhook_active(p_id, p_active); $$;

revoke execute on function public.civicos_set_event_webhook_active(uuid, boolean) from public, anon;
grant  execute on function public.civicos_set_event_webhook_active(uuid, boolean) to authenticated;
