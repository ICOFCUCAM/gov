-- 20260521310000_civicos_webhook_delivery_log.sql
--
-- Phase B · federation webhook delivery observability.
--
-- Until now the only delivery signal on a webhook was aggregate state
-- (delivered_count, failures, last_error). An operator could not see the
-- run-by-run history: when did delivery last succeed, how many events went
-- out each run, what was the failure on a specific attempt.
--
-- This adds a bounded per-run delivery log. The deliver-events worker
-- records ONE summary row per webhook per run that had activity (something
-- delivered or a failure). The log is trimmed to the most recent 50 rows
-- per webhook so it never grows unbounded. Like event_webhooks, the table
-- is service-role-only; a platform-tier listing RPC exposes it read-only.

set search_path = civicos, pg_catalog;

create table if not exists civicos.webhook_deliveries (
  id            uuid primary key default gen_random_uuid(),
  webhook_id    uuid not null references civicos.event_webhooks(id) on delete cascade,
  channel       text not null,
  delivered     int  not null default 0,
  ok            boolean not null,
  detail        text,
  cursor_before bigint not null,
  cursor_after  bigint not null,
  attempted_at  timestamptz not null default now()
);

create index if not exists webhook_deliveries_webhook_at_idx
  on civicos.webhook_deliveries (webhook_id, attempted_at desc);

alter table civicos.webhook_deliveries enable row level security;
-- Intentionally NO policies: service_role bypasses RLS; the RPCs below are
-- the only sanctioned path. Delivery logs can name event ids / error text,
-- so they stay platform-tier read-only.

-- ── Record one run summary (cron / service_role) + trim to last 50 ──
create or replace function civicos.record_webhook_delivery_attempt(
  p_webhook_id uuid, p_channel text, p_delivered int, p_ok boolean,
  p_detail text, p_cursor_before bigint, p_cursor_after bigint
) returns void
language plpgsql security definer
set search_path = civicos, pg_catalog
as $$
begin
  if not civicos.is_service_context() then
    raise exception 'record_webhook_delivery_attempt requires service_role'
      using errcode = 'insufficient_privilege';
  end if;
  insert into civicos.webhook_deliveries
    (webhook_id, channel, delivered, ok, detail, cursor_before, cursor_after)
  values
    (p_webhook_id, p_channel, greatest(0, coalesce(p_delivered,0)), p_ok,
     left(p_detail, 500), p_cursor_before, p_cursor_after);

  delete from civicos.webhook_deliveries
  where webhook_id = p_webhook_id
    and id not in (
      select id from civicos.webhook_deliveries
      where webhook_id = p_webhook_id
      order by attempted_at desc
      limit 50
    );
end$$;

-- ── Recent deliveries for one webhook (platform-tier / service) ──
create or replace function civicos.list_webhook_deliveries(p_webhook_id uuid, p_limit int default 20)
returns table(
  id uuid, channel text, delivered int, ok boolean, detail text,
  cursor_before bigint, cursor_after bigint, attempted_at timestamptz
)
language plpgsql security definer stable
set search_path = civicos, pg_catalog
as $$
begin
  if not (civicos.is_service_context() or civicos.is_platform_officer()) then
    raise exception 'list_webhook_deliveries requires a platform-tier role'
      using errcode = 'insufficient_privilege';
  end if;
  return query
    select d.id, d.channel, d.delivered, d.ok, d.detail,
           d.cursor_before, d.cursor_after, d.attempted_at
    from civicos.webhook_deliveries d
    where d.webhook_id = p_webhook_id
    order by d.attempted_at desc
    limit greatest(1, least(coalesce(p_limit, 20), 100));
end$$;

-- Public wrappers.
create or replace function public.civicos_record_webhook_delivery_attempt(
  p_webhook_id uuid, p_channel text, p_delivered int, p_ok boolean,
  p_detail text, p_cursor_before bigint, p_cursor_after bigint
) returns void language sql security definer set search_path = public, pg_catalog
as $$ select civicos.record_webhook_delivery_attempt(
  p_webhook_id, p_channel, p_delivered, p_ok, p_detail, p_cursor_before, p_cursor_after); $$;

create or replace function public.civicos_list_webhook_deliveries(p_webhook_id uuid, p_limit int default 20)
returns table(
  id uuid, channel text, delivered int, ok boolean, detail text,
  cursor_before bigint, cursor_after bigint, attempted_at timestamptz
) language sql security definer stable set search_path = public, pg_catalog
as $$ select * from civicos.list_webhook_deliveries(p_webhook_id, p_limit); $$;

-- Lock the privilege model (CREATE re-applies default grants).
revoke execute on function public.civicos_record_webhook_delivery_attempt(uuid,text,int,boolean,text,bigint,bigint)
  from public, anon, authenticated;
revoke execute on function public.civicos_list_webhook_deliveries(uuid,int) from public, anon;
grant  execute on function public.civicos_list_webhook_deliveries(uuid,int) to authenticated;
