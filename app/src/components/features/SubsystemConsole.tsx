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

  // ── Generic deep environment (other archetypes / groups) ─────────────
  return (
    <div className="space-y-2">
      {header}
      <p className="text-[11px] text-ink-muted">
        {grp.purpose}. {grp.systems.length} operational systems · {eco.activated ? `${grp.health}% group health` : 'awaiting activation'}.
      </p>
      <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
        {grp.systems.map(s => {
          const st = s.status === 'operational' ? 'ok' : s.status === 'degraded' ? 'alert' : 'warn';
          return (
            <Panel key={s.name} title={s.name} meta={systemKindLabel(s.kind)} bodyClass="!p-2">
              <div className="flex items-center justify-between text-[10px]">
                <span className="uppercase tracking-wider" style={{ color: tc(st as 'ok' | 'warn' | 'alert') }}>{s.status}</span>
                <span className="font-mono tabular-nums" style={{ color: tc(st as 'ok' | 'warn' | 'alert') }}>{s.status === 'provisioning' ? '—' : `${s.uptime}%`}</span>
              </div>
              <div className="mt-1 h-6 overflow-hidden opacity-80"><Spark pts={waveSeries(`sub:${id}:${grp.key}:${s.name}`, ts, 20, 35, 92)} tone={st as 'ok' | 'warn' | 'alert'} /></div>
            </Panel>
          );
        })}
      </div>
      <p className="text-[10px] text-ink-muted">
        Deep operational environments are generated per archetype. {m.archetype === 'HEALTH' ? '' : `${m.archetype} world consoles instantiate as the archetype expands.`} Blueprint groups: {blueprintFor(m.archetype).map(g => g.name).join(' · ')}.
      </p>
    </div>
  );
}
