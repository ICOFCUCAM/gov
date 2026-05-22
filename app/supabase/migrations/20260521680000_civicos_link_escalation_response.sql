-- 20260521680000_civicos_link_escalation_response.sql
--
-- Phase B · link an escalation to the response that addresses it.
--
-- escalations.linked_work_item_id and linked_dispatch_id are declared (the
-- data model anticipates connecting an escalation to the work item or
-- dispatch raised in response) but NO RPC ever set them — the linkage was
-- unreachable. This wires it: an officer attaches a dispatch and/or work
-- item (by ref) to an escalation, so the incident and its response are
-- traceable from either side. Audit-logged on the escalation's charter.
--
-- Linked officer only (operator action).

set search_path = civicos, pg_catalog;

create or replace function civicos.link_escalation_response(
  p_escalation_id uuid, p_dispatch_ref text default null, p_work_item_ref text default null
) returns boolean
language plpgsql
security definer
set search_path = civicos, pg_catalog
as $$
declare
  v_officer civicos.officers;
  v_dispatch uuid;
  v_work_item uuid;
  v_charter text;
begin
  select * into v_officer from civicos.officers where auth_user_id = (select auth.uid());
  if v_officer.id is null then
    raise exception 'link_escalation_response requires a linked officer'
      using errcode = 'insufficient_privilege';
  end if;
  if p_dispatch_ref is null and p_work_item_ref is null then
    raise exception 'provide a dispatch ref and/or a work item ref';
  end if;

  if p_dispatch_ref is not null then
    select id into v_dispatch from civicos.dispatches where ref = p_dispatch_ref;
    if v_dispatch is null then raise exception 'dispatch % not found', p_dispatch_ref; end if;
  end if;
  if p_work_item_ref is not null then
    select id into v_work_item from civicos.work_items where ref = p_work_item_ref;
    if v_work_item is null then raise exception 'work item % not found', p_work_item_ref; end if;
  end if;

  update civicos.escalations
  set linked_dispatch_id  = coalesce(v_dispatch, linked_dispatch_id),
      linked_work_item_id = coalesce(v_work_item, linked_work_item_id)
  where id = p_escalation_id
  returning source_charter_id into v_charter;

  if not found then
    raise exception 'escalation % not found', p_escalation_id;
  end if;

  perform civicos.append_audit(
    v_charter, v_officer.name, 'escalation_link', p_escalation_id::text,
    'linked response' ||
      coalesce(' dispatch=' || p_dispatch_ref, '') ||
      coalesce(' work_item=' || p_work_item_ref, ''));
  return true;
end$$;

create or replace function public.civicos_link_escalation_response(
  p_escalation_id uuid, p_dispatch_ref text default null, p_work_item_ref text default null
) returns boolean language sql security definer set search_path = public, pg_catalog
as $$ select civicos.link_escalation_response(p_escalation_id, p_dispatch_ref, p_work_item_ref); $$;

revoke execute on function public.civicos_link_escalation_response(uuid, text, text) from public, anon;
grant  execute on function public.civicos_link_escalation_response(uuid, text, text) to authenticated;
