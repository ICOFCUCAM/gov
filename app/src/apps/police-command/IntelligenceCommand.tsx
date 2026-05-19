'use client';

// Intelligence Fusion — National Intelligence & Analytics Center. Dense
// intelligence command surface modelled on the benchmark: intel KPI strip,
// threat network graph, live intelligence feed, threat categories, intel
// sources donut, geographic risk map, top priorities, intel-reports
// summary, sensitive communications, anomaly detection, active operations
// and an intelligence timeline. Pure & deterministic — engine + telemetry.

import * as React from 'react';
import { policeOps } from '@/lib/gov/agency-systems';
import { wave, waveSeries, seed } from '@/lib/telemetry';

const BG = '#06080e';
const PANEL = '#0b0f17';
const PANEL2 = '#0f131c';
const LINE = 'rgba(224,104,95,0.16)';
const RED = '#e0685f';
const RED_BR = '#f4877c';
const AMBER = '#e0a13a';
const GOLD = '#c9a24a';
const CYAN = '#4fb3d9';
const EMER = '#3fae82';
const VIOLET = '#9b8cff';
const INK = '#d6dde6';
const SOFT = '#93a0ad';
const MUT = '#62707e';
const SERIF = 'Georgia, "Times New Roman", ui-serif, serif';
const SEV_C: Record<string, string> = { CRITICAL: RED, HIGH: AMBER, MEDIUM: GOLD, LOW: EMER };

