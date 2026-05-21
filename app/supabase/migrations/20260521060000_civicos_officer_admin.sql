-- 20260521060000_civicos_officer_admin.sql
--
-- Phase A.5 · officer admin RPCs.
--
-- The bootstrap path for officers was: a DBA inserts a row into
-- civicos.officers, and the officer claims it by signing in with the
-- matching email (link_officer_by_email). This migration adds an
-- in-app RPC for that creation step — restricted to platform-tier
-- callers so any officer with admin standing can provision colleagues
-- without needing the service role.

set search_path = civicos, pg_catalog;

create or replace function civicos.admin_create_officer(
  p_email text, p_name text, p_charter_id text, p_role text,
  p_title text default null
) returns civicos.officers
language plpgsql security definer
set search_path = pg_catalog, civicos
as $fn$
declare rec civicos.officers;
begin
  if not civicos.is_platform_officer() then
    raise exception 'admin_create_officer requires a platform-tier role'
      using errcode = 'insufficient_privilege';
  end if;
  if p_email is null or length(p_email) = 0 then raise exception 'email required'; end if;
  if p_name  is null or length(p_name)  = 0 then raise exception 'name required';  end if;
  if p_charter_id is null or length(p_charter_id) = 0 then raise exception 'charter_id required'; end if;
  if p_role  is null or length(p_role)  = 0 then raise exception 'role required';  end if;

  insert into civicos.officers (email, name, charter_id, role, title, active)
  values (lower(p_email), p_name, p_charter_id, p_role, p_title, true)
  on conflict (email) do update set
    name = excluded.name,
    charter_id = excluded.charter_id,
    role = excluded.role,
    title = coalesce(excluded.title, civicos.officers.title),
    active = true,
    updated_at = now()
  returning * into rec;
  return rec;
end $fn$;

create or replace function civicos.admin_deactivate_officer(p_id uuid)
returns civicos.officers
language plpgsql security definer
set search_path = pg_catalog, civicos
as $fn$
declare rec civicos.officers;
begin
  if not civicos.is_platform_officer() then
    raise exception 'admin_deactivate_officer requires a platform-tier role'
      using errcode = 'insufficient_privilege';
  end if;
  update civicos.officers set active = false, updated_at = now()
   where id = p_id
   returning * into rec;
  if rec.id is null then raise exception 'officer % not found', p_id; end if;
  return rec;
end $fn$;

revoke all on function civicos.admin_create_officer(text,text,text,text,text) from public;
revoke all on function civicos.admin_deactivate_officer(uuid) from public;
grant execute on function civicos.admin_create_officer(text,text,text,text,text) to authenticated;
grant execute on function civicos.admin_deactivate_officer(uuid) to authenticated;

create or replace function public.civicos_admin_create_officer(
  p_email text, p_name text, p_charter_id text, p_role text,
  p_title text default null
) returns civicos.officers language sql security definer
set search_path = pg_catalog, civicos
as $fn$ select civicos.admin_create_officer(p_email, p_name, p_charter_id, p_role, p_title); $fn$;
revoke all on function public.civicos_admin_create_officer(text,text,text,text,text) from public;
grant execute on function public.civicos_admin_create_officer(text,text,text,text,text) to authenticated;

create or replace function public.civicos_admin_deactivate_officer(p_id uuid)
returns civicos.officers language sql security definer
set search_path = pg_catalog, civicos
as $fn$ select civicos.admin_deactivate_officer(p_id); $fn$;
revoke all on function public.civicos_admin_deactivate_officer(uuid) from public;
grant execute on function public.civicos_admin_deactivate_officer(uuid) to authenticated;
