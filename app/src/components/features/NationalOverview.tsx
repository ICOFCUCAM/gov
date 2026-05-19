'use client';

// National Overview — Sovereign Operations Command Center. The apex
// whole-of-government command surface (Head of Government / National
// Executive): national posture KPI strip, national threat map, active
// incidents, incident & operational summaries, top alerts, system health,
// threat forecast, resource deployment, intelligence summary, regional
// risk distribution and a command feed. Pure & deterministic — telemetry
// only; SSR-safe (client clock follows the codebase pattern).

import * as React from 'react';
import { wave, waveSeries, seed } from '@/lib/telemetry';

const BG = '#070b11';
const PANEL = '#0c1119';
const PANEL2 = '#10151f';
const LINE = 'rgba(224,104,95,0.15)';
const RED = '#e0685f';
const RED_BR = '#f4877c';
const AMBER = '#e0a13a';
const GOLD = '#c9a24a';
const CYAN = '#4fb3d9';
const EMER = '#3fae82';
const INK = '#d6dde6';
const SOFT = '#93a0ad';
const MUT = '#62707e';
const SERIF = 'Georgia, "Times New Roman", ui-serif, serif';

const SEV_C: Record<string, string> = { CRITICAL: RED, HIGH: AMBER, MEDIUM: GOLD, LOW: EMER };

function Spark({ pts, color = RED, w = 64, h = 18 }: { pts: number[]; color?: string; w?: number; h?: number }) {
  if (pts.length < 2) return null;
  const mn = Math.min(...pts), sp = Math.max(...pts) - mn || 1;
  const d = pts.map((p, i) => `${(i / (pts.length - 1)) * w},${h - ((p - mn) / sp) * h}`).join(' ');
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} className="overflow-visible" aria-hidden>
      <polyline points={d} fill="none" stroke={color} strokeWidth="1.3" strokeLinejoin="round" strokeLinecap="round"
        style={{ filter: `drop-shadow(0 0 3px color-mix(in srgb,${color} 55%,transparent))` }} />
    </svg>
  );
}

function Ring({ value, sub, color }: { value: number; sub: string; color: string }) {
  const v = Math.max(0, Math.min(100, value));
  const r = 40, circ = 2 * Math.PI * r;
  return (
    <svg width="104" height="104" viewBox="0 0 104 104" aria-hidden>
      <circle cx="52" cy="52" r={r} fill="none" stroke="#1a1f29" strokeWidth="9" />
      <circle cx="52" cy="52" r={r} fill="none" stroke={color} strokeWidth="9" strokeLinecap="round"
        strokeDasharray={circ} strokeDashoffset={circ * (1 - v / 100)} transform="rotate(-90 52 52)"
        style={{ filter: `drop-shadow(0 0 6px color-mix(in srgb,${color} 60%,transparent))` }} />
      <text x="52" y="50" textAnchor="middle" fontSize="22" fontWeight="700" fill={color} style={{ fontFamily: SERIF }}>{Math.round(v)}%</text>
      <text x="52" y="66" textAnchor="middle" fontSize="8" fill={MUT} className="uppercase" style={{ letterSpacing: '0.14em' }}>{sub}</text>
    </svg>
  );
}

