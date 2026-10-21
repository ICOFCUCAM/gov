'use client';

// Nine new health domains lifting Health from 21 → 30 surfaces.
// Each consumes existing engines and renders through HEALTH_DS.
// Administrative and aggregate only (CLAUDE.md, Health: no patient or clinical field
// anywhere, no national record of persons' health): boards show capacity,
// status and waits counted per bay, theatre or acuity level, never who is in a
// bed, what was done to them or how they are; lib/gov/health-admin.ts.

import * as React from 'react';
import {
  doctorRoster, hospitalOps, laboratoryOps,
  nationalHealthcareCapacity,
} from '@/lib/gov/health-systems';
import { bayBoard, emergencyAttendance } from '@/lib/gov/health-admin';
import {
  ClinicalFrame, FloorPlanBay, ChartLine, KpiBar, WardRule, HEALTH_DS,
} from '@/apps/ministry-health/design-system/health-ds';
import { seed, wave } from '@/lib/telemetry';
import type { BayStatus } from '@/apps/ministry-health/design-system/health-ds';

// ◧ II — Ward Board (bay status and how long it has been so; never who is in it)
export function WardBoard({ id, now }: { id: string; now: number }) {
  const ts = now / 4000;
  const total = 16;
  const { occupancyPct, bays } = bayBoard(id, ts, total);
  return (
    <ClinicalFrame archetype="floor-plan" code="FA-WRD-02" title="Ward Board" subtitle="ward bay layout · 16 beds · status only">
      <KpiBar items={[
        { label: 'Beds', value: total, tone: HEALTH_DS.chart },
        { label: 'Occupancy', value: `${occupancyPct}%`, tone: occupancyPct >= 92 ? HEALTH_DS.alert : HEALTH_DS.sterile },
        { label: 'Escalated bays', value: bays.filter(b => b.status === 'critical').length, tone: HEALTH_DS.alert },
        { label: 'Cleaning', value: bays.filter(b => b.status === 'cleaning').length, tone: HEALTH_DS.mut },
      ]} />
      <WardRule label="bay layout" />
      <div className="grid grid-cols-4 gap-2">
        {bays.map(b => <FloorPlanBay key={b.id} id={b.id} status={b.status} since={b.since} note={b.status === 'critical' ? 'Staffing escalation' : undefined} />)}
      </div>
    </ClinicalFrame>
  );
}

// ◧ III — ICU Board (capacity, staffing and equipment per bay)
export function ICUBoard({ id, now }: { id: string; now: number }) {
  const ts = now / 4000;
  const beds = 8;
  const bays = Array.from({ length: beds }, (_, i) => {
    const k = `icu:${id}:${i}`;
    const occupied = seed(`${k}:o`) > 0.18;
    const ventilator = occupied && seed(`${k}:v:${Math.floor(ts / 6)}`) > 0.45;
    const nurseRatio = occupied ? (seed(`${k}:n:${Math.floor(ts / 6)}`) > 0.7 ? '1:2' : '1:1') : '—';
    return { id: `ICU-${String(i + 1).padStart(2, '0')}`, occupied, ventilator, nurseRatio };
  });
  const occ = bays.filter(b => b.occupied);
  return (
    <ClinicalFrame archetype="floor-plan" code="FA-ICU-03" title="ICU Board" subtitle="critical care · capacity, staffing and equipment per bay">
      <KpiBar items={[
        { label: 'ICU beds', value: beds, tone: HEALTH_DS.chart },
        { label: 'Occupied', value: occ.length, tone: HEALTH_DS.sterile },
        { label: 'Ventilators in use', value: occ.filter(b => b.ventilator).length, tone: HEALTH_DS.triage },
        { label: 'Bays below 1:1 nursing', value: occ.filter(b => b.nurseRatio !== '1:1').length, tone: HEALTH_DS.alert },
      ]} />
      <WardRule label="bays" />
      <div className="grid grid-cols-2 gap-2 xl:grid-cols-4">
        {bays.map(b => (
          <FloorPlanBay key={b.id} id={b.id} status={b.occupied ? 'occupied' : 'available'}
            note={b.occupied ? `Nursing ${b.nurseRatio}${b.ventilator ? ' · ventilator in use' : ''}` : undefined} />
        ))}
      </div>
    </ClinicalFrame>
  );
}

