-- 20260521590000_civicos_promote_due_directives.sql
--
-- Phase B · directives that take effect on a future date actually do.
--
-- sign_directive marks a directive 'effective' immediately only if its
-- effective_at is already in the past; a directive signed to take effect on
-- a FUTURE date stays 'signed' forever — nothing promotes it when the date
-- arrives. (Compare expire_due_consents, which auto-expires time-bound
-- consents.) This RPC, run on a schedule, flips every signed directive
-- whose effective_at has now passed to 'effective', with one audit entry
-- per directive on its own `directive:<ref>` scope.
--
-- Service-role only (a scheduled mutation), via is_service_context().

set search_path = civicos, pg_catalog;

create or replace function civicos.promote_due_directives()
returns integer
language plpgsql security definer
set search_path = civicos, pg_catalog
as $fn$
declare
  r record;
  promoted int := 0;
begin
  if not civicos.is_service_context() then
    raise exception 'promote_due_directives requires service_role'
      using errcode = 'insufficient_privilege';
  end if;

  for r in
    update civicos.directives
       set status = 'effective', updated_at = now()
     where status = 'signed'
       and effective_at is not null
       and effective_at <= now()
    returning ref, issued_by_charter_id, effective_at
  loop
    perform civicos.append_audit(
      'directive:' || r.ref, 'directive-promotion-cron', 'directive_effective',
      r.ref, 'auto-promoted to effective (issuer=' || coalesce(r.issued_by_charter_id, '?') || ')');
    promoted := promoted + 1;
  end loop;
  return promoted;
end $fn$;

create or replace function public.civicos_promote_due_directives()
returns integer language sql security definer set search_path = public, pg_catalog
as $$ select civicos.promote_due_directives(); $$;

revoke execute on function public.civicos_promote_due_directives() from public, anon, authenticated;
