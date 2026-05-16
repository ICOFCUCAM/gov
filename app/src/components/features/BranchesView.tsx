'use client';

import * as React from 'react';
import { TONE, Panel, Spark, seed, waveSeries } from '@/components/features/SituationRoom';
import {
  BRANCHES, legislativePipeline, judicialDocket, separationIntegrity,
} from '@/lib/gov/branches';

export function BranchesView() {
  const [now, setNow] = React.useState(() => Date.now());
  React.useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);
  const ts = now / 4000;

  const bills = legislativePipeline(ts);
  const docket = judicialDocket(ts);
  const sep = separationIntegrity(ts);

  const tele = [
    { l: 'Bills in progress', v: String(bills.reduce((a, s) => a + s.count, 0)), t: 'ok', k: 'bp' },
    { l: 'Awaiting assent', v: String(bills.find(s => s.stage === 'Assent')?.count ?? 0), t: 'warn', k: 'aa' },
    { l: 'Open cases', v: String(docket.reduce((a, s) => a + s.count, 0)), t: 'ok', k: 'oc' },
    { l: 'Constitutional review', v: String(docket.find(s => s.stage === 'Constitutional review')?.count ?? 0), t: 'warn', k: 'cr' },
    { l: 'Separation integrity', v: sep.intact ? 'INTACT' : 'STRAINED', t: sep.intact ? 'ok' : 'alert', k: 'si' },
    { l: 'Committees sitting', v: String(8 + Math.round(seed(`cs:${Math.floor(ts / 30)}`) * 10)), t: 'ok', k: 'cm' },
  ];

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div className="flex items-center gap-2">
          <h1 className="text-base font-semibold uppercase tracking-[0.16em] text-ink">Branches of Government</h1>
          <span className="flex items-center gap-1 rounded-[3px] px-1.5 py-0.5 text-[9px] font-bold tracking-widest" style={{ backgroundColor: `color-mix(in srgb, ${TONE.ok} 18%, transparent)`, color: TONE.ok }}>
            <span className="h-1.5 w-1.5 animate-pulse rounded-full" style={{ backgroundColor: TONE.ok }} />LIVE
          </span>
          <span className="rounded-[3px] border px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-[0.16em]" style={{ borderColor: 'rgb(var(--c-line))', color: 'rgb(var(--c-ink-muted))' }}>Advisory · Simulated</span>
          <span className="font-mono text-[10px] tabular-nums text-ink-muted">{new Date(now).toLocaleTimeString()}</span>
        </div>
        <span className="rounded-[3px] border px-2 py-0.5 text-[9px] font-bold uppercase tracking-[0.16em]"
          style={{ borderColor: sep.intact ? TONE.ok : TONE.alert, color: sep.intact ? TONE.ok : TONE.alert, backgroundColor: `color-mix(in srgb, ${sep.intact ? TONE.ok : TONE.alert} 12%, transparent)` }}>
          Separation of powers · {sep.intact ? 'Intact' : 'Strained'}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-6">
        {tele.map(m => (
          <div key={m.l} className="rounded-[3px] border border-line bg-surface px-3 py-2" style={{ boxShadow: 'inset 0 1px 0 rgba(55,199,212,0.06)' }}>
            <div className="truncate text-[8px] font-semibold uppercase tracking-[0.16em] text-ink-muted">{m.l}</div>
            <div className="font-mono text-lg leading-tight tabular-nums" style={{ color: TONE[m.t] }}>{m.v}</div>
            <div className="-mb-1 h-5 overflow-hidden opacity-80"><Spark pts={waveSeries(`br:${m.k}`, ts, 16, 35, 92)} tone={m.t} /></div>
          </div>
        ))}
      </div>

      <div className="grid gap-2 lg:grid-cols-2 xl:grid-cols-4">
        {BRANCHES.map(b => (
          <Panel key={b.key} title={b.name} meta="constitutional branch" className="min-h-[200px]" bodyClass="!p-1.5">
            <p className="mb-1.5 text-[10px] text-ink-muted">{b.mandate}</p>
            <div className="space-y-1">
              {b.bodies.map(body => {
                const v = 70 + Math.round(seed(`bd:${b.key}:${body.name}`) * 29);
                const tn = v >= 90 ? 'ok' : v >= 78 ? 'warn' : 'alert';
                return (
                  <div key={body.name} className="rounded-[3px] border border-line-soft bg-surface-2/40 px-2 py-1">
                    <div className="flex items-center justify-between gap-2">
                      <span className="truncate text-[11px] text-ink">{body.name}</span>
                      <span className="font-mono text-[10px] tabular-nums" style={{ color: TONE[tn] }}>{v}%</span>
                    </div>
                    <span className="block truncate text-[9px] text-ink-muted">{body.role}</span>
                  </div>
                );
              })}
            </div>
          </Panel>
        ))}
      </div>

      <div className="grid gap-2 xl:grid-cols-2">
        <Panel title="Legislative pipeline" meta="bills · stage flow" bodyClass="!p-2">
          <div className="space-y-1.5">
            {bills.map(s => {
              const tn = s.blocked >= 3 ? 'alert' : s.blocked >= 1 ? 'warn' : 'ok';
              const pct = Math.min(100, s.count * 4);
              return (
                <div key={s.stage}>
                  <div className="flex items-center justify-between text-[10px]">
                    <span className="text-ink-soft">{s.stage}</span>
                    <span className="font-mono tabular-nums text-ink-muted">{s.count} active{s.blocked ? ` · ${s.blocked} blocked` : ''}</span>
                  </div>
                  <div className="mt-0.5 h-1.5 overflow-hidden rounded-full bg-surface-2">
                    <span className="block h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: TONE[tn] }} />
                  </div>
                </div>
              );
            })}
          </div>
        </Panel>

        <Panel title="Judicial docket" meta="cases · stage · age" bodyClass="!p-0">
          <table className="w-full text-[11px]">
            <thead>
              <tr className="border-b border-line bg-surface-2 text-left text-[8.5px] uppercase tracking-wider text-ink-muted">
                <th className="px-3 py-1.5">Stage</th><th className="px-2 py-1.5 text-right">Cases</th><th className="px-3 py-1.5 text-right">Mean age</th>
              </tr>
            </thead>
            <tbody>
              {docket.map(s => {
                const tn = s.ageDays >= 90 ? 'alert' : s.ageDays >= 45 ? 'warn' : 'ok';
                return (
                  <tr key={s.stage} className="border-b border-line-soft last:border-0">
                    <td className="px-3 py-1.5 text-ink-soft">{s.stage}</td>
                    <td className="px-2 py-1.5 text-right font-mono tabular-nums text-ink">{s.count}</td>
                    <td className="px-3 py-1.5 text-right font-mono tabular-nums" style={{ color: TONE[tn] }}>{s.ageDays}d</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </Panel>
      </div>

      <Panel title="Separation-of-powers invariant watch" meta="constitutional safeguards" bodyClass="!p-1.5">
        <div className="grid grid-cols-1 gap-1 sm:grid-cols-2 xl:grid-cols-3">
          {sep.checks.map(c => (
            <div key={c.l} className="flex items-center justify-between gap-2 rounded-[3px] border border-line-soft bg-surface-2/40 px-2 py-1.5">
              <span className="min-w-0">
                <span className="block truncate text-[11px] text-ink-soft">{c.l}</span>
                <span className="block truncate text-[9px] text-ink-muted">{c.detail}</span>
              </span>
              <span className="shrink-0 rounded-[3px] px-1.5 py-0.5 text-[9px] font-bold uppercase" style={{ backgroundColor: `color-mix(in srgb, ${c.ok ? TONE.ok : TONE.alert} 18%, transparent)`, color: c.ok ? TONE.ok : TONE.alert }}>{c.ok ? 'Held' : 'Breach'}</span>
            </div>
          ))}
        </div>
      </Panel>

      <p className="text-[10px] text-ink-muted">
        Constitutional structure is read-only and advisory. The platform surfaces the separation of powers; only the constituted branches exercise authority. No branch may override another outside constitutional process.
      </p>
    </div>
  );
}
