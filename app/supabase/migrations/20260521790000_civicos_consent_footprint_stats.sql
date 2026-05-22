-- 20260521790000_civicos_consent_footprint_stats.sql
--
-- Phase 1 transparency · institutional data-access footprint.
--
-- Citizens grant scoped consent (health.records, tax.filings, …) to
-- charters. Nothing published how much data-access power each institution
-- actually holds. This aggregates, per (charter, scope): how many consents
-- are currently active (granted and not past expiry), how many expire within
-- 30 days, and how many have been revoked — so the public can see the
-- data-access footprint of each institution, not just trust that it is
-- bounded.
--
-- Aggregate-only — counts per (charter, scope), never a citizen id or row.
-- A SECURITY DEFINER aggregate over an RLS-protected table, so it is the
-- single sanctioned read; anon-callable for the Public Observatory. Only
-- (charter, scope) pairs that have ever held a grant appear.

set search_path = civicos, pg_catalog;

create or replace function civicos.consent_footprint_stats(
  p_charter_id text default null
)
returns table(
  charter_id text,
  scope text,
  active bigint,
  expiring_30d bigint,
  revoked bigint
)
language sql
security definer
stable
set search_path = civicos, pg_catalog
as $$
  select
    target_charter_id,
    scope,
    count(*) filter (
      where status = 'granted' and (expires_at is null or expires_at > now())
    )::bigint as active,
    count(*) filter (
      where status = 'granted' and expires_at is not null
        and expires_at > now() and expires_at <= now() + interval '30 days'
    )::bigint as expiring_30d,
    count(*) filter (where status = 'revoked')::bigint as revoked
  from civicos.consents
  where (p_charter_id is null or target_charter_id = p_charter_id)
  group by target_charter_id, scope
  having count(*) filter (
    where status = 'granted' and (expires_at is null or expires_at > now())
  ) > 0
  order by active desc, target_charter_id, scope;
$$;

create or replace function public.civicos_consent_footprint_stats(
  p_charter_id text default null
)
returns table(
  charter_id text, scope text, active bigint, expiring_30d bigint, revoked bigint
) language sql security definer stable set search_path = public, pg_catalog
as $$ select * from civicos.consent_footprint_stats(p_charter_id); $$;

revoke execute on function public.civicos_consent_footprint_stats(text) from public;
grant  execute on function public.civicos_consent_footprint_stats(text) to anon, authenticated;
