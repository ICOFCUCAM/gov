-- 20261017000000_civicos_platform_state.sql
--
-- Durable platform state (register 1.1). The application server keeps its
-- operational stores (nation profile, ministry registry, audit chain, Update
-- Center, public-site settings and editorial …) and saves each one here as a
-- JSON snapshot (app/src/lib/data/persist.ts, CIVICOS_STATE=supabase). Only the
-- service role reads or writes it; no other role can see the table.

set search_path = civicos, pg_catalog;

create table if not exists civicos.platform_state (
  key        text primary key check (key ~ '^__civicos[A-Za-z0-9_]*$'),
  value      text not null,
  updated_at timestamptz not null default now()
);

alter table civicos.platform_state enable row level security;
revoke all on civicos.platform_state from public, anon, authenticated;

create or replace function civicos.platform_state_all()
returns table (key text, value text)
language sql security definer set search_path = civicos, pg_catalog
as $$ select key, value from civicos.platform_state $$;

create or replace function civicos.platform_state_put(p_key text, p_value text)
returns void
language sql security definer set search_path = civicos, pg_catalog
as $$
  insert into civicos.platform_state (key, value, updated_at) values (p_key, p_value, now())
  on conflict (key) do update set value = excluded.value, updated_at = now()
$$;

revoke all on function civicos.platform_state_all() from public, anon, authenticated;
revoke all on function civicos.platform_state_put(text, text) from public, anon, authenticated;
grant execute on function civicos.platform_state_all() to service_role;
grant execute on function civicos.platform_state_put(text, text) to service_role;

-- The server calls these through PostgREST's public schema.
create or replace function public.civicos_platform_state_all() returns table (key text, value text)
language sql security definer set search_path = civicos, pg_catalog as $$ select * from civicos.platform_state_all() $$;
create or replace function public.civicos_platform_state_put(p_key text, p_value text) returns void
language sql security definer set search_path = civicos, pg_catalog as $$ select civicos.platform_state_put(p_key, p_value) $$;
revoke all on function public.civicos_platform_state_all() from public, anon, authenticated;
revoke all on function public.civicos_platform_state_put(text, text) from public, anon, authenticated;
grant execute on function public.civicos_platform_state_all() to service_role;
grant execute on function public.civicos_platform_state_put(text, text) to service_role;
