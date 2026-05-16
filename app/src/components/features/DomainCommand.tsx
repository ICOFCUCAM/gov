'use client';

import * as React from 'react';
import Link from 'next/link';
import { TONE, Panel, Spark, seed, toneFor, waveSeries, TerritoryHeat } from '@/components/features/SituationRoom';

export type DomainKey = 'treasury' | 'security' | 'geopolitical';

interface Metric { l: string; k: string; lo: number; hi: number; unit?: string; good?: 'high' | 'low'; pct?: boolean }
interface Cfg {
  caption: string;
  tele: Metric[];
  primaryTitle: string;
  primary: { l: string; k: string; lo: number; hi: number; t?: string }[];
  feedTitle: string;
  feed: { l: string; sub: string; t: string }[];
  monitorTitle: string;
  monitor: { l: string; lo: number; hi: number; good: 'high' | 'low' }[];
  actions: { l: string; g: string; h: string }[];
  strip: (v: (k: string, lo: number, hi: number) => number) => { l: string; v: string; t: string }[];
}

const MICRO: { l: string; k: string; lo: number; hi: number; good?: 'high' | 'low'; pct?: boolean }[] = [
  { l: 'Readiness', k: 'rdy', lo: 60, hi: 97, pct: true }, { l: 'Tempo', k: 'tmp', lo: 35, hi: 90 },
  { l: 'Throughput', k: 'thp', lo: 40, hi: 95 }, { l: 'Latency', k: 'lat', lo: 8, hi: 40, good: 'low' },
  { l: 'Coverage', k: 'cov', lo: 70, hi: 99, pct: true }, { l: 'Backlog', k: 'bkl', lo: 2, hi: 30, good: 'low' },
  { l: 'Escalations', k: 'esc', lo: 0, hi: 12, good: 'low' }, { l: 'Sync health', k: 'syn', lo: 80, hi: 99, pct: true },
  { l: 'Field units', k: 'fld', lo: 18, hi: 60 }, { l: 'Drift', k: 'drf', lo: 0, hi: 18, good: 'low' },
  { l: 'Capacity', k: 'cap', lo: 55, hi: 95, pct: true }, { l: 'Variance', k: 'var', lo: 2, hi: 22, good: 'low' },
  { l: 'Signal', k: 'sig', lo: 75, hi: 99, pct: true }, { l: 'Pressure', k: 'prs', lo: 20, hi: 78, good: 'low' },
  { l: 'Reserve', k: 'rsv', lo: 40, hi: 92, pct: true }, { l: 'Cadence', k: 'cdn', lo: 30, hi: 85 },
];

const tone3 = (v: number, good: 'high' | 'low') => {
  const sev = good === 'high' ? 100 - v : v;
  return sev >= 66 ? 'alert' : sev >= 40 ? 'warn' : 'ok';
};

