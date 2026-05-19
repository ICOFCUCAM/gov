'use client';

// Permits & Licensing — National Digital Governance Platform. Light,
// modern governance surface modelled on the benchmark: permit KPI strip,
// applications over time, applications by category & status, recent
// applications, processing time, top departments, permit validity,
// expiring-soon and a regional application heatmap. Pure & deterministic
// — engine + telemetry only.

import * as React from 'react';
import { interiorOps } from '@/lib/gov/interior-systems';
import { wave, waveSeries, seed } from '@/lib/telemetry';

const BG = '#f5f6fb';
const CARD = '#ffffff';
const LINE = '#e7e9f1';
const INK = '#1d2333';
const SOFT = '#56607a';
const MUT = '#8b94a8';
const PURPLE = '#7c5cf0';
const BLUE = '#4f7df0';
const GREEN = '#2bb673';
const TEAL = '#27b3a6';
const AMBER = '#e0a13a';
const RED = '#e0685f';

const STATUS_C: Record<string, string> = {
  Approved: GREEN, 'Under Review': AMBER, 'Pending Info': BLUE, Rejected: RED,
};

function Card({ title, sub, action, children, className }: {
  title: string; sub?: string; action?: string; children: React.ReactNode; className?: string;
}) {
  return (
    <section className={`flex flex-col rounded-xl border ${className ?? ''}`}
      style={{ borderColor: LINE, background: CARD, boxShadow: '0 1px 3px rgba(20,30,60,0.04)' }}>
      <div className="flex items-center justify-between px-4 pt-3">
        <h3 className="text-[13px] font-semibold" style={{ color: INK }}>{title}</h3>
        {action ? <span className="text-[10px] font-medium" style={{ color: PURPLE }}>{action}</span>
          : sub ? <span className="text-[10px]" style={{ color: MUT }}>{sub}</span> : null}
      </div>
      <div className="flex-1 p-4">{children}</div>
    </section>
  );
}

function Kpi({ label, value, delta, dn, icon, c }: {
  label: string; value: string; delta: string; dn?: boolean; icon: string; c: string;
}) {
  return (
    <div className="flex items-center gap-3 rounded-xl border px-4 py-3" style={{ borderColor: LINE, background: CARD, boxShadow: '0 1px 3px rgba(20,30,60,0.04)' }}>
      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg text-[15px]" style={{ background: `color-mix(in srgb,${c} 14%,#fff)`, color: c }} aria-hidden>{icon}</span>
      <div className="min-w-0">
        <div className="text-[11px]" style={{ color: MUT }}>{label}</div>
        <div className="text-[19px] font-bold tabular-nums" style={{ color: INK }}>{value}</div>
        <div className="text-[9.5px]" style={{ color: dn ? RED : GREEN }}>{dn ? '↓' : '↑'} {delta} <span style={{ color: MUT }}>vs last month</span></div>
      </div>
    </div>
  );
}

