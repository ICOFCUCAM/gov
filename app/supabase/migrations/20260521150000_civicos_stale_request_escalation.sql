-- 20260521150000_civicos_stale_request_escalation.sql
--
-- SLA enforcement for citizen service requests. An on-demand RPC
-- (intended to be invoked periodically by an admin worker or scheduler)
-- finds service requests that have been submitted for longer than
-- p_threshold_hours without acknowledgement, and records a 'minor'
-- escalation against the target charter for each.
--
-- Per-request idempotency: a previously-escalated stale request will
-- not re-escalate for another 24 hours, so re-running the function
-- frequently doesn't multiply the noise.
--
-- The escalation carries the request ref, citizen id, submitted_at,
-- and age_hours so the receiving charter can prioritise.

set search_path = civicos, pg_catalog;

create or replace function civicos.escalate_stale_service_requests(p_threshold_hours int default 48)
returns int
language plpgsql security definer
set search_path = pg_catalog, civicos
as $fn$
declare
  r record;
  escalated int := 0;
  v_reason_prefix text;
begin
  for r in
    select sr.id, sr.ref, sr.target_charter_id, sr.citizen_id,
           sr.submitted_at, sr.acknowledged_at,
           extract(epoch from (now() - sr.submitted_at)) / 3600.0 as age_hours
      from civicos.service_requests sr
     where sr.resolved_at is null
       and sr.acknowledged_at is null
       and sr.submitted_at < now() - (p_threshold_hours || ' hours')::interval
  loop
    v_reason_prefix := 'stale service request ' || r.ref || '%';
    if exists (
      select 1 from civicos.escalations e
       where e.target_charter_id = r.target_charter_id
         and e.reason like v_reason_prefix
         and e.triggered_at > now() - interval '24 hours'
    ) then
      continue;
    end if;
    insert into civicos.escalations
      (source_charter_id, target_charter_id, severity, reason,
       triggered_by_actor, payload)
    values (
      'platform', r.target_charter_id, 'minor',
      format('stale service request %s · %s hours unacknowledged',
             r.ref, round(r.age_hours::numeric, 1)),
      'sla-trigger',
      jsonb_build_object(
        'service_request_id', r.id,
        'service_request_ref', r.ref,
        'citizen_id', r.citizen_id,
        'submitted_at', r.submitted_at,
        'age_hours', r.age_hours
      ));
    escalated := escalated + 1;
  end loop;
  return escalated;
end $fn$;

revoke all on function civicos.escalate_stale_service_requests(int) from public;
grant execute on function civicos.escalate_stale_service_requests(int) to authenticated;

create or replace function public.civicos_escalate_stale_service_requests(p_threshold_hours int default 48)
returns int language sql security definer
set search_path = pg_catalog, civicos
as $fn$ select civicos.escalate_stale_service_requests(p_threshold_hours); $fn$;
revoke all on function public.civicos_escalate_stale_service_requests(int) from public;
grant execute on function public.civicos_escalate_stale_service_requests(int) to authenticated;
