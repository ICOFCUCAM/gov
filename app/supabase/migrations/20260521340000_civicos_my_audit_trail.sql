-- 20260521340000_civicos_my_audit_trail.sql
--
-- Phase B · citizen transparency log.
--
-- The audit chain already records tamper-evident events on a citizen's own
-- `citizen:<id>` scope — consent expiries (expire_due_consents) and data
-- exports (log_my_data_export). This RPC lets the citizen READ that trail:
-- a verifiable "here is the log of system actions taken on my scope, with
-- the hash chain that proves it hasn't been altered."
--
-- SECURITY DEFINER + scoped to auth.uid()'s citizen, so a caller only ever
-- sees entries on their OWN scope (never another citizen's, never the
-- platform/officer scopes). Authenticated only; the hashes are returned so
-- the citizen can independently verify chain continuity.

set search_path = civicos, pg_catalog;

create or replace function civicos.my_audit_trail(p_limit int default 100)
returns table(
  seq bigint, actor text, action text, subject text, detail text,
  at timestamptz, prev_hash text, hash text
)
language sql
security definer
stable
set search_path = civicos, pg_catalog
as $$
  select e.seq, e.actor, e.action, e.subject, e.detail, e.at, e.prev_hash, e.hash
  from civicos.audit_entries e
  where e.scope = 'citizen:' || (
    select c.id::text from civicos.citizens c
    where c.auth_user_id = (select auth.uid())
  )
  order by e.seq desc
  limit greatest(1, least(coalesce(p_limit, 100), 500));
$$;

create or replace function public.civicos_my_audit_trail(p_limit int default 100)
returns table(
  seq bigint, actor text, action text, subject text, detail text,
  at timestamptz, prev_hash text, hash text
) language sql security definer stable set search_path = public, pg_catalog
as $$ select * from civicos.my_audit_trail(p_limit); $$;

revoke execute on function public.civicos_my_audit_trail(int) from public, anon;
grant  execute on function public.civicos_my_audit_trail(int) to authenticated;