function Donut({ segs, top, size = 152 }: { segs: { label: string; v: number; n: string; c: string }[]; top: string; size?: number }) {
  const sum = segs.reduce((s, x) => s + x.v, 0) || 1;
  const r = size / 2 - 13, circ = 2 * Math.PI * r;
  let acc = 0;
  return (
    <div className="flex items-center gap-4">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="shrink-0" aria-hidden>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#eef0f6" strokeWidth="15" />
        {segs.map((s, i) => {
          const fr = s.v / sum;
          const el = <circle key={i} cx={size / 2} cy={size / 2} r={r} fill="none" stroke={s.c} strokeWidth="15"
            strokeLinecap="round" strokeDasharray={`${Math.max(0, fr * circ - 3)} ${circ}`} strokeDashoffset={-acc * circ}
            transform={`rotate(-90 ${size / 2} ${size / 2})`} />;
          acc += fr; return el;
        })}
        <text x="50%" y="47%" textAnchor="middle" fontSize={size * 0.075} fill={MUT}>Total</text>
        <text x="50%" y="58%" textAnchor="middle" fontSize={size * 0.13} fontWeight="700" fill={INK}>{top}</text>
      </svg>
      <div className="min-w-0 flex-1 space-y-1.5">
        {segs.map(s => (
          <div key={s.label} className="flex items-center gap-2 text-[10px]">
            <span className="h-2 w-2 rounded-full" style={{ background: s.c }} />
            <span className="min-w-0 flex-1 truncate" style={{ color: SOFT }}>{s.label}</span>
            <span className="font-semibold tabular-nums" style={{ color: INK }}>{Math.round((s.v / sum) * 1000) / 10}%</span>
            <span className="w-16 text-right tabular-nums" style={{ color: MUT }}>({s.n})</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function MultiLine({ series, height = 170 }: { series: { name: string; c: string; pts: number[] }[]; height?: number }) {
  const all = series.flatMap(s => s.pts);
  const mn = Math.min(...all), sp = Math.max(...all) - mn || 1;
  const xy = (pts: number[]) => pts.map((p, i) => [(i / (pts.length - 1)) * 100, 92 - ((p - mn) / sp) * 82] as [number, number]);
  const months = ['Dec ’24', 'Jan ’25', 'Feb ’25', 'Mar ’25', 'Apr ’25', 'May ’25'];
  return (
    <div>
      <div className="mb-2 flex flex-wrap gap-x-4 text-[10px]" style={{ color: SOFT }}>
        {series.map(s => <span key={s.name} className="inline-flex items-center gap-1.5"><span className="h-1.5 w-3 rounded-full" style={{ background: s.c }} />{s.name}</span>)}
      </div>
      <svg viewBox="0 0 100 100" preserveAspectRatio="none" style={{ width: '100%', height }} aria-hidden>
        {[20, 40, 60, 80].map(y => <line key={y} x1="0" y1={y} x2="100" y2={y} stroke="#eef0f6" strokeWidth="0.5" />)}
        {series.map(s => (
          <React.Fragment key={s.name}>
            <polyline points={xy(s.pts).map(([x, y]) => `${x},${y}`).join(' ')} fill="none" stroke={s.c} strokeWidth="1.4" vectorEffect="non-scaling-stroke" strokeLinejoin="round" />
            {xy(s.pts).map(([x, y], i) => <circle key={i} cx={x} cy={y} r="1.1" fill={s.c} vectorEffect="non-scaling-stroke" />)}
          </React.Fragment>
        ))}
      </svg>
      <div className="mt-1 flex justify-between text-[8.5px]" style={{ color: MUT }}>{months.map(m => <span key={m}>{m}</span>)}</div>
    </div>
  );
}

function Heatmap({ seedKey }: { seedKey: string }) {
  const cells = Array.from({ length: 54 }).map((_, i) => {
    const v = seed(`${seedKey}:${i}`);
    return v;
  });
  const col = (v: number) => v > 0.8 ? '#4c1d95' : v > 0.62 ? '#6d28d9' : v > 0.45 ? PURPLE : v > 0.28 ? '#a78bf5' : '#d8cdf7';
  return (
    <div className="grid gap-1" style={{ gridTemplateColumns: 'repeat(9,1fr)' }} aria-hidden>
      {cells.map((v, i) => (
        <span key={i} className="rounded-md" style={{ aspectRatio: '1', background: col(v), opacity: 0.55 + v * 0.45,
          clipPath: 'polygon(50% 0,100% 25%,100% 75%,50% 100%,0 75%,0 25%)' }} />
      ))}
    </div>
  );
}

export function PermitsLicensing({ id, now }: { id: string; now: number }) {
  const ts = now / 4000;
  const io = interiorOps(id, ts);
  const clock = new Date(now);
  const dd = clock.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  const day = clock.toLocaleDateString('en-GB', { weekday: 'long' });
  const W = (k: string, lo: number, hi: number, n = 6) => waveSeries(`pl:${k}:${id}`, ts, n, lo, hi);

  const active = 1_200_000 + Math.round(seed(`pl:ac:${id}`) * 90_000);
  const newApps = io.licensing.pending + Math.round(wave(`pl:na:${id}`, ts, 40000, 56000) - io.licensing.pending);
  const totalApps = 48291;

  const kpis = [
    ['Total Active Permits', active.toLocaleString(), '12.6%', false, '▤', PURPLE],
    ['New Applications', totalApps.toLocaleString(), '8.4%', false, '＋', BLUE],
    ['Approved', '36,842', '10.2%', false, '✓', GREEN],
    ['Pending Review', '8,791', '4.1%', false, '◷', AMBER],
    ['Rejected', '2,658', '2.3%', true, '✕', RED],
    ['Avg. Processing Time', '4.2 days', '0.6', true, '⧗', TEAL],
  ] as [string, string, string, boolean, string, string][];

  const recent: [string, string, string, string, string, string][] = [
    ['APP-2025-001265', 'GreenBuild Ltd.', 'Building Permit', 'Commercial', '17 May 2025', 'Under Review'],
    ['APP-2025-001264', 'Sarah Johnson', 'Business License', 'Retail', '16 May 2025', 'Approved'],
    ['APP-2025-001263', 'Metro Traders', 'Trade License', 'Import/Export', '16 May 2025', 'Approved'],
    ['APP-2025-001262', 'EcoPower Inc.', 'Environmental Permit', 'Industrial', '15 May 2025', 'Under Review'],
    ['APP-2025-001261', 'City Hospital', 'Health License', 'Healthcare', '15 May 2025', 'Pending Info'],
  ];
  const procTime: [string, number, string][] = [
    ['Building Permit', 6.1, PURPLE], ['Business License', 3.8, BLUE], ['Trade License', 4.5, TEAL],
    ['Environmental Permit', 7.2, GREEN], ['Health License', 2.9, AMBER], ['Other', 3.6, '#c4cbd9'],
  ];
  const pMax = Math.max(...procTime.map(p => p[1]));
  const depts: [string, string][] = [
    ['Urban Development', '92.4%'], ['Commerce & Industry', '89.7%'], ['Environment & Natural Resources', '88.1%'],
    ['Health Department', '93.2%'], ['Municipal Administration', '90.3%'],
  ];
  const expiring: [string, string, string, number][] = [
    ['PRM-2024-00541', 'Building Permit', '05 Jun 2025', 19], ['LIC-2024-00872', 'Business License', '07 Jun 2025', 21],
    ['TRD-2024-00311', 'Trade License', '10 Jun 2025', 24], ['ENV-2024-00187', 'Environmental Permit', '12 Jun 2025', 26],
    ['HLT-2024-00422', 'Health License', '15 Jun 2025', 29],
  ];

  return (
    <div className="space-y-3 rounded-[5px] p-3" style={{ background: BG, color: INK }}>
      {/* ── Header ─────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
        <div>
          <div className="text-[20px] font-bold leading-tight" style={{ color: INK }}>Permits &amp; Licensing</div>
          <div className="text-[11px]" style={{ color: MUT }}>Unified management of permits, licenses, authorizations and regulatory approvals.</div>
        </div>
        <div className="ml-auto flex flex-wrap items-center gap-3 text-[11px]">
          <span className="flex items-center gap-2 rounded-lg border px-3 py-1.5" style={{ borderColor: LINE, background: CARD, color: MUT }}>⌕ Search permits, licenses, applicants…</span>
          <span className="flex items-center gap-2 rounded-lg border px-3 py-1.5" style={{ borderColor: LINE, background: CARD, color: SOFT }}>📅 <span style={{ color: INK }}>{dd}</span> · {day}</span>
          <span className="flex items-center gap-2 rounded-lg border px-3 py-1.5" style={{ borderColor: LINE, background: CARD }}>
            <span className="grid h-6 w-6 place-items-center rounded-full text-[9px] font-bold text-white" style={{ background: PURPLE }}>CA</span>
            <span><span className="block font-medium" style={{ color: INK }}>Chief Administrator</span><span style={{ color: MUT }}>National Government</span></span>
          </span>
          <span className="rounded-lg px-3 py-1.5 text-[11px] font-semibold text-white" style={{ background: PURPLE }}>+ New Application</span>
          <span className="rounded-lg border px-3 py-1.5 text-[11px] font-medium" style={{ borderColor: LINE, background: CARD, color: SOFT }}>⤓ Export</span>
        </div>
      </div>

      {/* ── KPI strip ──────────────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        {kpis.map(([l, v, d, dn, ic, c]) => <Kpi key={l} label={l} value={v} delta={d} dn={dn} icon={ic} c={c} />)}
      </div>

      {/* ── Row 1 ──────────────────────────────────────────────── */}
      <div className="grid gap-3 xl:grid-cols-3">
        <Card title="Applications Over Time" action="Last 6 Months ▾">
          <MultiLine series={[
            { name: 'Applications', c: BLUE, pts: W('ap', 28, 50, 6) },
            { name: 'Approved', c: GREEN, pts: W('av', 18, 38, 6) },
            { name: 'Rejected', c: RED, pts: W('rj', 4, 9, 6) },
          ]} />
        </Card>
        <Card title="Applications by Category">
          <Donut top={totalApps.toLocaleString()} segs={[
            { label: 'Building Permit', v: 35.8, n: '17,281', c: BLUE }, { label: 'Business License', v: 24.7, n: '11,925', c: PURPLE },
            { label: 'Trade License', v: 15.3, n: '7,391', c: TEAL }, { label: 'Environmental Permit', v: 9.6, n: '4,634', c: GREEN },
            { label: 'Health License', v: 6.2, n: '2,993', c: AMBER }, { label: 'Other', v: 8.4, n: '4,067', c: '#c4cbd9' },
          ]} />
        </Card>
        <Card title="Applications by Status">
          <Donut top={totalApps.toLocaleString()} segs={[
            { label: 'Approved', v: 76.3, n: '36,842', c: GREEN }, { label: 'Pending Review', v: 18.2, n: '8,791', c: AMBER },
            { label: 'Rejected', v: 5.5, n: '2,658', c: RED },
          ]} />
        </Card>
      </div>

      {/* ── Row 2 ──────────────────────────────────────────────── */}
      <div className="grid gap-3 xl:grid-cols-[1.5fr_1fr_1fr]">
        <Card title="Recent Applications" action="View All Applications →">
          <div className="flex text-[8.5px] uppercase tracking-wider" style={{ color: MUT }}>
            <span className="w-28">Application ID</span><span className="flex-1">Applicant · Category</span><span className="w-20">Submitted</span><span className="w-24 text-right">Status</span>
          </div>
          <div className="mt-1.5 space-y-1.5">
            {recent.map(([aid, ap, cat, , sub, st]) => (
              <div key={aid} className="flex items-center text-[10px]">
                <span className="w-28 font-mono" style={{ color: SOFT }}>{aid}</span>
                <div className="min-w-0 flex-1"><span style={{ color: INK }}>{ap}</span> <span style={{ color: MUT }}>· {cat}</span></div>
                <span className="w-20 text-[9px]" style={{ color: MUT }}>{sub}</span>
                <span className="w-24 text-right"><span className="rounded-full px-2 py-0.5 text-[8.5px] font-semibold"
                  style={{ color: STATUS_C[st], background: `color-mix(in srgb,${STATUS_C[st]} 14%,#fff)` }}>{st}</span></span>
              </div>
            ))}
          </div>
        </Card>
        <Card title="Processing Time by Category" sub="Avg. Days">
          <div className="space-y-2.5">
            {procTime.map(([l, v, c]) => (
              <div key={l} className="text-[9.5px]">
                <div className="flex justify-between"><span style={{ color: SOFT }}>{l}</span><span className="font-semibold tabular-nums" style={{ color: INK }}>{v}</span></div>
                <div className="mt-0.5 h-1.5 overflow-hidden rounded-full" style={{ background: '#eef0f6' }}>
                  <span className="block h-full rounded-full" style={{ width: `${(v / pMax) * 100}%`, background: c }} />
                </div>
              </div>
            ))}
          </div>
        </Card>
        <Card title="Top Performing Departments" sub="By Approval Rate">
          <div className="space-y-2.5">
            {depts.map(([l, v]) => (
              <div key={l} className="flex items-center gap-2 text-[10px]">
                <span className="grid h-6 w-6 place-items-center rounded-lg text-[10px]" style={{ background: '#eef1f8', color: PURPLE }} aria-hidden>▦</span>
                <span className="min-w-0 flex-1" style={{ color: SOFT }}>{l}</span>
                <span className="font-semibold tabular-nums" style={{ color: GREEN }}>{v}</span>
              </div>
            ))}
            <div className="pt-1 text-[10px] font-medium" style={{ color: PURPLE }}>View All Departments →</div>
          </div>
        </Card>
      </div>

      {/* ── Row 3 ──────────────────────────────────────────────── */}
      <div className="grid gap-3 xl:grid-cols-3">
        <Card title="Permit Validity Overview">
          <Donut top={active.toLocaleString()} segs={[
            { label: 'Valid', v: 72.1, n: '900,842', c: TEAL }, { label: 'Expiring Soon (≤30d)', v: 12.4, n: '154,786', c: AMBER },
            { label: 'Expired', v: 9.8, n: '122,438', c: RED }, { label: 'Suspended', v: 3.2, n: '39,852', c: PURPLE },
            { label: 'Revoked', v: 2.5, n: '30,816', c: '#c4cbd9' },
          ]} />
        </Card>
        <Card title="Expiring Soon" action="View All Expiring →">
          <div className="flex text-[8.5px] uppercase tracking-wider" style={{ color: MUT }}>
            <span className="w-28">Permit ID</span><span className="flex-1">Type</span><span className="w-20">Expires</span><span className="w-12 text-right">Days</span>
          </div>
          <div className="mt-1.5 space-y-2">
            {expiring.map(([pid, ty, ex, dl]) => (
              <div key={pid} className="flex items-center text-[10px]">
                <span className="w-28 font-mono" style={{ color: SOFT }}>{pid}</span>
                <span className="min-w-0 flex-1 truncate" style={{ color: INK }}>{ty}</span>
                <span className="w-20 text-[9px]" style={{ color: MUT }}>{ex}</span>
                <span className="w-12 text-right font-semibold tabular-nums" style={{ color: dl <= 21 ? RED : AMBER }}>{dl}</span>
              </div>
            ))}
          </div>
        </Card>
        <Card title="Application Heatmap" sub="By Region · This Month">
          <Heatmap seedKey={`pl:hm:${id}`} />
          <div className="mt-2 flex items-center gap-2 text-[8.5px]" style={{ color: MUT }}>
            <span>Low</span>
            <span className="h-2 flex-1 rounded-full" style={{ background: 'linear-gradient(90deg,#d8cdf7,#a78bf5,#7c5cf0,#4c1d95)' }} />
            <span>High</span>
          </div>
        </Card>
      </div>

      {/* ── Footer ─────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-t pt-3 text-[10px]" style={{ borderColor: LINE, color: MUT }}>
        <span>National Digital Governance Platform — One Nation. One System. One Future.</span>
        <span>Service Availability 99.2% · Citizen Satisfaction 4.6/5 · Digital Service Index 87%</span>
      </div>
    </div>
  );
}
