'use client';

// Immigration & Borders — National Immigration and Border Management
// System. Dense border-command surface modelled on the benchmark: entry/
// exit KPI strip, border-crossings world map, crossings by border, entry
// purpose, visa & permit summary, overstay cases, watchlist alerts, recent
// refusals, document alerts, nationality breakdown and a live border feed.
// Pure & deterministic — engine + telemetry only.

import * as React from 'react';
import { immigrationOps } from '@/lib/gov/agency-systems';
import { wave, waveSeries, seed } from '@/lib/telemetry';

const BG = '#070a10';
const PANEL = '#0c1119';
const PANEL2 = '#10151f';
const LINE = 'rgba(120,140,200,0.16)';
const RED = '#e0685f';
const AMBER = '#e0a13a';
const GOLD = '#c9a24a';
const CYAN = '#4fb3d9';
const EMER = '#3fae82';
const BLUE = '#5b8def';
const VIOLET = '#9b8cff';
const INK = '#d6dde6';
const SOFT = '#93a0ad';
const MUT = '#62707e';
const SERIF = 'Georgia, "Times New Roman", ui-serif, serif';

function Donut({ segs, top, sub, size = 150 }: {
  segs: { label: string; v: number; n: string; c: string }[]; top: string; sub: string; size?: number;
}) {
  const sum = segs.reduce((s, x) => s + x.v, 0) || 1;
  const r = size / 2 - 13, circ = 2 * Math.PI * r;
  let acc = 0;
  return (
    <div className="flex items-center gap-4">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="shrink-0" aria-hidden>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#161c26" strokeWidth="13" />
        {segs.map((s, i) => {
          const fr = s.v / sum;
          const el = <circle key={i} cx={size / 2} cy={size / 2} r={r} fill="none" stroke={s.c} strokeWidth="13"
            strokeDasharray={`${fr * circ} ${circ}`} strokeDashoffset={-acc * circ}
            transform={`rotate(-90 ${size / 2} ${size / 2})`} />;
          acc += fr; return el;
        })}
        <text x="50%" y="47%" textAnchor="middle" fontSize={size * 0.15} fontWeight="700" fill={INK} style={{ fontFamily: SERIF }}>{top}</text>
        <text x="50%" y="59%" textAnchor="middle" fontSize={size * 0.062} fill={MUT} className="uppercase" style={{ letterSpacing: '0.1em' }}>{sub}</text>
      </svg>
      <div className="min-w-0 flex-1 space-y-1.5">
        {segs.map(s => (
          <div key={s.label} className="flex items-center gap-1.5 text-[9px]">
            <span className="h-2 w-2 rounded-[2px]" style={{ background: s.c }} />
            <span className="min-w-0 flex-1 truncate" style={{ color: SOFT }}>{s.label}</span>
            <span className="font-mono tabular-nums" style={{ color: INK }}>{s.n}</span>
            <span className="w-12 text-right font-mono tabular-nums" style={{ color: MUT }}>({Math.round((s.v / sum) * 100)}%)</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function Area({ pts, color = EMER, h = 130 }: { pts: number[]; color?: string; h?: number }) {
  const mn = Math.min(...pts), sp = Math.max(...pts) - mn || 1;
  const xy = pts.map((p, i) => [(i / (pts.length - 1)) * 100, 90 - ((p - mn) / sp) * 78] as [number, number]);
  const line = xy.map(([x, y]) => `${x},${y}`).join(' ');
  return (
    <svg viewBox="0 0 100 100" preserveAspectRatio="none" style={{ width: '100%', height: h }} aria-hidden>
      {[20, 40, 60, 80].map(y => <line key={y} x1="0" y1={y} x2="100" y2={y} stroke="#161c26" strokeWidth="0.4" />)}
      <polygon points={`0,92 ${line} 100,92`} fill={color} opacity="0.14" />
      <polyline points={line} fill="none" stroke={color} strokeWidth="1" vectorEffect="non-scaling-stroke"
        style={{ filter: `drop-shadow(0 0 2px color-mix(in srgb,${color} 45%,transparent))` }} />
      {xy.filter((_, i) => i % 2 === 0).map(([x, y], i) => <circle key={i} cx={x} cy={y} r="1.1" fill={color} vectorEffect="non-scaling-stroke" />)}
    </svg>
  );
}

// Border-crossings world map: traffic nodes + curved route arcs.
function BorderWorld({ seedKey }: { seedKey: string }) {
  const cols = 38, rows = 15;
  const hubs = [
    { x: 18, y: 30 }, { x: 30, y: 50 }, { x: 46, y: 28 }, { x: 58, y: 46 },
    { x: 70, y: 32 }, { x: 84, y: 52 }, { x: 36, y: 64 }, { x: 76, y: 60 },
  ].map((h, i) => ({ ...h, t: seed(`${seedKey}:t:${i}`) }));
  const col = (t: number) => (t > 0.66 ? RED : t > 0.42 ? AMBER : EMER);
  return (
    <div className="relative h-full overflow-hidden rounded-[3px]" style={{ background: 'radial-gradient(120% 90% at 52% 45%,#0d121b,#070a10)' }}>
      <div className="grid h-full gap-[2px] p-2" style={{ gridTemplateColumns: `repeat(${cols},1fr)` }} aria-hidden>
        {Array.from({ length: cols * rows }).map((_, i) => {
          const cx = i % cols, ry = Math.floor(i / cols);
          const land = (ry > 1 && ry < rows - 1 && ((cx > 2 && cx < 15) || (cx > 17 && cx < 27) || (cx > 28 && cx < 36)));
          const v = seed(`${seedKey}:${i}`);
          return <span key={i} className="aspect-square rounded-[1px]" style={{ background: land ? (v > 0.86 ? CYAN : '#1b2533') : 'transparent', opacity: land ? (v > 0.86 ? 0.55 : 0.42) : 0 }} />;
        })}
      </div>
      <svg viewBox="0 0 100 80" preserveAspectRatio="none" className="pointer-events-none absolute inset-0 h-full w-full" aria-hidden>
        {hubs.map((h, i) => i < hubs.length - 1 ? (
          <path key={i} d={`M${h.x} ${h.y} Q ${(h.x + hubs[i + 1]!.x) / 2} ${Math.min(h.y, hubs[i + 1]!.y) - 16} ${hubs[i + 1]!.x} ${hubs[i + 1]!.y}`}
            fill="none" stroke={col(h.t)} strokeWidth="0.4" opacity="0.45" />
        ) : null)}
        {hubs.map((h, i) => (
          <g key={`h${i}`}>
            <circle cx={h.x} cy={h.y} r={h.t > 0.66 ? 4.4 : 3} fill={col(h.t)} opacity="0.2" />
            <circle cx={h.x} cy={h.y} r="1.5" fill={col(h.t)} style={{ filter: `drop-shadow(0 0 4px ${col(h.t)})` }} />
          </g>
        ))}
      </svg>
      <div className="absolute right-2 top-2 flex flex-col gap-1">
        {['+', '−'].map(s => <span key={s} className="grid h-6 w-6 place-items-center rounded-[2px] border text-[12px]" style={{ borderColor: LINE, background: PANEL, color: SOFT }} aria-hidden>{s}</span>)}
      </div>
      <div className="absolute bottom-2 left-2 flex gap-3 rounded-[2px] border px-3 py-1" style={{ borderColor: LINE, background: 'rgba(7,10,16,0.78)' }}>
        {[['High Traffic', RED], ['Medium Traffic', AMBER], ['Low Traffic', EMER], ['Closed', MUT]].map(([l, c]) => (
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
        {action ? <span className="text-[8px] font-semibold uppercase tracking-[0.12em]" style={{ color: CYAN }}>{action}</span> : null}
      </div>
      <div className="flex-1 p-3">{children}</div>
    </section>
  );
}

export function ImmigrationCommand({ id, now }: { id: string; now: number }) {
  const ts = now / 4000;
  const o = immigrationOps(id, ts);
  const clock = new Date(now);
  const hh = clock.toLocaleTimeString('en-GB', { hour12: false });
  const dd = clock.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).toUpperCase();
  const day = clock.toLocaleDateString('en-GB', { weekday: 'long' }).toUpperCase();
  const W = (k: string, lo: number, hi: number, n = 14) => waveSeries(`ib:${k}:${id}`, ts, n, lo, hi);

  const entries = Math.round(wave(`ib:en:${id}`, ts, 20000, 30000));
  const exits = Math.round(entries * 0.9);
  const refusals = Math.round(wave(`ib:rf:${id}`, ts, 380, 640));
  const watchHits = o.flaggedEntries + 90;
  const overstay = Math.round(wave(`ib:ov:${id}`, ts, 2600, 3900));
  const docAlerts = Math.round(wave(`ib:da:${id}`, ts, 360, 520));

  const kpis: [string, string, string, string][] = [
    ['Total Entries (Today)', entries.toLocaleString(), '+8.7% vs yesterday', VIOLET],
    ['Total Exits (Today)', exits.toLocaleString(), '+6.2% vs yesterday', BLUE],
    ['Refusals (Today)', `${refusals}`, '+4.1% vs yesterday', AMBER],
    ['Watchlist Hits (Today)', `${watchHits}`, '+3.2% vs yesterday', RED],
    ['Overstay Cases (Active)', overstay.toLocaleString(), '-2.6% vs yesterday', GOLD],
    ['Document Alerts (Today)', `${docAlerts}`, '+5.3% vs yesterday', AMBER],
  ];

  const borders: [string, number, number, number][] = [
    ['Northern Land Border', 6842, 6231, 8.2], ['Eastern Airport', 5421, 4932, 6.7],
    ['Coastal Seaport', 4218, 3856, 5.4], ['Western Land Border', 3105, 2789, 4.1],
    ['Southern Land Border', 2987, 2654, -1.2], ['Central Airport', 2278, 1855, 3.6],
  ];
  const refusalsT: [string, string, string, string, string, string][] = [
    ['12:35', 'Ahmed Al Hassan', 'Syria', 'Invalid Documents', 'Northern Land Border', 'J. Williams'],
    ['12:18', 'Li Wei', 'China', 'Purpose Not Clear', 'Eastern Airport', 'M. Johnson'],
    ['11:57', 'Juan Carlos Silva', 'Brazil', 'Insufficient Funds', 'Coastal Seaport', 'T. Brown'],
    ['11:42', 'Fatima Zahra', 'Morocco', 'Security Concern', 'Western Land Border', 'A. Patel'],
    ['11:28', 'Sergey Ivanov', 'Russia', 'Visa Violation', 'Central Airport', 'D. Kim'],
  ];
  const docTypes: [string, string, string][] = [
    ['Expired Document', '186', '+8'], ['Forged Document', '124', '+5'],
    ['Tampered Document', '78', '-2'], ['Invalid Visa', '48', '+3'],
  ];
  const nationalities: [string, number, number, number][] = [
    ['United States', 4521, 4102, 419], ['India', 3218, 2987, 231], ['China', 2845, 2654, 191],
    ['United Kingdom', 2145, 1987, 158], ['Germany', 1874, 1732, 142], ['Others', 10248, 8855, 1393],
  ];
  const watchAlerts: [string, number, string][] = [
    ['Identity Match', 64, '+2'], ['Travel History Match', 38, '+1'], ['Document Match', 16, '0'], ['Sanctions Match', 10, '0'],
  ];
  const feed: [string, string, string][] = [
    ['12:40', 'High footfall detected', 'Northern Land Border'],
    ['12:28', 'New visa rule applied', 'Eastern Airport'],
    ['12:15', 'Seaport inspection completed', 'Coastal Seaport'],
    ['12:05', 'Watchlist hit review required', 'Central Airport'],
    ['11:52', 'Overstay alert · 3 new cases', ''],
    ['11:41', 'System sync completed', ''],
  ];

  return (
    <div className="space-y-2 rounded-[5px] p-2" style={{ background: BG, boxShadow: 'inset 0 0 140px rgba(0,0,0,0.7)' }}>
      {/* ── Header ─────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-x-6 gap-y-2 rounded-[4px] border px-4 py-3"
        style={{ borderColor: LINE, background: 'linear-gradient(100deg,#0c1119,#11151f)' }}>
        <div className="flex items-center gap-3">
          <span className="grid h-10 w-10 place-items-center rounded-full text-[15px]" style={{ border: `1px solid ${VIOLET}`, color: VIOLET }} aria-hidden>⛬</span>
          <div>
            <div className="text-[17px] font-bold uppercase tracking-[0.14em]" style={{ color: INK, fontFamily: SERIF }}>Immigration &amp; Borders</div>
            <div className="text-[8px] uppercase tracking-[0.2em]" style={{ color: VIOLET }}>National Immigration and Border Management System</div>
          </div>
        </div>
        <div className="ml-auto flex flex-wrap items-center gap-x-6 gap-y-1 text-[8.5px]" style={{ color: MUT }}>
          <span><span style={{ color: SOFT }}>{dd}</span> · {day}</span>
          <span>TIME <span className="font-mono text-[11px]" style={{ color: INK }}>{hh}</span> GMT+1</span>
          <span className="flex items-center gap-1.5"><span className="relative inline-block">🔔<span className="absolute -right-1.5 -top-1.5 grid h-3 w-3 place-items-center rounded-full text-[6px] font-bold text-white" style={{ background: RED }}>9</span></span><span className="uppercase tracking-[0.12em]">Alerts</span></span>
          <span className="flex items-center gap-1.5 rounded-[3px] border px-2 py-1" style={{ borderColor: LINE }}>
            <span className="grid h-5 w-5 place-items-center rounded-full text-[8px] font-bold" style={{ background: VIOLET, color: '#0e0a1a' }}>IB</span>
            <span><span className="block uppercase tracking-[0.1em]" style={{ color: MUT }}>Director, Immigration &amp; Borders</span><span style={{ color: INK }}>National Immigration Service</span></span>
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
            <div className="text-[7.5px]" style={{ color: s.startsWith('+') ? EMER : s.startsWith('-') ? AMBER : SOFT }}>{s}</div>
          </div>
        ))}
      </div>

      {/* ── Row 1 ──────────────────────────────────────────────── */}
      <div className="grid gap-2 xl:grid-cols-[1.6fr_1.1fr_1.1fr]">
        <Panel title="Border Crossings Overview" action="All Borders ▾">
          <div className="h-[260px]"><BorderWorld seedKey={`ib:bw:${id}`} /></div>
        </Panel>
        <Panel title="Crossings by Border (Today)" action="View All">
          <div className="flex text-[7px] uppercase tracking-wider" style={{ color: MUT }}>
            <span className="flex-1">Border Point</span><span className="w-12 text-right">Entries</span><span className="w-12 text-right">Exits</span><span className="w-12 text-right">Trend</span>
          </div>
          <div className="mt-1 space-y-1.5">
            {borders.map(([b, en, ex, tr]) => (
              <div key={b} className="flex items-center text-[9px]">
                <span className="min-w-0 flex-1 truncate" style={{ color: SOFT }}>{b}</span>
                <span className="w-12 text-right font-mono" style={{ color: INK }}>{en.toLocaleString()}</span>
                <span className="w-12 text-right font-mono" style={{ color: SOFT }}>{ex.toLocaleString()}</span>
                <span className="w-12 text-right font-mono" style={{ color: tr >= 0 ? EMER : RED }}>{tr >= 0 ? '+' : ''}{tr}%</span>
              </div>
            ))}
          </div>
        </Panel>
        <Panel title="Entry Purpose (Today)" action="View All">
          <Donut top={entries.toLocaleString()} sub="Total Entries" segs={[
            { label: 'Tourism', v: 43.6, n: '10,842', c: BLUE }, { label: 'Business', v: 26.2, n: '6,521', c: EMER },
            { label: 'Work', v: 17.0, n: '4,218', c: GOLD }, { label: 'Education', v: 8.6, n: '2,145', c: VIOLET },
            { label: 'Other', v: 4.6, n: '1,125', c: MUT },
          ]} />
        </Panel>
      </div>

      {/* ── Row 2 ──────────────────────────────────────────────── */}
      <div className="grid gap-2 xl:grid-cols-3">
        <Panel title="Visa & Permit Summary" action="View All">
          <Donut top="18,657" sub="Active" segs={[
            { label: 'Tourist Visa', v: 42.1, n: '7,842', c: BLUE }, { label: 'Work Permit', v: 28.1, n: '5,236', c: EMER },
            { label: 'Student Visa', v: 15.3, n: '2,845', c: GOLD }, { label: 'Business Visa', v: 10.2, n: '1,892', c: VIOLET },
            { label: 'Other Permits', v: 4.3, n: '842', c: MUT },
          ]} />
        </Panel>
        <Panel title="Overstay Cases" action="View Trend">
          <div className="mb-1 flex items-baseline gap-3">
            <div><div className="text-[7.5px] uppercase tracking-wider" style={{ color: MUT }}>Total Active</div><div className="font-mono text-[20px]" style={{ color: GOLD, fontFamily: SERIF }}>{overstay.toLocaleString()}</div></div>
            <span className="text-[10px]" style={{ color: EMER }}>-2.6% vs yesterday</span>
          </div>
          <Area pts={W('ov', 30, 90, 14).map(v => 100 - v)} color={EMER} h={120} />
          <div className="mt-1 flex justify-between text-[7px] font-mono" style={{ color: MUT }}><span>11 May</span><span>13 May</span><span>15 May</span><span>17 May</span></div>
        </Panel>
        <Panel title="Watchlist Alerts (Today)" action="View All">
          <div className="flex items-center gap-4">
            <Donut size={116} top="128" sub="Total Alerts" segs={[
              { label: 'High Risk', v: 40.6, n: '52', c: RED }, { label: 'Medium Risk', v: 40.6, n: '52', c: AMBER }, { label: 'Low Risk', v: 18.8, n: '24', c: GOLD },
            ]} />
          </div>
          <div className="mt-2 space-y-1.5 border-t pt-2" style={{ borderColor: LINE }}>
            {watchAlerts.map(([l, v, d]) => (
              <div key={l} className="flex items-center gap-2 text-[9px]">
                <span className="grid h-5 w-5 place-items-center rounded text-[9px]" style={{ background: PANEL2, color: RED }} aria-hidden>⚑</span>
                <span className="min-w-0 flex-1" style={{ color: SOFT }}>{l}</span>
                <span className="font-mono tabular-nums" style={{ color: INK }}>{v}</span>
                <span className="w-7 text-right font-mono tabular-nums" style={{ color: d === '0' ? MUT : EMER }}>{d}</span>
              </div>
            ))}
          </div>
        </Panel>
      </div>

      {/* ── Row 3 ──────────────────────────────────────────────── */}
      <div className="grid gap-2 xl:grid-cols-[1.5fr_1fr_1.3fr]">
        <Panel title="Recent Refusals" action="View All">
          <div className="flex text-[7px] uppercase tracking-wider" style={{ color: MUT }}>
            <span className="w-9">Time</span><span className="flex-1">Name · Nationality</span><span className="w-28">Reason</span><span className="w-16 text-right">Officer</span>
          </div>
          <div className="mt-1 space-y-1.5">
            {refusalsT.map(([tm, nm, nat, rs, , of]) => (
              <div key={nm} className="flex items-center text-[9px]">
                <span className="w-9 font-mono" style={{ color: SOFT }}>{tm}</span>
                <div className="min-w-0 flex-1"><span style={{ color: INK }}>{nm}</span> <span style={{ color: MUT }}>· {nat}</span></div>
                <span className="w-28 truncate" style={{ color: AMBER }}>{rs}</span>
                <span className="w-16 text-right font-mono text-[8px]" style={{ color: SOFT }}>{of}</span>
              </div>
            ))}
          </div>
        </Panel>
        <Panel title="Document Alerts (Today)" action="View All">
          <div className="space-y-2.5">
            {docTypes.map(([l, v, d]) => (
              <div key={l} className="flex items-center gap-2 text-[9px]">
                <span className="grid h-5 w-5 place-items-center rounded text-[9px]" style={{ background: PANEL2, color: AMBER }} aria-hidden>▤</span>
                <span className="min-w-0 flex-1" style={{ color: SOFT }}>{l}</span>
                <span className="font-mono tabular-nums" style={{ color: INK }}>{v}</span>
                <span className="w-7 text-right font-mono tabular-nums" style={{ color: d.startsWith('-') ? RED : EMER }}>{d}</span>
              </div>
            ))}
            <div className="flex justify-between border-t pt-1.5 text-[9px]" style={{ borderColor: LINE }}>
              <span style={{ color: MUT }}>Total Alerts</span><span className="font-mono" style={{ color: INK }}>{docAlerts} <span style={{ color: EMER }}>+5.3%</span></span>
            </div>
          </div>
        </Panel>
        <Panel title="Nationality Breakdown (Today)" action="View All">
          <div className="flex text-[7px] uppercase tracking-wider" style={{ color: MUT }}>
            <span className="flex-1">Nationality</span><span className="w-12 text-right">Entries</span><span className="w-12 text-right">Exits</span><span className="w-12 text-right">Net</span>
          </div>
          <div className="mt-1 space-y-1.5">
            {nationalities.map(([n, en, ex, net]) => (
              <div key={n} className="flex items-center text-[9px]">
                <span className="min-w-0 flex-1 truncate" style={{ color: SOFT }}>{n}</span>
                <span className="w-12 text-right font-mono" style={{ color: INK }}>{en.toLocaleString()}</span>
                <span className="w-12 text-right font-mono" style={{ color: SOFT }}>{ex.toLocaleString()}</span>
                <span className="w-12 text-right font-mono" style={{ color: EMER }}>+{net.toLocaleString()}</span>
              </div>
            ))}
          </div>
        </Panel>
      </div>

      {/* ── Border feed ────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-x-6 gap-y-1 rounded-[4px] border px-4 py-2.5" style={{ borderColor: LINE, background: PANEL }}>
        <span className="text-[9px] font-bold uppercase tracking-[0.18em]" style={{ color: CYAN }}>Border Feed <span style={{ color: EMER }}>(Live)</span></span>
        {feed.map(([t, e, loc]) => (
          <span key={e} className="flex items-center gap-2 text-[9px]">
            <span className="font-mono" style={{ color: MUT }}>{t}</span>
            <span style={{ color: SOFT }}>{e}</span>
            {loc ? <span className="uppercase tracking-wider" style={{ color: MUT }}>{loc}</span> : null}
          </span>
        ))}
        <span className="ml-auto text-[8px] font-semibold uppercase tracking-[0.12em]" style={{ color: CYAN }}>View All Updates →</span>
      </div>
    </div>
  );
}
