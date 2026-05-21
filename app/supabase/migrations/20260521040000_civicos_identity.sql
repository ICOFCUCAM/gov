-- 20260521040000_civicos_identity.sql
--
-- Phase A.5 · identity contracts.
--
-- Bridges Supabase Auth to civicos.officers / civicos.citizens. The
-- in-app identity is the auth.uid() of the current session; this
-- migration provides the contract for:
--
--   • current_actor()   — returns { kind, id, name, charter_id } for the
--                         signed-in user. Officer takes precedence
--                         (an account can wear an institutional hat);
--                         otherwise the citizen record. Null when
--                         neither is linked yet.
--   • claim_citizen()   — first-touch provisioning: if the signed-in
--                         auth.uid() is not yet linked to a citizen,
--                         create one and link. Idempotent: returns the
--                         existing citizen on subsequent calls.
--   • link_officer_by_email() — administrative bridge: link an existing
--                         officer record (matched by email) to the
--                         calling auth.uid(). Called by officers signing
--                         in for the first time on devices that match
--                         their registered email.

set search_path = civicos, pg_catalog;

create type civicos.actor_kind as enum ('officer', 'citizen');

create or replace function civicos.current_actor()
returns table (
  kind civicos.actor_kind,
  id uuid,
  name text,
  role text,
  charter_id text,
  email text
)
language plpgsql stable security definer
set search_path = pg_catalog, civicos
as $fn$
declare uid uuid := auth.uid();
begin
  if uid is null then return; end if;
  return query
    select 'officer'::civicos.actor_kind, o.id, o.name, o.role, o.charter_id, o.email
      from civicos.officers o
     where o.auth_user_id = uid and o.active
     limit 1;
  if found then return; end if;
  return query
    select 'citizen'::civicos.actor_kind, c.id,
           coalesce(c.display_name, c.national_id, 'Citizen'),
           null::text, null::text, null::text
      from civicos.citizens c
     where c.auth_user_id = uid and c.active
     limit 1;
end $fn$;

revoke all on function civicos.current_actor() from public;
grant execute on function civicos.current_actor() to anon, authenticated;

create or replace function civicos.claim_citizen(
  p_display_name text default null,
  p_region text default null,
  p_national_id text default null
) returns civicos.citizens
language plpgsql security definer
set search_path = pg_catalog, civicos
as $fn$
declare
  uid uuid := auth.uid();
  rec civicos.citizens;
begin
  if uid is null then
    raise exception 'not authenticated' using errcode = 'insufficient_privilege';
  end if;

  select * into rec from civicos.citizens where auth_user_id = uid limit 1;
  if rec.id is not null then return rec; end if;

  if p_national_id is not null then
    select * into rec from civicos.citizens where national_id = p_national_id limit 1;
    if rec.id is not null then
      update civicos.citizens
         set auth_user_id = uid,
             display_name = coalesce(p_display_name, display_name),
             region       = coalesce(p_region, region),
             updated_at   = now()
       where id = rec.id
       returning * into rec;
      return rec;
    end if;
  end if;

  insert into civicos.citizens
    (auth_user_id, national_id, display_name, region)
  values (uid, p_national_id, p_display_name, p_region)
  returning * into rec;
  return rec;
end $fn$;

revoke all on function civicos.claim_citizen(text,text,text) from public;
grant execute on function civicos.claim_citizen(text,text,text) to authenticated;

create or replace function civicos.link_officer_by_email(p_email text)
returns civicos.officers
language plpgsql security definer
set search_path = pg_catalog, civicos
as $fn$
declare
  uid uuid := auth.uid();
  caller_email text;
  rec civicos.officers;
begin
  if uid is null then
    raise exception 'not authenticated' using errcode = 'insufficient_privilege';
  end if;
  if p_email is null or length(p_email) = 0 then
    raise exception 'email required';
  end if;

  -- The caller can only claim an officer record matching their own auth
  -- email. We read the email out of auth.users; only the service-role
  -- bypass could fake this, and this function is anon/authenticated.
  select email into caller_email from auth.users where id = uid;
  if caller_email is null then
    raise exception 'auth.users row missing for current session';
  end if;
  if lower(caller_email) <> lower(p_email) then
    raise exception 'caller email does not match requested officer email'
      using errcode = 'insufficient_privilege';
  end if;

  update civicos.officers
     set auth_user_id = uid, updated_at = now()
   where lower(email) = lower(p_email)
     and (auth_user_id is null or auth_user_id = uid)
   returning * into rec;

  if rec.id is null then
    raise exception 'no officer record matches email % (or it is already linked to a different user)', p_email
      using errcode = 'no_data_found';
  end if;
  return rec;
end $fn$;

revoke all on function civicos.link_officer_by_email(text) from public;
grant execute on function civicos.link_officer_by_email(text) to authenticated;

-- ┌────────────────────────────────────────────────────────────────┐
-- │ Public wrappers                                                 │
-- └────────────────────────────────────────────────────────────────┘

create or replace function public.civicos_current_actor()
returns table (
  kind civicos.actor_kind, id uuid, name text, role text,
  charter_id text, email text
) language sql security definer
set search_path = pg_catalog, civicos
as $fn$ select * from civicos.current_actor(); $fn$;
revoke all on function public.civicos_current_actor() from public;
grant execute on function public.civicos_current_actor() to anon, authenticated;

create or replace function public.civicos_claim_citizen(
  p_display_name text default null, p_region text default null,
  p_national_id text default null
) returns civicos.citizens language sql security definer
set search_path = pg_catalog, civicos
as $fn$ select civicos.claim_citizen(p_display_name, p_region, p_national_id); $fn$;
revoke all on function public.civicos_claim_citizen(text,text,text) from public;
grant execute on function public.civicos_claim_citizen(text,text,text) to authenticated;

create or replace function public.civicos_link_officer_by_email(p_email text)
returns civicos.officers language sql security definer
set search_path = pg_catalog, civicos
as $fn$ select civicos.link_officer_by_email(p_email); $fn$;
revoke all on function public.civicos_link_officer_by_email(text) from public;
grant execute on function public.civicos_link_officer_by_email(text) to authenticated;
