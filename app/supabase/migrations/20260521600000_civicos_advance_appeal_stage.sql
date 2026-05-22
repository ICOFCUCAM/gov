-- 20260521600000_civicos_advance_appeal_stage.sql
--
-- Phase B · reachable appeal admit/hear stages.
--
-- Appeals carry a five-point lifecycle (filed → admitted → heard → decided
-- → published) and appeals_stats reports admitted/decided counts, but only
-- file_appeal and decide_appeal existed — admitted_at and heard_at were
-- dead columns, the appeal jumped straight from filed to decided. This adds
-- the two missing transitions.
--
-- 'heard' implies 'admitted', so advancing to heard backfills admitted_at.
-- A linked officer only (these are tribunal actions); the appeal must still
-- be open (not yet decided). Audit-logged on the appeal's own scope.

set search_path = civicos, pg_catalog;

create or replace function civicos.advance_appeal_stage(p_ref text, p_stage text)
returns civicos.appeals
language plpgsql
security definer
set search_path = civicos, pg_catalog
as $$
declare
  v_officer civicos.officers;
  rec civicos.appeals;
begin
  if p_stage not in ('admitted', 'heard') then
    raise exception 'invalid stage %, expected admitted|heard', p_stage;
  end if;

  select * into v_officer from civicos.officers where auth_user_id = (select auth.uid());
  if v_officer.id is null then
    raise exception 'advance_appeal_stage requires a linked officer'
      using errcode = 'insufficient_privilege';
  end if;

  update civicos.appeals
  set status = p_stage,
      admitted_at = case when p_stage in ('admitted', 'heard')
                         then coalesce(admitted_at, now()) else admitted_at end,
      heard_at = case when p_stage = 'heard'
                      then coalesce(heard_at, now()) else heard_at end,
      updated_at = now()
  where ref = p_ref and decided_at is null
  returning * into rec;

  if rec.id is null then
    raise exception 'appeal % not found or already decided', p_ref;
  end if;

  perform civicos.append_audit(
    'appeal:' || rec.ref, v_officer.name, 'appeal_' || p_stage, rec.ref,
    'appeal advanced to ' || p_stage || ' by ' || v_officer.name);
  return rec;
end$$;

create or replace function public.civicos_advance_appeal_stage(p_ref text, p_stage text)
returns civicos.appeals
language sql security definer set search_path = public, pg_catalog
as $$ select * from civicos.advance_appeal_stage(p_ref, p_stage); $$;

revoke execute on function public.civicos_advance_appeal_stage(text, text) from public, anon;
grant  execute on function public.civicos_advance_appeal_stage(text, text) to authenticated;
