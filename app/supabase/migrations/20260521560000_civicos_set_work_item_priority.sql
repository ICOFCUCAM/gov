-- 20260521560000_civicos_set_work_item_priority.sql
--
-- Phase B · let an officer re-triage a work item's priority.
--
-- Circumstances change after an item is opened; an operator needs to raise
-- (or lower) its priority without driving it through a stage transition.
-- set_work_item_priority changes only the priority field, recorded on the
-- item's audit scope. Like claim/release it does NOT advance the workflow
-- stage.
--
-- Authorization: a linked officer who is the current assignee or holds a
-- platform-tier role. Authenticated-tier; the priority value is validated
-- against the civicos.priority enum.

set search_path = civicos, pg_catalog;

create or replace function civicos.set_work_item_priority(p_ref text, p_priority text)
returns civicos.work_items
language plpgsql
security definer
set search_path = civicos, pg_catalog
as $$
declare
  v_officer civicos.officers;
  rec civicos.work_items;
  v_old text;
begin
  if p_priority not in ('routine', 'priority', 'urgent', 'critical') then
    raise exception 'invalid priority %, expected routine|priority|urgent|critical', p_priority;
  end if;

  select * into v_officer from civicos.officers where auth_user_id = (select auth.uid());
  if v_officer.id is null then
    raise exception 'set_work_item_priority requires a linked officer'
      using errcode = 'insufficient_privilege';
  end if;

  select * into rec from civicos.work_items where ref = p_ref;
  if rec.id is null or rec.closed then
    raise exception 'work item % not found or already closed', p_ref;
  end if;

  if rec.assignee_id is distinct from v_officer.id and not civicos.is_platform_officer() then
    raise exception 'only the current assignee or a platform-tier officer may re-prioritise this item'
      using errcode = 'insufficient_privilege';
  end if;

  v_old := rec.priority::text;
  update civicos.work_items
  set priority = p_priority::civicos.priority, updated_at = now()
  where id = rec.id
  returning * into rec;

  perform civicos.append_audit(
    rec.scope, v_officer.name, 'reassign', rec.ref,
    'priority ' || v_old || ' → ' || p_priority || ' by ' || v_officer.name);
  return rec;
end$$;

create or replace function public.civicos_set_work_item_priority(p_ref text, p_priority text)
returns civicos.work_items
language sql security definer set search_path = public, pg_catalog
as $$ select * from civicos.set_work_item_priority(p_ref, p_priority); $$;

revoke execute on function public.civicos_set_work_item_priority(text, text) from public, anon;
grant  execute on function public.civicos_set_work_item_priority(text, text) to authenticated;
