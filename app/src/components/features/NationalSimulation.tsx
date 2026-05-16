'use client';

import * as React from 'react';
import Link from 'next/link';
import { TONE, Panel, Spark, waveSeries } from '@/components/features/SituationRoom';
import { identityFor } from '@/lib/archetype-profiles';
import { SCENARIOS, simulate, type ScenarioKey } from '@/lib/gov/simulation';
import type { ArchetypeKey } from '@/lib/api/types';

export function NationalSimulation() {
  const [now, setNow] = React.useState(() => Date.now());
  const [key, setKey] = React.useState<ScenarioKey>('baseline');
  React.useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);
  const ts = now / 4000;
  const s = simulate(key, ts);
  const active = key !== 'baseline';

  const tele = [
    { l: 'Scenario', v: s.scenario.label.split(' (')[0], t: active ? 'warn' : 'ok' },
    { l: 'Readiness delta', v: `${s.nationalReadinessDelta}`, t: s.nationalReadinessDelta <= -25 ? 'alert' : s.nationalReadinessDelta < 0 ? 'warn' : 'ok' },
    { l: 'Economic impact', v: `${s.economicImpactPct}%`, t: s.economicImpactPct <= -3 ? 'alert' : s.economicImpactPct < 0 ? 'warn' : 'ok' },
    { l: 'Civil unrest', v: `${s.civilUnrestProb}%`, t: s.civilUnrestProb >= 60 ? 'alert' : s.civilUnrestProb >= 35 ? 'warn' : 'ok' },
    { l: 'Constitutional stress', v: `${s.constitutionalStress}%`, t: s.constitutionalStress >= 60 ? 'alert' : s.constitutionalStress >= 35 ? 'warn' : 'ok' },
    { l: 'Cascade institutions', v: `${s.cascadeNodes}`, t: s.cascadeNodes >= 4 ? 'alert' : s.cascadeNodes ? 'warn' : 'ok' },
  ];

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div className="flex items-center gap-2">
          <h1 className="text-base font-semibold uppercase tracking-[0.16em] text-ink">National Simulation</h1>
          <span className="flex items-center gap-1 rounded-[3px] px-1.5 py-0.5 text-[9px] font-bold tracking-widest" style={{ backgroundColor: `color-mix(in srgb, ${TONE.ok} 18%, transparent)`, color: TONE.ok }}>
            <span className="h-1.5 w-1.5 animate-pulse rounded-full" style={{ backgroundColor: TONE.ok }} />LIVE
          </span>
          <span className="rounded-[3px] border px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-[0.16em]" style={{ borderColor: 'rgb(var(--c-line))', color: 'rgb(var(--c-ink-muted))' }}>Advisory · What-if</span>
          <span className="font-mono text-[10px] tabular-nums text-ink-muted">{new Date(now).toLocaleTimeString()}</span>
        </div>
        {active ? (
          <span className="flex items-center gap-1.5 rounded-[3px] border px-2 py-0.5 text-[9px] font-bold uppercase tracking-[0.16em]"
            style={{ borderColor: TONE.alert, color: TONE.alert, backgroundColor: `color-mix(in srgb, ${TONE.alert} 14%, transparent)` }}>
            <span className="h-1.5 w-1.5 animate-pulse rounded-full" style={{ backgroundColor: TONE.alert }} />
            Scenario engaged · {s.scenario.vector}
          </span>
        ) : null}
      </div>

      <p className="text-[11px] text-ink-muted">
        Sovereign what-if engine. Applies a scenario shock and projects propagated impact across ministries, regions, cascade and constitutional stress. Read-only — humans decide and act.
      </p>

      <Panel title="Scenario vector" meta="select to simulate" bodyClass="!p-1.5">
        <div className="grid grid-cols-2 gap-1 sm:grid-cols-3 xl:grid-cols-5">
          {SCENARIOS.map(sc => {
            const on = sc.key === key;
            return (
              <button key={sc.key} onClick={() => setKey(sc.key)}
                className="focus-ring rounded-[3px] border px-2 py-1.5 text-left text-[10px] transition-all"
                style={{ borderColor: on ? TONE.link : 'rgb(var(--c-line))', backgroundColor: on ? `color-mix(in srgb, ${TONE.link} 12%, transparent)` : undefined, color: on ? TONE.link : 'rgb(var(--c-ink-soft))' }}>
                <span className="block truncate font-semibold">{sc.label}</span>
                <span className="block truncate text-[8.5px] text-ink-muted">{sc.vector} · sev {sc.severity}</span>
              </button>
            );
          })}
        </div>
      </Panel>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-6">
        {tele.map(m => (
          <div key={m.l} className="rounded-[3px] border border-line bg-surface px-3 py-2" style={{ boxShadow: 'inset 0 1px 0 rgba(55,199,212,0.06)' }}>
            <div className="truncate text-[8px] font-semibold uppercase tracking-[0.16em] text-ink-muted">{m.l}</div>
            <div className="truncate font-mono text-[13px] leading-tight tabular-nums" style={{ color: TONE[m.t] }}>{m.v}</div>
            <div className="-mb-1 h-4 overflow-hidden opacity-70"><Spark pts={waveSeries(`sim:${key}:${m.l}`, ts, 14, 35, 92)} tone={m.t} /></div>
          </div>
        ))}
      </div>

      <div className="grid gap-2 xl:grid-cols-3">
        <Panel title="Ministry impact" meta="propagated stress" bodyClass="!p-1.5">
          <div className="space-y-1">
            {s.ministryImpact.map(m => {
              const tn = m.stress >= 70 ? 'alert' : m.stress >= 45 ? 'warn' : 'ok';
              const di = identityFor(m.archetype as ArchetypeKey);
              return (
                <div key={m.archetype} className="flex items-center gap-2">
                  <span className="grid h-4 w-4 shrink-0 place-items-center rounded-[3px] text-[8px] text-white" style={{ backgroundColor: di.accent }}>{di.glyph}</span>
                  <span className="w-20 shrink-0 truncate text-[10px] text-ink-soft">{m.archetype}</span>
                  <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-surface-2"><span className="block h-full" style={{ width: `${m.stress}%`, backgroundColor: TONE[tn] }} /></div>
                  <span className="w-7 shrink-0 text-right font-mono text-[10px] tabular-nums" style={{ color: TONE[tn] }}>{m.stress}</span>
                </div>
              );
            })}
          </div>
        </Panel>

        <Panel title="Regional impact" meta="readiness delta" bodyClass="!p-1.5">
          <div className="space-y-1">
            {s.regionImpact.map(r => {
              const tn = r.readinessDelta <= -25 ? 'alert' : r.readinessDelta < 0 ? 'warn' : 'ok';
              return (
                <div key={r.region} className="flex items-center justify-between gap-2 rounded-[3px] border border-line-soft bg-surface-2/40 px-2 py-1.5 text-[11px]">
                  <span className="truncate text-ink-soft">{r.region}</span>
                  <span className="font-mono tabular-nums" style={{ color: TONE[tn] }}>{r.readinessDelta}</span>
                </div>
              );
            })}
          </div>
        </Panel>

        <Panel title="Propagation timeline" meta="projected chronology" bodyClass="!p-0">
          {s.timeline.map((e, i) => {
            const tn = e.sev === 'alert' ? TONE.alert : e.sev === 'warn' ? TONE.warn : TONE.neutral;
            return (
              <div key={i} className="flex items-center gap-2 border-b border-line-soft px-3 py-2 last:border-0" style={{ borderLeft: `3px solid ${tn}` }}>
                <span className="w-10 shrink-0 font-mono text-[10px] tabular-nums text-ink-muted">{e.t}</span>
                <span className="min-w-0 flex-1 truncate text-[11px] text-ink-soft">{e.event}</span>
              </div>
            );
          })}
        </Panel>
      </div>

      <Panel title="Recommended response chain" meta="advisory · cabinet decides" bodyClass="!p-1.5">
        <ol className="space-y-1">
          {s.recommendation.map((r, i) => (
            <li key={i} className="flex items-center gap-2 rounded-[3px] border border-line-soft bg-surface-2/40 px-2 py-1.5 text-[11px]">
              <span className="grid h-4 w-4 shrink-0 place-items-center rounded-[3px] bg-surface-2 text-[9px] font-bold text-ink-soft">{i + 1}</span>
              <span className="text-ink-soft">{r}</span>
            </li>
          ))}
        </ol>
        <div className="mt-1.5 flex gap-2 text-[10px]">
          <Link href="/gov/coordination" className="focus-ring text-link underline underline-offset-2">Coordinate →</Link>
          <Link href="/gov/situation-room" className="focus-ring text-link underline underline-offset-2">War Room →</Link>
          <Link href="/gov/fabric" className="focus-ring text-link underline underline-offset-2">Cascade fabric →</Link>
        </div>
      </Panel>

      <p className="text-[10px] text-ink-muted">
        Deterministic advisory projection — no autonomous action. The simulation surfaces propagated consequence; the constituted branches decide and execute.
      </p>
    </div>
  );
}
