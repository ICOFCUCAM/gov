'use client';

// Citizen Services Overview — Citizen Services Dashboard. Dense dark
// citizen-facing console modelled on the benchmark: KPI strip,
// application trends, top services, applications-by-status, channel
// split, processing time, service availability, recent announcements,
// citizen-feedback summary and quick actions. Pure & deterministic —
// engine + telemetry only.

import * as React from 'react';
import { citizenWallet } from '@/lib/gov/citizen-systems';
import { wave, waveSeries } from '@/lib/telemetry';

const BG = '#04100c';
const PANEL = '#0a1712';
const PANEL2 = '#0e1d17';
const LINE = 'rgba(54,211,155,0.16)';
const LINE2 = 'rgba(255,255,255,0.06)';
const EMER = '#36d39b';
const GREEN = '#35c08a';
const BLUE = '#4f8df0';
const CYAN = '#37c7d4';
const PURPLE = '#8a6cf0';
const AMBER = '#e0a13a';
const ORANGE = '#e07a3a';
const RED = '#e0685f';
const INK = '#d6e6df';
const SOFT = '#8aa69b';
const MUT = '#5d7268';

function Card({ title, sub, action, children, className }: {
  title: string; sub?: string; action?: string; children: React.ReactNode; className?: string;
}) {
  return (
    <section className={`flex flex-col rounded-lg border ${className ?? ''}`} style={{ borderColor: LINE, background: PANEL }}>
      <div className="flex items-center justify-between border-b px-3.5 py-2.5" style={{ borderColor: LINE2 }}>
        <div>
          <h3 className="text-[12px] font-semibold" style={{ color: INK }}>{title}</h3>
          {sub ? <div className="text-[9px]" style={{ color: MUT }}>{sub}</div> : null}
        </div>
        {action ? <span className="text-[9.5px] font-medium" style={{ color: EMER }}>{action}</span> : null}
      </div>
      <div className="flex-1 p-3.5">{children}</div>
    </section>
  );
}

