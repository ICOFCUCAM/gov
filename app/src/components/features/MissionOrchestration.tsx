'use client';

// Mission Orchestration Center — Workflows & Missions. Dense dark
// whole-of-government orchestration surface modelled on the benchmark:
// KPI ring strip, multi-mission Gantt timeline, mission-flow stage
// diagram, inter-mission dependency network, my-assignments, escalations
// and mission communications. Pure & deterministic — telemetry only.

import * as React from 'react';
import { wave, waveSeries, seed } from '@/lib/telemetry';

const BG = '#070b12';
const PANEL = '#0d131c';
const PANEL2 = '#111927';
const LINE = 'rgba(90,150,210,0.16)';
const LINE2 = 'rgba(255,255,255,0.06)';
const CYAN = '#37c7d4';
const BLUE = '#4f8df0';
const GREEN = '#35c08a';
const TEAL = '#2bb3a6';
const PURPLE = '#8a6cf0';
const AMBER = '#e0a13a';
const RED = '#e0685f';
const GREY = '#5d6a77';
const INK = '#d8e0e8';
const SOFT = '#8c99a7';
const MUT = '#5d6a77';

const ID = 'moc';

type ST = 'Not Started' | 'In Progress' | 'On Track' | 'At Risk' | 'Delayed' | 'Completed';
const STC: Record<ST, string> = {
  'Not Started': GREY, 'In Progress': BLUE, 'On Track': GREEN, 'At Risk': AMBER, Delayed: RED, Completed: TEAL,
};

function Ring({ pct, c, label }: { pct: number; c: string; label: string }) {
  const r = 17, circ = 2 * Math.PI * r;
  return (
    <svg width="44" height="44" viewBox="0 0 44 44" aria-hidden>
      <circle cx="22" cy="22" r={r} fill="none" stroke="#1a212c" strokeWidth="4" />
      <circle cx="22" cy="22" r={r} fill="none" stroke={c} strokeWidth="4" strokeLinecap="round"
        strokeDasharray={`${(pct / 100) * circ} ${circ}`} transform="rotate(-90 22 22)" />
      <text x="22" y="25" textAnchor="middle" fontSize="11" fill={c} aria-hidden>{label}</text>
    </svg>
  );
}

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
        {action ? <span className="text-[9.5px] font-medium" style={{ color: CYAN }}>{action}</span> : null}
      </div>
      <div className="flex-1 p-3.5">{children}</div>
    </section>
  );
}

const MISSIONS: [string, string, ST, number, number][] = [
  ['M-2025-017', 'Digital ID Rollout', 'On Track', 0, 5],
  ['M-2025-018', 'Health System Upgrade', 'In Progress', 0, 6],
  ['M-2025-019', 'River Cleanup Initiative', 'On Track', 1, 6],
  ['M-2025-020', 'Border Surveillance', 'In Progress', 1, 6],
  ['M-2025-021', 'Disaster Response Plan', 'At Risk', 0, 6],
  ['M-2025-022', 'Tax System Modernization', 'On Track', 2, 6],
  ['M-2025-023', 'Education Reform', 'Not Started', 3, 6],
  ['M-2025-024', 'Smart City Phase 2', 'Delayed', 0, 3],
];

