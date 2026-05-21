-- 20260521000000_civicos_v1_substrate.sql
--
-- CivicOS Sovereign Operational Substrate — v1 (consolidated).
--
-- Applies the full Phase-A schema in one transaction-safe migration.
-- Idempotent on a fresh database; not safe to re-run against existing data.
--
-- Layout:
--   1. Foundation       — schema, enums, FNV-1a, helpers
--   2. Institutions     — institutions, officers, citizens, facilities
--   3. Workflows        — workflow_definitions, work_items, work_item_steps
--   4. Federation       — federation_events, event_subscriptions
--   5. Audit            — audit_entries with hash-chain & tamper guard
--   6. Memory           — directives, dispatches, escalations, posture_history
--   7. Telemetry        — telemetry_streams, telemetry_samples
--   8. Citizen runtime  — service_requests, consents, appeals
--   9. RLS              — all tables locked down; reads scoped
--  10. Realtime         — event-bearing tables published to supabase_realtime
--  11. RPC contracts    — SECURITY DEFINER write paths in civicos.*
--  12. Public API       — public.civicos_* views & RPC wrappers for PostgREST

-- ┌──────────────────────────────────────────────────────────────────┐
-- │ 1. Foundation                                                     │
-- └──────────────────────────────────────────────────────────────────┘

create schema if not exists civicos;
comment on schema civicos is 'CivicOS — sovereign operational substrate.';

create type civicos.posture as enum
  ('steady', 'elevated', 'crisis', 'national-emergency', 'recovery');
create type civicos.severity as enum
  ('watch', 'minor', 'major', 'national');
create type civicos.priority as enum
  ('routine', 'priority', 'urgent', 'critical');
create type civicos.work_kind as enum
  ('approval', 'case', 'procurement', 'encounter', 'bill', 'judicial',
   'incident', 'permit', 'field', 'lab');
create type civicos.action_key as enum
  ('advance', 'approve', 'reject', 'escalate', 'assign', 'resolve', 'return', 'sign');
create type civicos.institution_kind as enum
  ('ministry', 'branch', 'agency', 'citizen', 'officer', 'platform');
create type civicos.consent_status as enum
  ('pending', 'granted', 'denied', 'revoked', 'expired');

