'use client';

// Local Councils — Local Councils System (National Governance Platform).
// Light, modern local-democracy surface modelled on the benchmark: KPI
// strip, upcoming council meetings, recent resolutions, citizen
// participation, active projects & programs, budget overview and a
// community-voice carousel. Pure & deterministic — engine + telemetry.

import * as React from 'react';
import { legislativeState } from '@/lib/gov/legislative-engine';
import { wave } from '@/lib/telemetry';

const BG = '#f5f6fb';
const CARD = '#ffffff';
const LINE = '#e7e9f1';
const INK = '#1d2333';
const SOFT = '#56607a';
const MUT = '#8b94a8';
const NAVY = '#1e2a52';
const PURPLE = '#7c5cf0';
const BLUE = '#4f7df0';
const GREEN = '#2bb673';
const TEAL = '#27b3a6';
const AMBER = '#e0a13a';
const ORANGE = '#e07a3a';
const RED = '#e0685f';
const PINK = '#e06f9c';

function Card({ title, sub, action, children, className }: {
  title: string; sub?: string; action?: string; children: React.ReactNode; className?: string;
}) {
  return (
    <section className={`flex flex-col rounded-xl border ${className ?? ''}`}
      style={{ borderColor: LINE, background: CARD, boxShadow: '0 1px 3px rgba(20,30,60,0.04)' }}>
      <div className="flex items-center justify-between px-4 pt-3">
        <div>
          <h3 className="text-[13px] font-semibold" style={{ color: INK }}>{title}</h3>
          {sub ? <div className="text-[9.5px]" style={{ color: MUT }}>{sub}</div> : null}
        </div>
        {action ? <span className="text-[10px] font-medium" style={{ color: PURPLE }}>{action}</span> : null}
      </div>
      <div className="flex-1 p-4 pt-3">{children}</div>
    </section>
  );
}

function Kpi({ label, value, sub, note, dn, icon, c }: {
  label: string; value: string; sub: string; note: string; dn?: boolean | null; icon: string; c: string;
}) {
  return (
    <div className="flex items-center gap-3 rounded-xl border px-4 py-3" style={{ borderColor: LINE, background: CARD, boxShadow: '0 1px 3px rgba(20,30,60,0.04)' }}>
      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg text-[15px]" style={{ background: `color-mix(in srgb,${c} 14%,#fff)`, color: c }} aria-hidden>{icon}</span>
      <div className="min-w-0">
        <div className="text-[11px]" style={{ color: MUT }}>{label}</div>
        <div className="text-[19px] font-bold tabular-nums" style={{ color: INK }}>{value}</div>
        <div className="text-[9px]" style={{ color: MUT }}>{sub} · <span style={{ color: dn == null ? MUT : dn ? RED : GREEN }}>{note}</span></div>
      </div>
    </div>
  );
}

