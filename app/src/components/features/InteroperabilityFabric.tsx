'use client';

// Interoperability Fabric — Sovereign Digital Nervous System. Dense dark
// whole-of-government federation surface modelled on the benchmark: KPI
// header, radial sovereign interoperability map (national identity spine
// + ministry systems), API mesh overview, data-exchange lanes, identity
// & trust fabric, integration gateways, policy enforcement, contracts &
// SLAs and recent fabric events. Pure & deterministic — telemetry only.

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
const INK = '#d8e0e8';
const SOFT = '#8c99a7';
const MUT = '#5d6a77';

const ID = 'iof';

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

const MINISTRIES: [string, string, string, string][] = [
  ['Interior Ministry', '18ms', RED, '◈'],
  ['Health Ministry', '19ms', BLUE, '✚'],
  ['Education Ministry', '20ms', BLUE, '◎'],
  ['Defense Ministry', '22ms', AMBER, '⛨'],
  ['Justice Ministry', '17ms', RED, '⚖'],
  ['Municipal Federation', '21ms', TEAL, '▦'],
  ['Transport Ministry', '17ms', CYAN, '⇄'],
  ['Agriculture Ministry', '18ms', GREEN, '✿'],
  ['Energy Ministry', '20ms', AMBER, '⚡'],
  ['Finance Ministry', '16ms', GREEN, '§'],
];

function FabricMap({ ts }: { ts: number }) {
  const cx = 50, cy = 50, R = 37;
  const nodes = MINISTRIES.map((m, i) => {
    const ang = (Math.PI * 2 * i) / MINISTRIES.length - Math.PI / 2;
    return { ...{ name: m[0], lat: m[1], c: m[2], g: m[3] }, x: cx + Math.cos(ang) * R, y: cy + Math.sin(ang) * R, on: wave(`io:n:${ID}:${i}`, ts, 0, 1) > 0.25 };
  });
  return (
    <div className="relative overflow-hidden rounded-lg" style={{ background: 'radial-gradient(ellipse at 50% 50%,#0c1626,#070b12)', minHeight: 470 }}>
      <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="absolute inset-0 h-full w-full" aria-hidden>
        <defs>
          <radialGradient id={`spine-${ID}`}><stop offset="0%" stopColor={CYAN} stopOpacity="0.9" /><stop offset="100%" stopColor={CYAN} stopOpacity="0" /></radialGradient>
        </defs>
        {[14, 24, 34].map(r => <circle key={r} cx={cx} cy={cy} r={r} fill="none" stroke={LINE2} strokeWidth="0.2" />)}
        {nodes.map((n, i) => {
          const mx = (cx + n.x) / 2 + (n.y - cy) * 0.12, my = (cy + n.y) / 2 - (n.x - cx) * 0.12;
          return <path key={i} d={`M${cx} ${cy} Q ${mx} ${my} ${n.x} ${n.y}`} fill="none" stroke={n.c} strokeWidth="0.35"
            opacity={n.on ? 0.7 : 0.25} vectorEffect="non-scaling-stroke" strokeDasharray={n.on ? undefined : '1 1.5'} />;
        })}
        <circle cx={cx} cy={cy} r="9" fill={`url(#spine-${ID})`} />
      </svg>
      {/* central spine */}
      <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-center">
        <div className="grid h-16 w-16 place-items-center rounded-full border-2 text-[16px]" style={{ borderColor: CYAN, background: 'rgba(13,19,28,0.85)', color: CYAN, boxShadow: `0 0 24px color-mix(in srgb,${CYAN} 55%,transparent)` }} aria-hidden>⌘</div>
        <div className="mt-1 text-[10px] font-semibold leading-tight" style={{ color: INK }}>National<br />Identity Spine</div>
      </div>
      {nodes.map((n, i) => (
        <div key={i} className="absolute -translate-x-1/2 -translate-y-1/2 text-center" style={{ left: `${n.x}%`, top: `${n.y}%`, width: 110 }}>
          <div className="mx-auto grid h-9 w-9 place-items-center rounded-xl border text-[13px]" style={{ borderColor: `color-mix(in srgb,${n.c} 55%,transparent)`, background: 'rgba(13,19,28,0.85)', color: n.c, boxShadow: `0 0 14px color-mix(in srgb,${n.c} 35%,transparent)` }} aria-hidden>{n.g}</div>
          <div className="mt-1 text-[8.5px] font-medium leading-tight" style={{ color: INK }}>{n.name} Systems</div>
          <div className="text-[7.5px]" style={{ color: GREEN }}>● Online <span style={{ color: MUT }}>{n.lat}</span></div>
        </div>
      ))}
      <div className="absolute left-3 top-3 flex flex-col gap-1">
        {['+', '−', '⌖', '≣', '⛃'].map(s => <span key={s} className="grid h-6 w-6 place-items-center rounded-md border text-[11px]" style={{ borderColor: LINE2, background: 'rgba(13,19,28,0.85)', color: SOFT }}>{s}</span>)}
      </div>
      <div className="absolute left-3 top-0 -translate-y-0 rounded-md border px-2 py-1 text-[9px]" style={{ borderColor: LINE2, background: 'rgba(13,19,28,0.85)', color: SOFT, top: 12, left: 44 }}>View: Federation ▾</div>
      <div className="absolute right-3 top-3 flex gap-2 text-[9px]">
        <span className="rounded-md border px-2 py-1" style={{ borderColor: LINE2, background: 'rgba(13,19,28,0.85)', color: GREEN }}>● Auto Refresh ON</span>
      </div>
      <div className="absolute bottom-3 left-3 flex flex-wrap gap-x-3 gap-y-1 text-[8px]" style={{ color: SOFT }}>
        {[['High Throughput', PURPLE], ['Normal Traffic', GREEN], ['Low Traffic', BLUE], ['Degraded', AMBER], ['Blocked', RED]].map(([l, c]) => (
          <span key={l} className="inline-flex items-center gap-1"><span className="h-1.5 w-3 rounded-full" style={{ background: c }} />{l}</span>
        ))}
        <span className="inline-flex items-center gap-1" style={{ color: MUT }}>🔒 Encrypted · ◉ Official Gateway · ⬡ Trusted Link</span>
      </div>
    </div>
  );
}

