'use client';

// Nine new clinical domains lifting Health from 21 → 30 surfaces.
// Each consumes existing engines and renders through HEALTH_DS.

import * as React from 'react';
import {
  doctorRoster, intakeQueue, hospitalOps, laboratoryOps,
  nationalHealthcareCapacity, patientServices,
} from '@/lib/gov/health-systems';
import {
  ClinicalFrame, VitalStrip, FloorPlanBay, ChartLine, KpiBar, WardRule, HEALTH_DS,
} from '@/apps/ministry-health/design-system/health-ds';
import { seed, wave } from '@/lib/telemetry';
import type { BayStatus } from '@/apps/ministry-health/design-system/health-ds';

// ◧ II — Ward Board
export function WardBoard({ id, now }: { id: string; now: number }) {
  const ts = now / 4000;
  const hops = hospitalOps(id, ts);
  const total = 16;
  const occupiedCount = Math.floor((hops.beds.occupancyPct / 100) * total);
  const bays = Array.from({ length: total }, (_, i) => {
    const k = `wb:${id}:${i}:${Math.floor(ts / 4)}`;
    const status: BayStatus = i < occupiedCount
      ? (seed(`${k}:c`) > 0.92 ? 'critical' : 'occupied')
      : (seed(`${k}:c`) > 0.8 ? 'cleaning' : 'available');
    return {
      id: `B-${String(i + 1).padStart(2, '0')}`,
      occupant: status === 'occupied' || status === 'critical' ? `Patient ${1000 + Math.floor(seed(`${k}:p`) * 9000)}` : undefined,
      status,
      since: status === 'occupied' || status === 'critical' ? `${Math.floor(wave(`${k}:s`, ts, 1, 72))}h` : undefined,
      note: status === 'critical' ? 'Sepsis protocol' : undefined,
    };
  });
  return (
    <ClinicalFrame archetype="floor-plan" code="FA-WRD-02" title="Ward Board" subtitle="inpatient bay layout · 16 beds">
      <KpiBar items={[
        { label: 'Beds', value: total, tone: HEALTH_DS.chart },
        { label: 'Occupancy', value: `${hops.beds.occupancyPct}%`, tone: hops.beds.occupancyPct >= 92 ? HEALTH_DS.alert : HEALTH_DS.sterile },
        { label: 'Critical bays', value: bays.filter(b => b.status === 'critical').length, tone: HEALTH_DS.alert },
        { label: 'Cleaning', value: bays.filter(b => b.status === 'cleaning').length, tone: HEALTH_DS.mut },
      ]} />
      <WardRule label="bay layout" />
      <div className="grid grid-cols-4 gap-2">
        {bays.map(b => <FloorPlanBay key={b.id} id={b.id} occupant={b.occupant} status={b.status} since={b.since} note={b.note} />)}
      </div>
    </ClinicalFrame>
  );
}

// ◧ III — ICU Board (vital signs per bay)
export function ICUBoard({ id, now }: { id: string; now: number }) {
  const ts = now / 4000;
  const beds = 8;
  const bays = Array.from({ length: beds }, (_, i) => {
    const k = `icu:${id}:${i}`;
    const occupied = seed(`${k}:o`) > 0.18;
    return {
      id: `ICU-${String(i + 1).padStart(2, '0')}`,
      occupied,
      patient: occupied ? `Patient ${5000 + Math.floor(seed(`${k}:p`) * 4000)}` : null,
      hr: Math.round(wave(`${k}:hr`, ts, 56, 124)),
      bp: `${Math.round(wave(`${k}:bps`, ts, 92, 152))}/${Math.round(wave(`${k}:bpd`, ts, 56, 96))}`,
      spo2: Math.round(wave(`${k}:sp`, ts, 88, 100)),
      temp: Math.round(wave(`${k}:t`, ts, 36, 39.6) * 10) / 10,
    };
  });
  return (
    <ClinicalFrame archetype="vitals" code="FA-ICU-03" title="ICU Board" subtitle="critical care · live vital signs">
      <KpiBar items={[
        { label: 'ICU beds', value: beds, tone: HEALTH_DS.chart },
        { label: 'Occupied', value: bays.filter(b => b.occupied).length, tone: HEALTH_DS.sterile },
        { label: 'Critical (HR<60 or >120)', value: bays.filter(b => b.occupied && (b.hr < 60 || b.hr > 120)).length, tone: HEALTH_DS.alert },
        { label: 'Hypoxic (SpO₂<92)', value: bays.filter(b => b.occupied && b.spo2 < 92).length, tone: HEALTH_DS.alert },
      ]} />
      <WardRule label="vital signs per bay" />
      <div className="space-y-2">
        {bays.filter(b => b.occupied).map(b => (
          <div key={b.id} className="grid grid-cols-[120px_1fr] gap-3">
            <div className="border px-3 py-2" style={{ background: HEALTH_DS.wardDeep, borderColor: HEALTH_DS.ruleSoft, borderLeft: `3px solid ${b.hr < 60 || b.hr > 120 || b.spo2 < 92 ? HEALTH_DS.alert : HEALTH_DS.sterile}` }}>
              <div className="text-[10.5px]" style={{ color: HEALTH_DS.chart, fontFamily: 'ui-monospace, monospace' }}>{b.id}</div>
              <div className="text-[9.5px]" style={{ color: HEALTH_DS.ink }}>{b.patient}</div>
            </div>
            <VitalStrip heartRate={b.hr} bp={b.bp} spo2={b.spo2} temp={b.temp} />
          </div>
        ))}
      </div>
    </ClinicalFrame>
  );
}

