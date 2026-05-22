-- 20260521570000_civicos_reassign_work_item.sql
--
-- Phase B · supervisor reassignment of a work item.
--
-- claim/release let an officer manage their OWN ownership; this is the
-- supervisory counterpart: a platform-tier officer assigns an open item to
-- ANY active officer (load balancing across a team). Like the others it is
-- assignment-only — no workflow-stage change — and audit-logged.
--
-- Gated to platform-tier (assigning another person's work is a supervisory
-- act, unlike self-claim). The target must be an active officer.
-- Authenticated-tier; the platform check happens inside.

set search_path = civicos, pg_catalog;

create or replace function civicos.reassign_work_item(p_ref text, p_assignee_id uuid)
returns civicos.work_items
language plpgsql
security definer
set search_path = civicos, pg_catalog
as $$
declare
  v_caller civicos.officers;
  v_target civicos.officers;
  rec civicos.work_items;
begin
  select * into v_caller from civicos.officers where auth_user_id = (select auth.uid());
  if v_caller.id is null or not civicos.is_platform_officer() then
    raise exception 'reassign_work_item requires a platform-tier officer'
      using errcode = 'insufficient_privilege';
  end if;

  select * into v_target from civicos.officers where id = p_assignee_id and active;
  if v_target.id is null then
    raise exception 'target officer % not found or inactive', p_assignee_id;
  end if;

  select * into rec from civicos.work_items where ref = p_ref;
  if rec.id is null or rec.closed then
    raise exception 'work item % not found or already closed', p_ref;
  end if;

  update civicos.work_items
  set assignee_id = v_target.id, assignee_name = v_target.name, updated_at = now()
  where id = rec.id
  returning * into rec;

  perform civicos.append_audit(
    rec.scope, v_caller.name, 'reassign', rec.ref,
    'reassigned to ' || v_target.name || ' by ' || v_caller.name);
  return rec;
end$$;

create or replace function public.civicos_reassign_work_item(p_ref text, p_assignee_id uuid)
returns civicos.work_items
language sql security definer set search_path = public, pg_catalog
as $$ select * from civicos.reassign_work_item(p_ref, p_assignee_id); $$;

revoke execute on function public.civicos_reassign_work_item(text, uuid) from public, anon;
grant  execute on function public.civicos_reassign_work_item(text, uuid) to authenticated;
