'use client';

// Cybercrime Unit — National Cyber Defense & Digital Forensics Center.
// Dense cyber command surface modelled on the benchmark: cyber KPI strip,
// live cyber threat map, live incidents, top threat actors, incidents by
// category, incident trend, investigation status, digital-evidence
// collection, cyber attack surface, malware detections, system protection
// and recent forensic cases. Pure & deterministic — engine + telemetry.

import * as React from 'react';
import { policeOps } from '@/lib/gov/agency-systems';
import { wave, waveSeries, seed } from '@/lib/telemetry';

const BG = '#05080d';
const PANEL = '#0a0e16';
const PANEL2 = '#0e131b';
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
        <text x="50%" y="48%" textAnchor="middle" fontSize={size * 0.2} fontWeight="700" fill={INK} style={{ fontFamily: SERIF }}>{top}</text>
        <text x="50%" y="60%" textAnchor="middle" fontSize={size * 0.08} fill={MUT} className="uppercase" style={{ letterSpacing: '0.1em' }}>{sub}</text>
      </svg>
      <div className="min-w-0 flex-1 space-y-1.5">
        {segs.map(s => (
          <div key={s.label} className="flex items-center gap-1.5 text-[9px]">
            <span className="h-1.5 w-1.5 rounded-[1px]" style={{ background: s.c }} />
            <span className="min-w-0 flex-1 truncate" style={{ color: SOFT }}>{s.label}</span>
            <span className="font-mono tabular-nums" style={{ color: INK }}>{s.n}</span>
            <span className="w-9 text-right font-mono tabular-nums" style={{ color: MUT }}>{Math.round((s.v / sum) * 100)}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function MultiLine({ series, height = 130 }: { series: { name: string; c: string; pts: number[] }[]; height?: number }) {
  const all = series.flatMap(s => s.pts);
  const mn = Math.min(...all), sp = Math.max(...all) - mn || 1;
  const line = (pts: number[]) => pts.map((p, i) => `${(i / (pts.length - 1)) * 100},${92 - ((p - mn) / sp) * 80}`).join(' ');
  return (
    <svg viewBox="0 0 100 100" preserveAspectRatio="none" style={{ width: '100%', height }} aria-hidden>
      {[22, 44, 66, 88].map(y => <line key={y} x1="0" y1={y} x2="100" y2={y} stroke="#161c26" strokeWidth="0.4" />)}
      {series.map(s => (
        <polyline key={s.name} points={line(s.pts)} fill="none" stroke={s.c} strokeWidth="1" vectorEffect="non-scaling-stroke"
          style={{ filter: `drop-shadow(0 0 2px color-mix(in srgb,${s.c} 45%,transparent))` }} />
      ))}
    </svg>
  );
}

function BarChart({ pts, color = VIOLET, height = 120 }: { pts: number[]; color?: string; height?: number }) {
  const mx = Math.max(...pts) || 1;
  return (
    <svg viewBox="0 0 100 100" preserveAspectRatio="none" style={{ width: '100%', height }} aria-hidden>
      {[25, 50, 75].map(y => <line key={y} x1="0" y1={y} x2="100" y2={y} stroke="#161c26" strokeWidth="0.4" />)}
      {pts.map((p, i) => {
        const h = (p / mx) * 88, w = 100 / pts.length;
        return <rect key={i} x={i * w + w * 0.18} y={94 - h} width={w * 0.64} height={h} rx="0.6" fill={color} opacity="0.85" />;
      })}
    </svg>
  );
}

function Ring({ a, b, top, sub }: { a: number; b: number; top: string; sub: string }) {
  const sum = a + b || 1, r = 40, circ = 2 * Math.PI * r;
  const fa = a / sum;
  return (
    <svg width="118" height="118" viewBox="0 0 118 118" aria-hidden>
      <circle cx="59" cy="59" r={r} fill="none" stroke="#161c26" strokeWidth="10" />
      <circle cx="59" cy="59" r={r} fill="none" stroke={EMER} strokeWidth="10"
        strokeDasharray={`${fa * circ} ${circ}`} transform="rotate(-90 59 59)" />
      <circle cx="59" cy="59" r={r} fill="none" stroke={RED} strokeWidth="10"
        strokeDasharray={`${(1 - fa) * circ} ${circ}`} strokeDashoffset={-fa * circ} transform="rotate(-90 59 59)" />
      <text x="59" y="56" textAnchor="middle" fontSize="20" fontWeight="700" fill={INK} style={{ fontFamily: SERIF }}>{top}</text>
      <text x="59" y="70" textAnchor="middle" fontSize="8" fill={MUT} className="uppercase" style={{ letterSpacing: '0.1em' }}>{sub}</text>
      <text x="59" y="86" textAnchor="middle" fontSize="13" fill={RED}>🐞</text>
    </svg>
  );
}

// Live cyber threat world map: red threat clusters + gold connection arcs.
function CyberWorld({ seedKey }: { seedKey: string }) {
  const cols = 36, rows = 15;
  const hubs = [
    { x: 20, y: 34, hot: true }, { x: 48, y: 30, hot: false }, { x: 80, y: 38, hot: true },
    { x: 30, y: 56, hot: false }, { x: 62, y: 58, hot: true }, { x: 86, y: 60, hot: true },
  ];
  return (
    <div className="relative h-full overflow-hidden rounded-[3px]" style={{ background: 'radial-gradient(120% 90% at 55% 45%,#0c1018,#05080d)' }}>
      <div className="grid h-full gap-[2px] p-2" style={{ gridTemplateColumns: `repeat(${cols},1fr)` }} aria-hidden>
        {Array.from({ length: cols * rows }).map((_, i) => {
          const cx = i % cols, ry = Math.floor(i / cols);
          const land = (ry > 1 && ry < rows - 1 && ((cx > 2 && cx < 14) || (cx > 16 && cx < 26) || (cx > 27 && cx < 34)));
          const v = seed(`${seedKey}:${i}`);
          const c = !land ? 'transparent' : v > 0.78 ? RED : v > 0.55 ? AMBER : cx > 20 && cx < 26 ? EMER : '#243340';
          return <span key={i} className="aspect-square rounded-[1px]" style={{ background: c, opacity: land ? (v > 0.55 ? 0.9 : 0.5) : 0 }} />;
        })}
      </div>
      <svg viewBox="0 0 100 80" preserveAspectRatio="none" className="pointer-events-none absolute inset-0 h-full w-full" aria-hidden>
        {hubs.map((h, i) => i < hubs.length - 1 ? (
          <path key={i} d={`M${h.x} ${h.y} Q ${(h.x + hubs[i + 1]!.x) / 2} ${Math.min(h.y, hubs[i + 1]!.y) - 14} ${hubs[i + 1]!.x} ${hubs[i + 1]!.y}`}
            fill="none" stroke={GOLD} strokeWidth="0.4" opacity="0.5" strokeDasharray="3 2" />
        ) : null)}
        {hubs.map((h, i) => (
          <g key={`h${i}`}>
            <circle cx={h.x} cy={h.y} r={h.hot ? 5 : 3.4} fill={h.hot ? RED : EMER} opacity="0.2" />
            <circle cx={h.x} cy={h.y} r={h.hot ? 1.8 : 1.3} fill={h.hot ? RED_BR : EMER} style={{ filter: `drop-shadow(0 0 4px ${h.hot ? RED : EMER})` }} />
            {h.hot ? <text x={h.x} y={h.y + 1} textAnchor="middle" fontSize="2.6" fill="#fff">☠</text> : null}
          </g>
        ))}
      </svg>
      <div className="absolute right-2 top-2 flex flex-col gap-1">
        {['+', '−'].map(s => <span key={s} className="grid h-6 w-6 place-items-center rounded-[2px] border text-[12px]" style={{ borderColor: LINE, background: PANEL, color: SOFT }} aria-hidden>{s}</span>)}
      </div>
      <div className="absolute bottom-2 left-2 flex gap-3 rounded-[2px] border px-3 py-1" style={{ borderColor: LINE, background: 'rgba(5,8,13,0.78)' }}>
        {[['Critical', RED], ['High', AMBER], ['Medium', GOLD], ['Low', EMER], ['Monitored', CYAN]].map(([l, c]) => (
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

export function CyberCommand({ id, now }: { id: string; now: number }) {
  const ts = now / 4000;
  const o = policeOps(id, ts);
  const clock = new Date(now);
  const hh = clock.toLocaleTimeString('en-GB', { hour12: false });
  const dd = clock.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).toUpperCase();
  const day = clock.toLocaleDateString('en-GB', { weekday: 'long' }).toUpperCase();
  const W = (k: string, lo: number, hi: number, n = 14) => waveSeries(`cy:${k}:${id}`, ts, n, lo, hi);

  const threats = Math.round(wave(`cy:th:${id}`, ts, 160, 300));
  const incidents = Math.round(wave(`cy:in:${id}`, ts, 130, 240));
  const investigations = o.openInvestigations + 60;
  const arrests = Math.round(wave(`cy:ar:${id}`, ts, 14, 36));
  const evidence = Math.round(wave(`cy:ev:${id}`, ts, 3800, 5400));
  const sysHealth = Math.round(wave(`cy:sh:${id}`, ts, 96, 99.6) * 10) / 10;

  const kpis: [string, string, string, string][] = [
    ['Active Threats', `${threats}`, '+12% vs yesterday', RED],
    ['Incidents (24H)', `${incidents}`, '-6% vs yesterday', AMBER],
    ['Investigations', `${investigations}`, '+8% vs yesterday', INK],
    ['Arrests (24H)', `${arrests}`, '+15% vs yesterday', EMER],
    ['Digital Evidence (GB)', evidence.toLocaleString(), '+9% collected', INK],
    ['System Health', `${sysHealth}%`, 'Optimal', EMER],
  ];

  const live: [string, string, string, string, string][] = [
    ['CRITICAL', 'Ransomware Attack', 'Government Portal Compromise', 'Eastern Region', '12:35'],
    ['HIGH', 'Phishing Campaign', 'Credential Harvesting Detected', 'National', '12:18'],
    ['HIGH', 'Data Breach Attempt', 'Unauthorized Data Access', 'Central Region', '11:57'],
    ['MEDIUM', 'Malware Detected', 'Trojan/Remote Access', 'Western Region', '11:42'],
    ['MEDIUM', 'Web Exploit Attempt', 'SQL Injection Detected', 'Northern Region', '11:28'],
    ['LOW', 'DDoS Attempt', 'Traffic Anomaly Detected', 'Southern Region', '10:47'],
  ];
  const actors: [string, string][] = [
    ['APT28 (Fancy Bear)', 'CRITICAL'], ['Lazarus Group', 'HIGH'], ['LockBit Ransomware', 'HIGH'],
    ['Anonymous Sudan', 'MEDIUM'], ['DarkSide', 'MEDIUM'], ['Script Kiddies', 'LOW'],
  ];
  const surface: [string, number][] = [
    ['Web Applications', 72], ['Network Perimeter', 68], ['Endpoints', 54], ['Email Systems', 46], ['Mobile Devices', 28],
  ];
  const protection = ['Firewall', 'IDS/IPS', 'Endpoint Protection', 'Web Gateway', 'Email Security', 'SIEM Monitoring'];
  const cases: [string, string, string, string][] = [
    ['CYB-2025-2487', 'Financial Fraud', 'In Progress', '12:32'],
    ['CYB-2025-2486', 'Data Theft', 'Under Review', '11:58'],
    ['CYB-2025-2485', 'Identity Fraud', 'Open', '11:21'],
    ['CYB-2025-2484', 'Ransomware', 'In Progress', '10:47'],
    ['CYB-2025-2483', 'System Intrusion', 'Closed', '09:16'],
  ];
  const caseC: Record<string, string> = { 'In Progress': AMBER, 'Under Review': CYAN, Open: EMER, Closed: MUT };
  const feed: [string, string, string][] = [
    ['12:40', 'Ransomware containment · Eastern Region', 'CRITICAL'],
    ['12:28', 'Malicious IP blocked 203.0.113.45', 'HIGH'],
    ['12:15', 'Phishing domain takedown secure-login[.]info', 'HIGH'],
    ['12:05', 'Malware signature update v7.23.5', 'MEDIUM'],
    ['11:52', 'New IOC added · 45 indicators', 'LOW'],
  ];

  return (
    <div className="space-y-2 rounded-[5px] p-2" style={{ background: BG, boxShadow: 'inset 0 0 140px rgba(0,0,0,0.7)' }}>
      {/* ── Header ─────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-x-6 gap-y-2 rounded-[4px] border px-4 py-3"
        style={{ borderColor: LINE, background: 'linear-gradient(100deg,#0a0e16,#10131c)' }}>
        <div className="flex items-center gap-3">
          <span className="grid h-10 w-10 place-items-center rounded-full text-[15px]" style={{ border: `1px solid ${RED}`, color: RED }} aria-hidden>⧉</span>
          <div>
            <div className="text-[17px] font-bold uppercase tracking-[0.14em]" style={{ color: INK, fontFamily: SERIF }}>Cybercrime Unit</div>
            <div className="text-[8px] uppercase tracking-[0.2em]" style={{ color: RED }}>National Cyber Defense &amp; Digital Forensics Center</div>
          </div>
        </div>
        <div className="ml-auto flex flex-wrap items-center gap-x-6 gap-y-1 text-[8.5px]" style={{ color: MUT }}>
          <span><span style={{ color: SOFT }}>{dd}</span> · {day}</span>
          <span>TIME <span className="font-mono text-[11px]" style={{ color: INK }}>{hh}</span> GMT+1</span>
          <span className="flex items-center gap-1.5"><span className="relative inline-block">🔔<span className="absolute -right-1.5 -top-1.5 grid h-3 w-3 place-items-center rounded-full text-[6px] font-bold text-white" style={{ background: RED }}>9</span></span><span className="uppercase tracking-[0.12em]">Alerts</span></span>
          <span className="flex items-center gap-1.5 rounded-[3px] border px-2 py-1" style={{ borderColor: LINE }}>
            <span className="grid h-5 w-5 place-items-center rounded-full text-[8px] font-bold" style={{ background: RED, color: '#160a09' }}>CU</span>
            <span><span className="block uppercase tracking-[0.1em]" style={{ color: MUT }}>Director, Cybercrime Unit</span><span style={{ color: INK }}>National Cyber Defense Agency</span></span>
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
            <div className="text-[8px]" style={{ color: s.startsWith('+') ? EMER : s.startsWith('-') ? AMBER : SOFT }}>{s}</div>
          </div>
        ))}
      </div>

      {/* ── Row 1 ──────────────────────────────────────────────── */}
      <div className="grid gap-2 xl:grid-cols-[1.6fr_1.1fr_1fr]">
        <Panel title="Cyber Threat Map (Live)">
          <div className="h-[270px]"><CyberWorld seedKey={`cy:cw:${id}`} /></div>
        </Panel>
        <Panel title="Live Incidents" action="View All">
          <div className="flex text-[7px] uppercase tracking-wider" style={{ color: MUT }}>
            <span className="w-14">Severity</span><span className="flex-1">Type · Description</span><span className="w-10 text-right">Time</span>
          </div>
          <div className="mt-1 space-y-1.5">
            {live.map(([sv, ty, desc, loc, tm]) => (
              <div key={ty + tm} className="flex items-center gap-2 text-[9px]">
                <span className="w-14 text-[7px] font-bold uppercase" style={{ color: SEV_C[sv] }}>{sv}</span>
                <div className="min-w-0 flex-1">
                  <div className="truncate" style={{ color: INK }}>{ty}</div>
                  <div className="truncate text-[8px]" style={{ color: MUT }}>{desc} · {loc}</div>
                </div>
                <span className="w-10 text-right font-mono text-[8px]" style={{ color: SOFT }}>{tm}</span>
              </div>
            ))}
          </div>
        </Panel>
        <Panel title="Top Threat Actors (24H)" action="View All">
          <div className="space-y-2">
            {actors.map(([a, lvl]) => (
              <div key={a} className="flex items-center gap-2 text-[9px]">
                <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full text-[10px]" style={{ background: `color-mix(in srgb,${SEV_C[lvl]} 16%,transparent)`, color: SEV_C[lvl] }} aria-hidden>☣</span>
                <span className="min-w-0 flex-1" style={{ color: INK }}>{a}</span>
                <span className="w-14 text-right text-[7.5px] font-bold uppercase" style={{ color: SEV_C[lvl] }}>{lvl}</span>
              </div>
            ))}
          </div>
        </Panel>
      </div>

      {/* ── Row 2 ──────────────────────────────────────────────── */}
      <div className="grid gap-2 lg:grid-cols-2 xl:grid-cols-4">
        <Panel title="Incidents by Category (24H)" action="View All">
          <Donut size={120} top={`${incidents}`} sub="Total" segs={[
            { label: 'Malware', v: 30, n: '56', c: RED }, { label: 'Phishing', v: 26, n: '48', c: AMBER },
            { label: 'Unauthorized Access', v: 17, n: '32', c: GOLD }, { label: 'DDoS', v: 14, n: '26', c: CYAN },
            { label: 'Web Exploit', v: 8, n: '14', c: VIOLET }, { label: 'Other', v: 5, n: '8', c: MUT },
          ]} />
        </Panel>
        <Panel title="Incident Trend (7 Days)" action="View Trend">
          <MultiLine series={[
            { name: 'Critical', c: RED, pts: W('tc', 30, 80, 7) },
            { name: 'High', c: AMBER, pts: W('thg', 24, 64, 7) },
            { name: 'Medium', c: GOLD, pts: W('tm', 18, 48, 7) },
            { name: 'Low', c: CYAN, pts: W('tl', 10, 34, 7) },
          ]} />
          <div className="mt-1 flex flex-wrap gap-x-3 text-[8px]" style={{ color: MUT }}>
            {[['Critical', RED], ['High', AMBER], ['Medium', GOLD], ['Low', CYAN]].map(([l, c]) => (
              <span key={l} className="inline-flex items-center gap-1"><span className="h-1.5 w-1.5 rounded-full" style={{ background: c }} />{l}</span>
            ))}
          </div>
        </Panel>
        <Panel title="Investigation Status" action="View All">
          <Donut size={120} top={`${investigations}`} sub="Total" segs={[
            { label: 'Open', v: 43, n: '42', c: EMER }, { label: 'In Progress', v: 32, n: '31', c: CYAN },
            { label: 'Under Review', v: 16, n: '16', c: AMBER }, { label: 'Closed', v: 8, n: '8', c: MUT },
          ]} />
        </Panel>
        <Panel title="Digital Evidence Collected (24H)" action="View All">
          <div className="mb-1 flex items-baseline gap-2">
            <span className="font-mono text-[20px]" style={{ color: VIOLET, fontFamily: SERIF }}>{evidence.toLocaleString()}</span>
            <span className="text-[9px]" style={{ color: MUT }}>GB</span>
            <span className="text-[8px]" style={{ color: EMER }}>+9% vs yesterday</span>
          </div>
          <BarChart pts={W('de', 10, 90, 22)} />
          <div className="mt-1 flex justify-between text-[7.5px] font-mono" style={{ color: MUT }}><span>00:00</span><span>08:00</span><span>16:00</span><span>20:00</span></div>
        </Panel>
      </div>

      {/* ── Row 3 ──────────────────────────────────────────────── */}
      <div className="grid gap-2 lg:grid-cols-2 xl:grid-cols-4">
        <Panel title="Cyber Attack Surface" action="View All">
          <div className="space-y-2.5">
            {surface.map(([l, p]) => (
              <div key={l} className="text-[9px]">
                <div className="flex justify-between"><span style={{ color: SOFT }}>{l}</span><span className="font-mono tabular-nums" style={{ color: INK }}>{p}%</span></div>
                <div className="mt-0.5 h-1.5 overflow-hidden rounded-full" style={{ background: '#161c26' }}>
                  <span className="block h-full rounded-full" style={{ width: `${p}%`, background: p >= 65 ? RED : p >= 45 ? AMBER : GOLD }} />
                </div>
              </div>
            ))}
          </div>
        </Panel>
        <Panel title="Malware Detections (24H)" action="View All">
          <div className="flex items-center gap-3">
            <Ring a={932} b={354} top="1,286" sub="Detections" />
            <div className="space-y-2 text-[9px]">
              <div><div className="text-[7.5px] uppercase tracking-wider" style={{ color: MUT }}>Total</div><div className="font-mono text-[13px]" style={{ color: INK }}>1,286 <span style={{ color: EMER }}>+11%</span></div></div>
              <div className="flex items-center gap-1.5"><span className="h-1.5 w-1.5 rounded-full" style={{ background: EMER }} /><span style={{ color: SOFT }}>Resolved</span><span className="ml-auto font-mono" style={{ color: INK }}>932</span></div>
              <div className="flex items-center gap-1.5"><span className="h-1.5 w-1.5 rounded-full" style={{ background: RED }} /><span style={{ color: SOFT }}>Active</span><span className="ml-auto font-mono" style={{ color: RED }}>354</span></div>
            </div>
          </div>
        </Panel>
        <Panel title="System Protection Status" action="View All">
          <div className="space-y-2">
            {protection.map(p => (
              <div key={p} className="flex items-center justify-between text-[9px]">
                <span className="flex items-center gap-1.5" style={{ color: SOFT }}><span style={{ color: EMER }} aria-hidden>✓</span>{p}</span>
                <span className="text-[7.5px] font-bold uppercase" style={{ color: EMER }}>Protected</span>
              </div>
            ))}
          </div>
        </Panel>
        <Panel title="Recent Forensic Cases" action="View All">
          <div className="flex text-[7px] uppercase tracking-wider" style={{ color: MUT }}>
            <span className="flex-1">Case ID · Type</span><span className="w-16 text-right">Status</span><span className="w-9 text-right">Upd.</span>
          </div>
          <div className="mt-1 space-y-1.5">
            {cases.map(([cid, ty, st, up]) => (
              <div key={cid} className="flex items-center gap-2 text-[9px]">
                <div className="min-w-0 flex-1">
                  <div className="font-mono" style={{ color: INK }}>{cid}</div>
                  <div className="text-[8px]" style={{ color: MUT }}>{ty}</div>
                </div>
                <span className="w-16 text-right text-[7.5px] font-bold uppercase" style={{ color: caseC[st] }}>{st}</span>
                <span className="w-9 text-right font-mono text-[8px]" style={{ color: SOFT }}>{up}</span>
              </div>
            ))}
          </div>
        </Panel>
      </div>

      {/* ── Command feed ───────────────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-x-6 gap-y-1 rounded-[4px] border px-4 py-2.5" style={{ borderColor: LINE, background: PANEL }}>
        <span className="text-[9px] font-bold uppercase tracking-[0.18em]" style={{ color: RED }}>Command Feed <span style={{ color: EMER }}>(Live)</span></span>
        {feed.map(([t, e, sv]) => (
          <span key={e} className="flex items-center gap-2 text-[9px]">
            <span className="font-mono" style={{ color: MUT }}>{t}</span>
            <span style={{ color: SOFT }}>{e}</span>
            <span className="text-[7.5px] font-bold uppercase" style={{ color: SEV_C[sv] }}>{sv}</span>
          </span>
        ))}
        <span className="ml-auto text-[8px] font-semibold uppercase tracking-[0.12em]" style={{ color: RED }}>View All Updates →</span>
      </div>
    </div>
  );
}
