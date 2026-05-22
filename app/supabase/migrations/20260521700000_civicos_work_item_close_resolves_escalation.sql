-- 20260521700000_civicos_work_item_close_resolves_escalation.sql
--
-- Phase B · close the incident loop from the work-item side too.
--
-- Symmetric to dispatch_close_resolves_escalation: an escalation can be
-- linked to a WORK ITEM raised to address it (link_escalation_response).
-- When that work item closes, resolve the escalation it answered. Together
-- the two triggers mean: whichever response form closes the incident, the
-- escalation stops lingering open.
--
-- AFTER UPDATE on work_items, firing only on the closed false→true
-- transition; idempotent.

set search_path = civicos, pg_catalog;

create or replace function civicos.resolve_escalation_on_work_item_close()
returns trigger
language plpgsql
security definer
set search_path = civicos, pg_catalog
as $$
begin
  if new.closed and not old.closed then
    update civicos.escalations
    set resolved_at = now(),
        acknowledged_at = coalesce(acknowledged_at, now())
    where linked_work_item_id = new.id and resolved_at is null;
  end if;
  return new;
end$$;

drop trigger if exists work_item_close_resolves_escalation on civicos.work_items;
create trigger work_item_close_resolves_escalation
  after update on civicos.work_items
  for each row execute function civicos.resolve_escalation_on_work_item_close();
