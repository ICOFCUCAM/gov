'use client';

// apps/ministry-health — the first real federated institutional
// application. NOT a dashboard: each domain is an operational execution
// surface (live engine state + an executable workflow runtime + entity
// drilldown). National dashboards consume this ministry's real operations.

import * as React from 'react';
import { RuntimeQueue } from '@/components/features/RuntimeQueue';
import {
  doctorRoster, intakeQueue, referrals, prescriptions, labRequests,
  workloadIntelligence, hospitalOps, diseaseIntel, patientServices,
} from '@/lib/gov/health-systems';
import {
  pharmaceuticalSupply, laboratoryNetwork, healthFinance,
  healthRegulatory, emergencyMedical, healthCommand,
} from '@/lib/gov/health-operations';
import { LaboratorySystem } from '@/apps/ministry-health/subsystems/LaboratorySystem';
import { DoctorSystem } from '@/apps/ministry-health/subsystems/DoctorSystem';
import { HospitalSystem } from '@/apps/ministry-health/subsystems/HospitalSystem';
import { PharmaceuticalSystem } from '@/apps/ministry-health/subsystems/PharmaceuticalSystem';
import { PatientSystem } from '@/apps/ministry-health/subsystems/PatientSystem';
import { HealthCommandCentre } from '@/apps/ministry-health/subsystems/HealthCommandCentre';
import { EmergencySystem } from '@/apps/ministry-health/subsystems/EmergencySystem';
import { DiseaseSystem } from '@/apps/ministry-health/subsystems/DiseaseSystem';
import { HealthFinanceSystem } from '@/apps/ministry-health/subsystems/HealthFinanceSystem';
import { RegulatorySystem } from '@/apps/ministry-health/subsystems/RegulatorySystem';
import { NationalSituationRoom } from '@/apps/ministry-health/subsystems/NationalSituationRoom';
import { HealthcareGridSystem } from '@/apps/ministry-health/subsystems/HealthcareGridSystem';
import { CitizenPortalSystem } from '@/apps/ministry-health/subsystems/CitizenPortalSystem';
import { InteroperabilitySystem } from '@/apps/ministry-health/subsystems/InteroperabilitySystem';
import { SimulationSystem } from '@/apps/ministry-health/subsystems/SimulationSystem';
import { SecuritySystem } from '@/apps/ministry-health/subsystems/SecuritySystem';
import { ExecutiveBriefingSystem } from '@/apps/ministry-health/subsystems/ExecutiveBriefingSystem';
import { ResearchSystemView } from '@/apps/ministry-health/subsystems/ResearchSystemView';
import { WardSurgicalSystem } from '@/apps/ministry-health/subsystems/WardSurgicalSystem';
import type { SovereignRole, Capability } from '@/shared/permissions/rbac';
import type { WorkKind } from '@/lib/gov/runtime-workflow';

const tc = (t: 'ok' | 'warn' | 'alert') => `rgb(var(--c-${t}))`;

function Stat({ l, v, t }: { l: string; v: string; t?: 'ok' | 'warn' | 'alert' }) {
  return (
    <div className="rounded-[3px] border border-line bg-surface px-3 py-2">
      <div className="truncate text-[8px] font-semibold uppercase tracking-[0.16em] text-ink-muted">{l}</div>
      <div className="font-mono text-[15px] tabular-nums" style={{ color: t ? tc(t) : 'rgb(var(--c-ink))' }}>{v}</div>
    </div>
  );
}
function Bars({ rows }: { rows: { label: string; pct: number; tone: 'ok' | 'warn' | 'alert'; tail?: string }[] }) {
  return (
    <div className="space-y-1">
      {rows.map(r => (
        <div key={r.label} className="flex items-center gap-2 text-[10px]">
          <span className="w-28 shrink-0 truncate text-ink-soft">{r.label}</span>
          <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-surface-2"><span className="block h-full" style={{ width: `${Math.min(100, r.pct)}%`, backgroundColor: tc(r.tone) }} /></div>
          <span className="w-14 shrink-0 text-right font-mono tabular-nums" style={{ color: tc(r.tone) }}>{r.tail ?? r.pct}</span>
        </div>
      ))}
    </div>
  );
}
function Panel({ title, meta, children }: { title: string; meta?: string; children: React.ReactNode }) {
  return (
    <section className="rounded-[3px] border border-line bg-surface">
      <div className="flex items-center justify-between gap-2 border-b border-line px-2.5 py-1.5">
        <h3 className="text-[10px] font-semibold uppercase tracking-[0.16em] text-ink-soft">{title}</h3>
        {meta ? <span className="text-[10px] text-ink-muted">{meta}</span> : null}
      </div>
      <div className="p-2.5">{children}</div>
    </section>
  );
}

