'use client';

import * as React from 'react';
import Link from 'next/link';
import { TONE, Panel, Spark, waveSeries } from '@/components/features/SituationRoom';
import { identityFor } from '@/lib/archetype-profiles';
import { SCENARIOS, simulate, scenarioSweep, mitigationPlaybook, prioritisedThreats, type ScenarioKey } from '@/lib/gov/simulation';
import type { ArchetypeKey } from '@/lib/api/types';

export function NationalSimulation({ initial = 'baseline' }: { initial?: ScenarioKey }) {
  const [now, setNow] = React.useState(() => Date.now());
  const [key, setKey] = React.useState<ScenarioKey>(initial);
  React.useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);
  const ts = now / 4000;
  const s = simulate(key, ts);
  const baseM = new Map(simulate('baseline', ts).ministryImpact.map(m => [m.archetype, m.stress]));
  const active = key !== 'baseline';
  const sweep = scenarioSweep(ts);
  const pb = mitigationPlaybook(key, ts);
  const prio = prioritisedThreats(ts);

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

      <Panel title="National threat board" meta="all vectors ranked · composite risk" bodyClass="!p-1.5">
        <div className="space-y-1">
          {sweep.map(r => {
            const tn = r.band === 'severe' ? 'alert' : r.band === 'high' ? 'alert' : r.band === 'elevated' ? 'warn' : 'ok';
            const on = r.key === key;
            return (
              <button key={r.key} onClick={() => setKey(r.key)}
                className="focus-ring flex w-full items-center gap-2 rounded-[3px] border px-2 py-1.5 text-left text-[11px] transition-colors"
                style={{ borderColor: on ? TONE.link : 'rgb(var(--c-line-soft))', backgroundColor: on ? `color-mix(in srgb, ${TONE.link} 10%, transparent)` : 'color-mix(in srgb, rgb(var(--c-surface-2)) 40%, transparent)' }}>
                <span className="w-5 shrink-0 text-center font-mono text-[10px] tabular-nums text-ink-muted">{r.composite}</span>
                <span className="h-1.5 w-14 shrink-0 overflow-hidden rounded-full bg-surface-2"><span className="block h-full" style={{ width: `${r.composite}%`, backgroundColor: TONE[tn] }} /></span>
                <span className="min-w-0 flex-1 truncate text-ink">{r.label}</span>
                <span className="hidden shrink-0 truncate text-[9px] text-ink-muted sm:block sm:w-40">{r.vector}</span>
                <span className="w-10 shrink-0 text-right font-mono text-[10px] tabular-nums" style={{ color: TONE.alert }}>{r.readinessDelta}</span>
                <span className="w-10 shrink-0 text-right font-mono text-[10px] tabular-nums" style={{ color: r.civilUnrestProb >= 60 ? TONE.alert : TONE.warn }}>{r.civilUnrestProb}%</span>
                <span className="w-10 shrink-0 text-right text-[8px] font-bold uppercase tracking-wider" style={{ color: TONE[tn] }}>{r.band}</span>
              </button>
            );
          })}
        </div>
        <div className="mt-1 flex gap-3 px-2 text-[8px] uppercase tracking-wider text-ink-muted">
          <span className="ml-auto w-10 text-right">Δready</span><span className="w-10 text-right">unrest</span><span className="w-10 text-right">band</span>
        </div>
      </Panel>

      <Panel title="Cabinet decision board" meta="ranked by residual risk after best response — what to plan against" bodyClass="!p-1.5">
        <div className="space-y-1">
          {prio.map((r, i) => {
            const tn = r.priority >= 55 ? 'alert' : r.priority >= 35 ? 'warn' : 'ok';
            const on = r.key === key;
            return (
              <button key={r.key} onClick={() => setKey(r.key)}
                className="focus-ring flex w-full items-center gap-2 rounded-[3px] border px-2 py-1.5 text-left text-[11px] transition-colors"
                style={{ borderColor: on ? TONE.link : 'rgb(var(--c-line-soft))', backgroundColor: on ? `color-mix(in srgb, ${TONE.link} 10%, transparent)` : 'color-mix(in srgb, rgb(var(--c-surface-2)) 40%, transparent)' }}>
                <span className="w-4 shrink-0 text-center font-mono text-[9px] tabular-nums text-ink-muted">{i + 1}</span>
                <span className="min-w-0 flex-1 truncate text-ink">{r.label}</span>
                <span className="hidden shrink-0 text-[8.5px] text-ink-muted sm:block sm:w-20">gross {r.composite}</span>
                <span className="w-16 shrink-0 text-right font-mono text-[10px] tabular-nums text-ink-muted">resp {r.effectiveness}%</span>
                <span className="w-16 shrink-0 text-right font-mono text-[10px] tabular-nums" style={{ color: r.residualRisk >= 45 ? TONE.alert : TONE.warn }}>resid {r.residualRisk}</span>
                <span className="w-14 shrink-0 text-right font-mono text-[11px] font-bold tabular-nums" style={{ color: TONE[tn] }}>{r.priority}</span>
              </button>
            );
          })}
        </div>
        <p className="mt-1 px-1 text-[9px] text-ink-muted">Priority = residual risk amplified where response doctrine is weak. A contained scenario with strong doctrine ranks below a milder one we cannot respond to.</p>
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
                  {(() => { const d = m.stress - (baseM.get(m.archetype) ?? m.stress); return <span className="w-9 shrink-0 text-right font-mono text-[9px] tabular-nums" style={{ color: d > 0 ? TONE.alert : TONE.ink ?? 'rgb(var(--c-ink-muted))' }}>{d > 0 ? `+${d}` : d || '—'}</span>; })()}
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

      <Panel title="Mitigation playbook" meta="phased response doctrine · advisory · cabinet decides" bodyClass="!p-1.5">
        <div className="mb-2 grid grid-cols-3 gap-2">
          {([
            { l: 'Gross risk', v: pb.grossRisk, t: pb.grossRisk >= 75 ? 'alert' : pb.grossRisk >= 50 ? 'warn' : 'ok' },
            { l: 'Residual after response', v: pb.residualRisk, t: pb.residualRisk >= 50 ? 'alert' : pb.residualRisk >= 30 ? 'warn' : 'ok' },
            { l: 'Response effectiveness', v: `${pb.effectiveness}%`, t: pb.effectiveness >= 60 ? 'ok' : pb.effectiveness >= 40 ? 'warn' : 'alert' },
          ] as const).map(m => (
            <div key={m.l} className="rounded-[3px] border border-line-soft bg-surface-2/40 px-2 py-1.5">
              <div className="truncate text-[8px] font-semibold uppercase tracking-[0.16em] text-ink-muted">{m.l}</div>
              <div className="font-mono text-[15px] leading-tight tabular-nums" style={{ color: TONE[m.t] }}>{m.v}</div>
            </div>
          ))}
        </div>
        <div className="grid gap-1.5 sm:grid-cols-3">
          {pb.phases.map((p, i) => {
            const pt = i === 0 ? 'alert' : i === 1 ? 'warn' : 'ok';
            return (
              <div key={p.phase} className="rounded-[3px] border border-line-soft bg-surface-2/40 p-2" style={{ borderLeft: `3px solid ${TONE[pt]}` }}>
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[11px] font-semibold text-ink">{i + 1}. {p.phase}</span>
                  <span className="font-mono text-[9px] tabular-nums" style={{ color: TONE.ok }}>−{p.reduction}</span>
                </div>
                <div className="mb-1 flex items-center justify-between text-[8.5px] text-ink-muted">
                  <span>{p.window}</span><span className="uppercase tracking-wider">lead · {p.lead}</span>
                </div>
                <ul className="space-y-0.5">
                  {p.actions.map((a, j) => (
                    <li key={j} className="flex gap-1.5 text-[10px] text-ink-soft">
                      <span className="shrink-0" style={{ color: TONE[pt] }}>▸</span><span>{a}</span>
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>
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
