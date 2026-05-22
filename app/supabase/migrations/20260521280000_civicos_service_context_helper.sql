-- 20260521280000_civicos_service_context_helper.sql
--
-- Phase A · correctness: privilege checks must recognise the PostgREST
-- service_role path.
--
-- Supabase PostgREST connects as `authenticator` and `SET ROLE`s to the
-- JWT's role. So inside our SECURITY DEFINER RPCs, `session_user` is
-- `authenticator` (not `service_role`) for every REST call — meaning the
-- earlier `session_user in ('service_role','postgres')` guards would
-- REJECT legitimate service-role calls coming through the app's
-- serverClient. (They only passed for direct postgres/MCP connections.)
--
-- `auth.role()` reads request.jwt.claims.role and is the reliable signal
-- for the REST service key; `session_user`/`current_user` cover the
-- direct-admin path. This helper unifies them, and we retrofit every
-- service-role-gated RPC to use it.

set search_path = civicos, pg_catalog;

create or replace function civicos.is_service_context()
returns boolean
language sql
stable
set search_path = civicos, pg_catalog
as $$
  select coalesce((select auth.role()) = 'service_role', false)
      or session_user in ('postgres', 'service_role')
      or current_user in ('postgres', 'service_role');
$$;

-- ── Retrofit: webhook cursor/failure RPCs (service-role only) ──
create or replace function civicos.mark_webhook_delivered(
  p_id uuid, p_last_event_id uuid, p_cursor_at_ms bigint, p_delivered int
) returns void
language plpgsql security definer
set search_path = civicos, pg_catalog
as $$
begin
  if not civicos.is_service_context() then
    raise exception 'mark_webhook_delivered requires service_role'
      using errcode = 'insufficient_privilege';
  end if;
  update civicos.event_webhooks
  set cursor_at_ms      = greatest(cursor_at_ms, p_cursor_at_ms),
      last_event_id     = p_last_event_id,
      last_delivered_at = now(),
      delivered_count   = delivered_count + greatest(0, p_delivered),
      failures          = 0,
      last_error        = null,
      updated_at        = now()
  where id = p_id;
end$$;

create or replace function civicos.record_webhook_failure(p_id uuid, p_error text)
returns void
language plpgsql security definer
set search_path = civicos, pg_catalog
as $$
begin
  if not civicos.is_service_context() then
    raise exception 'record_webhook_failure requires service_role'
      using errcode = 'insufficient_privilege';
  end if;
  update civicos.event_webhooks
  set failures   = failures + 1,
      last_error = left(coalesce(p_error,'error'), 500),
      updated_at = now()
  where id = p_id;
end$$;

-- ── Retrofit: webhook register/list (platform-tier OR service) ──
create or replace function civicos.register_event_webhook(
  p_channel text, p_url text, p_secret text, p_description text default null
) returns uuid
language plpgsql security definer
set search_path = civicos, pg_catalog
as $$
declare v_id uuid;
begin
  if not (civicos.is_service_context() or civicos.is_platform_officer()) then
    raise exception 'register_event_webhook requires a platform-tier role'
      using errcode = 'insufficient_privilege';
  end if;
  if p_channel is null or length(p_channel)=0 or p_url is null or length(p_url)=0
     or p_secret is null or length(p_secret) < 8 then
    raise exception 'channel, url required; secret must be >= 8 chars';
  end if;
  insert into civicos.event_webhooks (channel, url, secret, description, created_by)
  values (p_channel, p_url, p_secret, p_description,
          coalesce((select name from civicos.officers where auth_user_id = auth.uid()), 'service'))
  returning id into v_id;
  return v_id;
end$$;

create or replace function civicos.list_event_webhooks()
returns table(
  id uuid, channel text, url text, description text, active boolean,
  cursor_at_ms bigint, last_delivered_at timestamptz,
  delivered_count bigint, failures int, last_error text, created_at timestamptz
)
language plpgsql security definer stable
set search_path = civicos, pg_catalog
as $$
begin
  if not (civicos.is_service_context() or civicos.is_platform_officer()) then
    raise exception 'list_event_webhooks requires a platform-tier role'
      using errcode = 'insufficient_privilege';
  end if;
  return query
    select w.id, w.channel, w.url, w.description, w.active,
           w.cursor_at_ms, w.last_delivered_at, w.delivered_count,
           w.failures, w.last_error, w.created_at
    from civicos.event_webhooks w
    order by w.created_at desc;
