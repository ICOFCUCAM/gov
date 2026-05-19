'use client';

// Civil Registry & ID — National Civil Registry System. Dense civil-
// identity command surface modelled on the benchmark: registry KPI strip,
// population overview, age distribution, ID document status, registration
// services & trend, top offices, digital-ID usage, ID document types,
// data-integrity checks and recent activity. Calmer civil palette
// (blue / green). Pure & deterministic — engine + telemetry only.

import * as React from 'react';
import { interiorOps } from '@/lib/gov/interior-systems';
import { wave, waveSeries } from '@/lib/telemetry';

const BG = '#060b12';
const PANEL = '#0a1119';
const PANEL2 = '#0e151f';
const LINE = 'rgba(79,179,217,0.15)';
const BLUE = '#4fb3d9';
const BLUE_BR = '#7fd0ef';
const EMER = '#3fae82';
const AMBER = '#e0a13a';
const GOLD = '#c9a24a';
const RED = '#e0685f';
const VIOLET = '#9b8cff';
const INK = '#d6e2e8';
const SOFT = '#90a2ac';
const MUT = '#5f7079';
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
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#16212b" strokeWidth="13" />
        {segs.map((s, i) => {
          const fr = s.v / sum;
          const el = <circle key={i} cx={size / 2} cy={size / 2} r={r} fill="none" stroke={s.c} strokeWidth="13"
            strokeDasharray={`${fr * circ} ${circ}`} strokeDashoffset={-acc * circ}
            transform={`rotate(-90 ${size / 2} ${size / 2})`} />;
          acc += fr; return el;
        })}
        <text x="50%" y="47%" textAnchor="middle" fontSize={size * 0.16} fontWeight="700" fill={INK} style={{ fontFamily: SERIF }}>{top}</text>
        <text x="50%" y="59%" textAnchor="middle" fontSize={size * 0.066} fill={MUT} className="uppercase" style={{ letterSpacing: '0.1em' }}>{sub}</text>
      </svg>
      <div className="min-w-0 flex-1 space-y-2">
        {segs.map(s => (
          <div key={s.label} className="text-[10px]">
            <div className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-[2px]" style={{ background: s.c }} />
              <span className="min-w-0 flex-1 truncate" style={{ color: SOFT }}>{s.label}</span>
            </div>
            <div className="ml-3.5 font-mono tabular-nums" style={{ color: INK }}>{s.n} <span style={{ color: MUT }}>({Math.round((s.v / sum) * 100)}%)</span></div>
          </div>
        ))}
      </div>
    </div>
  );
}

function Ring({ value, sub }: { value: number; sub: string }) {
  const v = Math.max(0, Math.min(100, value));
  const r = 38, circ = 2 * Math.PI * r;
  return (
    <svg width="98" height="98" viewBox="0 0 98 98" aria-hidden>
      <circle cx="49" cy="49" r={r} fill="none" stroke="#16212b" strokeWidth="9" />
      <circle cx="49" cy="49" r={r} fill="none" stroke={BLUE} strokeWidth="9" strokeLinecap="round"
        strokeDasharray={circ} strokeDashoffset={circ * (1 - v / 100)} transform="rotate(-90 49 49)"
        style={{ filter: `drop-shadow(0 0 5px color-mix(in srgb,${BLUE} 60%,transparent))` }} />
      <text x="49" y="47" textAnchor="middle" fontSize="20" fontWeight="700" fill={BLUE} style={{ fontFamily: SERIF }}>{Math.round(v)}%</text>
      <text x="49" y="62" textAnchor="middle" fontSize="7" fill={MUT} className="uppercase" style={{ letterSpacing: '0.08em' }}>{sub}</text>
    </svg>
  );
}

function VBars({ pts, color = BLUE, height = 130 }: { pts: number[]; color?: string; height?: number }) {
  const mx = Math.max(...pts) || 1;
  const labels = ['0-4', '5-17', '18-24', '25-34', '35-44', '45-54', '55-64', '65+'];
  return (
    <div>
      <svg viewBox="0 0 100 100" preserveAspectRatio="none" style={{ width: '100%', height }} aria-hidden>
        {[25, 50, 75].map(y => <line key={y} x1="0" y1={y} x2="100" y2={y} stroke="#16212b" strokeWidth="0.4" />)}
        {pts.map((p, i) => {
          const h = (p / mx) * 86, w = 100 / pts.length;
          return <rect key={i} x={i * w + w * 0.16} y={92 - h} width={w * 0.68} height={h} rx="0.8" fill={color} opacity="0.85" />;
        })}
      </svg>
      <div className="mt-1 flex justify-between text-[7px] font-mono" style={{ color: MUT }}>
        {labels.map(l => <span key={l}>{l}</span>)}
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
      {[22, 44, 66, 88].map(y => <line key={y} x1="0" y1={y} x2="100" y2={y} stroke="#16212b" strokeWidth="0.4" />)}
      {series.map(s => (
        <polyline key={s.name} points={line(s.pts)} fill="none" stroke={s.c} strokeWidth="1" vectorEffect="non-scaling-stroke"
          style={{ filter: `drop-shadow(0 0 2px color-mix(in srgb,${s.c} 45%,transparent))` }} />
      ))}
    </svg>
  );
}

