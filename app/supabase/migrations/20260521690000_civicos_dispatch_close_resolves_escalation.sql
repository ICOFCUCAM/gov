-- 20260521690000_civicos_dispatch_close_resolves_escalation.sql
--
-- Phase B · close the incident loop automatically.
--
-- link_escalation_response connects an escalation to the dispatch raised to
-- handle it. This completes the loop: when that dispatch CLOSES, the
-- escalation it answered is auto-resolved (acknowledged too, if it wasn't).
-- The operator closes the response once; the incident it addressed no
-- longer lingers as open on the escalation floor.
--
-- AFTER UPDATE trigger on dispatches, firing only on the closed_at
-- transition. Idempotent (only touches still-open linked escalations).

set search_path = civicos, pg_catalog;

create or replace function civicos.resolve_escalation_on_dispatch_close()
returns trigger
language plpgsql
security definer
set search_path = civicos, pg_catalog
as $$
begin
  if new.closed_at is not null and old.closed_at is null then
    update civicos.escalations
    set resolved_at = now(),
        acknowledged_at = coalesce(acknowledged_at, now())
    where linked_dispatch_id = new.id and resolved_at is null;
  end if;
  return new;
end$$;

drop trigger if exists dispatch_close_resolves_escalation on civicos.dispatches;
create trigger dispatch_close_resolves_escalation
  after update on civicos.dispatches
  for each row execute function civicos.resolve_escalation_on_dispatch_close();
