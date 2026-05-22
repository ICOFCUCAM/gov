-- 20260521520000_civicos_federation_channel_catalog.sql
--
-- Phase B · federation observability — channel/type catalog.
--
-- An operator registering an outbound webhook picks a channel blind: there
-- was no way to see what event TYPES actually flow on each channel or at
-- what volume. This RPC returns, per (channel, type) over a window, the
-- event count and the most recent occurrence — so the webhook registration
-- UI can show "this channel carries these event types" and a consumer
-- knows what to expect.
--
-- federation_events is authenticated-tier (RLS); this is SECURITY DEFINER
-- granted to authenticated only.

set search_path = civicos, pg_catalog;

create or replace function civicos.federation_channel_catalog(p_days int default 30)
returns table(
  channel text,
  type text,
  events bigint,
  last_at timestamptz
)
language sql
security definer
stable
set search_path = civicos, pg_catalog
as $$
  select
    e.channel, e.type, count(*)::bigint, max(e.at)
  from civicos.federation_events e
  where e.at >= now() - make_interval(days => greatest(1, least(coalesce(p_days, 30), 365)))
  group by e.channel, e.type
  order by e.channel, count(*) desc;
$$;

create or replace function public.civicos_federation_channel_catalog(p_days int default 30)
returns table(channel text, type text, events bigint, last_at timestamptz)
language sql security definer stable set search_path = public, pg_catalog
as $$ select * from civicos.federation_channel_catalog(p_days); $$;

revoke execute on function public.civicos_federation_channel_catalog(int) from public, anon;
grant  execute on function public.civicos_federation_channel_catalog(int) to authenticated;
