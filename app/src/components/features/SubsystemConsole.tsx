'use client';

import * as React from 'react';
import Link from 'next/link';
import { api } from '@/lib/api/client';
import { TONE, Panel, Spark, waveSeries } from '@/components/features/SituationRoom';
import { instantiateMinistry, systemKindLabel, blueprintFor } from '@/lib/institution/blueprint';
import {
  doctorRoster, intakeQueue, referrals, prescriptions, labRequests,
  workloadIntelligence, hospitalOps, diseaseIntel, patientServices,
} from '@/lib/gov/health-systems';
import {
  fiscalCommand, revenueOps, budgetOps, procurementOps, bankingRails,
  citizenFinance, fiscalAssurance,
} from '@/lib/gov/treasury-systems';
import { archetypeOperations } from '@/lib/gov/archetype-operations';
import { schoolNetwork, examOps, teacherOps, studentServices } from '@/lib/gov/education-systems';
import { transportOps } from '@/lib/gov/transport-systems';
import { energyOps } from '@/lib/gov/energy-systems';
import { interiorOps } from '@/lib/gov/interior-systems';
import { agricultureOps } from '@/lib/gov/agriculture-systems';
import { justiceOps } from '@/lib/gov/justice-systems';
import { environmentOps } from '@/lib/gov/environment-systems';
import { tradeOps } from '@/lib/gov/trade-systems';
import { laborOps } from '@/lib/gov/labor-systems';
import { RuntimeQueue } from '@/components/features/RuntimeQueue';
import type { WorkKind } from '@/lib/gov/runtime-workflow';
import type { Ministry } from '@/lib/api/types';

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
  const [m, setM] = React.useState<Ministry | null>(null);
  const [now, setNow] = React.useState(() => Date.now());
  React.useEffect(() => {
    api.org.get(id).then(r => setM(r.ministry)).catch(() => {});
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [id]);

  const ts = now / 4000;
  if (!m) return <p className="text-[11px] text-ink-muted">Loading institution…</p>;

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
                return (
                  <div key={d.id} className="flex items-center gap-2 border-b border-line-soft px-3 py-1.5 last:border-0">
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

  if (isHealth && (group === 'patient' || group === 'pharma' || group === 'finance' || group === 'regulatory')) {
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

  if (isHealth && (group === 'hospitals' || group === 'command' || group === 'emergency')) {
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
      </div>
    );
  }

  if (isHealth && (group === 'disease' || group === 'lab')) {
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
              {bg.byMinistry.map(b => (
                <div key={b.ministry} className="flex items-center gap-2 text-[10px]">
                  <span className="w-20 shrink-0 truncate text-ink-soft">{b.ministry}</span>
                  <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-surface-2"><span className="block h-full" style={{ width: `${b.execPct}%`, backgroundColor: tc(b.tone) }} /></div>
                  <span className="w-8 shrink-0 text-right font-mono tabular-nums" style={{ color: tc(b.tone) }}>{b.execPct}</span>
                </div>
              ))}
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
