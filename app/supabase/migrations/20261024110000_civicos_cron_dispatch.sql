-- 20261024110000_civicos_cron_dispatch.sql
--
-- Go-live review H-2: supabase/cron/schedule.sql fell back to a fixed
-- outside host (the original reference deployment) whenever the Vault
-- secret `civicos_base_url` was missing, and sent the nation's
-- CIVICOS_CRON_SECRET there on every run.
--
-- Every scheduled job now goes through civicos.cron_call(job, path, method):
--   * it reads `civicos_base_url` and `civicos_cron_secret` from Vault at
--     run time (they never appear in a job body);
--   * when the base URL is not set, is not an http(s) address, or carries a
--     user name, password, path, query or fragment, or when the secret is not
--     set, it sends NOTHING: it raises a NOTICE and records why in
--     civicos.cron_skips (one row per job, with a count), and returns null;
--   * otherwise it calls `<base url><path>` with `Authorization: Bearer`.
-- There is no fallback host anywhere.
--
-- Called only by pg_cron (as postgres); not callable through the API.
--
-- A nation that applied the earlier schedule.sql while `civicos_base_url`
-- was not set has sent its cron secret to that outside host: rotate
-- CIVICOS_CRON_SECRET (app) and `civicos_cron_secret` (Vault) together.

set search_path = civicos, pg_catalog;

create table if not exists civicos.cron_skips (
  job        text primary key,
  reason     text not null,
  first_at   timestamptz not null default now(),
  last_at    timestamptz not null default now(),
  skipped    bigint not null default 1
);
alter table civicos.cron_skips enable row level security;
-- No policies: the service and operators read it directly.

-- Null when the address may receive the cron secret, otherwise the reason.
create or replace function civicos.cron_base_url_refusal(p_url text)
returns text
language plpgsql immutable
set search_path = civicos, pg_catalog
as $$
begin
  if p_url is null or length(trim(p_url)) = 0 then
    return 'the Vault secret civicos_base_url is not set: seed it with vault.create_secret(''https://<your deployment>'', ''civicos_base_url'')';
  end if;
  if trim(p_url) !~* '^https?://[a-z0-9.\-]+(:[0-9]{1,5})?/?$' then
    return 'civicos_base_url must be just the deployment''s http(s) origin (no user name, password, path or query)';
  end if;
  return null;
end$$;

create or replace function civicos.cron_call(p_job text, p_path text, p_method text default 'GET')
returns bigint
language plpgsql security definer
set search_path = civicos, pg_catalog
as $$
declare
  v_base   text;
  v_secret text;
  v_reason text;
  v_url    text;
begin
  if not civicos.is_service_context() then
    raise exception 'cron_call is for the scheduler only' using errcode = 'insufficient_privilege';
  end if;
  if p_path is null or p_path !~ '^/api/cron/[a-z0-9-]+$' then
    raise exception 'cron_call: path must be /api/cron/<job>';
  end if;

  if to_regclass('vault.decrypted_secrets') is not null then
    execute 'select decrypted_secret from vault.decrypted_secrets where name = $1 limit 1'
      into v_base using 'civicos_base_url';
    execute 'select decrypted_secret from vault.decrypted_secrets where name = $1 limit 1'
      into v_secret using 'civicos_cron_secret';
  else
    v_reason := 'Supabase Vault is not available, so civicos_base_url and civicos_cron_secret cannot be read';
  end if;

  v_reason := coalesce(v_reason, civicos.cron_base_url_refusal(v_base));
  if v_reason is null and (v_secret is null or length(v_secret) = 0) then
    v_reason := 'the Vault secret civicos_cron_secret is not set';
  end if;

  if v_reason is not null then
    raise notice 'civicos cron job % not run: %', p_job, v_reason;
    insert into civicos.cron_skips as s (job, reason) values (p_job, v_reason)
    on conflict (job) do update
      set reason = excluded.reason, last_at = now(), skipped = s.skipped + 1;
    return null;
  end if;

  delete from civicos.cron_skips where job = p_job;
  v_url := rtrim(trim(v_base), '/') || p_path;
  if upper(coalesce(p_method, 'GET')) = 'POST' then
    return net.http_post(
      url := v_url,
      headers := jsonb_build_object('Authorization', 'Bearer ' || v_secret, 'Content-Type', 'application/json'),
      body := '{}'::jsonb);
  end if;
  return net.http_get(
    url := v_url,
    headers := jsonb_build_object('Authorization', 'Bearer ' || v_secret));
end$$;

revoke all on function civicos.cron_call(text, text, text) from public, anon, authenticated;
revoke all on function civicos.cron_base_url_refusal(text) from public, anon, authenticated;