function Panel({ title, action, children, className }: {
  title: string; action?: string; children: React.ReactNode; className?: string;
}) {
  return (
    <section className={`flex flex-col rounded-[4px] border ${className ?? ''}`} style={{ borderColor: LINE, background: PANEL }}>
      <div className="flex items-center justify-between border-b px-3 py-2" style={{ borderColor: LINE }}>
        <h3 className="text-[10px] font-bold uppercase tracking-[0.18em]" style={{ color: INK }}>{title}</h3>
        {action ? <span className="text-[8px] font-semibold uppercase tracking-[0.12em]" style={{ color: BLUE }}>{action}</span> : null}
      </div>
      <div className="flex-1 p-3">{children}</div>
    </section>
  );
}

export function CivilRegistryCommand({ id, now }: { id: string; now: number }) {
  const ts = now / 4000;
  const io = interiorOps(id, ts);
  const clock = new Date(now);
  const hh = clock.toLocaleTimeString('en-GB', { hour12: false });
  const dd = clock.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).toUpperCase();
  const day = clock.toLocaleDateString('en-GB', { weekday: 'long' }).toUpperCase();
  const W = (k: string, lo: number, hi: number, n = 14) => waveSeries(`cr:${k}:${id}`, ts, n, lo, hi);

  const popM = Math.round((io.identity.enrolledM * 0.6 + 16) * 100) / 100;
  const births = io.licensing.issuedToday;
  const deaths = Math.round(wave(`cr:de:${id}`, ts, 7000, 12000));
  const idIssued = Math.round(wave(`cr:id:${id}`, ts, 24000, 38000));
  const digitalAct = Math.round(wave(`cr:da:${id}`, ts, 22000, 34000));
  const accuracy = Math.round(io.identity.uptimePct * 100) / 100;

  const kpis: [string, string, string, string][] = [
    ['Registered Citizens', `${popM}M`, '+0.8% vs 30d', INK],
    ['Births Registered (30D)', births.toLocaleString(), '+2.4% vs 30d', EMER],
    ['Deaths Registered (30D)', deaths.toLocaleString(), '-1.3% vs 30d', SOFT],
    ['ID Cards Issued (30D)', idIssued.toLocaleString(), '+5.6% vs 30d', INK],
    ['Digital ID Activations (30D)', digitalAct.toLocaleString(), '+6.1% vs 30d', BLUE],
    ['Data Accuracy', `${accuracy}%`, 'Excellent', EMER],
  ];

  const services: [string, string, string][] = [
    ['Birth Registrations', births.toLocaleString(), '+2.4%'], ['Marriage Registrations', '7,562', '+1.7%'],
    ['Death Registrations', deaths.toLocaleString(), '-1.3%'], ['ID Card Applications', idIssued.toLocaleString(), '+5.6%'],
    ['Address Updates', '12,489', '+3.2%'], ['Name Changes', '2,183', '-0.8%'],
  ];
  const offices: [string, number][] = [
    ['Central City Office', 4982], ['North District Office', 3621], ['East District Office', 3214],
    ['South District Office', 2987], ['West District Office', 2745],
  ];
  const oMax = Math.max(...offices.map(o => o[1]));
  const docTypes: [string, string, number][] = [
    ['National ID Cards', '14.21M', 77.1], ['Passports', '3.01M', 16.3],
    ["Driver's Licenses", '0.89M', 4.8], ['Other Documents', '0.31M', 1.8],
  ];
  const integrity: [string, string, string, string][] = [
    ['No Issues Found', '2.65M', '93.0%', EMER], ['Minor Issues', '0.15M', '5.3%', AMBER], ['Major Issues', '0.05M', '1.7%', RED],
  ];
  const activity: [string, string, string][] = [
    ['12:35', 'ID Card issued', 'ID-2025-17845'], ['12:18', 'Birth registered', 'BR-2025-24681'],
    ['11:57', 'Address updated', 'AU-2025-19422'], ['11:42', 'Marriage registered', 'MR-2025-08471'],
    ['11:28', 'Passport issued', 'PP-2025-15234'],
  ];

  return (
    <div className="space-y-2 rounded-[5px] p-2" style={{ background: BG, boxShadow: 'inset 0 0 140px rgba(0,0,0,0.65)' }}>
      {/* ── Header ─────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-x-6 gap-y-2 rounded-[4px] border px-4 py-3"
        style={{ borderColor: LINE, background: 'linear-gradient(100deg,#0a1119,#0e1620)' }}>
        <div className="flex items-center gap-3">
          <span className="grid h-10 w-10 place-items-center rounded-full text-[15px]" style={{ border: `1px solid ${BLUE}`, color: BLUE }} aria-hidden>▦</span>
          <div>
            <div className="text-[17px] font-bold uppercase tracking-[0.14em]" style={{ color: INK, fontFamily: SERIF }}>Civil Registry &amp; ID</div>
            <div className="text-[8px] uppercase tracking-[0.22em]" style={{ color: BLUE }}>National Civil Registry System</div>
          </div>
        </div>
        <div className="ml-auto flex flex-wrap items-center gap-x-6 gap-y-1 text-[8.5px]" style={{ color: MUT }}>
          <span><span style={{ color: SOFT }}>{dd}</span> · {day}</span>
          <span>TIME <span className="font-mono text-[11px]" style={{ color: INK }}>{hh}</span> GMT+1</span>
          <span className="flex items-center gap-1.5"><span className="relative inline-block">🔔<span className="absolute -right-1.5 -top-1.5 grid h-3 w-3 place-items-center rounded-full text-[6px] font-bold text-white" style={{ background: BLUE }}>8</span></span><span className="uppercase tracking-[0.12em]">Alerts</span></span>
          <span className="flex items-center gap-1.5 rounded-[3px] border px-2 py-1" style={{ borderColor: LINE }}>
            <span className="grid h-5 w-5 place-items-center rounded-full text-[8px] font-bold" style={{ background: BLUE, color: '#06121a' }}>CR</span>
            <span><span className="block uppercase tracking-[0.1em]" style={{ color: MUT }}>Director, Civil Registry &amp; ID</span><span style={{ color: INK }}>National Civil Service</span></span>
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
      <div className="grid gap-2 xl:grid-cols-3">
        <Panel title="Population Overview">
          <Donut top={`${popM}M`} sub="Total Population" segs={[
            { label: 'Adults (18+)', v: 76.6, n: '14.12M', c: BLUE },
            { label: 'Children (0–17)', v: 21.8, n: '4.01M', c: EMER },
            { label: 'Seniors (65+)', v: 1.6, n: '0.29M', c: GOLD },
          ]} />
          <div className="mt-2 border-t pt-1.5 text-[8px]" style={{ borderColor: LINE, color: MUT }}>Last updated: {dd} {hh}</div>
        </Panel>
        <Panel title="Age Distribution" action="View Full Report">
          <VBars pts={W('age', 30, 100, 8)} />
        </Panel>
        <Panel title="ID Document Status" action="View Full Report">
          <Donut top={`${popM}M`} sub="Total" segs={[
            { label: 'Valid', v: 91.9, n: '16.92M', c: EMER },
            { label: 'Expiring Soon (≤90d)', v: 4.5, n: '0.83M', c: AMBER },
            { label: 'Expired', v: 3.6, n: '0.67M', c: RED },
          ]} />
        </Panel>
      </div>

      {/* ── Row 2 ──────────────────────────────────────────────── */}
      <div className="grid gap-2 xl:grid-cols-3">
        <Panel title="Registration Services (30D)" action="View All">
          <div className="space-y-2.5">
            {services.map(([l, v, d]) => (
              <div key={l} className="flex items-center gap-2 text-[10px]">
                <span className="grid h-5 w-5 place-items-center rounded text-[9px]" style={{ background: PANEL2, color: BLUE }} aria-hidden>▤</span>
                <span className="min-w-0 flex-1" style={{ color: SOFT }}>{l}</span>
                <span className="font-mono tabular-nums" style={{ color: INK }}>{v}</span>
                <span className="w-10 text-right font-mono tabular-nums" style={{ color: d.startsWith('-') ? AMBER : EMER }}>{d}</span>
              </div>
            ))}
          </div>
        </Panel>
        <Panel title="Registrations Trend (30 Days)" action="View Trend">
          <MultiLine series={[
            { name: 'Births', c: BLUE, pts: W('rb', 40, 95, 14) },
            { name: 'Deaths', c: RED, pts: W('rd', 25, 60, 14) },
            { name: 'Marriages', c: EMER, pts: W('rm', 18, 44, 14) },
            { name: 'ID Applications', c: GOLD, pts: W('ri', 30, 70, 14) },
          ]} />
          <div className="mt-1 flex flex-wrap gap-x-3 text-[8px]" style={{ color: MUT }}>
            {[['Births', BLUE], ['Deaths', RED], ['Marriages', EMER], ['ID Applications', GOLD]].map(([l, c]) => (
              <span key={l} className="inline-flex items-center gap-1"><span className="h-1.5 w-1.5 rounded-full" style={{ background: c }} />{l}</span>
            ))}
          </div>
        </Panel>
        <Panel title="Top Registration Offices (30D)" action="View All">
          <div className="space-y-2.5">
            {offices.map(([l, v]) => (
              <div key={l} className="text-[9px]">
                <div className="flex items-center justify-between"><span className="flex items-center gap-1.5" style={{ color: SOFT }}><span style={{ color: BLUE }} aria-hidden>⌖</span>{l}</span><span className="font-mono tabular-nums" style={{ color: INK }}>{v.toLocaleString()}</span></div>
                <div className="mt-0.5 h-1.5 overflow-hidden rounded-full" style={{ background: '#16212b' }}>
                  <span className="block h-full rounded-full" style={{ width: `${(v / oMax) * 100}%`, background: BLUE }} />
                </div>
              </div>
            ))}
          </div>
        </Panel>
      </div>

      {/* ── Row 3 ──────────────────────────────────────────────── */}
      <div className="grid gap-2 xl:grid-cols-3">
        <Panel title="Digital ID Usage" action="View Analytics">
          <div className="flex items-center gap-4">
            <Ring value={68} sub="Digital ID Adoption" />
            <div className="flex-1 space-y-2.5 text-[10px]">
              {([['Digital ID Active Users', `${io.identity.enrolledM}M`], ['e-Services Logins (30D)', '4.82M'], ['Digital Verifications (30D)', `${(io.identity.verificationsPerHr / 1300).toFixed(2)}M`]] as [string, string][]).map(([l, v]) => (
                <div key={l} className="flex items-center justify-between"><span style={{ color: SOFT }}>{l}</span><span className="font-mono tabular-nums" style={{ color: INK }}>{v}</span></div>
              ))}
            </div>
          </div>
        </Panel>
        <Panel title="ID Document Types" action="View All">
          <div className="space-y-2.5">
            {docTypes.map(([l, v, p]) => (
              <div key={l} className="text-[9px]">
                <div className="flex items-center justify-between"><span style={{ color: SOFT }}>{l}</span><span className="font-mono tabular-nums" style={{ color: INK }}>{v} <span style={{ color: MUT }}>{p}%</span></span></div>
                <div className="mt-0.5 h-1.5 overflow-hidden rounded-full" style={{ background: '#16212b' }}>
                  <span className="block h-full rounded-full" style={{ width: `${p}%`, background: [BLUE, EMER, GOLD, VIOLET][docTypes.findIndex(d => d[0] === l)] }} />
                </div>
              </div>
            ))}
          </div>
        </Panel>
        <Panel title="Data Integrity Checks (30D)" action="View Details">
          <div className="flex items-center gap-3">
            <span className="text-[34px]" style={{ color: EMER }} aria-hidden>🛡</span>
            <div>
              <div className="text-[7.5px] uppercase tracking-wider" style={{ color: MUT }}>Checks Performed</div>
              <div className="font-mono text-[18px]" style={{ color: INK, fontFamily: SERIF }}>{(io.identity.verificationsPerHr / 4 / 1000).toFixed(2)}M <span className="text-[9px]" style={{ color: EMER }}>+8.2%</span></div>
            </div>
          </div>
          <div className="mt-2 space-y-2 border-t pt-2" style={{ borderColor: LINE }}>
            {integrity.map(([l, v, p, c]) => (
              <div key={l} className="flex items-center gap-2 text-[9px]">
                <span style={{ color: c }} aria-hidden>●</span>
                <span className="min-w-0 flex-1" style={{ color: SOFT }}>{l}</span>
                <span className="font-mono tabular-nums" style={{ color: INK }}>{v}</span>
                <span className="w-10 text-right font-mono tabular-nums" style={{ color: MUT }}>{p}</span>
              </div>
            ))}
          </div>
        </Panel>
      </div>

      {/* ── Recent activity ────────────────────────────────────── */}
      <div className="rounded-[4px] border px-4 py-2.5" style={{ borderColor: LINE, background: PANEL }}>
        <div className="mb-2 flex items-center justify-between">
          <span className="text-[9px] font-bold uppercase tracking-[0.18em]" style={{ color: BLUE }}>Recent Activity</span>
          <span className="text-[8px] font-semibold uppercase tracking-[0.12em]" style={{ color: BLUE }}>View All Activity →</span>
        </div>
        <div className="grid grid-cols-2 gap-x-6 gap-y-2 md:grid-cols-3 xl:grid-cols-5">
          {activity.map(([t, e, ref]) => (
            <div key={ref} className="flex gap-2 text-[8.5px]">
              <span className="font-mono shrink-0" style={{ color: BLUE_BR }}>{t}</span>
              <span><span className="block" style={{ color: INK }}>{e}</span><span className="font-mono" style={{ color: MUT }}>Ref: {ref}</span></span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
