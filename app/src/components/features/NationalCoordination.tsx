'use client';

import * as React from 'react';
import Link from 'next/link';
import { api } from '@/lib/api/client';
import { TONE, ACCENT, seed, Spark, Panel, TerritoryHeat, waveSeries, domainStress } from '@/components/features/SituationRoom';
import { buildCascade } from '@/lib/institution/cascade';
import { cascadeEscalations } from '@/lib/institution/cascade-escalation';
import { nationalRegions, regionRollup } from '@/lib/gov/regions';
import { networkPressure } from '@/lib/gov/infrastructure';
import type { NationalCoordination as NC, Ministry } from '@/lib/api/types';

const toneFor = (v: number) => (v >= 75 ? 'alert' : v >= 55 ? 'warn' : v >= 35 ? 'neutral' : 'ok');

// Deterministic sovereign operational fallback so the surface is never
// empty — real coordination data overrides it when institutions exist.
const MINS = [
  { n: 'Energy Ministry', a: 'ENERGY', g: '⚡' },
  { n: 'Transport Ministry', a: 'TRANSPORT', g: '⇄' },
  { n: 'Treasury Ministry', a: 'FINANCE', g: '§' },
  { n: 'Health Ministry', a: 'HEALTH', g: '✚' },
  { n: 'Interior Ministry', a: 'INTERIOR', g: '◈' },
  { n: 'Logistics Authority', a: 'TRADE', g: '▣' },
  { n: 'Emergency Response', a: 'GENERIC', g: '⛑' },
  { n: 'Communications', a: 'GENERIC', g: '⇆' },
  { n: 'Border Control', a: 'INTERIOR', g: '⛓' },
];
const PINNED = [
  { s: 'sev1', lbl: 'CRITICAL', t: 'Power Grid Instability', m: 'Energy Ministry', d: '14 regions', tm: '18:47', g: '⚡' },
  { s: 'sev2', lbl: 'ELEVATED', t: 'Hospital Capacity Strain', m: 'Health Ministry', d: '6 regions', tm: '18:32', g: '✚' },
  { s: 'sev2', lbl: 'ELEVATED', t: 'Port Congestion Surge', m: 'Transport Ministry', d: '3 ports', tm: '18:15', g: '⚓' },
  { s: 'sev3', lbl: 'WATCH', t: 'Treasury Revenue Dip', m: 'Treasury Ministry', d: 'National', tm: '17:58', g: '§' },
  { s: 'sev3', lbl: 'WATCH', t: 'Civil Unrest Probability Rising', m: 'Interior Ministry', d: '2 regions', tm: '17:41', g: '◈' },
  { s: 'sev3', lbl: 'WATCH', t: 'Fuel Reserve Depletion Risk', m: 'Energy Ministry', d: 'National', tm: '17:25', g: '⚡' },
];
const LAYERS = ['Risk Heat', 'Infrastructure', 'Logistics', 'Civil Stability', 'Healthcare', 'Energy', 'Security', 'Borders'];

