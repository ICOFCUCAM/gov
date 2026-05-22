-- 20260521860000_civicos_escalation_cascade.sql
--
-- Phase C · the organism reacts — escalation cascade propagation.
--
-- Until now a high-severity escalation against one charter was inert beyond
-- its own row: the cross-ministry dependency graph was visualised but nothing
-- propagated along it. This AFTER-INSERT trigger makes the cascade real: when
-- a 'major' or 'national' escalation is recorded against a charter that is a
-- registered institution, it resolves the charter's archetype and emits an
-- `escalation.cascade` federation event (on the `escalation` channel, targeted
-- at each dependent charter) along every edge where the source PROVIDES to or
-- is MUTUAL with the dependent — i.e. the institutions that actually lose
-- something when the source is impaired.
--
-- Deliberately ADDITIVE and bounded: it only publishes events (an append-only
-- observability log), never opens new escalations, so there is no recursion
-- and no operational blast radius. Depth-1 by construction.

set search_path = civicos, pg_catalog;

create or replace function civicos.cascade_escalation()
returns trigger
language plpgsql
security definer
set search_path = civicos, pg_catalog
as $$
declare
  v_src_arch text;
begin
  if new.severity not in ('major', 'national') then
    return new;
  end if;

  select archetype_or_branch into v_src_arch
  from civicos.institutions
  where charter_id = new.source_charter_id;

  if v_src_arch is null then
    return new;  -- source isn't a registered institution; nothing to cascade
  end if;

  perform civicos.publish_event(
    'escalation.cascade',
    'escalation:' || new.id::text,
    'escalation',
    jsonb_build_object(
      'source_charter', new.source_charter_id,
      'source_archetype', v_src_arch,
      'target_archetype', e.target_archetype,
      'severity', new.severity,
      'reason', new.reason,
      'relation', e.relation,
      'direction', e.direction),
    inst.charter_id)
  from civicos.federation_edges e
  join civicos.institutions inst
    on inst.archetype_or_branch = e.target_archetype and inst.activated
  where e.source_archetype = v_src_arch
    and e.direction in ('provides', 'mutual')
    and inst.charter_id <> new.source_charter_id;

  return new;
end$$;

drop trigger if exists escalations_cascade on civicos.escalations;
create trigger escalations_cascade
  after insert on civicos.escalations
  for each row execute function civicos.cascade_escalation();