const DOMAIN: Record<DomainKey, Cfg> = {
  treasury: {
    caption: 'Sovereign fiscal command — revenue, expenditure, liquidity, debt and reserve posture. Advisory; the Treasury holds execution authority.',
    tele: [
      { l: 'Liquidity', k: 'liq', lo: 14, hi: 32, unit: 'B', good: 'high' },
      { l: 'Revenue run-rate', k: 'rev', lo: 88, hi: 122, unit: 'B', good: 'high' },
      { l: 'Expenditure', k: 'exp', lo: 90, hi: 118, unit: 'B', good: 'low' },
      { l: 'Deficit', k: 'def', lo: 1, hi: 7, unit: 'B', good: 'low' },
      { l: 'Debt-to-GDP', k: 'dgdp', lo: 34, hi: 52, good: 'low', pct: true },
      { l: 'Reserve cover', k: 'res', lo: 18, hi: 40, unit: 'd', good: 'high' },
    ],
    primaryTitle: 'Treasury flow · 24h',
    primary: [
      { l: 'Revenue inflow', k: 'tfin', lo: 80, hi: 130 },
      { l: 'Expenditure outflow', k: 'tfout', lo: 70, hi: 115, t: 'warn' },
      { l: 'Net position', k: 'tfnet', lo: 40, hi: 95 },
      { l: 'Reserve buffer', k: 'tfres', lo: 55, hi: 98 },
    ],
    feedTitle: 'Fiscal alerts',
    feed: [
      { l: 'Quarterly revenue below projection', sub: 'Treasury · −4.2%', t: 'warn' },
      { l: 'Debt service window approaching', sub: 'within 48h', t: 'warn' },
      { l: 'Reserve adequacy nominal', sub: '28-day cover', t: 'ok' },
      { l: 'Contingency draw authorised', sub: 'Emergency Services', t: 'alert' },
      { l: 'FX position stable', sub: 'no intervention', t: 'ok' },
    ],
    monitorTitle: 'Sector fiscal pressure',
    monitor: [
      { l: 'Energy subsidies', lo: 40, hi: 82, good: 'low' },
      { l: 'Healthcare outlay', lo: 45, hi: 80, good: 'low' },
      { l: 'Infrastructure capex', lo: 35, hi: 75, good: 'low' },
      { l: 'Wage bill', lo: 50, hi: 88, good: 'low' },
      { l: 'Debt servicing', lo: 30, hi: 70, good: 'low' },
    ],
    actions: [
      { l: 'Release reserves', g: '§', h: '/gov' },
      { l: 'Fiscal brief', g: '▤', h: '/gov' },
      { l: 'Reallocate budget', g: '⇄', h: '/ops' },
      { l: 'Freeze expenditure', g: '⊘', h: '/gov/coordination' },
      { l: 'Audit ledger', g: '⛓', h: '/audit' },
      { l: 'Situation Room', g: '◎', h: '/gov/situation-room' },
    ],
    strip: v => [
      { l: 'Fiscal posture', v: v('fp', 0, 1) > 0.5 ? 'STABLE' : 'WATCH', t: 'ok' },
      { l: 'Liquidity', v: `$${v('lq', 16, 30).toFixed(1)}B`, t: 'ok' },
      { l: 'Deficit', v: `-$${v('df', 1, 6).toFixed(1)}B`, t: 'warn' },
      { l: 'Debt-to-GDP', v: `${v('dg', 36, 50).toFixed(1)}%`, t: 'warn' },
      { l: 'Treasury', v: 'OPERATIONAL', t: 'ok' },
    ],
  },
  security: {
    caption: 'National security & interior command — threat posture, internal incidents, border integrity and force readiness. Advisory; sworn officers hold authority.',
    tele: [
      { l: 'Threat level', k: 'thr', lo: 20, hi: 72, good: 'low' },
      { l: 'Force readiness', k: 'rdy', lo: 62, hi: 96, good: 'high', pct: true },
      { l: 'Active incidents', k: 'inc', lo: 2, hi: 14, good: 'low' },
      { l: 'Border integrity', k: 'bor', lo: 70, hi: 98, good: 'high', pct: true },
      { l: 'Clearance backlog', k: 'clr', lo: 4, hi: 40, good: 'low' },
      { l: 'Response time', k: 'rsp', lo: 6, hi: 22, unit: 'm', good: 'low' },
    ],
    primaryTitle: 'Security posture · 24h',
    primary: [
      { l: 'Threat index', k: 'sthr', lo: 20, hi: 78, t: 'warn' },
      { l: 'Force readiness', k: 'srdy', lo: 60, hi: 97 },
      { l: 'Incident volume', k: 'sinc', lo: 15, hi: 70, t: 'warn' },
      { l: 'Border activity', k: 'sbor', lo: 25, hi: 72 },
    ],
    feedTitle: 'Security incidents',
    feed: [
      { l: 'Elevated activity — Eastern border', sub: 'Interior · monitoring', t: 'warn' },
      { l: 'Critical infrastructure watch', sub: 'energy grid', t: 'alert' },
      { l: 'Public order nominal', sub: 'no flashpoints', t: 'ok' },
      { l: 'Cyber advisory raised', sub: 'national registry', t: 'warn' },
      { l: 'Force posture standard', sub: 'reserves available', t: 'ok' },
    ],
    monitorTitle: 'Regional security pressure',
    monitor: [
      { l: 'Capital District', lo: 20, hi: 60, good: 'low' },
      { l: 'Eastern Region', lo: 40, hi: 85, good: 'low' },
      { l: 'Coastal Region', lo: 25, hi: 65, good: 'low' },
      { l: 'Northern Province', lo: 20, hi: 58, good: 'low' },
      { l: 'Border zones', lo: 45, hi: 88, good: 'low' },
    ],
    actions: [
      { l: 'Raise posture', g: '◈', h: '/gov/coordination' },
      { l: 'Deploy forces', g: '⛑', h: '/gov/coordination' },
      { l: 'Security brief', g: '▤', h: '/gov' },
      { l: 'Border lockdown', g: '⛓', h: '/gov/coordination' },
      { l: 'Intelligence report', g: '◔', h: '/gov/coordination' },
      { l: 'Situation Room', g: '◎', h: '/gov/situation-room' },
    ],
    strip: v => [
      { l: 'Threat posture', v: v('tp', 20, 70) >= 55 ? 'ELEVATED' : 'GUARDED', t: v('tp', 20, 70) >= 55 ? 'warn' : 'ok' },
      { l: 'Force readiness', v: `${Math.round(v('fr', 70, 96))}%`, t: 'ok' },
      { l: 'Active incidents', v: `${Math.round(v('ai', 2, 12))}`, t: 'warn' },
      { l: 'Border integrity', v: `${Math.round(v('bi', 78, 98))}%`, t: 'ok' },
      { l: 'Interior', v: 'OPERATIONAL', t: 'ok' },
    ],
  },
  geopolitical: {
    caption: 'External pressure monitor — border tension, maritime activity, diplomatic engagement and global market exposure. Advisory; the executive holds decision authority.',
    tele: [
      { l: 'External risk', k: 'ext', lo: 25, hi: 75, good: 'low' },
      { l: 'Border tension', k: 'bt', lo: 20, hi: 78, good: 'low' },
      { l: 'Maritime activity', k: 'ma', lo: 15, hi: 65, good: 'low' },
      { l: 'Diplomatic channels', k: 'dc', lo: 60, hi: 95, good: 'high', pct: true },
      { l: 'Market exposure', k: 'mx', lo: 30, hi: 78, good: 'low' },
      { l: 'Alliance posture', k: 'al', lo: 64, hi: 96, good: 'high', pct: true },
    ],
    primaryTitle: 'Geopolitical pressure · 24h',
    primary: [
      { l: 'External risk index', k: 'gext', lo: 25, hi: 80, t: 'warn' },
      { l: 'Diplomatic engagement', k: 'gdip', lo: 55, hi: 95 },
      { l: 'Trade corridor stability', k: 'gtr', lo: 45, hi: 90 },
      { l: 'Market volatility', k: 'gmkt', lo: 20, hi: 75, t: 'warn' },
    ],
    feedTitle: 'External signals',
    feed: [
      { l: 'Border tension — Northern frontier', sub: 'medium · monitoring', t: 'warn' },
      { l: 'Maritime patrol contact', sub: 'Coastal · routine', t: 'ok' },
      { l: 'Diplomatic engagement active', sub: 'bilateral track', t: 'ok' },
      { l: 'Global market impact moderate', sub: 'commodity exposure', t: 'warn' },
      { l: 'Cross-sovereign coordination', sub: 'regional bloc', t: 'ok' },
    ],
    monitorTitle: 'Frontier & exposure',
    monitor: [
      { l: 'Northern frontier', lo: 35, hi: 82, good: 'low' },
      { l: 'Eastern frontier', lo: 25, hi: 68, good: 'low' },
      { l: 'Maritime EEZ', lo: 20, hi: 60, good: 'low' },
      { l: 'Air corridors', lo: 18, hi: 55, good: 'low' },
      { l: 'Trade exposure', lo: 30, hi: 75, good: 'low' },
    ],
    actions: [
      { l: 'Diplomatic cable', g: '✉', h: '/gov' },
      { l: 'Raise frontier alert', g: '⚠', h: '/gov/coordination' },
      { l: 'Brief executive', g: '▤', h: '/gov' },
      { l: 'Convene security', g: '◈', h: '/gov/coordination' },
      { l: 'Market watch', g: '§', h: '/gov' },
      { l: 'Situation Room', g: '◎', h: '/gov/situation-room' },
    ],
    strip: v => [
      { l: 'External posture', v: v('ep', 25, 75) >= 55 ? 'STRAINED' : 'STABLE', t: v('ep', 25, 75) >= 55 ? 'warn' : 'ok' },
      { l: 'Border tension', v: v('bt2', 20, 78) >= 55 ? 'Elevated' : 'Low', t: v('bt2', 20, 78) >= 55 ? 'warn' : 'ok' },
      { l: 'Diplomatic channels', v: `${Math.round(v('dc2', 60, 95))}%`, t: 'ok' },
      { l: 'Market exposure', v: `${Math.round(v('mx2', 30, 78))}`, t: 'warn' },
      { l: 'Monitor', v: 'ACTIVE', t: 'ok' },
    ],
  },
};

