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
import { waveSeries, seed } from '@/lib/telemetry';

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
    <section className={`flex h-full min-w-0 flex-col overflow-hidden rounded-[6px] border ${span ?? ''}`}
      style={{
        borderColor: 'rgba(90,170,255,0.18)',
        background: `linear-gradient(150deg,rgba(8,18,32,0.94),rgba(6,14,25,0.96) 55%,color-mix(in srgb,${accent} 6%,rgba(8,18,32,0.94)))`,
        boxShadow: `0 0 0 1px color-mix(in srgb,${accent} 14%,transparent), inset 0 1px 0 rgba(255,255,255,0.03), 0 14px 30px -22px ${accent}`,
      }}>
      {/* module header strip — fixed 44px */}
      <div className="flex h-11 shrink-0 items-center gap-2 border-b px-3"
        style={{ borderColor: 'rgba(90,170,255,0.16)', background: `linear-gradient(100deg,#06101c,color-mix(in srgb,${accent} 9%,#0a1626))` }}>
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
      <div className="flex min-h-0 flex-1 overflow-hidden">
        <nav className="hidden w-[76px] shrink-0 flex-col gap-[5px] overflow-hidden border-r px-1 py-1.5 sm:flex"
          style={{ borderColor: 'rgba(90,170,255,0.14)' }}>
          {nav.map(it => {
            const on = it === navActive;
            return (
              <span key={it}
                className="flex h-[26px] shrink-0 items-center truncate rounded-[3px] px-1.5 text-[7.5px] tracking-wide"
                style={on
                  ? { color: accent, background: `color-mix(in srgb,${accent} 16%,transparent)`, boxShadow: `inset 2px 0 0 ${accent}` }
                  : { color: 'rgb(var(--c-ink-muted))' }}>{it}</span>
            );
          })}
        </nav>
        <div className="min-w-0 flex-1 space-y-1 overflow-hidden p-1.5">{children}</div>
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
          'radial-gradient(1200px 600px at 18% -10%, #0a1a2b 0%, transparent 60%),' +
          'radial-gradient(1100px 700px at 92% 8%, #07131f 0%, transparent 55%),' +
          'linear-gradient(180deg,#040b16 0%,#040a13 100%)',
      }}>
      <div className="pointer-events-none fixed inset-0 opacity-[0.05]"
        style={{ backgroundImage: 'linear-gradient(#5aaaff 1px,transparent 1px),linear-gradient(90deg,#5aaaff 1px,transparent 1px)', backgroundSize: '44px 44px' }} />

      {/* GLOBAL COMMAND HEADER */}
      <header className="sticky top-0 z-20 mx-auto flex h-[52px] w-full max-w-[1920px] flex-wrap items-center gap-3 border-b px-3 backdrop-blur"
        style={{ borderColor: 'rgba(90,170,255,0.18)', background: 'linear-gradient(100deg,rgba(4,11,22,0.94),rgba(8,20,35,0.94))' }}>
        <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full text-[14px]"
          style={{ border: '1px solid #2dd4bf', color: '#2dd4bf', boxShadow: '0 0 16px rgba(45,212,191,0.45)' }}>✚</span>
        <div className="min-w-0">
          <h1 className="text-[15px] font-bold uppercase leading-none tracking-[0.18em] sm:text-[18px]"
            style={{ textShadow: '0 0 16px rgba(45,212,191,0.4)' }}>
            Ministry of Health — Sovereign Healthcare Operating Ecosystem
          </h1>
          <div className="mt-0.5 text-[8px] uppercase tracking-[0.3em] text-ink-muted">Visual Design Concepts — Operational Domains</div>
        </div>
        <div className="ml-auto flex flex-wrap items-center gap-x-4 gap-y-1 text-[9px] font-semibold uppercase tracking-[0.16em] text-ink-muted">
          {[
            ['◈', 'AI Powered'], ['◉', 'Real-Time'], ['◍', 'National Scale'], ['⬡', 'Interoperable'], ['⬢', 'Secure'],
          ].map(([ic, lb], i) => (
            <React.Fragment key={lb}>
              {i > 0 ? <span className="h-3 w-px bg-[rgba(90,170,255,0.2)]" /> : null}
              <span className="inline-flex items-center gap-1.5">
                <span style={{ color: '#2dd4bf', textShadow: '0 0 8px rgba(45,212,191,0.6)' }}>{ic}</span>{lb}
              </span>
            </React.Fragment>
          ))}
          <span className="hidden h-3 w-px bg-[rgba(90,170,255,0.2)] xl:block" />
          <span className="hidden font-mono tabular-nums text-ink-soft xl:inline">{time}</span>
        </div>
      </header>

      {/* OPERATIONAL WALL — fixed 3×3 sovereign grid (1.05fr 1.05fr 1fr / 410 370 320) */}
      <main className="relative z-10 mx-auto w-full max-w-[1920px] overflow-x-auto"
        style={{
          display: 'grid',
          gridTemplateColumns: '1.05fr 1.05fr 1fr',
          gridTemplateRows: '410px 370px 320px',
          gap: '10px',
          padding: '10px',
        }}>

        {/* 1 — NATIONAL HEALTH COMMAND */}
        <Tile n={1} title="National Health Command" sub="National Situation Room"
          accent={ACC.command} posture={ns.posture} postureTone={ns.posture === 'crisis' ? 'alert' : ns.posture === 'elevated' ? 'warn' : 'ok'}
          time={time} navActive="Situation Room"
          nav={['National Command', 'Situation Room', 'Executive Briefing', 'National Grid', 'Alerts & Directives', 'Escalations', 'Interventions', 'AI Insights', 'Reports', 'Settings']}>
          {/* KPI strip — 5 compact command metrics */}
          <div className="grid shrink-0 grid-cols-5 gap-1">
            {[
              { l: 'NAT HEALTH INDEX', v: `${nhi}`, s: `▲ ${(nhi / 20).toFixed(1)}`, t: (nhi >= 70 ? 'ok' : nhi >= 55 ? 'warn' : 'alert') as Tone, k: 'nhi' },
              { l: 'CRITICAL ALERTS', v: `${criticalRegions}`, s: 'Active', t: (criticalRegions ? 'alert' : 'ok') as Tone, k: 'alr' },
              { l: 'ICU OCCUPANCY', v: `${ns.nationalIcuLoad}%`, s: '▲ 6%', t: (ns.nationalIcuLoad >= 88 ? 'alert' : ns.nationalIcuLoad >= 75 ? 'warn' : 'ok') as Tone, k: 'icu' },
              { l: 'OUTBREAK RISK', v: ns.activeOutbreaks >= 8 ? 'HIGH' : ns.activeOutbreaks >= 4 ? 'MED' : 'LOW', s: ns.worstRegion, t: (ns.activeOutbreaks >= 8 ? 'alert' : ns.activeOutbreaks >= 4 ? 'warn' : 'ok') as Tone, k: 'obr' },
              { l: 'DISASTER POSTURE', v: ns.disasterState === 'national-disaster' ? 'L3' : ns.disasterState === 'emergency' ? 'L2' : ns.disasterState === 'watch' ? 'L1' : 'L0', s: 'Partial Activation', t: (ns.disasterState === 'normal' ? 'ok' : ns.disasterState === 'watch' ? 'warn' : 'alert') as Tone, k: 'dis' },
            ].map(m => (
              <div key={m.l} className="flex flex-col justify-between rounded-[3px] border px-1.5 py-1" style={{ borderColor: 'rgba(90,170,255,0.16)', background: 'rgba(6,15,28,0.6)' }}>
                <div className="truncate text-[6.5px] font-bold uppercase tracking-[0.12em] text-ink-muted">{m.l}</div>
                <div className="flex items-end justify-between gap-1">
                  <span className="font-mono text-[24px] font-bold leading-none tabular-nums" style={{ color: sc(m.t), textShadow: `0 0 10px color-mix(in srgb,${sc(m.t)} 45%,transparent)` }}>{m.v}</span>
                  <Sparkline points={sp(m.k, m.t === 'alert' ? 50 : 30, m.t === 'alert' ? 95 : 78)} tone={m.t} width={40} height={14} />
                </div>
                <div className="truncate text-[6.5px] text-ink-muted">{m.s}</div>
              </div>
            ))}
          </div>
          {/* big national map  |  active escalations */}
          <div className="flex min-h-0 flex-1 gap-1">
            <div className="relative min-w-0 flex-1 overflow-hidden rounded-[4px] border" style={{ borderColor: 'rgba(90,170,255,0.18)' }}>
              <GeoMap geo={geo} metric="pressure" title="National Command Map" height={188} />
            </div>
            <div className="flex w-[136px] shrink-0 flex-col rounded-[4px] border" style={{ borderColor: 'rgba(90,170,255,0.18)', background: 'rgba(6,15,28,0.6)' }}>
              <div className="border-b px-1.5 py-1 text-[7px] font-bold uppercase tracking-[0.14em] text-ink-soft" style={{ borderColor: 'rgba(90,170,255,0.14)' }}>Active Escalations</div>
              <div className="min-h-0 flex-1 space-y-0.5 overflow-hidden p-1">
                {ns.regions.slice(0, 5).map(r => (
                  <div key={r.region} className="rounded-[2px] px-1 py-0.5" style={{ background: 'rgba(0,0,0,0.25)', borderLeft: `2px solid ${sc(r.tone)}` }}>
                    <div className="truncate text-[7.5px] font-semibold text-ink">{r.region}</div>
                    <div className="flex items-center justify-between text-[6.5px] text-ink-muted">
                      <span className="truncate">{r.state}</span>
                      <span className="shrink-0 font-bold uppercase" style={{ color: sc(r.tone) }}>{r.composite >= 70 ? 'L3' : r.composite >= 45 ? 'L2' : 'L1'}</span>
                    </div>
                  </div>
                ))}
                <div className="pt-0.5 text-center text-[6.5px] font-semibold" style={{ color: ACC.command }}>View All ({ns.regions.length})</div>
              </div>
            </div>
          </div>
          {/* bottom: pressure sparklines | AI recommendations | propagation graph */}
          <div className="grid shrink-0 grid-cols-[1.15fr_1.3fr_0.85fr] gap-1">
            <div className="rounded-[4px] border p-1" style={{ borderColor: 'rgba(90,170,255,0.16)', background: 'rgba(6,15,28,0.6)' }}>
              <div className="mb-0.5 text-[7px] font-bold uppercase tracking-[0.14em] text-ink-soft">Health System Pressure</div>
              <div className="grid grid-cols-4 gap-1">
                {([['ICU', 'icul', 'alert', 78], ['ER', 'erl', 'warn', 64], ['VENT', 'vent', 'ok', 76], ['STAFF', 'stf', 'ok', 82]] as const).map(([l, k, t, pc]) => (
                  <div key={l}>
                    <Sparkline points={sp(k, 40, 92)} tone={t as Tone} width={52} height={22} />
                    <div className="mt-0.5 flex items-center justify-between text-[6.5px] text-ink-muted"><span>{l}</span><span className="font-mono" style={{ color: sc(t as Tone) }}>{pc}%</span></div>
                  </div>
                ))}
              </div>
            </div>
            <div className="rounded-[4px] border p-1" style={{ borderColor: 'rgba(90,170,255,0.16)', background: 'rgba(6,15,28,0.6)' }}>
              <div className="mb-0.5 text-[7px] font-bold uppercase tracking-[0.14em] text-ink-soft">AI Recommendations</div>
              <div className="space-y-0.5">
                {[[`Redirect 14 ICU patients · ${ns.worstRegion} → Highland`, 'Approve', 'alert'], ['Activate Emergency Medicine Reserve (EMR)', 'Review', 'warn'], ['Increase genomic surveillance · Capital District', 'Review', 'warn']].map(([r, b, t]) => (
                  <div key={r} className="flex items-center gap-1 rounded-[2px] px-1 py-0.5" style={{ background: 'rgba(0,0,0,0.25)', borderLeft: `2px solid ${sc(t as Tone)}` }}>
                    <span className="min-w-0 flex-1 truncate text-[7px] text-ink-soft">{r}</span>
                    <span className="shrink-0 rounded-[2px] px-1 py-0.5 text-[6px] font-bold uppercase" style={{ border: `1px solid ${b === 'Approve' ? sc('ok') : ACC.command}`, color: b === 'Approve' ? sc('ok') : ACC.command }}>{b}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="rounded-[4px] border p-1" style={{ borderColor: 'rgba(90,170,255,0.16)', background: 'rgba(6,15,28,0.6)' }}>
              <div className="mb-0.5 text-[7px] font-bold uppercase tracking-[0.14em] text-ink-soft">Propagation Map</div>
              <svg viewBox="0 0 100 56" className="w-full" style={{ height: 52 }}>
                {Array.from({ length: 7 }, (_, i) => ({ x: 12 + ((seed(`pg:x:${i}`) * 76)), y: 8 + seed(`pg:y:${i}`) * 40, t: seed(`pg:t:${i}`) > 0.7 ? 'alert' : seed(`pg:t:${i}`) > 0.4 ? 'warn' : 'ok' })).map((n, i, a) => (
                  <g key={i}>
                    {i < a.length - 1 ? <line x1={n.x} y1={n.y} x2={a[i + 1]!.x} y2={a[i + 1]!.y} stroke={ACC.command} strokeOpacity="0.4" strokeWidth="0.5" className="animate-dash-flow" strokeDasharray="2 2" /> : null}
                    {i > 1 ? <line x1={n.x} y1={n.y} x2={a[i - 2]!.x} y2={a[i - 2]!.y} stroke={ACC.command} strokeOpacity="0.25" strokeWidth="0.4" /> : null}
                    <circle cx={n.x} cy={n.y} r={2.2} fill={sc(n.t as Tone)} className={n.t !== 'ok' ? 'animate-breathe' : undefined} style={{ filter: `drop-shadow(0 0 3px ${sc(n.t as Tone)})` }} />
                  </g>
                ))}
              </svg>
            </div>
          </div>
        </Tile>

        {/* 2 — HOSPITAL OPERATIONS */}
        <Tile n={2} title="Hospital Operations" sub="Hospital Network Command"
          accent={ACC.hospital} posture={ho.loadBalanceTone === 'alert' ? 'STRAINED' : ho.loadBalanceTone === 'warn' ? 'BUSY' : 'BALANCED'}
          postureTone={ho.loadBalanceTone} time={time} navActive="Overview"
          nav={['Overview', 'ICU Command', 'Theatres', 'Bed Management', 'ER Command', 'Transfers', 'Ambulances', 'Staffing', 'Wards', 'Supply', 'Reports']}>
          {/* KPI strip */}
          <div className="grid shrink-0 grid-cols-5 gap-1">
            {[
              { l: 'HOSPITALS', v: `${geo.regions.length * 27}`, s: 'Active', t: 'ok' as Tone, k: 'hsp' },
              { l: 'TOTAL BEDS', v: ho.beds.total.toLocaleString(), s: '▲ 1.2%', t: 'ok' as Tone, k: 'bed' },
              { l: 'ICU OCCUPANCY', v: `${ho.icu.occupancyPct}%`, s: '▲ 6%', t: (ho.icu.occupancyPct >= 90 ? 'alert' : ho.icu.occupancyPct >= 78 ? 'warn' : 'ok') as Tone, k: 'ico' },
              { l: 'AVAILABLE BEDS', v: (ho.beds.total - ho.beds.occupied).toLocaleString(), s: 'Open', t: (ho.beds.occupancyPct >= 90 ? 'warn' : 'ok') as Tone, k: 'avb' },
              { l: 'ER WAIT', v: `${ho.ambulances.meanResponseMin}m`, s: '▼ 4m', t: (ho.ambulances.meanResponseMin >= 22 ? 'alert' : 'warn') as Tone, k: 'erw' },
            ].map(m => (
              <div key={m.l} className="flex flex-col justify-between rounded-[3px] border px-1.5 py-1" style={{ borderColor: 'rgba(90,170,255,0.16)', background: 'rgba(6,15,28,0.6)' }}>
                <div className="truncate text-[6.5px] font-bold uppercase tracking-[0.12em] text-ink-muted">{m.l}</div>
                <div className="flex items-end justify-between gap-1">
                  <span className="font-mono text-[22px] font-bold leading-none tabular-nums" style={{ color: sc(m.t), textShadow: `0 0 10px color-mix(in srgb,${sc(m.t)} 45%,transparent)` }}>{m.v}</span>
                  <Sparkline points={sp(m.k, 50, 90)} tone={m.t} width={36} height={13} />
                </div>
                <div className="truncate text-[6.5px] text-ink-muted">{m.s}</div>
              </div>
            ))}
          </div>
          {/* dominant hospital network map */}
          <div className="relative min-h-0 flex-1 overflow-hidden rounded-[4px] border" style={{ borderColor: 'rgba(90,170,255,0.18)' }}>
            <GeoMap geo={geo} metric="icuLoad" title="Hospital Network Map" height={150} />
          </div>
          {/* bottom: ICU by region | live transfers | theatre donut */}
          <div className="grid shrink-0 grid-cols-[1.1fr_1.1fr_0.95fr] gap-1">
            <div className="rounded-[4px] border p-1" style={{ borderColor: 'rgba(90,170,255,0.16)', background: 'rgba(6,15,28,0.6)' }}>
              <div className="mb-0.5 text-[7px] font-bold uppercase tracking-[0.14em] text-ink-soft">ICU Occupancy · Region</div>
              <div className="space-y-0.5">
                {ns.regions.slice(0, 5).map(r => (
                  <div key={r.region} className="flex items-center gap-1 text-[7px]">
                    <span className="w-12 shrink-0 truncate text-ink-muted">{r.region}</span>
                    <span className="h-1 flex-1 overflow-hidden rounded-full" style={{ background: '#16222e' }}><span className="block h-full rounded-full" style={{ width: `${r.icuPressure}%`, background: sc(r.tone), boxShadow: `0 0 5px ${sc(r.tone)}` }} /></span>
                    <span className="w-6 shrink-0 text-right font-mono" style={{ color: sc(r.tone) }}>{r.icuPressure}%</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="rounded-[4px] border p-1" style={{ borderColor: 'rgba(90,170,255,0.16)', background: 'rgba(6,15,28,0.6)' }}>
              <div className="mb-0.5 text-[7px] font-bold uppercase tracking-[0.14em] text-ink-soft">Live Transfers</div>
              <div className="space-y-0.5">
                {ns.regions.slice(0, 4).map((r, i) => (
                  <div key={r.region} className="flex items-center justify-between rounded-[2px] px-1 py-0.5 text-[7px]" style={{ background: 'rgba(0,0,0,0.25)', borderLeft: `2px solid ${sc(r.tone)}` }}>
                    <span className="min-w-0 flex-1 truncate text-ink-soft">{r.region} → {ns.regions[(i + 1) % ns.regions.length]!.region}</span>
                    <span className="shrink-0 font-mono text-ink-muted">{1 + (i % 3)}p</span>
                    <span className="ml-1 shrink-0 font-bold uppercase" style={{ color: sc(r.tone) }}>{r.tone === 'alert' ? 'CRIT' : 'HIGH'}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="flex flex-col items-center justify-center rounded-[4px] border p-1" style={{ borderColor: 'rgba(90,170,255,0.16)', background: 'rgba(6,15,28,0.6)' }}>
              <div className="mb-0.5 self-start text-[7px] font-bold uppercase tracking-[0.14em] text-ink-soft">Theatre Util</div>
              <Donut total={ho.theatres.utilisationPct} label="util %" size={78}
                segments={[
                  { label: 'Active', value: ho.theatres.active, tone: 'ok' },
                  { label: 'Sched', value: ho.theatres.scheduledToday, tone: 'warn' },
                  { label: 'Idle', value: Math.max(0, ho.theatres.total - ho.theatres.active), tone: 'alert' },
                ]} />
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
          {/* KPI strip — 6 epidemiology metrics */}
          <div className="grid shrink-0 grid-cols-6 gap-1">
            {di.kpis.slice(0, 6).map(k => (
              <div key={k.label} className="flex flex-col justify-between rounded-[3px] border px-1.5 py-1" style={{ borderColor: 'rgba(255,120,90,0.2)', background: 'rgba(28,12,10,0.55)' }}>
                <div className="truncate text-[6.5px] font-bold uppercase tracking-[0.1em] text-ink-muted">{k.label}</div>
                <div className="flex items-end justify-between gap-1">
                  <span className="font-mono text-[18px] font-bold leading-none tabular-nums" style={{ color: sc(k.tone), textShadow: `0 0 10px color-mix(in srgb,${sc(k.tone)} 45%,transparent)` }}>{k.value}</span>
                  <Sparkline points={k.series} tone={k.tone} width={32} height={12} />
                </div>
                <div className="truncate text-[6px] text-ink-muted">{k.sub}</div>
              </div>
            ))}
          </div>
          {/* dominant outbreak heatmap | top outbreaks */}
          <div className="flex min-h-0 flex-1 gap-1">
            <div className="relative min-w-0 flex-1 overflow-hidden rounded-[4px] border" style={{ borderColor: 'rgba(255,120,90,0.22)' }}>
              <GeoMap geo={geo} metric="outbreakHeat" title="Outbreak Heatmap" height={140} accent={ACC.disease} />
            </div>
            <div className="flex w-[124px] shrink-0 flex-col rounded-[4px] border" style={{ borderColor: 'rgba(255,120,90,0.22)', background: 'rgba(28,12,10,0.5)' }}>
              <div className="border-b px-1.5 py-1 text-[7px] font-bold uppercase tracking-[0.12em] text-ink-soft" style={{ borderColor: 'rgba(255,120,90,0.18)' }}>Top Outbreaks</div>
              <div className="min-h-0 flex-1 space-y-0.5 overflow-hidden p-1">
                {di.topRegions.slice(0, 5).map(r => (
                  <div key={r.region} className="flex items-center justify-between rounded-[2px] px-1 py-0.5 text-[7px]" style={{ background: 'rgba(0,0,0,0.3)', borderLeft: `2px solid ${sc(r.tone)}` }}>
                    <span className="min-w-0 flex-1 truncate text-ink-soft">{r.region}</span>
                    <span className="shrink-0 font-mono tabular-nums" style={{ color: sc(r.tone) }}>{r.active.toLocaleString()}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
          {/* bottom: epidemic curve | predictive spread | intervention impact */}
          <div className="grid shrink-0 grid-cols-3 gap-1">
            <div className="rounded-[4px] border p-1" style={{ borderColor: 'rgba(255,120,90,0.18)', background: 'rgba(28,12,10,0.5)' }}>
              <div className="text-[7px] font-bold uppercase tracking-[0.12em] text-ink-soft">Epidemic Curve</div>
              <TrendChart height={48} series={[{ name: 'Cases', points: di.epidemicCurve.cases, tone: 'alert' }, { name: 'Avg', points: di.epidemicCurve.avg, tone: 'warn' }]} />
            </div>
            <div className="rounded-[4px] border p-1" style={{ borderColor: 'rgba(255,120,90,0.18)', background: 'rgba(28,12,10,0.5)' }}>
              <div className="text-[7px] font-bold uppercase tracking-[0.12em] text-ink-soft">Predictive Spread</div>
              <TrendChart height={48} series={[{ name: 'Best', points: di.predictive.best, tone: 'ok' }, { name: 'Worst', points: di.predictive.worst, tone: 'alert' }]} />
            </div>
            <div className="rounded-[4px] border p-1" style={{ borderColor: 'rgba(255,120,90,0.18)', background: 'rgba(28,12,10,0.5)' }}>
              <div className="mb-0.5 text-[7px] font-bold uppercase tracking-[0.12em] text-ink-soft">Intervention Impact</div>
              <div className="space-y-0.5">
                {di.interventions.slice(0, 4).map(iv => (
                  <div key={iv.name} className="flex items-center gap-1 text-[6.5px]">
                    <span className="w-14 shrink-0 truncate text-ink-muted">{iv.name}</span>
                    <span className="h-1 flex-1 overflow-hidden rounded-full" style={{ background: '#241210' }}><span className="block h-full rounded-full" style={{ width: `${Math.min(100, Math.abs(iv.rtChange))}%`, background: sc(iv.tone) }} /></span>
                    <span className="w-7 shrink-0 text-right font-mono" style={{ color: sc(iv.tone) }}>{iv.rtChange}%</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </Tile>

        {/* 6 — EMERGENCY RESPONSE */}
        <Tile n={6} title="Emergency Response" sub="Incident Command System"
          accent={ACC.emergency} posture={`${er.alerts.length} ALERTS`} postureTone="alert" time={time} navActive="Dashboard"
          nav={['Dashboard', 'Incidents', 'Dispatch', 'Ambulances', 'Responders', 'Hospitals', 'Resources', 'Disasters', 'Reports', 'Settings']}>
          {/* crisis strip */}
          {inc ? (
            <div className="flex shrink-0 items-center gap-2 rounded-[4px] border px-2 py-1"
              style={{ borderColor: sc(inc.tone), background: `color-mix(in srgb,${sc(inc.tone)} 14%,#120608)` }}>
              <span className="h-2 w-2 shrink-0 animate-pulse rounded-full" style={{ background: sc(inc.tone) }} />
              <div className="min-w-0 flex-1">
                <div className="truncate text-[9px] font-bold uppercase tracking-wide text-ink">{inc.title}</div>
                <div className="truncate text-[7px] text-ink-muted">{inc.place} · {inc.status}</div>
              </div>
              <div className="shrink-0 text-right"><div className="text-[6px] uppercase text-ink-muted">Severity</div><div className="text-[8px] font-bold uppercase" style={{ color: sc(inc.tone) }}>{inc.severity}</div></div>
              <div className="shrink-0 text-right"><div className="text-[6px] uppercase text-ink-muted">Response</div><div className="font-mono text-[8px] text-ink">{er.kpis[0]?.value ?? '6m'}</div></div>
            </div>
          ) : null}
          {/* KPI strip */}
          <div className="grid shrink-0 grid-cols-6 gap-1">
            {er.kpis.slice(0, 6).map(k => (
              <div key={k.label} className="flex flex-col justify-between rounded-[3px] border px-1.5 py-1" style={{ borderColor: 'rgba(255,90,100,0.2)', background: 'rgba(28,10,12,0.55)' }}>
                <div className="truncate text-[6px] font-bold uppercase tracking-[0.1em] text-ink-muted">{k.label}</div>
                <div className="flex items-end justify-between gap-1">
                  <span className="font-mono text-[17px] font-bold leading-none tabular-nums" style={{ color: sc(k.tone), textShadow: `0 0 9px color-mix(in srgb,${sc(k.tone)} 45%,transparent)` }}>{k.value}</span>
                  <Sparkline points={k.series} tone={k.tone} width={30} height={11} />
                </div>
              </div>
            ))}
          </div>
          {/* incident map | incident command */}
          <div className="flex min-h-0 flex-1 gap-1">
            <div className="relative min-w-0 flex-1 overflow-hidden rounded-[4px] border" style={{ borderColor: 'rgba(255,90,100,0.22)' }}>
              <GeoMap geo={geo} metric="pressure" title="Incident Map" height={120} accent={ACC.emergency} />
            </div>
            <div className="flex w-[126px] shrink-0 flex-col rounded-[4px] border" style={{ borderColor: 'rgba(255,90,100,0.22)', background: 'rgba(28,10,12,0.5)' }}>
              <div className="border-b px-1.5 py-1 text-[7px] font-bold uppercase tracking-[0.12em] text-ink-soft" style={{ borderColor: 'rgba(255,90,100,0.18)' }}>Incident Command</div>
              <div className="min-h-0 flex-1 space-y-1 overflow-hidden p-1.5">
                <div className="flex justify-between text-[7px]"><span className="text-ink-muted">PATIENTS</span><span className="font-mono text-ink">{inc?.affected ?? 42}</span></div>
                <div className="flex justify-between text-[7px]"><span className="text-ink-muted">CRITICAL</span><span className="font-mono" style={{ color: sc('alert') }}>{inc?.resources.rescue ?? 12}</span></div>
                <div className="flex justify-between text-[7px]"><span className="text-ink-muted">MINOR</span><span className="font-mono" style={{ color: sc('ok') }}>{inc?.resources.vehicles ?? 12}</span></div>
                <div className="mt-1 border-t pt-1 text-[6px] uppercase tracking-wider text-ink-muted" style={{ borderColor: 'rgba(255,90,100,0.14)' }}>Resources Deployed</div>
                {er.resources.slice(0, 4).map(r => (
                  <div key={r.kind} className="flex justify-between text-[7px]"><span className="truncate text-ink-soft">{r.kind}</span><span className="font-mono" style={{ color: sc(r.tone) }}>{r.have}/{r.total}</span></div>
                ))}
              </div>
            </div>
          </div>
          {/* active units + AI rec */}
          <div className="grid shrink-0 grid-cols-[1.5fr_1fr] gap-1">
            <div className="grid grid-cols-4 gap-1">
              {er.resources.slice(0, 4).map(r => (
                <div key={r.kind} className="rounded-[3px] border px-1 py-0.5" style={{ borderColor: 'rgba(255,90,100,0.18)', background: 'rgba(0,0,0,0.25)', borderLeft: `2px solid ${sc(r.tone)}` }}>
                  <div className="truncate text-[6px] uppercase text-ink-muted">{r.kind}</div>
                  <div className="font-mono text-[10px] text-ink">{r.have}/{r.total}</div>
                </div>
              ))}
            </div>
            <div className="flex gap-1">
              <button className="flex-1 rounded-[3px] text-[7px] font-bold uppercase tracking-[0.12em]" style={{ background: `color-mix(in srgb,${sc('ok')} 20%,transparent)`, color: sc('ok') }}>Approve</button>
              <button className="flex-1 rounded-[3px] text-[7px] font-bold uppercase tracking-[0.12em]" style={{ background: `color-mix(in srgb,${sc('alert')} 20%,transparent)`, color: sc('alert') }}>Reject</button>
            </div>
          </div>
        </Tile>

        {/* 7 — PHARMACEUTICAL & SUPPLY CHAIN */}
        <Tile n={7} title="Pharmaceutical & Supply Chain" sub="Medicine Availability & Logistics"
          accent={ACC.pharma} posture={`SC ${ph.scHealth}`} postureTone={ph.scHealth >= 80 ? 'ok' : ph.scHealth >= 60 ? 'warn' : 'alert'}
          time={time} navActive="Overview"
          nav={['Overview', 'Inventory', 'Procurement', 'Distribution', 'Warehouses', 'Cold Chain', 'Shortages', 'Reports']}>
          {/* KPI strip */}
          <div className="grid shrink-0 grid-cols-5 gap-1">
            {ph.kpis.slice(0, 5).map(k => (
              <div key={k.label} className="flex flex-col justify-between rounded-[3px] border px-1.5 py-1" style={{ borderColor: 'rgba(47,208,200,0.2)', background: 'rgba(6,22,24,0.55)' }}>
                <div className="truncate text-[6px] font-bold uppercase tracking-[0.1em] text-ink-muted">{k.label}</div>
                <div className="flex items-end justify-between gap-1">
                  <span className="font-mono text-[18px] font-bold leading-none tabular-nums" style={{ color: sc(k.tone), textShadow: `0 0 9px color-mix(in srgb,${sc(k.tone)} 45%,transparent)` }}>{k.value}</span>
                  <Sparkline points={k.series} tone={k.tone} width={32} height={12} />
                </div>
                <div className="truncate text-[6px] text-ink-muted">{k.sub}</div>
              </div>
            ))}
          </div>
          {/* stock levels | supply map | alerts */}
          <div className="flex min-h-0 flex-1 gap-1">
            <div className="flex w-[118px] shrink-0 flex-col rounded-[4px] border p-1" style={{ borderColor: 'rgba(47,208,200,0.2)', background: 'rgba(6,22,24,0.5)' }}>
              <div className="mb-0.5 text-[7px] font-bold uppercase tracking-[0.12em] text-ink-soft">Stock Levels</div>
              <div className="space-y-0.5">
                {ph.shortages.slice(0, 6).map(s => {
                  const pct = Math.min(100, (parseInt(s.stock) / Math.max(1, parseInt(s.req))) * 100);
                  return (
                    <div key={s.drug} className="text-[6.5px]">
                      <div className="flex justify-between"><span className="truncate text-ink-muted">{s.drug}</span><span className="font-mono" style={{ color: sc(s.tone) }}>{Math.round(pct)}%</span></div>
                      <span className="block h-1 overflow-hidden rounded-full" style={{ background: '#0c1c1e' }}><span className="block h-full rounded-full" style={{ width: `${pct}%`, background: sc(s.tone) }} /></span>
                    </div>
                  );
                })}
              </div>
            </div>
            <div className="relative min-w-0 flex-1 overflow-hidden rounded-[4px] border" style={{ borderColor: 'rgba(47,208,200,0.22)' }}>
              <GeoMap geo={geo} metric="pressure" title="Supply Network" height={118} accent={ACC.pharma} />
            </div>
            <div className="flex w-[112px] shrink-0 flex-col rounded-[4px] border p-1" style={{ borderColor: 'rgba(47,208,200,0.2)', background: 'rgba(6,22,24,0.5)' }}>
              <div className="mb-0.5 text-[7px] font-bold uppercase tracking-[0.12em] text-ink-soft">Alerts</div>
              <div className="space-y-0.5">
                {ph.shortages.slice(0, 5).map(s => (
                  <div key={s.drug} className="rounded-[2px] px-1 py-0.5 text-[6.5px]" style={{ background: 'rgba(0,0,0,0.28)', borderLeft: `2px solid ${sc(s.tone)}` }}>
                    <div className="truncate text-ink-soft">{s.drug}</div>
                    <div className="flex justify-between text-ink-muted"><span className="truncate">{s.cat}</span><span className="font-bold uppercase" style={{ color: sc(s.tone) }}>{s.level}</span></div>
                  </div>
                ))}
              </div>
            </div>
          </div>
          {/* cold chain + emergency redistribution */}
          <div className="grid shrink-0 grid-cols-[1fr_1.4fr] gap-1">
            <div className="flex items-center gap-1.5 rounded-[4px] border p-1" style={{ borderColor: 'rgba(47,208,200,0.18)', background: 'rgba(6,22,24,0.5)' }}>
              <RingGauge value={ph.coldChain.compliancePct} label="cold" tone={ph.coldChain.compliancePct >= 95 ? 'ok' : 'warn'} size={50} sub="%" />
              <div className="min-w-0 flex-1 space-y-0.5 text-[6.5px]">
                <div className="flex justify-between"><span style={{ color: sc('ok') }}>● In range</span><span className="font-mono text-ink-muted">{ph.coldChain.withinRange.toLocaleString()}</span></div>
                <div className="flex justify-between"><span style={{ color: sc('warn') }}>● Warning</span><span className="font-mono text-ink-muted">{ph.coldChain.warning}</span></div>
                <div className="flex justify-between"><span style={{ color: sc('alert') }}>● Breach</span><span className="font-mono text-ink-muted">{ph.coldChain.breach}</span></div>
              </div>
            </div>
            <div className="flex items-center gap-1 rounded-[4px] border p-1" style={{ borderColor: 'rgba(47,208,200,0.18)', background: 'rgba(6,22,24,0.5)' }}>
              <div className="min-w-0 flex-1">
                <div className="text-[6px] uppercase tracking-wider text-ink-muted">Emergency Redistribution</div>
                <div className="truncate text-[7.5px] text-ink-soft">Transfer 1,100 units Insulin · Coastal → Highland</div>
              </div>
              <button className="shrink-0 rounded-[2px] px-1.5 py-0.5 text-[6.5px] font-bold uppercase" style={{ border: `1px solid ${sc('ok')}`, color: sc('ok') }}>Approve</button>
              <button className="shrink-0 rounded-[2px] px-1.5 py-0.5 text-[6.5px] font-bold uppercase" style={{ border: `1px solid ${sc('alert')}`, color: sc('alert') }}>Reject</button>
            </div>
          </div>
        </Tile>

        {/* 8 — FINANCE & INSURANCE */}
        <Tile n={8} title="Finance & Insurance" sub="Health Finance Command"
          accent={ACC.finance} posture={fi.posture.toUpperCase()} postureTone={fi.posture === 'solvent' ? 'ok' : fi.posture === 'strained' ? 'warn' : 'alert'}
          time={time} navActive="Overview"
          nav={['Overview', 'Claims', 'Schemes', 'Payments', 'Fraud Detection', 'Budget', 'Procurement', 'Reports', 'Audit']}>
          {/* KPI strip */}
          <div className="grid shrink-0 grid-cols-4 gap-1">
            {[
              { l: 'TREASURY DRAWDOWN', v: `${fi.treasuryDrawdownPct}%`, s: 'of ceiling', t: (fi.treasuryDrawdownPct >= 85 ? 'alert' : 'ok') as Tone, k: 'trz' },
              { l: 'FRAUD EXPOSURE', v: `$${fi.fraudExposureM}M`, s: 'flagged', t: (fi.fraudExposureM >= 20 ? 'alert' : 'warn') as Tone, k: 'frd' },
              { l: 'FRAUD CASES', v: `${fi.fraud.length}`, s: 'open', t: (fi.fraud.length ? 'warn' : 'ok') as Tone, k: 'frc' },
              { l: 'SCHEMES', v: `${fi.schemes.length}`, s: 'active', t: 'ok' as Tone, k: 'sch' },
            ].map(m => (
              <div key={m.l} className="flex flex-col justify-between rounded-[3px] border px-1.5 py-1" style={{ borderColor: 'rgba(84,208,143,0.2)', background: 'rgba(8,24,18,0.55)' }}>
                <div className="truncate text-[6.5px] font-bold uppercase tracking-[0.1em] text-ink-muted">{m.l}</div>
                <div className="flex items-end justify-between gap-1">
                  <span className="font-mono text-[20px] font-bold leading-none tabular-nums" style={{ color: sc(m.t), textShadow: `0 0 9px color-mix(in srgb,${sc(m.t)} 45%,transparent)` }}>{m.v}</span>
                  <Sparkline points={sp(m.k, 40, 85)} tone={m.t} width={34} height={12} />
                </div>
                <div className="truncate text-[6px] text-ink-muted">{m.s}</div>
              </div>
            ))}
          </div>
          {/* claim pipeline | scheme performance */}
          <div className="flex min-h-0 flex-1 gap-1">
            <div className="flex flex-1 flex-col rounded-[4px] border p-1" style={{ borderColor: 'rgba(84,208,143,0.2)', background: 'rgba(8,24,18,0.5)' }}>
              <div className="mb-0.5 text-[7px] font-bold uppercase tracking-[0.12em] text-ink-soft">Claim Pipeline</div>
              <div className="flex flex-1 flex-col justify-around">
                {fi.claims.map((c, i) => {
                  const w = 100 - i * 16;
                  return (
                    <div key={c.stage} className="flex items-center gap-1">
                      <span className="w-12 shrink-0 text-[6.5px] uppercase text-ink-muted">{c.stage}</span>
                      <span className="relative h-3 flex-1 overflow-hidden rounded-[2px]" style={{ background: '#0c1c16' }}>
                        <span className="block h-full rounded-[2px]" style={{ width: `${w}%`, background: `linear-gradient(90deg,color-mix(in srgb,${sc(c.tone)} 50%,transparent),${sc(c.tone)})`, boxShadow: `0 0 6px ${sc(c.tone)}` }} />
                        <span className="absolute inset-0 flex items-center justify-end pr-1 font-mono text-[7px] text-ink">{c.count.toLocaleString()}</span>
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
            <div className="flex flex-1 flex-col rounded-[4px] border p-1" style={{ borderColor: 'rgba(84,208,143,0.2)', background: 'rgba(8,24,18,0.5)' }}>
              <div className="mb-0.5 text-[7px] font-bold uppercase tracking-[0.12em] text-ink-soft">Scheme Performance</div>
              <div className="flex-1 space-y-1">
                {fi.schemes.slice(0, 5).map(s => (
                  <div key={s.scheme} className="flex items-center gap-1 text-[6.5px]">
                    <span className="w-16 shrink-0 truncate text-ink-muted">{s.scheme}</span>
                    <span className="h-1.5 flex-1 overflow-hidden rounded-full" style={{ background: '#0c1c16' }}><span className="block h-full rounded-full" style={{ width: `${s.collectionPct}%`, background: sc(s.tone), boxShadow: `0 0 5px ${sc(s.tone)}` }} /></span>
                    <span className="w-6 shrink-0 text-right font-mono" style={{ color: sc(s.tone) }}>{s.collectionPct}%</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
          {/* expenditure breakdown */}
          <div className="flex shrink-0 items-center gap-2 rounded-[4px] border p-1" style={{ borderColor: 'rgba(84,208,143,0.18)', background: 'rgba(8,24,18,0.5)' }}>
            <Donut total={fi.schemes.length} label="exp" size={62}
              segments={fi.schemes.slice(0, 4).map(s => ({ label: s.scheme, value: Math.round(s.coveredM), tone: s.tone }))} />
            <div className="min-w-0 flex-1 grid grid-cols-2 gap-x-2 gap-y-0.5 text-[6.5px]">
              {fi.schemes.slice(0, 4).map(s => (
                <div key={s.scheme} className="flex items-center justify-between gap-1">
                  <span className="flex min-w-0 items-center gap-1"><span className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: sc(s.tone) }} /><span className="truncate text-ink-soft">{s.scheme}</span></span>
                  <span className="font-mono text-ink-muted">{s.claimsRatioPct}%</span>
                </div>
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