const DOMAIN_WF: Record<string, WorkKind> = {
  command: 'incident', hospitals: 'case', doctor: 'encounter', patient: 'approval',
  pharma: 'procurement', disease: 'incident', lab: 'case', emergency: 'incident',
  finance: 'procurement', regulatory: 'permit', situation: 'incident', grid: 'case', portal: 'approval', interop: 'case', simulation: 'incident', security: 'incident', executive: 'incident', research: 'case', wards: 'case',
};
const DOMAIN_LABEL: Record<string, string> = {
  command: 'Health Command', hospitals: 'Hospital Network', doctor: 'Doctor Systems',
  patient: 'Patient Systems', pharma: 'Pharmaceutical Systems', disease: 'Disease Intelligence',
  lab: 'Laboratory Systems', emergency: 'Emergency Medical', finance: 'Health Finance',
  regulatory: 'Regulatory Systems',
};

export function MinistryHealthApp({
  instanceId, domain, now, role, withheld,
}: { instanceId: string; domain: string; now: number; role: SovereignRole; withheld: Capability[] }) {
  const id = instanceId;
  const ts = now / 4000;
  const d = (DOMAIN_WF[domain] ? domain : 'command');
  const wf = DOMAIN_WF[d] ?? 'case';
  const label = DOMAIN_LABEL[d] ?? 'Health Command';

  // Laboratory Systems is a deep, self-contained execution system
  // (own runtime + interactions) — render it directly.
  if (d === 'lab') {
    return <LaboratorySystem id={id} now={now} role={role} withheld={withheld} />;
  }
  if (d === 'doctor') {
    return <DoctorSystem id={id} now={now} role={role} withheld={withheld} />;
  }
  if (d === 'hospitals') {
    return <HospitalSystem id={id} now={now} role={role} withheld={withheld} />;
  }
  if (d === 'pharma') {
    return <PharmaceuticalSystem id={id} now={now} role={role} withheld={withheld} />;
  }
  if (d === 'patient') {
    return <PatientSystem id={id} now={now} role={role} withheld={withheld} />;
  }
  if (d === 'command') {
    return <HealthCommandCentre id={id} now={now} role={role} withheld={withheld} />;
  }
  if (d === 'emergency') {
    return <EmergencySystem id={id} now={now} role={role} withheld={withheld} />;
  }
  if (d === 'disease') {
    return <DiseaseSystem id={id} now={now} role={role} withheld={withheld} />;
  }
  if (d === 'finance') {
    return <HealthFinanceSystem id={id} now={now} role={role} withheld={withheld} />;
  }
  if (d === 'regulatory') {
    return <RegulatorySystem id={id} now={now} role={role} withheld={withheld} />;
  }
  if (d === 'situation') {
    return <NationalSituationRoom id={id} now={now} role={role} withheld={withheld} />;
  }
  if (d === 'grid') {
    return <HealthcareGridSystem id={id} now={now} role={role} withheld={withheld} />;
  }
  if (d === 'portal') {
    return <CitizenPortalSystem id={id} now={now} role={role} withheld={withheld} />;
  }
  if (d === 'interop') {
    return <InteroperabilitySystem id={id} now={now} role={role} withheld={withheld} />;
  }
  if (d === 'simulation') {
    return <SimulationSystem id={id} now={now} role={role} withheld={withheld} />;
  }
  if (d === 'security') {
    return <SecuritySystem id={id} now={now} role={role} withheld={withheld} />;
  }
  if (d === 'executive') {
    return <ExecutiveBriefingSystem id={id} now={now} role={role} withheld={withheld} />;
  }
  if (d === 'research') {
    return <ResearchSystemView id={id} now={now} role={role} withheld={withheld} />;
  }
  if (d === 'wards') {
    return <WardSurgicalSystem id={id} now={now} role={role} withheld={withheld} />;
  }

  let body: React.ReactNode = null;

  if (d === 'command') {
    const di = diseaseIntel(id, ts);
    const em = emergencyMedical(id, ts);
    const hosp = hospitalOps(id, ts);
    const hc = healthCommand(id, ts, di.outbreaks.filter(o => o.severity !== 'contained').length);
    body = (
      <>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-6">
          <Stat l="Command posture" v={hc.posture} t={hc.posture === 'crisis' ? 'alert' : hc.posture === 'elevated' ? 'warn' : 'ok'} />
          <Stat l="Outbreak alerts" v={`${hc.outbreakAlerts}`} t={hc.outbreakAlerts ? 'alert' : 'ok'} />
          <Stat l="Bed occupancy" v={`${hosp.beds.occupancyPct}%`} t={hosp.beds.occupancyPct >= 92 ? 'alert' : hosp.beds.occupancyPct >= 82 ? 'warn' : 'ok'} />
          <Stat l="Ambulance response" v={`${em.meanResponseMin}m`} t={em.meanResponseMin >= 18 ? 'alert' : 'warn'} />
          <Stat l="Logistics corridors" v={`${hc.logisticsCorridorsOpen}/${hc.logisticsCorridorsTotal}`} t={hc.logisticsCorridorsOpen < hc.logisticsCorridorsTotal ? 'warn' : 'ok'} />
          <Stat l="National Rt" v={`${di.nationalRt}`} t={di.nationalRt > 1.3 ? 'alert' : di.nationalRt > 1 ? 'warn' : 'ok'} />
        </div>
        <Panel title="Regional escalation" meta="national → regional command">
          <Bars rows={hc.regionalEscalations.map(r => ({ label: r.region, pct: r.level === 'critical' ? 92 : r.level === 'watch' ? 60 : 28, tone: r.tone, tail: r.level }))} />
        </Panel>
      </>
    );
  } else if (d === 'hospitals') {
    const h = hospitalOps(id, ts);
    body = (
      <>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-6">
          <Stat l="Beds" v={`${h.beds.occupied}/${h.beds.total}`} t={h.beds.occupancyPct >= 92 ? 'alert' : 'warn'} />
          <Stat l="ICU occupancy" v={`${h.icu.occupancyPct}%`} t={h.icu.occupancyPct >= 95 ? 'alert' : h.icu.occupancyPct >= 85 ? 'warn' : 'ok'} />
          <Stat l="Ventilators" v={`${h.icu.ventInUse}/${h.icu.ventilators}`} t={h.icu.ventInUse / h.icu.ventilators >= 0.9 ? 'alert' : 'warn'} />
          <Stat l="Theatres active" v={`${h.theatres.active}/${h.theatres.total}`} t="ok" />
          <Stat l="Staffing" v={`${h.staffingPct}%`} t={h.staffingPct >= 80 ? 'ok' : 'warn'} />
          <Stat l="Mortality index" v={`${h.mortalityIndex}`} t={h.mortalityIndex >= 16 ? 'alert' : 'warn'} />
        </div>
        <Panel title="Capacity & load balancing" meta="bed · ICU · ventilators">
          <Bars rows={[
            { label: 'General beds', pct: h.beds.occupancyPct, tone: h.beds.occupancyPct >= 92 ? 'alert' : h.beds.occupancyPct >= 82 ? 'warn' : 'ok', tail: `${h.beds.occupancyPct}%` },
            { label: 'ICU', pct: h.icu.occupancyPct, tone: h.icu.occupancyPct >= 95 ? 'alert' : 'warn', tail: `${h.icu.occupancyPct}%` },
            { label: 'Theatre utilisation', pct: h.theatres.utilisationPct, tone: h.theatres.utilisationPct >= 92 ? 'warn' : 'ok', tail: `${h.theatres.utilisationPct}%` },
          ]} />
        </Panel>
      </>
    );
  } else if (d === 'doctor') {
    const roster = doctorRoster(id, ts);
    const wl = workloadIntelligence(roster);
    const q = intakeQueue(id, ts);
    body = (
      <>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-6">
          <Stat l="Clinicians" v={`${roster.length}`} />
          <Stat l="Available" v={`${roster.filter(r => r.status === 'available').length}`} t="ok" />
          <Stat l="Mean workload" v={`${wl.meanWorkload}%`} t={wl.meanWorkload >= 85 ? 'alert' : wl.meanWorkload >= 70 ? 'warn' : 'ok'} />
          <Stat l="Burnout alerts" v={`${wl.burnoutAlert}`} t={wl.burnoutAlert ? 'alert' : 'ok'} />
          <Stat l="Intake queue" v={`${q.length}`} t={q.filter(p => p.triage <= 2).length ? 'warn' : 'ok'} />
          <Stat l="Open referrals" v={`${referrals(id, ts).length}`} t="warn" />
        </div>
        <Panel title="Workload intelligence" meta="by specialty">
          <Bars rows={wl.specialties.map(s => ({ label: s.specialty, pct: s.load, tone: s.tone, tail: `${s.load}` }))} />
        </Panel>
      </>
    );
  } else if (d === 'patient') {
    const ps = patientServices(id, ts);
    body = (
      <>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-6">
          <Stat l="Citizens enrolled" v={`${ps.registeredM}M`} t="ok" />
          <Stat l="Portal uptime" v={`${ps.portalUptime}%`} t={ps.portalUptime >= 99 ? 'ok' : 'warn'} />
          <Stat l="Appointments today" v={ps.appointmentsToday.toLocaleString()} t="ok" />
          <Stat l="Insurance coverage" v={`${ps.insuranceCoverage}%`} t={ps.insuranceCoverage >= 75 ? 'ok' : 'warn'} />
          <Stat l="Claims pending" v={ps.claimsPending.toLocaleString()} t={ps.claimsPending > 3000 ? 'alert' : 'warn'} />
          <Stat l="Treatment adherence" v={`${ps.treatmentTracking.adherencePct}%`} t={ps.treatmentTracking.adherencePct >= 80 ? 'ok' : 'warn'} />
        </div>
        <Panel title="Vaccination registry" meta="immunisation status">
          <Bars rows={ps.vaccination.map(v => ({ label: v.vaccine, pct: v.status === 'overdue' ? 30 : v.status === 'due' ? 60 : 95, tone: v.status === 'overdue' ? 'alert' : v.status === 'due' ? 'warn' : 'ok', tail: v.status }))} />
        </Panel>
      </>
    );
  } else if (d === 'pharma') {
    const ph = pharmaceuticalSupply(id, ts);
    body = (
      <>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-6">
          <Stat l="Outlets" v={ph.outlets.toLocaleString()} t="ok" />
          <Stat l="Stockout risk" v={`${ph.stockoutRiskPct}%`} t={ph.stockoutRiskPct >= 25 ? 'alert' : ph.stockoutRiskPct >= 12 ? 'warn' : 'ok'} />
          <Stat l="In transit" v={ph.pipelineInTransit.toLocaleString()} t="ok" />
          <Stat l="Expiring soon" v={`${ph.expiringSoon}`} t={ph.expiringSoon > 80 ? 'warn' : 'ok'} />
          <Stat l="Procurement open" v={`${ph.procurementOpen}`} t="warn" />
          <Stat l="Reorder lines" v={`${ph.drugs.filter(x => x.reorder).length}`} t={ph.drugs.some(x => x.reorder) ? 'alert' : 'ok'} />
        </div>
        <Panel title="Essential medicine stock cover" meta="days of cover">
          <Bars rows={ph.drugs.map(x => ({ label: x.drug, pct: Math.min(100, x.coverDays), tone: x.tone, tail: `${x.coverDays}d` }))} />
        </Panel>
      </>
    );
  } else if (d === 'disease') {
    const di = diseaseIntel(id, ts);
    body = (
      <>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-6">
          <Stat l="National Rt" v={`${di.nationalRt}`} t={di.nationalRt > 1.3 ? 'alert' : di.nationalRt > 1 ? 'warn' : 'ok'} />
          <Stat l="Active cases" v={di.activeCases.toLocaleString()} t={di.activeCases > 4000 ? 'alert' : 'warn'} />
          <Stat l="Mortality (7d)" v={`${di.mortality7d}`} t={di.mortality7d > 200 ? 'alert' : 'warn'} />
          <Stat l="Vaccination" v={`${di.vaccinationCoverage}%`} t={di.vaccinationCoverage >= 80 ? 'ok' : 'warn'} />
          <Stat l="Worst region" v={di.worstRegion} t="alert" />
          <Stat l="Outbreak cells" v={`${di.outbreaks.filter(o => o.severity !== 'contained').length}`} t="warn" />
        </div>
        <Panel title="Outbreak heatmap" meta="region · Rt · spread">
          <Bars rows={di.outbreaks.map(o => ({ label: `${o.region} · ${o.disease}`, pct: Math.min(100, o.rt * 50), tone: o.severity === 'critical' ? 'alert' : o.severity === 'active' ? 'warn' : 'ok', tail: `Rt ${o.rt}` }))} />
        </Panel>
        <Panel title="Predictive epidemiology" meta="projected trajectory">
          <Bars rows={di.forecast.map(f => ({ label: `T+${f.tPlusDays}d`, pct: Math.min(100, (f.projectedCases / (di.activeCases * 3 || 1)) * 100), tone: f.projectedCases > di.activeCases ? 'alert' : 'ok', tail: f.projectedCases.toLocaleString() }))} />
        </Panel>
      </>
    );
  } else if (d === 'lab') {
    const lab = laboratoryNetwork(id, ts);
    body = (
      <>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-6">
          <Stat l="Laboratories" v={`${lab.labs}`} t="ok" />
          <Stat l="Samples in process" v={lab.samplesInProcess.toLocaleString()} t="ok" />
          <Stat l="Turnaround" v={`${lab.meanTurnaroundHrs}h`} t={lab.meanTurnaroundHrs >= 48 ? 'alert' : lab.meanTurnaroundHrs >= 24 ? 'warn' : 'ok'} />
          <Stat l="Backlog" v={lab.backlog.toLocaleString()} t={lab.backlog > 5000 ? 'alert' : 'warn'} />
          <Stat l="Sync integrity" v={`${lab.syncIntegrityPct}%`} t={lab.syncIntegrityPct >= 98 ? 'ok' : 'warn'} />
          <Stat l="Lab requests" v={`${labRequests(id, ts).length}`} t="warn" />
        </div>
        <Panel title="Discipline load" meta="pathology · microbiology · molecular">
          <Bars rows={lab.byDiscipline.map(x => ({ label: x.discipline, pct: x.load, tone: x.tone, tail: `${x.load}` }))} />
        </Panel>
      </>
    );
  } else if (d === 'emergency') {
    const em = emergencyMedical(id, ts);
    body = (
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-6">
        <Stat l="Fleet available" v={`${em.ambulancesAvailable}/${em.ambulanceFleet}`} t={em.ambulancesAvailable < em.ambulanceFleet * 0.2 ? 'alert' : 'ok'} />
        <Stat l="Active dispatches" v={`${em.activeDispatches}`} t={em.activeDispatches >= 40 ? 'alert' : em.activeDispatches >= 18 ? 'warn' : 'ok'} />
        <Stat l="Mean response" v={`${em.meanResponseMin}m`} t={em.meanResponseMin >= 18 ? 'alert' : em.meanResponseMin >= 12 ? 'warn' : 'ok'} />
        <Stat l="Disaster posture" v={em.disasterPosture} t={em.disasterPosture === 'major' ? 'alert' : em.disasterPosture === 'elevated' ? 'warn' : 'ok'} />
        <Stat l="Hospital divert" v={`${em.hospitalDivert}`} t={em.hospitalDivert ? 'warn' : 'ok'} />
        <Stat l="Fleet" v={`${em.ambulanceFleet}`} t="ok" />
      </div>
    );
  } else if (d === 'finance') {
    const hf = healthFinance(id, ts);
    body = (
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-6">
        <Stat l="Insurance coverage" v={`${hf.insuranceCoveragePct}%`} t={hf.insuranceCoveragePct >= 70 ? 'ok' : 'warn'} />
        <Stat l="Claims pending" v={hf.claimsPending.toLocaleString()} t={hf.claimsPending > 15000 ? 'alert' : 'warn'} />
        <Stat l="Claims SLA met" v={`${hf.claimsSlaMetPct}%`} t={hf.claimsSlaMetPct >= 80 ? 'ok' : 'warn'} />
        <Stat l="Budget execution" v={`${hf.budgetExecutionPct}%`} t={hf.budgetExecutionPct >= 80 ? 'ok' : 'warn'} />
        <Stat l="Fraud flags" v={`${hf.fraudFlags}`} t={hf.fraudFlags ? 'alert' : 'ok'} />
        <Stat l="Reimbursement backlog" v={`$${hf.reimbursementBacklogBn}B`} t={hf.reimbursementBacklogBn > 8 ? 'alert' : 'warn'} />
      </div>
    );
  } else { // regulatory
    const rg = healthRegulatory(id, ts);
    body = (
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-6">
        <Stat l="Facilities licensed" v={rg.facilitiesLicensed.toLocaleString()} t="ok" />
        <Stat l="Licensing pending" v={rg.licensingPending.toLocaleString()} t={rg.licensingPending > 1000 ? 'warn' : 'ok'} />
        <Stat l="Accreditation due" v={`${rg.accreditationDuePct}%`} t={rg.accreditationDuePct >= 25 ? 'warn' : 'ok'} />
        <Stat l="Practitioners" v={`${rg.practitionersRegisteredK}k`} t="ok" />
        <Stat l="Compliance" v={`${rg.compliancePct}%`} t={rg.compliancePct >= 80 ? 'ok' : 'warn'} />
        <Stat l="Sanctions open" v={`${rg.sanctionsOpen}`} t={rg.sanctionsOpen ? 'alert' : 'ok'} />
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {body}
      <RuntimeQueue
        scope={`${id}:${d}`}
        kind={wf}
        title={`${label} runtime — execute the operational workflow`}
        by="Health Officer"
        role={role}
        withheld={withheld}
      />
    </div>
  );
}