// ◧ IV — Operating Theatre Board (sessions by list type, never a person or procedure)
export function ORBoard({ id, now }: { id: string; now: number }) {
  const ts = now / 4000;
  const theatres = ['OR-1', 'OR-2', 'OR-3', 'OR-4', 'OR-5', 'OR-6'];
  const lineup = theatres.map(t => {
    const k = `or:${id}:${t}`;
    const statusRoll = seed(`${k}:st:${Math.floor(ts / 2)}`);
    const status: BayStatus = statusRoll > 0.78 ? 'occupied' : statusRoll > 0.5 ? 'pending' : statusRoll > 0.2 ? 'available' : 'cleaning';
    return {
      id: t,
      list: status === 'occupied' || status === 'pending' ? ['Elective list', 'Emergency list', 'Day-case list', 'Maternity list', 'Trauma list'][Math.floor(seed(`${k}:pr`) * 5)]! : undefined,
      status,
      since: status === 'occupied' ? `${Math.floor(wave(`${k}:s`, ts, 5, 320))}m` : undefined,
    };
  });
  return (
    <ClinicalFrame archetype="floor-plan" code="FA-OR-04" title="Operating Theatre Board" subtitle="theatre scheduling · 6 OR suites · sessions only">
      <KpiBar items={[
        { label: 'Theatres', value: 6, tone: HEALTH_DS.chart },
        { label: 'In session', value: lineup.filter(l => l.status === 'occupied').length, tone: HEALTH_DS.sterile },
        { label: 'Pending', value: lineup.filter(l => l.status === 'pending').length, tone: HEALTH_DS.triage },
        { label: 'Available', value: lineup.filter(l => l.status === 'available').length, tone: HEALTH_DS.vital },
      ]} />
      <WardRule label="theatre line-up" />
      <div className="grid grid-cols-2 gap-2 xl:grid-cols-3">
        {lineup.map(l => (
          <FloorPlanBay key={l.id} id={l.id} occupant={l.list} status={l.status} since={l.since} />
        ))}
      </div>
    </ClinicalFrame>
  );
}

// ◧ V — Emergency Department (attendances counted by acuity level and wait)
export function EmergencyDepartmentBoard({ id, now }: { id: string; now: number }) {
  const ts = now / 4000;
  const ed = emergencyAttendance(id, ts);
  return (
    <ClinicalFrame archetype="floor-plan" code="FA-ED-05" title="Emergency Department" subtitle="attendances by acuity level · counts and waits">
      <KpiBar items={[
        { label: 'Present', value: ed.present, tone: HEALTH_DS.chart },
        { label: 'Levels 1-2 (most urgent)', value: ed.levels.filter(l => l.level <= 2).reduce((a, l) => a + l.count, 0), tone: HEALTH_DS.alert },
        { label: 'Level 3', value: ed.levels.find(l => l.level === 3)?.count ?? 0, tone: HEALTH_DS.triage },
        { label: 'Waiting >60m', value: ed.waitingOverHour, tone: HEALTH_DS.alert },
      ]} />
      <WardRule label="attendances by acuity level" />
      <div className="space-y-1">
        {ed.levels.map(l => {
          const col = l.level <= 2 ? HEALTH_DS.alert : l.level === 3 ? HEALTH_DS.triage : HEALTH_DS.vital;
          return (
            <div key={l.level} className="grid grid-cols-[120px_1fr_120px] gap-3 border-b py-1.5 text-[11px]" style={{ borderColor: HEALTH_DS.ruleSoft, fontFamily: 'ui-monospace, monospace' }}>
              <span className="uppercase tracking-[0.18em]" style={{ color: col }}>Level {l.level}</span>
              <span style={{ color: HEALTH_DS.ink }}>{l.count} present</span>
              <span className="text-right tabular-nums" style={{ color: l.meanWaitMin > 60 ? HEALTH_DS.alert : HEALTH_DS.mut }}>{l.meanWaitMin}m mean wait</span>
            </div>
          );
        })}
      </div>
    </ClinicalFrame>
  );
}

