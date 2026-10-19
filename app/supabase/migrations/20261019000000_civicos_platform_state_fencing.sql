-- 20261019000000_civicos_platform_state_fencing.sql
--
-- One writer for the platform state (register 1.1; architecture review R4).
-- The application server saves each store as a JSON snapshot in
-- civicos.platform_state (migration 20261017000000). Until now a save was a
-- blind upsert, so a second server (two replicas, or an overlapping rollout)
-- could overwrite newer state with older. This adds:
--
--   * a version per key, raised on every save (also by the old two-argument
--     put, so an older server's saves are still detected);
--   * a single writer's lease (one row, renewed by the writer on every save,
--     given up on shutdown, taken over only once it has expired);
--   * platform_state_put_versioned(key, value, writer, expected): saves only
--     when the writer holds the lease and the stored version is the one it
--     read; otherwise it raises and nothing is written.
--
-- app/src/lib/data/persist.ts uses these when present and reports
-- "fencing: none" in /api/health until this migration is applied.
-- Only the service role may call any of it.

set search_path = civicos, pg_catalog;

alter table civicos.platform_state add column if not exists version bigint not null default 0;
alter table civicos.platform_state add column if not exists writer text;

create table if not exists civicos.platform_state_lease (
  id          smallint primary key default 1 check (id = 1),
  writer      text not null,
  acquired_at timestamptz not null,
  renewed_at  timestamptz not null,
  expires_at  timestamptz not null
);
alter table civicos.platform_state_lease enable row level security;
revoke all on civicos.platform_state_lease from public, anon, authenticated;

-- The earlier put keeps working (older servers), and now raises the version.
create or replace function civicos.platform_state_put(p_key text, p_value text)
returns void
language sql security definer set search_path = civicos, pg_catalog
as $$
  insert into civicos.platform_state (key, value, updated_at, version, writer) values (p_key, p_value, now(), 1, null)
  on conflict (key) do update set value = excluded.value, updated_at = now(),
    version = civicos.platform_state.version + 1, writer = null
$$;

create or replace function civicos.platform_state_versions()
returns table (key text, version bigint)
language sql security definer set search_path = civicos, pg_catalog
as $$ select s.key, s.version from civicos.platform_state s $$;

-- Take or renew the lease. Granted when nobody holds it, the caller already
-- does, or the holder's lease has expired.
create or replace function civicos.platform_state_lease(p_writer text, p_ttl_seconds integer)
returns table (holder text, expires_at timestamptz, acquired boolean)
language plpgsql security definer set search_path = civicos, pg_catalog
as $$
#variable_conflict use_column
declare
  r civicos.platform_state_lease%rowtype;
begin
  if p_writer is null or length(p_writer) = 0 then
    raise exception 'civicos: a writer id is required';
  end if;
  if p_ttl_seconds is null or p_ttl_seconds < 1 or p_ttl_seconds > 3600 then
    raise exception 'civicos: lease ttl must be 1..3600 seconds';
  end if;
  insert into civicos.platform_state_lease as l (id, writer, acquired_at, renewed_at, expires_at)
  values (1, p_writer, now(), now(), now() + make_interval(secs => p_ttl_seconds))
  on conflict (id) do update set
    writer      = excluded.writer,
    acquired_at = case when l.writer = excluded.writer then l.acquired_at else now() end,
    renewed_at  = now(),
    expires_at  = excluded.expires_at
  where l.writer = excluded.writer or l.expires_at < now();
  select * into r from civicos.platform_state_lease where id = 1;
  return query select r.writer, r.expires_at, r.writer = p_writer;
end
$$;

create or replace function civicos.platform_state_release(p_writer text)
returns void
language sql security definer set search_path = civicos, pg_catalog
as $$ delete from civicos.platform_state_lease where id = 1 and writer = p_writer $$;

-- A fenced save: only the lease holder, only over the version it read.
create or replace function civicos.platform_state_put_versioned(p_key text, p_value text, p_writer text, p_expected bigint)
returns bigint
language plpgsql security definer set search_path = civicos, pg_catalog
as $$
#variable_conflict use_column
declare
  v bigint;
begin
  if not exists (select 1 from civicos.platform_state_lease l where l.id = 1 and l.writer = p_writer and l.expires_at >= now()) then
    raise exception 'civicos: writer % does not hold the state lease', p_writer using errcode = '40001';
  end if;
  update civicos.platform_state s set value = p_value, updated_at = now(), version = s.version + 1, writer = p_writer
   where s.key = p_key and s.version = p_expected
  returning s.version into v;
  if v is null and p_expected = 0 then
    insert into civicos.platform_state (key, value, updated_at, version, writer)
    values (p_key, p_value, now(), 1, p_writer)
    on conflict (key) do nothing
    returning version into v;
  end if;
  if v is null then
    raise exception 'civicos: % was saved by another writer since version %', p_key, p_expected using errcode = '40001';
  end if;
  return v;
end
$$;

revoke all on function civicos.platform_state_versions() from public, anon, authenticated;
revoke all on function civicos.platform_state_lease(text, integer) from public, anon, authenticated;
revoke all on function civicos.platform_state_release(text) from public, anon, authenticated;
revoke all on function civicos.platform_state_put_versioned(text, text, text, bigint) from public, anon, authenticated;
grant execute on function civicos.platform_state_versions() to service_role;
grant execute on function civicos.platform_state_lease(text, integer) to service_role;
grant execute on function civicos.platform_state_release(text) to service_role;
grant execute on function civicos.platform_state_put_versioned(text, text, text, bigint) to service_role;

-- The server calls these through PostgREST's public schema.
create or replace function public.civicos_platform_state_versions() returns table (key text, version bigint)
language sql security definer set search_path = civicos, pg_catalog as $$ select * from civicos.platform_state_versions() $$;
create or replace function public.civicos_platform_state_lease(p_writer text, p_ttl_seconds integer) returns table (holder text, expires_at timestamptz, acquired boolean)
language sql security definer set search_path = civicos, pg_catalog as $$ select * from civicos.platform_state_lease(p_writer, p_ttl_seconds) $$;
create or replace function public.civicos_platform_state_release(p_writer text) returns void
language sql security definer set search_path = civicos, pg_catalog as $$ select civicos.platform_state_release(p_writer) $$;
create or replace function public.civicos_platform_state_put_versioned(p_key text, p_value text, p_writer text, p_expected bigint) returns bigint
language sql security definer set search_path = civicos, pg_catalog as $$ select civicos.platform_state_put_versioned(p_key, p_value, p_writer, p_expected) $$;
revoke all on function public.civicos_platform_state_versions() from public, anon, authenticated;
revoke all on function public.civicos_platform_state_lease(text, integer) from public, anon, authenticated;
revoke all on function public.civicos_platform_state_release(text) from public, anon, authenticated;
revoke all on function public.civicos_platform_state_put_versioned(text, text, text, bigint) from public, anon, authenticated;
grant execute on function public.civicos_platform_state_versions() to service_role;
grant execute on function public.civicos_platform_state_lease(text, integer) to service_role;
grant execute on function public.civicos_platform_state_release(text) to service_role;
grant execute on function public.civicos_platform_state_put_versioned(text, text, text, bigint) to service_role;