end$$;

-- ── Retrofit: earlier service-role RPCs with the same latent bug ──
create or replace function civicos.expire_due_consents()
returns table(consent_id uuid, citizen_id uuid, target_charter_id text, expired_at timestamptz)
language plpgsql security definer
set search_path = civicos, pg_catalog
as $$
declare v_now timestamptz := now();
begin
  if not civicos.is_service_context() then
    raise exception 'expire_due_consents requires service_role'
      using errcode = 'insufficient_privilege';
  end if;
  return query
    with due as (
      update civicos.consents
      set status='expired', revoked_at=v_now, updated_at=v_now
      where status='granted' and expires_at is not null
        and expires_at < v_now and revoked_at is null
      returning id as consent_id, civicos.consents.citizen_id, civicos.consents.target_charter_id, v_now as expired_at
    ),
    audit as (
      select civicos.append_audit(
        'citizen:' || d.citizen_id::text, 'consent-expiry-cron', 'consent_expire',
        d.consent_id::text, 'auto-expired (target=' || d.target_charter_id || ')'
      ) as audit_id, d.consent_id from due d
    )
    select d.consent_id, d.citizen_id, d.target_charter_id, d.expired_at
    from due d join audit a on a.consent_id = d.consent_id;
end$$;

-- admin_bulk_create_officers + admin_create_officer: allow service context
-- OR platform officer (was session_user-only, broken via REST service key).
create or replace function civicos.admin_create_officer(
  p_email text, p_name text, p_charter_id text, p_role text, p_title text default null
) returns civicos.officers
language plpgsql security definer
set search_path = pg_catalog, civicos
as $fn$
declare rec civicos.officers;
begin
  if not (civicos.is_service_context() or civicos.is_platform_officer()) then
    raise exception 'admin_create_officer requires a platform-tier role or service_role'
      using errcode = 'insufficient_privilege';
  end if;
  if p_email is null or p_name is null or p_charter_id is null or p_role is null
     or length(p_email)=0 or length(p_name)=0 or length(p_charter_id)=0 or length(p_role)=0 then
    raise exception 'admin_create_officer: email, name, charter_id, role required';
  end if;
  insert into civicos.officers (email, name, charter_id, role, title, active)
  values (lower(trim(p_email)), trim(p_name), trim(p_charter_id), trim(p_role), p_title, true)
  on conflict (email) do update set
    name = excluded.name, charter_id = excluded.charter_id, role = excluded.role,
    title = coalesce(excluded.title, civicos.officers.title), active = true
  returning * into rec;
  return rec;
end$fn$;

create or replace function civicos.admin_bulk_create_officers(p_rows jsonb)
returns jsonb
language plpgsql security definer
set search_path = civicos, pg_catalog
as $$
declare
  v_input jsonb; v_result jsonb := '[]'::jsonb; v_row civicos.officers;
  v_status text; v_error text;
begin
  if not (civicos.is_service_context() or civicos.is_platform_officer()) then
    raise exception 'admin_bulk_create_officers requires a platform-tier role or service_role'
      using errcode = 'insufficient_privilege';
  end if;
  if p_rows is null or jsonb_typeof(p_rows) <> 'array' then
    raise exception 'p_rows must be a JSON array';
  end if;
  for v_input in select * from jsonb_array_elements(p_rows) loop
    v_status := 'created'; v_error := null;
    begin
      v_row := civicos.admin_create_officer(
        p_email := v_input->>'email', p_name := v_input->>'name',
        p_charter_id := v_input->>'charter_id', p_role := v_input->>'role',
        p_title := v_input->>'title');
    exception when others then
      v_row := null; v_status := 'failed'; v_error := sqlerrm;
    end;
    v_result := v_result || jsonb_build_object(
      'email', v_input->>'email', 'name', v_input->>'name',
      'charter_id', v_input->>'charter_id', 'role', v_input->>'role',
      'officer_id', (case when v_row is null then null else v_row.id::text end),
      'status', v_status, 'error', v_error);
  end loop;
  return v_result;
end$$;