function Donut({ segs, top, sub, size = 132 }: {
  segs: { label: string; v: number; n: string; c: string }[]; top: string; sub: string; size?: number;
}) {
  const sum = segs.reduce((s, x) => s + x.v, 0) || 1;
  const r = size / 2 - 11, circ = 2 * Math.PI * r;
  let acc = 0;
  return (
    <div className="flex items-center gap-4">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="shrink-0" aria-hidden>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#161c26" strokeWidth="11" />
        {segs.map((s, i) => {
          const fr = s.v / sum;
          const el = <circle key={i} cx={size / 2} cy={size / 2} r={r} fill="none" stroke={s.c} strokeWidth="11"
            strokeDasharray={`${fr * circ} ${circ}`} strokeDashoffset={-acc * circ}
            transform={`rotate(-90 ${size / 2} ${size / 2})`} />;
          acc += fr; return el;
        })}
        <text x="50%" y="47%" textAnchor="middle" fontSize={size * 0.16} fontWeight="700" fill={INK} style={{ fontFamily: SERIF }}>{top}</text>
        <text x="50%" y="59%" textAnchor="middle" fontSize={size * 0.072} fill={MUT} className="uppercase" style={{ letterSpacing: '0.1em' }}>{sub}</text>
      </svg>
      <div className="min-w-0 flex-1 space-y-1.5">
        {segs.map(s => (
          <div key={s.label} className="flex items-center gap-1.5 text-[9px]">
            <span className="h-1.5 w-1.5 rounded-full" style={{ background: s.c }} />
            <span className="min-w-0 flex-1 truncate" style={{ color: SOFT }}>{s.label}</span>
            <span className="font-mono tabular-nums" style={{ color: INK }}>{s.n}</span>
            <span className="w-8 text-right font-mono tabular-nums" style={{ color: MUT }}>{Math.round((s.v / sum) * 100)}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function Area({ pts, color = EMER, h = 96 }: { pts: number[]; color?: string; h?: number }) {
  const mn = Math.min(...pts), sp = Math.max(...pts) - mn || 1;
  const xy = pts.map((p, i) => [(i / (pts.length - 1)) * 100, 92 - ((p - mn) / sp) * 80] as [number, number]);
  const line = xy.map(([x, y]) => `${x},${y}`).join(' ');
  return (
    <svg viewBox="0 0 100 100" preserveAspectRatio="none" style={{ width: '100%', height: h }} aria-hidden>
      {[24, 48, 72].map(y => <line key={y} x1="0" y1={y} x2="100" y2={y} stroke="#161c26" strokeWidth="0.4" />)}
      <polygon points={`0,92 ${line} 100,92`} fill={color} opacity="0.12" />
      <polyline points={line} fill="none" stroke={color} strokeWidth="1" vectorEffect="non-scaling-stroke"
        style={{ filter: `drop-shadow(0 0 2px color-mix(in srgb,${color} 45%,transparent))` }} />
      {xy.filter((_, i) => i % 2 === 0).map(([x, y], i) => <circle key={i} cx={x} cy={y} r="1.1" fill={color} vectorEffect="non-scaling-stroke" />)}
    </svg>
  );
}

// Threat network graph: central threat node + ringed entity nodes.
function ThreatGraph({ seedKey }: { seedKey: string }) {
  const ring1 = Array.from({ length: 7 }).map((_, i) => {
    const a = (i / 7) * Math.PI * 2;
    return { x: 50 + Math.cos(a) * 18, y: 42 + Math.sin(a) * 22, lvl: seed(`${seedKey}:a:${i}`) };
  });
  const ring2 = Array.from({ length: 10 }).map((_, i) => {
    const a = (i / 10) * Math.PI * 2 + 0.3;
    return { x: 50 + Math.cos(a) * 34, y: 42 + Math.sin(a) * 36, lvl: seed(`${seedKey}:b:${i}`) };
  });
  const col = (l: number) => (l > 0.72 ? RED : l > 0.5 ? AMBER : l > 0.3 ? GOLD : EMER);
  return (
    <div className="relative h-full overflow-hidden rounded-[3px]" style={{ background: 'radial-gradient(120% 100% at 50% 50%,#120c10,#06080e)' }}>
      <svg viewBox="0 0 100 84" preserveAspectRatio="none" className="h-full w-full" aria-hidden>
        {ring1.map((n, i) => <line key={`l1${i}`} x1="50" y1="42" x2={n.x} y2={n.y} stroke={RED} strokeWidth="0.4" opacity="0.45" />)}
        {ring2.map((n, i) => {
          const p = ring1[i % ring1.length]!;
          return <line key={`l2${i}`} x1={p.x} y1={p.y} x2={n.x} y2={n.y} stroke={col(n.lvl)} strokeWidth="0.3" opacity="0.3" />;
        })}
        <circle cx="50" cy="42" r="10" fill="none" stroke={RED} strokeWidth="0.4" opacity="0.4" />
        <circle cx="50" cy="42" r="4.6" fill={RED} style={{ filter: `drop-shadow(0 0 6px ${RED})` }} />
        <text x="50" y="44.4" textAnchor="middle" fontSize="4" fill="#1a0c0c" fontWeight="700">☠</text>
        {ring1.map((n, i) => (
          <g key={`r1${i}`}>
            <circle cx={n.x} cy={n.y} r="3" fill="none" stroke={col(n.lvl)} strokeWidth="0.5" />
            <circle cx={n.x} cy={n.y} r="1.7" fill={col(n.lvl)} />
          </g>
        ))}
        {ring2.map((n, i) => (
          <circle key={`r2${i}`} cx={n.x} cy={n.y} r={1.2 + n.lvl * 1.2} fill={col(n.lvl)} opacity="0.85" />
        ))}
      </svg>
      <div className="absolute bottom-2 left-1/2 flex -translate-x-1/2 gap-3 rounded-[2px] border px-3 py-1" style={{ borderColor: LINE, background: 'rgba(6,8,14,0.78)' }}>
        {[['Critical', RED], ['High', AMBER], ['Medium', GOLD], ['Low', EMER], ['Monitored', CYAN]].map(([l, c]) => (
          <span key={l} className="flex items-center gap-1.5 text-[7.5px] uppercase tracking-wider" style={{ color: SOFT }}>
            <span className="h-1.5 w-1.5 rounded-full" style={{ background: c }} />{l}
          </span>
        ))}
      </div>
    </div>
  );
}

function RiskWorld({ seedKey }: { seedKey: string }) {
  const cols = 34, rows = 14;
  return (
    <div className="relative h-full overflow-hidden rounded-[3px]" style={{ background: 'radial-gradient(120% 90% at 55% 45%,#0e1118,#06080e)' }}>
      <div className="grid h-full gap-[2px] p-2" style={{ gridTemplateColumns: `repeat(${cols},1fr)` }} aria-hidden>
        {Array.from({ length: cols * rows }).map((_, i) => {
          const cx = i % cols, ry = Math.floor(i / cols);
          const land = (ry > 1 && ry < rows - 1 && ((cx > 3 && cx < 13) || (cx > 15 && cx < 28)));
          const v = seed(`${seedKey}:${i}`);
          const c = !land ? 'transparent' : cx > 15 ? (v > 0.6 ? RED : v > 0.38 ? AMBER : '#3a2622') : (v > 0.7 ? AMBER : v > 0.45 ? GOLD : '#2a3a44');
          return <span key={i} className="aspect-square rounded-[1px]" style={{ background: c, opacity: land ? 0.85 : 0 }} />;
        })}
      </div>
      <div className="absolute right-2 top-2 flex flex-col gap-1">
        {['+', '−', '⌖'].map(s => <span key={s} className="grid h-6 w-6 place-items-center rounded-[2px] border text-[11px]" style={{ borderColor: LINE, background: PANEL, color: SOFT }} aria-hidden>{s}</span>)}
      </div>
      <div className="absolute bottom-2 left-1/2 flex -translate-x-1/2 gap-3 rounded-[2px] border px-3 py-1" style={{ borderColor: LINE, background: 'rgba(6,8,14,0.78)' }}>
        {[['Critical', RED], ['High', AMBER], ['Medium', GOLD], ['Low', EMER], ['Minimal', '#2a3a44']].map(([l, c]) => (
          <span key={l} className="flex items-center gap-1.5 text-[7.5px] uppercase tracking-wider" style={{ color: SOFT }}>
            <span className="h-1.5 w-1.5 rounded-full" style={{ background: c }} />{l}
          </span>
        ))}
      </div>
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
        {action ? <span className="text-[8px] font-semibold uppercase tracking-[0.12em]" style={{ color: RED }}>{action}</span> : null}
      </div>
      <div className="flex-1 p-3">{children}</div>
    </section>
  );
}

export function IntelligenceCommand({ id, now }: { id: string; now: number }) {
  const ts = now / 4000;
  const o = policeOps(id, ts);
  const clock = new Date(now);
  const hh = clock.toLocaleTimeString('en-GB', { hour12: false });
  const dd = clock.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).toUpperCase();
  const day = clock.toLocaleDateString('en-GB', { weekday: 'long' }).toUpperCase();
  const W = (k: string, lo: number, hi: number, n = 14) => waveSeries(`if:${k}:${id}`, ts, n, lo, hi);

  const threats = Math.round(wave(`if:th:${id}`, ts, 240, 440));
  const reports = Math.round(wave(`if:rp:${id}`, ts, 10, 26));
  const sources = 1276;
  const accuracy = Math.round(wave(`if:ac:${id}`, ts, 78, 94));
  const activeOps = o.openInvestigations + 100;
  const intelStatus = Math.round((accuracy + 4) * 10) / 10;

  const kpis: [string, string, string, string][] = [
    ['Threats Detected (24H)', `${threats}`, '+12%', RED],
    ['Intel Reports (24H)', `${reports}`, '+6%', RED],
    ['Sources Monitored', sources.toLocaleString(), '+8%', INK],
    ['Intel Accuracy', `${accuracy}%`, '+3%', INK],
    ['Active Operations', `${activeOps}`, '+9%', INK],
    ['Overall Intel Status', `${intelStatus}%`, 'Reliable', EMER],
  ];

  const feed: [string, string, string, string][] = [
    ['Terrorist Communication Intercepted', 'Northern Corridor', '12:35', 'CRITICAL'],
    ['Suspicious Funds Transfer Detected', 'West Region', '12:18', 'HIGH'],
    ['Foreign Intelligence Activity', 'Diplomatic Channel', '11:57', 'HIGH'],
    ['Arms Smuggling Route Identified', 'Coastal Sector', '11:42', 'MEDIUM'],
    ['Cyber Espionage Attempt Blocked', 'Government Network', '11:28', 'MEDIUM'],
    ['Protest Mobilization Detected', 'Capital City', '10:47', 'LOW'],
  ];
  const categories: [string, number, number][] = [
    ['Terrorism', 98, 8], ['Espionage', 76, 5], ['Cyber Threats', 64, 12], ['Organized Crime', 41, -2],
    ['Separatist Movements', 33, 1], ['Foreign Influence', 28, 3], ['Proliferation', 17, 0],
  ];
  const priorities: [string, string][] = [
    ['Prevent Terror Attack on Critical Infrastructure', 'CRITICAL'],
    ['Disrupt Arms Smuggling Network', 'HIGH'],
    ['Counter Foreign Espionage Operations', 'HIGH'],
    ['Monitor Border Infiltration Attempts', 'MEDIUM'],
    ['Track Financial Crime Networks', 'MEDIUM'],
  ];
  const comms: [string, number, number][] = [
    ['Intercepted Communications', 126, 15], ['Encrypted Communications', 89, 7],
    ['Decrypted Messages', 43, 6], ['Priority Intercepts', 18, 2], ['Threat Communications', 37, 13],
  ];
  const operations: [string, string, string][] = [
    ['Operation Silent Shield', 'Northern Region', 'CRITICAL'],
    ['Operation Coastal Watch', 'Eastern Seaboard', 'HIGH'],
    ['Operation Cyber Sentinel', 'National Network', 'HIGH'],
    ['Operation Border Guard', 'Western Corridor', 'MEDIUM'],
    ['Operation Deep Scan', 'Central Region', 'LOW'],
  ];
  const timeline: [string, string, string][] = [
    ['12:40', 'High-risk communication intercepted', 'Northern Corridor'],
    ['12:28', 'Suspicious transaction flagged', 'West Region'],
    ['12:15', 'Foreign agent activity detected', 'Diplomatic Channel'],
    ['12:05', 'Arms shipment tracking initiated', 'Coastal Area'],
    ['11:52', 'Cyber threat neutralized', 'Government Network'],
    ['11:41', 'Protest mobilization monitoring', 'Capital City'],
  ];

  return (
    <div className="space-y-2 rounded-[5px] p-2" style={{ background: BG, boxShadow: 'inset 0 0 140px rgba(0,0,0,0.7)' }}>
      {/* ── Header ─────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-x-6 gap-y-2 rounded-[4px] border px-4 py-3"
        style={{ borderColor: LINE, background: 'linear-gradient(100deg,#0b0f17,#11141d)' }}>
        <div className="flex items-center gap-3">
          <span className="grid h-10 w-10 place-items-center rounded-full text-[15px]" style={{ border: `1px solid ${RED}`, color: RED }} aria-hidden>◬</span>
          <div>
            <div className="text-[17px] font-bold uppercase tracking-[0.14em]" style={{ color: INK, fontFamily: SERIF }}>Intelligence Fusion</div>
            <div className="text-[8px] uppercase tracking-[0.22em]" style={{ color: RED }}>National Intelligence &amp; Analytics Center</div>
          </div>
        </div>
        <div className="ml-auto flex flex-wrap items-center gap-x-6 gap-y-1 text-[8.5px]" style={{ color: MUT }}>
          <span><span style={{ color: SOFT }}>{dd}</span> · {day}</span>
          <span>TIME <span className="font-mono text-[11px]" style={{ color: INK }}>{hh}</span> GMT+1</span>
          <span className="flex items-center gap-1.5"><span className="relative inline-block">🔔<span className="absolute -right-1.5 -top-1.5 grid h-3 w-3 place-items-center rounded-full text-[6px] font-bold text-white" style={{ background: RED }}>9</span></span><span className="uppercase tracking-[0.12em]">Alerts</span></span>
          <span className="flex items-center gap-1.5 rounded-[3px] border px-2 py-1" style={{ borderColor: LINE }}>
            <span className="grid h-5 w-5 place-items-center rounded-full text-[8px] font-bold" style={{ background: RED, color: '#160a09' }}>DI</span>
            <span><span className="block uppercase tracking-[0.1em]" style={{ color: MUT }}>Director of Intelligence</span><span style={{ color: INK }}>National Intelligence Service</span></span>
          </span>
        </div>
      </div>

      {/* ── KPI strip ──────────────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-px overflow-hidden rounded-[4px] border md:grid-cols-3 xl:grid-cols-6"
        style={{ borderColor: LINE, background: LINE }}>
        {kpis.map(([l, v, s, c]) => (
          <div key={l} className="px-3 py-2.5 text-center" style={{ background: PANEL }}>
            <div className="text-[7.5px] font-semibold uppercase tracking-[0.16em]" style={{ color: MUT }}>{l}</div>
            <div className="mt-1 text-[18px] font-bold tabular-nums" style={{ color: c, fontFamily: SERIF }}>{v}</div>
            <div className="text-[8px]" style={{ color: s.startsWith('+') ? EMER : SOFT }}>{s}</div>
          </div>
        ))}
      </div>

      {/* ── Row 1 ──────────────────────────────────────────────── */}
      <div className="grid gap-2 xl:grid-cols-[1.6fr_1fr_1fr]">
        <Panel title="Threat Network Graph" action="All Threats ▾">
          <div className="h-[280px]"><ThreatGraph seedKey={`if:tg:${id}`} /></div>
        </Panel>
        <Panel title="Intelligence Feed (Live)" action="View All">
          <div className="space-y-1.5">
            {feed.map(([t, rg, tm, sv]) => (
              <div key={t} className="flex items-center gap-2 text-[9px]">
                <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full text-[10px]" style={{ background: `color-mix(in srgb,${SEV_C[sv]} 16%,transparent)`, color: SEV_C[sv] }} aria-hidden>◈</span>
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
        <Panel title="Threat Categories" action="View All">
          <div className="space-y-2">
            {categories.map(([l, v, d]) => (
              <div key={l} className="text-[9px]">
                <div className="flex items-center gap-2">
                  <span className="min-w-0 flex-1" style={{ color: SOFT }}>{l}</span>
                  <span className="font-mono tabular-nums" style={{ color: INK }}>{v}</span>
                  <span className="w-8 text-right font-mono tabular-nums" style={{ color: d > 0 ? RED : d < 0 ? EMER : MUT }}>{d > 0 ? '+' : ''}{d}%</span>
                </div>
                <div className="mt-0.5 h-1 overflow-hidden rounded-full" style={{ background: '#161c26' }}>
                  <span className="block h-full rounded-full" style={{ width: `${Math.min(100, v)}%`, background: v >= 60 ? RED : v >= 35 ? AMBER : GOLD }} />
                </div>
              </div>
            ))}
          </div>
        </Panel>
      </div>

      {/* ── Row 2 ──────────────────────────────────────────────── */}
      <div className="grid gap-2 xl:grid-cols-3">
        <Panel title="Intelligence Sources" action="View All">
          <Donut top={sources.toLocaleString()} sub="Total Sources" segs={[
            { label: 'Human Intelligence', v: 32, n: '412', c: RED }, { label: 'Signals Intelligence', v: 28, n: '356', c: AMBER },
            { label: 'Open Source Intel', v: 23, n: '298', c: GOLD }, { label: 'Cyber Intelligence', v: 11, n: '142', c: CYAN },
            { label: 'Imagery Intelligence', v: 5, n: '68', c: VIOLET },
          ]} />
        </Panel>
        <Panel title="Geographic Risk Map" action="View Full Map">
          <div className="h-[170px]"><RiskWorld seedKey={`if:rw:${id}`} /></div>
        </Panel>
        <Panel title="Top Intelligence Priorities" action="View All">
          <div className="flex text-[7.5px] uppercase tracking-wider" style={{ color: MUT }}>
            <span className="flex-1">Priority</span><span className="w-16 text-right">Risk Level</span>
          </div>
          <div className="mt-1 space-y-2">
            {priorities.map(([p, lvl]) => (
              <div key={p} className="flex items-center gap-2 text-[9px]">
                <span className="min-w-0 flex-1" style={{ color: SOFT }}>{p}</span>
                <span className="w-16 text-right text-[7.5px] font-bold uppercase" style={{ color: SEV_C[lvl] }}>{lvl}</span>
              </div>
            ))}
          </div>
        </Panel>
      </div>

      {/* ── Row 3 ──────────────────────────────────────────────── */}
      <div className="grid gap-2 lg:grid-cols-2 xl:grid-cols-4">
        <Panel title="Intel Reports Summary" action="View All">
          <Area pts={W('irs', 30, 100, 13)} color={EMER} />
          <div className="mt-2 grid grid-cols-2 gap-1.5 border-t pt-2 text-[9px]" style={{ borderColor: LINE }}>
            {([['Total Reports', '1,842', '+14%'], ['Actionable', '432', '+11%'], ['Pending Review', '126', '-3%'], ['Disseminated', '1,284', '+9%']] as [string, string, string][]).map(([l, v, d]) => (
              <div key={l}><div className="text-[7px] uppercase tracking-wider" style={{ color: MUT }}>{l}</div><div className="font-mono" style={{ color: INK }}>{v} <span style={{ color: d.startsWith('-') ? AMBER : EMER }}>{d}</span></div></div>
            ))}
          </div>
        </Panel>
        <Panel title="Sensitive Communications (24H)" action="View All">
          <div className="space-y-2.5">
            {comms.map(([l, v, d]) => (
              <div key={l} className="flex items-center gap-2 text-[9px]">
                <span className="grid h-5 w-5 place-items-center rounded text-[9px]" style={{ background: PANEL2, color: CYAN }} aria-hidden>✉</span>
                <span className="min-w-0 flex-1" style={{ color: SOFT }}>{l}</span>
                <span className="font-mono tabular-nums" style={{ color: INK }}>{v}</span>
                <span className="w-9 text-right font-mono tabular-nums" style={{ color: EMER }}>+{d}%</span>
              </div>
            ))}
          </div>
        </Panel>
        <Panel title="Anomaly Detection" action="View Trend">
          <Donut size={108} top="23" sub="Anomalies" segs={[
            { label: 'Critical', v: 5, n: '5', c: RED }, { label: 'High', v: 9, n: '9', c: AMBER },
            { label: 'Medium', v: 6, n: '6', c: GOLD }, { label: 'Low', v: 3, n: '3', c: EMER },
          ]} />
          <div className="mt-2 border-t pt-2 text-center text-[9px]" style={{ borderColor: LINE }}>
            <span style={{ color: MUT }}>vs yesterday </span><span style={{ color: RED }}>+21%</span>
          </div>
        </Panel>
        <Panel title="Active Operations" action="View All">
          <div className="space-y-2">
            {operations.map(([t, rg, sv]) => (
              <div key={t} className="flex items-center gap-2 text-[9px]">
                <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: SEV_C[sv] }} />
                <div className="min-w-0 flex-1">
                  <div className="truncate" style={{ color: INK }}>{t}</div>
                  <div className="text-[8px]" style={{ color: MUT }}>{rg}</div>
                </div>
                <span className="w-12 text-right text-[7.5px] font-bold uppercase" style={{ color: SEV_C[sv] }}>{sv}</span>
              </div>
            ))}
          </div>
        </Panel>
      </div>

      {/* ── Intelligence timeline ──────────────────────────────── */}
      <div className="rounded-[4px] border px-4 py-2.5" style={{ borderColor: LINE, background: PANEL }}>
        <div className="mb-2 flex items-center justify-between">
          <span className="text-[9px] font-bold uppercase tracking-[0.18em]" style={{ color: RED }}>Intelligence Timeline</span>
          <span className="text-[8px] font-semibold uppercase tracking-[0.12em]" style={{ color: RED }}>View Full Timeline →</span>
        </div>
        <div className="grid grid-cols-2 gap-x-6 gap-y-2 md:grid-cols-3 xl:grid-cols-6">
          {timeline.map(([t, e, rg]) => (
            <div key={e} className="flex gap-2 text-[8.5px]">
              <span className="font-mono shrink-0" style={{ color: RED_BR }}>{t}</span>
              <span><span className="block" style={{ color: SOFT }}>{e}</span><span style={{ color: MUT }}>{rg}</span></span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