create or replace function civicos.fnv1a_hex(input text)
returns text language plpgsql immutable parallel safe
set search_path = pg_catalog, civicos
as $fn$
declare h bigint := 2166136261; i int; bs bytea;
begin
  if input is null then return '00000000'; end if;
  bs := convert_to(input, 'UTF8');
  for i in 0..(length(bs) - 1) loop
    h := (h # get_byte(bs, i)) & 4294967295;
    h := (h * 16777619) & 4294967295;
  end loop;
  return lpad(to_hex(h), 8, '0');
end
$fn$;

create or replace function civicos.touch_updated_at()
returns trigger language plpgsql
set search_path = pg_catalog, civicos
as $fn$ begin new.updated_at := now(); return new; end $fn$;

create or replace function civicos.forbid_update_delete()
returns trigger language plpgsql
set search_path = pg_catalog, civicos
as $fn$ begin
  raise exception 'CivicOS append-only: % is not permitted on %', tg_op, tg_table_name
    using errcode = 'check_violation';
end $fn$;

-- ┌──────────────────────────────────────────────────────────────────┐
-- │ 2. Institutional core                                             │
-- └──────────────────────────────────────────────────────────────────┘

create table civicos.institutions (
  id uuid primary key default gen_random_uuid(),
  charter_id text unique not null,
  label text not null,
  kind civicos.institution_kind not null,
  domain text unique not null,
  archetype_or_branch text not null,
  grammar text,
  safeguards_constant text,
  expected_domains int,
  shipped_domains int,
  activated boolean not null default false,
  activated_at timestamptz,
  registered_at timestamptz not null default now(),
  meta jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index institutions_kind_idx      on civicos.institutions(kind);
create index institutions_activated_idx on civicos.institutions(activated) where activated;
create trigger institutions_touch before update on civicos.institutions
  for each row execute function civicos.touch_updated_at();

create table civicos.officers (
  id uuid primary key default gen_random_uuid(),
  auth_user_id uuid unique references auth.users(id) on delete set null,
  institution_id uuid references civicos.institutions(id) on delete set null,
  charter_id text,
  role text not null,
  title text,
  name text not null,
  email text unique,
  active boolean not null default true,
  joined_at timestamptz not null default now(),
  meta jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index officers_institution_idx on civicos.officers(institution_id);
create index officers_charter_idx     on civicos.officers(charter_id);
create index officers_role_idx        on civicos.officers(role);
create index officers_active_idx      on civicos.officers(active) where active;
create trigger officers_touch before update on civicos.officers
  for each row execute function civicos.touch_updated_at();

create table civicos.citizens (
  id uuid primary key default gen_random_uuid(),
  auth_user_id uuid unique references auth.users(id) on delete set null,
  national_id text unique,
  display_name text,
  region text,
  registered_at timestamptz not null default now(),
  active boolean not null default true,
  meta jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index citizens_region_idx on civicos.citizens(region);
create trigger citizens_touch before update on civicos.citizens
  for each row execute function civicos.touch_updated_at();

create table civicos.facilities (
  id uuid primary key default gen_random_uuid(),
  code text unique not null,
  institution_id uuid references civicos.institutions(id) on delete set null,
  charter_id text,
  archetype text,
  name text not null,
  region text,
  kind text,
  coords jsonb,
  operational_status text not null default 'operational',
  meta jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index facilities_institution_idx on civicos.facilities(institution_id);
create index facilities_charter_idx     on civicos.facilities(charter_id);
create index facilities_region_idx      on civicos.facilities(region);
create index facilities_kind_idx        on civicos.facilities(kind);
create trigger facilities_touch before update on civicos.facilities
  for each row execute function civicos.touch_updated_at();

-- ┌──────────────────────────────────────────────────────────────────┐
-- │ 3. Workflow execution                                             │
-- └──────────────────────────────────────────────────────────────────┘

create table civicos.workflow_definitions (
  id uuid primary key default gen_random_uuid(),
  workflow_id text unique not null,
  institution_charter_id text not null,
  archetype text,
  title text not null,
  description text,
  blueprint_citation text,
  kind civicos.work_kind not null,
  step_count int not null default 0,
  emits text[] not null default '{}',
  definition jsonb not null,
  synced_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index workflow_defs_charter_idx on civicos.workflow_definitions(institution_charter_id);
create index workflow_defs_kind_idx    on civicos.workflow_definitions(kind);
create trigger workflow_defs_touch before update on civicos.workflow_definitions
  for each row execute function civicos.touch_updated_at();

create table civicos.work_items (
  id uuid primary key default gen_random_uuid(),
  scope text not null,
  workflow_id text not null,
  ref text unique not null,
  kind civicos.work_kind not null,
  title text not null,
  current_stage text not null,
  priority civicos.priority not null default 'routine',
  assignee_id uuid references civicos.officers(id) on delete set null,
  assignee_name text,
  originating_charter_id text,
  citizen_id uuid references civicos.citizens(id) on delete set null,
  closed boolean not null default false,
  closed_at timestamptz,
  meta jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index work_items_scope_idx         on civicos.work_items(scope);
create index work_items_workflow_idx      on civicos.work_items(workflow_id);
create index work_items_stage_idx         on civicos.work_items(current_stage) where not closed;
create index work_items_assignee_idx      on civicos.work_items(assignee_id) where not closed;
create index work_items_open_priority_idx on civicos.work_items(priority, created_at desc) where not closed;
create index work_items_charter_idx       on civicos.work_items(originating_charter_id);
create index work_items_citizen_idx       on civicos.work_items(citizen_id);
create trigger work_items_touch before update on civicos.work_items
  for each row execute function civicos.touch_updated_at();

create table civicos.work_item_steps (
  id uuid primary key default gen_random_uuid(),
  work_item_id uuid not null references civicos.work_items(id) on delete cascade,
  seq int not null,
  step_id text,
  from_stage text,
  to_stage text not null,
  action civicos.action_key not null,
  actor_id uuid references civicos.officers(id) on delete set null,
  actor_name text not null,
  actor_role text,
  requires_signature boolean not null default false,
  signature_hash text,
  signed_at timestamptz,
  audit_tag text,
  detail text not null default '',
  at timestamptz not null default now(),
  unique (work_item_id, seq)
);
create index work_item_steps_item_idx   on civicos.work_item_steps(work_item_id, seq);
create index work_item_steps_actor_idx  on civicos.work_item_steps(actor_id);
create index work_item_steps_signed_idx on civicos.work_item_steps(signed_at) where signed_at is not null;

-- ┌──────────────────────────────────────────────────────────────────┐
-- │ 4. Federation events                                              │
-- └──────────────────────────────────────────────────────────────────┘

create table civicos.federation_events (
  id uuid primary key default gen_random_uuid(),
  type text not null,
  source text not null,
  target text,
  channel text not null,
  payload jsonb not null default '{}'::jsonb,
  at timestamptz not null default now(),
  at_ms bigint not null default (extract(epoch from now()) * 1000)::bigint,
  consumed_count int not null default 0,
  last_consumed_at timestamptz
);
create index federation_events_type_idx    on civicos.federation_events(type, at desc);
create index federation_events_source_idx  on civicos.federation_events(source, at desc);
create index federation_events_channel_idx on civicos.federation_events(channel, at desc);
create index federation_events_target_idx  on civicos.federation_events(target, at desc) where target is not null;
create index federation_events_at_idx      on civicos.federation_events(at desc);

create table civicos.event_subscriptions (
  id uuid primary key default gen_random_uuid(),
  subscriber_charter_id text not null,
  channel text not null,
  description text,
  ttl_seconds int,
  active boolean not null default true,
  last_event_at timestamptz,
  last_event_id uuid,
  consumed_count bigint not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (subscriber_charter_id, channel)
);
create index event_subs_charter_idx on civicos.event_subscriptions(subscriber_charter_id);
create index event_subs_channel_idx on civicos.event_subscriptions(channel);
create trigger event_subs_touch before update on civicos.event_subscriptions
  for each row execute function civicos.touch_updated_at();

-- ┌──────────────────────────────────────────────────────────────────┐
-- │ 5. Audit chain (hash-chained, per-scope, append-only)             │
-- └──────────────────────────────────────────────────────────────────┘

create table civicos.audit_entries (
  id uuid primary key default gen_random_uuid(),
  scope text not null,
  seq bigint not null,
  actor text not null,
  action text not null,
  subject text not null,
  detail text not null default '',
  at timestamptz not null default now(),
  at_ms bigint not null default (extract(epoch from now()) * 1000)::bigint,
  prev_hash text not null,
  hash text not null,
  unique (scope, seq)
);
create index audit_entries_scope_idx on civicos.audit_entries(scope, seq desc);
create index audit_entries_at_idx    on civicos.audit_entries(at desc);
create index audit_entries_actor_idx on civicos.audit_entries(actor);

create or replace function civicos.audit_chain_insert()
returns trigger language plpgsql
set search_path = pg_catalog, civicos
as $fn$
declare prev_h text; next_seq bigint; lock_key bigint;
begin
  lock_key := ('x' || substr(md5(new.scope), 1, 16))::bit(64)::bigint;
  perform pg_advisory_xact_lock(lock_key);
  select hash, seq + 1 into prev_h, next_seq
    from civicos.audit_entries where scope = new.scope
    order by seq desc limit 1;
  if prev_h is null then prev_h := '00000000'; next_seq := 1; end if;
  new.seq := next_seq;
  new.prev_hash := prev_h;
  new.hash := civicos.fnv1a_hex(
    prev_h || '|' || next_seq::text || '|' ||
    new.scope || '|' || new.actor || '|' ||
    new.action || '|' || new.subject || '|' ||
    coalesce(new.detail, ''));
  return new;
end $fn$;

create trigger audit_entries_chain before insert on civicos.audit_entries
  for each row execute function civicos.audit_chain_insert();
create trigger audit_entries_no_update before update on civicos.audit_entries
  for each row execute function civicos.forbid_update_delete();
create trigger audit_entries_no_delete before delete on civicos.audit_entries
  for each row execute function civicos.forbid_update_delete();

create or replace function civicos.verify_audit_chain(p_scope text)
returns table (entries bigint, intact boolean, broken_at bigint)
language plpgsql stable
set search_path = pg_catalog, civicos
as $fn$
declare r record; prev_h text := '00000000'; expected text; n bigint := 0; broken bigint := null;
begin
  for r in select * from civicos.audit_entries where scope = p_scope order by seq asc loop
    n := n + 1;
    expected := civicos.fnv1a_hex(
      prev_h || '|' || r.seq::text || '|' || r.scope || '|' || r.actor || '|' ||
      r.action || '|' || r.subject || '|' || coalesce(r.detail, ''));
    if r.prev_hash <> prev_h or r.hash <> expected then broken := r.seq; exit; end if;
    prev_h := r.hash;
  end loop;
  return query select n, (broken is null) as intact, broken;
end $fn$;

-- ┌──────────────────────────────────────────────────────────────────┐
-- │ 6. Institutional memory                                           │
-- └──────────────────────────────────────────────────────────────────┘

create table civicos.directives (
  id uuid primary key default gen_random_uuid(),
  ref text unique not null,
  kind text not null,
  issued_by_charter_id text not null,
  issued_by_name text,
  title text not null,
  citation text,
  status text not null default 'drafting',
  targets text[] not null default '{}',
  payload jsonb not null default '{}'::jsonb,
  signed_at timestamptz,
  signed_by_id uuid references civicos.officers(id) on delete set null,
  effective_at timestamptz,
  rescinded_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index directives_issued_by_idx on civicos.directives(issued_by_charter_id);
create index directives_status_idx    on civicos.directives(status);
create index directives_kind_idx      on civicos.directives(kind);
create index directives_targets_gin   on civicos.directives using gin(targets);
create index directives_effective_idx on civicos.directives(effective_at desc) where effective_at is not null;
create trigger directives_touch before update on civicos.directives
  for each row execute function civicos.touch_updated_at();

create table civicos.dispatches (
  id uuid primary key default gen_random_uuid(),
  ref text unique not null,
  issued_by_charter_id text not null,
  issued_by_officer_id uuid references civicos.officers(id) on delete set null,
  target_facility_id uuid references civicos.facilities(id) on delete set null,
  target_charter_id text,
  kind text not null,
  priority civicos.priority not null default 'priority',
  status text not null default 'dispatched',
  detail text,
  payload jsonb not null default '{}'::jsonb,
  dispatched_at timestamptz not null default now(),
  acknowledged_at timestamptz,
  on_scene_at timestamptz,
  closed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index dispatches_issued_by_idx on civicos.dispatches(issued_by_charter_id);
create index dispatches_target_idx    on civicos.dispatches(target_facility_id) where target_facility_id is not null;
create index dispatches_status_idx    on civicos.dispatches(status) where closed_at is null;
create index dispatches_priority_idx  on civicos.dispatches(priority, dispatched_at desc) where closed_at is null;
create trigger dispatches_touch before update on civicos.dispatches
  for each row execute function civicos.touch_updated_at();

create table civicos.escalations (
  id uuid primary key default gen_random_uuid(),
  source_charter_id text not null,
  target_charter_id text,
  severity civicos.severity not null,
  reason text not null,
  linked_work_item_id uuid references civicos.work_items(id) on delete set null,
  linked_dispatch_id uuid references civicos.dispatches(id) on delete set null,
  triggered_by_actor text,
  triggered_at timestamptz not null default now(),
  acknowledged_at timestamptz,
  acknowledged_by uuid references civicos.officers(id) on delete set null,
  resolved_at timestamptz,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index escalations_source_idx   on civicos.escalations(source_charter_id, triggered_at desc);
create index escalations_target_idx   on civicos.escalations(target_charter_id, triggered_at desc) where target_charter_id is not null;
create index escalations_severity_idx on civicos.escalations(severity, triggered_at desc) where resolved_at is null;
create index escalations_open_idx     on civicos.escalations(triggered_at desc) where resolved_at is null;

create table civicos.posture_history (
  id uuid primary key default gen_random_uuid(),
  charter_id text not null,
  posture civicos.posture not null,
  readiness int,
  stress int,
  snapshot_at timestamptz not null default now(),
  detail jsonb not null default '{}'::jsonb
);
create index posture_history_charter_idx on civicos.posture_history(charter_id, snapshot_at desc);
create index posture_history_posture_idx on civicos.posture_history(posture, snapshot_at desc);

-- ┌──────────────────────────────────────────────────────────────────┐
-- │ 7. Telemetry                                                      │
-- └──────────────────────────────────────────────────────────────────┘

create table civicos.telemetry_streams (
  id uuid primary key default gen_random_uuid(),
  stream_id text unique not null,
  charter_id text not null,
  facility_id uuid references civicos.facilities(id) on delete set null,
  label text not null,
  unit text,
  aggregation text not null default 'instantaneous',
  retention_days int not null default 365,
  warn_threshold double precision,
  alert_threshold double precision,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index telemetry_streams_charter_idx on civicos.telemetry_streams(charter_id);
create index telemetry_streams_active_idx  on civicos.telemetry_streams(active) where active;
create trigger telemetry_streams_touch before update on civicos.telemetry_streams
  for each row execute function civicos.touch_updated_at();

create table civicos.telemetry_samples (
  id uuid primary key default gen_random_uuid(),
  stream_id text not null,
  ts timestamptz not null default now(),
  value double precision not null,
  facility_id uuid references civicos.facilities(id) on delete set null,
  meta jsonb not null default '{}'::jsonb
);
create index telemetry_samples_stream_ts   on civicos.telemetry_samples(stream_id, ts desc);
create index telemetry_samples_ts_idx      on civicos.telemetry_samples(ts desc);
create index telemetry_samples_facility_ts on civicos.telemetry_samples(facility_id, ts desc) where facility_id is not null;
create trigger telemetry_samples_no_update before update on civicos.telemetry_samples
  for each row execute function civicos.forbid_update_delete();
create trigger telemetry_samples_no_delete before delete on civicos.telemetry_samples
  for each row execute function civicos.forbid_update_delete();

-- ┌──────────────────────────────────────────────────────────────────┐
-- │ 8. Citizen runtime                                                │
-- └──────────────────────────────────────────────────────────────────┘

create table civicos.service_requests (
  id uuid primary key default gen_random_uuid(),
  ref text unique not null,
  citizen_id uuid not null references civicos.citizens(id) on delete cascade,
  target_charter_id text not null,
  service text not null,
  domain text,
  title text,
  status text not null default 'submitted',
  payload jsonb not null default '{}'::jsonb,
  linked_work_item_id uuid references civicos.work_items(id) on delete set null,
  submitted_at timestamptz not null default now(),
  acknowledged_at timestamptz,
  resolved_at timestamptz,
  satisfaction int,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index service_requests_citizen_idx on civicos.service_requests(citizen_id, submitted_at desc);
create index service_requests_target_idx  on civicos.service_requests(target_charter_id, submitted_at desc);
create index service_requests_status_idx  on civicos.service_requests(status) where resolved_at is null;
create trigger service_requests_touch before update on civicos.service_requests
  for each row execute function civicos.touch_updated_at();

create table civicos.consents (
  id uuid primary key default gen_random_uuid(),
  citizen_id uuid not null references civicos.citizens(id) on delete cascade,
  target_charter_id text not null,
  scope text not null,
  status civicos.consent_status not null default 'pending',
  granted_at timestamptz,
  revoked_at timestamptz,
  expires_at timestamptz,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index consents_citizen_idx on civicos.consents(citizen_id);
create index consents_target_idx  on civicos.consents(target_charter_id);
create index consents_status_idx  on civicos.consents(citizen_id, target_charter_id) where status = 'granted';
create unique index consents_unique_scope_idx
  on civicos.consents(citizen_id, target_charter_id, scope)
  where status in ('pending','granted');
create trigger consents_touch before update on civicos.consents
  for each row execute function civicos.touch_updated_at();

create table civicos.appeals (
  id uuid primary key default gen_random_uuid(),
  ref text unique not null,
  citizen_id uuid not null references civicos.citizens(id) on delete cascade,
  originating_charter_id text not null,
  originating_decision_ref text,
  ground text not null,
  status text not null default 'filed',
  decision text,
  reasoning text,
  linked_work_item_id uuid references civicos.work_items(id) on delete set null,
  filed_at timestamptz not null default now(),
  admitted_at timestamptz,
  heard_at timestamptz,
  decided_at timestamptz,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index appeals_citizen_idx     on civicos.appeals(citizen_id, filed_at desc);
create index appeals_originating_idx on civicos.appeals(originating_charter_id, filed_at desc);
create index appeals_status_idx      on civicos.appeals(status) where decided_at is null;
create trigger appeals_touch before update on civicos.appeals
  for each row execute function civicos.touch_updated_at();

-- ┌──────────────────────────────────────────────────────────────────┐
-- │ 9. RLS                                                            │
-- └──────────────────────────────────────────────────────────────────┘

alter table civicos.institutions          enable row level security;
alter table civicos.officers              enable row level security;
alter table civicos.citizens              enable row level security;
alter table civicos.facilities            enable row level security;
alter table civicos.workflow_definitions  enable row level security;
alter table civicos.work_items            enable row level security;
alter table civicos.work_item_steps       enable row level security;
alter table civicos.federation_events     enable row level security;
alter table civicos.event_subscriptions   enable row level security;
alter table civicos.audit_entries         enable row level security;
alter table civicos.directives            enable row level security;
alter table civicos.dispatches            enable row level security;
alter table civicos.escalations           enable row level security;
alter table civicos.posture_history       enable row level security;
alter table civicos.telemetry_streams     enable row level security;
alter table civicos.telemetry_samples     enable row level security;
alter table civicos.service_requests      enable row level security;
alter table civicos.consents              enable row level security;
alter table civicos.appeals               enable row level security;

create policy institutions_read_public        on civicos.institutions       for select to anon, authenticated using (true);
create policy facilities_read_public          on civicos.facilities         for select to anon, authenticated using (true);
create policy workflow_defs_read_public       on civicos.workflow_definitions for select to anon, authenticated using (true);
create policy event_subs_read_public          on civicos.event_subscriptions for select to anon, authenticated using (true);
create policy telemetry_streams_read_public   on civicos.telemetry_streams  for select to anon, authenticated using (true);
create policy directives_read_public          on civicos.directives         for select to anon, authenticated
  using (status in ('signed','effective','rescinded','published'));

create policy work_items_read_authenticated      on civicos.work_items       for select to authenticated using (true);
create policy work_item_steps_read_authenticated on civicos.work_item_steps  for select to authenticated using (true);
create policy federation_events_read_authenticated on civicos.federation_events for select to authenticated using (true);
create policy escalations_read_authenticated     on civicos.escalations      for select to authenticated using (true);
create policy posture_history_read_authenticated on civicos.posture_history  for select to authenticated using (true);
create policy dispatches_read_authenticated      on civicos.dispatches       for select to authenticated using (true);
create policy telemetry_samples_read_authenticated on civicos.telemetry_samples for select to authenticated using (true);
create policy audit_entries_read_authenticated   on civicos.audit_entries    for select to authenticated using (true);
create policy officers_read_authenticated        on civicos.officers         for select to authenticated using (true);

create policy citizens_self_read       on civicos.citizens         for select to authenticated
  using (auth_user_id = auth.uid());
create policy service_requests_self    on civicos.service_requests for all to authenticated
  using (citizen_id in (select id from civicos.citizens where auth_user_id = auth.uid()))
  with check (citizen_id in (select id from civicos.citizens where auth_user_id = auth.uid()));
create policy consents_self            on civicos.consents         for all to authenticated
  using (citizen_id in (select id from civicos.citizens where auth_user_id = auth.uid()))
  with check (citizen_id in (select id from civicos.citizens where auth_user_id = auth.uid()));
create policy appeals_self             on civicos.appeals          for all to authenticated
  using (citizen_id in (select id from civicos.citizens where auth_user_id = auth.uid()))
  with check (citizen_id in (select id from civicos.citizens where auth_user_id = auth.uid()));

-- ┌──────────────────────────────────────────────────────────────────┐
-- │ 10. Realtime publications                                         │
-- └──────────────────────────────────────────────────────────────────┘

alter publication supabase_realtime add table civicos.work_items;
alter publication supabase_realtime add table civicos.work_item_steps;
alter publication supabase_realtime add table civicos.federation_events;
alter publication supabase_realtime add table civicos.escalations;
alter publication supabase_realtime add table civicos.directives;
alter publication supabase_realtime add table civicos.dispatches;
alter publication supabase_realtime add table civicos.posture_history;
alter publication supabase_realtime add table civicos.audit_entries;

-- ┌──────────────────────────────────────────────────────────────────┐
-- │ 11. RPC contracts (SECURITY DEFINER)                              │
-- └──────────────────────────────────────────────────────────────────┘

create or replace function civicos.append_audit(
  p_scope text, p_actor text, p_action text, p_subject text, p_detail text default ''
) returns civicos.audit_entries
language plpgsql security definer
set search_path = pg_catalog, civicos
as $fn$
declare rec civicos.audit_entries;
begin
  if p_scope is null or length(p_scope) = 0 then raise exception 'scope required'; end if;
  if p_actor is null or length(p_actor) = 0 then raise exception 'actor required'; end if;
  insert into civicos.audit_entries (scope, actor, action, subject, detail)
  values (p_scope, p_actor, p_action, p_subject, coalesce(p_detail, ''))
  returning * into rec;
  return rec;
end $fn$;
revoke all on function civicos.append_audit(text,text,text,text,text) from public;
grant execute on function civicos.append_audit(text,text,text,text,text) to anon, authenticated;

create or replace function civicos.publish_event(
  p_type text, p_source text, p_channel text,
  p_payload jsonb default '{}'::jsonb, p_target text default null
) returns civicos.federation_events
language plpgsql security definer
set search_path = pg_catalog, civicos
as $fn$
declare rec civicos.federation_events;
begin
  insert into civicos.federation_events (type, source, target, channel, payload)
  values (p_type, p_source, p_target, p_channel, coalesce(p_payload, '{}'::jsonb))
  returning * into rec;
  return rec;
end $fn$;
revoke all on function civicos.publish_event(text,text,text,jsonb,text) from public;
grant execute on function civicos.publish_event(text,text,text,jsonb,text) to anon, authenticated;

create or replace function civicos.register_institution(
  p_charter_id text, p_label text, p_kind civicos.institution_kind,
  p_domain text, p_archetype_or_branch text,
  p_grammar text default null, p_safeguards_constant text default null,
  p_expected_domains int default null, p_shipped_domains int default null,
  p_meta jsonb default '{}'::jsonb
) returns civicos.institutions
language plpgsql security definer
set search_path = pg_catalog, civicos
as $fn$
declare rec civicos.institutions;
begin
  insert into civicos.institutions
    (charter_id, label, kind, domain, archetype_or_branch, grammar,
     safeguards_constant, expected_domains, shipped_domains, meta)
  values (p_charter_id, p_label, p_kind, p_domain, p_archetype_or_branch, p_grammar,
          p_safeguards_constant, p_expected_domains, p_shipped_domains, coalesce(p_meta, '{}'::jsonb))
  on conflict (charter_id) do update set
    label = excluded.label, kind = excluded.kind, domain = excluded.domain,
    archetype_or_branch = excluded.archetype_or_branch,
    grammar = coalesce(excluded.grammar, civicos.institutions.grammar),
    safeguards_constant = coalesce(excluded.safeguards_constant, civicos.institutions.safeguards_constant),
    expected_domains = coalesce(excluded.expected_domains, civicos.institutions.expected_domains),
    shipped_domains  = coalesce(excluded.shipped_domains,  civicos.institutions.shipped_domains),
    meta = civicos.institutions.meta || coalesce(excluded.meta, '{}'::jsonb),
    updated_at = now()
  returning * into rec;
  return rec;
end $fn$;
revoke all on function civicos.register_institution(text,text,civicos.institution_kind,text,text,text,text,int,int,jsonb) from public;
grant execute on function civicos.register_institution(text,text,civicos.institution_kind,text,text,text,text,int,int,jsonb) to anon, authenticated;

create or replace function civicos.activate_institution(p_charter_id text)
returns civicos.institutions language plpgsql security definer
set search_path = pg_catalog, civicos
as $fn$
declare rec civicos.institutions;
begin
  update civicos.institutions
     set activated = true, activated_at = now(), updated_at = now()
   where charter_id = p_charter_id and activated = false
   returning * into rec;
  if rec.id is null then
    select * into rec from civicos.institutions where charter_id = p_charter_id;
  end if;
  return rec;
end $fn$;
revoke all on function civicos.activate_institution(text) from public;
grant execute on function civicos.activate_institution(text) to anon, authenticated;

create or replace function civicos.record_posture(
  p_charter_id text, p_posture civicos.posture, p_readiness int default null,
  p_stress int default null, p_detail jsonb default '{}'::jsonb
) returns civicos.posture_history
language plpgsql security definer
set search_path = pg_catalog, civicos
as $fn$
declare rec civicos.posture_history;
begin
  insert into civicos.posture_history (charter_id, posture, readiness, stress, detail)
  values (p_charter_id, p_posture, p_readiness, p_stress, coalesce(p_detail, '{}'::jsonb))
  returning * into rec;
  return rec;
end $fn$;
revoke all on function civicos.record_posture(text,civicos.posture,int,int,jsonb) from public;
grant execute on function civicos.record_posture(text,civicos.posture,int,int,jsonb) to anon, authenticated;

revoke all on function civicos.verify_audit_chain(text) from public;
grant execute on function civicos.verify_audit_chain(text) to anon, authenticated;

-- ┌──────────────────────────────────────────────────────────────────┐
-- │ 12. Public API surface — views & RPC wrappers (PostgREST-visible) │
-- └──────────────────────────────────────────────────────────────────┘

create or replace view public.civicos_audit_entries with (security_invoker = true) as
  select id, scope, seq, actor, action, subject, detail, at, at_ms, prev_hash, hash from civicos.audit_entries;
create or replace view public.civicos_institutions with (security_invoker = true) as select * from civicos.institutions;
create or replace view public.civicos_workflow_definitions with (security_invoker = true) as select * from civicos.workflow_definitions;
create or replace view public.civicos_work_items with (security_invoker = true) as select * from civicos.work_items;
create or replace view public.civicos_work_item_steps with (security_invoker = true) as select * from civicos.work_item_steps;
create or replace view public.civicos_federation_events with (security_invoker = true) as select * from civicos.federation_events;
create or replace view public.civicos_event_subscriptions with (security_invoker = true) as select * from civicos.event_subscriptions;
create or replace view public.civicos_directives with (security_invoker = true) as select * from civicos.directives;
create or replace view public.civicos_dispatches with (security_invoker = true) as select * from civicos.dispatches;
create or replace view public.civicos_escalations with (security_invoker = true) as select * from civicos.escalations;
create or replace view public.civicos_posture_history with (security_invoker = true) as select * from civicos.posture_history;
create or replace view public.civicos_telemetry_streams with (security_invoker = true) as select * from civicos.telemetry_streams;
create or replace view public.civicos_telemetry_samples with (security_invoker = true) as select * from civicos.telemetry_samples;
create or replace view public.civicos_facilities with (security_invoker = true) as select * from civicos.facilities;
create or replace view public.civicos_officers with (security_invoker = true) as
  select id, auth_user_id, institution_id, charter_id, role, title, name, email, active, joined_at, meta, created_at, updated_at from civicos.officers;
create or replace view public.civicos_citizens with (security_invoker = true) as select * from civicos.citizens;
create or replace view public.civicos_service_requests with (security_invoker = true) as select * from civicos.service_requests;
create or replace view public.civicos_consents with (security_invoker = true) as select * from civicos.consents;
create or replace view public.civicos_appeals with (security_invoker = true) as select * from civicos.appeals;

grant select on
  public.civicos_audit_entries, public.civicos_institutions, public.civicos_workflow_definitions,
  public.civicos_work_items, public.civicos_work_item_steps, public.civicos_federation_events,
  public.civicos_event_subscriptions, public.civicos_directives, public.civicos_dispatches,
  public.civicos_escalations, public.civicos_posture_history, public.civicos_telemetry_streams,
  public.civicos_telemetry_samples, public.civicos_facilities, public.civicos_officers,
  public.civicos_citizens, public.civicos_service_requests, public.civicos_consents, public.civicos_appeals
  to anon, authenticated;

create or replace function public.civicos_append_audit(
  p_scope text, p_actor text, p_action text, p_subject text, p_detail text default ''
) returns civicos.audit_entries language sql security definer
set search_path = pg_catalog, civicos
as $fn$ select civicos.append_audit(p_scope, p_actor, p_action, p_subject, p_detail); $fn$;
revoke all on function public.civicos_append_audit(text,text,text,text,text) from public;
grant execute on function public.civicos_append_audit(text,text,text,text,text) to anon, authenticated;

create or replace function public.civicos_verify_audit_chain(p_scope text)
returns table (entries bigint, intact boolean, broken_at bigint) language sql security definer
set search_path = pg_catalog, civicos
as $fn$ select * from civicos.verify_audit_chain(p_scope); $fn$;
revoke all on function public.civicos_verify_audit_chain(text) from public;
grant execute on function public.civicos_verify_audit_chain(text) to anon, authenticated;

create or replace function public.civicos_publish_event(
  p_type text, p_source text, p_channel text,
  p_payload jsonb default '{}'::jsonb, p_target text default null
) returns civicos.federation_events language sql security definer
set search_path = pg_catalog, civicos
as $fn$ select civicos.publish_event(p_type, p_source, p_channel, p_payload, p_target); $fn$;
revoke all on function public.civicos_publish_event(text,text,text,jsonb,text) from public;
grant execute on function public.civicos_publish_event(text,text,text,jsonb,text) to anon, authenticated;

create or replace function public.civicos_register_institution(
  p_charter_id text, p_label text, p_kind text, p_domain text, p_archetype_or_branch text,
  p_grammar text default null, p_safeguards_constant text default null,
  p_expected_domains int default null, p_shipped_domains int default null,
  p_meta jsonb default '{}'::jsonb
) returns civicos.institutions language sql security definer
set search_path = pg_catalog, civicos
as $fn$ select civicos.register_institution(p_charter_id, p_label, p_kind::civicos.institution_kind,
  p_domain, p_archetype_or_branch, p_grammar, p_safeguards_constant,
  p_expected_domains, p_shipped_domains, p_meta); $fn$;
revoke all on function public.civicos_register_institution(text,text,text,text,text,text,text,int,int,jsonb) from public;
grant execute on function public.civicos_register_institution(text,text,text,text,text,text,text,int,int,jsonb) to anon, authenticated;

create or replace function public.civicos_activate_institution(p_charter_id text)
returns civicos.institutions language sql security definer
set search_path = pg_catalog, civicos
as $fn$ select civicos.activate_institution(p_charter_id); $fn$;
revoke all on function public.civicos_activate_institution(text) from public;
grant execute on function public.civicos_activate_institution(text) to anon, authenticated;

create or replace function public.civicos_record_posture(
  p_charter_id text, p_posture text, p_readiness int default null,
  p_stress int default null, p_detail jsonb default '{}'::jsonb
) returns civicos.posture_history language sql security definer
set search_path = pg_catalog, civicos
as $fn$ select civicos.record_posture(p_charter_id, p_posture::civicos.posture,
  p_readiness, p_stress, p_detail); $fn$;
revoke all on function public.civicos_record_posture(text,text,int,int,jsonb) from public;
grant execute on function public.civicos_record_posture(text,text,int,int,jsonb) to anon, authenticated;