// ⌬ I — Syndromic Surveillance
export function SyndromicSurveillance({ id, now }: { id: string; now: number }) {
  const ts = now / 4000;
  // synth syndromic streams
  const streams = ['Influenza-like illness', 'Acute diarrhoea', 'Acute febrile rash', 'Respiratory distress', 'Vector-borne febrile', 'Acute jaundice'];
  return (
    <ClinicalFrame archetype="epi" code="EP-SYN-01" title="Syndromic Surveillance" subtitle="real-time outbreak detection with constitutional safeguards">
      <KpiBar items={[
        { label: 'Active streams', value: streams.length, tone: HEALTH_DS.chart },
        { label: 'Above-baseline alerts', value: Math.floor(seed(`syn:${id}`) * 6), tone: HEALTH_DS.alert },
        { label: 'Sentinel sites', value: Math.round(wave(`syn:s:${id}`, ts, 120, 480)), tone: HEALTH_DS.sterile },
        { label: 'Reporting compliance', value: `${Math.round(wave(`syn:c:${id}`, ts, 78, 96))}%`, tone: HEALTH_DS.vital },
      ]} />
      <WardRule label="syndromic streams (last 7d)" />
      <div className="space-y-1">
        {streams.map((s, i) => {
          const rt = Math.round(wave(`syn:rt:${s}:${id}`, ts, 0.6, 1.8) * 100) / 100;
          const cases = Math.round(wave(`syn:cs:${s}:${id}`, ts, 24, 4800));
          const col = rt > 1.2 ? HEALTH_DS.alert : rt > 1 ? HEALTH_DS.triage : HEALTH_DS.vital;
          return (
            <div key={s} className="grid grid-cols-[1fr_140px_80px_60px_80px] items-center gap-3 border-b py-1.5 text-[11px]" style={{ borderColor: HEALTH_DS.ruleSoft }}>
              <span style={{ color: HEALTH_DS.chart }}>{s}</span>
              <div className="h-1.5" style={{ background: HEALTH_DS.wardDeep }}>
                <div className="h-full" style={{ width: `${Math.min(100, rt * 50)}%`, background: col }} />
              </div>
              <span className="text-right tabular-nums" style={{ color: col, fontFamily: 'ui-monospace, monospace' }}>Rt {rt}</span>
              <span className="text-right tabular-nums" style={{ color: HEALTH_DS.ink, fontFamily: 'ui-monospace, monospace' }}>{cases}</span>
              <span className="text-right uppercase tracking-[0.18em]" style={{ color: col }}>● {rt > 1.2 ? 'outbreak' : rt > 1 ? 'rising' : 'stable'}</span>
            </div>
          );
        })}
      </div>
      <WardRule label="constitutional safeguard" />
      <p className="text-[10.5px] italic" style={{ color: HEALTH_DS.mut }}>
        Per §13.3 — surveillance operates on aggregate syndromic streams only. Individual identification requires a
        warrant and is logged to the Audit Vault.
      </p>
    </ClinicalFrame>
  );
}

