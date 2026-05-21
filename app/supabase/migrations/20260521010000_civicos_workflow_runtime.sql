-- 20260521010000_civicos_workflow_runtime.sql
--
-- Phase B · workflow runtime contracts.
--
-- Adds SECURITY DEFINER write paths for the work-item state machine:
--   • sync_workflow_definition  — register/update a workflow's transition map
--   • open_work_item            — open a new item in the initial stage
--   • transition_work_item      — apply an action; validates against the
--                                 stored definition before mutating state
--
-- The transition function reads the workflow's definition (jsonb) to
-- resolve `transitions[current_stage][action] -> next_stage`. Invalid
-- transitions raise instead of silently no-op'ing — the contract is the
-- substrate's, not the client's.
--
-- All RPCs are exposed via public.civicos_* wrappers for PostgREST.

set search_path = civicos, pg_catalog;

-- ┌────────────────────────────────────────────────────────────────┐
-- │ sync_workflow_definition                                        │
-- └────────────────────────────────────────────────────────────────┘

create or replace function civicos.sync_workflow_definition(
  p_workflow_id text,
  p_institution_charter_id text,
  p_archetype text,
  p_title text,
  p_kind civicos.work_kind,
  p_definition jsonb,
  p_description text default null,
  p_blueprint_citation text default null,
  p_step_count int default null,
  p_emits text[] default '{}'
) returns civicos.workflow_definitions
language plpgsql security definer
set search_path = pg_catalog, civicos
as $fn$
declare rec civicos.workflow_definitions;
begin
  if p_workflow_id is null or length(p_workflow_id) = 0 then
    raise exception 'workflow_id required';
  end if;
  if p_definition is null or jsonb_typeof(p_definition) <> 'object' then
    raise exception 'definition must be a JSON object';
  end if;
  if p_definition->'transitions' is null then
    raise exception 'definition.transitions required';
  end if;

  insert into civicos.workflow_definitions
    (workflow_id, institution_charter_id, archetype, title, description,
     blueprint_citation, kind, step_count, emits, definition, synced_at)
  values (p_workflow_id, p_institution_charter_id, p_archetype, p_title,
          p_description, p_blueprint_citation, p_kind,
          coalesce(p_step_count, 0), coalesce(p_emits, '{}'),
          p_definition, now())
  on conflict (workflow_id) do update set
    institution_charter_id = excluded.institution_charter_id,
    archetype              = excluded.archetype,
    title                  = excluded.title,
    description            = excluded.description,
    blueprint_citation     = excluded.blueprint_citation,
    kind                   = excluded.kind,
    step_count             = excluded.step_count,
    emits                  = excluded.emits,
    definition             = excluded.definition,
    synced_at              = now(),
    updated_at             = now()
  returning * into rec;
  return rec;
end $fn$;

revoke all on function civicos.sync_workflow_definition(text,text,text,text,civicos.work_kind,jsonb,text,text,int,text[]) from public;
grant execute on function civicos.sync_workflow_definition(text,text,text,text,civicos.work_kind,jsonb,text,text,int,text[]) to anon, authenticated;

-- ┌────────────────────────────────────────────────────────────────┐
-- │ open_work_item                                                  │
-- └────────────────────────────────────────────────────────────────┘

create or replace function civicos.open_work_item(
  p_ref text,
  p_scope text,
  p_workflow_id text,
  p_kind civicos.work_kind,
  p_title text,
  p_current_stage text,
  p_priority civicos.priority default 'routine',
  p_originating_charter_id text default null,
  p_assignee_id uuid default null,
  p_assignee_name text default null,
  p_citizen_id uuid default null,
  p_meta jsonb default '{}'::jsonb
) returns civicos.work_items
language plpgsql security definer
set search_path = pg_catalog, civicos
as $fn$
declare rec civicos.work_items;
begin
  if p_ref is null or length(p_ref) = 0 then raise exception 'ref required'; end if;

  insert into civicos.work_items
    (scope, workflow_id, ref, kind, title, current_stage, priority,
     assignee_id, assignee_name, originating_charter_id, citizen_id, meta)
  values (p_scope, p_workflow_id, p_ref, p_kind, p_title, p_current_stage,
          p_priority, p_assignee_id, p_assignee_name,
          p_originating_charter_id, p_citizen_id, coalesce(p_meta, '{}'::jsonb))
  returning * into rec;

  -- Record the open transition as step #1 so the trail starts with an
  -- explicit creation event rather than a void.
  insert into civicos.work_item_steps
    (work_item_id, seq, from_stage, to_stage, action, actor_name, actor_role, detail)
  values (rec.id, 1, null, p_current_stage, 'advance',
          coalesce(p_assignee_name, 'system'), 'opener', 'work item opened');
  return rec;
end $fn$;

