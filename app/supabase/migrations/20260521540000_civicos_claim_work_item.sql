-- 20260521540000_civicos_claim_work_item.sql
--
-- Phase B · let an officer claim a work item.
--
-- officer_workload surfaces the unassigned backlog and overloaded officers,
-- but there was no way for an officer to actually pick up an item. This adds
-- claim_work_item: the calling officer takes ownership of an open work item
-- (assignee := self). It is deliberately an ASSIGNMENT change only — it does
-- NOT advance the workflow stage or touch the transition state machine — and
-- it is recorded on the work item's audit scope so the handover is
-- tamper-evident, exactly like a transition would be.
--
-- The caller must be a linked officer (auth.uid() resolves to an officers
-- row); authenticated-tier, gated inside.

set search_path = civicos, pg_catalog;

create or replace function civicos.claim_work_item(p_ref text)
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
    raise exception 'claim_work_item requires a linked officer'
      using errcode = 'insufficient_privilege';
  end if;

  update civicos.work_items
  set assignee_id = v_officer.id, assignee_name = v_officer.name, updated_at = now()
  where ref = p_ref and not closed
  returning * into rec;

  if rec.id is null then
    raise exception 'work item % not found or already closed', p_ref;
  end if;

  perform civicos.append_audit(
    rec.scope, v_officer.name, 'reassign', rec.ref,
    'claimed by ' || v_officer.name);
  return rec;
end$$;

create or replace function public.civicos_claim_work_item(p_ref text)
returns civicos.work_items
language sql security definer set search_path = public, pg_catalog
as $$ select * from civicos.claim_work_item(p_ref); $$;

revoke execute on function public.civicos_claim_work_item(text) from public, anon;
grant  execute on function public.civicos_claim_work_item(text) to authenticated;
