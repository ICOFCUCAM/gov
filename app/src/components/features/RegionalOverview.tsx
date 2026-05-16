'use client';

import * as React from 'react';
import Link from 'next/link';
import { TONE, Panel, Spark, seed, toneFor, waveSeries, domainStress, TerritoryHeat } from '@/components/features/SituationRoom';

const REGIONS = [
  { n: 'Northern Province', arch: 'AGRICULTURE', cap: false },
  { n: 'Highland Region', arch: 'ENERGY', cap: false },
  { n: 'Eastern Region', arch: 'INTERIOR', cap: false },
  { n: 'Capital District', arch: 'FINANCE', cap: true },
  { n: 'Western Region', arch: 'TRANSPORT', cap: false },
  { n: 'Coastal Region', arch: 'TRADE', cap: false },
];
const DOMS = [
  ['ops', 'Ops'], ['infra', 'Infra'], ['civil', 'Civil'], ['sec', 'Security'], ['logi', 'Logistics'], ['emrg', 'Emergency'],
] as const;

export function RegionalOverview() {
  const [now, setNow] = React.useState(() => Date.now());
  React.useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);
  const ts = now / 4000;

  const rows = REGIONS.map(r => {
    const ds = (k: string) => domainStress(r.arch, k, 55, ts, r.n);
    const composite = Math.round((ds('ops') + ds('sec') + ds('infra') + ds('civil')) / 4);
    return { ...r, composite, ds };
  });
  const natRisk = Math.round(rows.reduce((a, r) => a + r.composite, 0) / rows.length);
  const crit = rows.filter(r => r.composite >= 78).length;
  const elev = rows.filter(r => r.composite >= 58 && r.composite < 78).length;

  const tele = [
    { l: 'National posture', v: natRisk >= 70 ? 'STRAINED' : natRisk >= 45 ? 'WATCH' : 'STABLE', sub: `${natRisk}/100`, t: toneFor(natRisk), k: 'np' },
    { l: 'Regions critical', v: String(crit), sub: `${elev} elevated`, t: crit ? 'alert' : elev ? 'warn' : 'ok', k: 'rc' },
    { l: 'Mean readiness', v: `${Math.max(1, 100 - natRisk)}%`, sub: 'provincial', t: 'ok', k: 'mr' },
    { l: 'Coordination tempo', v: `${Math.round(waveSeries('ro:ct', ts, 1, 40, 90).at(-1)!)}/min`, sub: 'inter-region', t: 'ok', k: 'ct' },
    { l: 'Escalation cadence', v: `${Math.round(waveSeries('ro:ec', ts, 1, 2, 12).at(-1)!)}/h`, sub: '24h', t: 'warn', k: 'ec' },
    { l: 'Field deployments', v: String(28 + Math.round(seed(`fd:${Math.floor(ts)}`) * 22)), sub: 'active units', t: 'ok', k: 'fd' },
  ];

  return (
    <div className="space-y-2">
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-6">
        {tele.map(m => (
          <div key={m.l} className="rounded-[3px] border border-line bg-surface px-3 py-2" style={{ boxShadow: 'inset 0 1px 0 rgba(55,199,212,0.06)' }}>
            <div className="truncate text-[8px] font-semibold uppercase tracking-[0.16em] text-ink-muted">{m.l}</div>
            <div className="font-mono text-lg leading-tight tabular-nums" style={{ color: TONE[m.t] }}>{m.v}</div>
            <div className="-mb-1 h-5 overflow-hidden opacity-80"><Spark pts={waveSeries(`ro:${m.k}`, ts, 16, 35, 92)} tone={m.t} /></div>
            <div className="truncate text-[8px] text-ink-muted">{m.sub}</div>
          </div>
        ))}
      </div>

      <div className="grid gap-2 xl:grid-cols-12">
        <Panel title="Regional theatre" meta="provincial posture · live" className="xl:col-span-7" bodyClass="!p-2">
          <TerritoryHeat epoch={Math.floor(ts) % 60} height={360} />
        </Panel>

        <Panel title="Provincial posture matrix" meta={`${rows.length} regions`} className="xl:col-span-5" bodyClass="!p-0">
          <table className="w-full text-[11px]">
            <thead>
              <tr className="sticky top-0 z-10 border-b border-line bg-surface-2 text-left text-[8.5px] uppercase tracking-wider text-ink-muted">
                <th className="px-2 py-1.5">Region</th>
                {DOMS.map(([, l]) => <th key={l} className="px-1 py-1.5 text-center">{l}</th>)}
              </tr>
            </thead>
            <tbody>
              {rows.map(r => (
                <tr key={r.n} className="border-b border-line-soft last:border-0">
                  <td className="px-2 py-1.5"><span className="truncate text-ink">{r.cap ? '★ ' : ''}{r.n}</span></td>
                  {DOMS.map(([k]) => {
                    const v = r.ds(k);
                    const st = v >= 78 ? 'alert' : v >= 58 ? 'warn' : v >= 40 ? 'neutral' : 'ok';
                    const lbl = st === 'alert' ? 'Critical' : st === 'warn' ? 'Elevated' : st === 'neutral' ? 'Watch' : 'Stable';
                    return (
                      <td key={k} className="px-1 py-1.5 text-center">
                        <span className="inline-block rounded px-1 py-0.5 text-[9px] font-semibold" style={{ backgroundColor: `color-mix(in srgb, ${TONE[st]} 16%, transparent)`, color: TONE[st] }}>{lbl}</span>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </Panel>
      </div>

      <div className="grid gap-2 lg:grid-cols-2 xl:grid-cols-4">
        <Panel title="Regional readiness ladder" meta="composite" bodyClass="!p-1.5">
          <div className="space-y-1">
            {rows.map(r => {
              const tn = toneFor(r.composite);
              return (
                <div key={r.n} className="rounded-[3px] border border-line-soft bg-surface-2/40 px-2 py-1">
                  <div className="flex items-center justify-between text-[10px]">
                    <span className="truncate text-ink-soft">{r.cap ? '★ ' : ''}{r.n}</span>
                    <span className="font-mono tabular-nums" style={{ color: TONE[tn] }}>{Math.max(1, 100 - r.composite)}%</span>
                  </div>
                  <div className="mt-0.5 h-1 w-full overflow-hidden rounded-full bg-surface-2">
                    <div className="h-full rounded-full transition-all duration-1000 ease-sov" style={{ width: `${Math.max(1, 100 - r.composite)}%`, backgroundColor: TONE[tn] }} />
                  </div>
                </div>
              );
            })}
          </div>
        </Panel>

        <Panel title="Inter-region dependencies" meta="coordination" bodyClass="!p-1.5">
          <div className="grid grid-cols-1 gap-1">
            {([
              ['Highland → Capital', 'Energy transfer', 'ok'],
              ['Coastal → Eastern', 'Logistics corridor', 'warn'],
              ['Northern → Capital', 'Food supply', 'ok'],
              ['Western → Capital', 'Transport mesh', 'warn'],
              ['Eastern → Coastal', 'Security relay', 'alert'],
            ] as [string, string, string][]).map(([l, s, t]) => (
              <div key={l} className="flex items-center justify-between gap-2 rounded-[3px] border border-line-soft bg-surface-2/40 px-2 py-1.5">
                <span className="min-w-0"><span className="block truncate text-[11px] text-ink">{l}</span><span className="block truncate text-[9px] text-ink-muted">{s}</span></span>
                <span className="shrink-0 rounded-[3px] px-1.5 py-0.5 text-[9px] font-bold uppercase" style={{ backgroundColor: `color-mix(in srgb, ${TONE[t]} 18%, transparent)`, color: TONE[t] }}>{t === 'ok' ? 'Nominal' : t === 'warn' ? 'Strained' : 'Critical'}</span>
              </div>
            ))}
          </div>
        </Panel>

        <Panel title="Escalation cadence" meta="by region · 24h" bodyClass="!p-1.5">
          <div className="space-y-1">
            {rows.map(r => {
              const n = Math.round(seed(`esc:${r.n}:${Math.floor(ts / 6)}`) * (r.composite >= 70 ? 9 : 4));
              const tn = n >= 6 ? 'alert' : n >= 3 ? 'warn' : 'ok';
              return (
                <div key={r.n} className="flex items-center justify-between gap-2 rounded-[3px] border border-line-soft bg-surface-2/40 px-2 py-1.5 text-[10px]">
                  <span className="truncate text-ink-soft">{r.n}</span>
                  <span className="font-mono tabular-nums" style={{ color: TONE[tn] }}>{n} esc</span>
                </div>
              );
            })}
          </div>
        </Panel>

        <Panel title="Regional actions" meta="coordination authority" bodyClass="!p-1.5">
          <div className="grid grid-cols-2 gap-1">
            {[
              { l: 'Deploy field unit', g: '⛑', h: '/gov/coordination' },
              { l: 'Regional brief', g: '▤', h: '/gov' },
              { l: 'Resource shift', g: '⇄', h: '/ops' },
              { l: 'Escalate region', g: '⚠', h: '/gov/coordination' },
              { l: 'Sync provinces', g: '◉', h: '/gov/coordination' },
              { l: 'Situation Room', g: '◎', h: '/gov/situation-room' },
            ].map((q, i) => (
              <Link key={q.l} href={q.h} className="focus-ring group flex items-center gap-1.5 rounded-[3px] border border-line px-2 py-1.5 text-[10px] font-medium text-ink-soft no-underline transition-all hover:bg-surface-2/60">
                <span className="grid h-5 w-5 shrink-0 place-items-center rounded-[3px] bg-surface-2 text-[11px]" style={{ color: i === 3 ? TONE.warn : TONE.ok }}>{q.g}</span>
                <span className="min-w-0 truncate">{q.l}</span>
              </Link>
            ))}
          </div>
        </Panel>
      </div>

      <div className="grid grid-cols-2 gap-px overflow-hidden rounded-[3px] border border-line bg-line text-[10px] md:grid-cols-5">
        {[
          { l: 'Regional posture', v: natRisk >= 70 ? 'STRAINED' : natRisk >= 45 ? 'WATCH' : 'STABLE', t: toneFor(natRisk) },
          { l: 'Coordination tempo', v: `${Math.round(waveSeries('ro:ct2', ts, 1, 40, 90).at(-1)!)} ops/min`, t: 'ok' },
          { l: 'Critical regions', v: `${crit} · ${elev} elevated`, t: crit ? 'alert' : 'warn' },
          { l: 'Field deployments', v: `${28 + Math.round(seed(`fd2:${Math.floor(ts)}`) * 22)} active`, t: 'ok' },
          { l: 'Provinces synced', v: 'ALL', t: 'ok' },
        ].map(s => (
          <div key={s.l} className="flex items-center justify-between gap-2 bg-surface px-3 py-1.5">
            <span className="uppercase tracking-[0.14em] text-ink-muted">{s.l}</span>
            <span className="flex items-center gap-1.5 font-mono font-semibold tabular-nums" style={{ color: TONE[s.t] }}>
              {s.l === 'Regional posture' || s.l === 'Provinces synced' ? <span className="h-1.5 w-1.5 animate-pulse rounded-full" style={{ backgroundColor: TONE[s.t] }} /> : null}
              {s.v}
            </span>
          </div>
        ))}
      </div>

      <p className="text-[10px] text-ink-muted">
        Provincial posture is advisory and read-only — composite from operational, security, infrastructure and civil signals. Regional coordinators hold deployment and escalation authority.
      </p>
    </div>
  );
}