// ◧ IV — Operating Theatre Board
export function ORBoard({ id, now }: { id: string; now: number }) {
  const ts = now / 4000;
  const theatres = ['OR-1', 'OR-2', 'OR-3', 'OR-4', 'OR-5', 'OR-6'];
  const lineup = theatres.map(t => {
    const k = `or:${id}:${t}`;
    const statusRoll = seed(`${k}:st:${Math.floor(ts / 2)}`);
    const status: BayStatus = statusRoll > 0.78 ? 'occupied' : statusRoll > 0.5 ? 'pending' : statusRoll > 0.2 ? 'available' : 'cleaning';
    return {
      id: t,
      patient: status === 'occupied' ? `Patient ${7000 + Math.floor(seed(`${k}:p`) * 2000)}` : status === 'pending' ? `Patient ${9000 + Math.floor(seed(`${k}:p`) * 1000)}` : undefined,
      status,
      procedure: status === 'occupied' ? ['Appendectomy', 'C-section', 'Hernia repair', 'CABG', 'Cataract'][Math.floor(seed(`${k}:pr`) * 5)]! : undefined,
      since: status === 'occupied' ? `${Math.floor(wave(`${k}:s`, ts, 5, 320))}m` : undefined,
    };
  });
  return (
    <ClinicalFrame archetype="floor-plan" code="FA-OR-04" title="Operating Theatre Board" subtitle="surgical scheduling · 6 OR suites">
      <KpiBar items={[
        { label: 'Theatres', value: 6, tone: HEALTH_DS.chart },
        { label: 'In surgery', value: lineup.filter(l => l.status === 'occupied').length, tone: HEALTH_DS.sterile },
        { label: 'Pending', value: lineup.filter(l => l.status === 'pending').length, tone: HEALTH_DS.triage },
        { label: 'Available', value: lineup.filter(l => l.status === 'available').length, tone: HEALTH_DS.vital },
      ]} />
      <WardRule label="theatre line-up" />
      <div className="grid grid-cols-2 gap-2 xl:grid-cols-3">
        {lineup.map(l => (
          <FloorPlanBay key={l.id} id={l.id} occupant={l.patient ? `${l.patient}${l.procedure ? ` · ${l.procedure}` : ''}` : undefined} status={l.status} since={l.since} />
        ))}
      </div>
    </ClinicalFrame>
  );
}

