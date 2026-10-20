-- 20261025000000_civicos_case_mirror.sql
--
-- Cases under approved procedures are owned by the platform (app/src/lib/casework/,
-- docs/GOVERNMENT_OPERATING_MODEL.md §2.2, order of work step 12). The
-- substrate keeps a mirror of each case's progress for its own aggregates and
-- realtime feeds: the procedure, the responsible institution, the stage,
-- priority, sensitivity, the next deadline and whether a second official's
-- approval is waiting. No field, party, document or decision content is
-- copied: personal data stays in the platform under the case rules.
--
-- The platform writes it after its own commit through the mirror writer
-- (app/src/lib/db/mirror.ts), with the service role; nothing else writes it.
-- Reads: platform-tier officials only (the browser asks the platform).

set search_path = civicos, pg_catalog;

create table if not exists civicos.case_mirror (
  id uuid primary key,
  ref text not null unique,
  procedure_key text not null,
  procedure_version integer not null,
  owner_institution text not null,
  stage text not null,
  priority text not null check (priority in ('routine', 'priority', 'urgent')),
  sensitivity text not null,
  pending_approval boolean not null default false,
  next_due timestamptz,
  source text not null,
  opened_at timestamptz not null,
  closed_at timestamptz,
  mirrored_at timestamptz not null default now()
);
create index if not exists case_mirror_owner_open on civicos.case_mirror (owner_institution) where closed_at is null;
create index if not exists case_mirror_next_due on civicos.case_mirror (next_due) where closed_at is null;

alter table civicos.case_mirror enable row level security;
drop policy if exists case_mirror_platform_read on civicos.case_mirror;
create policy case_mirror_platform_read on civicos.case_mirror for select to authenticated using (civicos.is_platform_officer());

create or replace function civicos.mirror_case(p_row jsonb)
returns civicos.case_mirror
language plpgsql security definer
set search_path = pg_catalog, civicos
as $fn$
declare
  rec civicos.case_mirror;
begin
  if p_row is null or coalesce(p_row->>'id', '') !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then raise exception 'case id required'; end if;
  insert into civicos.case_mirror
    (id, ref, procedure_key, procedure_version, owner_institution, stage, priority, sensitivity, pending_approval, next_due, source, opened_at, closed_at, mirrored_at)
  values (
    (p_row->>'id')::uuid, p_row->>'ref', p_row->>'procedure_key', (p_row->>'procedure_version')::integer,
    p_row->>'owner_institution', p_row->>'stage', coalesce(p_row->>'priority', 'routine'), coalesce(p_row->>'sensitivity', 'normal'),
    coalesce((p_row->>'pending_approval')::boolean, false), (p_row->>'next_due')::timestamptz, coalesce(p_row->>'source', 'entered'),
    (p_row->>'opened_at')::timestamptz, (p_row->>'closed_at')::timestamptz, now()
  )
  on conflict (id) do update set
    stage = excluded.stage, priority = excluded.priority, sensitivity = excluded.sensitivity,
    pending_approval = excluded.pending_approval, next_due = excluded.next_due,
    owner_institution = excluded.owner_institution, closed_at = excluded.closed_at, mirrored_at = now()
  returning * into rec;
  return rec;
end $fn$;

create or replace function public.civicos_mirror_case(p_row jsonb)
returns civicos.case_mirror language sql security definer set search_path = public, pg_catalog
as $fn$ select civicos.mirror_case(p_row); $fn$;

revoke all on function civicos.mirror_case(jsonb) from public, anon, authenticated;
revoke all on function public.civicos_mirror_case(jsonb) from public, anon, authenticated;
grant execute on function civicos.mirror_case(jsonb) to service_role;
grant execute on function public.civicos_mirror_case(jsonb) to service_role;