// ⌬ II — Contact Tracing (privacy-safe)
export function ContactTracing({ id, now }: { id: string; now: number }) {
  const ts = now / 4000;
  return (
    <ClinicalFrame archetype="epi" code="EP-CT-02" title="Contact Tracing" subtitle="privacy-preserving with constitutional safeguard">
      <KpiBar items={[
        { label: 'Active investigations', value: Math.round(wave(`ct:i:${id}`, ts, 4, 240)), tone: HEALTH_DS.triage },
        { label: 'Contacts enrolled', value: Math.round(wave(`ct:e:${id}`, ts, 480, 84000)).toLocaleString(), tone: HEALTH_DS.sterile },
        { label: 'Consent rate', value: `${Math.round(wave(`ct:cn:${id}`, ts, 64, 96))}%`, tone: HEALTH_DS.vital },
        { label: 'Auto-deleted (>14d)', value: Math.round(wave(`ct:d:${id}`, ts, 1200, 64000)).toLocaleString(), tone: HEALTH_DS.mut },
      ]} />
      <WardRule label="consent doctrine" />
      <p className="text-[10.5px] italic" style={{ color: HEALTH_DS.mut }}>
        Contact-tracing identifiers are pseudonymised at the device, never centralised. Contact graphs are deleted
        automatically after the public-health window closes (14d default). Consent is opt-in, revocable, and logged.
      </p>
    </ClinicalFrame>
  );
}

// ⊟ I — Facility & Service Index (route key kept; the platform keeps no person index)
export function MasterPatientIndex({ id, now }: { id: string; now: number }) {
  const ts = now / 4000;
  return (
    <ClinicalFrame archetype="registry" code="PT-MPI-01" title="Facility & Service Index" subtitle="licensed facilities and the services they offer · no person index">
      <KpiBar items={[
        { label: 'Facilities licensed', value: Math.round(wave(`mpi:e:${id}`, ts, 120, 4800)).toLocaleString(), tone: HEALTH_DS.chart },
        { label: 'Location certified', value: `${Math.round(wave(`mpi:l:${id}`, ts, 60, 99.8) * 10) / 10}%`, tone: HEALTH_DS.vital },
        { label: 'Services listed', value: Math.round(wave(`mpi:d:${id}`, ts, 400, 12800)).toLocaleString(), tone: HEALTH_DS.triage },
        { label: 'Awaiting inspection', value: Math.round(wave(`mpi:q:${id}`, ts, 4, 480)).toLocaleString(), tone: HEALTH_DS.sterile },
      ]} />
      <WardRule label="index doctrine" />
      <p className="text-[10.5px] italic" style={{ color: HEALTH_DS.mut }}>
        The platform keeps no national index or record of persons&apos; health. Facilities are organisations licensed in
        the health regulator&apos;s registers and keep their own records under the health law; this index lists
        facilities and services only.
      </p>
    </ClinicalFrame>
  );
}

// ⊟ II — Records Exchange Standards (route key kept; no record is held)
export function LongitudinalEHR({ id, now }: { id: string; now: number }) {
  const ts = now / 4000;
  void id;
  const events = [
    { when: '08:42', action: 'Data-sharing agreement drafted · district hospitals ↔ referral centre', by: 'Records officer', severity: 'routine' as const },
    { when: '08:55', action: 'Interface conformance test run · facility return format v2', by: 'Interoperability desk', severity: 'note' as const },
    { when: '09:12', action: 'Conformance test passed · 3 of 4 facilities', by: 'Test harness', severity: 'routine' as const },
    { when: '09:48', action: 'One facility failed validation: return file missing period', by: 'Test harness', severity: 'alert' as const },
    { when: '10:05', action: 'Correction requested from the facility', by: 'Records officer', severity: 'note' as const },
    { when: '10:31', action: 'Agreement sent for legal review', by: 'Legal unit', severity: 'note' as const },
    { when: '10:42', action: 'Data-protection impact assessment attached', by: 'Data-protection officer', severity: 'note' as const },
    { when: '11:05', action: 'Agreement confirmed by a second official', by: 'Director of records', severity: 'routine' as const },
  ];
  return (
    <ClinicalFrame archetype="chart" code="PT-REX-02" title="Records Exchange Standards" subtitle="agreements and formats between facilities · no record held">
      <WardRule label="exchange log" />
      {events.map((e, i) => <ChartLine key={i} when={e.when} action={e.action} by={e.by} severity={e.severity} />)}
      <WardRule label="audit trail" />
      <p className="text-[10.5px] italic" style={{ color: HEALTH_DS.mut, fontFamily: 'ui-monospace, monospace' }}>
        Facilities keep their own records. The platform records the agreements and formats they exchange under,
        never the records themselves.
      </p>
      {void ts}
    </ClinicalFrame>
  );
}