revoke all on function civicos.open_work_item(text,text,text,civicos.work_kind,text,text,civicos.priority,text,uuid,text,uuid,jsonb) from public;
grant execute on function civicos.open_work_item(text,text,text,civicos.work_kind,text,text,civicos.priority,text,uuid,text,uuid,jsonb) to anon, authenticated;

-- ┌────────────────────────────────────────────────────────────────┐
-- │ transition_work_item                                            │
-- └────────────────────────────────────────────────────────────────┘
-- Validates `action` against the stored workflow definition. Looks up
-- transitions[current_stage][action] for the next stage; raises if the
-- transition is undefined. Inserts the step (with auto seq from
-- max(seq)+1 per item) and atomically updates the work_item.
--
-- A per-item advisory lock serialises concurrent transitions on the same
-- item, so two simultaneous actions can't both succeed against the same
-- starting stage.

create or replace function civicos.transition_work_item(
  p_ref text,
  p_action civicos.action_key,
  p_actor_name text,
  p_actor_id uuid default null,
  p_actor_role text default null,
  p_detail text default '',
  p_audit_tag text default null,
  p_requires_signature boolean default false,
  p_signature_hash text default null
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
begin
  if p_ref is null then raise exception 'ref required'; end if;
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

  select coalesce(max(seq), 0) + 1 into next_seq from civicos.work_item_steps where work_item_id = item.id;

  insert into civicos.work_item_steps
    (work_item_id, seq, from_stage, to_stage, action, actor_id, actor_name,
     actor_role, requires_signature, signature_hash, signed_at, audit_tag, detail)
  values (item.id, next_seq, item.current_stage, next_stage, p_action,
          p_actor_id, p_actor_name, p_actor_role, p_requires_signature,
          p_signature_hash, case when p_signature_hash is not null then now() end,
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

revoke all on function civicos.transition_work_item(text,civicos.action_key,text,uuid,text,text,text,boolean,text) from public;
grant execute on function civicos.transition_work_item(text,civicos.action_key,text,uuid,text,text,text,boolean,text) to anon, authenticated;

-- ┌────────────────────────────────────────────────────────────────┐
-- │ Public wrappers for PostgREST                                   │
-- └────────────────────────────────────────────────────────────────┘

create or replace function public.civicos_sync_workflow_definition(
  p_workflow_id text, p_institution_charter_id text, p_archetype text,
  p_title text, p_kind text, p_definition jsonb,
  p_description text default null, p_blueprint_citation text default null,
  p_step_count int default null, p_emits text[] default '{}'
) returns civicos.workflow_definitions language sql security definer
set search_path = pg_catalog, civicos
as $fn$ select civicos.sync_workflow_definition(
  p_workflow_id, p_institution_charter_id, p_archetype, p_title,
  p_kind::civicos.work_kind, p_definition, p_description,
  p_blueprint_citation, p_step_count, p_emits); $fn$;
revoke all on function public.civicos_sync_workflow_definition(text,text,text,text,text,jsonb,text,text,int,text[]) from public;
grant execute on function public.civicos_sync_workflow_definition(text,text,text,text,text,jsonb,text,text,int,text[]) to anon, authenticated;

create or replace function public.civicos_open_work_item(
  p_ref text, p_scope text, p_workflow_id text, p_kind text,
  p_title text, p_current_stage text, p_priority text default 'routine',
  p_originating_charter_id text default null,
  p_assignee_id uuid default null, p_assignee_name text default null,
  p_citizen_id uuid default null, p_meta jsonb default '{}'::jsonb
) returns civicos.work_items language sql security definer
set search_path = pg_catalog, civicos
as $fn$ select civicos.open_work_item(
  p_ref, p_scope, p_workflow_id, p_kind::civicos.work_kind, p_title,
  p_current_stage, p_priority::civicos.priority, p_originating_charter_id,
  p_assignee_id, p_assignee_name, p_citizen_id, p_meta); $fn$;
revoke all on function public.civicos_open_work_item(text,text,text,text,text,text,text,text,uuid,text,uuid,jsonb) from public;
grant execute on function public.civicos_open_work_item(text,text,text,text,text,text,text,text,uuid,text,uuid,jsonb) to anon, authenticated;

create or replace function public.civicos_transition_work_item(
  p_ref text, p_action text, p_actor_name text,
  p_actor_id uuid default null, p_actor_role text default null,
  p_detail text default '', p_audit_tag text default null,
  p_requires_signature boolean default false, p_signature_hash text default null
) returns civicos.work_item_steps language sql security definer
set search_path = pg_catalog, civicos
as $fn$ select civicos.transition_work_item(
  p_ref, p_action::civicos.action_key, p_actor_name, p_actor_id, p_actor_role,
  p_detail, p_audit_tag, p_requires_signature, p_signature_hash); $fn$;
revoke all on function public.civicos_transition_work_item(text,text,text,uuid,text,text,text,boolean,text) from public;
grant execute on function public.civicos_transition_work_item(text,text,text,uuid,text,text,text,boolean,text) to anon, authenticated;