function Donut({ segs, top, sub, size = 150 }: { segs: { label: string; v: number; n: string; c: string }[]; top: string; sub: string; size?: number }) {
  const sum = segs.reduce((s, x) => s + x.v, 0) || 1, r = size / 2 - 13, circ = 2 * Math.PI * r;
  let acc = 0;
  return (
    <div className="flex items-center gap-4">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="shrink-0" aria-hidden>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#10241c" strokeWidth="14" />
        {segs.map((s, i) => {
          const fr = s.v / sum;
          const el = <circle key={i} cx={size / 2} cy={size / 2} r={r} fill="none" stroke={s.c} strokeWidth="14"
            strokeDasharray={`${Math.max(0, fr * circ - 2)} ${circ}`} strokeDashoffset={-acc * circ}
            transform={`rotate(-90 ${size / 2} ${size / 2})`} />;
          acc += fr; return el;
        })}
        <text x="50%" y="47%" textAnchor="middle" fontSize="16" fontWeight="700" fill={INK}>{top}</text>
        <text x="50%" y="58%" textAnchor="middle" fontSize="8" fill={MUT}>{sub}</text>
      </svg>
      <div className="min-w-0 flex-1 space-y-1.5">
        {segs.map(s => (
          <div key={s.label} className="flex items-center gap-2 text-[10px]">
            <span className="h-2 w-2 rounded-full" style={{ background: s.c }} />
            <span className="min-w-0 flex-1 truncate" style={{ color: SOFT }}>{s.label}</span>
            <span className="tabular-nums" style={{ color: INK }}>{s.n}</span>
            <span className="w-14 text-right tabular-nums" style={{ color: MUT }}>({Math.round((s.v / sum) * 1000) / 10}%)</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function CitizenServicesOverview({ appId, now }: { appId: string; now: number }) {
  const ts = now / 4000;
  const w = citizenWallet(appId, ts);
  const clock = new Date(now);
  const dd = clock.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  const day = clock.toLocaleDateString('en-GB', { weekday: 'long' });
  const apps = (1.55 + wave(`cs:ap:${appId}`, ts, 0, 0.14)).toFixed(2);

  const kpis: [string, string, string, string][] = [
    ['Total Services', '248', '↑ 12 from last month', EMER],
    ['Total Applications', `${apps}M`, '↑ 18.6% from last month', BLUE],
    ['Applications Approved', '1.28M', '79.0% Approval Rate', GREEN],
    ['Average Processing Time', '2.8 Days', '↓ 0.6 days from last month', CYAN],
    ['Active Users', '842K', '↑ 14.3% from last month', PURPLE],
    ['Citizen Satisfaction', '4.6 / 5', '★★★★★ ↑ 0.2', AMBER],
  ];

  const topSvc: [string, string, string, string][] = [
    ['Aadhaar Services', '245K', '15.1%', EMER], ['Income Certificate', '198K', '12.2%', BLUE],
    ['Driving License', '156K', '9.6%', CYAN], ['Property Tax', '124K', '7.6%', PURPLE],
    ['Passport Services', '112K', '6.9%', AMBER],
  ];
  const status = [
    { label: 'Approved', v: 79.0, n: '1.28M', c: GREEN }, { label: 'In Progress', v: 14.1, n: '228K', c: BLUE },
    { label: 'Pending', v: 6.3, n: '102K', c: AMBER }, { label: 'Rejected', v: 0.6, n: '12K', c: RED },
  ];
  const channels = [
    { label: 'Web Portal', v: 62.5, n: '62.5%', c: BLUE }, { label: 'Mobile App', v: 24.8, n: '24.8%', c: PURPLE },
    { label: 'Service Center', v: 8.7, n: '8.7%', c: CYAN }, { label: 'Other', v: 4.0, n: '4.0%', c: AMBER },
  ];
  const procTime: [string, number, string][] = [
    ['Identity & Documents', 1.8, EMER], ['Licenses & Permits', 3.2, BLUE], ['Tax & Finance', 2.6, CYAN],
    ['Social Services', 4.1, AMBER], ['Health Services', 2.3, TEAL_OR(PURPLE)], ['Education', 1.5, GREEN], ['Utilities', 2.9, RED],
  ];
  function TEAL_OR(c: string) { return c; }
  const pMax = Math.max(...procTime.map(p => p[1]));
  const avail: [string, string][] = [
    ['Web Portal', '99.98%'], ['Mobile App', '99.92%'], ['API Gateway', '99.95%'],
    ['Payment Gateway', '99.93%'], ['Document Storage', '99.97%'],
  ];
  const announcements: [string, string][] = [
    ['New Income Tax Return filing service is now live', 'May 16, 2025'],
    ['Passport processing time reduced by 30%', 'May 15, 2025'],
    ['Scheduled maintenance on 18 May 2025 (2 AM – 6 AM)', 'May 14, 2025'],
  ];
  const feedback: [string, string, string, string][] = [
    ['Positive', '14,382', '78.0%', GREEN], ['Neutral', '2,842', '15.4%', AMBER], ['Negative', '1,228', '6.6%', RED],
  ];
  const quick: [string, string, string][] = [
    ['Apply New Service', '＋', BLUE], ['Track Application', '⌕', CYAN], ['Make Payment', '▤', PURPLE], ['Download Certificate', '⤓', EMER],
    ['Update Profile', '☷', BLUE], ['Raise Grievance', '⚠', RED], ['Help & Support', '☎', AMBER], ['Service Catalog', '▦', GREEN],
  ];
  const months = ['Dec 2025', 'Jan', 'Feb', 'Mar', 'Apr', 'May'];
  const trA = waveSeries(`cs:ta:${appId}`, ts, 6, 60, 230).map((v, i) => Math.round(v + i * 8));
  const trB = waveSeries(`cs:tb:${appId}`, ts, 6, 45, 195).map((v, i) => Math.round(v + i * 6));

  return (
    <div className="space-y-3">
      {/* ── Header ─────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
        <div className="flex items-center gap-3">
          <span className="grid h-9 w-9 place-items-center rounded-lg text-[15px] text-white" style={{ background: `linear-gradient(135deg,${EMER},${BLUE})` }} aria-hidden>♛</span>
          <div>
            <div className="text-[12px] font-bold leading-tight" style={{ color: INK }}>National Governance Platform · Citizen Services Dashboard</div>
            <div className="text-[9px]" style={{ color: MUT }}>One Nation. One Platform. Better Services.</div>
          </div>
        </div>
        <div>
          <div className="text-[19px] font-bold leading-tight" style={{ color: INK }}>Citizen Services Overview</div>
          <div className="text-[10.5px]" style={{ color: MUT }}>Delivering efficient, accessible and transparent services to every citizen.</div>
        </div>
        <div className="ml-auto flex flex-wrap items-center gap-2.5 text-[10.5px]">
          <span className="rounded-lg border px-3 py-1.5" style={{ borderColor: LINE2, background: PANEL, color: MUT }}>⌕ Search services, metrics, reports…</span>
          <span className="rounded-lg border px-3 py-1.5" style={{ borderColor: LINE2, background: PANEL, color: SOFT }}>📅 <span style={{ color: INK }}>{dd}</span> · {day}</span>
          <span className="relative grid h-8 w-8 place-items-center rounded-lg border" style={{ borderColor: LINE2, background: PANEL, color: SOFT }}>⛁<span className="absolute -right-1 -top-1 grid h-3.5 min-w-3.5 place-items-center rounded-full px-1 text-[8px] font-bold text-white" style={{ background: RED }}>5</span></span>
          <span className="flex items-center gap-2 rounded-lg border px-3 py-1.5" style={{ borderColor: LINE2, background: PANEL }}>
            <span className="grid h-6 w-6 place-items-center rounded-full text-[9px] font-bold text-white" style={{ background: EMER }}>AS</span>
            <span><span className="block font-medium" style={{ color: INK }}>Ananya Sharma</span><span style={{ color: MUT }}>Deputy Secretary</span></span>
          </span>
        </div>
      </div>

      {/* ── KPI strip ──────────────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        {kpis.map(([l, v, n, c]) => (
          <div key={l} className="rounded-lg border p-3.5" style={{ borderColor: LINE, background: PANEL }}>
            <div className="flex items-center gap-2">
              <span className="grid h-8 w-8 place-items-center rounded-lg text-[13px]" style={{ background: `color-mix(in srgb,${c} 18%,${PANEL})`, color: c }} aria-hidden>◈</span>
              <span className="text-[10px]" style={{ color: MUT }}>{l}</span>
            </div>
            <div className="mt-1.5 text-[19px] font-bold tabular-nums" style={{ color: INK }}>{v}</div>
            <div className="text-[8.5px]" style={{ color: c }}>{n}</div>
          </div>
        ))}
      </div>

      {/* ── Row 1 ──────────────────────────────────────────────── */}
      <div className="grid gap-3 xl:grid-cols-3">
        <Card title="Application Trends" sub="Applications over time" action="6 Months ▾">
          <div className="mb-2 flex gap-4 text-[9px]" style={{ color: SOFT }}>
            <span className="inline-flex items-center gap-1.5"><span className="h-1.5 w-3 rounded-full" style={{ background: BLUE }} />Applications</span>
            <span className="inline-flex items-center gap-1.5"><span className="h-1.5 w-3 rounded-full" style={{ background: GREEN }} />Approved</span>
          </div>
          <svg viewBox="0 0 100 56" preserveAspectRatio="none" style={{ width: '100%', height: 168 }} aria-hidden>
            {[14, 28, 42].map(y => <line key={y} x1="0" y1={y} x2="100" y2={y} stroke={LINE2} strokeWidth="0.4" />)}
            {[[trB, GREEN], [trA, BLUE]].map(([s, c], si) => {
              const arr = s as number[]; const mx = 250;
              const xy = arr.map((p, i) => [(i / (arr.length - 1)) * 100, 52 - (p / mx) * 46] as [number, number]);
              return <polyline key={si} points={xy.map(([x, y]) => `${x},${y}`).join(' ')} fill="none" stroke={c as string} strokeWidth="1.5" vectorEffect="non-scaling-stroke" strokeLinejoin="round" />;
            })}
          </svg>
          <div className="mt-1 flex justify-between text-[8px]" style={{ color: MUT }}>{months.map(m => <span key={m}>{m}</span>)}</div>
        </Card>
        <Card title="Top Services" sub="by Applications" action="View All">
          <div className="space-y-2.5">
            {topSvc.map(([nm, v, pc, c]) => (
              <div key={nm} className="text-[9.5px]">
                <div className="flex items-center justify-between"><span style={{ color: SOFT }}>{nm}</span><span className="tabular-nums" style={{ color: INK }}>{v} <span style={{ color: MUT }}>{pc}</span></span></div>
                <div className="mt-1 h-1.5 overflow-hidden rounded-full" style={{ background: '#10241c' }}><span className="block h-full rounded-full" style={{ width: `${parseFloat(pc) * 6}%`, background: c }} /></div>
              </div>
            ))}
            <div className="grid place-items-center rounded-lg border py-1.5 text-[9.5px] font-medium" style={{ borderColor: LINE2, color: EMER }}>View All Services</div>
          </div>
        </Card>
        <Card title="Applications by Status">
          <Donut top={`${apps}M`} sub="Total" segs={status} />
        </Card>
      </div>

      {/* ── Row 2 ──────────────────────────────────────────────── */}
      <div className="grid gap-3 xl:grid-cols-3">
        <Card title="Applications by Channel" sub="Split by application source">
          <Donut top="" sub="" size={140} segs={channels} />
        </Card>
        <Card title="Processing Time" sub="by Service Category" action="View All">
          <div className="space-y-2">
            {procTime.map(([l, v, c]) => (
              <div key={l} className="flex items-center gap-2 text-[9.5px]">
                <span className="w-32 shrink-0 truncate" style={{ color: SOFT }}>{l}</span>
                <span className="h-1.5 flex-1 overflow-hidden rounded-full" style={{ background: '#10241c' }}><span className="block h-full rounded-full" style={{ width: `${(v / pMax) * 100}%`, background: c }} /></span>
                <span className="w-14 shrink-0 text-right tabular-nums" style={{ color: INK }}>{v} Days</span>
              </div>
            ))}
          </div>
        </Card>
        <Card title="Service Availability" sub="Real-time system status" action="View All">
          <div className="space-y-2.5">
            {avail.map(([nm, up]) => (
              <div key={nm} className="flex items-center gap-2 text-[10px]">
                <span className="grid h-6 w-6 place-items-center rounded-md text-[10px]" style={{ background: PANEL2, color: EMER }} aria-hidden>▤</span>
                <span className="min-w-0 flex-1" style={{ color: SOFT }}>{nm}</span>
                <span className="text-[8.5px] font-semibold" style={{ color: GREEN }}>● Operational</span>
                <span className="w-14 text-right tabular-nums" style={{ color: INK }}>{up}</span>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* ── Row 3 ──────────────────────────────────────────────── */}
      <div className="grid gap-3 xl:grid-cols-3">
        <Card title="Recent Announcements" action="View All">
          <div className="space-y-2.5">
            {announcements.map(([t, dt]) => (
              <div key={t} className="flex items-start gap-2.5 text-[9.5px]">
                <span className="grid h-7 w-7 shrink-0 place-items-center rounded-md text-[11px]" style={{ background: PANEL2, color: EMER }} aria-hidden>📣</span>
                <div className="min-w-0 flex-1"><div style={{ color: SOFT }}>{t}</div><div className="text-[8.5px]" style={{ color: MUT }}>{dt}</div></div>
              </div>
            ))}
          </div>
        </Card>
        <Card title="Citizen Feedback Summary" sub="Based on feedback from the last 30 days" action="View All">
          <div className="flex items-center justify-between">
            <div><div className="text-[8.5px]" style={{ color: MUT }}>Total Feedback</div><div className="text-[17px] font-bold tabular-nums" style={{ color: INK }}>18,452</div><div className="text-[8px]" style={{ color: GREEN }}>↑ 8.3%</div></div>
            <div className="flex gap-3">
              {feedback.map(([l, v, p, c]) => (
                <div key={l} className="text-center"><div className="text-[8px]" style={{ color: MUT }}>{l}</div><div className="text-[13px] font-bold tabular-nums" style={{ color: c }}>{v}</div><div className="text-[8px]" style={{ color: MUT }}>{p}</div></div>
              ))}
            </div>
          </div>
          <div className="mt-3 grid grid-cols-2 gap-3 border-t pt-2 text-[8.5px]" style={{ borderColor: LINE2 }}>
            <div><div className="mb-1" style={{ color: MUT }}>Top Positive Aspects</div><div className="flex flex-wrap gap-1">{['Ease of Use', 'Service Quality', 'Timely Processing'].map(t => <span key={t} className="rounded px-1.5 py-0.5" style={{ background: `color-mix(in srgb,${GREEN} 16%,${PANEL})`, color: GREEN }}>{t}</span>)}</div></div>
            <div><div className="mb-1" style={{ color: MUT }}>Top Improvement Areas</div><div className="flex flex-wrap gap-1">{['Processing Time', 'Communication', 'Mobile Experience'].map(t => <span key={t} className="rounded px-1.5 py-0.5" style={{ background: `color-mix(in srgb,${AMBER} 16%,${PANEL})`, color: AMBER }}>{t}</span>)}</div></div>
          </div>
        </Card>
        <Card title="Quick Actions">
          <div className="grid grid-cols-4 gap-2">
            {quick.map(([l, ic, c]) => (
              <div key={l} className="flex flex-col items-center gap-1.5 rounded-lg border py-3 text-center" style={{ borderColor: LINE2, background: PANEL2 }}>
                <span className="grid h-8 w-8 place-items-center rounded-lg text-[14px]" style={{ background: `color-mix(in srgb,${c} 18%,${PANEL})`, color: c }} aria-hidden>{ic}</span>
                <span className="text-[8px] leading-tight" style={{ color: SOFT }}>{l}</span>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* ── Footer ─────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-t pt-3 text-[9.5px]" style={{ borderColor: LINE2, color: MUT }}>
        <span>© 2025 National Governance Platform. All rights reserved.</span>
        <span>Privacy Policy · Terms of Service · Accessibility · Contact Us · Uptime {w.servicesUptimePct}%</span>
      </div>
    </div>
  );
}