// National threat map: glow clusters + connecting lines + warning markers.
function ThreatMap({ seedKey }: { seedKey: string }) {
  const cols = 30, rows = 13;
  const clusters = Array.from({ length: 7 }).map((_, i) => ({
    x: 12 + seed(`${seedKey}:cx:${i}`) * 76, y: 16 + seed(`${seedKey}:cy:${i}`) * 64,
    r: 3 + seed(`${seedKey}:cr:${i}`) * 7, hot: seed(`${seedKey}:ch:${i}`) > 0.45,
  }));
  return (
    <div className="relative overflow-hidden rounded-[3px]" style={{ background: 'radial-gradient(120% 90% at 50% 40%,#0d141d,#070b11)' }}>
      <div className="grid gap-[3px] p-2" style={{ gridTemplateColumns: `repeat(${cols},1fr)` }} aria-hidden>
        {Array.from({ length: cols * rows }).map((_, i) => {
          const v = seed(`${seedKey}:${i}`);
          const inland = (i % cols > 2 && i % cols < cols - 2 && Math.floor(i / cols) > 0 && Math.floor(i / cols) < rows - 1);
          return <span key={i} className="aspect-square rounded-full" style={{ background: inland ? (v > 0.93 ? RED : v > 0.86 ? '#3a4a55' : '#1c2730') : 'transparent', opacity: inland ? (v > 0.86 ? 0.9 : 0.4) : 0 }} />;
        })}
      </div>
      <svg viewBox="0 0 100 80" preserveAspectRatio="none" className="pointer-events-none absolute inset-0 h-full w-full" aria-hidden>
        {clusters.map((c, i) => i < clusters.length - 1 ? (
          <line key={i} x1={c.x} y1={c.y} x2={clusters[i + 1]!.x} y2={clusters[i + 1]!.y}
            stroke={RED} strokeWidth="0.3" opacity="0.3" />
        ) : null)}
        {clusters.map((c, i) => (
          <g key={`g${i}`}>
            <circle cx={c.x} cy={c.y} r={c.r} fill={c.hot ? RED : AMBER} opacity="0.18" />
            <circle cx={c.x} cy={c.y} r={c.r * 0.4} fill={c.hot ? RED_BR : AMBER}
              style={{ filter: `drop-shadow(0 0 4px ${c.hot ? RED : AMBER})` }} />
          </g>
        ))}
      </svg>
      <div className="absolute right-2 top-2 flex flex-col gap-1">
        {['⛶', '+', '−'].map(s => (
          <span key={s} className="grid h-6 w-6 place-items-center rounded-[2px] border text-[11px]"
            style={{ borderColor: LINE, background: PANEL, color: SOFT }} aria-hidden>{s}</span>
        ))}
      </div>
      <div className="absolute bottom-2 left-2 flex flex-col gap-0.5 rounded-[2px] border px-2 py-1.5"
        style={{ borderColor: LINE, background: 'rgba(8,11,17,0.7)' }}>
        {[['Critical', RED], ['High', AMBER], ['Medium', GOLD], ['Low', EMER], ['Monitoring', CYAN]].map(([l, c]) => (
          <span key={l} className="flex items-center gap-1.5 text-[7.5px] uppercase tracking-wider" style={{ color: SOFT }}>
            <span className="h-1.5 w-1.5 rounded-full" style={{ background: c }} />{l}
          </span>
        ))}
      </div>
    </div>
  );
}

function MultiLine({ series, height = 130 }: { series: { name: string; c: string; pts: number[] }[]; height?: number }) {
  const all = series.flatMap(s => s.pts);
  const mn = Math.min(...all), sp = Math.max(...all) - mn || 1;
  const line = (pts: number[]) => pts.map((p, i) => `${(i / (pts.length - 1)) * 100},${94 - ((p - mn) / sp) * 84}`).join(' ');
  return (
    <svg viewBox="0 0 100 100" preserveAspectRatio="none" style={{ width: '100%', height }} aria-hidden>
      {[20, 40, 60, 80].map(y => <line key={y} x1="0" y1={y} x2="100" y2={y} stroke="#161c26" strokeWidth="0.4" />)}
      {series.map(s => (
        <React.Fragment key={s.name}>
          <polygon points={`0,94 ${line(s.pts)} 100,94`} fill={s.c} opacity="0.07" />
          <polyline points={line(s.pts)} fill="none" stroke={s.c} strokeWidth="1" vectorEffect="non-scaling-stroke"
            style={{ filter: `drop-shadow(0 0 2px color-mix(in srgb,${s.c} 45%,transparent))` }} />
        </React.Fragment>
      ))}
    </svg>
  );
}

// Regional risk distribution — hex-ish tessellation coloured by risk.
function RiskHexMap({ seedKey }: { seedKey: string }) {
  const cols = 14, rows = 9;
  return (
    <div className="grid gap-[2px]" style={{ gridTemplateColumns: `repeat(${cols},1fr)` }} aria-hidden>
      {Array.from({ length: cols * rows }).map((_, i) => {
        const v = seed(`${seedKey}:${i}`);
        const on = (i % cols > 0 && i % cols < cols - 1 && Math.floor(i / cols) > 0 && Math.floor(i / cols) < rows - 1);
        const left = i % cols < cols / 2;
        const c = !on ? 'transparent' : left
          ? (v > 0.7 ? RED : v > 0.45 ? AMBER : '#7a3b34')
          : (v > 0.7 ? CYAN : v > 0.45 ? '#3a7d8f' : '#274652');
        return <span key={i} className="h-3 rounded-[2px]" style={{ background: c, opacity: on ? 0.9 : 0, clipPath: 'polygon(25% 0,75% 0,100% 50%,75% 100%,25% 100%,0 50%)' }} />;
      })}
    </div>
  );
}