function Donut({ segs, top, sub }: { segs: { label: string; v: number; amt: string; c: string }[]; top: string; sub: string }) {
  const size = 158, sum = segs.reduce((s, x) => s + x.v, 0) || 1, r = size / 2 - 13, circ = 2 * Math.PI * r;
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
        <text x="50%" y="46%" textAnchor="middle" fontSize="17" fontWeight="700" fill={INK}>{top}</text>
        <text x="50%" y="58%" textAnchor="middle" fontSize="9" fill={MUT}>{sub}</text>
      </svg>
      <div className="min-w-0 flex-1 space-y-1.5">
        {segs.map(s => (
          <div key={s.label} className="flex items-center gap-2 text-[10px]">
            <span className="h-2 w-2 rounded-full" style={{ background: s.c }} />
            <span className="min-w-0 flex-1 truncate" style={{ color: SOFT }}>{s.label}</span>
            <span className="font-semibold tabular-nums" style={{ color: INK }}>{s.amt}</span>
            <span className="w-12 text-right tabular-nums" style={{ color: MUT }}>{Math.round((s.v / sum) * 1000) / 10}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function LocalCouncils({ id, now }: { id: string; now: number }) {
  const ts = now / 4000;
  const ls = legislativeState(ts);
  const clock = new Date(now);
  const dd = clock.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  const day = clock.toLocaleDateString('en-GB', { weekday: 'long' });

  const passed = 120 + Math.round(wave(`lc:rp:${id}`, ts, 0, 16));
  const requests = 240 + Math.round(wave(`lc:cr:${id}`, ts, 0, 30));

  const kpis = [
    <Kpi key="m" label="Upcoming Meetings" value="3" sub="This Week" note="↑ 1 from last week" icon="📅" c={PURPLE} />,
    <Kpi key="r" label="Resolutions Passed" value={String(passed)} sub="This Month" note="↑ 18.5% from last month" icon="✓" c={GREEN} />,
    <Kpi key="p" label="Active Projects" value="42" sub="In Progress" note="↑ 5 new this month" icon="▤" c={BLUE} />,
    <Kpi key="c" label="Citizen Requests" value={String(requests)} sub="Open" note="↓ 8 resolved this week" icon="✉" c={ORANGE} />,
    <Kpi key="b" label="Budget Utilization" value="68.4%" sub="FY 2025" note="On Track" dn={null} icon="◔" c={TEAL} />,
  ];

  const meetings: [string, string, string, string, string, string, string][] = [
    ['MAY', '18', 'SUN', 'Regular Council Meeting', '10:00 AM – 01:30 PM · Council Chambers', 'Agenda: Budget Review, Infrastructure Update, Public Works', 'Public Session'],
    ['MAY', '21', 'WED', 'Finance & Budget Committee', '02:00 PM – 04:00 PM · Committee Room A', 'Agenda: Q2 Budget Assessment, Departmental Allocations', 'Committee Meeting'],
    ['MAY', '24', 'SAT', 'Community Development Committee', '11:00 AM – 01:00 PM · Committee Room B', 'Agenda: Housing Projects, Community Grants, NGO Partnerships', 'Committee Meeting'],
  ];

  const resolutions: [string, string, string][] = [
    ['RES-2025-128', 'Approval for Central Park Renovation Project', 'Passed on 15 May 2025'],
    ['RES-2025-127', 'Q2 Budget Allocation for Public Works Department', 'Passed on 12 May 2025'],
    ['RES-2025-126', 'Street Lighting Expansion in Ward 7 & 8', 'Passed on 10 May 2025'],
    ['RES-2025-125', 'Community Health Outreach Program', 'Passed on 8 May 2025'],
  ];

  const participation: [string, string, string, boolean | null, string][] = [
    ['Participants', '1,842', '↑ 12.3%', false, PURPLE],
    ['Public Comments', '324', '↑ 9.7%', false, BLUE],
    ['Survey Responses', '589', '↓ 3.2%', true, AMBER],
    ['Public Hearings', '2', '—', null, GREEN],
  ];

  const projects: [string, string, string, string, number, string, string][] = [
    ['Central Park Renovation', 'Ward 3', 'Parks & Recreation', '$2.45M', 65, 'In Progress', GREEN],
    ['Water Pipeline Extension', 'Ward 7', 'Water & Sanitation', '$1.80M', 40, 'In Progress', BLUE],
    ['Community Health Center', 'Ward 5', 'Health', '$3.20M', 78, 'In Progress', TEAL],
    ['Street Lighting Expansion', 'Ward 8', 'Infrastructure', '$950K', 55, 'In Progress', AMBER],
    ['Youth Skills Development', 'Ward 2', 'Education & Youth', '$620K', 25, 'Planning', PURPLE],
  ];

  const budget = [
    { label: 'Infrastructure', v: 34.4, amt: '$8.45M', c: PURPLE },
    { label: 'Education', v: 18.8, amt: '$4.62M', c: BLUE },
    { label: 'Health', v: 15.4, amt: '$3.76M', c: PINK },
    { label: 'Water & Sanitation', v: 11.8, amt: '$2.91M', c: TEAL },
    { label: 'Public Safety', v: 10.1, amt: '$2.48M', c: AMBER },
    { label: 'Other Services', v: 9.5, amt: '$2.34M', c: '#9aa3b5' },
  ];

  const voice: [string, string, string, string, number, string][] = [
    ['Improve Playground Facilities in Central Park', 'Sarah Ahmed', 'Under Review', 'Closes in 6 days', 68, '324 Supporters'],
    ['More Bus Stops on Main Street', 'John D.', 'Open for Voting', 'Closes in 12 days', 72, '512 Supporters'],
    ['Community Recycling Program', 'Green Initiative', 'Under Review', 'Closes in 9 days', 56, '287 Supporters'],
    ['Street Cleanliness Campaign', 'Local Youth Council', 'Implemented', 'Implemented on 1 May 2025', 100, 'Completed'],
  ];
  const voiceC: Record<string, string> = { 'Under Review': AMBER, 'Open for Voting': BLUE, Implemented: GREEN };

  return (
    <div className="space-y-3 rounded-[5px] p-3" style={{ background: BG, color: INK }}>
      {/* ── Header ─────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
        <div className="flex items-center gap-3">
          <span className="grid h-9 w-9 place-items-center rounded-lg text-[15px] text-white" style={{ background: NAVY }} aria-hidden>♛</span>
          <div>
            <div className="text-[12px] font-bold leading-tight" style={{ color: INK }}>National Governance Platform</div>
            <div className="text-[9.5px]" style={{ color: MUT }}>Local Councils System · People. Participation. Progress.</div>
          </div>
        </div>
        <div>
          <div className="text-[20px] font-bold leading-tight" style={{ color: INK }}>Local Councils</div>
          <div className="text-[11px]" style={{ color: MUT }}>Strengthening local democracy through transparency, participation and accountable governance.</div>
        </div>
        <div className="ml-auto flex flex-wrap items-center gap-3 text-[11px]">
          <span className="flex items-center gap-2 rounded-lg border px-3 py-1.5" style={{ borderColor: LINE, background: CARD, color: MUT }}>⌕ Search councils, meetings, resolutions…</span>
          <span className="flex items-center gap-2 rounded-lg border px-3 py-1.5" style={{ borderColor: LINE, background: CARD, color: SOFT }}>📅 <span style={{ color: INK }}>{dd}</span> · {day}</span>
          <span className="relative grid h-8 w-8 place-items-center rounded-lg border" style={{ borderColor: LINE, background: CARD, color: SOFT }}>⛁<span className="absolute -right-1 -top-1 grid h-3.5 min-w-3.5 place-items-center rounded-full px-1 text-[8px] font-bold text-white" style={{ background: RED }}>5</span></span>
          <span className="flex items-center gap-2 rounded-lg border px-3 py-1.5" style={{ borderColor: LINE, background: CARD }}>
            <span className="grid h-6 w-6 place-items-center rounded-full text-[9px] font-bold text-white" style={{ background: NAVY }}>CS</span>
            <span><span className="block font-medium" style={{ color: INK }}>Council Secretary</span><span style={{ color: MUT }}>Central District Council</span></span>
          </span>
        </div>
      </div>

      {/* ── KPI strip ──────────────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">{kpis}</div>

      {/* ── Row 1 ──────────────────────────────────────────────── */}
      <div className="grid gap-3 xl:grid-cols-3">
        <Card title="Upcoming Council Meetings" action="View Calendar">
          <div className="space-y-3">
            {meetings.map(([mo, dnum, dw, t, when, ag, tag]) => (
              <div key={t} className="flex gap-3 rounded-lg border p-2.5" style={{ borderColor: LINE }}>
                <div className="grid w-12 shrink-0 place-items-center rounded-lg py-1 text-center" style={{ background: '#f0f2f8' }}>
                  <span className="text-[8px] font-semibold" style={{ color: PURPLE }}>{mo}</span>
                  <span className="text-[16px] font-bold leading-none" style={{ color: INK }}>{dnum}</span>
                  <span className="text-[7.5px]" style={{ color: MUT }}>{dw}</span>
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[11px] font-semibold" style={{ color: INK }}>{t}</span>
                    <span className="shrink-0 rounded-full px-2 py-0.5 text-[8px] font-semibold" style={{ color: tag === 'Public Session' ? PURPLE : BLUE, background: `color-mix(in srgb,${tag === 'Public Session' ? PURPLE : BLUE} 12%,#fff)` }}>{tag}</span>
                  </div>
                  <div className="text-[9px]" style={{ color: SOFT }}>{when}</div>
                  <div className="mt-0.5 text-[9px]" style={{ color: MUT }}>{ag}</div>
                </div>
              </div>
            ))}
            <div className="text-[10px] font-medium" style={{ color: PURPLE }}>View All Meetings &amp; Agendas →</div>
          </div>
        </Card>
        <Card title="Recent Resolutions" action="View All">
          <div className="space-y-2.5">
            {resolutions.map(([rid, t, when]) => (
              <div key={rid} className="flex items-start gap-2.5">
                <span className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full text-[10px]" style={{ background: `color-mix(in srgb,${GREEN} 14%,#fff)`, color: GREEN }} aria-hidden>✓</span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-mono text-[9.5px] font-semibold" style={{ color: INK }}>{rid}</span>
                    <span className="rounded-full px-2 py-0.5 text-[8px] font-semibold" style={{ color: GREEN, background: `color-mix(in srgb,${GREEN} 12%,#fff)` }}>Passed</span>
                  </div>
                  <div className="text-[10px]" style={{ color: SOFT }}>{t}</div>
                  <div className="text-[8.5px]" style={{ color: MUT }}>{when}</div>
                </div>
              </div>
            ))}
            <div className="text-[10px] font-medium" style={{ color: PURPLE }}>View All Resolutions →</div>
          </div>
        </Card>
        <Card title="Citizen Participation" action="View All">
          <div className="grid grid-cols-2 gap-2.5">
            {participation.map(([l, v, n, dn, c]) => (
              <div key={l} className="rounded-lg border p-3" style={{ borderColor: LINE, background: `color-mix(in srgb,${c} 5%,#fff)` }}>
                <div className="text-[10px]" style={{ color: SOFT }}>{l}</div>
                <div className="text-[18px] font-bold tabular-nums" style={{ color: INK }}>{v}</div>
                <div className="text-[8.5px]" style={{ color: MUT }}>This Month · <span style={{ color: dn == null ? MUT : dn ? RED : GREEN }}>{n}</span></div>
              </div>
            ))}
          </div>
          <div className="mt-3 grid place-items-center rounded-lg border border-dashed py-2.5 text-[10px] font-semibold" style={{ borderColor: LINE, color: PURPLE }}>+ Start New Consultation</div>
        </Card>
      </div>

      {/* ── Row 2 ──────────────────────────────────────────────── */}
      <div className="grid gap-3 xl:grid-cols-[1.5fr_1fr]">
        <Card title="Active Projects & Programs" action="View All Projects →">
          <div className="flex border-b pb-1.5 text-[8px] uppercase tracking-wider" style={{ color: MUT, borderColor: LINE }}>
            <span className="flex-1">Project / Program</span><span className="w-16">Ward</span><span className="w-32">Category</span>
            <span className="w-16 text-right">Budget</span><span className="w-28 px-2">Progress</span><span className="w-20 text-right">Status</span>
          </div>
          <div className="mt-1.5 space-y-2">
            {projects.map(([nm, wd, cat, bud, pr, st, c]) => (
              <div key={nm} className="flex items-center text-[9.5px]">
                <span className="min-w-0 flex-1 truncate" style={{ color: INK }}>{nm}</span>
                <span className="w-16" style={{ color: SOFT }}>{wd}</span>
                <span className="w-32"><span className="rounded px-1.5 py-0.5 text-[8.5px]" style={{ color: c, background: `color-mix(in srgb,${c} 12%,#fff)` }}>{cat}</span></span>
                <span className="w-16 text-right tabular-nums" style={{ color: INK }}>{bud}</span>
                <span className="flex w-28 items-center gap-1.5 px-2">
                  <span className="h-1.5 flex-1 overflow-hidden rounded-full" style={{ background: '#eef0f6' }}><span className="block h-full rounded-full" style={{ width: `${pr}%`, background: c }} /></span>
                  <span className="tabular-nums" style={{ color: SOFT }}>{pr}%</span>
                </span>
                <span className="w-20 text-right text-[8.5px] font-semibold" style={{ color: st === 'Planning' ? AMBER : GREEN }}>● {st}</span>
              </div>
            ))}
          </div>
          <div className="mt-2.5 text-[10px] font-medium" style={{ color: PURPLE }}>View All Projects &amp; Programs →</div>
        </Card>
        <Card title="Budget Overview" sub="FY 2025" action="View Details">
          <Donut top="$24.58M" sub="Total Budget" segs={budget} />
          <div className="mt-3 grid grid-cols-2 gap-2.5">
            <div className="rounded-lg border p-2.5" style={{ borderColor: LINE, background: `color-mix(in srgb,${GREEN} 5%,#fff)` }}>
              <div className="text-[15px] font-bold" style={{ color: GREEN }}>$16.81M</div>
              <div className="text-[9px]" style={{ color: SOFT }}>Total Expenditure</div>
              <div className="text-[8.5px]" style={{ color: MUT }}>68.4% Utilized</div>
            </div>
            <div className="rounded-lg border p-2.5" style={{ borderColor: LINE, background: `color-mix(in srgb,${BLUE} 5%,#fff)` }}>
              <div className="text-[15px] font-bold" style={{ color: BLUE }}>$7.77M</div>
              <div className="text-[9px]" style={{ color: SOFT }}>Remaining Budget</div>
              <div className="text-[8.5px]" style={{ color: MUT }}>31.6% Available</div>
            </div>
          </div>
        </Card>
      </div>

      {/* ── Row 3 ──────────────────────────────────────────────── */}
      <Card title="Community Voice" action="View All Proposals →">
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {voice.map(([t, by, st, when, pct, sup]) => (
            <div key={t} className="rounded-lg border p-3" style={{ borderColor: LINE }}>
              <span className="inline-block rounded-full px-2 py-0.5 text-[8px] font-semibold" style={{ color: voiceC[st], background: `color-mix(in srgb,${voiceC[st]} 12%,#fff)` }}>{st}</span>
              <div className="mt-1.5 text-[11px] font-semibold leading-snug" style={{ color: INK }}>{t}</div>
              <div className="text-[8.5px]" style={{ color: MUT }}>Proposed by {by}</div>
              <div className="mt-2 flex items-center gap-2">
                <span className="h-1.5 flex-1 overflow-hidden rounded-full" style={{ background: '#eef0f6' }}><span className="block h-full rounded-full" style={{ width: `${pct}%`, background: st === 'Implemented' ? GREEN : BLUE }} /></span>
                <span className="text-[9px] tabular-nums" style={{ color: SOFT }}>{pct}%</span>
              </div>
              <div className="mt-1.5 flex items-center justify-between text-[8.5px]" style={{ color: MUT }}>
                <span>{sup}</span><span>{when}</span>
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* ── Footer ─────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-t pt-3 text-[10px]" style={{ borderColor: LINE, color: MUT }}>
        <span>Local Councils System — People. Participation. Progress.</span>
        <span>Council Active · Established 2018 · Wards 12 · Population 482,719 · Quorum {ls.quorum ? 'Held' : 'At Risk'} · Attendance {ls.attendancePct}%</span>
      </div>
    </div>
  );
}
