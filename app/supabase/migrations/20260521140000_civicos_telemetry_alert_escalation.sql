-- 20260521140000_civicos_telemetry_alert_escalation.sql
--
-- Auto-bind telemetry to the escalation system.
--
-- AFTER INSERT trigger on civicos.telemetry_samples reads the parent
-- stream's warn/alert thresholds. When a sample's value crosses
-- alert_threshold, a 'major' escalation is recorded; when it crosses
-- warn_threshold (but not alert), a 'minor' one. The trigger is
-- idempotent within a 5-minute window per stream+severity so a sample
-- storm doesn't flood the escalation table.
--
-- The escalation carries the stream id, the breaching sample value,
-- both thresholds, and the sample timestamp in payload so downstream
-- consumers (Alerts, LiveWall) can reconstruct the trigger.

set search_path = civicos, pg_catalog;

create or replace function civicos.telemetry_sample_auto_escalate()
returns trigger language plpgsql
set search_path = pg_catalog, civicos
as $fn$
declare
  stream civicos.telemetry_streams;
  v_severity civicos.severity;
  v_reason text;
  v_reason_prefix text;
begin
  if new.value is null then return new; end if;
  select * into stream from civicos.telemetry_streams where stream_id = new.stream_id;
  if stream.id is null then return new; end if;

  if stream.alert_threshold is not null and new.value >= stream.alert_threshold then
    v_severity := 'major';
    v_reason := format('telemetry %s value %s exceeded alert threshold %s',
                     stream.stream_id, new.value, stream.alert_threshold);
  elsif stream.warn_threshold is not null and new.value >= stream.warn_threshold then
    v_severity := 'minor';
    v_reason := format('telemetry %s value %s exceeded warn threshold %s',
                     stream.stream_id, new.value, stream.warn_threshold);
  else
    return new;
  end if;

  -- Use an aliased table to avoid the v_reason variable colliding with
  -- the escalations.reason column.
  v_reason_prefix := 'telemetry ' || stream.stream_id || ' value%';
  if exists (
    select 1 from civicos.escalations e
     where e.source_charter_id = stream.charter_id
       and e.reason like v_reason_prefix
       and e.severity = v_severity
       and e.triggered_at > now() - interval '5 minutes'
  ) then
    return new;
  end if;

  insert into civicos.escalations
    (source_charter_id, severity, reason, triggered_by_actor, payload)
  values (stream.charter_id, v_severity, v_reason, 'telemetry-trigger',
          jsonb_build_object(
            'stream_id', stream.stream_id,
            'sample_value', new.value,
            'warn_threshold', stream.warn_threshold,
            'alert_threshold', stream.alert_threshold,
            'sample_ts', new.ts
          ));
  return new;
end $fn$;

drop trigger if exists telemetry_samples_auto_escalate on civicos.telemetry_samples;
create trigger telemetry_samples_auto_escalate
  after insert on civicos.telemetry_samples
  for each row execute function civicos.telemetry_sample_auto_escalate();
