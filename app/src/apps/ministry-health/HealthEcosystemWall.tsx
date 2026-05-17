'use client';

// Sovereign Healthcare Operating Ecosystem — the master operational wall.
// One cinematic command surface tiling all nine federated health domains as
// live preview modules. Dark sovereign UI, real deterministic engines, real
// maps. Built to the reference concept; not a dashboard, not a website.

import * as React from 'react';
import Link from 'next/link';
import { GeoMap } from '@/apps/_shared/GeoMap';
import { healthGeo } from '@/lib/gov/health-geo';
import { KpiSpark, Donut, TrendChart, RingGauge, Sparkline, sc, type Tone } from '@/apps/_shared/SovereignUI';
import {
  nationalSituation, clinicianWorkstation, citizenPortalView, diseaseCommandView,
  emergencyCommandView, pharmaSupplyCommand, healthFinanceExecution, publicHealthSite,
} from '@/lib/gov/health-operations';
import { hospitalOps } from '@/lib/gov/health-systems';
import { waveSeries } from '@/lib/telemetry';

const ID = 'health';
const ACC = {
  command: '#37c7d4', hospital: '#3fd6a8', doctor: '#5fa8ff', citizen: '#36d39b',
  disease: '#f0892a', emergency: '#ff5d5d', pharma: '#2fd0c8', finance: '#54d08f', portal: '#1f5fad',
};

function Glow({ a }: { a: string }) {
  return <span className="h-2.5 w-0.5 rounded-full" style={{ background: a, boxShadow: `0 0 8px ${a}` }} />;
}

function Tile({
  n, title, sub, accent, posture, postureTone, nav, navActive, time, span, children,
}: {
  n: number; title: string; sub: string; accent: string; posture: string; postureTone: Tone;
  nav: string[]; navActive: string; time: string; span?: string; children: React.ReactNode;
}) {
  return (
    <section className={`flex min-w-0 flex-col overflow-hidden rounded-[14px] border ${span ?? ''}`}
      style={{
        borderColor: 'color-mix(in srgb,#1d3548 70%,transparent)',
        background: `linear-gradient(150deg,#070b12,#0a1019 55%,color-mix(in srgb,${accent} 7%,#0a1019))`,
        boxShadow: `0 0 0 1px color-mix(in srgb,${accent} 12%,transparent), inset 0 1px 0 rgba(255,255,255,0.03), 0 18px 40px -24px ${accent}`,
      }}>
      {/* module header strip */}
      <div className="flex items-center gap-2 border-b px-3 py-2"
        style={{ borderColor: 'color-mix(in srgb,#1d3548 55%,transparent)', background: `linear-gradient(100deg,#080d15,color-mix(in srgb,${accent} 9%,#0b1320))` }}>
        <span className="grid h-5 w-5 shrink-0 place-items-center rounded-full text-[10px] font-bold tabular-nums"
          style={{ color: accent, border: `1px solid ${accent}`, boxShadow: `0 0 10px color-mix(in srgb,${accent} 55%,transparent)` }}>{n}</span>
        <div className="min-w-0 flex-1">
          <div className="truncate text-[11px] font-bold uppercase tracking-[0.18em] text-ink"
            style={{ textShadow: `0 0 12px color-mix(in srgb,${accent} 45%,transparent)` }}>{title}</div>
          <div className="truncate text-[8px] uppercase tracking-[0.16em] text-ink-muted">{sub}</div>
        </div>
        <span className="hidden shrink-0 rounded-[3px] px-1.5 py-0.5 text-[7px] font-bold uppercase tracking-[0.16em] sm:inline"
          style={{ background: `color-mix(in srgb,${sc(postureTone)} 18%,transparent)`, color: sc(postureTone) }}>{posture}</span>
        <span className="hidden shrink-0 items-center gap-1 text-[7.5px] font-bold uppercase tracking-[0.16em] text-ink-muted md:flex">
          <span className="h-1.5 w-1.5 rounded-full animate-breathe" style={{ background: sc('ok') }} />live
        </span>
        <span className="hidden shrink-0 font-mono text-[7.5px] tabular-nums text-ink-muted lg:inline">{time}</span>
      </div>
      {/* body: nav rail + content */}
      <div className="flex min-h-0 flex-1">
        <nav className="hidden w-[92px] shrink-0 flex-col gap-0.5 border-r px-1.5 py-2 sm:flex"
          style={{ borderColor: 'color-mix(in srgb,#1d3548 45%,transparent)' }}>
          {nav.map(it => {
            const on = it === navActive;
            return (
              <span key={it}
                className="truncate rounded-[3px] px-1.5 py-1 text-[8px] tracking-wide"
                style={on
                  ? { color: accent, background: `color-mix(in srgb,${accent} 14%,transparent)`, boxShadow: `inset 2px 0 0 ${accent}` }
                  : { color: 'rgb(var(--c-ink-muted))' }}>{it}</span>
            );
          })}
        </nav>
        <div className="min-w-0 flex-1 space-y-1.5 p-1.5">{children}</div>
      </div>
    </section>
  );
}