function MeshViz({ ts }: { ts: number }) {
  const pts = Array.from({ length: 22 }).map((_, i) => ({
    x: 6 + seed(`io:mx:${ID}:${i}`) * 88, y: 8 + seed(`io:my:${ID}:${i}`) * 84,
    c: [CYAN, GREEN, BLUE, PURPLE][i % 4], on: wave(`io:mo:${ID}:${i}`, ts, 0, 1) > 0.4,
  }));
  return (
    <svg viewBox="0 0 100 60" preserveAspectRatio="none" style={{ width: '100%', height: 120 }} aria-hidden>
      {pts.map((p, i) => {
        const q = pts[(i + 3) % pts.length]!;
        return <line key={i} x1={p.x} y1={p.y * 0.6} x2={q.x} y2={q.y * 0.6} stroke={LINE} strokeWidth="0.3" vectorEffect="non-scaling-stroke" opacity="0.5" />;
      })}
      {pts.map((p, i) => <circle key={i} cx={p.x} cy={p.y * 0.6} r={p.on ? 1.4 : 0.9} fill={p.c} opacity={p.on ? 0.95 : 0.5} />)}
    </svg>
  );
}

export function InteroperabilityFabric() {
  const [now, setNow] = React.useState(() => Date.now());
  React.useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);
  const ts = now / 4000;
  const clock = new Date(now);
  const dd = clock.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  const tm = clock.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  const dx = (24 + wave(`io:dx:${ID}`, ts, 0, 2.4)).toFixed(1);

  const kpis: [string, string, string, string][] = [
    ['CONNECTED SYSTEMS', '132', '↑ 98.5%', CYAN],
    ['ACTIVE INTEGRATIONS', '586', '↑ 12.4%', GREEN],
    ['DATA EXCHANGES / MIN', `${dx}K`, '↑ 18.7%', BLUE],
    ['POLICY ENFORCEMENT', '100%', 'Compliant', PURPLE],
  ];

  const lanes: [string, string, string][] = [
    ['Citizen Data', '5.6K', PURPLE], ['Financial Data', '4.2K', BLUE], ['Health Data', '3.8K', CYAN],
    ['Logistics Data', '3.1K', TEAL], ['Security Data', '2.7K', AMBER], ['Other Domains', '5.4K', GREEN],
  ];
  const gateways: [string, string, string, string][] = [
    ['GW-NORTH', 'North Region', '14ms', '2.4K/min'], ['GW-CENTRAL', 'Central Region', '15ms', '2.1K/min'],
    ['GW-EAST', 'East Region', '16ms', '2.2K/min'], ['GW-SOUTH', 'South Region', '17ms', '2.0K/min'],
  ];
  const policies = ['Data Sovereignty Policy', 'Access Control Policy', 'Data Classification Policy', 'API Security Policy'];
  const contracts: [string, string][] = [
    ['Health Data Sharing Agreement', '99.9%'], ['Finance Data Exchange Agreement', '100%'],
    ['Identity Federation Agreement', '99.7%'], ['Law Enforcement Data Access', '100%'],
  ];
  const events: [string, string, string][] = [
    ['New system connected: Municipal Permit System', '10:41:23 AM', GREEN],
    ['Policy updated: Data Sovereignty Policy v2.1', '10:39:55 AM', BLUE],
    ['High throughput detected: Finance Data Lane', '10:38:41 AM', AMBER],
    ['Certificate renewed: Health Ministry Gateway', '10:37:12 AM', PURPLE],
    ['Integration deployed: Education Analytics API', '10:35:29 AM', CYAN],
  ];
  const health: [string, string, string][] = [['Healthy', '128', GREEN], ['Warning', '3', AMBER], ['Degraded', '1', AMBER], ['Critical', '0', RED]];

  return (
    <div className="space-y-3 rounded-[5px] p-3" style={{ background: BG, color: INK }}>
      {/* ── Header ─────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
        <div className="flex items-center gap-3">
          <span className="grid h-9 w-9 place-items-center rounded-lg text-[15px] text-white" style={{ background: `linear-gradient(135deg,${CYAN},${PURPLE})` }} aria-hidden>♛</span>
          <div>
            <div className="text-[12px] font-bold leading-tight" style={{ color: INK }}>National Governance Platform</div>
            <div className="text-[9px]" style={{ color: MUT }}>Interoperability Fabric · One Nation. One Fabric.</div>
          </div>
        </div>
        <div>
          <div className="text-[19px] font-bold leading-tight tracking-wide" style={{ color: INK }}>INTEROPERABILITY FABRIC</div>
          <div className="text-[10.5px]" style={{ color: MUT }}>Sovereign Digital Nervous System</div>
        </div>
        <div className="ml-auto flex flex-wrap items-center gap-2.5 text-[10px]">
          {kpis.map(([l, v, n, c]) => (
            <span key={l} className="rounded-lg border px-3 py-1.5" style={{ borderColor: LINE2, background: PANEL }}>
              <span className="block text-[8px] uppercase tracking-wider" style={{ color: MUT }}>{l}</span>
              <span className="text-[14px] font-bold tabular-nums" style={{ color: INK }}>{v}</span> <span className="text-[8.5px]" style={{ color: c }}>{n}</span>
            </span>
          ))}
          <span className="rounded-lg border px-3 py-1.5 text-center" style={{ borderColor: LINE2, background: PANEL, color: SOFT }}>⌛ {dd}<br /><span style={{ color: INK }}>{tm}</span></span>
          <span className="flex items-center gap-2 rounded-lg border px-3 py-1.5" style={{ borderColor: LINE2, background: PANEL }}>
            <span className="grid h-6 w-6 place-items-center rounded-full text-[9px] font-bold text-white" style={{ background: CYAN }}>CA</span>
            <span><span className="block font-medium" style={{ color: INK }}>Chief Architect</span><span style={{ color: MUT }}>Digital Sovereignty Office</span></span>
          </span>
        </div>
      </div>

      {/* ── Map + right rail ───────────────────────────────────── */}
      <div className="grid gap-3 xl:grid-cols-[1.7fr_1fr]">
        <Card title="Sovereign Interoperability Map" sub="Real-time federation topology" action="● Auto Refresh ON">
          <FabricMap ts={ts} />
        </Card>
        <div className="space-y-3">
          <Card title="API Mesh Overview" action="›">
            <div className="grid grid-cols-3 gap-2 text-center">
              {[['Total APIs', '1,248'], ['Active', '1,182'], ['Success Rate', '99.93%']].map(([l, v]) => (
                <div key={l}><div className="text-[8.5px]" style={{ color: MUT }}>{l}</div><div className="text-[14px] font-bold tabular-nums" style={{ color: INK }}>{v}</div></div>
              ))}
            </div>
            <div className="mt-1 rounded-lg" style={{ background: PANEL2 }}><MeshViz ts={ts} /></div>
            <div className="mt-1.5 flex flex-wrap gap-x-3 text-[8px]" style={{ color: SOFT }}>
              {[['Ministry APIs', CYAN], ['Shared Services', GREEN], ['External', BLUE], ['Third Party', PURPLE]].map(([l, c]) => (
                <span key={l} className="inline-flex items-center gap-1"><span className="h-1.5 w-1.5 rounded-full" style={{ background: c }} />{l}</span>
              ))}
            </div>
          </Card>
          <Card title="Data Exchange Lanes" sub="Live data flows across domains" action="›">
            <div className="space-y-2">
              {lanes.map(([l, v, c]) => (
                <div key={l} className="text-[9.5px]">
                  <div className="flex justify-between"><span style={{ color: SOFT }}>{l}</span><span className="tabular-nums" style={{ color: INK }}>{v} <span style={{ color: MUT }}>/min</span></span></div>
                  <div className="mt-1 h-1.5 overflow-hidden rounded-full" style={{ background: '#1a212c' }}><span className="block h-full rounded-full" style={{ width: `${(parseFloat(v) / 5.6) * 100}%`, background: c }} /></div>
                </div>
              ))}
            </div>
          </Card>
          <Card title="Identity & Trust Fabric" action="›">
            <div className="grid grid-cols-3 gap-2 text-center">
              {[['Trust Domains', '28'], ['Active Identities', '4.62M'], ['Verifications / Min', '12.6K']].map(([l, v]) => (
                <div key={l}><div className="text-[8.5px]" style={{ color: MUT }}>{l}</div><div className="text-[13px] font-bold tabular-nums" style={{ color: INK }}>{v}</div></div>
              ))}
            </div>
            <div className="mt-1 rounded-lg" style={{ background: PANEL2 }}><MeshViz ts={ts} /></div>
          </Card>
        </div>
      </div>

      {/* ── Bottom row ─────────────────────────────────────────── */}
      <div className="grid gap-3 xl:grid-cols-4">
        <Card title="Integration Gateways" sub="12 / 12 Online" action="View All Gateways →">
          <div className="flex border-b pb-1 text-[8px] uppercase tracking-wider" style={{ color: MUT, borderColor: LINE2 }}>
            <span className="flex-1">Gateway · Region</span><span className="w-14 text-right">Latency</span><span className="w-16 text-right">Throughput</span>
          </div>
          <div className="mt-1 space-y-2">
            {gateways.map(([g, r, lat, tp]) => (
              <div key={g} className="flex items-center text-[9px]">
                <div className="min-w-0 flex-1"><span style={{ color: INK }}>{g}</span> <span style={{ color: MUT }}>· {r}</span><div className="text-[7.5px]" style={{ color: GREEN }}>● Online</div></div>
                <span className="w-14 text-right tabular-nums" style={{ color: SOFT }}>{lat}</span>
                <span className="w-16 text-right tabular-nums" style={{ color: SOFT }}>{tp}</span>
              </div>
            ))}
          </div>
        </Card>
        <Card title="Policy Enforcement" action="View All Policies →">
          <div className="grid grid-cols-3 gap-2 text-center">
            {[['Active Policies', '256', INK], ['Violations (24h)', '0', GREEN], ['Compliance', '100%', GREEN]].map(([l, v, c]) => (
              <div key={l}><div className="text-[8px]" style={{ color: MUT }}>{l}</div><div className="text-[14px] font-bold tabular-nums" style={{ color: c }}>{v}</div></div>
            ))}
          </div>
          <div className="mt-2 space-y-1.5 border-t pt-2" style={{ borderColor: LINE2 }}>
            {policies.map(p => (
              <div key={p} className="flex items-center justify-between text-[9px]">
                <span style={{ color: SOFT }}>{p}</span><span className="rounded px-1.5 py-0.5 text-[8px] font-semibold" style={{ color: GREEN, background: `color-mix(in srgb,${GREEN} 16%,${PANEL})` }}>Enforced</span>
              </div>
            ))}
          </div>
        </Card>
        <Card title="Contracts & SLAs" action="View All Contracts →">
          <div className="grid grid-cols-3 gap-2 text-center">
            {[['Active Contracts', '324', INK], ['SLA Compliance', '99.8%', GREEN], ['Breaches', '0', GREEN]].map(([l, v, c]) => (
              <div key={l}><div className="text-[8px]" style={{ color: MUT }}>{l}</div><div className="text-[14px] font-bold tabular-nums" style={{ color: c }}>{v}</div></div>
            ))}
          </div>
          <div className="mt-2 space-y-1.5 border-t pt-2" style={{ borderColor: LINE2 }}>
            {contracts.map(([c, v]) => (
              <div key={c} className="flex items-center justify-between text-[9px]">
                <span className="min-w-0 flex-1 truncate" style={{ color: SOFT }}>{c}</span><span className="tabular-nums" style={{ color: GREEN }}>{v}</span>
              </div>
            ))}
          </div>
        </Card>
        <Card title="Recent Fabric Events" action="View All">
          <div className="space-y-2">
            {events.map(([t, ago, c]) => (
              <div key={t} className="flex items-start gap-2 text-[9px]">
                <span className="mt-0.5 h-2 w-2 shrink-0 rounded-full" style={{ background: c }} />
                <div className="min-w-0 flex-1"><div className="truncate" style={{ color: SOFT }}>{t}</div><div className="text-[7.5px]" style={{ color: MUT }}>{ago}</div></div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* ── Fabric Health + footer ─────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-x-6 gap-y-2 rounded-lg border p-3 text-[10px]" style={{ borderColor: LINE, background: PANEL }}>
        <span className="text-[14px] font-bold" style={{ color: GREEN }}>99.8%</span>
        <span style={{ color: MUT }}>Fabric Integrity</span>
        {health.map(([l, v, c]) => (
          <span key={l} className="inline-flex items-center gap-1.5"><span className="h-2 w-2 rounded-full" style={{ background: c }} /><span style={{ color: MUT }}>{l}</span><span className="font-bold tabular-nums" style={{ color: INK }}>{v}</span></span>
        ))}
        <span className="ml-auto" style={{ color: MUT }}>Connected 132 · Integrations 586 · Exchanges {dx}K/min · Last Updated {tm}</span>
      </div>
    </div>
  );
}
