-- 20260521120000_civicos_transition_signed_at.sql
--
-- Extend transition_work_item with p_signed_at so the client-supplied
-- timestamp (the same one used to derive the signature material) lands
-- byte-for-byte in signed_at. Without this, server-side now() drifts
-- a few ms from the client's signing timestamp and ECDSA verification
-- fails by definition.
--
-- DROP + CREATE because Postgres can't ALTER a function's parameter
-- list. Strict-identity override behavior preserved.

set search_path = civicos, pg_catalog;

drop function if exists public.civicos_transition_work_item(text,text,text,uuid,text,text,text,boolean,text);
drop function if exists civicos.transition_work_item(text,civicos.action_key,text,uuid,text,text,text,boolean,text);

create or replace function civicos.transition_work_item(
  p_ref text,
  p_action civicos.action_key,
  p_actor_name text,
  p_actor_id uuid default null,
  p_actor_role text default null,
  p_detail text default '',
  p_audit_tag text default null,
  p_requires_signature boolean default false,
  p_signature_hash text default null,
  p_signed_at timestamptz default null
) returns civicos.work_item_steps
language plpgsql security definer
set search_path = pg_catalog, civicos
as $fn$
declare
  item   civicos.work_items;
  def    jsonb;
  terminals text[];
  next_stage text;
  next_seq int;
  step_rec civicos.work_item_steps;
  lock_key bigint;
  uid uuid := auth.uid();
  cur record;
  effective_signed_at timestamptz;
begin
  if p_ref is null then raise exception 'ref required'; end if;

  if uid is not null then
    select id, name, role into cur from civicos.officers
     where auth_user_id = uid and active limit 1;
    if cur.id is not null then
      p_actor_id   := cur.id;
      p_actor_name := cur.name;
      p_actor_role := coalesce(p_actor_role, cur.role);
    end if;
  end if;

  lock_key := ('x' || substr(md5('wi:' || p_ref), 1, 16))::bit(64)::bigint;
  perform pg_advisory_xact_lock(lock_key);

  select * into item from civicos.work_items where ref = p_ref;
  if item.id is null then
    raise exception 'work item % not found', p_ref using errcode = 'no_data_found';
  end if;
  if item.closed then
    raise exception 'work item % is closed', p_ref using errcode = 'object_not_in_prerequisite_state';
  end if;

  select definition into def from civicos.workflow_definitions where workflow_id = item.workflow_id;
  if def is null then
    raise exception 'workflow definition % not synced', item.workflow_id;
  end if;

  next_stage := def->'transitions'->item.current_stage->>p_action::text;
  if next_stage is null then
    raise exception 'invalid transition: % from %', p_action::text, item.current_stage
      using errcode = 'check_violation';
  end if;

  if p_requires_signature and (p_signature_hash is null or length(p_signature_hash) = 0) then
    raise exception 'transition requires signature' using errcode = 'check_violation';
  end if;

  effective_signed_at := case
    when p_signature_hash is not null then coalesce(p_signed_at, now())
    else null
  end;

  select coalesce(max(seq), 0) + 1 into next_seq from civicos.work_item_steps where work_item_id = item.id;

  insert into civicos.work_item_steps
    (work_item_id, seq, from_stage, to_stage, action, actor_id, actor_name,
     actor_role, requires_signature, signature_hash, signed_at, audit_tag, detail)
  values (item.id, next_seq, item.current_stage, next_stage, p_action,
          p_actor_id, p_actor_name, p_actor_role, p_requires_signature,
          p_signature_hash, effective_signed_at,
          p_audit_tag, coalesce(p_detail, ''))
  returning * into step_rec;

  terminals := coalesce(
    (select array_agg(value::text) from jsonb_array_elements_text(def->'terminal')),
    '{}'::text[]);

  update civicos.work_items
     set current_stage = next_stage,
         closed = (next_stage = any(terminals)),
         closed_at = case when next_stage = any(terminals) then now() else null end,
         updated_at = now()
   where id = item.id;

  return step_rec;
end $fn$;

revoke all on function civicos.transition_work_item(text,civicos.action_key,text,uuid,text,text,text,boolean,text,timestamptz) from public;
grant execute on function civicos.transition_work_item(text,civicos.action_key,text,uuid,text,text,text,boolean,text,timestamptz) to anon, authenticated;

create or replace function public.civicos_transition_work_item(
  p_ref text, p_action text, p_actor_name text,
  p_actor_id uuid default null, p_actor_role text default null,
  p_detail text default '', p_audit_tag text default null,
  p_requires_signature boolean default false, p_signature_hash text default null,
  p_signed_at timestamptz default null
) returns civicos.work_item_steps language sql security definer
set search_path = pg_catalog, civicos
as $fn$ select civicos.transition_work_item(
  p_ref, p_action::civicos.action_key, p_actor_name, p_actor_id, p_actor_role,
  p_detail, p_audit_tag, p_requires_signature, p_signature_hash, p_signed_at); $fn$;
revoke all on function public.civicos_transition_work_item(text,text,text,uuid,text,text,text,boolean,text,timestamptz) from public;
grant execute on function public.civicos_transition_work_item(text,text,text,uuid,text,text,text,boolean,text,timestamptz) to anon, authenticated;
