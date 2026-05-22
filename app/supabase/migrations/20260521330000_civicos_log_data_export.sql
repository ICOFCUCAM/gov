-- 20260521330000_civicos_log_data_export.sql
--
-- Phase B · auditable data portability.
--
-- my_data_export() is a `stable` read — it deliberately writes nothing so
-- it can stay a pure read RPC. But exercising the right-to-take-your-data
-- is a meaningful event a citizen should be able to see later, and the
-- audit chain is exactly the tamper-evident place for it.
--
-- This companion RPC appends ONE audit entry on the caller's own
-- `citizen:<id>` scope recording that they exported their data. It is
-- best-effort transparency for the UI flow, not a security control (the
-- read RPC remains independently callable), so it simply no-ops for a
-- caller with no linked citizen profile.

set search_path = civicos, pg_catalog;

create or replace function civicos.log_my_data_export()
returns uuid
language plpgsql
security definer
set search_path = civicos, pg_catalog
as $$
declare
  v_citizen civicos.citizens;
  v_entry   civicos.audit_entries;
begin
  select * into v_citizen from civicos.citizens where auth_user_id = (select auth.uid());
  if v_citizen.id is null then
    return null;  -- no linked citizen; nothing to log
  end if;
  v_entry := civicos.append_audit(
    'citizen:' || v_citizen.id::text,
    coalesce(v_citizen.display_name, 'citizen'),
    'data_export',
    v_citizen.id::text,
    'citizen exported their personal data (portability)'
  );
  return v_entry.id;
end$$;

create or replace function public.civicos_log_my_data_export()
returns uuid language sql security definer set search_path = public, pg_catalog
as $$ select civicos.log_my_data_export(); $$;

revoke execute on function public.civicos_log_my_data_export() from public, anon;
grant  execute on function public.civicos_log_my_data_export() to authenticated;