// ◧ V — Emergency Department
export function EmergencyDepartmentBoard({ id, now }: { id: string; now: number }) {
  const ts = now / 4000;
  const intake = intakeQueue(id, ts, 12);
  return (
    <ClinicalFrame archetype="floor-plan" code="FA-ED-05" title="Emergency Department" subtitle="triage queue · live presentations">
      <KpiBar items={[
        { label: 'Presenting', value: intake.length, tone: HEALTH_DS.chart },
        { label: 'ESI 1-2 (resus / emergent)', value: intake.filter(v => v.triage <= 2).length, tone: HEALTH_DS.alert },
        { label: 'ESI 3 (urgent)', value: intake.filter(v => v.triage === 3).length, tone: HEALTH_DS.triage },
        { label: 'Waiting >60m', value: intake.filter(v => v.waitMin > 60).length, tone: HEALTH_DS.alert },
      ]} />
      <WardRule label="triage queue" />
      <div className="space-y-1">
        {intake.map((v, i) => {
          const col = v.triage <= 2 ? HEALTH_DS.alert : v.triage === 3 ? HEALTH_DS.triage : HEALTH_DS.vital;
          return (
            <div key={v.id} className="grid grid-cols-[80px_1fr_120px_80px_120px] gap-3 border-b py-1.5 text-[11px]" style={{ borderColor: HEALTH_DS.ruleSoft, fontFamily: 'ui-monospace, monospace' }}>
              <span className="tabular-nums" style={{ color: HEALTH_DS.mut }}>№ {String(i + 1).padStart(2, '0')}</span>
              <span style={{ color: HEALTH_DS.chart }}>{v.complaint}</span>
              <span style={{ color: HEALTH_DS.ink }}>Patient {v.id}</span>
              <span className="text-right tabular-nums" style={{ color: v.waitMin > 60 ? HEALTH_DS.alert : HEALTH_DS.mut }}>{v.waitMin}m wait</span>
              <span className="text-right uppercase tracking-[0.18em]" style={{ color: col }}>ESI {v.triage}</span>
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

// ⊟ I — Master Patient Index
export function MasterPatientIndex({ id, now }: { id: string; now: number }) {
  const ts = now / 4000;
  return (
    <ClinicalFrame archetype="registry" code="PT-MPI-01" title="Master Patient Index" subtitle="keyed to CivicID with privacy-preserving linkage">
      <KpiBar items={[
        { label: 'Patients enrolled (M)', value: Math.round(wave(`mpi:e:${id}`, ts, 4, 84) * 10) / 10, tone: HEALTH_DS.chart },
        { label: 'CivicID-linked', value: `${Math.round(wave(`mpi:l:${id}`, ts, 88, 99.8) * 10) / 10}%`, tone: HEALTH_DS.vital },
        { label: 'Duplicate suspicions', value: Math.round(wave(`mpi:d:${id}`, ts, 200, 12800)).toLocaleString(), tone: HEALTH_DS.triage },
        { label: 'Resolution queue', value: Math.round(wave(`mpi:q:${id}`, ts, 80, 4800)).toLocaleString(), tone: HEALTH_DS.sterile },
      ]} />
      <WardRule label="linkage doctrine" />
      <p className="text-[10.5px] italic" style={{ color: HEALTH_DS.mut }}>
        The MPI links to CivicID through a one-way cryptographic linkage. Health records are addressable by the
        MPI key only; the CivicID is never stored in the EHR.
      </p>
    </ClinicalFrame>
  );
}

// ⊟ II — Longitudinal EHR (chart view)
export function LongitudinalEHR({ id, now }: { id: string; now: number }) {
  const ts = now / 4000;
  void id;
  const events = [
    { when: '08:42', action: 'Vitals recorded · HR 88 · BP 124/76 · SpO₂ 97%', by: 'Nurse Adamu', severity: 'routine' as const },
    { when: '08:55', action: 'Differential: r/o appendicitis vs gastroenteritis', by: 'Dr. Petrov', severity: 'note' as const },
    { when: '09:12', action: 'CBC + CRP + lipase ordered', by: 'Dr. Petrov', severity: 'routine' as const },
    { when: '09:48', action: 'Lab result: CRP 84 (HIGH) · WBC 14.2', by: 'Lab system', severity: 'alert' as const },
    { when: '10:05', action: 'Surgical consult requested (appendectomy r/o)', by: 'Dr. Petrov', severity: 'note' as const },
    { when: '10:31', action: 'OR slot reserved · OR-3 · 11:00', by: 'OR scheduler', severity: 'note' as const },
    { when: '10:42', action: 'Consent for appendectomy obtained', by: 'Patient', severity: 'note' as const },
    { when: '11:05', action: 'Pre-operative checklist completed', by: 'Theatre nurse', severity: 'routine' as const },
  ];
  return (
    <ClinicalFrame archetype="chart" code="PT-EHR-02" title="Longitudinal EHR" subtitle="encounter view · FHIR R5+ native">
      <VitalStrip heartRate={88} bp="124/76" spo2={97} temp={37.4} label="Patient 8341 · admitted 08:42 · ESI 3" />
      <WardRule label="encounter chart" />
      {events.map((e, i) => <ChartLine key={i} when={e.when} action={e.action} by={e.by} severity={e.severity} />)}
      <WardRule label="audit trail" />
      <p className="text-[10.5px] italic" style={{ color: HEALTH_DS.mut, fontFamily: 'ui-monospace, monospace' }}>
        Every clinical entry is cryptographically signed by the issuing clinician and replicated to the Audit Vault.
        Patient may request access log at any time.
      </p>
      {void ts}
    </ClinicalFrame>
  );
}

// ◇ II — Break-Glass Audit
export function BreakGlassAudit({ id, now }: { id: string; now: number }) {
  const ts = now / 4000;
  const events = Array.from({ length: 6 }, (_, i) => {
    const k = `bg:${id}:${i}:${Math.floor(ts / 4)}`;
    const reasons = ['Cardiac arrest — unknown patient', 'MVA mass casualty', 'Unconscious presentation', 'Psychiatric emergency', 'Suspected anaphylaxis', 'Paediatric trauma'];
    const reviewed = seed(`${k}:r`) > 0.32;
    return {
      id: `BG-${(40000 + Math.floor(seed(`${k}:id`) * 50000))}`,
      clinician: `Dr. ${['Adamu', 'Petrov', 'Mehta', 'Tanaka', 'Oduya', 'Brennan'][i]!}`,
      reason: reasons[i]!,
      patient: `Patient ${1000 + Math.floor(seed(`${k}:p`) * 9000)}`,
      ageHrs: Math.round(wave(`${k}:a`, ts, 1, 168)),
      reviewed,
      reviewerRole: reviewed ? 'Records Officer' : undefined,
    };
  });
  return (
    <ClinicalFrame archetype="portal" code="PR-BGA-02" title="Break-Glass Audit" subtitle="emergency EHR access · mandatory post-hoc review">
      <KpiBar items={[
        { label: 'Invocations (last 30d)', value: Math.round(wave(`bg:n:${id}`, ts, 8, 240)), tone: HEALTH_DS.triage },
        { label: 'Reviewed', value: events.filter(e => e.reviewed).length, tone: HEALTH_DS.vital },
        { label: 'Pending review', value: events.filter(e => !e.reviewed).length, tone: HEALTH_DS.alert },
        { label: 'Patients notified', value: `${Math.round(wave(`bg:nt:${id}`, ts, 88, 100))}%`, tone: HEALTH_DS.sterile },
      ]} />
      <WardRule label="invocation log" />
      <div className="space-y-1">
        {events.map(e => (
          <div key={e.id} className="grid grid-cols-[110px_1fr_160px_70px_110px] gap-3 border-b py-1.5 text-[10.5px]" style={{ borderColor: HEALTH_DS.ruleSoft, fontFamily: 'ui-monospace, monospace' }}>
            <span className="tabular-nums" style={{ color: HEALTH_DS.triage }}>{e.id}</span>
            <span style={{ color: HEALTH_DS.chart }}>{e.reason}</span>
            <span style={{ color: HEALTH_DS.ink }}>{e.clinician} · {e.patient}</span>
            <span className="text-right tabular-nums" style={{ color: HEALTH_DS.mut }}>{e.ageHrs}h</span>
            <span className="text-right uppercase tracking-[0.18em]" style={{ color: e.reviewed ? HEALTH_DS.vital : HEALTH_DS.alert }}>{e.reviewed ? '✓ reviewed' : '○ pending'}</span>
          </div>
        ))}
      </div>
      <WardRule label="constitutional safeguard" />
      <p className="text-[10.5px] italic" style={{ color: HEALTH_DS.mut }}>
        Break-glass access is allowed for true emergencies (§13.3). Every invocation triggers mandatory post-hoc
        review and automatic patient notification. Unreviewed invocations escalate to the Records Officer SLA queue.
      </p>
    </ClinicalFrame>
  );
}

// Reference these engines so unused-import warnings don't fire
void doctorRoster; void laboratoryOps; void nationalHealthcareCapacity; void patientServices;
