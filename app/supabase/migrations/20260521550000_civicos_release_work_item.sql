-- 20260521550000_civicos_release_work_item.sql
--
-- Phase B · let an officer release a work item back to the pool.
--
-- The companion to claim_work_item: an officer hands an open item back to
-- the unassigned backlog (assignee := null), recorded on the item's audit
-- scope. Together with claim this is a complete self-service rebalancing
-- loop around the officer_workload view.
--
-- Authorization: only the CURRENT assignee or a platform-tier officer may
-- release — you cannot yank an item off another officer unless you hold a
-- platform role. Assignment-only; does NOT touch the workflow stage.

set search_path = civicos, pg_catalog;

create or replace function civicos.release_work_item(p_ref text)
returns civicos.work_items
language plpgsql
security definer
set search_path = civicos, pg_catalog
as $$
declare
  v_officer civicos.officers;
  rec civicos.work_items;
begin
  select * into v_officer from civicos.officers where auth_user_id = (select auth.uid());
  if v_officer.id is null then
    raise exception 'release_work_item requires a linked officer'
      using errcode = 'insufficient_privilege';
  end if;

  select * into rec from civicos.work_items where ref = p_ref;
  if rec.id is null or rec.closed then
    raise exception 'work item % not found or already closed', p_ref;
  end if;

  if rec.assignee_id is distinct from v_officer.id and not civicos.is_platform_officer() then
    raise exception 'only the current assignee or a platform-tier officer may release this item'
      using errcode = 'insufficient_privilege';
  end if;

  update civicos.work_items
  set assignee_id = null, assignee_name = null, updated_at = now()
  where id = rec.id
  returning * into rec;

  perform civicos.append_audit(
    rec.scope, v_officer.name, 'reassign', rec.ref,
    'released to unassigned by ' || v_officer.name);
  return rec;
end$$;

create or replace function public.civicos_release_work_item(p_ref text)
returns civicos.work_items
language sql security definer set search_path = public, pg_catalog
as $$ select * from civicos.release_work_item(p_ref); $$;

revoke execute on function public.civicos_release_work_item(text) from public, anon;
grant  execute on function public.civicos_release_work_item(text) to authenticated;
