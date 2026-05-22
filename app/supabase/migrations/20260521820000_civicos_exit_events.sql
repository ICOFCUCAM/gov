-- 20260521820000_civicos_exit_events.sql
--
-- Phase B · emit federation events on citizen exits.
--
-- withdraw_my_appeal and cancel_my_service_request audit-log the exit but
-- never announced it on the event bus, so a charter watching its federation
-- webhooks learned nothing when a citizen pulled back work. This recreates
-- both RPCs to additionally publish_event on the `wallet` channel
-- (`appeal.withdrawn` / `service.cancelled`), targeted at the owning charter,
-- so registered webhooks fire and the channel catalog reflects the activity.
-- Behaviour is otherwise identical (same guards, same audit entry).

set search_path = civicos, pg_catalog;

create or replace function civicos.withdraw_my_appeal(p_ref text, p_reason text default null)
returns civicos.appeals
language plpgsql
security definer
set search_path = civicos, pg_catalog
as $$
declare
  v_citizen uuid;
  rec civicos.appeals;
begin
  select id into v_citizen from civicos.citizens where auth_user_id = (select auth.uid());
  if v_citizen is null then
    raise exception 'withdraw_my_appeal requires a linked citizen'
      using errcode = 'insufficient_privilege';
  end if;

  update civicos.appeals
     set status = 'withdrawn',
         withdrawn_at = now(),
         reasoning = coalesce(p_reason, reasoning),
         updated_at = now()
   where ref = p_ref
     and citizen_id = v_citizen
     and decided_at is null
     and withdrawn_at is null
   returning * into rec;

  if rec.id is null then
    raise exception 'appeal % not found, not yours, or already decided/withdrawn', p_ref;
  end if;

  perform civicos.append_audit(
    'citizen:' || v_citizen::text, 'citizen', 'appeal_withdrawn', rec.ref,
    'withdrew appeal ' || rec.ref || coalesce(' — ' || p_reason, ''));

  perform civicos.publish_event(
    'appeal.withdrawn', 'citizen:' || v_citizen::text, 'wallet',
    jsonb_build_object('ref', rec.ref, 'charter', rec.originating_charter_id),
    rec.originating_charter_id);
  return rec;
end$$;

create or replace function civicos.cancel_my_service_request(p_ref text, p_reason text default null)
returns civicos.service_requests
language plpgsql
security definer
set search_path = civicos, pg_catalog
as $$
declare
  v_citizen uuid;
  rec civicos.service_requests;
begin
  select id into v_citizen from civicos.citizens where auth_user_id = (select auth.uid());
  if v_citizen is null then
    raise exception 'cancel_my_service_request requires a linked citizen'
      using errcode = 'insufficient_privilege';
  end if;

  update civicos.service_requests
     set status = 'cancelled',
         cancelled_at = now(),
         payload = case when p_reason is null then payload
                        else payload || jsonb_build_object('cancel_reason', p_reason) end,
         updated_at = now()
   where ref = p_ref
     and citizen_id = v_citizen
     and resolved_at is null
     and cancelled_at is null
   returning * into rec;

  if rec.id is null then
    raise exception 'service request % not found, not yours, or already resolved/cancelled', p_ref;
  end if;

  perform civicos.append_audit(
    'citizen:' || v_citizen::text, 'citizen', 'service_cancelled', rec.ref,
    'cancelled request ' || rec.ref || coalesce(' — ' || p_reason, ''));

  perform civicos.publish_event(
    'service.cancelled', 'citizen:' || v_citizen::text, 'wallet',
    jsonb_build_object('ref', rec.ref, 'charter', rec.target_charter_id),
    rec.target_charter_id);
  return rec;
end$$;
