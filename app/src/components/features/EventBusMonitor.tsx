'use client';

// Event Bus Monitor — National Governance Platform interoperability
// fabric. Dense dark event-streaming observability surface modelled on
// the benchmark: KPI strip, event-flow topology (producers → topics →
// consumers → sinks), cluster throughput, top topics, error events,
// broker health, partition skew, consumer lag, live stream preview and
// event-rate-by-domain. Pure & deterministic — telemetry only.

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

const ID = 'ebm';

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

function Area({ series, h = 150, max }: { series: { c: string; pts: number[] }[]; h?: number; max: number }) {
  return (
    <svg viewBox="0 0 100 100" preserveAspectRatio="none" style={{ width: '100%', height: h }} aria-hidden>
      <defs>{series.map((s, i) => (
        <linearGradient key={i} id={`ea-${ID}-${i}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={s.c} stopOpacity="0.4" /><stop offset="100%" stopColor={s.c} stopOpacity="0.03" />
        </linearGradient>
      ))}</defs>
      {[25, 50, 75].map(y => <line key={y} x1="0" y1={y} x2="100" y2={y} stroke={LINE2} strokeWidth="0.5" />)}
      {series.map((s, i) => {
        const xy = s.pts.map((p, j) => [(j / (s.pts.length - 1)) * 100, 98 - (p / max) * 92] as [number, number]);
        return (
          <React.Fragment key={i}>
            <polygon points={`0,100 ${xy.map(([x, y]) => `${x},${y}`).join(' ')} 100,100`} fill={`url(#ea-${ID}-${i})`} />
            <polyline points={xy.map(([x, y]) => `${x},${y}`).join(' ')} fill="none" stroke={s.c} strokeWidth="1.2" vectorEffect="non-scaling-stroke" strokeLinejoin="round" />
          </React.Fragment>
        );
      })}
    </svg>
  );
}

function Donut({ segs, top }: { segs: { label: string; v: number; n: string; c: string }[]; top: string }) {
  const size = 150, sum = segs.reduce((s, x) => s + x.v, 0) || 1, r = size / 2 - 12, circ = 2 * Math.PI * r;
  let acc = 0;
  return (
    <div className="flex items-center gap-4">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="shrink-0" aria-hidden>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#1a212c" strokeWidth="13" />
        {segs.map((s, i) => {
          const fr = s.v / sum;
          const el = <circle key={i} cx={size / 2} cy={size / 2} r={r} fill="none" stroke={s.c} strokeWidth="13"
            strokeDasharray={`${Math.max(0, fr * circ - 2)} ${circ}`} strokeDashoffset={-acc * circ}
            transform={`rotate(-90 ${size / 2} ${size / 2})`} />;
          acc += fr; return el;
        })}
        <text x="50%" y="47%" textAnchor="middle" fontSize="17" fontWeight="700" fill={INK}>{top}</text>
        <text x="50%" y="58%" textAnchor="middle" fontSize="8" fill={MUT}>Events / sec</text>
      </svg>
      <div className="min-w-0 flex-1 space-y-1.5">
        {segs.map(s => (
          <div key={s.label} className="flex items-center gap-2 text-[10px]">
            <span className="h-2 w-2 rounded-sm" style={{ background: s.c }} />
            <span className="min-w-0 flex-1 truncate" style={{ color: SOFT }}>{s.label}</span>
            <span className="tabular-nums" style={{ color: INK }}>{s.n}</span>
            <span className="w-12 text-right tabular-nums" style={{ color: MUT }}>({Math.round((s.v / sum) * 1000) / 10}%)</span>
          </div>
        ))}
      </div>
    </div>
  );
}

const PRODUCERS: [string, string, string][] = [
  ['Permits Service', '12.4K/s', PURPLE], ['Prisons Service', '8.7K/s', AMBER],
  ['Finance Service', '15.2K/s', GREEN], ['HR Service', '6.1K/s', BLUE], ['Municipal Service', '9.3K/s', CYAN],
];
const TOPICS: [string, string, string][] = [
  ['permits.events', '128 Partitions', PURPLE], ['prisons.movements', '96 Partitions', AMBER],
  ['finance.transactions', '192 Partitions', GREEN], ['hr.employees', '64 Partitions', BLUE], ['municipal.traffic', '128 Partitions', CYAN],
];
const CONSUMERS: [string, string][] = [
  ['Analytics Engine', '512K/s'], ['Audit Service', '128K/s'], ['Notification Service', '96K/s'],
  ['Reporting Service', '256K/s'], ['Archive Service', '64K/s'],
];
const SINKS: [string, string][] = [
  ['Data Lake', '198K/s'], ['Search Index', '128K/s'], ['Cold Storage', '64K/s'], ['ML Platform', '96K/s'], ['External Systems', '282K/s'],
];

function FlowCol({ head, count, rows, accent }: { head: string; count: string; rows: [string, string, string?][]; accent?: boolean }) {
  return (
    <div className="flex-1">
      <div className="mb-2 flex items-center justify-between border-b pb-1 text-[9px] uppercase tracking-wider" style={{ color: MUT, borderColor: LINE2 }}>
        <span>{head}</span><span style={{ color: SOFT }}>{count}</span>
      </div>
      <div className="space-y-1.5">
        {rows.map(([nm, sub, c]) => (
          <div key={nm} className="flex items-center gap-1.5 rounded-md border px-2 py-1.5" style={{ borderColor: LINE2, background: PANEL2 }}>
            <span className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: c ?? (accent ? CYAN : BLUE) }} />
            <div className="min-w-0 flex-1"><div className="truncate text-[9px]" style={{ color: INK }}>{nm}</div><div className="text-[7.5px]" style={{ color: MUT }}>{sub}</div></div>
            <span className="text-[8px]" style={{ color: MUT }}>›</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function EventBusMonitor() {
  const [now, setNow] = React.useState(() => Date.now());
  React.useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);
  const ts = now / 4000;
  const clock = new Date(now);
  const tm = clock.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  const eps = (1.2 + wave(`eb:ev:${ID}`, ts, 0, 0.16)).toFixed(2);

  const kpis: [string, string, string, boolean, string][] = [
    ['EVENTS / SEC', `${eps}M`, '↑ 18.6%', false, CYAN],
    ['THROUGHPUT', '2.47 GB/s', '↑ 22.3%', false, BLUE],
    ['ACTIVE TOPICS', '342', '↑ 5', false, PURPLE],
    ['CONSUMER LAG', '3.62M', '↓ 11.2%', true, AMBER],
    ['ERROR RATE', '0.012%', '↓ 35.7%', true, RED],
    ['AVAILABILITY', '99.98%', '↑ 0.01%', false, GREEN],
  ];

  const topTopics: [string, number, string][] = [
    ['finance.transactions', 245, GREEN], ['prisons.movements', 198, AMBER], ['permits.events', 156, PURPLE],
    ['municipal.traffic', 132, CYAN], ['audit.logs', 98, BLUE],
  ];
  const errs: [string, string, string, string][] = [
    ['10:41:58', "Consumer group 'reporting-service' lag is high", 'finance.transactions · Partition 12', RED],
    ['10:41:32', 'Failed to publish message', 'permits.events · Partition 45', RED],
    ['10:40:21', 'Schema validation failed', 'hr.employees · Partition 3', AMBER],
    ['10:39:47', 'Consumer connection timeout', 'audit-service-02', BLUE],
  ];
  const brokers = Array.from({ length: 6 }).map((_, i) => {
    const n = i + 1;
    return [`broker-0${n}`, 490 + Math.round(seed(`eb:bl:${ID}:${i}`) * 35), 1010 + Math.round(seed(`eb:br:${ID}:${i}`) * 25),
      `${290 + Math.round(seed(`eb:bi:${ID}:${i}`) * 30)} MB/s`, `${285 + Math.round(seed(`eb:bo:${ID}:${i}`) * 20)} MB/s`] as [string, number, number, string, string];
  });
  const stream: [string, string, string, string, string, string, string][] = [
    ['10:42:18.123', 'finance.transactions', '12', '118,231,987', 'tx_8f3a9c2e', 'TransactionCreated', '512 B'],
    ['10:42:18.122', 'permits.events', '45', '98,712,334', 'app_7d2a1f9b', 'PermitSubmitted', '832 B'],
    ['10:42:18.121', 'prisons.movements', '7', '67,890,112', 'move_1c9b0a3d', 'InmateTransfer', '428 B'],
    ['10:42:18.121', 'hr.employees', '3', '45,672,901', 'emp_3a6dSe7f', 'EmployeeUpdated', '364 B'],
    ['10:42:18.120', 'municipal.traffic', '21', '77,120,442', 'cam_9e2f7b11', 'TrafficUpdate', '256 B'],
  ];
  const domains = [
    { label: 'Finance', v: 25.4, n: '325K', c: GREEN }, { label: 'Permits', v: 19.4, n: '248K', c: PURPLE },
    { label: 'Prisons', v: 15.0, n: '192K', c: AMBER }, { label: 'HR', v: 12.2, n: '156K', c: BLUE },
    { label: 'Municipal', v: 11.1, n: '142K', c: CYAN }, { label: 'Other', v: 17.0, n: '217K', c: '#5d6a77' },
  ];

  return (
    <div className="space-y-3 rounded-[5px] p-3" style={{ background: BG, color: INK }}>
      {/* ── Header ─────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
        <div className="flex items-center gap-3">
          <span className="grid h-9 w-9 place-items-center rounded-lg text-[15px] text-white" style={{ background: `linear-gradient(135deg,${CYAN},${PURPLE})` }} aria-hidden>♛</span>
          <div>
            <div className="text-[12px] font-bold leading-tight" style={{ color: INK }}>National Governance Platform</div>
            <div className="text-[9px]" style={{ color: MUT }}>Event Bus Monitor · Real-time. Reliable. Resilient. <span style={{ color: GREEN }}>●</span></div>
          </div>
        </div>
        <div>
          <div className="text-[19px] font-bold leading-tight" style={{ color: INK }}>Event Bus Monitor</div>
          <div className="text-[10.5px]" style={{ color: MUT }}>Real-time event streaming and messaging infrastructure</div>
        </div>
        <div className="ml-auto flex flex-wrap items-center gap-2.5 text-[10px]">
          <span className="rounded-lg border px-3 py-1.5" style={{ borderColor: LINE2, background: PANEL, color: SOFT }}>Environment <span style={{ color: INK }}>Production</span></span>
          <span className="rounded-lg border px-3 py-1.5" style={{ borderColor: LINE2, background: PANEL, color: SOFT }}>Cluster <span style={{ color: INK }}>NGP-Primary</span></span>
          <span className="rounded-lg border px-3 py-1.5" style={{ borderColor: LINE2, background: PANEL, color: SOFT }}>⌛ Last 15 minutes ▾</span>
          <span className="relative grid h-8 w-8 place-items-center rounded-lg border" style={{ borderColor: LINE2, background: PANEL, color: SOFT }}>⛁<span className="absolute -right-1 -top-1 grid h-3.5 min-w-3.5 place-items-center rounded-full px-1 text-[8px] font-bold text-white" style={{ background: RED }}>12</span></span>
          <span className="flex items-center gap-2 rounded-lg border px-3 py-1.5" style={{ borderColor: LINE2, background: PANEL }}>
            <span className="grid h-6 w-6 place-items-center rounded-full text-[9px] font-bold text-white" style={{ background: CYAN }}>SE</span>
            <span><span className="block font-medium" style={{ color: INK }}>System Engineer</span><span style={{ color: MUT }}>Platform Operations</span></span>
          </span>
        </div>
      </div>

      {/* ── KPI strip ──────────────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        {kpis.map(([l, v, n, dn, c], i) => (
          <div key={l} className="relative overflow-hidden rounded-lg border p-3.5" style={{ borderColor: LINE, background: PANEL }}>
            <div className="flex items-center gap-2">
              <span className="grid h-8 w-8 place-items-center rounded-lg text-[12px]" style={{ background: `color-mix(in srgb,${c} 18%,${PANEL})`, color: c }} aria-hidden>◇</span>
              <span className="text-[9px] uppercase tracking-wider" style={{ color: MUT }}>{l}</span>
            </div>
            <div className="mt-1.5 text-[19px] font-bold tabular-nums" style={{ color: INK }}>{v}</div>
            <div className="text-[8.5px]" style={{ color: dn ? GREEN : GREEN }}>{n}</div>
            <svg viewBox="0 0 100 20" preserveAspectRatio="none" className="mt-1 h-4 w-full" aria-hidden>
              <polyline points={waveSeries(`eb:k${i}:${ID}`, ts, 20, 4, 16).map((p, j) => `${(j / 19) * 100},${18 - p}`).join(' ')}
                fill="none" stroke={c} strokeWidth="1.2" vectorEffect="non-scaling-stroke" opacity="0.7" />
            </svg>
          </div>
        ))}
      </div>

      {/* ── Topology + right rail ──────────────────────────────── */}
      <div className="grid gap-3 xl:grid-cols-[1.6fr_1fr]">
        <Card title="Event Flow Topology" sub="Real-time event flow across the platform" action="View: Flow ▾ · Group by: Domain ▾">
          <div className="flex gap-2">
            <FlowCol head="Producers" count="28" rows={PRODUCERS} />
            <div className="flex w-6 items-center justify-center text-[9px]" style={{ color: CYAN }}>→</div>
            <FlowCol head="Topics" count="342" rows={TOPICS} />
            <div className="flex w-6 items-center justify-center text-[9px]" style={{ color: CYAN }}>→</div>
            <FlowCol head="Consumers" count="128" rows={CONSUMERS.map(([a, b]) => [a, b, BLUE])} />
            <div className="flex w-6 items-center justify-center text-[9px]" style={{ color: CYAN }}>→</div>
            <FlowCol head="Sinks" count="18" rows={SINKS.map(([a, b]) => [a, b, GREEN])} />
          </div>
          <div className="mt-2 flex justify-between text-[8px]" style={{ color: MUT }}>
            <span>+ 23 more</span><span>+ 337 more topics</span><span>+ 123 more</span><span>512K/s · 768K/s</span>
          </div>
          <div className="mt-2 flex flex-wrap gap-x-3 border-t pt-2 text-[8px]" style={{ color: SOFT, borderColor: LINE2 }}>
            {[['High Throughput', GREEN], ['Normal', BLUE], ['Low', MUT], ['Error', RED], ['Idle', AMBER]].map(([l, c]) => (
              <span key={l} className="inline-flex items-center gap-1"><span className="h-1.5 w-1.5 rounded-full" style={{ background: c }} />{l}</span>
            ))}
          </div>
        </Card>
        <div className="space-y-3">
          <Card title="Cluster Throughput" sub="Bytes/sec" action="15m ▾">
            <Area max={100} h={120} series={[
              { c: BLUE, pts: waveSeries(`eb:ci:${ID}`, ts, 24, 55, 92) },
              { c: TEAL, pts: waveSeries(`eb:co:${ID}`, ts, 24, 35, 70) },
              { c: PURPLE, pts: waveSeries(`eb:cr:${ID}`, ts, 24, 12, 34) },
            ]} />
            <div className="mt-1.5 flex gap-4 text-[8.5px]" style={{ color: SOFT }}>
              {[['In', BLUE], ['Out', TEAL], ['Replication', PURPLE]].map(([l, c]) => (
                <span key={l} className="inline-flex items-center gap-1"><span className="h-1.5 w-3 rounded-full" style={{ background: c }} />{l}</span>
              ))}
            </div>
          </Card>
          <Card title="Top Topics by Throughput" action="By In + Out ▾">
            <div className="space-y-2">
              {topTopics.map(([nm, v, c]) => (
                <div key={nm} className="text-[9.5px]">
                  <div className="flex justify-between"><span style={{ color: SOFT }}>{nm}</span><span className="tabular-nums" style={{ color: INK }}>{v} MB/s</span></div>
                  <div className="mt-1 h-1.5 overflow-hidden rounded-full" style={{ background: '#1a212c' }}><span className="block h-full rounded-full" style={{ width: `${(v / 245) * 100}%`, background: c }} /></div>
                </div>
              ))}
              <div className="text-[9px] font-medium" style={{ color: CYAN }}>View all topics →</div>
            </div>
          </Card>
        </div>
      </div>

      {/* ── Broker / skew / lag ────────────────────────────────── */}
      <div className="grid gap-3 xl:grid-cols-3">
        <Card title="Broker Health" sub="6 / 6 Brokers Online" action="View all brokers →">
          <div className="flex border-b pb-1 text-[8px] uppercase tracking-wider" style={{ color: MUT, borderColor: LINE2 }}>
            <span className="flex-1">Broker</span><span className="w-12 text-right">Lead</span><span className="w-14 text-right">Repl.</span>
            <span className="w-16 text-right">In</span><span className="w-16 text-right">Out</span><span className="w-14 text-right">Health</span>
          </div>
          <div className="mt-1 space-y-1.5">
            {brokers.map(([nm, l, r, i, o]) => (
              <div key={nm} className="flex items-center text-[9px]">
                <span className="flex-1 font-mono" style={{ color: INK }}>{nm}</span>
                <span className="w-12 text-right tabular-nums" style={{ color: SOFT }}>{l}</span>
                <span className="w-14 text-right tabular-nums" style={{ color: SOFT }}>{r.toLocaleString()}</span>
                <span className="w-16 text-right tabular-nums" style={{ color: SOFT }}>{i}</span>
                <span className="w-16 text-right tabular-nums" style={{ color: SOFT }}>{o}</span>
                <span className="w-14 text-right text-[8px] font-semibold" style={{ color: GREEN }}>● Healthy</span>
              </div>
            ))}
          </div>
        </Card>
        <Card title="Partition Skew" sub="Data distribution across partitions">
          <div className="flex h-28 items-end gap-px">
            {waveSeries(`eb:ps:${ID}`, ts, 40, 12, 100).map((v, i) => (
              <div key={i} className="flex-1 rounded-t" style={{ height: `${v}%`, background: BLUE, opacity: 0.45 + (v / 200) }} />
            ))}
          </div>
          <div className="mt-2 grid grid-cols-4 gap-2 border-t pt-2 text-center text-[9px]" style={{ borderColor: LINE2 }}>
            {[['Avg Records', '6,687'], ['Max', '28,932'], ['Min', '842'], ['Skew Index', '1.42']].map(([l, v]) => (
              <div key={l}><div style={{ color: MUT }}>{l}</div><div className="font-bold tabular-nums" style={{ color: INK }}>{v}</div></div>
            ))}
          </div>
          <div className="mt-1 text-center text-[8.5px] font-semibold" style={{ color: GREEN }}>● Healthy · 192 Partitions</div>
        </Card>
        <Card title="Consumer Lag" sub="Total lag across consumer groups">
          <Area max={100} h={108} series={[{ c: PURPLE, pts: waveSeries(`eb:cl:${ID}`, ts, 24, 30, 86) }]} />
          <div className="mt-2 grid grid-cols-4 gap-2 border-t pt-2 text-center text-[9px]" style={{ borderColor: LINE2 }}>
            {[['Total Lag', '3.62M'], ['Max Lag', '1.24M'], ['Consumers', '128'], ['Groups', '24']].map(([l, v]) => (
              <div key={l}><div style={{ color: MUT }}>{l}</div><div className="font-bold tabular-nums" style={{ color: INK }}>{v}</div></div>
            ))}
          </div>
        </Card>
      </div>

      {/* ── Stream preview + domain + errors ───────────────────── */}
      <div className="grid gap-3 xl:grid-cols-[1.7fr_1fr]">
        <Card title="Event Stream Preview" sub="Live events flowing through the system" action="⏸ Pause · View Raw">
          <div className="flex border-b pb-1.5 text-[8px] uppercase tracking-wider" style={{ color: MUT, borderColor: LINE2 }}>
            <span className="w-24">Timestamp</span><span className="w-32">Topic</span><span className="w-12">Part.</span>
            <span className="w-24">Offset</span><span className="flex-1">Key · Event</span><span className="w-20 text-right">Source</span><span className="w-12 text-right">Size</span>
          </div>
          <div className="mt-1 space-y-1">
            {stream.map(([t, tp, p, off, k, ev, sz], i) => (
              <div key={i} className="flex items-center text-[8.5px]">
                <span className="w-24 font-mono" style={{ color: MUT }}>{t}</span>
                <span className="w-32 truncate" style={{ color: CYAN }}>{tp}</span>
                <span className="w-12 tabular-nums" style={{ color: SOFT }}>{p}</span>
                <span className="w-24 font-mono tabular-nums" style={{ color: SOFT }}>{off}</span>
                <div className="min-w-0 flex-1 truncate"><span className="font-mono" style={{ color: SOFT }}>{k}</span> <span style={{ color: INK }}>· {ev}</span></div>
                <span className="w-20 truncate text-right" style={{ color: MUT }}>{tp.split('.')[0]}</span>
                <span className="w-12 text-right tabular-nums" style={{ color: MUT }}>{sz}</span>
              </div>
            ))}
          </div>
        </Card>
        <div className="space-y-3">
          <Card title="Event Rate by Domain" sub="Events / sec">
            <Donut top={`${eps}M`} segs={domains} />
          </Card>
          <Card title="Recent Error Events" action="View all">
            <div className="space-y-2">
              {errs.map(([t, msg, ctx, c]) => (
                <div key={t} className="flex items-start gap-2 text-[9px]">
                  <span className="mt-0.5 grid h-4 w-4 shrink-0 place-items-center rounded text-[8px]" style={{ background: `color-mix(in srgb,${c} 18%,${PANEL})`, color: c }} aria-hidden>⚠</span>
                  <span className="w-12 shrink-0 font-mono text-[8px]" style={{ color: MUT }}>{t}</span>
                  <div className="min-w-0 flex-1"><div className="truncate" style={{ color: SOFT }}>{msg}</div><div className="truncate text-[7.5px]" style={{ color: MUT }}>{ctx}</div></div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>

      {/* ── Footer ─────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-t pt-3 text-[9.5px]" style={{ borderColor: LINE2, color: MUT }}>
        <span>Event Bus Monitor — All Systems Operational</span>
        <span>Cluster Health 98.7% · Throughput {eps}M/s · Active Topics 342 · Consumers 128 · Uptime 15d 04h 32m · Updated {tm}</span>
      </div>
    </div>
  );
}
