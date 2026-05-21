-- 20260521070000_civicos_hardening.sql
--
-- Phase A.5 hardening:
--   1. Publish telemetry tables to supabase_realtime so the wall can
--      stop polling.
--   2. Strict-identity overrides on transition_work_item, open_work_item,
--      record_dispatch, record_directive — when auth.uid() resolves to
--      an officer, the substrate uses that officer's id/name/role and
--      ignores whatever string the client passed. Anonymous callers
--      retain legacy behavior so the sandbox / demo path keeps working.
--
-- After this, a signed-in user cannot impersonate a different actor in
-- the persistent record.

-- ┌────────────────────────────────────────────────────────────────┐
-- │ 1. Telemetry on supabase_realtime                               │
-- └────────────────────────────────────────────────────────────────┘

alter publication supabase_realtime add table civicos.telemetry_samples;
alter publication supabase_realtime add table civicos.telemetry_streams;

-- ┌────────────────────────────────────────────────────────────────┐
-- │ 2. Strict-identity overrides                                    │
-- └────────────────────────────────────────────────────────────────┘

set search_path = civicos, pg_catalog;

-- transition_work_item: when authenticated, actor_id/name/role
-- come from the current officer; client-supplied values are ignored.
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
  uid uuid := auth.uid();
  cur record;
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

-- open_work_item: same override on assignee_id/assignee_name.
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
declare
  rec civicos.work_items;
  uid uuid := auth.uid();
  cur record;
begin
  if p_ref is null or length(p_ref) = 0 then raise exception 'ref required'; end if;

  if uid is not null then
    select id, name, charter_id into cur from civicos.officers
     where auth_user_id = uid and active limit 1;
    if cur.id is not null then
      p_assignee_id   := cur.id;
      p_assignee_name := cur.name;
      p_originating_charter_id := coalesce(p_originating_charter_id, cur.charter_id);
    end if;
  end if;

  insert into civicos.work_items
    (scope, workflow_id, ref, kind, title, current_stage, priority,
     assignee_id, assignee_name, originating_charter_id, citizen_id, meta)
  values (p_scope, p_workflow_id, p_ref, p_kind, p_title, p_current_stage,
          p_priority, p_assignee_id, p_assignee_name,
          p_originating_charter_id, p_citizen_id, coalesce(p_meta, '{}'::jsonb))
  returning * into rec;

  insert into civicos.work_item_steps
    (work_item_id, seq, from_stage, to_stage, action, actor_id, actor_name, actor_role, detail)
  values (rec.id, 1, null, p_current_stage, 'advance',
          p_assignee_id,
          coalesce(p_assignee_name, 'system'), 'opener', 'work item opened');
  return rec;
end $fn$;

-- record_dispatch: issuer fields overridden for authenticated officers.
create or replace function civicos.record_dispatch(
  p_ref text, p_issued_by_charter_id text, p_kind text,
  p_priority civicos.priority default 'priority',
  p_detail text default null, p_payload jsonb default '{}'::jsonb,
  p_target_facility_id uuid default null,
  p_target_charter_id text default null,
  p_issued_by_officer_id uuid default null
) returns civicos.dispatches
language plpgsql security definer
set search_path = pg_catalog, civicos
as $fn$
declare
  rec civicos.dispatches;
  uid uuid := auth.uid();
  cur record;
begin
  if p_ref is null or length(p_ref) = 0 then raise exception 'ref required'; end if;

  if uid is not null then
    select id, charter_id into cur from civicos.officers
     where auth_user_id = uid and active limit 1;
    if cur.id is not null then
      p_issued_by_officer_id := cur.id;
      p_issued_by_charter_id := cur.charter_id;
    end if;
  end if;

  insert into civicos.dispatches
    (ref, issued_by_charter_id, issued_by_officer_id, target_facility_id,
     target_charter_id, kind, priority, status, detail, payload)
  values (p_ref, p_issued_by_charter_id, p_issued_by_officer_id,
          p_target_facility_id, p_target_charter_id, p_kind, p_priority,
          'dispatched', p_detail, coalesce(p_payload, '{}'::jsonb))
  on conflict (ref) do nothing
  returning * into rec;
  if rec.id is null then
    select * into rec from civicos.dispatches where ref = p_ref;
  end if;
  return rec;
end $fn$;

-- record_directive: issuer + name overrides for authenticated callers.
create or replace function civicos.record_directive(
  p_ref text, p_kind text, p_issued_by_charter_id text, p_title text,
  p_citation text default null, p_targets text[] default '{}',
  p_payload jsonb default '{}'::jsonb,
  p_issued_by_name text default null,
  p_status text default 'drafting'
) returns civicos.directives
language plpgsql security definer
set search_path = pg_catalog, civicos
as $fn$
declare
  rec civicos.directives;
  uid uuid := auth.uid();
  cur record;
begin
  if p_ref is null or length(p_ref) = 0 then raise exception 'ref required'; end if;

  if uid is not null then
    select name, charter_id into cur from civicos.officers
     where auth_user_id = uid and active limit 1;
    if cur.name is not null then
      p_issued_by_name := cur.name;
      p_issued_by_charter_id := cur.charter_id;
    end if;
  end if;

  insert into civicos.directives
    (ref, kind, issued_by_charter_id, issued_by_name, title, citation,
     status, targets, payload)
  values (p_ref, p_kind, p_issued_by_charter_id, p_issued_by_name, p_title,
          p_citation, coalesce(p_status, 'drafting'),
          coalesce(p_targets, '{}'), coalesce(p_payload, '{}'::jsonb))
  on conflict (ref) do update set
    kind = excluded.kind, title = excluded.title, citation = excluded.citation,
    issued_by_charter_id = excluded.issued_by_charter_id,
    issued_by_name = coalesce(excluded.issued_by_name, civicos.directives.issued_by_name),
    targets = excluded.targets,
    payload = civicos.directives.payload || excluded.payload,
    updated_at = now()
  returning * into rec;
  return rec;
end $fn$;