const TITLES: Record<DomainKey, string> = {
  treasury: 'Treasury Command',
  security: 'Security & Interior',
  geopolitical: 'Geopolitical Monitor',
};

export function DomainCommand({ domain }: { domain: DomainKey }) {
  const cfg = DOMAIN[domain];
  const [now, setNow] = React.useState(() => Date.now());
  const [openFeed, setOpenFeed] = React.useState<number | null>(0);
  React.useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);
  const ts = now / 4000;
  const w = (k: string, lo: number, hi: number) => waveSeries(`${domain}:${k}`, ts, 1, lo, hi).at(-1)!;
  const crit = cfg.feed.filter(f => f.t === 'alert').length;

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div className="flex items-center gap-2">
          <h1 className="text-base font-semibold uppercase tracking-[0.16em] text-ink">{TITLES[domain]}</h1>
          <span className="flex items-center gap-1 rounded-[3px] px-1.5 py-0.5 text-[9px] font-bold tracking-widest" style={{ backgroundColor: `color-mix(in srgb, ${TONE.ok} 18%, transparent)`, color: TONE.ok }}>
            <span className="h-1.5 w-1.5 animate-pulse rounded-full" style={{ backgroundColor: TONE.ok }} />LIVE
          </span>
          <span className="font-mono text-[10px] tabular-nums text-ink-muted">{new Date(now).toLocaleTimeString()} · updated {Math.round((now % 60000) / 1000)}s ago</span>
        </div>
        {crit >= 1 ? (
          <span className="flex items-center gap-1.5 rounded-[3px] border px-2 py-0.5 text-[9px] font-bold uppercase tracking-[0.16em]"
            style={{ borderColor: TONE.alert, color: TONE.alert, backgroundColor: `color-mix(in srgb, ${TONE.alert} 14%, transparent)` }}>
            <span className="h-1.5 w-1.5 animate-pulse rounded-full" style={{ backgroundColor: TONE.alert }} />
            {crit >= 2 ? 'Domain surge' : 'Domain alert'} · {crit} critical
          </span>
        ) : null}
      </div>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-6">
        {cfg.tele.map(m => {
          const raw = w(m.k, m.lo, m.hi);
          const t = m.good ? tone3(m.pct ? raw : ((raw - m.lo) / (m.hi - m.lo)) * 100, m.good) : 'ok';
          const disp = m.unit === 'B' ? `$${raw.toFixed(1)}B` : m.unit === 'd' ? `${Math.round(raw)}d` : m.unit === 'm' ? `${Math.round(raw)}m` : m.pct ? `${raw.toFixed(1)}%` : `${Math.round(raw)}`;
          return (
            <div key={m.l} className="rounded-[3px] border border-line bg-surface px-3 py-2" style={{ boxShadow: 'inset 0 1px 0 rgba(55,199,212,0.06)' }}>
              <div className="truncate text-[8px] font-semibold uppercase tracking-[0.16em] text-ink-muted">{m.l}</div>
              <div className="font-mono text-lg leading-tight tabular-nums" style={{ color: TONE[t] }}>{disp}</div>
              <div className="-mb-1 h-5 overflow-hidden opacity-80"><Spark pts={waveSeries(`${domain}:sp:${m.k}`, ts, 16, 35, 92)} tone={t} /></div>
            </div>
          );
        })}
      </div>

      <div className="grid gap-2 xl:grid-cols-12">
        <Panel title="Operational theatre" meta="domain pressure · live" className="xl:col-span-7" bodyClass="!p-2">
          <TerritoryHeat epoch={Math.floor(ts) % 60} height={300} />
          <div className="mt-1.5 grid grid-cols-2 gap-1 sm:grid-cols-4">
            {[
              ['Sector readiness', 'sect', 60, 96, '%'], ['Corridor flow', 'corr', 40, 92, ''],
              ['Escalation rate', 'escr', 0, 10, '/h'], ['Command tempo', 'ctmp', 35, 90, '/m'],
            ].map(([l, k, lo, hi, u]) => {
              const L = l as string, K = k as string, LO = lo as number, HI = hi as number;
              const v = Math.round(w(`th:${K}`, LO, HI));
              const low = K === 'escr';
              const pct = ((v - LO) / (HI - LO)) * 100;
              const sc = low ? 100 - pct : pct;
              const t = sc >= 60 ? 'ok' : sc >= 35 ? 'warn' : 'alert';
              return (
                <div key={K} className="rounded-[3px] border border-line-soft bg-surface-2/40 px-2 py-1">
                  <div className="truncate text-[7.5px] font-semibold uppercase tracking-[0.12em] text-ink-muted">{L}</div>
                  <div className="font-mono text-[13px] leading-tight tabular-nums" style={{ color: TONE[t] }}>{v}{u as string}</div>
                  <div className="-mb-0.5 h-3 overflow-hidden opacity-70"><Spark pts={waveSeries(`${domain}:ths:${K}`, ts, 12, 35, 92)} tone={t} /></div>
                </div>
              );
            })}
          </div>
        </Panel>
        <Panel title={cfg.primaryTitle} meta="advisory" className="xl:col-span-3" bodyClass="!p-2">
          <div className="space-y-2">
            {cfg.primary.map(p => (
              <div key={p.l}>
                <div className="flex items-baseline justify-between text-[10px]">
                  <span className="uppercase tracking-wide text-ink-muted">{p.l}</span>
                  <span className="font-mono tabular-nums" style={{ color: TONE[p.t ?? 'ok'] }}>{Math.round(w(p.k, p.lo, p.hi))}</span>
                </div>
                <Spark pts={waveSeries(`${domain}:pr:${p.k}`, ts, 18, p.lo, p.hi)} tone={p.t ?? 'ok'} />
              </div>
            ))}
          </div>
        </Panel>
        <Panel title={cfg.feedTitle} meta={`${cfg.feed.length} active`} className="xl:col-span-2" bodyClass="!p-0">
          {cfg.feed.map((f, i) => {
            const open = openFeed === i;
            const age = 4 + Math.round(seed(`${domain}:fa:${i}`) * 52);
            const owner = ['Domain lead', 'Duty officer', 'Cabinet liaison', 'Watch commander'][Math.floor(seed(`${domain}:fo:${i}`) * 4)];
            const chron = [
              { t: `${age}m`, l: 'Signal detected', c: TONE.neutral },
              { t: `${Math.max(1, Math.round(age * 0.6))}m`, l: 'Assessed & classified', c: TONE[f.t] },
              { t: `${Math.max(1, Math.round(age * 0.3))}m`, l: `${owner} engaged`, c: TONE.ok },
            ];
            return (
              <div key={i} className="border-b border-line-soft last:border-0" style={{ borderLeft: `3px solid ${TONE[f.t]}` }}>
                <button onClick={() => setOpenFeed(open ? null : i)}
                  className="focus-ring block w-full px-3 py-2 text-left transition-colors hover:bg-surface-2/50">
                  <div className="flex items-center justify-between gap-2">
                    <span className="truncate text-[11px] font-medium text-ink">{f.l}</span>
                    <span className="shrink-0 font-mono text-[9px] tabular-nums text-ink-muted">{age}m<span className="ml-1 inline-block transition-transform" style={{ transform: open ? 'rotate(90deg)' : 'none' }}>›</span></span>
                  </div>
                  <div className="truncate text-[9px] text-ink-muted">{f.sub}</div>
                </button>
                {open ? (
                  <div className="px-3 pb-2 pt-0.5">
                    <div className="rounded-[3px] border border-line-soft bg-surface-2/40 p-2">
                      {chron.map((c, k) => (
                        <div key={k} className="flex items-center gap-2 py-0.5 text-[10px]">
                          <span className="w-7 shrink-0 font-mono tabular-nums text-ink-muted">{c.t}</span>
                          <span className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ backgroundColor: c.c }} />
                          <span className="truncate text-ink-soft">{c.l}</span>
                        </div>
                      ))}
                      <div className="mt-1 flex items-center justify-between border-t border-line-soft pt-1 text-[9px]">
                        <span className="text-ink-muted">Owner</span><span className="text-ink-soft">{owner}</span>
                      </div>
                    </div>
                  </div>
                ) : null}
              </div>
            );
          })}
        </Panel>
      </div>

      <div className="grid gap-2 lg:grid-cols-2 xl:grid-cols-4">
        <Panel title={cfg.monitorTitle} meta="composite" bodyClass="!p-1.5">
          <div className="space-y-1">
            {cfg.monitor.map((m, i) => {
              const v = Math.round(w(`mon:${i}`, m.lo, m.hi));
              const t = tone3(v, m.good);
              return (
                <div key={m.l} className="rounded-[3px] border border-line-soft bg-surface-2/40 px-2 py-1">
                  <div className="flex items-center justify-between text-[10px]">
                    <span className="truncate text-ink-soft">{m.l}</span>
                    <span className="font-mono tabular-nums" style={{ color: TONE[t] }}>{v}</span>
                  </div>
                  <div className="mt-0.5 h-1 w-full overflow-hidden rounded-full bg-surface-2">
                    <div className="h-full rounded-full transition-all duration-1000 ease-sov" style={{ width: `${v}%`, backgroundColor: TONE[t] }} />
                  </div>
                </div>
              );
            })}
          </div>
        </Panel>

        <Panel title="Trend telemetry" meta="12-period" bodyClass="!p-1.5">
          <div className="grid grid-cols-2 gap-1">
            {cfg.tele.slice(0, 4).map(m => {
              const raw = w(m.k, m.lo, m.hi);
              const t = m.good ? tone3(m.pct ? raw : ((raw - m.lo) / (m.hi - m.lo)) * 100, m.good) : 'ok';
              return (
                <div key={m.l} className="rounded-[3px] border border-line-soft bg-surface-2/40 px-2 py-1.5">
                  <div className="truncate text-[8px] font-semibold uppercase tracking-[0.12em] text-ink-muted">{m.l}</div>
                  <div className="font-mono text-[13px] leading-tight tabular-nums" style={{ color: TONE[t] }}>{m.pct ? `${raw.toFixed(1)}%` : Math.round(raw)}</div>
                  <div className="opacity-70"><Spark pts={waveSeries(`${domain}:tt:${m.k}`, ts, 12, 35, 92)} tone={t} /></div>
                </div>
              );
            })}
          </div>
        </Panel>

        <Panel title={cfg.feedTitle} meta="stream" bodyClass="!p-1.5">
          <div className="space-y-1">
            {cfg.feed.map((f, i) => (
              <div key={i} className="flex items-center justify-between gap-2 rounded-[3px] border border-line-soft bg-surface-2/40 px-2 py-1.5">
                <span className="min-w-0 flex-1 truncate text-[11px] text-ink-soft">{f.l}</span>
                <span className="shrink-0 rounded-[3px] px-1.5 py-0.5 text-[9px] font-bold uppercase" style={{ backgroundColor: `color-mix(in srgb, ${TONE[f.t]} 18%, transparent)`, color: TONE[f.t] }}>{f.t === 'ok' ? 'Nominal' : f.t === 'warn' ? 'Watch' : 'Critical'}</span>
              </div>
            ))}
          </div>
        </Panel>

        <Panel title="Command actions" meta="domain authority" bodyClass="!p-1.5">
          <div className="grid grid-cols-2 gap-1">
            {cfg.actions.map((q, i) => (
              <Link key={q.l} href={q.h} className="focus-ring group flex items-center gap-1.5 rounded-[3px] border border-line px-2 py-1.5 text-[10px] font-medium text-ink-soft no-underline transition-all hover:bg-surface-2/60">
                <span className="grid h-5 w-5 shrink-0 place-items-center rounded-[3px] bg-surface-2 text-[11px]" style={{ color: i === 3 ? TONE.warn : TONE.ok }}>{q.g}</span>
                <span className="min-w-0 truncate">{q.l}</span>
              </Link>
            ))}
          </div>
        </Panel>
      </div>

      {/* Lower micro-grid ecosystem — Bloomberg-density operational band */}
      <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-4 xl:grid-cols-8">
        {MICRO.map(m => {
          const raw = w(`mg:${m.k}`, m.lo, m.hi);
          const t = tone3(((raw - m.lo) / (m.hi - m.lo)) * 100, m.good ?? 'high');
          const d = Math.round((w(`mgd:${m.k}`, 0, 1) - 0.45) * 12);
          return (
            <div key={m.k} className="rounded-[3px] border border-line bg-surface px-2 py-1" style={{ boxShadow: 'inset 0 1px 0 rgba(55,199,212,0.05)' }}>
              <div className="truncate text-[7.5px] font-semibold uppercase tracking-[0.12em] text-ink-muted">{m.l}</div>
              <div className="flex items-baseline gap-1">
                <span className="font-mono text-[13px] leading-none tabular-nums" style={{ color: TONE[t] }}>{m.pct ? `${Math.round(raw)}%` : Math.round(raw)}</span>
                <span className="ml-auto text-[8px]" style={{ color: d >= 0 ? TONE.ok : TONE.alert }}>{d >= 0 ? '▲' : '▼'}{Math.abs(d)}</span>
              </div>
              <div className="-mb-0.5 h-3.5 overflow-hidden opacity-70"><Spark pts={waveSeries(`${domain}:mgs:${m.k}`, ts, 12, 35, 92)} tone={t} /></div>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-2 gap-px overflow-hidden rounded-[3px] border border-line bg-line text-[10px] md:grid-cols-5">
        {cfg.strip(w).map(s => (
          <div key={s.l} className="flex items-center justify-between gap-2 bg-surface px-3 py-1.5">
            <span className="uppercase tracking-[0.14em] text-ink-muted">{s.l}</span>
            <span className="flex items-center gap-1.5 font-mono font-semibold tabular-nums" style={{ color: TONE[s.t] }}>
              <span className="h-1.5 w-1.5 animate-pulse rounded-full" style={{ backgroundColor: TONE[s.t] }} />{s.v}
            </span>
          </div>
        ))}
      </div>

      <p className="text-[10px] text-ink-muted">{cfg.caption}</p>
    </div>
  );
}