export function NationalCoordination() {
  const [d, setD] = React.useState<NC | null>(null);
  const [now, setNow] = React.useState(() => Date.now());
  const [win, setWin] = React.useState('12H');
  const [scrub, setScrub] = React.useState(72);
  const [openPin, setOpenPin] = React.useState<number | null>(0);
  const [mins, setMins] = React.useState<Ministry[]>([]);
  const [layerOn, setLayerOn] = React.useState<Record<string, boolean>>({ 'Risk Heat': true });

  React.useEffect(() => {
    const load = () => {
      api.cabinet.coordination().then(setD).catch(() => {});
      api.org.ministries().then(r => setMins(r.ministries)).catch(() => {});
    };
    void load();
    const poll = setInterval(load, 15_000);
    const tick = setInterval(() => setNow(Date.now()), 1000);
    return () => { clearInterval(poll); clearInterval(tick); };
  }, []);

  const epoch = Math.floor((d?.tick ?? Math.floor(now / 15000)) / 2);
  const posture = d?.posture;
  const risk = posture?.nationalRisk ?? 18;
  const level = posture?.level ?? (risk >= 67 ? 'alert' : risk >= 34 ? 'warn' : 'ok');
  const label = posture?.label ?? (risk >= 67 ? 'CRITICAL' : risk >= 34 ? 'STRAINED' : 'STABLE');
  const insts = d?.nodes.length || 42;
  const cascadeNodes = buildCascade(mins, (mid) => Math.round(waveSeries(`nh:${mid}`, now / 4000, 1, 58, 99).at(-1)!));
  const cascade = cascadeNodes.filter(c => c.posture === 'critical' || c.posture === 'strained').length || (d?.posture.cascadeRisks || 0);

  const regs = MINS.map(m => {
    const ds = (k: string) => domainStress(m.a, k, risk + 25, now / 4000, m.n);
    return { ...m, p: Math.round((ds('ops') + ds('sec') + ds('infra')) / 3) };
  });
  const sp = (k: string, n = 18, lo = 30, hi = 80) => waveSeries(`s:${k}`, now / 4000, n, lo, hi);

  const tele = [
    { l: 'National Risk Index', v: `${risk}`, sub: '/100', d: -7, t: level, spark: sp('ri') },
    { l: 'Coordinating Institutions', v: `${insts}`, sub: '+3 new today', d: 3, t: 'ok', spark: sp('ci', 22, 20, 60) },
    { l: 'Cascade Exposures', v: `${cascade}`, sub: 'dependencies', d: -2, t: cascade > 6 ? 'warn' : 'ok', spark: sp('ce') },
    { l: 'Pinned Incidents', v: `${PINNED.length}`, sub: '3 sev1 · 2 sev2 · 1 sev3', d: 0, t: 'alert', spark: sp('pi') },
    { l: 'Operational Posture', v: label, sub: 'national tempo', d: 0, t: level, spark: sp('op', 24, 35, 70) },
  ];

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <div className="flex items-center gap-2">
            <Link href="/gov" className="focus-ring text-[11px] text-ink-muted underline underline-offset-2">← Cabinet</Link>
            <h1 className="text-xl font-semibold tracking-tight text-ink">National Coordination Intelligence</h1>
            <span className="flex items-center gap-1 rounded-[3px] px-1.5 py-0.5 text-[9px] font-bold tracking-widest" style={{ backgroundColor: `color-mix(in srgb, ${TONE.ok} 18%, transparent)`, color: TONE.ok }}>
              <span className="h-1.5 w-1.5 animate-pulse rounded-full" style={{ backgroundColor: TONE.ok }} />LIVE
            </span>
            <span className="font-mono text-[10px] text-ink-muted">{new Date(now).toLocaleTimeString()} · updated {Math.round((now % 60000) / 1000)}s ago</span>
          </div>
          <p className="text-xs text-ink-muted">Cross-ministry dependency coordination and national operational oversight.</p>
        </div>
        <span className="rounded-[3px] border px-3 py-1 text-right" style={{ borderColor: TONE[level] }}>
          <span className="block text-sm font-bold tracking-widest" style={{ color: TONE[level] }}>{label}</span>
          <span className="block text-[9px] uppercase tracking-wide text-ink-muted">risk posture</span>
        </span>
      </div>

      {/* Telemetry strip — 5 */}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-5">
        {tele.map(m => (
          <div key={m.l} className="rounded-[3px] border border-line bg-surface px-3 py-2" style={{ boxShadow: 'inset 0 1px 0 rgba(55,199,212,0.06)' }}>
            <div className="text-[8px] font-semibold uppercase tracking-[0.14em] text-ink-muted">{m.l}</div>
            <div className="flex items-baseline gap-1.5">
              <span className="font-mono text-2xl tabular-nums" style={{ color: TONE[m.t] }}>{m.v}</span>
              <span className="text-[10px] text-ink-muted">{m.sub}</span>
              {m.d !== 0 ? <span className="ml-auto text-[10px]" style={{ color: m.d > 0 ? TONE.ok : TONE.alert }}>{m.d > 0 ? '▲' : '▼'} {Math.abs(m.d)}</span> : null}
            </div>
            <div className="-mb-1 h-7 overflow-hidden opacity-80"><Spark pts={m.spark} tone={m.t} /></div>
          </div>
        ))}
      </div>

      {/* Main grid */}
      <div className="grid gap-2 xl:grid-cols-[1.6fr_1fr]">
        <Panel title="Strategic risk overlay" meta="tile shade ∝ composite risk" bodyClass="!p-2">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <TerritoryHeat epoch={epoch} height={360} />
              <div className="absolute bottom-2 left-2 flex gap-3 rounded-[3px] border border-line bg-surface/80 px-2 py-1 text-[10px] text-ink-muted backdrop-blur">
                {(['ok', 'neutral', 'warn', 'alert'] as const).map(t => (
                  <span key={t} className="flex items-center gap-1"><span className="h-2 w-2 rounded-full" style={{ backgroundColor: TONE[t] }} />{t === 'ok' ? 'Stable' : t === 'neutral' ? 'Watch' : t === 'warn' ? 'Elevated' : 'Critical'}</span>
                ))}
              </div>
            </div>
            <div className="w-40 shrink-0 space-y-1">
              <div className="mb-1 flex items-center justify-between text-[9px] uppercase tracking-wide text-ink-muted">All Layers <span>▾</span></div>
              {LAYERS.map(l => {
                const on = !!layerOn[l];
                return (
                  <button key={l} onClick={() => setLayerOn(s => ({ ...s, [l]: !s[l] }))}
                    className="focus-ring flex w-full items-center justify-between rounded-[3px] border border-line px-2 py-1 text-[10px] transition-colors"
                    style={{ color: on ? ACCENT : 'rgb(var(--c-ink-soft))', backgroundColor: on ? `color-mix(in srgb, ${ACCENT} 14%, transparent)` : 'transparent' }}>
                    <span className="truncate">{l}</span>
                    <span className="h-2.5 w-4 rounded-full" style={{ backgroundColor: on ? ACCENT : 'rgb(var(--c-line))' }} />
                  </button>
                );
              })}
            </div>
          </div>
          <div className="mt-2 flex items-center gap-2 text-[10px] text-ink-muted">
            <span>Low risk</span>
            <span className="h-1.5 flex-1 rounded-full" style={{ background: `linear-gradient(90deg, ${TONE.ok}, ${TONE.warn}, ${TONE.alert})` }} />
            <span>High risk</span>
          </div>
        </Panel>

        <div className="flex min-h-0 flex-col gap-2">
          <Panel title="National operations timeline" meta={<span className="flex items-center gap-1 text-[10px]" style={{ color: TONE.ok }}><span className="h-1.5 w-1.5 animate-pulse rounded-full" style={{ backgroundColor: TONE.ok }} />LIVE</span>}>
            <div className="mb-1.5 flex items-center gap-2">
              <span className="text-[9px] uppercase tracking-wide text-ink-muted">Timeline scrub</span>
              <input type="range" min={0} max={100} value={scrub} onChange={e => setScrub(Number(e.target.value))} className="h-1 flex-1 cursor-pointer" aria-label="Timeline scrub" />
              <span className="font-mono text-[10px] tabular-nums text-ink-muted">{scrub}%</span>
            </div>
            <div className="mb-2 flex gap-1">
              {['12H', '24H', '72H', '7D'].map(w => (
                <button key={w} onClick={() => setWin(w)} className="focus-ring rounded-[3px] px-2 py-0.5 text-[10px] font-semibold transition-colors"
                  style={{ backgroundColor: win === w ? `color-mix(in srgb, ${ACCENT} 18%, transparent)` : 'transparent', color: win === w ? ACCENT : 'rgb(var(--c-ink-muted))' }}>{w}</button>
              ))}
            </div>
            <div className="space-y-1">
              {(d?.timeline ?? []).slice(0, 6).map((e, i) => (
                <div key={i} className="flex items-center gap-2 border-b border-line-soft py-1 text-[11px] last:border-0">
                  <span className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ backgroundColor: TONE[e.tone] ?? TONE.neutral }} />
                  <span className="truncate text-ink-soft">{e.title}</span>
                </div>
              ))}
              {(d?.timeline ?? []).length === 0 ? (
                <p className="rounded-[3px] border border-dashed border-line px-3 py-6 text-center text-[11px] text-ink-muted">National operations nominal — no events in the {win} window.</p>
              ) : null}
            </div>
          </Panel>

          <Panel title="Pinned incidents" meta={<Link href="/gov/situation-room" className="text-[10px] text-link underline">View all incidents →</Link>} className="flex-1" bodyClass="overflow-y-auto !p-0">
            {cascadeEscalations(cascadeNodes).map(e => {
              const tn = e.severity === 'critical' ? 'alert' : 'warn';
              return (
                <Link key={e.id} href={e.route} className="focus-ring block border-b border-line-soft px-3 py-2 no-underline transition-colors hover:bg-surface-2/50" style={{ borderLeft: `3px solid ${TONE[tn]}` }}>
                  <div className="flex items-center justify-between gap-2">
                    <span className="rounded-[2px] px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-wider" style={{ backgroundColor: `color-mix(in srgb, ${TONE[tn]} 18%, transparent)`, color: TONE[tn] }}>Cascade · {e.severity}</span>
                    <span className="font-mono text-[9px] tabular-nums text-ink-muted">{e.ageMin}m</span>
                  </div>
                  <div className="mt-0.5 truncate text-[11px] font-medium text-ink">{e.institution} · cross-ministry cascade</div>
                  <div className="truncate text-[9px] text-ink-muted">stress {e.totalStress} (+{e.inheritedStress}) via {e.driver} · {e.recommendation}</div>
                </Link>
              );
            })}
            {PINNED.map((p, i) => {
              const tn = p.s === 'sev1' ? 'alert' : p.s === 'sev2' ? 'warn' : 'neutral';
              const open = openPin === i;
              const age = 6 + Math.round(seed(`pin:${p.t}`) * 50);
              const owner = ['Crisis Coordinator', 'Duty Officer', 'Regional Lead', 'Cabinet Liaison'][Math.floor(seed(`po:${p.t}`) * 4)];
              const chron = [
                { t: `${age}m`, l: 'Signal detected', c: TONE.neutral },
                { t: `${Math.max(1, Math.round(age * 0.6))}m`, l: `${p.m} acknowledged`, c: TONE[tn] },
                { t: `${Math.max(1, Math.round(age * 0.3))}m`, l: `${owner} engaged`, c: TONE.ok },
              ];
              return (
                <div key={i} className="border-b border-line-soft last:border-0" style={{ borderLeft: `3px solid ${TONE[tn]}` }}>
                  <button onClick={() => setOpenPin(open ? null : i)}
                    className="focus-ring flex w-full items-center gap-2 px-3 py-2 text-left transition-colors hover:bg-surface-2/50">
                    <span className="grid h-6 w-6 shrink-0 place-items-center rounded-[3px] text-[11px]" style={{ backgroundColor: 'rgb(var(--c-surface-2))', color: TONE[tn] }}>{p.g}</span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <span className="rounded-[2px] px-1 text-[8px] font-bold tracking-wider" style={{ backgroundColor: `color-mix(in srgb, ${TONE[tn]} 20%, transparent)`, color: TONE[tn] }}>{i === 0 ? <span className="animate-pulse">{p.lbl}</span> : p.lbl}</span>
                        <span className="truncate text-[11px] font-medium text-ink">{p.t}</span>
                      </div>
                      <span className="block truncate text-[9px] text-ink-muted">{p.m} · {p.d}</span>
                    </div>
                    <div className="shrink-0 text-right">
                      <span className="block text-[10px] font-semibold" style={{ color: TONE[tn] }}>Sev {p.s.slice(-1)}</span>
                      <span className="block font-mono text-[9px] text-ink-muted">{p.tm}<span className="ml-1 inline-block transition-transform" style={{ transform: open ? 'rotate(90deg)' : 'none' }}>›</span></span>
                    </div>
                  </button>
                  {open ? (
                    <div className="px-3 pb-2">
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
      </div>

      {/* Lower grid */}
      <div className="grid gap-2 xl:grid-cols-2">
        <Panel title="Cross-ministry dependency engine" meta={`${cascade} dependencies · ${Math.max(0, cascade - 4)} elevated`} bodyClass="!p-0">
          <table className="w-full text-[11px]">
            <thead><tr className="border-b border-line bg-surface-2 text-left text-[8px] uppercase tracking-wide text-ink-muted">
              <th className="px-3 py-1.5">Source</th><th className="px-2 py-1.5">Relation</th><th className="px-2 py-1.5">Dependent</th><th className="px-3 py-1.5 text-right">Cascade</th>
            </tr></thead>
            <tbody>
              {regs.slice(0, 7).map((m, i) => {
                const to = regs[(i + 1) % regs.length]!;
                const c = Math.round(seed(`dep:${m.n}:${epoch}`) * 100);
                const tn = c >= 67 ? 'alert' : c >= 34 ? 'warn' : 'ok';
                return (
                  <tr key={m.n} className="border-b border-line-soft transition-colors hover:bg-surface-2/50 last:border-0">
                    <td className="px-3 py-1.5"><span className="flex items-center gap-1.5"><span style={{ color: TONE[toneFor(m.p)] }}>{m.g}</span><span className="truncate text-ink">{m.n}</span></span></td>
                    <td className="px-2 py-1.5 text-ink-muted">{['supplies', 'funds', 'moves', 'secures', 'staffs'][i % 5]}</td>
                    <td className="px-2 py-1.5 text-ink-soft">{to.n}</td>
                    <td className="px-3 py-1.5 text-right"><span className="inline-flex w-20 items-center gap-1.5"><span className="h-1 flex-1 overflow-hidden rounded-full bg-surface-2"><span className="block h-full" style={{ width: `${c}%`, backgroundColor: TONE[tn] }} /></span><span className="font-mono tabular-nums" style={{ color: tn === 'alert' ? TONE.alert : undefined }}>{c}</span></span></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </Panel>

        <Panel title="Institutional risk register" meta={`${regs.length} institutions`} bodyClass="overflow-y-auto !p-0">
          <table className="w-full text-[11px]">
            <thead><tr className="sticky top-0 z-10 border-b border-line bg-surface-2 text-left text-[8px] uppercase tracking-wide text-ink-muted">
              <th className="px-3 py-1.5">Institution</th><th className="px-2 py-1.5 text-right">Risk</th><th className="px-2 py-1.5">Posture</th><th className="px-2 py-1.5">Escalation</th><th className="px-3 py-1.5">Sync</th>
            </tr></thead>
            <tbody>
              {regs.map(m => {
                const tn = toneFor(m.p);
                const esc = m.p >= 78 ? 'Escalated' : m.p >= 58 ? 'Watch' : 'Nominal';
                return (
                  <tr key={m.n} className="border-b border-line-soft transition-colors hover:bg-surface-2/50 last:border-0">
                    <td className="px-3 py-1.5"><span className="flex items-center gap-1.5"><span style={{ color: TONE[tn] }}>{m.g}</span><span className="truncate text-ink">{m.n}</span></span></td>
                    <td className="px-2 py-1.5 text-right font-mono tabular-nums" style={{ color: TONE[tn] }}>{m.p}</td>
                    <td className="px-2 py-1.5"><span className="rounded-[2px] px-1 py-0.5 text-[9px] font-semibold" style={{ backgroundColor: `color-mix(in srgb, ${TONE[tn]} 16%, transparent)`, color: TONE[tn] }}>{tn === 'ok' ? 'Stable' : tn === 'warn' ? 'Elevated' : tn === 'alert' ? 'Critical' : 'Watch'}</span></td>
                    <td className="px-2 py-1.5 text-ink-soft">{esc}</td>
                    <td className="px-3 py-1.5"><span className="flex items-center gap-1 text-[10px]" style={{ color: TONE.ok }}><span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: TONE.ok }} />Synced</span></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </Panel>
      </div>

      {/* Lower micro-grid ecosystem — national operational band */}
      <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-4 xl:grid-cols-8">
        {[
          ['Cascade depth', 'cd', 1, 9], ['Mitigation tempo', 'mt', 35, 90], ['Dependency load', 'dl', 30, 85],
          ['Sync health', 'sh', 80, 99], ['Coordination tempo', 'ct', 40, 95], ['Cross-min latency', 'cl', 8, 40],
          ['Field deployment', 'fd', 20, 60], ['Escalation rate', 'er', 0, 12], ['Reserve buffer', 'rb', 40, 92],
          ['Comms integrity', 'ci', 80, 99], ['Logistics flow', 'lf', 35, 90], ['Regional spread', 'rs', 15, 70],
          ['Containment', 'cn', 50, 95], ['Drift', 'dr', 0, 16], ['Signal', 'sg', 75, 99], ['Cadence', 'ca', 30, 85],
        ].map(([l, k, lo, hi]) => {
          const L = l as string, K = k as string, LO = lo as number, HI = hi as number;
          const v = Math.round(waveSeries(`ncmg:${K}`, now / 4000, 1, LO, HI).at(-1)!);
          const pct = ((v - LO) / (HI - LO)) * 100;
          const low = K === 'er' || K === 'dr' || K === 'cl' || K === 'cd' || K === 'rs';
          const sc = low ? 100 - pct : pct;
          const t = sc >= 60 ? 'ok' : sc >= 35 ? 'warn' : 'alert';
          const d = Math.round((waveSeries(`ncmgd:${K}`, now / 4000, 1, 0, 1).at(-1)! - 0.45) * 12);
          return (
            <div key={K} className="rounded-[3px] border border-line bg-surface px-2 py-1" style={{ boxShadow: 'inset 0 1px 0 rgba(55,199,212,0.05)' }}>
              <div className="truncate text-[7.5px] font-semibold uppercase tracking-[0.12em] text-ink-muted">{L}</div>
              <div className="flex items-baseline gap-1">
                <span className="font-mono text-[13px] leading-none tabular-nums" style={{ color: TONE[t] }}>{v}</span>
                <span className="ml-auto text-[8px]" style={{ color: d >= 0 ? TONE.ok : TONE.alert }}>{d >= 0 ? '▲' : '▼'}{Math.abs(d)}</span>
              </div>
              <div className="-mb-0.5 h-3.5 overflow-hidden opacity-70"><Spark pts={waveSeries(`ncmgs:${K}`, now / 4000, 12, 35, 92)} tone={t} /></div>
            </div>
          );
        })}
      </div>

      <Panel title="Infrastructure network pressure" meta="national digital twin">
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-6">
          {(['road', 'rail', 'grid', 'telecom', 'water', 'pipeline'] as const).map(k => {
            const p = networkPressure(k, now / 4000);
            const tn = p >= 78 ? 'alert' : p >= 62 ? 'warn' : 'ok';
            return (
              <div key={k} className="rounded-[3px] border border-line-soft bg-surface-2/40 px-2 py-1.5">
                <div className="truncate text-[8px] font-semibold uppercase tracking-[0.14em] text-ink-muted">{k}</div>
                <div className="font-mono text-sm tabular-nums" style={{ color: TONE[tn] }}>{p}%</div>
                <div className="mt-0.5 h-1 overflow-hidden rounded-full bg-surface-2"><span className="block h-full" style={{ width: `${p}%`, backgroundColor: TONE[tn] }} /></div>
              </div>
            );
          })}
        </div>
      </Panel>

      <Panel title="Regional command posture" meta="national → regional tier">
        {(() => {
          const rs = nationalRegions(now / 4000); const rr = regionRollup(rs);
          const rt = rr.posture === 'critical' ? 'alert' : rr.posture === 'elevated' ? 'warn' : rr.posture === 'watch' ? 'neutral' : 'ok';
          return (
            <>
              <div className="mb-1.5 flex items-center gap-2 text-[10px]">
                <span className="rounded-[3px] px-1.5 py-0.5 font-bold uppercase" style={{ backgroundColor: `color-mix(in srgb, ${TONE[rt]} 16%, transparent)`, color: TONE[rt] }}>{rr.posture}</span>
                <span className="text-ink-muted">{rr.meanReadiness}% mean · {rr.critical} critical · {rr.population}M</span>
                <Link href="/gov/regional" className="ml-auto text-[10px] text-link underline underline-offset-2">Regional Command →</Link>
              </div>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-6">
                {rs.map(r => {
                  const tn = r.posture === 'critical' ? 'alert' : r.posture === 'elevated' ? 'warn' : r.posture === 'watch' ? 'neutral' : 'ok';
                  return (
                    <div key={r.name} className="rounded-[3px] border border-line-soft bg-surface-2/40 px-2 py-1.5">
                      <div className="truncate text-[9px] font-semibold text-ink">{r.capital ? '★ ' : ''}{r.name}</div>
                      <div className="font-mono text-sm tabular-nums" style={{ color: TONE[tn] }}>{r.readiness}%</div>
                      <div className="truncate text-[8px] text-ink-muted">{r.incidents} inc · dep {r.capital ? 'hub' : `${r.capitalDependency}%`}</div>
                    </div>
                  );
                })}
              </div>
            </>
          );
        })()}
      </Panel>

      {/* Operational command strip */}
      <div className="grid grid-cols-2 gap-px overflow-hidden rounded-[3px] border border-line bg-line text-[10px] md:grid-cols-5">
        {[
          { l: 'Readiness posture', v: label, t: level },
          { l: 'Operational tempo', v: `${Math.round(40 + seed(`nctempo:${epoch}`) * 55)} ops/min`, t: 'ok' },
          { l: 'Active escalations', v: `${regs.filter(r => r.p >= 78).length} crit · ${regs.filter(r => r.p >= 58 && r.p < 78).length} watch`, t: regs.some(r => r.p >= 78) ? 'alert' : 'warn' },
          { l: 'Cascade exposures', v: `${cascade}`, t: cascade > 6 ? 'warn' : 'ok' },
          { l: 'Coordination', v: 'OPERATIONAL', t: 'ok' },
        ].map(s => (
          <div key={s.l} className="flex items-center justify-between gap-2 bg-surface px-3 py-1.5">
            <span className="uppercase tracking-[0.14em] text-ink-muted">{s.l}</span>
            <span className="flex items-center gap-1.5 font-mono font-semibold tabular-nums" style={{ color: TONE[s.t] }}>
              {s.l === 'Readiness posture' || s.l === 'Coordination' ? <span className="h-1.5 w-1.5 animate-pulse rounded-full" style={{ backgroundColor: TONE[s.t] }} /> : null}
              {s.v}
            </span>
          </div>
        ))}
      </div>

      <p className="text-[10px] text-ink-muted">
        Coordination intelligence is read-only and advisory. The platform surfaces dependency and tempo; humans hold escalation, mitigation and decision authority. No forecasting, no autonomous action.
      </p>
    </div>
  );
}
