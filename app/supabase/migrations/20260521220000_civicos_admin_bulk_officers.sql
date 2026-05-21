-- 20260521220000_civicos_admin_bulk_officers.sql
--
-- Phase B · bulk officer onboarding.
--
-- One round trip to provision N officers. Wraps admin_create_officer in a
-- loop, returning a per-row result so the caller can show exactly which
-- entries succeeded and which failed without parsing PostgREST errors.
--
-- All-or-nothing semantics are explicitly NOT used: partial onboarding
-- batches happen in real life (one bad email shouldn't roll back the
-- other 49 officers). Each row's outcome is independent.

set search_path = civicos, pg_catalog;

-- Composite returned shape: { input identity + status + error message }.
-- jsonb makes the per-row result self-describing without a custom type.
create or replace function civicos.admin_bulk_create_officers(p_rows jsonb)
returns jsonb
language plpgsql
security definer
set search_path = civicos, pg_catalog
as $$
declare
  v_input  jsonb;
  v_result jsonb := '[]'::jsonb;
  v_row    civicos.officers;
  v_status text;
  v_error  text;
  -- service_role / postgres bypass the auth.uid() check — that's how the
  -- server-side /api/admin/officers/bulk route invokes this. Other
  -- sessions must hold a platform-tier officer role.
  v_privileged boolean := session_user in ('service_role','postgres');
begin
  if not v_privileged and not civicos.is_platform_officer() then
    raise exception 'admin_bulk_create_officers requires a platform-tier role or service_role'
      using errcode = 'insufficient_privilege';
  end if;
  if p_rows is null or jsonb_typeof(p_rows) <> 'array' then
    raise exception 'p_rows must be a JSON array of {email,name,charter_id,role,title} objects';
  end if;

  for v_input in select * from jsonb_array_elements(p_rows) loop
    v_status := 'created';
    v_error  := null;
    begin
      v_row := civicos.admin_create_officer(
        p_email      := v_input->>'email',
        p_name       := v_input->>'name',
        p_charter_id := v_input->>'charter_id',
        p_role       := v_input->>'role',
        p_title      := v_input->>'title'
      );
    exception when others then
      v_row    := null;
      v_status := 'failed';
      v_error  := sqlerrm;
    end;
    v_result := v_result || jsonb_build_object(
      'email',       v_input->>'email',
      'name',        v_input->>'name',
      'charter_id',  v_input->>'charter_id',
      'role',        v_input->>'role',
      'officer_id',  (case when v_row is null then null else v_row.id::text end),
      'status',      v_status,
      'error',       v_error
    );
  end loop;

  return v_result;
end$$;

-- Public wrapper.
create or replace function public.civicos_admin_bulk_create_officers(p_rows jsonb)
returns jsonb
language sql
security definer
set search_path = public, pg_catalog
as $$ select civicos.admin_bulk_create_officers(p_rows); $$;

-- Mirror the privilege model of admin_create_officer / admin_deactivate
-- — service_role only. (Officers call the bulk RPC via the server-side
-- /api/admin/officers/bulk route which uses the service-role client.)
revoke execute on function public.civicos_admin_bulk_create_officers(jsonb)
  from anon, authenticated;

-- Also widen admin_create_officer's privilege check to the same shape
-- so the bulk RPC's inner per-row calls succeed under service_role.
create or replace function civicos.admin_create_officer(
  p_email text, p_name text, p_charter_id text, p_role text,
  p_title text default null
) returns civicos.officers
language plpgsql security definer
set search_path = pg_catalog, civicos
as $fn$
declare
  rec civicos.officers;
  v_privileged boolean := session_user in ('service_role','postgres');
begin
  if not v_privileged and not civicos.is_platform_officer() then
    raise exception 'admin_create_officer requires a platform-tier role or service_role'
      using errcode = 'insufficient_privilege';
  end if;
  if p_email is null or p_name is null or p_charter_id is null or p_role is null
     or length(p_email) = 0 or length(p_name) = 0 or length(p_charter_id) = 0 or length(p_role) = 0 then
    raise exception 'admin_create_officer: email, name, charter_id, role required';
  end if;
  insert into civicos.officers (email, name, charter_id, role, title, active)
  values (lower(trim(p_email)), trim(p_name), trim(p_charter_id), trim(p_role), p_title, true)
  on conflict (email) do update set
    name = excluded.name,
    charter_id = excluded.charter_id,
    role = excluded.role,
    title = coalesce(excluded.title, civicos.officers.title),
    active = true
  returning * into rec;
  return rec;
end$fn$;