function Timeline() {
  const days = ['11 May', '12 May', '13 May', '14 May', '15 May', '16 May', '17 May'];
  return (
    <div>
      <div className="flex border-b pb-1.5 text-[8.5px]" style={{ color: MUT, borderColor: LINE2 }}>
        <span className="w-36 shrink-0 uppercase tracking-wider">Missions</span>
        <div className="flex flex-1">{days.map(d => <span key={d} className="flex-1 text-center">{d}</span>)}</div>
      </div>
      <div className="mt-1.5 space-y-2.5">
        {MISSIONS.map(([mid, nm, st, s, e]) => {
          const c = STC[st];
          const left = (s / 7) * 100, width = ((e - s) / 7) * 100;
          return (
            <div key={mid} className="flex items-center">
              <div className="w-36 shrink-0 pr-2">
                <div className="flex items-center gap-1.5 text-[10px]"><span className="h-2 w-2 rounded-full" style={{ background: c }} /><span style={{ color: INK }}>{mid}</span></div>
                <div className="pl-3.5 text-[8.5px]" style={{ color: MUT }}>{nm}</div>
              </div>
              <div className="relative h-5 flex-1">
                <div className="absolute inset-y-0 flex w-full">{days.map((_, i) => <span key={i} className="flex-1 border-l" style={{ borderColor: LINE2 }} />)}</div>
                <div className="absolute top-1/2 h-2 -translate-y-1/2 rounded-full" style={{ left: `${left}%`, width: `${width}%`, background: c, opacity: 0.85 }} />
                {[0.35, 0.7].map((f, i) => (
                  <span key={i} className="absolute top-1/2 h-2 w-2 -translate-y-1/2 rotate-45" style={{ left: `${left + width * f}%`, background: '#0d131c', border: `1.5px solid ${c}` }} />
                ))}
                {st === 'At Risk' || st === 'Delayed' ? (
                  <span className="absolute top-1/2 -translate-y-1/2 border-t-2 border-dashed" style={{ left: `${left + width}%`, width: `${Math.max(0, 100 - left - width)}%`, borderColor: RED, opacity: 0.6 }} />
                ) : null}
              </div>
            </div>
          );
        })}
      </div>
      <div className="absolute" />
      <div className="mt-3 flex flex-wrap gap-x-3 gap-y-1 border-t pt-2 text-[8px]" style={{ color: SOFT, borderColor: LINE2 }}>
        {(['Not Started', 'In Progress', 'On Track', 'At Risk', 'Delayed', 'Completed'] as ST[]).map(s => (
          <span key={s} className="inline-flex items-center gap-1"><span className="h-1.5 w-1.5 rounded-full" style={{ background: STC[s] }} />{s}</span>
        ))}
        <span className="inline-flex items-center gap-1"><span className="h-1.5 w-1.5 rotate-45" style={{ border: `1.5px solid ${INK}` }} />Milestone</span>
        <span className="inline-flex items-center gap-1"><span className="w-4 border-t-2 border-dashed" style={{ borderColor: RED }} />Critical Path</span>
      </div>
    </div>
  );
}

function FlowNode({ t, o, st }: { t: string; o: string; st: string }) {
  const c = st === 'Completed' ? GREEN : st === 'In Progress' ? BLUE : st === 'At Risk' ? AMBER : GREY;
  return (
    <div className="rounded-lg border px-3 py-2" style={{ borderColor: `color-mix(in srgb,${c} 40%,transparent)`, background: `color-mix(in srgb,${c} 9%,${PANEL})` }}>
      <div className="text-[10px] font-semibold" style={{ color: INK }}>{t}</div>
      <div className="text-[8px]" style={{ color: MUT }}>{o}</div>
      <div className="mt-1 flex items-center gap-1 text-[8px]" style={{ color: c }}><span className="h-1.5 w-1.5 rounded-full" style={{ background: c }} />{st}</div>
    </div>
  );
}

