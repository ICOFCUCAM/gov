'use client';

import * as React from 'react';
import Link from 'next/link';
import { api } from '@/lib/api/client';
import { TONE, Panel, Spark, waveSeries } from '@/components/features/SituationRoom';
import { instantiateMinistry, systemKindLabel, blueprintFor } from '@/lib/institution/blueprint';
import {
  doctorRoster, intakeQueue, referrals, prescriptions, labRequests,
  workloadIntelligence, hospitalOps, diseaseIntel, patientServices,
  laboratoryOps, pharmaceuticalOps, emergencyMedicalOps, healthCommand, healthFinanceOps,
  healthRegulatoryOps,
} from '@/lib/gov/health-systems';
import {
  fiscalCommand, revenueOps, budgetOps, procurementOps, bankingRails,
  citizenFinance, fiscalAssurance, treasuryCommand,
} from '@/lib/gov/treasury-systems';
import { archetypeOperations, sectorCommand } from '@/lib/gov/archetype-operations';
import { schoolNetwork, examOps, teacherOps, studentServices, higherEducation, curriculumOps, educationCommand } from '@/lib/gov/education-systems';
import { transportOps, transportCommand } from '@/lib/gov/transport-systems';
import { energyOps, energyCommand } from '@/lib/gov/energy-systems';
import { interiorOps } from '@/lib/gov/interior-systems';
import { agricultureOps } from '@/lib/gov/agriculture-systems';
import { justiceOps } from '@/lib/gov/justice-systems';
import { environmentOps } from '@/lib/gov/environment-systems';
import { tradeOps } from '@/lib/gov/trade-systems';
import { laborOps } from '@/lib/gov/labor-systems';
import { RuntimeQueue } from '@/components/features/RuntimeQueue';
import type { WorkKind } from '@/lib/gov/runtime-workflow';
import type { Ministry } from '@/lib/api/types';
import { resolveInstitution } from '@/lib/institution/federation';

const tc = (t: 'ok' | 'warn' | 'alert') => `rgb(var(--c-${t}))`;

function Stat({ l, v, t }: { l: string; v: string; t?: 'ok' | 'warn' | 'alert' }) {
  return (
    <div className="rounded-[3px] border border-line bg-surface px-3 py-2">
      <div className="truncate text-[8px] font-semibold uppercase tracking-[0.16em] text-ink-muted">{l}</div>
      <div className="font-mono text-[15px] tabular-nums" style={{ color: t ? tc(t) : 'rgb(var(--c-ink))' }}>{v}</div>
    </div>
  );
}