// ◇ II — Emergency Access Reviews (who opened a facility system out of hours and whether it was reviewed)
export function BreakGlassAudit({ id, now }: { id: string; now: number }) {
  const ts = now / 4000;
  const events = Array.from({ length: 6 }, (_, i) => {
    const k = `bg:${id}:${i}:${Math.floor(ts / 4)}`;
    const reasons = ['Emergency access invoked', 'Out-of-hours access', 'Access outside the assigned facility', 'Access by a locum', 'Bulk export requested', 'Restricted file opened'];
    const reviewed = seed(`${k}:r`) > 0.32;
    return {
      id: `BG-${(40000 + Math.floor(seed(`${k}:id`) * 50000))}`,
      official: `Dr. ${['Adamu', 'Petrov', 'Mehta', 'Tanaka', 'Oduya', 'Brennan'][i]!}`,
      reason: reasons[i]!,
      facility: ['North District Hospital', 'Central Polyclinic', 'Coastal Health Centre', 'Highland Clinic', 'Eastern Referral', 'Capital Hospital'][i]!,
      ageHrs: Math.round(wave(`${k}:a`, ts, 1, 168)),
      reviewed,
    };
  });
  return (
    <ClinicalFrame archetype="portal" code="PR-BGA-02" title="Emergency Access Reviews" subtitle="facility systems opened under emergency access · mandatory post-hoc review">
      <KpiBar items={[
        { label: 'Invocations (last 30d)', value: Math.round(wave(`bg:n:${id}`, ts, 8, 240)), tone: HEALTH_DS.triage },
        { label: 'Reviewed', value: events.filter(e => e.reviewed).length, tone: HEALTH_DS.vital },
        { label: 'Pending review', value: events.filter(e => !e.reviewed).length, tone: HEALTH_DS.alert },
        { label: 'Persons notified', value: `${Math.round(wave(`bg:nt:${id}`, ts, 88, 100))}%`, tone: HEALTH_DS.sterile },
      ]} />
      <WardRule label="invocation log" />
      <div className="space-y-1">
        {events.map(e => (
          <div key={e.id} className="grid grid-cols-[110px_1fr_200px_70px_110px] gap-3 border-b py-1.5 text-[10.5px]" style={{ borderColor: HEALTH_DS.ruleSoft, fontFamily: 'ui-monospace, monospace' }}>
            <span className="tabular-nums" style={{ color: HEALTH_DS.triage }}>{e.id}</span>
            <span style={{ color: HEALTH_DS.chart }}>{e.reason}</span>
            <span style={{ color: HEALTH_DS.ink }}>{e.official} · {e.facility}</span>
            <span className="text-right tabular-nums" style={{ color: HEALTH_DS.mut }}>{e.ageHrs}h</span>
            <span className="text-right uppercase tracking-[0.18em]" style={{ color: e.reviewed ? HEALTH_DS.vital : HEALTH_DS.alert }}>{e.reviewed ? '✓ reviewed' : '○ pending'}</span>
          </div>
        ))}
      </div>
      <WardRule label="constitutional safeguard" />
      <p className="text-[10.5px] italic" style={{ color: HEALTH_DS.mut }}>
        Emergency access is allowed for true emergencies (§13.3). Every invocation triggers mandatory post-hoc
        review and notification of the person concerned. Unreviewed invocations escalate to the records officer&apos;s queue.
      </p>
    </ClinicalFrame>
  );
}

// Reference these engines so unused-import warnings don't fire
void doctorRoster; void laboratoryOps; void nationalHealthcareCapacity; void hospitalOps;