export function MissionOrchestration() {
  const [now, setNow] = React.useState(() => Date.now());
  React.useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);
  const ts = now / 4000;
  const clock = new Date(now);
  const dd = clock.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  const tm = clock.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit' });

  const total = 23;
  const completed = 50 + Math.round(wave(`mo:cp:${ID}`, ts, 0, 12));

  const kpis: [string, string, string, number, string, string][] = [
    ['TOTAL MISSIONS', String(total), '↑ 21% vs last 30 days', 100, CYAN, '23'],
    ['ON TRACK', '18', '78.3%', 78, GREEN, '78'],
    ['AT RISK', '3', '13.0%', 13, AMBER, '13'],
    ['DELAYED', '2', '8.7%', 9, PURPLE, '9'],
    ['COMPLETED', String(completed), 'This Month', 100, GREEN, '✓'],
    ['AVG. COMPLETION TIME', '4.2 days', '↓ 8% vs last 30 days', 64, BLUE, '4.2'],
  ];

  const flow: [string, string, string][][] = [
    [['Initiation', 'Ministry of Health', 'Completed'], ['Requirements', 'Health Dept.', 'Completed'], ['Planning', 'PMO', 'Completed']],
    [['Procurement', 'Finance Ministry', 'In Progress'], ['Implementation', 'IT Department', 'In Progress'], ['Testing', 'QA Team', 'At Risk']],
    [['Training', 'HR Department', 'Not Started'], ['Deployment', 'Regional Offices', 'Not Started'], ['Go-Live', 'All Regions', 'Not Started']],
  ];

  const depNodes: [string, string, number, number, string][] = [
    ['M-2025-017', 'Digital ID Rollout', 14, 22, GREEN],
    ['M-2025-022', 'Tax System Modernization', 60, 14, TEAL],
    ['M-2025-023', 'Education Reform', 80, 30, GREY],
    ['M-2025-018', 'Health System Upgrade', 44, 52, BLUE],
    ['M-2025-019', 'River Cleanup Initiative', 14, 74, GREEN],
    ['M-2025-024', 'Smart City Phase 2', 50, 86, GREY],
    ['M-2025-020', 'Border Surveillance', 82, 72, RED],
  ];
  const depEdges: [number, number, string][] = [
    [0, 3, BLUE], [1, 3, RED], [2, 3, GREY], [4, 3, BLUE], [3, 6, RED], [5, 3, GREY], [1, 0, GREY],
  ];

  const assignments: [string, string, string, string, string][] = [
    ['Review Implementation Plan', 'M-2025-018 · Health System Upgrade', 'Due: 18 May 2025', 'In Progress', BLUE],
    ['Approve Budget Allocation', 'M-2025-022 · Tax System Modernization', 'Due: 19 May 2025', 'Pending Approval', AMBER],
    ['Validate Security Protocols', 'M-2025-020 · Border Surveillance', 'Due: 20 May 2025', 'In Progress', BLUE],
    ['Review Training Materials', 'M-2025-018 · Health System Upgrade', 'Due: 21 May 2025', 'Not Started', GREY],
    ['Go-Live Readiness Check', 'M-2025-018 · Health System Upgrade', 'Due: 22 May 2025', 'Not Started', GREY],
  ];
  const escalations: [string, string, string, string][] = [
    ['High', 'Procurement delay in M-2025-018', '10:15 AM', RED],
    ['Medium', 'Resource conflict in M-2025-021', '09:42 AM', AMBER],
    ['High', 'Dependency risk M-2025-022 → M-2025-018', 'Yesterday', RED],
    ['Low', 'Task overdue in M-2025-023', 'Yesterday', BLUE],
  ];
  const comms: [string, string, string][] = [
    ['PMO Update', 'M-2025-018 · Implementation phase started', '10:30 AM'],
    ['Health Ministry', 'Requirements approved for next stage', 'Yesterday'],
    ['Finance Ministry', 'Budget released for M-2025-022', '16 May'],
    ['IT Department', 'System integration testing scheduled', '15 May'],
  ];
  const health: [string, string, string][] = [['On Track', '18', GREEN], ['At Risk', '3', AMBER], ['Delayed', '2', RED], ['Critical', '2', RED]];

  return (
    <div className="space-y-3 rounded-[5px] p-3" style={{ background: BG, color: INK }}>
      {/* ── Header ─────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
        <div className="flex items-center gap-3">
          <span className="grid h-9 w-9 place-items-center rounded-lg text-[15px] text-white" style={{ background: `linear-gradient(135deg,${CYAN},${BLUE})` }} aria-hidden>♛</span>
          <div>
            <div className="text-[12px] font-bold leading-tight" style={{ color: INK }}>National Governance Platform</div>
            <div className="text-[9px]" style={{ color: MUT }}>Mission Orchestration Center · One Nation. One System. One Future.</div>
          </div>
        </div>
        <div>
          <div className="text-[19px] font-bold leading-tight tracking-wide" style={{ color: INK }}>WORKFLOWS &amp; MISSIONS</div>
          <div className="text-[10.5px]" style={{ color: MUT }}>Orchestrate. Execute. Monitor. Complete.</div>
        </div>
        <div className="ml-auto flex flex-wrap items-center gap-2.5 text-[10px]">
          <span className="rounded-lg border px-3 py-1.5" style={{ borderColor: LINE2, background: PANEL, color: SOFT }}>System Time <span style={{ color: INK }}>{dd} {tm}</span></span>
          <span className="rounded-lg border px-3 py-1.5" style={{ borderColor: LINE2, background: PANEL, color: GREEN }}>● All Systems Operational</span>
          <span className="rounded-lg border px-3 py-1.5" style={{ borderColor: LINE2, background: PANEL, color: SOFT }}>Active <span style={{ color: INK }}>23</span> · Critical <span style={{ color: RED }}>2</span></span>
          <span className="flex items-center gap-2 rounded-lg border px-3 py-1.5" style={{ borderColor: LINE2, background: PANEL }}>
            <span className="grid h-6 w-6 place-items-center rounded-full text-[9px] font-bold text-white" style={{ background: CYAN }}>MC</span>
            <span><span className="block font-medium" style={{ color: INK }}>Mission Controller</span><span style={{ color: MUT }}>National Command</span></span>
          </span>
        </div>
      </div>

      {/* ── KPI strip ──────────────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        {kpis.map(([l, v, n, pct, c, lab]) => (
          <div key={l} className="flex items-center gap-3 rounded-lg border p-3.5" style={{ borderColor: LINE, background: PANEL }}>
            <Ring pct={pct} c={c} label={lab} />
            <div className="min-w-0">
              <div className="text-[9px] uppercase tracking-wider" style={{ color: MUT }}>{l}</div>
              <div className="text-[19px] font-bold tabular-nums" style={{ color: INK }}>{v}</div>
              <div className="text-[8.5px]" style={{ color: n.startsWith('↓') || n.startsWith('↑') ? GREEN : MUT }}>{n}</div>
            </div>
          </div>
        ))}
      </div>

      {/* ── Row 1 ──────────────────────────────────────────────── */}
      <div className="grid gap-3 xl:grid-cols-[1.35fr_1fr]">
        <Card title="Mission Timeline" sub="Multi-mission execution timeline" action="7 Days ▾">
          <div className="relative"><Timeline /></div>
        </Card>
        <Card title="Mission Flow: Health System Upgrade" sub="M-2025-018">
          <div className="space-y-3">
            {flow.map((row, ri) => (
              <div key={ri} className="grid grid-cols-3 gap-2">
                {row.map(([t, o, st]) => <FlowNode key={t} t={t} o={o} st={st} />)}
              </div>
            ))}
          </div>
          <div className="mt-3 grid grid-cols-4 gap-2 border-t pt-3 text-[9px]" style={{ borderColor: LINE2 }}>
            <div><div style={{ color: MUT }}>Current Stage</div><div className="font-semibold" style={{ color: INK }}>Implementation</div></div>
            <div className="col-span-1"><div style={{ color: MUT }}>Stage Progress</div><div className="mt-1 h-1.5 overflow-hidden rounded-full" style={{ background: '#1a212c' }}><span className="block h-full rounded-full" style={{ width: '63%', background: BLUE }} /></div></div>
            <div><div style={{ color: MUT }}>Owner</div><div className="font-semibold" style={{ color: INK }}>IT Department</div></div>
            <div><div style={{ color: MUT }}>Due Date</div><div className="font-semibold" style={{ color: INK }}>22 May 2025</div></div>
          </div>
        </Card>
      </div>

      {/* ── Row 2 ──────────────────────────────────────────────── */}
      <div className="grid gap-3 xl:grid-cols-3">
        <Card title="Mission Dependencies" sub="Inter-mission dependency network" action="View: All ▾">
          <div className="relative" style={{ height: 280 }}>
            <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="absolute inset-0 h-full w-full" aria-hidden>
              {depEdges.map(([a, b, c], i) => {
                const A = depNodes[a]!, B = depNodes[b]!;
                return <line key={i} x1={A[2]} y1={A[3]} x2={B[2]} y2={B[3]} stroke={c} strokeWidth="0.4" strokeDasharray={c === GREY ? '1.5 1.5' : undefined} opacity="0.7" vectorEffect="non-scaling-stroke" />;
              })}
            </svg>
            {depNodes.map(([mid, nm, x, y, c]) => (
              <div key={mid} className="absolute -translate-x-1/2 -translate-y-1/2 rounded-md border px-1.5 py-1 text-center" style={{ left: `${x}%`, top: `${y}%`, borderColor: `color-mix(in srgb,${c} 45%,transparent)`, background: PANEL2, width: 92 }}>
                <div className="text-[8px] font-semibold" style={{ color: c }}>{mid}</div>
                <div className="text-[7px] leading-tight" style={{ color: MUT }}>{nm}</div>
              </div>
            ))}
          </div>
          <div className="mt-2 flex flex-wrap gap-x-3 border-t pt-2 text-[8px]" style={{ color: SOFT, borderColor: LINE2 }}>
            <span className="inline-flex items-center gap-1"><span className="w-4 border-t-2" style={{ borderColor: RED }} />Blocks</span>
            <span className="inline-flex items-center gap-1"><span className="w-4 border-t-2" style={{ borderColor: BLUE }} />Depends On</span>
            <span className="inline-flex items-center gap-1"><span className="w-4 border-t-2 border-dashed" style={{ borderColor: GREY }} />Related To</span>
          </div>
        </Card>
        <Card title="My Assignments" sub="Tasks assigned to you" action="View All">
          <div className="space-y-2">
            {assignments.map(([t, m, due, st, c]) => (
              <div key={t} className="rounded-lg border px-3 py-2" style={{ borderColor: LINE2, background: PANEL2 }}>
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[10px] font-semibold" style={{ color: INK }}>{t}</span>
                  <span className="shrink-0 rounded px-1.5 py-0.5 text-[8px] font-semibold" style={{ color: c, background: `color-mix(in srgb,${c} 16%,${PANEL})` }}>{st}</span>
                </div>
                <div className="text-[8.5px]" style={{ color: MUT }}>{m}</div>
                <div className="text-[8.5px]" style={{ color: SOFT }}>{due}</div>
              </div>
            ))}
          </div>
        </Card>
        <div className="space-y-3">
          <Card title="Escalations" action="View All">
            <div className="space-y-2">
              {escalations.map(([sv, t, ago, c]) => (
                <div key={t} className="flex items-center gap-2 text-[9.5px]">
                  <span className="grid h-5 w-5 shrink-0 place-items-center rounded text-[9px]" style={{ background: `color-mix(in srgb,${c} 18%,${PANEL})`, color: c }} aria-hidden>⚠</span>
                  <span className="w-12 shrink-0 text-[8px] font-semibold" style={{ color: c }}>{sv}</span>
                  <span className="min-w-0 flex-1 truncate" style={{ color: SOFT }}>{t}</span>
                  <span className="shrink-0 text-[8px]" style={{ color: MUT }}>{ago}</span>
                </div>
              ))}
            </div>
          </Card>
          <Card title="Mission Communications" action="View All">
            <div className="space-y-2">
              {comms.map(([who, msg, ago]) => (
                <div key={who + msg} className="flex items-center gap-2 text-[9.5px]">
                  <span className="grid h-5 w-5 shrink-0 place-items-center rounded text-[9px]" style={{ background: `color-mix(in srgb,${BLUE} 16%,${PANEL})`, color: BLUE }} aria-hidden>✉</span>
                  <div className="min-w-0 flex-1"><span style={{ color: INK }}>{who}</span> <span style={{ color: MUT }}>· {msg}</span></div>
                  <span className="shrink-0 text-[8px]" style={{ color: MUT }}>{ago}</span>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>

      {/* ── Mission Health ─────────────────────────────────────── */}
      <Card title="Mission Health" sub="Overall portfolio posture">
        <div className="flex flex-wrap items-center gap-6">
          <Ring pct={92} c={GREEN} label="92%" />
          <span className="text-[10px]" style={{ color: SOFT }}>Overall Success Rate</span>
          <div className="flex flex-1 flex-wrap gap-4">
            {health.map(([l, v, c]) => (
              <div key={l} className="flex items-center gap-2 text-[10px]">
                <span className="h-2 w-2 rounded-full" style={{ background: c }} />
                <span style={{ color: MUT }}>{l}</span>
                <span className="text-[14px] font-bold tabular-nums" style={{ color: INK }}>{v}</span>
              </div>
            ))}
            <div className="ml-auto h-8 w-40 self-center">
              <svg viewBox="0 0 100 30" preserveAspectRatio="none" className="h-full w-full" aria-hidden>
                <polyline points={waveSeries(`mo:tr:${ID}`, ts, 18, 4, 26).map((p, i) => `${(i / 17) * 100},${28 - p}`).join(' ')}
                  fill="none" stroke={GREEN} strokeWidth="1.4" vectorEffect="non-scaling-stroke" strokeLinejoin="round" />
              </svg>
            </div>
          </div>
        </div>
      </Card>

      {/* ── Footer ─────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-t pt-3 text-[9.5px]" style={{ borderColor: LINE2, color: MUT }}>
        <span>Mission Orchestration Center — Orchestrate. Execute. Monitor. Complete.</span>
        <span>Portfolio Success {92 + Math.round(seed(`mo:ps:${ID}`) * 4)}% · Active {total} · Completed {completed} · Updated {tm}</span>
      </div>
    </div>
  );
}
