-- 20260521580000_civicos_dispatch_on_scene.sql
--
-- Phase B · complete the dispatch lifecycle — mark on-scene.
--
-- Dispatches carry a four-point lifecycle (dispatched → acknowledged →
-- on_scene → closed) and dispatch_response_stats reports a median
-- time-to-on-scene, but there was NO RPC to record on_scene_at — only
-- acknowledge and close existed. The middle of the lifecycle was
-- unreachable. This adds it.
--
-- Being on scene implies acknowledgement, so on_scene_at also backfills
-- acknowledged_at if unset. Authenticated-tier (tighter than the older
-- ack/close RPCs, which were anon-callable — there is no reason anon should
-- mutate dispatches).

set search_path = civicos, pg_catalog;

create or replace function civicos.mark_dispatch_on_scene(p_ref text)
returns civicos.dispatches
language plpgsql security definer
set search_path = pg_catalog, civicos
as $fn$
declare rec civicos.dispatches;
begin
  update civicos.dispatches
     set on_scene_at = coalesce(on_scene_at, now()),
         acknowledged_at = coalesce(acknowledged_at, now()),
         status = case when status in ('dispatched', 'acknowledged') then 'on-scene' else status end,
         updated_at = now()
   where ref = p_ref and closed_at is null
   returning * into rec;
  if rec.id is null then raise exception 'dispatch % not found or already closed', p_ref; end if;
  return rec;
end $fn$;

create or replace function public.civicos_mark_dispatch_on_scene(p_ref text)
returns civicos.dispatches
language sql security definer set search_path = public, pg_catalog
as $$ select * from civicos.mark_dispatch_on_scene(p_ref); $$;

revoke execute on function public.civicos_mark_dispatch_on_scene(text) from public, anon;
grant  execute on function public.civicos_mark_dispatch_on_scene(text) to authenticated;
