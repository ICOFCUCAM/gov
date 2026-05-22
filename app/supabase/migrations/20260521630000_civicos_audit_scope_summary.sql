-- 20260521630000_civicos_audit_scope_summary.sql
--
-- Phase B · audit observability — index of audit scopes.
--
-- The audit chain is per-scope and the number of scopes has grown
-- (citizen:<id>, appeal:<ref>, directive:<ref>, work-item scopes, …), but
-- nothing enumerated them — an auditor had to know a scope to verify it.
-- This RPC lists every scope with its entry count and first/last entry
-- time, newest activity first, so the audit explorer can offer a directory.
--
-- Scopes include citizen:<uuid>, so this is platform-tier / auditor only
-- (is_platform_officer or service) — a regular officer cannot enumerate
-- which citizens have audit activity.

set search_path = civicos, pg_catalog;

create or replace function civicos.audit_scope_summary(p_limit int default 200)
returns table(
  scope text,
  entries bigint,
  first_at timestamptz,
  last_at timestamptz,
  max_seq bigint
)
language plpgsql
security definer
stable
set search_path = civicos, pg_catalog
as $$
begin
  if not (civicos.is_service_context() or civicos.is_platform_officer()) then
    raise exception 'audit_scope_summary requires a platform-tier role'
      using errcode = 'insufficient_privilege';
  end if;
  return query
    select e.scope, count(*)::bigint, min(e.at), max(e.at), max(e.seq)
    from civicos.audit_entries e
    group by e.scope
    order by max(e.at) desc
    limit greatest(1, least(coalesce(p_limit, 200), 2000));
end$$;

create or replace function public.civicos_audit_scope_summary(p_limit int default 200)
returns table(scope text, entries bigint, first_at timestamptz, last_at timestamptz, max_seq bigint)
language sql security definer stable set search_path = public, pg_catalog
as $$ select * from civicos.audit_scope_summary(p_limit); $$;

revoke execute on function public.civicos_audit_scope_summary(int) from public, anon;
grant  execute on function public.civicos_audit_scope_summary(int) to authenticated;
