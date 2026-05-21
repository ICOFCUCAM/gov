-- 20260521250000_civicos_expire_consents.sql
--
-- Phase B · auto-expiry for time-bound consents.
--
-- Citizens can grant consents with an `expires_at` timestamp. The
-- substrate stores expiry but never flips the status — a consent past
-- its expiry sits as 'granted' until something acts on it.
--
-- This migration adds a SECURITY DEFINER RPC that scans consents where
-- status='granted' AND expires_at < now() AND revoked_at IS NULL, sets
-- status='expired' and stamps revoked_at, and emits one audit entry per
-- consent under the citizen's scope so the action is traceable.
--
-- Designed for cron invocation; the wrapper is service_role only.

set search_path = civicos, pg_catalog;

create or replace function civicos.expire_due_consents()
returns table(consent_id uuid, citizen_id uuid, target_charter_id text, expired_at timestamptz)
language plpgsql
security definer
set search_path = civicos, pg_catalog
as $$
declare
  v_privileged boolean := session_user in ('service_role','postgres');
  v_now timestamptz := now();
begin
  if not v_privileged then
    raise exception 'expire_due_consents requires service_role'
      using errcode = 'insufficient_privilege';
  end if;

  return query
    with due as (
      update civicos.consents
      set status     = 'expired',
          revoked_at = v_now,
          updated_at = v_now
      where status   = 'granted'
        and expires_at is not null
        and expires_at < v_now
        and revoked_at is null
      returning id as consent_id, civicos.consents.citizen_id, civicos.consents.target_charter_id, v_now as expired_at
    ),
    audit as (
      select civicos.append_audit(
        'citizen:' || d.citizen_id::text,
        'consent-expiry-cron',
        'consent_expire',
        d.consent_id::text,
        'auto-expired (target=' || d.target_charter_id || ')'
      ) as audit_id, d.consent_id
      from due d
    )
    select d.consent_id, d.citizen_id, d.target_charter_id, d.expired_at
    from due d
    join audit a on a.consent_id = d.consent_id;
end$$;

create or replace function public.civicos_expire_due_consents()
returns table(consent_id uuid, citizen_id uuid, target_charter_id text, expired_at timestamptz)
language sql
security definer
set search_path = public, pg_catalog
as $$ select * from civicos.expire_due_consents(); $$;

revoke execute on function public.civicos_expire_due_consents() from anon, authenticated;