function Panel({ title, action, children, className }: {
  title: string; action?: string; children: React.ReactNode; className?: string;
}) {
  return (
    <section className={`flex flex-col rounded-[4px] border ${className ?? ''}`} style={{ borderColor: LINE, background: PANEL }}>
      <div className="flex items-center justify-between border-b px-3 py-2" style={{ borderColor: LINE }}>
        <h3 className="text-[10px] font-bold uppercase tracking-[0.18em]" style={{ color: INK }}>{title}</h3>
        {action ? <span className="text-[8.5px] font-semibold uppercase tracking-[0.12em]" style={{ color: RED }}>{action}</span> : null}
      </div>
      <div className="flex-1 p-3">{children}</div>
    </section>
  );
}

export function NationalOverview() {
  const [now, setNow] = React.useState(() => Date.now());
  React.useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);
  const id = 'NATL';
  const ts = now / 4000;
  const clock = new Date(now);
  const hh = clock.toLocaleTimeString('en-GB', { hour12: false });
  const dd = clock.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).toUpperCase();
  const day = clock.toLocaleDateString('en-GB', { weekday: 'long' }).toUpperCase();
  const W = (k: string, lo: number, hi: number, n = 16) => waveSeries(`no:${k}:${id}`, ts, n, lo, hi);

  const readiness = Math.round(wave(`no:rd:${id}`, ts, 92, 99.4) * 10) / 10;
  const sysHealth = Math.round(wave(`no:sh:${id}`, ts, 96, 99.6) * 10) / 10;
  const critical = 4 + Math.round(seed(`no:cr:${id}`) * 6);
  const posture = critical >= 8 ? 'CRITICAL' : critical >= 5 ? 'SEVERE' : 'ELEVATED';
  const pTone = critical >= 8 ? RED : critical >= 5 ? AMBER : GOLD;

  const kpis: [string, string, string, string][] = [
    ['National Posture', posture, `Level ${critical >= 8 ? 4 : 3}`, pTone],
    ['Active Incidents', `${critical}`, '+2 new', RED],
    ['Regions at Risk', `${14 + Math.round(seed(`no:rr:${id}`) * 12)}`, '+5', AMBER],
    ['Agencies Deployed', `${10 + Math.round(seed(`no:ad:${id}`) * 6)}`, '78% readiness', INK],
    ['Operational Readiness', `${readiness}%`, 'Optimal', EMER],
    ['Population', `${(41 + seed(`no:pp:${id}`)).toFixed(2)}M`, '+0.38%', INK],
    ['Threat Level', critical >= 8 ? 'SEVERE' : critical >= 5 ? 'HIGH' : 'GUARDED', '', RED],
    ['System Health', `${sysHealth}%`, 'All Systems', EMER],
  ];

  const incidents = [
    ['Border Security Breach', 'Northern Region', '12:35', 'CRITICAL'],
    ['Terror Threat Intelligence', 'Central Region', '11:58', 'HIGH'],
    ['Major Traffic Collision', 'East Region', '11:42', 'HIGH'],
    ['Cyber Attack Attempt', 'National Infrastructure', '11:28', 'HIGH'],
    ['Flood Alert', 'Coastal Region', '10:47', 'MEDIUM'],
  ] as [string, string, string, string][];

  const alerts = [
    ['Multiple Threats Detected', 'Northern Corridor', '12:35', 'CRITICAL'],
    ['Suspicious Activity Reported', 'West District', '12:18', 'HIGH'],
    ['Unusual Border Movement', 'Southern Border', '11:57', 'HIGH'],
    ['Infrastructure Vulnerability', 'Power Grid', '11:22', 'MEDIUM'],
    ['Public Safety Warning', 'Central Region', '10:41', 'MEDIUM'],
  ] as [string, string, string, string][];

  const incSummary: [string, string, string, string][] = [
    ['Total Incidents', `${Math.round(wave(`no:ti:${id}`, ts, 6000, 9000)).toLocaleString()}`, '+12%', AMBER],
    ['Critical Incidents', `${critical}`, '+2', RED],
    ['High Priority', `${18 + Math.round(seed(`no:hp:${id}`) * 12)}`, '+5', AMBER],
    ['Contained', `${Math.round(wave(`no:ct:${id}`, ts, 1200, 2400)).toLocaleString()}`, '+8%', EMER],
    ['Resolved Today', `${Math.round(wave(`no:rs:${id}`, ts, 220, 480))}`, '+15%', EMER],
  ];
  const readinessBars: [string, number][] = [
    ['Personnel', 90], ['Equipment', 78], ['Intelligence', 85], ['Logistics', 72], ['Communications', 96],
  ];
  const sysHealthRows: [string, number][] = [
    ['Network', 100], ['Databases', 98], ['Applications', 99], ['Security', 100], ['Integrations', 97],
  ];
  const resources: [string, string][] = [
    ['Personnel', Math.round(wave(`no:rp:${id}`, ts, 14000, 22000)).toLocaleString()],
    ['Vehicles', Math.round(wave(`no:rv:${id}`, ts, 3000, 4800)).toLocaleString()],
    ['Aircraft', `${Math.round(wave(`no:ra:${id}`, ts, 90, 180))}`],
    ['Vessels', `${Math.round(wave(`no:rves:${id}`, ts, 28, 64))}`],
    ['Drones', `${Math.round(wave(`no:rdr:${id}`, ts, 180, 340))}`],
  ];
  const intel: [string, string, string, string][] = [
    ['Intel Reports', Math.round(wave(`no:ir:${id}`, ts, 900, 1600)).toLocaleString(), '+18%', EMER],
    ['Active Sources', `${Math.round(wave(`no:as:${id}`, ts, 280, 460))}`, '+12%', EMER],
    ['Surveillance Ops', `${Math.round(wave(`no:so:${id}`, ts, 14, 36))}`, '+5%', EMER],
    ['Risk Indicators', `${Math.round(wave(`no:rik:${id}`, ts, 60, 110))}`, '-3%', AMBER],
  ];
  const feed = [
    ['12:40', 'Border patrol increased in Northern Region'],
    ['12:35', 'Emergency response deployed to flood zone'],
    ['12:28', 'Cyber threat neutralised in critical infrastructure'],
  ] as [string, string][];
  const deployed = Math.round(wave(`no:dep:${id}`, ts, 64, 88));

  return (
    <div className="space-y-2 rounded-[5px] p-2" style={{ background: BG, boxShadow: 'inset 0 0 140px rgba(0,0,0,0.7)' }}>
      {/* ── Header ─────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-x-6 gap-y-2 rounded-[4px] border px-4 py-3"
        style={{ borderColor: LINE, background: 'linear-gradient(100deg,#0c0f15,#12161e)' }}>
        <div className="flex items-center gap-3">
          <span className="grid h-10 w-10 place-items-center rounded-full text-[15px]" style={{ border: `1px solid ${GOLD}`, color: GOLD }} aria-hidden>⚜</span>
          <div>
            <div className="text-[18px] font-bold uppercase tracking-[0.14em]" style={{ color: INK, fontFamily: SERIF }}>National Overview</div>
            <div className="text-[8px] uppercase tracking-[0.24em]" style={{ color: RED }}>Sovereign Operations Command Center</div>
          </div>
        </div>
        <div className="ml-auto flex flex-wrap items-center gap-x-6 gap-y-1 text-[8.5px]" style={{ color: MUT }}>
          <span><span style={{ color: SOFT }}>{dd}</span> · {day}</span>
          <span>TIME <span className="font-mono text-[11px]" style={{ color: INK }}>{hh}</span> GMT+1</span>
          <span className="flex items-center gap-1.5">
            <span className="relative inline-block">🔔<span className="absolute -right-1.5 -top-1.5 grid h-3 w-3 place-items-center rounded-full text-[6px] font-bold text-white" style={{ background: RED }}>9</span></span>
            <span className="uppercase tracking-[0.12em]">Alerts</span>
          </span>
          <span className="flex items-center gap-1.5 rounded-[3px] border px-2 py-1" style={{ borderColor: LINE }}>
            <span className="grid h-5 w-5 place-items-center rounded-full text-[8px] font-bold" style={{ background: GOLD, color: '#1a1305' }}>HG</span>
            <span><span className="block uppercase tracking-[0.1em]" style={{ color: MUT }}>Head of Government</span><span style={{ color: INK }}>National Executive</span></span>
          </span>
        </div>
      </div>

      {/* ── National posture KPI strip ─────────────────────────── */}
      <div className="grid grid-cols-2 gap-px overflow-hidden rounded-[4px] border md:grid-cols-4 xl:grid-cols-8"
        style={{ borderColor: LINE, background: LINE }}>
        {kpis.map(([l, v, s, c]) => (
          <div key={l} className="px-3 py-2.5 text-center" style={{ background: PANEL }}>
            <div className="text-[7.5px] font-semibold uppercase tracking-[0.16em]" style={{ color: MUT }}>{l}</div>
            <div className="mt-1 text-[17px] font-bold tabular-nums" style={{ color: c, fontFamily: SERIF }}>{v}</div>
            {s ? <div className="text-[8px]" style={{ color: SOFT }}>{s}</div> : <div className="h-[12px]" />}
          </div>
        ))}
      </div>

      {/* ── Threat map + active incidents ──────────────────────── */}
      <div className="grid gap-2 xl:grid-cols-[1.7fr_1fr]">
        <Panel title="National Threat Map">
          <div className="h-[300px]"><ThreatMap seedKey={`no:tm:${id}`} /></div>
        </Panel>
        <Panel title="Active Incidents" action="View All">
          <div className="space-y-1.5">
            {incidents.map(([t, rg, tm, sv]) => (
              <div key={t} className="flex items-center gap-2 rounded-[3px] border px-2.5 py-2" style={{ borderColor: LINE, background: PANEL2 }}>
                <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full text-[11px]" style={{ background: `color-mix(in srgb,${SEV_C[sv]} 16%,transparent)`, color: SEV_C[sv] }} aria-hidden>⚠</span>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-[11px] font-semibold" style={{ color: INK }}>{t}</div>
                  <div className="text-[9px]" style={{ color: MUT }}>{rg}</div>
                </div>
                <div className="text-right">
                  <div className="font-mono text-[9px]" style={{ color: SOFT }}>{tm}</div>
                  <div className="text-[8px] font-bold uppercase tracking-wider" style={{ color: SEV_C[sv] }}>{sv}</div>
                </div>
              </div>
            ))}
          </div>
        </Panel>
      </div>

      {/* ── Summaries row ──────────────────────────────────────── */}
      <div className="grid gap-2 lg:grid-cols-2 xl:grid-cols-4">
        <Panel title="Incident Summary">
          <div className="space-y-2">
            {incSummary.map(([l, v, d, c]) => (
              <div key={l} className="flex items-center gap-2 text-[10px]">
                <span className="h-1.5 w-1.5 rounded-full" style={{ background: c }} />
                <span className="min-w-0 flex-1" style={{ color: SOFT }}>{l}</span>
                <span className="font-mono tabular-nums" style={{ color: INK }}>{v}</span>
                <span className="w-10 text-right font-mono tabular-nums" style={{ color: d.startsWith('-') ? AMBER : EMER }}>{d}</span>
              </div>
            ))}
          </div>
        </Panel>
        <Panel title="Operational Readiness">
          <div className="space-y-2.5">
            {readinessBars.map(([l, v]) => (
              <div key={l} className="text-[9px]">
                <div className="flex justify-between"><span style={{ color: SOFT }}>{l}</span><span className="font-mono tabular-nums" style={{ color: INK }}>{v}%</span></div>
                <div className="mt-0.5 h-1.5 overflow-hidden rounded-full" style={{ background: '#1a1f29' }}>
                  <span className="block h-full rounded-full" style={{ width: `${v}%`, background: v >= 85 ? EMER : v >= 75 ? GOLD : AMBER }} />
                </div>
              </div>
            ))}
          </div>
        </Panel>
        <Panel title="Top Alerts" action="View All">
          <div className="space-y-2">
            {alerts.map(([t, rg, tm, sv]) => (
              <div key={t} className="flex items-center gap-2 text-[9px]">
                <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: SEV_C[sv] }} />
                <div className="min-w-0 flex-1">
                  <div className="truncate" style={{ color: INK }}>{t}</div>
                  <div className="text-[8px]" style={{ color: MUT }}>{rg}</div>
                </div>
                <span className="font-mono text-[8px]" style={{ color: SOFT }}>{tm}</span>
                <span className="w-12 text-right text-[7.5px] font-bold uppercase" style={{ color: SEV_C[sv] }}>{sv}</span>
              </div>
            ))}
          </div>
        </Panel>
        <Panel title="System Health">
          <div className="flex items-center gap-3">
            <Ring value={readiness} sub="Optimal" color={EMER} />
            <div className="flex-1 space-y-1.5">
              {sysHealthRows.map(([l, v]) => (
                <div key={l} className="flex items-center gap-2 text-[9px]">
                  <span className="h-1.5 w-1.5 rounded-full" style={{ background: v >= 99 ? EMER : GOLD }} />
                  <span className="flex-1" style={{ color: SOFT }}>{l}</span>
                  <span className="font-mono tabular-nums" style={{ color: INK }}>{v}%</span>
                </div>
              ))}
            </div>
          </div>
        </Panel>
      </div>

      {/* ── Forecast / deployment / intel / regional ───────────── */}
      <div className="grid gap-2 lg:grid-cols-2 xl:grid-cols-4">
        <Panel title="Threat Forecast (24H)">
          <MultiLine series={[
            { name: 'Critical', c: RED, pts: W('fc', 20, 70, 13) },
            { name: 'High', c: AMBER, pts: W('fh', 25, 60, 13) },
            { name: 'Medium', c: GOLD, pts: W('fm', 18, 48, 13) },
            { name: 'Low', c: EMER, pts: W('fl', 10, 36, 13) },
          ]} />
          <div className="mt-1 flex flex-wrap gap-x-3 text-[8px]" style={{ color: MUT }}>
            {[['Critical', RED], ['High', AMBER], ['Medium', GOLD], ['Low', EMER]].map(([l, c]) => (
              <span key={l} className="inline-flex items-center gap-1"><span className="h-1.5 w-1.5 rounded-full" style={{ background: c }} />{l}</span>
            ))}
          </div>
        </Panel>
        <Panel title="Resource Deployment">
          <div className="flex items-center gap-3">
            <Ring value={deployed} sub="Deployed" color={deployed >= 75 ? EMER : AMBER} />
            <div className="flex-1 space-y-1.5">
              {resources.map(([l, v]) => (
                <div key={l} className="flex items-center justify-between text-[9px]">
                  <span style={{ color: SOFT }}>{l}</span>
                  <span className="font-mono tabular-nums" style={{ color: INK }}>{v}</span>
                </div>
              ))}
            </div>
          </div>
        </Panel>
        <Panel title="Intelligence Summary">
          <div className="space-y-2.5">
            {intel.map(([l, v, d, c]) => (
              <div key={l} className="flex items-center gap-2 text-[10px]">
                <span className="grid h-5 w-5 shrink-0 place-items-center rounded text-[9px]" style={{ background: PANEL2, color: CYAN }} aria-hidden>◈</span>
                <span className="min-w-0 flex-1" style={{ color: SOFT }}>{l}</span>
                <span className="font-mono tabular-nums" style={{ color: INK }}>{v}</span>
                <span className="w-9 text-right font-mono tabular-nums" style={{ color: c }}>{d}</span>
              </div>
            ))}
          </div>
        </Panel>
        <Panel title="Regional Risk Distribution">
          <RiskHexMap seedKey={`no:rx:${id}`} />
          <div className="mt-2 flex flex-wrap gap-x-3 text-[8px]" style={{ color: MUT }}>
            {[['Critical', RED], ['High', AMBER], ['Medium', GOLD], ['Low', CYAN], ['Minimal', '#274652']].map(([l, c]) => (
              <span key={l} className="inline-flex items-center gap-1"><span className="h-1.5 w-1.5 rounded-full" style={{ background: c }} />{l}</span>
            ))}
          </div>
        </Panel>
      </div>

      {/* ── Command feed ───────────────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-x-6 gap-y-1 rounded-[4px] border px-4 py-2.5"
        style={{ borderColor: LINE, background: PANEL }}>
        <span className="text-[9px] font-bold uppercase tracking-[0.18em]" style={{ color: RED }}>Command Feed</span>
        {feed.map(([t, e]) => (
          <span key={e} className="flex items-center gap-2 text-[9px]">
            <span className="font-mono" style={{ color: MUT }}>{t}</span>
            <span style={{ color: SOFT }}>{e}</span>
          </span>
        ))}
        <span className="ml-auto text-[8.5px] font-semibold uppercase tracking-[0.12em]" style={{ color: RED }}>View All Updates →</span>
      </div>
    </div>
  );
}