export function SubsystemConsole({ id, group }: { id: string; group: string }) {
  // Resolve the institution synchronously from the canonical federation so
  // the operational surface renders on FIRST paint — no network dependency,
  // no "Loading institution…" dead-end. The API call only refines it.
  const [m, setM] = React.useState<Ministry>(() => resolveInstitution(id));
  const [now, setNow] = React.useState(() => Date.now());
  const [selDoc, setSelDoc] = React.useState<string | null>(null);
  const [selRow, setSelRow] = React.useState<string | null>(null);
  React.useEffect(() => {
    setM(resolveInstitution(id));
    api.org.get(id).then(r => { if (r?.ministry) setM(r.ministry); }).catch(() => {});
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [id]);

  const ts = now / 4000;

  const eco = instantiateMinistry(m, ts);
  const grp = eco.groups.find(g => g.key === group) ?? eco.groups[0]!;
  const isHealth = m.archetype === 'HEALTH';
  const isFinance = m.archetype === 'FINANCE';
  const isEdu = m.archetype === 'EDUCATION';
  const isTransport = m.archetype === 'TRANSPORT';
  const isEnergy = m.archetype === 'ENERGY';
  const isInterior = m.archetype === 'INTERIOR';
  const isAgri = m.archetype === 'AGRICULTURE';
  const isJustice = m.archetype === 'JUSTICE';
  const isEnv = m.archetype === 'ENVIRONMENT';
  const isTrade = m.archetype === 'TRADE';
  const isLabor = m.archetype === 'LABOR';

  const header = (
    <div className="flex flex-wrap items-end justify-between gap-2">
      <div className="flex items-center gap-2">
        <Link href={`/ministries/${id}/operations`} className="focus-ring text-[11px] text-link underline underline-offset-2">← {m.name}</Link>
        <h1 className="text-base font-semibold uppercase tracking-[0.16em] text-ink">{grp.name}</h1>
        <span className="rounded-[3px] border px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-[0.16em]" style={{ borderColor: 'rgb(var(--c-line))', color: 'rgb(var(--c-ink-muted))' }}>
          {m.archetype} · operational environment
        </span>
        <span className="font-mono text-[10px] tabular-nums text-ink-muted">{new Date(now).toLocaleTimeString()}</span>
      </div>
      <div className="flex flex-wrap gap-1">
        {eco.groups.map(g => (
          <Link key={g.key} href={`/ministries/${id}/system/${g.key}`}
            className="focus-ring rounded-[3px] border px-2 py-0.5 text-[9px] no-underline transition-colors"
            style={{ borderColor: g.key === grp.key ? TONE.link : 'rgb(var(--c-line))', color: g.key === grp.key ? TONE.link : 'rgb(var(--c-ink-soft))' }}>
            {g.name}
          </Link>
        ))}
      </div>
    </div>
  );

  // ── HEALTH operational worlds ────────────────────────────────────────
  if (isHealth && group === 'doctor') {
    const roster = doctorRoster(id, ts);
    const wl = workloadIntelligence(roster);
    const queue = intakeQueue(id, ts);
    const refs = referrals(id, ts);
    const rx = prescriptions(id, ts);
    const labs = labRequests(id, ts);
    return (
      <div className="space-y-2">
        {header}
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-6">
          <Stat l="Clinicians on roster" v={`${roster.length}`} />
          <Stat l="Available now" v={`${roster.filter(d => d.status === 'available').length}`} t="ok" />
          <Stat l="Mean workload" v={`${wl.meanWorkload}%`} t={wl.meanWorkload >= 85 ? 'alert' : wl.meanWorkload >= 70 ? 'warn' : 'ok'} />
          <Stat l="Burnout alerts" v={`${wl.burnoutAlert}`} t={wl.burnoutAlert ? 'alert' : 'ok'} />
          <Stat l="Intake queue" v={`${queue.length}`} t={queue.filter(p => p.triage <= 2).length ? 'warn' : 'ok'} />
          <Stat l="Open referrals" v={`${refs.length}`} t="warn" />
        </div>
        <div className="grid gap-2 xl:grid-cols-3">
          <Panel title="Doctor dashboard" meta="roster · workload · status" className="xl:col-span-2" bodyClass="!p-0">
            <div className="max-h-[320px] overflow-y-auto">
              {roster.map(d => {
                const wt = d.workload >= 85 ? 'alert' : d.workload >= 70 ? 'warn' : 'ok';
                const open = selDoc === d.id;
                return (
                  <div key={d.id} className="border-b border-line-soft last:border-0">
                    <button onClick={() => setSelDoc(open ? null : d.id)} className="focus-ring flex w-full items-center gap-2 px-3 py-1.5 text-left transition-colors hover:bg-surface-2/50">
                      <span className="w-16 shrink-0 font-mono text-[9px] tabular-nums text-ink-muted">{d.id}</span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[11px] text-ink">{d.name}</span>
                        <span className="block truncate text-[8.5px] text-ink-muted">{d.specialty} · {d.region} · {d.patientsToday} today{d.onCall ? ' · on-call' : ''}</span>
                      </span>
                      <span className="w-16 shrink-0 text-[8px] uppercase tracking-wider" style={{ color: d.status === 'available' ? TONE.ok : d.status === 'off-duty' ? 'rgb(var(--c-ink-muted))' : TONE.warn }}>{d.status}</span>
                      <span className="w-24 shrink-0">
                        <span className="mb-0.5 block text-right font-mono text-[9px] tabular-nums" style={{ color: tc(wt) }}>{d.workload}%</span>
                        <span className="block h-1 overflow-hidden rounded-full bg-surface-2"><span className="block h-full" style={{ width: `${d.workload}%`, backgroundColor: tc(wt) }} /></span>
                      </span>
                    </button>
                    {open ? (
                      <div className="grid grid-cols-2 gap-1.5 bg-surface-2/40 px-3 py-2 sm:grid-cols-4">
                        {[
                          ['Caseload today', `${d.patientsToday}`],
                          ['Workload', `${d.workload}%`],
                          ['Burnout risk', `${d.burnoutRisk}%`],
                          ['On-call', d.onCall ? 'Yes' : 'No'],
                          ['Specialty', d.specialty],
                          ['Region', d.region],
                          ['Status', d.status],
                          ['Shift load', `${Math.round(waveSeries(`docshift:${id}:${d.id}`, ts, 6, 4, 14).at(-1)!)} pending`],
                        ].map(([l, v]) => (
                          <div key={l} className="rounded-[3px] border border-line-soft bg-surface px-1.5 py-1">
                            <div className="truncate text-[7.5px] uppercase tracking-wider text-ink-muted">{l}</div>
                            <div className="truncate font-mono text-[10px] text-ink-soft">{v}</div>
                          </div>
                        ))}
                      </div>
                    ) : null}
                  </div>
                );
              })}
            </div>
          </Panel>
          <Panel title="Workload intelligence" meta="by specialty" bodyClass="!p-2">
            <div className="space-y-1">
              {wl.specialties.map(s => (
                <div key={s.specialty} className="flex items-center gap-2 text-[10px]">
                  <span className="min-w-0 flex-1 truncate text-ink-soft">{s.specialty}</span>
                  <span className="text-[8px] text-ink-muted">{s.doctors}d</span>
                  <div className="h-1.5 w-16 shrink-0 overflow-hidden rounded-full bg-surface-2"><span className="block h-full" style={{ width: `${s.load}%`, backgroundColor: tc(s.tone) }} /></div>
                  <span className="w-8 shrink-0 text-right font-mono tabular-nums" style={{ color: tc(s.tone) }}>{s.load}</span>
                </div>
              ))}
            </div>
          </Panel>
        </div>
        <div className="grid gap-2 xl:grid-cols-3">
          <Panel title="Patient intake & triage" meta="diagnosis → treatment workflow" bodyClass="!p-0">
            <div className="max-h-[260px] overflow-y-auto">
              {queue.map(p => {
                const tg = p.triage <= 2 ? 'alert' : p.triage === 3 ? 'warn' : 'ok';
                return (
                  <div key={p.id} className="flex items-center gap-2 border-b border-line-soft px-3 py-1.5 last:border-0 text-[10px]">
                    <span className="grid h-4 w-4 shrink-0 place-items-center rounded-[3px] text-[8px] font-bold text-white" style={{ backgroundColor: tc(tg) }}>{p.triage}</span>
                    <span className="min-w-0 flex-1 truncate text-ink-soft">{p.complaint} · {p.age}y</span>
                    <span className="shrink-0 text-[8px] uppercase tracking-wider text-ink-muted">{p.stage}</span>
                    <span className="w-10 shrink-0 text-right font-mono tabular-nums text-ink-muted">{p.waitMin}m</span>
                  </div>
                );
              })}
            </div>
          </Panel>
          <Panel title="Prescriptions & lab requests" meta="issuance · diagnostics" bodyClass="!p-2">
            <div className="mb-1 text-[8px] font-semibold uppercase tracking-[0.16em] text-ink-muted">Prescriptions</div>
            <div className="mb-2 space-y-0.5">
              {rx.map(p => (
                <div key={p.id} className="flex items-center gap-2 text-[10px]">
                  <span className="min-w-0 flex-1 truncate text-ink-soft">{p.drug}</span>
                  <span className="shrink-0 text-[8px] uppercase tracking-wider" style={{ color: p.status === 'flagged' ? TONE.alert : p.status === 'dispensed' ? TONE.ok : TONE.warn }}>{p.status}</span>
                </div>
              ))}
            </div>
            <div className="mb-1 text-[8px] font-semibold uppercase tracking-[0.16em] text-ink-muted">Lab requests</div>
            <div className="space-y-0.5">
              {labs.map(l => (
                <div key={l.id} className="flex items-center gap-2 text-[10px]">
                  <span className="min-w-0 flex-1 truncate text-ink-soft">{l.test}</span>
                  <span className="shrink-0 text-[8px] uppercase text-ink-muted">{l.priority}</span>
                  <span className="shrink-0 text-[8px] uppercase tracking-wider" style={{ color: l.status === 'resulted' ? TONE.ok : TONE.warn }}>{l.status}</span>
                </div>
              ))}
            </div>
          </Panel>
          <Panel title="Referrals & specialist routing" meta="regional medical coordination" bodyClass="!p-0">
            {refs.map(r => (
              <div key={r.id} className="border-b border-line-soft px-3 py-1.5 last:border-0 text-[10px]">
                <div className="flex items-center justify-between gap-2">
                  <span className="truncate text-ink">{r.to}</span>
                  <span className="shrink-0 text-[8px] uppercase tracking-wider" style={{ color: r.urgency === 'emergency' ? TONE.alert : r.urgency === 'urgent' ? TONE.warn : TONE.ok }}>{r.urgency}</span>
                </div>
                <div className="truncate text-[8.5px] text-ink-muted">{r.reason} · from {r.from} · {r.ageHrs}h</div>
              </div>
            ))}
          </Panel>
        </div>
        <RuntimeQueue scope={`${id}:enc`} kind="encounter" title="Clinical encounter runtime — execute the care pathway" by="Attending" />
      </div>
    );
  }

  if (isHealth && group === 'pharma') {
    const P = pharmaceuticalOps(id, ts);
    const pt: 'ok' | 'warn' | 'alert' = P.posture === 'shortage' ? 'alert' : P.posture === 'strained' ? 'warn' : 'ok';
    return (
      <div className="space-y-2">
        {header}
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-6">
          <Stat l="SKUs tracked" v={P.skuTracked.toLocaleString()} t="ok" />
          <Stat l="National days cover" v={`${P.nationalDaysCover}d`} t={P.nationalDaysCover < 21 ? 'alert' : P.nationalDaysCover < 35 ? 'warn' : 'ok'} />
          <Stat l="Critical classes" v={`${P.classesCritical}`} t={P.classesCritical ? 'alert' : 'ok'} />
          <Stat l="Emergency redistrib." v={`${P.emergencyRedistributions}`} t={P.emergencyRedistributions ? 'alert' : 'ok'} />
          <Stat l="Procurement in-flight" v={`${P.procurementInFlight}`} t="ok" />
          <Stat l="Cold-chain integrity" v={`${P.coldChainIntegrityPct}%`} t={P.coldChainIntegrityPct >= 95 ? 'ok' : 'warn'} />
        </div>
        <div className="grid gap-2 xl:grid-cols-2">
          <Panel title="Inventory & stock-exhaustion prediction" meta="class · days cover · ETA stockout" bodyClass="!p-0">
            {P.inventory.map(d => (
              <div key={d.drugClass} className="flex items-center gap-2 border-b border-line-soft px-3 py-2 last:border-0" style={{ borderLeft: `3px solid ${tc(d.tone)}` }}>
                <span className="w-44 shrink-0 truncate text-[11px] text-ink">{d.drugClass}</span>
                <span className="min-w-0 flex-1 truncate text-[9px] text-ink-muted">{d.stockUnits.toLocaleString()}u · burn {d.monthlyBurn.toLocaleString()}/mo</span>
                <span className="w-20 shrink-0 text-right text-[8px] font-bold uppercase tracking-[0.14em]" style={{ color: tc(d.tone) }}>{d.status}</span>
                <span className="w-12 shrink-0 text-right font-mono text-[11px] tabular-nums" style={{ color: tc(d.tone) }}>{d.etaStockoutDays}d</span>
              </div>
            ))}
          </Panel>
          <Panel title="National medicine routing" meta="region · fill rate · redistribution" bodyClass="!p-0">
            {P.regions.map(r => (
              <div key={r.region} className="flex items-center gap-2 border-b border-line-soft px-3 py-2 last:border-0" style={{ borderLeft: `3px solid ${tc(r.tone)}` }}>
                <span className="w-28 shrink-0 truncate text-[11px] text-ink">{r.region}</span>
                <div className="h-1.5 min-w-0 flex-1 overflow-hidden rounded-full bg-surface-2"><span className="block h-full" style={{ width: `${r.fillRatePct}%`, backgroundColor: tc(r.tone) }} /></div>
                <span className="w-10 shrink-0 text-right font-mono text-[10px] tabular-nums text-ink-soft">{r.fillRatePct}%</span>
                <span className="w-32 shrink-0 text-right text-[8px] font-bold uppercase tracking-[0.14em]" style={{ color: tc(r.tone) }}>{r.action}</span>
              </div>
            ))}
          </Panel>
        </div>
        <RuntimeQueue scope={`${id}:pharma`} kind="procurement" title="Pharmaceutical supply runtime — requisition → sourced → contracted → delivered" by="Supply Officer" n={14} />
      </div>
    );
  }

  if (isHealth && group === 'finance') {
    const F = healthFinanceOps(id, ts);
    const pt: 'ok' | 'warn' | 'alert' = F.posture === 'distressed' ? 'alert' : F.posture === 'strained' ? 'warn' : 'ok';
    return (
      <div className="space-y-2">
        {header}
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-6">
          <Stat l="Population covered" v={`${F.coveredPopulationPct}%`} t={F.coveredPopulationPct >= 75 ? 'ok' : 'warn'} />
          <Stat l="Claims backlog" v={F.claimsBacklog.toLocaleString()} t={F.claimsBacklog > 14000 ? 'alert' : F.claimsBacklog > 7000 ? 'warn' : 'ok'} />
          <Stat l="Mean reimbursement" v={`${F.meanReimbursementDays}d`} t={F.meanReimbursementDays >= 38 ? 'alert' : F.meanReimbursementDays >= 24 ? 'warn' : 'ok'} />
          <Stat l="Fraud flags" v={`${F.fraudFlags}`} t={F.fraudFlags > 25 ? 'alert' : F.fraudFlags ? 'warn' : 'ok'} />
          <Stat l="Provider payments due" v={`${F.providerPaymentsDueM}M`} t={F.providerPaymentsDueM > 160 ? 'warn' : 'ok'} />
          <Stat l="Posture" v={F.posture} t={pt} />
        </div>
        <Panel title="Scheme claims pipeline" meta="scheme · submitted → adjudicated → paid · denial · turnaround" bodyClass="!p-0">
          {F.schemes.map(c => (
            <div key={c.scheme} className="flex items-center gap-2 border-b border-line-soft px-3 py-2 last:border-0" style={{ borderLeft: `3px solid ${tc(c.tone)}` }}>
              <span className="w-44 shrink-0 truncate text-[11px] text-ink">{c.scheme}</span>
              <span className="min-w-0 flex-1 truncate text-[9px] text-ink-muted">{c.submitted.toLocaleString()} → {c.adjudicated.toLocaleString()} → {c.paid.toLocaleString()} · {c.denialRatePct}% denied</span>
              <span className="w-12 shrink-0 text-right font-mono text-[11px] tabular-nums" style={{ color: tc(c.tone) }}>{c.turnaroundDays}d</span>
            </div>
          ))}
        </Panel>
        <RuntimeQueue scope={`${id}:finance`} kind="approval" title="Claims adjudication runtime — submitted → reviewed → adjudicated → paid" by="Claims Adjudicator" n={14} />
      </div>
    );
  }

  if (isHealth && group === 'regulatory') {
    const R = healthRegulatoryOps(id, ts);
    const pt: 'ok' | 'warn' | 'alert' = R.posture === 'breach' ? 'alert' : R.posture === 'watch' ? 'warn' : 'ok';
    return (
      <div className="space-y-2">
        {header}
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-6">
          <Stat l="Active licences" v={R.activeLicences.toLocaleString()} t="ok" />
          <Stat l="Accredited facilities" v={`${R.accreditedFacilitiesPct}%`} t={R.accreditedFacilitiesPct >= 80 ? 'ok' : 'warn'} />
          <Stat l="Pending applications" v={R.pendingApplications.toLocaleString()} t={R.pendingApplications > 4000 ? 'warn' : 'ok'} />
          <Stat l="Overdue reviews" v={R.overdueReviews.toLocaleString()} t={R.overdueReviews > 500 ? 'alert' : R.overdueReviews > 200 ? 'warn' : 'ok'} />
          <Stat l="Enforcement actions" v={`${R.enforcementActions}`} t={R.enforcementActions > 30 ? 'alert' : 'warn'} />
          <Stat l="Compliance index" v={`${R.complianceIndex}`} t={pt} />
        </div>
        <Panel title="Regulatory tracks" meta="track · pending → processed · overdue · median" bodyClass="!p-0">
          {R.tracks.map(r => (
            <div key={r.track} className="flex items-center gap-2 border-b border-line-soft px-3 py-2 last:border-0" style={{ borderLeft: `3px solid ${tc(r.tone)}` }}>
              <span className="w-48 shrink-0 truncate text-[11px] text-ink">{r.track}</span>
              <span className="min-w-0 flex-1 truncate text-[9px] text-ink-muted">{r.pending.toLocaleString()} pending · {r.processed.toLocaleString()} processed · {r.overdue} overdue</span>
              <span className="w-12 shrink-0 text-right font-mono text-[11px] tabular-nums" style={{ color: tc(r.tone) }}>{r.medianDays}d</span>
            </div>
          ))}
        </Panel>
        <RuntimeQueue scope={`${id}:regulatory`} kind="permit" title="Licensing & accreditation runtime — applied → reviewed → inspected → granted" by="Regulatory Officer" n={14} />
      </div>
    );
  }

  if (isHealth && group === 'patient') {
    const ps = patientServices(id, ts);
    const rx = prescriptions(id, ts);
    const labs = labRequests(id, ts);
    const refs = referrals(id, ts);
    return (
      <div className="space-y-2">
        {header}
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-6">
          <Stat l="Citizens enrolled" v={`${ps.registeredM}M`} t="ok" />
          <Stat l="Portal uptime" v={`${ps.portalUptime}%`} t={ps.portalUptime >= 99 ? 'ok' : 'warn'} />
          <Stat l="Appointments today" v={ps.appointmentsToday.toLocaleString()} t="ok" />
          <Stat l="Insurance coverage" v={`${ps.insuranceCoverage}%`} t={ps.insuranceCoverage >= 75 ? 'ok' : 'warn'} />
          <Stat l="Claims pending" v={ps.claimsPending.toLocaleString()} t={ps.claimsPending > 3000 ? 'alert' : 'warn'} />
          <Stat l="Treatment adherence" v={`${ps.treatmentTracking.adherencePct}%`} t={ps.treatmentTracking.adherencePct >= 80 ? 'ok' : 'warn'} />
        </div>
        <div className="grid gap-2 xl:grid-cols-3">
          <Panel title="Patient portal — appointments" meta="citizen-facing scheduling" bodyClass="!p-0">
            {ps.appointments.map(a => (
              <div key={a.id} className="flex items-center gap-2 border-b border-line-soft px-3 py-1.5 last:border-0 text-[10px]">
                <span className="w-12 shrink-0 font-mono tabular-nums text-ink-muted">{a.when}</span>
                <span className="min-w-0 flex-1 truncate text-ink-soft">{a.clinic}</span>
                <span className="shrink-0 text-[8px] uppercase tracking-wider" style={{ color: a.status === 'completed' ? TONE.ok : a.status === 'in-queue' ? TONE.warn : 'rgb(var(--c-ink-muted))' }}>{a.status}</span>
              </div>
            ))}
          </Panel>
          <Panel title="Vaccination records" meta="immunisation registry" bodyClass="!p-2">
            <div className="space-y-1">
              {ps.vaccination.map(v => {
                const vt = v.status === 'overdue' ? 'alert' : v.status === 'due' ? 'warn' : 'ok';
                return (
                  <div key={v.vaccine} className="flex items-center gap-2 text-[10px]">
                    <span className="min-w-0 flex-1 truncate text-ink-soft">{v.vaccine}</span>
                    <span className="shrink-0 text-ink-muted">{v.doses}d</span>
                    <span className="shrink-0 text-[8px] uppercase tracking-wider" style={{ color: tc(vt) }}>{v.status}</span>
                  </div>
                );
              })}
            </div>
            <div className="mt-2 text-[9px] text-ink-muted">Linked to disease-intelligence vaccination analytics &amp; pharmaceutical demand.</div>
          </Panel>
          <Panel title="Health alerts & treatment tracking" meta="citizen health continuity" bodyClass="!p-2">
            <div className="space-y-1">
              {ps.alerts.map((al, i) => (
                <div key={i} className="flex items-start gap-1.5 text-[10px]">
                  <span className="mt-0.5 h-1.5 w-1.5 shrink-0 rounded-full" style={{ backgroundColor: al.level === 'urgent' ? TONE.alert : al.level === 'advisory' ? TONE.warn : TONE.ok }} />
                  <span className="min-w-0"><span className="block text-ink">{al.label}</span><span className="block truncate text-[8.5px] text-ink-muted">{al.detail}</span></span>
                </div>
              ))}
            </div>
            <div className="mt-2 rounded-[3px] border border-line-soft bg-surface-2/40 px-2 py-1.5 text-[10px]">
              <span className="text-ink-soft">Active treatment plans</span>
              <span className="ml-2 font-mono tabular-nums" style={{ color: TONE.ok }}>{ps.treatmentTracking.active.toLocaleString()}</span>
              <span className="ml-2 text-ink-muted">adherence {ps.treatmentTracking.adherencePct}%</span>
            </div>
          </Panel>
        </div>
        <div className="grid gap-2 xl:grid-cols-3">
          <Panel title="Prescriptions" meta="issuance · dispensing" bodyClass="!p-0">
            {rx.map(p => (
              <div key={p.id} className="flex items-center gap-2 border-b border-line-soft px-3 py-1.5 last:border-0 text-[10px]">
                <span className="min-w-0 flex-1 truncate text-ink-soft">{p.drug}</span>
                <span className="shrink-0 text-[8px] uppercase tracking-wider" style={{ color: p.status === 'flagged' ? TONE.alert : p.status === 'dispensed' ? TONE.ok : TONE.warn }}>{p.status}</span>
              </div>
            ))}
          </Panel>
          <Panel title="Laboratory results" meta="diagnostics return" bodyClass="!p-0">
            {labs.map(l => (
              <div key={l.id} className="flex items-center gap-2 border-b border-line-soft px-3 py-1.5 last:border-0 text-[10px]">
                <span className="min-w-0 flex-1 truncate text-ink-soft">{l.test}</span>
                <span className="shrink-0 text-[8px] uppercase text-ink-muted">{l.priority}</span>
                <span className="shrink-0 text-[8px] uppercase tracking-wider" style={{ color: l.status === 'resulted' ? TONE.ok : TONE.warn }}>{l.status}</span>
              </div>
            ))}
          </Panel>
          <Panel title="Referrals & specialist routing" meta="continuity of care" bodyClass="!p-0">
            {refs.map(r => (
              <div key={r.id} className="border-b border-line-soft px-3 py-1.5 last:border-0 text-[10px]">
                <div className="flex items-center justify-between gap-2">
                  <span className="truncate text-ink">{r.to}</span>
                  <span className="shrink-0 text-[8px] uppercase tracking-wider" style={{ color: r.urgency === 'emergency' ? TONE.alert : r.urgency === 'urgent' ? TONE.warn : TONE.ok }}>{r.urgency}</span>
                </div>
                <div className="truncate text-[8.5px] text-ink-muted">{r.reason} · from {r.from}</div>
              </div>
            ))}
          </Panel>
        </div>
      </div>
    );
  }

  if (isHealth && group === 'emergency') {
    const E = emergencyMedicalOps(id, ts);
    const pt: 'ok' | 'warn' | 'alert' = E.posture === 'overwhelmed' ? 'alert' : E.posture === 'surged' ? 'warn' : 'ok';
    return (
      <div className="space-y-2">
        {header}
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-6">
          <Stat l="Active incidents" v={`${E.activeIncidents}`} t={E.activeIncidents > 180 ? 'alert' : E.activeIncidents > 110 ? 'warn' : 'ok'} />
          <Stat l="Fleet available" v={`${E.fleetAvailable}/${E.fleetTotal}`} t={E.fleetAvailable < E.fleetTotal * 0.2 ? 'alert' : E.fleetAvailable < E.fleetTotal * 0.35 ? 'warn' : 'ok'} />
          <Stat l="Mean response" v={`${E.meanResponseMin}m`} t={E.meanResponseMin >= 24 ? 'alert' : E.meanResponseMin >= 15 ? 'warn' : 'ok'} />
          <Stat l="Dispatch backlog" v={`${E.dispatchBacklog}`} t={E.dispatchBacklog > 25 ? 'alert' : E.dispatchBacklog > 12 ? 'warn' : 'ok'} />
          <Stat l="Mass-casualty regions" v={`${E.massCasualtyActive}`} t={E.massCasualtyActive ? 'alert' : 'ok'} />
          <Stat l="Posture" v={E.posture} t={pt} />
        </div>
        <div className="grid gap-2 xl:grid-cols-2">
          <Panel title="Incident load by category" meta="type · priority · response" bodyClass="!p-0">
            {E.incidents.map(c => (
              <div key={c.type} className="flex items-center gap-2 border-b border-line-soft px-3 py-2 last:border-0" style={{ borderLeft: `3px solid ${tc(c.tone)}` }}>
                <span className="w-40 shrink-0 truncate text-[11px] text-ink">{c.type}</span>
                <span className="w-8 shrink-0 text-[8px] font-bold uppercase" style={{ color: tc(c.tone) }}>{c.priority}</span>
                <span className="min-w-0 flex-1 truncate text-[9px] text-ink-muted">{c.active} active</span>
                <span className="w-12 shrink-0 text-right font-mono text-[11px] tabular-nums" style={{ color: tc(c.tone) }}>{c.meanResponseMin}m</span>
              </div>
            ))}
          </Panel>
          <Panel title="Regional EMS grid" meta="units · response · escalation" bodyClass="!p-0">
            {E.regions.map(r => (
              <div key={r.region} className="flex items-center gap-2 border-b border-line-soft px-3 py-2 last:border-0" style={{ borderLeft: `3px solid ${tc(r.tone)}` }}>
                <span className="w-28 shrink-0 truncate text-[11px] text-ink">{r.region}</span>
                <span className="min-w-0 flex-1 truncate text-[9px] text-ink-muted">{r.unitsAvailable} avail · {r.unitsCommitted} committed · {r.meanResponseMin}m</span>
                <span className="w-28 shrink-0 text-right text-[8px] font-bold uppercase tracking-[0.14em]" style={{ color: tc(r.tone) }}>{r.posture}</span>
              </div>
            ))}
          </Panel>
        </div>
        <RuntimeQueue scope={`${id}:ems`} kind="incident" title="Emergency medical dispatch runtime — acknowledge → contain → recover" by="EMS Controller" n={14} />
      </div>
    );
  }

  if (isHealth && group === 'command') {
    const C = healthCommand(id, ts);
    const pt: 'ok' | 'warn' | 'alert' = C.posture === 'crisis' ? 'alert' : C.posture === 'engaged' ? 'warn' : 'ok';
    return (
      <div className="space-y-2">
        {header}
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-6">
          <Stat l="Posture index" v={`${C.postureIndex}`} t={pt} />
          <Stat l="Command posture" v={C.posture} t={pt} />
          <Stat l="Critical domains" v={`${C.criticalDomains}`} t={C.criticalDomains ? 'alert' : 'ok'} />
          <Stat l="Open directives" v={`${C.directives.length}`} t={C.directives.some(d => d.priority === 'critical') ? 'alert' : C.directives.length ? 'warn' : 'ok'} />
          <Stat l="Domains in scope" v={`${C.domains.length}`} t="ok" />
          <Stat l="Authority" v="National" t="ok" />
        </div>
        <Panel title="Whole-of-health domain status" meta="emergent from every subsystem engine — no hardcoded figure" bodyClass="!p-0">
          {C.domains.map(d => (
            <div key={d.domain} className="flex items-center gap-2 border-b border-line-soft px-3 py-2 last:border-0" style={{ borderLeft: `3px solid ${tc(d.tone)}` }}>
              <span className="w-44 shrink-0 truncate text-[11px] text-ink">{d.domain}</span>
              <span className="min-w-0 flex-1 truncate text-[9px] text-ink-muted">{d.metric}</span>
              <span className="w-16 shrink-0 text-right font-mono text-[11px] tabular-nums" style={{ color: tc(d.tone) }}>{d.value}</span>
            </div>
          ))}
        </Panel>
        <Panel title="Command directives" meta="ranked · executable across the health federation" bodyClass="!p-2">
          {C.directives.length === 0 ? (
            <p className="text-[11px] text-ink-muted">No outstanding command directives — every health domain within tolerance. The queue is emergent; it is empty because nothing requires command action.</p>
          ) : (
            <div className="space-y-1.5">
              {C.directives.map((d, i) => {
                const dt = d.priority === 'critical' ? 'alert' : d.priority === 'priority' ? 'warn' : 'ok';
                return (
                  <div key={i} className="rounded-[3px] border border-line-soft bg-surface-2/40 px-2.5 py-2" style={{ borderLeft: `3px solid ${tc(dt)}` }}>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-[8.5px] font-bold uppercase tracking-[0.16em]" style={{ color: tc(dt) }}>{d.priority}</span>
                      <span className="text-[11px] font-medium text-ink">{d.title}</span>
                      <a href={`/ministries/${id}/system/${d.target}`} className="ml-auto text-[9px] text-link no-underline hover:underline">→ {d.target}</a>
                    </div>
                    <div className="mt-0.5 text-[9px] text-ink-muted">{d.rationale}</div>
                  </div>
                );
              })}
            </div>
          )}
        </Panel>
        <RuntimeQueue scope={`${id}:command`} kind="incident" title="Health Command runtime — execute national healthcare directives" by="Health Command" n={14} />
      </div>
    );
  }

  if (isHealth && group === 'hospitals') {
    const h = hospitalOps(id, ts);
    return (
      <div className="space-y-2">
        {header}
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-6">
          <Stat l="Bed occupancy" v={`${h.beds.occupancyPct}%`} t={h.beds.occupancyPct >= 92 ? 'alert' : h.beds.occupancyPct >= 82 ? 'warn' : 'ok'} />
          <Stat l="ICU occupancy" v={`${h.icu.occupancyPct}%`} t={h.icu.occupancyPct >= 95 ? 'alert' : h.icu.occupancyPct >= 85 ? 'warn' : 'ok'} />
          <Stat l="Ventilators in use" v={`${h.icu.ventInUse}/${h.icu.ventilators}`} t={h.icu.ventInUse / h.icu.ventilators >= 0.9 ? 'alert' : 'warn'} />
          <Stat l="Theatre utilisation" v={`${h.theatres.utilisationPct}%`} t={h.theatres.utilisationPct >= 92 ? 'warn' : 'ok'} />
          <Stat l="Ambulance response" v={`${h.ambulances.meanResponseMin}m`} t={h.ambulances.meanResponseMin >= 18 ? 'alert' : h.ambulances.meanResponseMin >= 12 ? 'warn' : 'ok'} />
          <Stat l="Mortality index" v={`${h.mortalityIndex}`} t={h.mortalityIndex >= 16 ? 'alert' : h.mortalityIndex >= 11 ? 'warn' : 'ok'} />
        </div>
        <div className="grid gap-2 xl:grid-cols-3">
          <Panel title="Bed & ICU management" meta="capacity · load balancing" bodyClass="!p-2">
            {[
              { l: 'General beds', occ: h.beds.occupied, tot: h.beds.total, pct: h.beds.occupancyPct },
              { l: 'ICU beds', occ: h.icu.occupied, tot: h.icu.beds, pct: h.icu.occupancyPct },
              { l: 'Ventilators', occ: h.icu.ventInUse, tot: h.icu.ventilators, pct: Math.round(h.icu.ventInUse / h.icu.ventilators * 100) },
            ].map(b => {
              const bt = b.pct >= 92 ? 'alert' : b.pct >= 82 ? 'warn' : 'ok';
              return (
                <div key={b.l} className="mb-2">
                  <div className="flex justify-between text-[10px]"><span className="text-ink-soft">{b.l}</span><span className="font-mono tabular-nums" style={{ color: tc(bt) }}>{b.occ}/{b.tot} · {b.pct}%</span></div>
                  <div className="mt-0.5 h-1.5 overflow-hidden rounded-full bg-surface-2"><span className="block h-full" style={{ width: `${b.pct}%`, backgroundColor: tc(bt) }} /></div>
                </div>
              );
            })}
            <div className="mt-1 text-[9px]" style={{ color: tc(h.loadBalanceTone) }}>
              Load-balance posture: {h.loadBalanceTone === 'alert' ? 'SATURATED — divert to regional capacity' : h.loadBalanceTone === 'warn' ? 'STRAINED — monitor surge' : 'NOMINAL'}
            </div>
          </Panel>
          <Panel title="Operating theatres & emergency intake" meta="scheduling · throughput" bodyClass="!p-2">
            <div className="grid grid-cols-2 gap-2">
              <Stat l="Theatres active" v={`${h.theatres.active}/${h.theatres.total}`} t="ok" />
              <Stat l="Scheduled today" v={`${h.theatres.scheduledToday}`} />
              <Stat l="Ambulances available" v={`${h.ambulances.available}/${h.ambulances.fleet}`} t={h.ambulances.available < h.ambulances.fleet * 0.2 ? 'alert' : 'ok'} />
              <Stat l="Dispatched" v={`${h.ambulances.dispatched}`} t="warn" />
            </div>
            <div className="mt-2 h-7 overflow-hidden opacity-80"><Spark pts={waveSeries(`hosp:intake:${id}`, ts, 24, 30, 92)} tone={h.loadBalanceTone} /></div>
          </Panel>
          <Panel title="Staffing & mortality intelligence" meta="clinical analytics" bodyClass="!p-2">
            <div className="mb-2"><div className="flex justify-between text-[10px]"><span className="text-ink-soft">Staffing level</span><span className="font-mono tabular-nums" style={{ color: tc(h.staffingPct >= 80 ? 'ok' : 'warn') }}>{h.staffingPct}%</span></div>
              <div className="mt-0.5 h-1.5 overflow-hidden rounded-full bg-surface-2"><span className="block h-full" style={{ width: `${h.staffingPct}%`, backgroundColor: tc(h.staffingPct >= 80 ? 'ok' : 'warn') }} /></div></div>
            <div className="text-[10px] text-ink-soft">Mortality index <span className="font-mono" style={{ color: tc(h.mortalityIndex >= 16 ? 'alert' : 'warn') }}>{h.mortalityIndex}</span> / 1000 admissions</div>
            <div className="mt-2 h-7 overflow-hidden opacity-80"><Spark pts={waveSeries(`hosp:mort:${id}`, ts, 24, 20, 70)} tone={h.mortalityIndex >= 16 ? 'alert' : 'warn'} /></div>
          </Panel>
        </div>
        <RuntimeQueue scope={`${id}:ems`} kind="incident" title="Emergency medical dispatch runtime — acknowledge → contain → recover" by="EMS Controller" n={14} />
      </div>
    );
  }

  if (isHealth && group === 'lab') {
    const L = laboratoryOps(id, ts);
    const pt: 'ok' | 'warn' | 'alert' = L.posture === 'overloaded' ? 'alert' : L.posture === 'strained' ? 'warn' : 'ok';
    return (
      <div className="space-y-2">
        {header}
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-6">
          <Stat l="Specimens today" v={L.specimensToday.toLocaleString()} t="ok" />
          <Stat l="Accessioned" v={L.accessioned.toLocaleString()} t="ok" />
          <Stat l="Backlog" v={L.backlog.toLocaleString()} t={L.backlog > 900 ? 'alert' : L.backlog > 500 ? 'warn' : 'ok'} />
          <Stat l="Critical results" v={`${L.criticalResults}`} t={L.criticalResults ? 'alert' : 'ok'} />
          <Stat l="Mean turnaround" v={`${L.meanTurnaroundHrs}h`} t={L.meanTurnaroundHrs >= 34 ? 'alert' : L.meanTurnaroundHrs >= 22 ? 'warn' : 'ok'} />
          <Stat l="Rejection rate" v={`${L.rejectionRatePct}%`} t={L.rejectionRatePct >= 6 ? 'warn' : 'ok'} />
        </div>
        <div className="grid gap-2 xl:grid-cols-2">
          <Panel title="Diagnostic pipeline" meta="assay · pending · in-assay · turnaround" bodyClass="!p-0">
            {L.assays.map(a => (
              <div key={a.assay} className="flex items-center gap-2 border-b border-line-soft px-3 py-2 last:border-0" style={{ borderLeft: `3px solid ${tc(a.tone)}` }}>
                <span className="w-40 shrink-0 truncate text-[11px] text-ink">{a.assay}</span>
                <span className="min-w-0 flex-1 truncate text-[9px] text-ink-muted">{a.pending} pending · {a.inProcess} in assay</span>
                <span className="w-14 shrink-0 text-right font-mono text-[11px] tabular-nums" style={{ color: tc(a.tone) }}>{a.turnaroundHrs}h</span>
              </div>
            ))}
          </Panel>
          <Panel title="Regional lab network" meta="capacity · backlog · escalation" bodyClass="!p-0">
            {L.regions.map(r => (
              <div key={r.region} className="flex items-center gap-2 border-b border-line-soft px-3 py-2 last:border-0" style={{ borderLeft: `3px solid ${tc(r.tone)}` }}>
                <span className="w-28 shrink-0 truncate text-[11px] text-ink">{r.region}</span>
                <div className="h-1.5 min-w-0 flex-1 overflow-hidden rounded-full bg-surface-2"><span className="block h-full" style={{ width: `${r.capacityPct}%`, backgroundColor: tc(r.tone) }} /></div>
                <span className="w-10 shrink-0 text-right font-mono text-[10px] tabular-nums text-ink-soft">{r.capacityPct}%</span>
                <span className="w-16 shrink-0 text-right text-[8px] font-bold uppercase tracking-[0.14em]" style={{ color: tc(r.tone) }}>{r.escalation}</span>
              </div>
            ))}
          </Panel>
        </div>
        <RuntimeQueue scope={`${id}:lab`} kind="lab" title="Specimen runtime — received → accessioned → in assay → verified → reported" by="Lab Scientist" n={14} />
      </div>
    );
  }

  if (isHealth && group === 'disease') {
    const d = diseaseIntel(id, ts);
    return (
      <div className="space-y-2">
        {header}
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-6">
          <Stat l="National Rt" v={`${d.nationalRt}`} t={d.nationalRt > 1.3 ? 'alert' : d.nationalRt > 1.0 ? 'warn' : 'ok'} />
          <Stat l="Active cases" v={`${d.activeCases.toLocaleString()}`} t={d.activeCases > 4000 ? 'alert' : 'warn'} />
          <Stat l="Mortality (7d)" v={`${d.mortality7d}`} t={d.mortality7d > 200 ? 'alert' : 'warn'} />
          <Stat l="Vaccination coverage" v={`${d.vaccinationCoverage}%`} t={d.vaccinationCoverage >= 80 ? 'ok' : 'warn'} />
          <Stat l="Worst region" v={d.worstRegion} t="alert" />
          <Stat l="Outbreak cells" v={`${d.outbreaks.filter(o => o.severity !== 'contained').length}`} t="warn" />
        </div>
        <div className="grid gap-2 xl:grid-cols-2">
          <Panel title="Outbreak heatmap" meta="region · Rt · propagation" bodyClass="!p-0">
            {d.outbreaks.map(o => {
              const ot = o.severity === 'critical' ? 'alert' : o.severity === 'active' ? 'warn' : 'ok';
              return (
                <div key={o.region} className="flex items-center gap-2 border-b border-line-soft px-3 py-2 last:border-0" style={{ borderLeft: `3px solid ${tc(ot)}` }}>
                  <span className="w-28 shrink-0 truncate text-[11px] text-ink">{o.region}</span>
                  <span className="min-w-0 flex-1 truncate text-[9px] text-ink-muted">{o.disease} · {o.trend}</span>
                  <span className="w-16 shrink-0 text-right font-mono text-[10px] tabular-nums text-ink-soft">{o.cases.toLocaleString()}</span>
                  <span className="w-12 shrink-0 text-right font-mono text-[11px] tabular-nums" style={{ color: tc(ot) }}>Rt {o.rt}</span>
                </div>
              );
            })}
          </Panel>
          <Panel title="Predictive epidemiology" meta="projected case trajectory" bodyClass="!p-2">
            <div className="space-y-1">
              {d.forecast.map(f => {
                const grow = f.projectedCases > d.activeCases;
                return (
                  <div key={f.tPlusDays} className="flex items-center gap-2 rounded-[3px] border border-line-soft bg-surface-2/40 px-2 py-1.5 text-[11px]">
                    <span className="w-16 shrink-0 text-ink-muted">T+{f.tPlusDays}d</span>
                    <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-surface-2"><span className="block h-full" style={{ width: `${Math.min(100, (f.projectedCases / (d.activeCases * 3)) * 100)}%`, backgroundColor: grow ? TONE.alert : TONE.ok }} /></div>
                    <span className="w-20 shrink-0 text-right font-mono tabular-nums" style={{ color: grow ? TONE.alert : TONE.ok }}>{f.projectedCases.toLocaleString()}</span>
                  </div>
                );
              })}
            </div>
            <p className="mt-2 text-[9px] text-ink-muted">Projection compounds national Rt over the demographic spread; feeds national resilience &amp; pharmaceutical demand.</p>
          </Panel>
        </div>
      </div>
    );
  }

  // ── TREASURY operational worlds ──────────────────────────────────────
  if (isFinance && group === 'command') {
    const C = treasuryCommand(id, ts);
    const pt: 'ok' | 'warn' | 'alert' = C.posture === 'crisis' ? 'alert' : C.posture === 'engaged' ? 'warn' : 'ok';
    return (
      <div className="space-y-2">
        {header}
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-6">
          <Stat l="Posture index" v={`${C.postureIndex}`} t={pt} />
          <Stat l="Command posture" v={C.posture} t={pt} />
          <Stat l="Critical domains" v={`${C.criticalDomains}`} t={C.criticalDomains ? 'alert' : 'ok'} />
          <Stat l="Open directives" v={`${C.directives.length}`} t={C.directives.some(d => d.priority === 'critical') ? 'alert' : C.directives.length ? 'warn' : 'ok'} />
          <Stat l="Domains in scope" v={`${C.domains.length}`} t="ok" />
          <Stat l="Authority" v="Sovereign fiscal" t="ok" />
        </div>
        <Panel title="Whole-of-treasury domain status" meta="emergent from fiscal/revenue/budget/procurement/assurance engines" bodyClass="!p-0">
          {C.domains.map(d => (
            <div key={d.domain} className="flex items-center gap-2 border-b border-line-soft px-3 py-2 last:border-0" style={{ borderLeft: `3px solid ${tc(d.tone)}` }}>
              <span className="w-44 shrink-0 truncate text-[11px] text-ink">{d.domain}</span>
              <span className="min-w-0 flex-1 truncate text-[9px] text-ink-muted">{d.metric}</span>
              <span className="w-14 shrink-0 text-right font-mono text-[11px] tabular-nums" style={{ color: tc(d.tone) }}>{d.value}</span>
            </div>
          ))}
        </Panel>
        <Panel title="Command directives" meta="ranked · executable across the fiscal federation" bodyClass="!p-2">
          {C.directives.length === 0 ? (
            <p className="text-[11px] text-ink-muted">No outstanding command directives — fiscal posture within tolerance.</p>
          ) : (
            <div className="space-y-1.5">
              {C.directives.map((d, i) => {
                const dt = d.priority === 'critical' ? 'alert' : d.priority === 'priority' ? 'warn' : 'ok';
                return (
                  <div key={i} className="rounded-[3px] border border-line-soft bg-surface-2/40 px-2.5 py-2" style={{ borderLeft: `3px solid ${tc(dt)}` }}>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-[8.5px] font-bold uppercase tracking-[0.16em]" style={{ color: tc(dt) }}>{d.priority}</span>
                      <span className="text-[11px] font-medium text-ink">{d.title}</span>
                      <a href={`/ministries/${id}/system/${d.target}`} className="ml-auto text-[9px] text-link no-underline hover:underline">→ {d.target}</a>
                    </div>
                    <div className="mt-0.5 text-[9px] text-ink-muted">{d.rationale}</div>
                  </div>
                );
              })}
            </div>
          )}
        </Panel>
        <RuntimeQueue scope={`${id}:command`} kind="incident" title="Treasury Command runtime — execute sovereign fiscal directives" by="Treasury Command" n={14} />
      </div>
    );
  }

  if (isFinance && (group === 'command' || group === 'rails')) {
    const fc = fiscalCommand(id, ts);
    const br = bankingRails(id, ts);
    return (
      <div className="space-y-2">
        {header}
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-6">
          <Stat l="Liquidity runway" v={`${fc.liquidityDays}d`} t={fc.liquidityDays >= 30 ? 'ok' : fc.liquidityDays >= 14 ? 'warn' : 'alert'} />
          <Stat l="Debt / GDP" v={`${fc.debtToGdp}%`} t={fc.debtToGdp >= 65 ? 'alert' : fc.debtToGdp >= 50 ? 'warn' : 'ok'} />
          <Stat l="Primary balance" v={`${fc.primaryBalancePct}%`} t={fc.primaryBalancePct < 0 ? 'warn' : 'ok'} />
          <Stat l="FX reserves" v={`$${fc.fxReservesBn}B`} t={fc.fxReservesBn >= 30 ? 'ok' : 'warn'} />
          <Stat l="Macro stability" v={`${fc.macroStability}`} t={fc.tone} />
          <Stat l="TSA balance" v={`$${br.tsaBalanceBn}B`} t={br.tsaBalanceBn >= 12 ? 'ok' : 'warn'} />
        </div>
        <div className="grid gap-2 xl:grid-cols-2">
          <Panel title="Banking rails" meta="disbursement · settlement · reconciliation" bodyClass="!p-2">
            <div className="grid grid-cols-2 gap-2">
              <Stat l="Channels online" v={`${br.channelsOnline}/${br.channelsTotal}`} t={br.channelsOnline === br.channelsTotal ? 'ok' : 'alert'} />
              <Stat l="Settlement latency" v={`${br.settlementLatencyMin}m`} t={br.settlementLatencyMin >= 25 ? 'alert' : br.settlementLatencyMin >= 12 ? 'warn' : 'ok'} />
              <Stat l="Reconciled" v={`${br.reconciledPct}%`} t={br.reconciledPct >= 98 ? 'ok' : 'warn'} />
              <Stat l="Failed settlements" v={`${br.failedSettlements}`} t={br.failedSettlements ? 'alert' : 'ok'} />
            </div>
            <div className="mt-2 h-7 overflow-hidden opacity-80"><Spark pts={waveSeries(`trz:rails:${id}`, ts, 24, 30, 92)} tone={br.failedSettlements ? 'alert' : 'ok'} /></div>
          </Panel>
          <Panel title="Fiscal stability monitor" meta="macro posture" bodyClass="!p-2">
            <div className="mb-1 flex justify-between text-[10px]"><span className="text-ink-soft">Macro stability</span><span className="font-mono tabular-nums" style={{ color: tc(fc.tone) }}>{fc.macroStability}</span></div>
            <div className="h-1.5 overflow-hidden rounded-full bg-surface-2"><span className="block h-full" style={{ width: `${fc.macroStability}%`, backgroundColor: tc(fc.tone) }} /></div>
            <p className="mt-2 text-[9px] text-ink-muted">Treasury instability propagates to procurement, healthcare, infrastructure, education and transport readiness via the state fabric.</p>
            <div className="mt-2 h-7 overflow-hidden opacity-80"><Spark pts={waveSeries(`trz:macro:${id}`, ts, 24, 35, 92)} tone={fc.tone} /></div>
          </Panel>
        </div>
      </div>
    );
  }

  if (isFinance && (group === 'revenue' || group === 'budget')) {
    const rv = revenueOps(id, ts);
    const bg = budgetOps(id, ts);
    return (
      <div className="space-y-2">
        {header}
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-6">
          <Stat l="Collection rate" v={`${rv.collectionRatePct}%`} t={rv.collectionRatePct >= 85 ? 'ok' : rv.collectionRatePct >= 72 ? 'warn' : 'alert'} />
          <Stat l="Customs throughput" v={`${rv.customsThroughputPct}%`} t={rv.customsThroughputPct >= 80 ? 'ok' : 'warn'} />
          <Stat l="Taxpayers" v={`${rv.taxpayersM}M`} t="ok" />
          <Stat l="Arrears" v={`$${rv.arrearsBn}B`} t={rv.arrearsBn >= 24 ? 'alert' : 'warn'} />
          <Stat l="Budget execution" v={`${bg.executionPct}%`} t={bg.executionPct >= 80 ? 'ok' : bg.executionPct >= 60 ? 'warn' : 'alert'} />
          <Stat l="Blocked allocations" v={`${bg.blockedAllocations}`} t={bg.blockedAllocations ? 'alert' : 'ok'} />
        </div>
        <div className="grid gap-2 xl:grid-cols-2">
          <Panel title="Revenue streams" meta="taxation · customs · collection" bodyClass="!p-2">
            <div className="space-y-1">
              {rv.byStream.map(s => (
                <div key={s.stream} className="flex items-center gap-2 text-[10px]">
                  <span className="min-w-0 flex-1 truncate text-ink-soft">{s.stream}</span>
                  <div className="h-1.5 w-20 shrink-0 overflow-hidden rounded-full bg-surface-2"><span className="block h-full" style={{ width: `${s.pct}%`, backgroundColor: tc(s.tone) }} /></div>
                  <span className="w-8 shrink-0 text-right font-mono tabular-nums" style={{ color: tc(s.tone) }}>{s.pct}</span>
                </div>
              ))}
            </div>
          </Panel>
          <Panel title="Budget execution by ministry" meta="appropriation → spend" bodyClass="!p-2">
            <div className="space-y-1">
              {bg.byMinistry.map(b => {
                const open = selRow === b.ministry;
                return (
                  <div key={b.ministry}>
                    <button onClick={() => setSelRow(open ? null : b.ministry)} className="focus-ring flex w-full items-center gap-2 text-left text-[10px]">
                      <span className="w-20 shrink-0 truncate text-ink-soft">{open ? '▾ ' : '▸ '}{b.ministry}</span>
                      <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-surface-2"><span className="block h-full" style={{ width: `${b.execPct}%`, backgroundColor: tc(b.tone) }} /></div>
                      <span className="w-8 shrink-0 text-right font-mono tabular-nums" style={{ color: tc(b.tone) }}>{b.execPct}</span>
                    </button>
                    {open ? (
                      <div className="mt-0.5 mb-1 grid grid-cols-3 gap-1">
                        {['Recurrent', 'Development', 'Personnel'].map((k, ki) => {
                          const v = Math.round(waveSeries(`bgalloc:${id}:${b.ministry}:${k}`, ts, 6, 40, 99).at(-1)!);
                          return (
                            <div key={k} className="rounded-[3px] border border-line-soft bg-surface px-1.5 py-1">
                              <div className="truncate text-[7px] uppercase tracking-wider text-ink-muted">{k}</div>
                              <div className="font-mono text-[10px] tabular-nums" style={{ color: tc(v >= 80 ? 'ok' : v >= 60 ? 'warn' : 'alert') }}>{v}% · ${(2 + ki + (v % 9)).toFixed(1)}B</div>
                            </div>
                          );
                        })}
                      </div>
                    ) : null}
                  </div>
                );
              })}
            </div>
            <p className="mt-2 text-[9px] text-ink-muted">{bg.virements} virements processed · legislative blockage freezes appropriation.</p>
          </Panel>
        </div>
      </div>
    );
  }

  if (isFinance && (group === 'procurement' || group === 'citizen' || group === 'audit')) {
    const pc = procurementOps(id, ts);
    const cf = citizenFinance(id, ts);
    const fa = fiscalAssurance(id, ts);
    return (
      <div className="space-y-2">
        {header}
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-6">
          <Stat l="Active tenders" v={`${pc.activeTenders}`} t="ok" />
          <Stat l="Procurement integrity" v={`${pc.integrityPct}%`} t={pc.integrityPct >= 90 ? 'ok' : 'warn'} />
          <Stat l="Disbursement latency" v={`${pc.disbursementLatencyDays}d`} t={pc.disbursementLatencyDays >= 28 ? 'alert' : pc.disbursementLatencyDays >= 14 ? 'warn' : 'ok'} />
          <Stat l="Flagged contracts" v={`${pc.flaggedContracts}`} t={pc.flaggedContracts ? 'alert' : 'ok'} />
          <Stat l="Citizen payments/day" v={`${cf.paymentsTodayM}M`} t="ok" />
          <Stat l="Audit chain" v={`${fa.chainIntactPct}%`} t={fa.chainIntactPct >= 99.5 ? 'ok' : 'warn'} />
        </div>
        <div className="grid gap-2 xl:grid-cols-3">
          <Panel title="Procurement pipeline" meta="solicitation → disbursement" bodyClass="!p-2">
            <div className="space-y-1">
              {pc.pipeline.map(s => (
                <div key={s.stage} className="flex items-center gap-2 text-[10px]">
                  <span className="w-24 shrink-0 truncate text-ink-soft">{s.stage}</span>
                  <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-surface-2"><span className="block h-full" style={{ width: `${Math.min(100, s.count)}%`, backgroundColor: TONE.warn }} /></div>
                  <span className="w-8 shrink-0 text-right font-mono tabular-nums text-ink-muted">{s.count}</span>
                </div>
              ))}
            </div>
          </Panel>
          <Panel title="Citizen finance" meta="taxpayer portal · payments" bodyClass="!p-2">
            <div className="grid grid-cols-2 gap-2">
              <Stat l="Portal uptime" v={`${cf.portalUptime}%`} t={cf.portalUptime >= 99 ? 'ok' : 'warn'} />
              <Stat l="Refunds pending" v={cf.refundsPending.toLocaleString()} t={cf.refundsPending > 3000 ? 'alert' : 'warn'} />
              <Stat l="Satisfaction" v={`${cf.satisfactionPct}%`} t={cf.satisfactionPct >= 75 ? 'ok' : 'warn'} />
              <Stat l="Payments/day" v={`${cf.paymentsTodayM}M`} t="ok" />
            </div>
          </Panel>
          <Panel title="Fiscal assurance" meta="anti-fraud · regional risk" bodyClass="!p-2">
            <div className="mb-1 text-[10px] text-ink-soft">Open findings <span className="font-mono" style={{ color: TONE.warn }}>{fa.openFindings}</span> · fraud signals <span className="font-mono" style={{ color: fa.fraudSignals ? TONE.alert : TONE.ok }}>{fa.fraudSignals}</span></div>
            <div className="space-y-0.5">
              {fa.regionalRisk.map(r => (
                <div key={r.region} className="flex items-center gap-2 text-[10px]">
                  <span className="min-w-0 flex-1 truncate text-ink-soft">{r.region}</span>
                  <span className="w-8 shrink-0 text-right font-mono tabular-nums" style={{ color: tc(r.tone) }}>{r.risk}</span>
                </div>
              ))}
            </div>
          </Panel>
        </div>
      </div>
    );
  }

  if (isEdu && group === 'command') {
    const C = educationCommand(id, ts);
    const pt: 'ok' | 'warn' | 'alert' = C.posture === 'crisis' ? 'alert' : C.posture === 'engaged' ? 'warn' : 'ok';
    return (
      <div className="space-y-2">
        {header}
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-6">
          <Stat l="Posture index" v={`${C.postureIndex}`} t={pt} />
          <Stat l="Command posture" v={C.posture} t={pt} />
          <Stat l="Critical domains" v={`${C.criticalDomains}`} t={C.criticalDomains ? 'alert' : 'ok'} />
          <Stat l="Open directives" v={`${C.directives.length}`} t={C.directives.some(d => d.priority === 'critical') ? 'alert' : C.directives.length ? 'warn' : 'ok'} />
          <Stat l="Domains in scope" v={`${C.domains.length}`} t="ok" />
          <Stat l="Authority" v="National" t="ok" />
        </div>
        <Panel title="Whole-of-education domain status" meta="emergent from every subsystem engine" bodyClass="!p-0">
          {C.domains.map(d => (
            <div key={d.domain} className="flex items-center gap-2 border-b border-line-soft px-3 py-2 last:border-0" style={{ borderLeft: `3px solid ${tc(d.tone)}` }}>
              <span className="w-44 shrink-0 truncate text-[11px] text-ink">{d.domain}</span>
              <span className="min-w-0 flex-1 truncate text-[9px] text-ink-muted">{d.metric}</span>
              <span className="w-16 shrink-0 text-right font-mono text-[11px] tabular-nums" style={{ color: tc(d.tone) }}>{d.value}</span>
            </div>
          ))}
        </Panel>
        <Panel title="Command directives" meta="ranked · executable across the education federation" bodyClass="!p-2">
          {C.directives.length === 0 ? (
            <p className="text-[11px] text-ink-muted">No outstanding command directives — every education domain within tolerance.</p>
          ) : (
            <div className="space-y-1.5">
              {C.directives.map((d, i) => {
                const dt = d.priority === 'critical' ? 'alert' : d.priority === 'priority' ? 'warn' : 'ok';
                return (
                  <div key={i} className="rounded-[3px] border border-line-soft bg-surface-2/40 px-2.5 py-2" style={{ borderLeft: `3px solid ${tc(dt)}` }}>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-[8.5px] font-bold uppercase tracking-[0.16em]" style={{ color: tc(dt) }}>{d.priority}</span>
                      <span className="text-[11px] font-medium text-ink">{d.title}</span>
                      <a href={`/ministries/${id}/system/${d.target}`} className="ml-auto text-[9px] text-link no-underline hover:underline">→ {d.target}</a>
                    </div>
                    <div className="mt-0.5 text-[9px] text-ink-muted">{d.rationale}</div>
                  </div>
                );
              })}
            </div>
          )}
        </Panel>
        <RuntimeQueue scope={`${id}:command`} kind="incident" title="Education Command runtime — execute national education directives" by="Education Command" n={14} />
      </div>
    );
  }

  if (isEdu && group === 'higher') {
    const H = higherEducation(id, ts);
    const pt: 'ok' | 'warn' | 'alert' = H.posture === 'underfunded' ? 'alert' : H.posture === 'pressured' ? 'warn' : 'ok';
    return (
      <div className="space-y-2">
        {header}
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-6">
          <Stat l="Institutions" v={`${H.institutions}`} t="ok" />
          <Stat l="Enrolment" v={`${H.enrolmentK}k`} t="ok" />
          <Stat l="Graduation rate" v={`${H.graduationRatePct}%`} t={H.graduationRatePct >= 70 ? 'ok' : 'warn'} />
          <Stat l="Research output" v={`${H.researchOutputIndex}`} t={H.researchOutputIndex >= 60 ? 'ok' : 'warn'} />
          <Stat l="Funding gap" v={`${H.fundingGapPct}%`} t={H.fundingGapPct >= 25 ? 'alert' : H.fundingGapPct >= 14 ? 'warn' : 'ok'} />
          <Stat l="Posture" v={H.posture} t={pt} />
        </div>
        <Panel title="Institution tiers" meta="tier · institutions · utilisation" bodyClass="!p-0">
          {H.tiers.map(x => (
            <div key={x.tier} className="flex items-center gap-2 border-b border-line-soft px-3 py-2 last:border-0" style={{ borderLeft: `3px solid ${tc(x.tone)}` }}>
              <span className="w-48 shrink-0 truncate text-[11px] text-ink">{x.tier}</span>
              <span className="min-w-0 flex-1 truncate text-[9px] text-ink-muted">{x.institutions} institutions</span>
              <div className="h-1.5 w-24 shrink-0 overflow-hidden rounded-full bg-surface-2"><span className="block h-full" style={{ width: `${Math.min(100, x.utilisationPct)}%`, backgroundColor: tc(x.tone) }} /></div>
              <span className="w-10 shrink-0 text-right font-mono text-[10px] tabular-nums" style={{ color: tc(x.tone) }}>{x.utilisationPct}%</span>
            </div>
          ))}
        </Panel>
        <RuntimeQueue scope={`${id}:higher`} kind="approval" title="Higher-education runtime — accreditation & funding workflow" by="Tertiary Officer" n={14} />
      </div>
    );
  }

  if (isEdu && group === 'exams') {
    const ex = examOps(id, ts);
    return (
      <div className="space-y-2">
        {header}
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-6">
          <Stat l="Candidates" v={ex.candidates.toLocaleString()} t="ok" />
          <Stat l="Results pending" v={ex.resultsPending.toLocaleString()} t={ex.resultsPending > 30000 ? 'warn' : 'ok'} />
          <Stat l="Integrity flags" v={`${ex.integrityFlags}`} t={ex.integrityFlags >= 12 ? 'alert' : ex.integrityFlags ? 'warn' : 'ok'} />
          <Stat l="Pipeline stages" v={`${ex.pipeline.length}`} t="ok" />
        </div>
        <Panel title="Examination pipeline" meta="registration → marking → release" bodyClass="!p-2">
          <div className="space-y-1">
            {ex.pipeline.map(s => (
              <div key={s.stage} className="flex items-center gap-2 text-[10px]">
                <span className="w-32 shrink-0 truncate text-ink-soft">{s.stage}</span>
                <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-surface-2"><span className="block h-full" style={{ width: `${Math.min(100, s.count)}%`, backgroundColor: TONE.warn }} /></div>
                <span className="w-8 shrink-0 text-right font-mono tabular-nums text-ink-muted">{s.count}</span>
              </div>
            ))}
          </div>
        </Panel>
        <RuntimeQueue scope={`${id}:exams`} kind="case" title="Examinations runtime — registration → invigilation → marking → release" by="Exams Officer" n={14} />
      </div>
    );
  }

  if (isEdu && group === 'curriculum') {
    const Cu = curriculumOps(id, ts);
    const pt: 'ok' | 'warn' | 'alert' = Cu.posture === 'obsolete' ? 'alert' : Cu.posture === 'lagging' ? 'warn' : 'ok';
    return (
      <div className="space-y-2">
        {header}
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-6">
          <Stat l="Frameworks" v={`${Cu.frameworks}`} t="ok" />
          <Stat l="Revision cycle" v={`${Cu.revisionCyclePct}%`} t={Cu.revisionCyclePct >= 80 ? 'ok' : 'warn'} />
          <Stat l="Textbook coverage" v={`${Cu.textbookCoveragePct}%`} t={Cu.textbookCoveragePct >= 85 ? 'ok' : 'warn'} />
          <Stat l="Digital adoption" v={`${Cu.digitalAdoptionPct}%`} t={Cu.digitalAdoptionPct >= 60 ? 'ok' : 'warn'} />
          <Stat l="Outdated frameworks" v={`${Cu.outdatedFrameworks}`} t={Cu.outdatedFrameworks ? 'alert' : 'ok'} />
          <Stat l="Posture" v={Cu.posture} t={pt} />
        </div>
        <Panel title="Subject frameworks" meta="subject · coverage · last revised" bodyClass="!p-0">
          {Cu.subjects.map(s => (
            <div key={s.subject} className="flex items-center gap-2 border-b border-line-soft px-3 py-2 last:border-0" style={{ borderLeft: `3px solid ${tc(s.tone)}` }}>
              <span className="w-40 shrink-0 truncate text-[11px] text-ink">{s.subject}</span>
              <div className="h-1.5 min-w-0 flex-1 overflow-hidden rounded-full bg-surface-2"><span className="block h-full" style={{ width: `${s.coveragePct}%`, backgroundColor: tc(s.tone) }} /></div>
              <span className="w-10 shrink-0 text-right font-mono text-[10px] tabular-nums text-ink-soft">{s.coveragePct}%</span>
              <span className="w-20 shrink-0 text-right text-[8px] uppercase tracking-[0.14em]" style={{ color: tc(s.tone) }}>{s.lastRevisedYrs}y ago</span>
            </div>
          ))}
        </Panel>
        <RuntimeQueue scope={`${id}:curriculum`} kind="case" title="Curriculum runtime — draft → review → pilot → ratify" by="Curriculum Officer" n={14} />
      </div>
    );
  }

  if (isEdu && group === 'teacher') {
    const tch = teacherOps(id, ts);
    return (
      <div className="space-y-2">
        {header}
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-6">
          <Stat l="Teachers" v={tch.teachers.toLocaleString()} t="ok" />
          <Stat l="Vacancies" v={`${tch.vacanciesPct}%`} t={tch.vacanciesPct >= 15 ? 'alert' : tch.vacanciesPct >= 8 ? 'warn' : 'ok'} />
          <Stat l="Postings pending" v={tch.postingsPending.toLocaleString()} t={tch.postingsPending > 1500 ? 'warn' : 'ok'} />
          <Stat l="Payroll on-time" v={`${tch.payrollOnTimePct}%`} t={tch.payrollOnTimePct >= 95 ? 'ok' : 'warn'} />
          <Stat l="Training active" v={tch.trainingActive.toLocaleString()} t="ok" />
        </div>
        <RuntimeQueue scope={`${id}:teacher`} kind="approval" title="Teacher workforce runtime — posting → vetting → deployment → payroll" by="HR Officer" n={14} />
      </div>
    );
  }

  if (isEdu && group === 'student') {
    const ss = studentServices(id, ts);
    return (
      <div className="space-y-2">
        {header}
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-6">
          <Stat l="Learner records" v={`${ss.learnerRecordsM}M`} t="ok" />
          <Stat l="Portal uptime" v={`${ss.portalUptime}%`} t={ss.portalUptime >= 99 ? 'ok' : 'warn'} />
          <Stat l="Scholarships active" v={ss.scholarshipsActive.toLocaleString()} t="ok" />
          <Stat l="Enrolment requests" v={ss.enrolmentRequests.toLocaleString()} t={ss.enrolmentRequests > 10000 ? 'warn' : 'ok'} />
          <Stat l="Satisfaction" v={`${ss.satisfactionPct}%`} t={ss.satisfactionPct >= 70 ? 'ok' : 'warn'} />
        </div>
        <RuntimeQueue scope={`${id}:student`} kind="approval" title="Learner services runtime — application → verification → award" by="Student Services" n={14} />
      </div>
    );
  }

  if (isEdu) {
    const sn = schoolNetwork(id, ts);
    const ex = examOps(id, ts);
    const tch = teacherOps(id, ts);
    const ss = studentServices(id, ts);
    return (
      <div className="space-y-2">
        {header}
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-6">
          <Stat l="Schools" v={sn.schools.toLocaleString()} t="ok" />
          <Stat l="Enrolment" v={`${sn.enrolmentM}M`} t="ok" />
          <Stat l="Pupil:teacher" v={`${sn.pupilTeacherRatio}:1`} t={sn.pupilTeacherRatio >= 45 ? 'alert' : sn.pupilTeacherRatio >= 35 ? 'warn' : 'ok'} />
          <Stat l="Dropout rate" v={`${sn.dropoutRatePct}%`} t={sn.dropoutRatePct >= 12 ? 'alert' : sn.dropoutRatePct >= 7 ? 'warn' : 'ok'} />
          <Stat l="Teacher vacancies" v={`${tch.vacanciesPct}%`} t={tch.vacanciesPct >= 15 ? 'alert' : tch.vacanciesPct >= 8 ? 'warn' : 'ok'} />
          <Stat l="Exam integrity flags" v={`${ex.integrityFlags}`} t={ex.integrityFlags ? 'alert' : 'ok'} />
        </div>
        <div className="grid gap-2 xl:grid-cols-3">
          <Panel title="School network — regional capacity" meta="infrastructure · enrolment" bodyClass="!p-2">
            <div className="space-y-1">
              {sn.byRegion.map(r => (
                <div key={r.region} className="flex items-center gap-2 text-[10px]">
                  <span className="min-w-0 flex-1 truncate text-ink-soft">{r.region}</span>
                  <span className="text-ink-muted">{r.schools.toLocaleString()}</span>
                  <div className="h-1.5 w-16 shrink-0 overflow-hidden rounded-full bg-surface-2"><span className="block h-full" style={{ width: `${r.capacityPct}%`, backgroundColor: tc(r.tone) }} /></div>
                  <span className="w-8 shrink-0 text-right font-mono tabular-nums" style={{ color: tc(r.tone) }}>{r.capacityPct}</span>
                </div>
              ))}
            </div>
          </Panel>
          <Panel title="Examinations pipeline" meta="registration → release" bodyClass="!p-2">
            <div className="mb-2 grid grid-cols-2 gap-2">
              <Stat l="Candidates" v={ex.candidates.toLocaleString()} t="ok" />
              <Stat l="Results pending" v={ex.resultsPending.toLocaleString()} t={ex.resultsPending > 30000 ? 'warn' : 'ok'} />
            </div>
            <div className="space-y-1">
              {ex.pipeline.map(s => (
                <div key={s.stage} className="flex items-center gap-2 text-[10px]">
                  <span className="w-24 shrink-0 truncate text-ink-soft">{s.stage}</span>
                  <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-surface-2"><span className="block h-full" style={{ width: `${Math.min(100, s.count)}%`, backgroundColor: TONE.warn }} /></div>
                  <span className="w-7 shrink-0 text-right font-mono tabular-nums text-ink-muted">{s.count}</span>
                </div>
              ))}
            </div>
          </Panel>
          <Panel title="Teacher workforce & learner services" meta="postings · scholarships" bodyClass="!p-2">
            <div className="grid grid-cols-2 gap-2">
              <Stat l="Teachers" v={tch.teachers.toLocaleString()} t="ok" />
              <Stat l="Payroll on-time" v={`${tch.payrollOnTimePct}%`} t={tch.payrollOnTimePct >= 95 ? 'ok' : 'warn'} />
              <Stat l="Postings pending" v={tch.postingsPending.toLocaleString()} t={tch.postingsPending > 1500 ? 'warn' : 'ok'} />
              <Stat l="Scholarships" v={ss.scholarshipsActive.toLocaleString()} t="ok" />
              <Stat l="Learner records" v={`${ss.learnerRecordsM}M`} t="ok" />
              <Stat l="Portal uptime" v={`${ss.portalUptime}%`} t={ss.portalUptime >= 99 ? 'ok' : 'warn'} />
            </div>
          </Panel>
        </div>
        <RuntimeQueue scope={`${id}:${grp.key}`} kind={grp.key === 'exams' ? 'case' : grp.key === 'student' ? 'approval' : 'case'} title={`${grp.name} runtime — executable workflow`} />
      </div>
    );
  }

  if (isTransport && group === 'command') {
    const C = transportCommand(id, ts);
    const pt: 'ok' | 'warn' | 'alert' = C.posture === 'crisis' ? 'alert' : C.posture === 'engaged' ? 'warn' : 'ok';
    return (
      <div className="space-y-2">
        {header}
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-6">
          <Stat l="Posture index" v={`${C.postureIndex}`} t={pt} />
          <Stat l="Command posture" v={C.posture} t={pt} />
          <Stat l="Critical domains" v={`${C.criticalDomains}`} t={C.criticalDomains ? 'alert' : 'ok'} />
          <Stat l="Open directives" v={`${C.directives.length}`} t={C.directives.some(d => d.priority === 'critical') ? 'alert' : C.directives.length ? 'warn' : 'ok'} />
          <Stat l="Domains in scope" v={`${C.domains.length}`} t="ok" />
          <Stat l="Authority" v="National" t="ok" />
        </div>
        <Panel title="Whole-of-mobility domain status" meta="emergent from modal/corridor/fleet engines" bodyClass="!p-0">
          {C.domains.map(d => (
            <div key={d.domain} className="flex items-center gap-2 border-b border-line-soft px-3 py-2 last:border-0" style={{ borderLeft: `3px solid ${tc(d.tone)}` }}>
              <span className="w-52 shrink-0 truncate text-[11px] text-ink">{d.domain}</span>
              <span className="min-w-0 flex-1 truncate text-[9px] text-ink-muted">{d.metric}</span>
              <span className="w-16 shrink-0 text-right font-mono text-[11px] tabular-nums" style={{ color: tc(d.tone) }}>{d.value}</span>
            </div>
          ))}
        </Panel>
        <Panel title="Command directives" meta="ranked · executable across the mobility federation" bodyClass="!p-2">
          {C.directives.length === 0 ? (
            <p className="text-[11px] text-ink-muted">No outstanding command directives — mobility network within tolerance.</p>
          ) : (
            <div className="space-y-1.5">
              {C.directives.map((d, i) => {
                const dt = d.priority === 'critical' ? 'alert' : d.priority === 'priority' ? 'warn' : 'ok';
                return (
                  <div key={i} className="rounded-[3px] border border-line-soft bg-surface-2/40 px-2.5 py-2" style={{ borderLeft: `3px solid ${tc(dt)}` }}>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-[8.5px] font-bold uppercase tracking-[0.16em]" style={{ color: tc(dt) }}>{d.priority}</span>
                      <span className="text-[11px] font-medium text-ink">{d.title}</span>
                      <a href={`/ministries/${id}/system/${d.target}`} className="ml-auto text-[9px] text-link no-underline hover:underline">→ {d.target}</a>
                    </div>
                    <div className="mt-0.5 text-[9px] text-ink-muted">{d.rationale}</div>
                  </div>
                );
              })}
            </div>
          )}
        </Panel>
        <RuntimeQueue scope={`${id}:command`} kind="incident" title="Transport Command runtime — execute national mobility directives" by="Transport Command" n={14} />
      </div>
    );
  }

  if (isTransport && (group === 'aviation' || group === 'maritime' || group === 'rail' || group === 'road')) {
    const o = transportOps(id, ts);
    const modeName = group.charAt(0).toUpperCase() + group.slice(1);
    const md = o.modes.find(x => x.mode.toLowerCase() === group) ?? o.modes[0]!;
    return (
      <div className="space-y-2">
        {header}
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-6">
          <Stat l={`${modeName} throughput`} v={`${md.throughputPct}%`} t={md.tone} />
          <Stat l="Delays" v={`${md.delaysMin}m`} t={md.delaysMin >= 50 ? 'alert' : md.delaysMin >= 25 ? 'warn' : 'ok'} />
          <Stat l="Incidents" v={`${md.incidents}`} t={md.incidents >= 6 ? 'alert' : md.incidents ? 'warn' : 'ok'} />
          <Stat l="Network availability" v={`${o.networkAvailabilityPct}%`} t={o.networkAvailabilityPct >= 85 ? 'ok' : 'warn'} />
          <Stat l="Safety index" v={`${o.safetyIndex}`} t={o.safetyIndex >= 80 ? 'ok' : 'warn'} />
          <Stat l="Fleet available" v={`${o.fleet.available}/${o.fleet.vehicles}`} t={o.fleet.available < o.fleet.vehicles * 0.6 ? 'alert' : 'ok'} />
        </div>
        <Panel title={`${modeName} corridor flow`} meta="load · throughput" bodyClass="!p-0">
          {o.corridors.map(c => (
            <div key={c.corridor} className="flex items-center gap-2 border-b border-line-soft px-3 py-2 last:border-0" style={{ borderLeft: `3px solid ${tc(c.tone)}` }}>
              <span className="w-32 shrink-0 truncate text-[11px] text-ink">{c.corridor}</span>
              <div className="h-1.5 min-w-0 flex-1 overflow-hidden rounded-full bg-surface-2"><span className="block h-full" style={{ width: `${c.loadPct}%`, backgroundColor: tc(c.tone) }} /></div>
              <span className="w-14 shrink-0 text-right font-mono text-[10px] tabular-nums" style={{ color: tc(c.tone) }}>{c.throughputKt}kt</span>
            </div>
          ))}
        </Panel>
        <RuntimeQueue scope={`${id}:${group}`} kind="case" title={`${modeName} operations runtime — incident → contain → restore`} by={`${modeName} Controller`} n={14} />
      </div>
    );
  }

  if (isTransport && group === 'citizen') {
    const o = transportOps(id, ts);
    return (
      <div className="space-y-2">
        {header}
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-6">
          <Stat l="Vehicles registered" v={`${o.registry.vehiclesM}M`} t="ok" />
          <Stat l="Licences issued today" v={o.registry.licencesIssuedToday.toLocaleString()} t="ok" />
          <Stat l="Registry backlog" v={o.registry.backlog.toLocaleString()} t={o.registry.backlog > 3000 ? 'alert' : o.registry.backlog > 1500 ? 'warn' : 'ok'} />
          <Stat l="Network availability" v={`${o.networkAvailabilityPct}%`} t={o.networkAvailabilityPct >= 85 ? 'ok' : 'warn'} />
        </div>
        <RuntimeQueue scope={`${id}:citizen`} kind="permit" title="Mobility services runtime — application → verification → licence issuance" by="Licensing Officer" n={14} />
      </div>
    );
  }

  if (isTransport) {
    const o = transportOps(id, ts);
    return (
      <div className="space-y-2">
        {header}
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-6">
          <Stat l="Network availability" v={`${o.networkAvailabilityPct}%`} t={o.networkAvailabilityPct >= 85 ? 'ok' : o.networkAvailabilityPct >= 68 ? 'warn' : 'alert'} />
          <Stat l="Safety index" v={`${o.safetyIndex}`} t={o.safetyIndex >= 80 ? 'ok' : 'warn'} />
          <Stat l="Fleet available" v={`${o.fleet.available}/${o.fleet.vehicles}`} t={o.fleet.available < o.fleet.vehicles * 0.6 ? 'alert' : 'ok'} />
          <Stat l="Maint. backlog" v={`${o.fleet.maintenanceBacklog}`} t={o.fleet.maintenanceBacklog > 200 ? 'alert' : 'warn'} />
          <Stat l="Vehicles registered" v={`${o.registry.vehiclesM}M`} t="ok" />
          <Stat l="Registry backlog" v={o.registry.backlog.toLocaleString()} t={o.registry.backlog > 3000 ? 'warn' : 'ok'} />
        </div>
        <div className="grid gap-2 xl:grid-cols-2">
          <Panel title="Modal operations" meta="aviation · maritime · rail · road" bodyClass="!p-2">
            <div className="space-y-1">
              {o.modes.map(md => (
                <div key={md.mode} className="flex items-center gap-2 text-[10px]">
                  <span className="w-16 shrink-0 text-ink-soft">{md.mode}</span>
                  <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-surface-2"><span className="block h-full" style={{ width: `${md.throughputPct}%`, backgroundColor: tc(md.tone) }} /></div>
                  <span className="w-8 shrink-0 text-right font-mono tabular-nums" style={{ color: tc(md.tone) }}>{md.throughputPct}</span>
                  <span className="w-16 shrink-0 text-right text-[8px] text-ink-muted">{md.delaysMin}m · {md.incidents}i</span>
                </div>
              ))}
            </div>
          </Panel>
          <Panel title="Corridor flow" meta="logistics load · throughput" bodyClass="!p-2">
            <div className="space-y-1">
              {o.corridors.map(c => (
                <div key={c.corridor} className="flex items-center gap-2 text-[10px]">
                  <span className="w-28 shrink-0 truncate text-ink-soft">{c.corridor}</span>
                  <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-surface-2"><span className="block h-full" style={{ width: `${c.loadPct}%`, backgroundColor: tc(c.tone) }} /></div>
                  <span className="w-12 shrink-0 text-right font-mono tabular-nums" style={{ color: tc(c.tone) }}>{c.throughputKt}kt</span>
                </div>
              ))}
            </div>
          </Panel>
        </div>
        <RuntimeQueue scope={`${id}:${grp.key}`} kind={grp.key === 'citizen' ? 'permit' : grp.key === 'logistics' ? 'procurement' : 'case'} title={`${grp.name} runtime — executable workflow`} />
      </div>
    );
  }

  if (isEnergy && group === 'command') {
    const C = energyCommand(id, ts);
    const pt: 'ok' | 'warn' | 'alert' = C.posture === 'crisis' ? 'alert' : C.posture === 'engaged' ? 'warn' : 'ok';
    return (
      <div className="space-y-2">
        {header}
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-6">
          <Stat l="Posture index" v={`${C.postureIndex}`} t={pt} />
          <Stat l="Command posture" v={C.posture} t={pt} />
          <Stat l="Critical domains" v={`${C.criticalDomains}`} t={C.criticalDomains ? 'alert' : 'ok'} />
          <Stat l="Open directives" v={`${C.directives.length}`} t={C.directives.some(d => d.priority === 'critical') ? 'alert' : C.directives.length ? 'warn' : 'ok'} />
          <Stat l="Domains in scope" v={`${C.domains.length}`} t="ok" />
          <Stat l="Authority" v="National" t="ok" />
        </div>
        <Panel title="Whole-of-energy domain status" meta="emergent from generation/grid/reserve engines" bodyClass="!p-0">
          {C.domains.map(d => (
            <div key={d.domain} className="flex items-center gap-2 border-b border-line-soft px-3 py-2 last:border-0" style={{ borderLeft: `3px solid ${tc(d.tone)}` }}>
              <span className="w-52 shrink-0 truncate text-[11px] text-ink">{d.domain}</span>
              <span className="min-w-0 flex-1 truncate text-[9px] text-ink-muted">{d.metric}</span>
              <span className="w-16 shrink-0 text-right font-mono text-[11px] tabular-nums" style={{ color: tc(d.tone) }}>{d.value}</span>
            </div>
          ))}
        </Panel>
        <Panel title="Command directives" meta="ranked · executable across the energy federation" bodyClass="!p-2">
          {C.directives.length === 0 ? (
            <p className="text-[11px] text-ink-muted">No outstanding command directives — grid & energy security within tolerance.</p>
          ) : (
            <div className="space-y-1.5">
              {C.directives.map((d, i) => {
                const dt = d.priority === 'critical' ? 'alert' : d.priority === 'priority' ? 'warn' : 'ok';
                return (
                  <div key={i} className="rounded-[3px] border border-line-soft bg-surface-2/40 px-2.5 py-2" style={{ borderLeft: `3px solid ${tc(dt)}` }}>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-[8.5px] font-bold uppercase tracking-[0.16em]" style={{ color: tc(dt) }}>{d.priority}</span>
                      <span className="text-[11px] font-medium text-ink">{d.title}</span>
                      <a href={`/ministries/${id}/system/${d.target}`} className="ml-auto text-[9px] text-link no-underline hover:underline">→ {d.target}</a>
                    </div>
                    <div className="mt-0.5 text-[9px] text-ink-muted">{d.rationale}</div>
                  </div>
                );
              })}
            </div>
          )}
        </Panel>
        <RuntimeQueue scope={`${id}:command`} kind="incident" title="Energy Command runtime — execute grid & energy-security directives" by="Energy Command" n={14} />
      </div>
    );
  }

  if (isEnergy && group === 'generation') {
    const o = energyOps(id, ts);
    return (
      <div className="space-y-2">
        {header}
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-6">
          <Stat l="Supply" v={`${o.supplyGw}GW`} t={o.supplyGw >= o.demandGw ? 'ok' : 'alert'} />
          <Stat l="Demand" v={`${o.demandGw}GW`} t="ok" />
          <Stat l="Reserve margin" v={`${o.reserveMarginPct}%`} t={o.reserveMarginPct >= 12 ? 'ok' : o.reserveMarginPct >= 6 ? 'warn' : 'alert'} />
          <Stat l="Load shedding" v={o.loadShedding ? 'ACTIVE' : 'none'} t={o.loadShedding ? 'alert' : 'ok'} />
        </div>
        <Panel title="Generation mix" meta="source · output" bodyClass="!p-0">
          {o.generation.map(g => (
            <div key={g.source} className="flex items-center gap-2 border-b border-line-soft px-3 py-2 last:border-0" style={{ borderLeft: `3px solid ${tc(g.tone)}` }}>
              <span className="w-32 shrink-0 truncate text-[11px] text-ink">{g.source}</span>
              <div className="h-1.5 min-w-0 flex-1 overflow-hidden rounded-full bg-surface-2"><span className="block h-full" style={{ width: `${g.outputPct}%`, backgroundColor: tc(g.tone) }} /></div>
              <span className="w-10 shrink-0 text-right font-mono text-[10px] tabular-nums" style={{ color: tc(g.tone) }}>{g.outputPct}%</span>
            </div>
          ))}
        </Panel>
        <RuntimeQueue scope={`${id}:generation`} kind="case" title="Generation runtime — dispatch → ramp → fault → restore" by="Dispatch Engineer" n={14} />
      </div>
    );
  }

  if (isEnergy && group === 'grid') {
    const o = energyOps(id, ts);
    const fd = Math.abs(o.gridFrequencyHz - 50);
    return (
      <div className="space-y-2">
        {header}
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-6">
          <Stat l="Grid frequency" v={`${o.gridFrequencyHz}Hz`} t={fd <= 0.2 ? 'ok' : fd <= 0.4 ? 'warn' : 'alert'} />
          <Stat l="Substations online" v={`${o.substations.online}/${o.substations.total}`} t={o.substations.faults > 24 ? 'alert' : o.substations.faults > 10 ? 'warn' : 'ok'} />
          <Stat l="Faults" v={`${o.substations.faults}`} t={o.substations.faults > 24 ? 'alert' : 'warn'} />
          <Stat l="Outage minutes/day" v={`${o.outageMinutesPerDay}`} t={o.outageMinutesPerDay > 60 ? 'alert' : o.outageMinutesPerDay > 25 ? 'warn' : 'ok'} />
          <Stat l="Reserve margin" v={`${o.reserveMarginPct}%`} t={o.reserveMarginPct >= 12 ? 'ok' : 'warn'} />
          <Stat l="Load shedding" v={o.loadShedding ? 'ACTIVE' : 'none'} t={o.loadShedding ? 'alert' : 'ok'} />
        </div>
        <RuntimeQueue scope={`${id}:grid`} kind="incident" title="Grid operations runtime — fault → isolate → reroute → restore" by="Grid Controller" n={14} />
      </div>
    );
  }

  if (isEnergy && (group === 'access' || group === 'fuel' || group === 'citizen')) {
    const o = energyOps(id, ts);
    const isFuel = group === 'fuel';
    const isAccess = group === 'access';
    return (
      <div className="space-y-2">
        {header}
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-6">
          <Stat l="Electrification" v={`${o.electrificationPct}%`} t={o.electrificationPct >= 80 ? 'ok' : o.electrificationPct >= 65 ? 'warn' : 'alert'} />
          <Stat l="Fuel reserve" v={`${o.fuelReserveDays}d`} t={o.fuelReserveDays < 14 ? 'alert' : o.fuelReserveDays < 30 ? 'warn' : 'ok'} />
          <Stat l="Outage minutes/day" v={`${o.outageMinutesPerDay}`} t={o.outageMinutesPerDay > 60 ? 'alert' : 'warn'} />
          <Stat l="Supply / demand" v={`${o.supplyGw}/${o.demandGw}GW`} t={o.supplyGw >= o.demandGw ? 'ok' : 'alert'} />
        </div>
        <RuntimeQueue scope={`${id}:${group}`} kind={isAccess ? 'case' : isFuel ? 'procurement' : 'permit'}
          title={isAccess ? 'Electrification runtime — survey → connect → energise'
            : isFuel ? 'Strategic-reserve runtime — requisition → procure → store'
              : 'Consumer services runtime — request → connect → bill'}
          by={isAccess ? 'Electrification Officer' : isFuel ? 'Reserve Officer' : 'Consumer Services'} n={14} />
      </div>
    );
  }

  if (isEnergy) {
    const o = energyOps(id, ts);
    return (
      <div className="space-y-2">
        {header}
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-6">
          <Stat l="Grid frequency" v={`${o.gridFrequencyHz}Hz`} t={Math.abs(o.gridFrequencyHz - 50) <= 0.2 ? 'ok' : Math.abs(o.gridFrequencyHz - 50) <= 0.4 ? 'warn' : 'alert'} />
          <Stat l="Reserve margin" v={`${o.reserveMarginPct}%`} t={o.reserveMarginPct >= 12 ? 'ok' : o.reserveMarginPct >= 6 ? 'warn' : 'alert'} />
          <Stat l="Demand / supply" v={`${o.demandGw}/${o.supplyGw}GW`} t={o.supplyGw >= o.demandGw ? 'ok' : 'alert'} />
          <Stat l="Electrification" v={`${o.electrificationPct}%`} t={o.electrificationPct >= 85 ? 'ok' : 'warn'} />
          <Stat l="Outage min/day" v={`${o.outageMinutesPerDay}`} t={o.outageMinutesPerDay >= 60 ? 'alert' : o.outageMinutesPerDay >= 20 ? 'warn' : 'ok'} />
          <Stat l="Load shedding" v={o.loadShedding ? 'ACTIVE' : 'NONE'} t={o.loadShedding ? 'alert' : 'ok'} />
        </div>
        <div className="grid gap-2 xl:grid-cols-2">
          <Panel title="Generation mix" meta="source output" bodyClass="!p-2">
            <div className="space-y-1">
              {o.generation.map(g => (
                <div key={g.source} className="flex items-center gap-2 text-[10px]">
                  <span className="w-16 shrink-0 text-ink-soft">{g.source}</span>
                  <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-surface-2"><span className="block h-full" style={{ width: `${g.outputPct}%`, backgroundColor: tc(g.tone) }} /></div>
                  <span className="w-8 shrink-0 text-right font-mono tabular-nums" style={{ color: tc(g.tone) }}>{g.outputPct}</span>
                </div>
              ))}
            </div>
          </Panel>
          <Panel title="Grid & reserves" meta="substations · fuel" bodyClass="!p-2">
            <div className="grid grid-cols-2 gap-2">
              <Stat l="Substations online" v={`${o.substations.online}/${o.substations.total}`} t={o.substations.faults > 10 ? 'alert' : o.substations.faults ? 'warn' : 'ok'} />
              <Stat l="Faults" v={`${o.substations.faults}`} t={o.substations.faults ? 'warn' : 'ok'} />
              <Stat l="Fuel reserve" v={`${o.fuelReserveDays}d`} t={o.fuelReserveDays >= 30 ? 'ok' : o.fuelReserveDays >= 14 ? 'warn' : 'alert'} />
              <Stat l="Reserve margin" v={`${o.reserveMarginPct}%`} t={o.reserveMarginPct >= 12 ? 'ok' : 'warn'} />
            </div>
            <div className="mt-2 h-7 overflow-hidden opacity-80"><Spark pts={waveSeries(`egp:${id}`, ts, 24, 30, 92)} tone={o.loadShedding ? 'alert' : 'ok'} /></div>
          </Panel>
        </div>
        <RuntimeQueue scope={`${id}:${grp.key}`} kind={grp.key === 'access' ? 'permit' : grp.key === 'fuel' ? 'procurement' : grp.key === 'command' ? 'incident' : 'case'} title={`${grp.name} runtime — executable workflow`} />
      </div>
    );
  }

  if (group === 'command' && (isInterior || isAgri || isJustice || isEnv || isTrade || isLabor)) {
    const C = sectorCommand(id, m.archetype, ts);
    const pt: 'ok' | 'warn' | 'alert' = C.posture === 'crisis' ? 'alert' : C.posture === 'engaged' ? 'warn' : 'ok';
    return (
      <div className="space-y-2">
        {header}
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-6">
          <Stat l="Posture index" v={`${C.postureIndex}`} t={pt} />
          <Stat l="Command posture" v={C.posture} t={pt} />
          <Stat l="Critical domains" v={`${C.criticalDomains}`} t={C.criticalDomains ? 'alert' : 'ok'} />
          <Stat l="Open directives" v={`${C.directives.length}`} t={C.directives.some(d => d.priority === 'critical') ? 'alert' : C.directives.length ? 'warn' : 'ok'} />
          <Stat l="Domains in scope" v={`${C.domains.length}`} t="ok" />
          <Stat l="Authority" v="National" t="ok" />
        </div>
        <Panel title={`Whole-of-${m.archetype.toLowerCase()} domain status`} meta="emergent from the institution's operational engine" bodyClass="!p-0">
          {C.domains.map(d => (
            <div key={d.domain} className="flex items-center gap-2 border-b border-line-soft px-3 py-2 last:border-0" style={{ borderLeft: `3px solid ${tc(d.tone)}` }}>
              <span className="w-44 shrink-0 truncate text-[11px] text-ink">{d.domain}</span>
              <span className="min-w-0 flex-1 truncate text-[9px] text-ink-muted">{d.metric}</span>
              <span className="w-16 shrink-0 text-right font-mono text-[11px] tabular-nums" style={{ color: tc(d.tone) }}>{d.value}</span>
            </div>
          ))}
        </Panel>
        <Panel title="Command directives" meta="ranked · executable across the institution" bodyClass="!p-2">
          {C.directives.length === 0 ? (
            <p className="text-[11px] text-ink-muted">No outstanding command directives — every domain within tolerance.</p>
          ) : (
            <div className="space-y-1.5">
              {C.directives.map((d, i) => {
                const dt = d.priority === 'critical' ? 'alert' : d.priority === 'priority' ? 'warn' : 'ok';
                return (
                  <div key={i} className="rounded-[3px] border border-line-soft bg-surface-2/40 px-2.5 py-2" style={{ borderLeft: `3px solid ${tc(dt)}` }}>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-[8.5px] font-bold uppercase tracking-[0.16em]" style={{ color: tc(dt) }}>{d.priority}</span>
                      <span className="text-[11px] font-medium text-ink">{d.title}</span>
                      <a href={`/ministries/${id}/system/${d.target}`} className="ml-auto text-[9px] text-link no-underline hover:underline">→ {d.target}</a>
                    </div>
                    <div className="mt-0.5 text-[9px] text-ink-muted">{d.rationale}</div>
                  </div>
                );
              })}
            </div>
          )}
        </Panel>
        <RuntimeQueue scope={`${id}:command`} kind="incident" title={`${m.name} Command runtime — execute national directives`} by="Command Authority" n={14} />
      </div>
    );
  }

  if (isInterior) {
    const o = interiorOps(id, ts);
    const lt = o.internalThreatLevel === 'high' ? 'alert' : o.internalThreatLevel === 'elevated' ? 'warn' : 'ok';
    return (
      <div className="space-y-2">
        {header}
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-6">
          <Stat l="Identity enrolled" v={`${o.identity.enrolledM}M`} t="ok" />
          <Stat l="ID issuance backlog" v={o.identity.issuanceBacklog.toLocaleString()} t={o.identity.issuanceBacklog > 5000 ? 'alert' : 'warn'} />
          <Stat l="Border posts open" v={`${o.border.open}/${o.border.posts}`} t={o.border.open < o.border.posts ? 'warn' : 'ok'} />
          <Stat l="Flagged entries" v={`${o.border.flaggedEntries}`} t={o.border.flaggedEntries > 80 ? 'alert' : 'warn'} />
          <Stat l="Public order" v={`${o.coordination.publicOrderIndex}`} t={lt} />
          <Stat l="Threat level" v={o.internalThreatLevel} t={lt} />
        </div>
        <div className="grid gap-2 xl:grid-cols-3">
          <Panel title="Civil identity systems" meta="enrolment · verification" bodyClass="!p-2">
            <div className="grid grid-cols-2 gap-2">
              <Stat l="Verifications/hr" v={o.identity.verificationsPerHr.toLocaleString()} t="ok" />
              <Stat l="Uptime" v={`${o.identity.uptimePct}%`} t={o.identity.uptimePct >= 99 ? 'ok' : 'warn'} />
            </div>
          </Panel>
          <Panel title="Border control" meta="crossings · clearance" bodyClass="!p-2">
            <div className="grid grid-cols-2 gap-2">
              <Stat l="Crossings today" v={o.border.crossingsToday.toLocaleString()} t="ok" />
              <Stat l="Mean clearance" v={`${o.border.meanClearanceMin}m`} t={o.border.meanClearanceMin >= 30 ? 'warn' : 'ok'} />
            </div>
          </Panel>
          <Panel title="Internal coordination & licensing" meta="cells · permits" bodyClass="!p-2">
            <div className="grid grid-cols-2 gap-2">
              <Stat l="Coordination cells" v={`${o.coordination.cellsActive}`} t="ok" />
              <Stat l="Joint ops" v={`${o.coordination.jointOpsActive}`} t={o.coordination.jointOpsActive ? 'warn' : 'ok'} />
              <Stat l="Licences pending" v={o.licensing.pending.toLocaleString()} t={o.licensing.pending > 3000 ? 'warn' : 'ok'} />
              <Stat l="SLA met" v={`${o.licensing.slaMetPct}%`} t={o.licensing.slaMetPct >= 80 ? 'ok' : 'warn'} />
            </div>
          </Panel>
        </div>
        <RuntimeQueue scope={`${id}:${grp.key}`} kind={grp.key === 'identity' || grp.key === 'licensing' || grp.key === 'citizen' ? 'permit' : grp.key === 'command' ? 'incident' : 'case'} title={`${grp.name} runtime — executable workflow`} />
      </div>
    );
  }

  if (isAgri) {
    const o = agricultureOps(id, ts);
    return (
      <div className="space-y-2">
        {header}
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-6">
          <Stat l="Food security" v={`${o.foodSecurityIndex}`} t={o.foodSecurityIndex >= 75 ? 'ok' : o.foodSecurityIndex >= 55 ? 'warn' : 'alert'} />
          <Stat l="Strategic reserve" v={`${o.strategicReserveDays}d`} t={o.strategicReserveDays >= 45 ? 'ok' : o.strategicReserveDays >= 21 ? 'warn' : 'alert'} />
          <Stat l="Livestock health" v={`${o.livestockHealthPct}%`} t={o.livestockHealthPct >= 85 ? 'ok' : 'warn'} />
          <Stat l="Irrigation coverage" v={`${o.irrigationCoveragePct}%`} t={o.irrigationCoveragePct >= 60 ? 'ok' : 'warn'} />
          <Stat l="Pest alerts" v={`${o.pestAlerts}`} t={o.pestAlerts > 8 ? 'alert' : o.pestAlerts ? 'warn' : 'ok'} />
          <Stat l="Subsidy disbursed" v={`${o.subsidyDisbursementPct}%`} t={o.subsidyDisbursementPct >= 75 ? 'ok' : 'warn'} />
        </div>
        <div className="grid gap-2 xl:grid-cols-2">
          <Panel title="Crop production" meta="yield index" bodyClass="!p-2">
            <div className="space-y-1">
              {o.crops.map(c => (
                <div key={c.crop} className="flex items-center gap-2 text-[10px]">
                  <span className="w-20 shrink-0 text-ink-soft">{c.crop}</span>
                  <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-surface-2"><span className="block h-full" style={{ width: `${c.yieldIdx}%`, backgroundColor: tc(c.tone) }} /></div>
                  <span className="w-8 shrink-0 text-right font-mono tabular-nums" style={{ color: tc(c.tone) }}>{c.yieldIdx}</span>
                </div>
              ))}
            </div>
          </Panel>
          <Panel title="Regional production & farmer services" meta="food-supply footprint" bodyClass="!p-2">
            <div className="mb-2 grid grid-cols-3 gap-1.5">
              {o.byRegion.map(r => (
                <div key={r.region} className="rounded-[3px] border border-line-soft bg-surface-2/40 px-2 py-1">
                  <div className="truncate text-[8px] uppercase tracking-wider text-ink-muted">{r.region}</div>
                  <div className="font-mono text-[12px] tabular-nums" style={{ color: tc(r.tone) }}>{r.productionIdx}</div>
                </div>
              ))}
            </div>
            <div className="text-[9px] text-ink-muted">Farmers registered <span className="font-mono text-ink-soft">{o.farmersRegisteredM}M</span> · feeds national food-security & logistics propagation.</div>
          </Panel>
        </div>
        <RuntimeQueue scope={`${id}:${grp.key}`} kind={grp.key === 'farmer' ? 'approval' : grp.key === 'command' ? 'incident' : 'case'} title={`${grp.name} runtime — executable workflow`} />
      </div>
    );
  }

  if (isJustice && (group === 'courts' || group === 'legalaid' || group === 'corrections' || group === 'registries' || group === 'citizen')) {
    const o = justiceOps(id, ts);
    const LA = o.legalAid, RG = o.registries, CO = o.corrections, CL = o.courtLiaison;
    const title = group === 'courts' ? 'Court liaison & coordination'
      : group === 'legalaid' ? 'Legal aid — access to justice'
        : group === 'corrections' ? 'Corrections & custodial system'
          : group === 'registries' ? 'Public legal registries'
            : 'Citizen justice services';
    const stats = group === 'courts' ? [
      { l: 'Cases coordinated', v: CL.casesCoordinated.toLocaleString(), t: 'ok' as const },
      { l: 'Transfers pending', v: CL.transfersPending.toLocaleString(), t: (CL.transfersPending > 500 ? 'alert' : CL.transfersPending > 200 ? 'warn' : 'ok') as 'ok' | 'warn' | 'alert' },
      { l: 'SLA met', v: `${CL.slaMetPct}%`, t: (CL.slaMetPct >= 80 ? 'ok' : 'warn') as 'ok' | 'warn' | 'alert' },
      { l: 'Access-to-justice', v: `${o.accessToJusticeIndex}`, t: (o.accessToJusticeIndex >= 70 ? 'ok' : 'warn') as 'ok' | 'warn' | 'alert' },
    ] : group === 'legalaid' ? [
      { l: 'Aid centres', v: `${LA.centres}`, t: 'ok' as const },
      { l: 'Open matters', v: LA.openMatters.toLocaleString(), t: 'warn' as const },
      { l: 'Represented', v: `${LA.representedPct}%`, t: (LA.representedPct >= 75 ? 'ok' : 'warn') as 'ok' | 'warn' | 'alert' },
      { l: 'Backlog', v: LA.backlog.toLocaleString(), t: (LA.backlog > 4000 ? 'alert' : LA.backlog > 2000 ? 'warn' : 'ok') as 'ok' | 'warn' | 'alert' },
    ] : group === 'corrections' ? [
      { l: 'Facilities', v: `${CO.facilities}`, t: 'ok' as const },
      { l: 'Population', v: CO.population.toLocaleString(), t: 'ok' as const },
      { l: 'Occupancy', v: `${CO.occupancyPct}%`, t: (CO.occupancyPct >= 110 ? 'alert' : CO.occupancyPct >= 95 ? 'warn' : 'ok') as 'ok' | 'warn' | 'alert' },
      { l: 'Rehab active', v: CO.rehabActive.toLocaleString(), t: 'ok' as const },
    ] : group === 'registries' ? [
      { l: 'Records', v: `${RG.recordsM}M`, t: 'ok' as const },
      { l: 'Verifications/hr', v: RG.verificationsPerHr.toLocaleString(), t: 'ok' as const },
      { l: 'Integrity', v: `${RG.integrityPct}%`, t: (RG.integrityPct >= 98 ? 'ok' : 'warn') as 'ok' | 'warn' | 'alert' },
      { l: 'Backlog', v: RG.backlog.toLocaleString(), t: (RG.backlog > 2500 ? 'alert' : RG.backlog > 1000 ? 'warn' : 'ok') as 'ok' | 'warn' | 'alert' },
    ] : [
      { l: 'Access-to-justice', v: `${o.accessToJusticeIndex}`, t: (o.accessToJusticeIndex >= 70 ? 'ok' : 'warn') as 'ok' | 'warn' | 'alert' },
      { l: 'Represented', v: `${LA.representedPct}%`, t: (LA.representedPct >= 75 ? 'ok' : 'warn') as 'ok' | 'warn' | 'alert' },
      { l: 'Registry integrity', v: `${RG.integrityPct}%`, t: (RG.integrityPct >= 98 ? 'ok' : 'warn') as 'ok' | 'warn' | 'alert' },
      { l: 'Court SLA', v: `${CL.slaMetPct}%`, t: (CL.slaMetPct >= 80 ? 'ok' : 'warn') as 'ok' | 'warn' | 'alert' },
    ];
    const kind: WorkKind = group === 'legalaid' ? 'case' : group === 'registries' ? 'permit' : group === 'corrections' ? 'case' : group === 'citizen' ? 'permit' : 'judicial';
    return (
      <div className="space-y-2">
        {header}
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-6">
          {stats.map(s => <Stat key={s.l} l={s.l} v={s.v} t={s.t} />)}
        </div>
        <RuntimeQueue scope={`${id}:${group}`} kind={kind} title={`${title} runtime — execute the workflow`} by="Justice Officer" n={14} />
      </div>
    );
  }

  if (isJustice) {
    const o = justiceOps(id, ts);
    return (
      <div className="space-y-2">
        {header}
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-6">
          <Stat l="Access to justice" v={`${o.accessToJusticeIndex}`} t={o.accessToJusticeIndex >= 75 ? 'ok' : o.accessToJusticeIndex >= 55 ? 'warn' : 'alert'} />
          <Stat l="Legal-aid represented" v={`${o.legalAid.representedPct}%`} t={o.legalAid.representedPct >= 75 ? 'ok' : 'warn'} />
          <Stat l="Prison occupancy" v={`${o.corrections.occupancyPct}%`} t={o.corrections.occupancyPct >= 110 ? 'alert' : o.corrections.occupancyPct >= 95 ? 'warn' : 'ok'} />
          <Stat l="Registry integrity" v={`${o.registries.integrityPct}%`} t={o.registries.integrityPct >= 98 ? 'ok' : 'warn'} />
          <Stat l="Court-liaison SLA" v={`${o.courtLiaison.slaMetPct}%`} t={o.courtLiaison.slaMetPct >= 80 ? 'ok' : 'warn'} />
          <Stat l="Transfers pending" v={`${o.courtLiaison.transfersPending}`} t={o.courtLiaison.transfersPending > 500 ? 'warn' : 'ok'} />
        </div>
        <div className="grid gap-2 xl:grid-cols-3">
          <Panel title="Legal aid" meta="access to representation" bodyClass="!p-2">
            <div className="grid grid-cols-2 gap-2">
              <Stat l="Centres" v={`${o.legalAid.centres}`} t="ok" />
              <Stat l="Open matters" v={o.legalAid.openMatters.toLocaleString()} t="ok" />
              <Stat l="Backlog" v={o.legalAid.backlog.toLocaleString()} t={o.legalAid.backlog > 4000 ? 'alert' : 'warn'} />
              <Stat l="Represented" v={`${o.legalAid.representedPct}%`} t={o.legalAid.representedPct >= 75 ? 'ok' : 'warn'} />
            </div>
          </Panel>
          <Panel title="Public registries" meta="records · verification" bodyClass="!p-2">
            <div className="grid grid-cols-2 gap-2">
              <Stat l="Records" v={`${o.registries.recordsM}M`} t="ok" />
              <Stat l="Verifications/hr" v={o.registries.verificationsPerHr.toLocaleString()} t="ok" />
              <Stat l="Backlog" v={o.registries.backlog.toLocaleString()} t={o.registries.backlog > 2500 ? 'warn' : 'ok'} />
              <Stat l="Integrity" v={`${o.registries.integrityPct}%`} t={o.registries.integrityPct >= 98 ? 'ok' : 'warn'} />
            </div>
          </Panel>
          <Panel title="Corrections" meta="custodial system" bodyClass="!p-2">
            <div className="grid grid-cols-2 gap-2">
              <Stat l="Facilities" v={`${o.corrections.facilities}`} t="ok" />
              <Stat l="Population" v={o.corrections.population.toLocaleString()} t="ok" />
              <Stat l="Capacity" v={o.corrections.capacity.toLocaleString()} t="ok" />
              <Stat l="Rehab active" v={o.corrections.rehabActive.toLocaleString()} t="ok" />
            </div>
            <div className="mt-1 text-[9px]" style={{ color: o.corrections.occupancyPct >= 110 ? TONE.alert : o.corrections.occupancyPct >= 95 ? TONE.warn : TONE.ok }}>
              {o.corrections.occupancyPct >= 110 ? 'OVERCROWDED — divert / decongest' : o.corrections.occupancyPct >= 95 ? 'Near capacity' : 'Within capacity'}
            </div>
          </Panel>
        </div>
        <RuntimeQueue scope={`${id}:${grp.key}`} kind={grp.key === 'legalaid' ? 'case' : grp.key === 'registries' ? 'permit' : grp.key === 'command' ? 'incident' : 'case'} title={`${grp.name} runtime — executable workflow`} />
      </div>
    );
  }

  if (isEnv) {
    const o = environmentOps(id, ts);
    return (
      <div className="space-y-2">
        {header}
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-6">
          <Stat l="Air quality index" v={`${o.airQualityIndex}`} t={o.airQualityIndex >= 150 ? 'alert' : o.airQualityIndex >= 100 ? 'warn' : 'ok'} />
          <Stat l="Water quality" v={`${o.waterQualityPct}%`} t={o.waterQualityPct >= 80 ? 'ok' : 'warn'} />
          <Stat l="Monitoring online" v={`${o.monitoringOnline}/${o.monitoringTotal}`} t={o.monitoringOnline < o.monitoringTotal * 0.85 ? 'warn' : 'ok'} />
          <Stat l="Emissions vs target" v={`${o.emissionsVsTargetPct}%`} t={o.emissionsVsTargetPct > 110 ? 'alert' : o.emissionsVsTargetPct > 100 ? 'warn' : 'ok'} />
          <Stat l="Protected-area integrity" v={`${o.protectedAreaIntegrityPct}%`} t={o.protectedAreaIntegrityPct >= 75 ? 'ok' : 'warn'} />
          <Stat l="Compliance" v={`${o.compliancePct}%`} t={o.compliancePct >= 80 ? 'ok' : 'warn'} />
        </div>
        <div className="grid gap-2 xl:grid-cols-2">
          <Panel title="Environmental hazards" meta="regional risk" bodyClass="!p-0">
            {o.hazards.map(h => {
              const ht = h.level === 'severe' ? TONE.alert : h.level === 'moderate' ? TONE.warn : TONE.ok;
              return (
                <div key={h.region} className="flex items-center gap-2 border-b border-line-soft px-3 py-2 last:border-0" style={{ borderLeft: `3px solid ${ht}` }}>
                  <span className="w-28 shrink-0 truncate text-[11px] text-ink">{h.region}</span>
                  <span className="min-w-0 flex-1 truncate text-[9px] text-ink-muted">{h.kind}</span>
                  <span className="shrink-0 text-[8.5px] uppercase tracking-wider" style={{ color: ht }}>{h.level}</span>
                </div>
              );
            })}
          </Panel>
          <Panel title="Permits & compliance" meta="regulatory throughput" bodyClass="!p-2">
            <div className="grid grid-cols-2 gap-2">
              <Stat l="Permits pending" v={o.permitsPending.toLocaleString()} t={o.permitsPending > 1800 ? 'warn' : 'ok'} />
              <Stat l="Compliance" v={`${o.compliancePct}%`} t={o.compliancePct >= 80 ? 'ok' : 'warn'} />
            </div>
            <p className="mt-2 text-[9px] text-ink-muted">Severe hazards propagate to health, agriculture and logistics via the state fabric.</p>
          </Panel>
        </div>
        <RuntimeQueue scope={`${id}:${grp.key}`} kind={grp.key === 'permit' || grp.key === 'citizen' ? 'permit' : grp.key === 'command' ? 'incident' : 'case'} title={`${grp.name} runtime — executable workflow`} />
      </div>
    );
  }

  if (isTrade) {
    const o = tradeOps(id, ts);
    return (
      <div className="space-y-2">
        {header}
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-6">
          <Stat l="Trade balance" v={`${o.tradeBalanceIdx}`} t={o.tradeBalanceIdx >= 70 ? 'ok' : o.tradeBalanceIdx >= 50 ? 'warn' : 'alert'} />
          <Stat l="Export corridors" v={`${o.exports.corridorsOpen}/${o.exports.corridorsTotal}`} t={o.exports.corridorsOpen < o.exports.corridorsTotal ? 'warn' : 'ok'} />
          <Stat l="Export clearance" v={`${o.exports.clearanceDays}d`} t={o.exports.clearanceDays >= 10 ? 'alert' : o.exports.clearanceDays >= 5 ? 'warn' : 'ok'} />
          <Stat l="Businesses active" v={`${o.businessRegistry.activeM}M`} t="ok" />
          <Stat l="Registration median" v={`${o.businessRegistry.medianDays}d`} t={o.businessRegistry.medianDays >= 14 ? 'warn' : 'ok'} />
          <Stat l="Standards conformity" v={`${o.standards.conformityPct}%`} t={o.standards.conformityPct >= 85 ? 'ok' : 'warn'} />
        </div>
        <div className="grid gap-2 xl:grid-cols-3">
          <Panel title="Business registry" meta="enterprise lifecycle" bodyClass="!p-2">
            <div className="grid grid-cols-2 gap-2">
              <Stat l="New today" v={o.businessRegistry.newToday.toLocaleString()} t="ok" />
              <Stat l="Backlog" v={o.businessRegistry.backlog.toLocaleString()} t={o.businessRegistry.backlog > 2500 ? 'warn' : 'ok'} />
            </div>
          </Panel>
          <Panel title="Standards & metrology" meta="conformity assurance" bodyClass="!p-2">
            <div className="grid grid-cols-2 gap-2">
              <Stat l="Labs" v={`${o.standards.labs}`} t="ok" />
              <Stat l="Certs pending" v={o.standards.certificationsPending.toLocaleString()} t={o.standards.certificationsPending > 1200 ? 'warn' : 'ok'} />
            </div>
          </Panel>
          <Panel title="Industrial development" meta="parks · investment" bodyClass="!p-2">
            <div className="grid grid-cols-2 gap-2">
              <Stat l="Parks" v={`${o.industrialParks.parks}`} t="ok" />
              <Stat l="Occupancy" v={`${o.industrialParks.occupancyPct}%`} t={o.industrialParks.occupancyPct >= 70 ? 'ok' : 'warn'} />
              <Stat l="Investment idx" v={`${o.industrialParks.investmentIdx}`} t={o.industrialParks.investmentIdx >= 65 ? 'ok' : 'warn'} />
              <Stat l="Licences pending" v={o.licensing.pending.toLocaleString()} t={o.licensing.pending > 2000 ? 'warn' : 'ok'} />
            </div>
          </Panel>
        </div>
        <RuntimeQueue scope={`${id}:${grp.key}`} kind={grp.key === 'registry' || grp.key === 'licensing' || grp.key === 'citizen' ? 'permit' : grp.key === 'export' ? 'procurement' : 'case'} title={`${grp.name} runtime — executable workflow`} />
      </div>
    );
  }

  if (isLabor) {
    const o = laborOps(id, ts);
    return (
      <div className="space-y-2">
        {header}
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-6">
          <Stat l="Unemployment" v={`${o.unemploymentPct}%`} t={o.unemploymentPct >= 16 ? 'alert' : o.unemploymentPct >= 9 ? 'warn' : 'ok'} />
          <Stat l="Jobseekers" v={`${o.jobseekersM}M`} t="ok" />
          <Stat l="Placements today" v={o.placementsToday.toLocaleString()} t="ok" />
          <Stat l="Vacancies" v={o.vacancies.toLocaleString()} t="ok" />
          <Stat l="Inspection compliance" v={`${o.inspection.compliancePct}%`} t={o.inspection.compliancePct >= 80 ? 'ok' : 'warn'} />
          <Stat l="Insurance payout on-time" v={`${o.socialInsurance.payoutOnTimePct}%`} t={o.socialInsurance.payoutOnTimePct >= 90 ? 'ok' : 'warn'} />
        </div>
        <div className="grid gap-2 xl:grid-cols-3">
          <Panel title="Workplace inspection" meta="safety & compliance" bodyClass="!p-2">
            <div className="grid grid-cols-2 gap-2">
              <Stat l="Units active" v={`${o.inspection.unitsActive}`} t="ok" />
              <Stat l="Open cases" v={o.inspection.openCases.toLocaleString()} t={o.inspection.openCases > 1500 ? 'warn' : 'ok'} />
            </div>
          </Panel>
          <Panel title="Social insurance" meta="contributory funds" bodyClass="!p-2">
            <div className="grid grid-cols-2 gap-2">
              <Stat l="Funds" v={`$${o.socialInsurance.fundsBn}B`} t="ok" />
              <Stat l="Contributors" v={`${o.socialInsurance.contributorsM}M`} t="ok" />
              <Stat l="Claims pending" v={o.socialInsurance.claimsPending.toLocaleString()} t={o.socialInsurance.claimsPending > 6000 ? 'alert' : 'warn'} />
              <Stat l="Payout on-time" v={`${o.socialInsurance.payoutOnTimePct}%`} t={o.socialInsurance.payoutOnTimePct >= 90 ? 'ok' : 'warn'} />
            </div>
          </Panel>
          <Panel title="Dispute resolution & skills" meta="tribunals · training" bodyClass="!p-2">
            <div className="grid grid-cols-2 gap-2">
              <Stat l="Tribunals" v={`${o.disputes.tribunals}`} t="ok" />
              <Stat l="Open disputes" v={o.disputes.openDisputes.toLocaleString()} t={o.disputes.openDisputes > 3000 ? 'warn' : 'ok'} />
              <Stat l="Median resolution" v={`${o.disputes.medianDays}d`} t={o.disputes.medianDays >= 90 ? 'alert' : o.disputes.medianDays >= 45 ? 'warn' : 'ok'} />
              <Stat l="Skills training" v={o.skillsTrainingActive.toLocaleString()} t="ok" />
            </div>
          </Panel>
        </div>
        <RuntimeQueue scope={`${id}:${grp.key}`} kind={grp.key === 'disputes' ? 'case' : grp.key === 'insurance' ? 'approval' : grp.key === 'command' ? 'incident' : 'case'} title={`${grp.name} runtime — executable workflow`} />
      </div>
    );
  }

  // ── Generic deep environment — archetype-aware operating world ───────
  const ao = archetypeOperations(id, m.archetype, ts);
  return (
    <div className="space-y-2">
      {header}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-6">
        <Stat l="Posture" v={ao.command.posture} t={ao.command.postureTone} />
        <Stat l="Readiness" v={`${ao.command.readiness}%`} t={ao.command.readiness >= 70 ? 'ok' : ao.command.readiness >= 50 ? 'warn' : 'alert'} />
        <Stat l="Escalation tier" v={`L${ao.command.escalationTier}`} t={ao.command.escalationTier >= 2 ? 'alert' : ao.command.escalationTier === 1 ? 'warn' : 'ok'} />
        <Stat l="Mean operational" v={`${ao.meanOperational}%`} t={ao.meanOperational >= 78 ? 'ok' : ao.meanOperational >= 55 ? 'warn' : 'alert'} />
        <Stat l="Open requests" v={ao.citizen.openRequests.toLocaleString()} t="ok" />
        <Stat l="Budget pressure" v={`${ao.finance.budgetPressure}`} t={ao.finance.budgetPressure >= 65 ? 'alert' : ao.finance.budgetPressure >= 45 ? 'warn' : 'ok'} />
      </div>

      <div className="grid gap-2 xl:grid-cols-3">
        <Panel title={`${grp.name} — command centre`} meta={grp.purpose} bodyClass="!p-2">
          <div className="grid grid-cols-2 gap-2">
            <Stat l="Directives" v={`${ao.command.directives}`} t="ok" />
            <Stat l="Decision latency" v={`${ao.command.decisionLatencyMin}m`} t={ao.command.decisionLatencyMin >= 24 ? 'warn' : 'ok'} />
          </div>
          <div className="mt-1.5 text-[9px] text-ink-muted">▸ <span style={{ color: TONE.warn }}>AI advisory:</span> {ao.command.aiAdvisory}</div>
          <div className="mt-1.5 flex flex-wrap gap-1">
            {ao.command.chain.map((c, i) => (
              <span key={c} className="rounded-[3px] border border-line-soft bg-surface px-1.5 py-0.5 text-[8.5px] text-ink-soft">{i + 1}. {c}</span>
            ))}
          </div>
        </Panel>
        <Panel title="Operations centre" meta="live workflow queues" bodyClass="!p-0">
          {ao.queues.map(q => (
            <div key={q.label} className="border-b border-line-soft px-3 py-1.5 last:border-0">
              <div className="flex items-center justify-between text-[10px]">
                <span className="truncate text-ink-soft">{q.label}</span>
                <span className="font-mono tabular-nums" style={{ color: q.breaching ? TONE.alert : TONE.ok }}>{q.depth} · {q.oldestHrs}h/{q.slaHrs}h</span>
              </div>
              <div className="mt-0.5 h-1 overflow-hidden rounded-full bg-surface-2"><span className="block h-full" style={{ width: `${Math.min(100, (q.oldestHrs / q.slaHrs) * 100)}%`, backgroundColor: q.breaching ? TONE.alert : TONE.warn }} /></div>
            </div>
          ))}
        </Panel>
        <Panel title="Sector KPIs" meta="archetype signature" bodyClass="!p-2">
          <div className="grid grid-cols-2 gap-1">
            {ao.kpis.map(k => (
              <div key={k.label} className="rounded-[3px] border border-line-soft bg-surface-2/40 px-2 py-1">
                <div className="truncate text-[8px] uppercase tracking-wider text-ink-muted">{k.label}</div>
                <div className="font-mono text-[12px] tabular-nums" style={{ color: tc(k.tone) }}>{k.value}</div>
              </div>
            ))}
          </div>
        </Panel>
      </div>

      <div className="grid gap-2 xl:grid-cols-3">
        <Panel title="Personnel & field units" meta={`${ao.personnel.staffedPct}% staffed`} bodyClass="!p-2">
          <div className="space-y-1">
            {ao.personnel.units.map(u => (
              <div key={u.label} className="flex items-center gap-2 text-[10px]">
                <span className="min-w-0 flex-1 truncate text-ink-soft">{u.label}</span>
                <span className="font-mono tabular-nums" style={{ color: tc(u.tone) }}>{u.deployed}/{u.total}</span>
              </div>
            ))}
            <div className="mt-1 text-[9px] text-ink-muted">Vacancies {ao.personnel.vacanciesPct}% · on-duty {ao.personnel.onDuty.toLocaleString()}</div>
          </div>
        </Panel>
        <Panel title="Citizen services & logistics" meta="public continuity" bodyClass="!p-2">
          <div className="grid grid-cols-2 gap-2">
            <Stat l="SLA met" v={`${ao.citizen.slaMetPct}%`} t={ao.citizen.slaMetPct >= 85 ? 'ok' : 'warn'} />
            <Stat l="Satisfaction" v={`${ao.citizen.satisfactionPct}%`} t={ao.citizen.satisfactionPct >= 75 ? 'ok' : 'warn'} />
            <Stat l="Stock cover" v={`${ao.logistics.stockCoverDays}d`} t={ao.logistics.stockCoverDays >= 30 ? 'ok' : 'warn'} />
            <Stat l="Disruptions" v={`${ao.logistics.disruptions}`} t={ao.logistics.disruptions ? 'alert' : 'ok'} />
          </div>
        </Panel>
        <Panel title="Operational intelligence" meta="signals" bodyClass="!p-2">
          <div className="space-y-1">
            {ao.intelligence.map((s, i) => (
              <div key={i} className="flex items-start gap-1.5 text-[10px]">
                <span className="mt-0.5 h-1.5 w-1.5 shrink-0 rounded-full" style={{ backgroundColor: s.level === 'risk' ? TONE.alert : s.level === 'watch' ? TONE.warn : TONE.ok }} />
                <span className="min-w-0"><span className="block text-ink">{s.label}</span><span className="block truncate text-[8.5px] text-ink-muted">{s.detail}</span></span>
              </div>
            ))}
          </div>
        </Panel>
      </div>

      <div className="grid gap-2 xl:grid-cols-2">
        <Panel title="Regional operations" meta={`${grp.name} footprint`} bodyClass="!p-1.5">
          <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-3">
            {ao.regional.map(r => (
              <div key={r.region} className="rounded-[3px] border border-line-soft bg-surface-2/40 px-2 py-1.5">
                <div className="truncate text-[9px] font-semibold text-ink">{r.region}</div>
                <div className="font-mono text-[13px] tabular-nums" style={{ color: tc(r.tone) }}>{r.opPct}%</div>
                <div className="text-[8px] text-ink-muted">load {r.load}</div>
              </div>
            ))}
          </div>
        </Panel>
        <Panel title="Subsystem inventory" meta="institutional machinery" bodyClass="!p-0">
          <div className="max-h-[220px] overflow-y-auto">
            {ao.inventory.map(s => (
              <div key={s.name} className="flex items-center gap-2 border-b border-line-soft px-3 py-1.5 last:border-0 text-[10px]">
                <span className="min-w-0 flex-1 truncate text-ink-soft">{s.name}</span>
                <span className="shrink-0 font-mono tabular-nums text-ink-muted">{s.count.toLocaleString()} {s.unit}</span>
                <span className="w-9 shrink-0 text-right font-mono tabular-nums" style={{ color: tc(s.tone) }}>{s.opPct}%</span>
              </div>
            ))}
          </div>
        </Panel>
      </div>

      {(() => {
        const k: WorkKind =
          grp.key === 'regulatory' ? 'permit'
            : grp.key === 'procurement' ? 'procurement'
              : grp.key === 'command' ? 'incident'
                : grp.key === 'citizen' ? 'approval'
                  : grp.key === 'audit' ? 'case'
                    : 'case';
        return <RuntimeQueue scope={`${id}:${grp.key}`} kind={k} title={`${grp.name} runtime — executable workflow`} />;
      })()}

      <p className="text-[10px] text-ink-muted">
        {grp.name}: {grp.systems.length} systems ({grp.systems.map(s => systemKindLabel(s.kind)).filter((v, i, a) => a.indexOf(v) === i).join(' · ')}). Generated from the {m.archetype} archetype — a sovereign operational environment, not a page. Groups: {blueprintFor(m.archetype).map(g => g.name).join(' · ')}.
      </p>
    </div>
  );
}