function Kpi({ label, value, unit, tone, points }: { label: string; value: string; unit?: string; tone: Tone; points?: number[] }) {
  return <KpiSpark label={label} value={value} unit={unit} tone={tone} points={points} />;
}

function PanelLabel({ children, accent }: { children: React.ReactNode; accent: string }) {
  return (
    <div className="flex items-center gap-1.5">
      <Glow a={accent} />
      <span className="text-[8.5px] font-bold uppercase tracking-[0.18em] text-ink-soft">{children}</span>
    </div>
  );
}

function Bar({ label, pct, tone, tail }: { label: string; pct: number; tone: Tone; tail: string }) {
  return (
    <div className="flex items-center gap-2 text-[8.5px]">
      <span className="w-24 shrink-0 truncate text-ink-soft">{label}</span>
      <div className="h-1.5 flex-1 overflow-hidden rounded-full" style={{ background: '#16222e' }}>
        <span className="block h-full rounded-full" style={{ width: `${Math.min(100, Math.max(3, pct))}%`, background: sc(tone), boxShadow: `0 0 6px ${sc(tone)}` }} />
      </div>
      <span className="w-12 shrink-0 text-right font-mono tabular-nums" style={{ color: sc(tone) }}>{tail}</span>
    </div>
  );
}

export function HealthEcosystemWall() {
  const [now, setNow] = React.useState(() => Date.now());
  React.useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);
  const ts = now / 4000;
  const time = new Date(now).toLocaleTimeString('en-GB', { hour12: false });

  const geo = healthGeo(ID, ts);
  const ns = nationalSituation(ID, ts);
  const ho = hospitalOps(ID, ts);
  const cw = clinicianWorkstation(ID, ts);
  const cp = citizenPortalView(ID, ts);
  const di = diseaseCommandView(ID, ts);
  const er = emergencyCommandView(ID, ts);
  const ph = pharmaSupplyCommand(ID, ts);
  const fi = healthFinanceExecution(ID, ts);
  const pub = publicHealthSite(ts);

  const sp = (k: string, lo = 30, hi = 85) => waveSeries(`hew:${k}`, ts, 18, lo, hi);
  const criticalRegions = ns.regions.filter(r => r.state === 'critical').length;
  const nhi = Math.max(40, Math.round(100 - ns.mortalityIndex - ns.nationalBedPressure * 0.18));
  const inc = er.incidents[0];

  return (
    <div className="min-h-screen text-ink"
      style={{
        background:
          'radial-gradient(1200px 600px at 18% -10%, #0c1a2b 0%, transparent 60%),' +
          'radial-gradient(1100px 700px at 92% 8%, #0a1622 0%, transparent 55%),' +
          'linear-gradient(180deg,#04070d 0%,#05090f 100%)',
      }}>
      <div className="pointer-events-none fixed inset-0 opacity-[0.06]"
        style={{ backgroundImage: 'linear-gradient(#2bd3e8 1px,transparent 1px),linear-gradient(90deg,#2bd3e8 1px,transparent 1px)', backgroundSize: '46px 46px' }} />

      {/* GLOBAL COMMAND HEADER */}
      <header className="sticky top-0 z-20 flex flex-wrap items-center gap-3 border-b px-5 py-3 backdrop-blur"
        style={{ borderColor: 'color-mix(in srgb,#1d3548 70%,transparent)', background: 'linear-gradient(100deg,rgba(6,10,18,0.92),rgba(8,16,28,0.92))' }}>
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full text-[15px]"
          style={{ border: '1px solid #2fd0e8', color: '#2fd0e8', boxShadow: '0 0 18px rgba(47,208,232,0.45)' }}>✚</span>
        <div className="min-w-0">
          <h1 className="text-[14px] font-bold uppercase tracking-[0.22em] sm:text-[16px]"
            style={{ textShadow: '0 0 18px rgba(47,208,232,0.4)' }}>
            Ministry of Health — Sovereign Healthcare Operating Ecosystem
          </h1>
          <div className="text-[8.5px] uppercase tracking-[0.3em] text-ink-muted">Visual Design Concepts — Operational Domains</div>
        </div>
        <div className="ml-auto flex flex-wrap items-center gap-x-4 gap-y-1 text-[9px] font-semibold uppercase tracking-[0.16em] text-ink-muted">
          {[
            ['◈', 'AI Powered'], ['◉', 'Real-Time'], ['◍', 'National Scale'], ['⬡', 'Interoperable'], ['⬢', 'Secure'],
          ].map(([ic, lb], i) => (
            <React.Fragment key={lb}>
              {i > 0 ? <span className="h-3 w-px bg-[#1d3548]" /> : null}
              <span className="inline-flex items-center gap-1.5">
                <span style={{ color: '#2fd0e8', textShadow: '0 0 8px rgba(47,208,232,0.6)' }}>{ic}</span>{lb}
              </span>
            </React.Fragment>
          ))}
          <span className="hidden h-3 w-px bg-[#1d3548] xl:block" />
          <span className="hidden font-mono tabular-nums text-ink-soft xl:inline">{time}</span>
        </div>
      </header>

      {/* OPERATIONAL GRID — 3 rows × 3 modules */}
      <main className="relative z-10 grid grid-cols-1 gap-1.5 p-1.5 lg:grid-cols-2 2xl:grid-cols-3">

        {/* 1 — NATIONAL HEALTH COMMAND */}
        <Tile n={1} title="National Health Command" sub="National Situation Room"
          accent={ACC.command} posture={ns.posture} postureTone={ns.posture === 'crisis' ? 'alert' : ns.posture === 'elevated' ? 'warn' : 'ok'}
          time={time} navActive="Situation Room"
          nav={['National Command', 'Situation Room', 'Executive Briefing', 'National Grid', 'Alerts & Directives', 'Escalations', 'Interventions', 'AI Insights', 'Reports', 'Settings']}>
          <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-3 xl:grid-cols-5">
            <Kpi label="Health Index" value={`${nhi}`} tone={nhi >= 70 ? 'ok' : nhi >= 55 ? 'warn' : 'alert'} points={sp('nhi', 55, 85)} />
            <Kpi label="Critical Alerts" value={`${criticalRegions}`} tone={criticalRegions ? 'alert' : 'ok'} points={sp('alr', 0, 40)} />
            <Kpi label="ICU Occupancy" value={`${ns.nationalIcuLoad}`} unit="%" tone={ns.nationalIcuLoad >= 88 ? 'alert' : ns.nationalIcuLoad >= 75 ? 'warn' : 'ok'} points={sp('icu', 60, 95)} />
            <Kpi label="Outbreak Risk" value={ns.activeOutbreaks >= 8 ? 'HIGH' : ns.activeOutbreaks >= 4 ? 'MED' : 'LOW'} tone={ns.activeOutbreaks >= 8 ? 'alert' : ns.activeOutbreaks >= 4 ? 'warn' : 'ok'} />
            <Kpi label="Disaster" value={ns.disasterState === 'national-disaster' ? 'L3' : ns.disasterState === 'emergency' ? 'L2' : ns.disasterState === 'watch' ? 'L1' : 'L0'} tone={ns.disasterState === 'normal' ? 'ok' : ns.disasterState === 'watch' ? 'warn' : 'alert'} />
          </div>
          <div className="overflow-hidden rounded-[6px] border" style={{ borderColor: 'color-mix(in srgb,#1d3548 55%,transparent)' }}>
            <GeoMap geo={geo} metric="pressure" title="" height={210} />
          </div>
          <div className="grid grid-cols-2 gap-2 xl:grid-cols-4">
            {[['ICU load', 'icul', 'alert'], ['ER load', 'erl', 'warn'], ['Ventilators', 'vent', 'ok'], ['Staffing', 'stf', 'ok']].map(([l, k, tn]) => (
              <div key={l} className="rounded-[4px] border px-2 py-1.5" style={{ borderColor: 'color-mix(in srgb,#1d3548 50%,transparent)' }}>
                <div className="text-[7.5px] uppercase tracking-[0.14em] text-ink-muted">{l}</div>
                <Sparkline points={sp(k as string, 40, 92)} tone={tn as Tone} width={92} height={20} />
              </div>
            ))}
          </div>
          <PanelLabel accent={ACC.command}>AI recommendations</PanelLabel>
          <div className="space-y-1">
            {[`Redirect ICU patients from ${ns.worstRegion} to relief corridor`, 'Activate emergency medicine reserve (EMR)', 'Escalate genomic surveillance in capital district'].map((r, i) => (
              <div key={r} className="flex items-center gap-2 rounded-[3px] border px-2 py-1 text-[8.5px]" style={{ borderColor: 'color-mix(in srgb,#1d3548 50%,transparent)', borderLeft: `2px solid ${i === 0 ? sc('alert') : sc('warn')}` }}>
                <span className="min-w-0 flex-1 truncate text-ink-soft">{r}</span>
                <span className="shrink-0 rounded-[2px] px-1.5 py-0.5 text-[7px] font-bold uppercase" style={{ border: `1px solid ${ACC.command}`, color: ACC.command }}>{i === 0 ? 'Approve' : 'Review'}</span>
              </div>
            ))}
          </div>
        </Tile>

        {/* 2 — HOSPITAL OPERATIONS */}
        <Tile n={2} title="Hospital Operations" sub="Hospital Network Command"
          accent={ACC.hospital} posture={ho.loadBalanceTone === 'alert' ? 'STRAINED' : ho.loadBalanceTone === 'warn' ? 'BUSY' : 'BALANCED'}
          postureTone={ho.loadBalanceTone} time={time} navActive="Overview"
          nav={['Overview', 'ICU Command', 'Theatres', 'Bed Management', 'ER Command', 'Transfers', 'Ambulances', 'Staffing', 'Wards', 'Supply', 'Reports']}>
          <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-3 xl:grid-cols-5">
            <Kpi label="Hospitals" value={`${geo.regions.length * 27}`} tone="ok" points={sp('hsp', 60, 80)} />
            <Kpi label="Total Beds" value={ho.beds.total.toLocaleString()} tone="ok" points={sp('bed', 50, 85)} />
            <Kpi label="ICU Occupancy" value={`${ho.icu.occupancyPct}`} unit="%" tone={ho.icu.occupancyPct >= 90 ? 'alert' : ho.icu.occupancyPct >= 78 ? 'warn' : 'ok'} points={sp('ico', 65, 95)} />
            <Kpi label="Available Beds" value={(ho.beds.total - ho.beds.occupied).toLocaleString()} tone={ho.beds.occupancyPct >= 90 ? 'warn' : 'ok'} points={sp('avb', 30, 70)} />
            <Kpi label="ER Wait" value={`${ho.ambulances.meanResponseMin}`} unit="min" tone={ho.ambulances.meanResponseMin >= 22 ? 'alert' : 'warn'} points={sp('erw', 40, 80)} />
          </div>
          <div className="overflow-hidden rounded-[6px] border" style={{ borderColor: 'color-mix(in srgb,#1d3548 55%,transparent)' }}>
            <GeoMap geo={geo} metric="icuLoad" title="" height={210} />
          </div>
          <div className="grid gap-2 xl:grid-cols-2">
            <div className="space-y-1">
              <PanelLabel accent={ACC.hospital}>ICU occupancy by region</PanelLabel>
              {ns.regions.slice(0, 5).map(r => (
                <Bar key={r.region} label={r.region} pct={r.icuPressure} tone={r.tone} tail={`${r.icuPressure}%`} />
              ))}
            </div>
            <div>
              <PanelLabel accent={ACC.hospital}>Theatre utilisation</PanelLabel>
              <div className="mt-1">
                <Donut total={ho.theatres.utilisationPct} label="util %" size={104}
                  segments={[
                    { label: 'Active', value: ho.theatres.active, tone: 'ok' },
                    { label: 'Scheduled', value: ho.theatres.scheduledToday, tone: 'warn' },
                    { label: 'Idle', value: Math.max(0, ho.theatres.total - ho.theatres.active), tone: 'alert' },
                  ]} />
              </div>
            </div>
          </div>
        </Tile>

        {/* 3 — DOCTOR WORKSPACE */}
        <Tile n={3} title="Doctor Workspace" sub="Clinical Command Center"
          accent={ACC.doctor} posture={cw.patient.riskBand === 'High' ? 'HIGH RISK' : 'CLINICAL'}
          postureTone={cw.patient.riskBand === 'High' ? 'alert' : 'ok'} time={time} navActive="Patient Queue"
          nav={['Dashboard', 'Patient Queue', 'Patients', 'Diagnostics', 'Lab Results', 'Imaging', 'Prescriptions', 'Referrals', 'Messages', 'Protocols', 'AI Assistant']}>
          <div className="flex items-center gap-2 rounded-[5px] border px-2 py-1.5" style={{ borderColor: 'color-mix(in srgb,#1d3548 55%,transparent)', background: '#0b1320' }}>
            <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full text-[11px] font-bold" style={{ background: `color-mix(in srgb,${ACC.doctor} 20%,transparent)`, color: ACC.doctor }}>{cw.patient.attending.split(' ').map(s => s[0]).slice(0, 2).join('')}</span>
            <div className="min-w-0 flex-1">
              <div className="truncate text-[10px] font-semibold text-ink">{cw.patient.attending}</div>
              <div className="truncate text-[8px] text-ink-muted">Attending · {cw.patient.ward}</div>
            </div>
          </div>
          <div className="grid grid-cols-4 gap-1.5">
            <Kpi label="Patients" value={`${cw.queueCount}`} tone="ok" />
            <Kpi label="Crit Alerts" value={`${cw.patient.alerts.length}`} tone={cw.patient.alerts.length ? 'alert' : 'ok'} />
            <Kpi label="Pending" value={`${cw.resultsPending}`} tone={cw.resultsPending ? 'warn' : 'ok'} />
            <Kpi label="Orders" value={`${cw.ordersPending}`} tone={cw.ordersPending ? 'warn' : 'ok'} />
          </div>
          <div className="grid gap-2 xl:grid-cols-3">
            <div className="space-y-1 xl:col-span-2">
              <PanelLabel accent={ACC.doctor}>Patient queue</PanelLabel>
              {cw.queue.slice(0, 5).map(q => (
                <div key={q.id} className="flex items-center gap-2 rounded-[3px] border px-2 py-1 text-[9px]" style={{ borderColor: 'color-mix(in srgb,#1d3548 45%,transparent)' }}>
                  <span className="min-w-0 flex-1 truncate text-ink-soft">{q.name}</span>
                  <span className="shrink-0 text-[8px] text-ink-muted">{q.ward} · {q.time}</span>
                  <span className="shrink-0 rounded-[2px] px-1.5 py-0.5 text-[7px] font-bold uppercase" style={{ background: `color-mix(in srgb,${sc(q.tone)} 18%,transparent)`, color: sc(q.tone) }}>{q.acuity}</span>
                </div>
              ))}
            </div>
            <div className="rounded-[5px] border p-2" style={{ borderColor: 'color-mix(in srgb,#1d3548 55%,transparent)' }}>
              <PanelLabel accent={ACC.doctor}>Patient summary</PanelLabel>
              <div className="mt-1 truncate text-[10px] font-semibold text-ink">{cw.patient.name}</div>
              <div className="text-[8px] text-ink-muted">{cw.patient.age}{cw.patient.sex[0]} · {cw.patient.blood} · {cw.patient.chiefComplaint}</div>
              <div className="mt-2 flex items-center gap-2">
                <RingGauge value={cw.patient.riskScore} label="risk" tone={cw.patient.riskBand === 'High' ? 'alert' : cw.patient.riskBand === 'Moderate' ? 'warn' : 'ok'} size={64} sub={cw.patient.riskBand} />
                <div className="min-w-0 text-[8px] text-ink-soft">{cw.patient.ai.recommended.slice(0, 3).map(r => <div key={r} className="truncate">• {r}</div>)}</div>
              </div>
            </div>
          </div>
        </Tile>

        {/* 4 — CITIZEN HEALTH PORTAL */}
        <Tile n={4} title="Citizen Health Portal" sub="Your Health, Your Rights"
          accent={ACC.citizen} posture={cp.healthBand.toUpperCase()} postureTone={cp.healthBand === 'Low' ? 'alert' : cp.healthBand === 'Fair' ? 'warn' : 'ok'}
          time={time} navActive="Overview"
          nav={['Overview', 'Appointments', 'Prescriptions', 'Health Records', 'Lab Reports', 'Vaccinations', 'Insurance', 'Telemedicine', 'Reminders', 'Emergency ID', 'Settings']}>
          <div className="grid gap-2 sm:grid-cols-3">
            <div className="space-y-2 sm:col-span-2">
              <div className="rounded-[6px] border px-2.5 py-2" style={{ borderColor: 'color-mix(in srgb,#1d3548 55%,transparent)', background: '#0b1320' }}>
                <div className="text-[9px] text-ink-muted">Welcome,</div>
                <div className="text-[12px] font-semibold text-ink">{cp.name}</div>
                <div className="font-mono text-[8px] text-ink-muted">HEALTH ID · {cp.healthId}</div>
              </div>
              <div className="grid grid-cols-3 gap-1.5 text-center text-[8px]">
                {['Book Appointment', 'Teleconsult', 'My Prescriptions'].map(a => (
                  <div key={a} className="rounded-[4px] border px-1 py-2 text-ink-soft" style={{ borderColor: 'color-mix(in srgb,#1d3548 50%,transparent)' }}>{a}</div>
                ))}
              </div>
              <div className="rounded-[5px] border p-2" style={{ borderColor: 'color-mix(in srgb,#1d3548 50%,transparent)' }}>
                <div className="text-[8px] uppercase tracking-[0.14em] text-ink-muted">Upcoming appointment</div>
                <div className="text-[9.5px] text-ink-soft">{cp.upcoming.spec} · {cp.upcoming.doctor}</div>
                <div className="text-[8px] text-ink-muted">{cp.upcoming.date} · {cp.upcoming.time} · {cp.upcoming.place}</div>
              </div>
            </div>
            <div className="flex flex-col items-center justify-center rounded-[6px] border py-2" style={{ borderColor: 'color-mix(in srgb,#1d3548 55%,transparent)' }}>
              <RingGauge value={cp.healthScore} label="score" tone={cp.healthBand === 'Low' ? 'alert' : cp.healthBand === 'Fair' ? 'warn' : 'ok'} size={92} sub={cp.healthBand} />
            </div>
          </div>
          <div className="grid gap-2 xl:grid-cols-2">
            <div className="space-y-1">
              <PanelLabel accent={ACC.citizen}>Health timeline</PanelLabel>
              {cp.timeline.slice(0, 4).map((tl, i) => (
                <div key={i} className="flex items-center gap-2 text-[8.5px]">
                  <span className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: sc(tl.tone) }} />
                  <span className="min-w-0 flex-1 truncate text-ink-soft">{tl.detail}</span>
                  <span className="shrink-0 text-ink-muted">{tl.date}</span>
                </div>
              ))}
            </div>
            <div>
              <PanelLabel accent={ACC.citizen}>Insurance coverage</PanelLabel>
              <div className="mt-1 text-[9px] text-ink-soft">{cp.insurance.plan}</div>
              <Bar label="Coverage used" pct={cp.insurance.coverageUsedPct} tone={cp.insurance.coverageUsedPct >= 80 ? 'alert' : 'ok'} tail={`${cp.insurance.coverageUsedPct}%`} />
              <div className="mt-1 text-[8px] text-ink-muted">Valid till {cp.insurance.validTill} · {cp.insurance.policyNo}</div>
            </div>
          </div>
        </Tile>

        {/* 5 — DISEASE INTELLIGENCE */}
        <Tile n={5} title="Disease Intelligence" sub="Epidemiology & Outbreak Intelligence"
          accent={ACC.disease} posture="SURVEILLANCE" postureTone="warn" time={time} navActive="Overview"
          nav={['Overview', 'Outbreaks', 'Surveillance', 'Genomics', 'Forecasting', 'Interventions', 'Reports', 'Alerts', 'Settings']}>
          <div className="grid grid-cols-3 gap-1.5 xl:grid-cols-6">
            {di.kpis.slice(0, 6).map(k => (
              <Kpi key={k.label} label={k.label} value={k.value} tone={k.tone} points={k.series} />
            ))}
          </div>
          <div className="overflow-hidden rounded-[6px] border" style={{ borderColor: 'color-mix(in srgb,#1d3548 55%,transparent)' }}>
            <GeoMap geo={geo} metric="outbreakHeat" title="" height={210} />
          </div>
          <div className="grid gap-2 xl:grid-cols-2">
            <div>
              <PanelLabel accent={ACC.disease}>Epidemic curve</PanelLabel>
              <div className="mt-1">
                <TrendChart height={86} series={[
                  { name: 'Daily cases', points: di.epidemicCurve.cases, tone: 'alert' },
                  { name: '7-day avg', points: di.epidemicCurve.avg, tone: 'warn' },
                ]} />
              </div>
            </div>
            <div>
              <PanelLabel accent={ACC.disease}>Predictive spread (7d)</PanelLabel>
              <div className="mt-1">
                <TrendChart height={86} series={[
                  { name: 'Observed', points: di.predictive.observed, tone: 'info' },
                  { name: 'Best', points: di.predictive.best, tone: 'ok' },
                  { name: 'Worst', points: di.predictive.worst, tone: 'alert' },
                ]} />
              </div>
            </div>
          </div>
        </Tile>

        {/* 6 — EMERGENCY RESPONSE */}
        <Tile n={6} title="Emergency Response" sub="Incident Command System"
          accent={ACC.emergency} posture={`${er.alerts.length} ALERTS`} postureTone="alert" time={time} navActive="Dashboard"
          nav={['Dashboard', 'Incidents', 'Dispatch', 'Ambulances', 'Responders', 'Hospitals', 'Resources', 'Disasters', 'Reports', 'Settings']}>
          {inc ? (
            <div className="flex items-center gap-2 rounded-[5px] border px-2.5 py-1.5"
              style={{ borderColor: sc(inc.tone), background: `color-mix(in srgb,${sc(inc.tone)} 12%,#0b1118)` }}>
              <span className="h-2 w-2 shrink-0 animate-pulse rounded-full" style={{ background: sc(inc.tone) }} />
              <div className="min-w-0 flex-1">
                <div className="truncate text-[10px] font-bold uppercase tracking-wide text-ink">{inc.title}</div>
                <div className="truncate text-[8px] text-ink-muted">{inc.place} · {inc.status}</div>
              </div>
              <span className="shrink-0 text-[8px] font-bold uppercase" style={{ color: sc(inc.tone) }}>{inc.severity}</span>
            </div>
          ) : null}
          <div className="grid grid-cols-3 gap-1.5 xl:grid-cols-6">
            {er.kpis.slice(0, 6).map(k => (
              <Kpi key={k.label} label={k.label} value={k.value} tone={k.tone} points={k.series} />
            ))}
          </div>
          <div className="overflow-hidden rounded-[6px] border" style={{ borderColor: 'color-mix(in srgb,#1d3548 55%,transparent)' }}>
            <GeoMap geo={geo} metric="pressure" title="" height={210} />
          </div>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {er.resources.slice(0, 4).map(r => (
              <div key={r.kind} className="rounded-[4px] border px-2 py-1.5" style={{ borderColor: 'color-mix(in srgb,#1d3548 50%,transparent)', borderLeft: `2px solid ${sc(r.tone)}` }}>
                <div className="text-[7.5px] uppercase tracking-[0.12em] text-ink-muted">{r.kind}</div>
                <div className="font-mono text-[12px] text-ink">{r.have}/{r.total}</div>
              </div>
            ))}
          </div>
          <div className="flex gap-2">
            <button className="flex-1 rounded-[3px] py-1 text-[8px] font-bold uppercase tracking-[0.14em]" style={{ background: `color-mix(in srgb,${sc('ok')} 18%,transparent)`, color: sc('ok') }}>Approve escalation</button>
            <button className="flex-1 rounded-[3px] py-1 text-[8px] font-bold uppercase tracking-[0.14em]" style={{ background: `color-mix(in srgb,${sc('alert')} 18%,transparent)`, color: sc('alert') }}>Reject</button>
          </div>
        </Tile>

        {/* 7 — PHARMACEUTICAL & SUPPLY CHAIN */}
        <Tile n={7} title="Pharmaceutical & Supply Chain" sub="Medicine Availability & Logistics"
          accent={ACC.pharma} posture={`SC ${ph.scHealth}`} postureTone={ph.scHealth >= 80 ? 'ok' : ph.scHealth >= 60 ? 'warn' : 'alert'}
          time={time} navActive="Overview"
          nav={['Overview', 'Inventory', 'Procurement', 'Distribution', 'Warehouses', 'Cold Chain', 'Shortages', 'Reports']}>
          <div className="grid grid-cols-3 gap-1.5 xl:grid-cols-5">
            {ph.kpis.slice(0, 5).map(k => (
              <Kpi key={k.label} label={k.label} value={k.value} tone={k.tone} points={k.series} />
            ))}
          </div>
          <div className="overflow-hidden rounded-[6px] border" style={{ borderColor: 'color-mix(in srgb,#1d3548 55%,transparent)' }}>
            <GeoMap geo={geo} metric="pressure" title="" height={200} />
          </div>
          <div className="grid gap-2 xl:grid-cols-2">
            <div className="space-y-1">
              <PanelLabel accent={ACC.pharma}>Critical shortages</PanelLabel>
              {ph.shortages.slice(0, 5).map(s => (
                <Bar key={s.drug} label={s.drug} pct={Math.min(100, (parseInt(s.stock) / Math.max(1, parseInt(s.req))) * 100)} tone={s.tone} tail={s.level} />
              ))}
            </div>
            <div>
              <PanelLabel accent={ACC.pharma}>Cold chain monitoring</PanelLabel>
              <div className="mt-1 flex items-center gap-2">
                <RingGauge value={ph.coldChain.compliancePct} label="compliant" tone={ph.coldChain.compliancePct >= 95 ? 'ok' : 'warn'} size={72} sub="%" />
                <div className="min-w-0 flex-1 space-y-0.5 text-[8px]">
                  <div className="flex justify-between"><span style={{ color: sc('ok') }}>● In range</span><span className="font-mono text-ink-muted">{ph.coldChain.withinRange.toLocaleString()}</span></div>
                  <div className="flex justify-between"><span style={{ color: sc('warn') }}>● Warning</span><span className="font-mono text-ink-muted">{ph.coldChain.warning}</span></div>
                  <div className="flex justify-between"><span style={{ color: sc('alert') }}>● Breach</span><span className="font-mono text-ink-muted">{ph.coldChain.breach}</span></div>
                </div>
              </div>
            </div>
          </div>
        </Tile>

        {/* 8 — FINANCE & INSURANCE */}
        <Tile n={8} title="Finance & Insurance" sub="Health Finance Command"
          accent={ACC.finance} posture={fi.posture.toUpperCase()} postureTone={fi.posture === 'solvent' ? 'ok' : fi.posture === 'strained' ? 'warn' : 'alert'}
          time={time} navActive="Overview"
          nav={['Overview', 'Claims', 'Schemes', 'Payments', 'Fraud Detection', 'Budget', 'Procurement', 'Reports', 'Audit']}>
          <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-4">
            <Kpi label="Treasury Drawdown" value={`${fi.treasuryDrawdownPct}`} unit="%" tone={fi.treasuryDrawdownPct >= 85 ? 'alert' : 'ok'} points={sp('trz', 50, 90)} />
            <Kpi label="Fraud Exposure" value={`$${fi.fraudExposureM}M`} tone={fi.fraudExposureM >= 20 ? 'alert' : 'warn'} points={sp('frd', 10, 60)} />
            <Kpi label="Fraud Cases" value={`${fi.fraud.length}`} tone={fi.fraud.length ? 'warn' : 'ok'} />
            <Kpi label="Schemes" value={`${fi.schemes.length}`} tone="ok" />
          </div>
          <div className="space-y-1">
            <PanelLabel accent={ACC.finance}>Claim pipeline</PanelLabel>
            {fi.claims.map(c => (
              <Bar key={c.stage} label={c.stage} pct={Math.min(100, (c.count / Math.max(1, fi.claims[0]!.count)) * 100)} tone={c.tone} tail={c.count.toLocaleString()} />
            ))}
          </div>
          <div className="grid gap-2 xl:grid-cols-2">
            <div>
              <PanelLabel accent={ACC.finance}>Scheme coverage</PanelLabel>
              <div className="mt-1">
                <Donut total={fi.schemes.length} label="schemes" size={100}
                  segments={fi.schemes.slice(0, 4).map(s => ({ label: s.scheme, value: Math.round(s.coveredM), tone: s.tone }))} />
              </div>
            </div>
            <div className="space-y-1">
              <PanelLabel accent={ACC.finance}>Scheme solvency</PanelLabel>
              {fi.schemes.slice(0, 4).map(s => (
                <Bar key={s.scheme} label={s.scheme} pct={s.collectionPct} tone={s.tone} tail={s.solvency} />
              ))}
            </div>
          </div>
        </Tile>

        {/* 9 — PUBLIC HEALTH PORTAL PREVIEW */}
        <Tile n={9} title="Public Health Portal" sub="Website — Citizen-facing"
          accent={ACC.portal} posture="LIVE SITE" postureTone="ok" time={time} navActive="Preview"
          nav={['Preview', 'Home', 'Health Topics', 'Services', 'Find Facilities', 'News & Alerts', 'About', 'Contact']}>
          <div className="overflow-hidden rounded-[8px] border border-[#d8dee6] bg-white text-[#0b1f3a] shadow-inner">
            <div className="flex items-center justify-between px-3 py-2" style={{ background: '#0b1f3a' }}>
              <Link href="/health" className="text-[9px] font-bold uppercase tracking-[0.18em] text-white hover:underline">Ministry of Health</Link>
              <span className="hidden gap-3 text-[7.5px] text-white/70 sm:flex">{([['Home', '/health'], ['Topics', '/health'], ['Services', '/health/laboratory'], ['Facilities', '/health'], ['News', '/health']] as const).map(([x, h]) => <Link key={x} href={h} className="hover:text-white">{x}</Link>)}</span>
              <Link href="/health" className="rounded-[3px] bg-[#e0452a] px-2 py-0.5 text-[7.5px] font-bold text-white hover:brightness-110">Emergency</Link>
            </div>
            {pub.emergencyBanner.active ? (
              <div className="px-3 py-2 text-white" style={{ background: 'linear-gradient(90deg,#9a1f12,#c0341d)' }}>
                <div className="text-[7.5px] font-bold uppercase tracking-[0.18em] opacity-80">Public Health Alert</div>
                <div className="text-[12px] font-bold">{pub.emergencyBanner.text}</div>
              </div>
            ) : null}
            <div className="grid grid-cols-2 gap-2 p-3 sm:grid-cols-4">
              {([['Find Hospital', '/health'], ['Find Pharmacy', '/health'], ['Book Appointment', '/health'], ['Lab Services', '/health/laboratory']] as const).map(([s, h]) => (
                <Link key={s} href={h} className="rounded-[6px] border border-[#e5e7eb] bg-[#f6f8fb] px-2 py-2 text-center text-[8px] font-semibold text-[#1f5fad] hover:bg-[#eef4fb]">{s}</Link>
              ))}
            </div>
            <div className="px-3 pb-2">
              <div className="text-[8px] font-bold uppercase tracking-[0.16em] text-[#0f9d6b]">Health programmes</div>
              <div className="mt-1 flex flex-wrap gap-1">
                {pub.programmes.slice(0, 6).map(p => (
                  <span key={p} className="rounded-full bg-[#eef4fb] px-2 py-0.5 text-[7.5px] text-[#0b1f3a]">{p}</span>
                ))}
              </div>
            </div>
            <div className="border-t border-[#e5e7eb] px-3 py-2">
              <div className="text-[8px] font-bold uppercase tracking-[0.16em] text-[#0b1f3a]">Latest advisories</div>
              {pub.advisories.slice(0, 3).map(a => (
                <div key={a.title} className="mt-1 flex items-center gap-2 text-[8px]">
                  <span className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: a.level === 'urgent' ? '#c0341d' : a.level === 'advisory' ? '#d98a1f' : '#1f5fad' }} />
                  <span className="min-w-0 flex-1 truncate text-[#22324a]">{a.title}</span>
                  <span className="shrink-0 uppercase text-[#6b7a90]">{a.level}</span>
                </div>
              ))}
            </div>
            <div className="grid grid-cols-2 gap-px bg-[#e5e7eb] text-center sm:grid-cols-4">
              {pub.kpis.slice(0, 4).map(k => (
                <div key={k.label} className="bg-white px-2 py-2">
                  <div className="text-[12px] font-bold text-[#0b1f3a]">{k.value}</div>
                  <div className="text-[7px] uppercase tracking-[0.1em] text-[#6b7a90]">{k.label}</div>
                </div>
              ))}
            </div>
            <div className="flex items-center justify-between gap-2 border-t border-[#e5e7eb] bg-[#0b1f3a] px-3 py-2">
              <Link href="/health" className="text-[8px] font-bold uppercase tracking-[0.16em] text-white hover:underline">Open public website →</Link>
              <Link href="/health/laboratory" className="text-[8px] font-bold uppercase tracking-[0.16em] text-[#7fb3ea] hover:underline">Laboratory Services →</Link>
            </div>
          </div>
        </Tile>

      </main>

      <footer className="relative z-10 flex flex-wrap items-center justify-between gap-2 border-t px-5 py-2.5 text-[8px] uppercase tracking-[0.18em] text-ink-muted"
        style={{ borderColor: 'color-mix(in srgb,#1d3548 60%,transparent)' }}>
        <span>Sovereign Healthcare Operating Ecosystem · Federated National Systems</span>
        <span className="font-mono tabular-nums">SYNC {time} · 9 OPERATIONAL DOMAINS · NATIONAL SCALE</span>
      </footer>
    </div>
  );
}
