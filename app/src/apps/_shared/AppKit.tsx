'use client';

// Shared federated-app UI kit. Execution surfaces, not dashboards:
// terse operational cells, load bars and panels reused by every
// institutional application so apps stay thin and consistent.

import * as React from 'react';

export const ac = (t: 'ok' | 'warn' | 'alert') => `rgb(var(--c-${t}))`;

export function Stat({ l, v, t }: { l: string; v: string; t?: 'ok' | 'warn' | 'alert' }) {
  return (
    <div className="rounded-[3px] border border-line bg-surface px-3 py-2">
      <div className="truncate text-[8px] font-semibold uppercase tracking-[0.16em] text-ink-muted">{l}</div>
      <div className="font-mono text-[15px] tabular-nums" style={{ color: t ? ac(t) : 'rgb(var(--c-ink))' }}>{v}</div>
    </div>
  );
}

export function StatGrid({ items }: { items: { l: string; v: string; t?: 'ok' | 'warn' | 'alert' }[] }) {
  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-6">
      {items.map(s => <Stat key={s.l} {...s} />)}
    </div>
  );
}

export function Bars({ rows }: { rows: { label: string; pct: number; tone: 'ok' | 'warn' | 'alert'; tail?: string }[] }) {
  return (
    <div className="space-y-1">
      {rows.map(r => (
        <div key={r.label} className="flex items-center gap-2 text-[10px]">
          <span className="w-32 shrink-0 truncate text-ink-soft">{r.label}</span>
          <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-surface-2"><span className="block h-full" style={{ width: `${Math.max(0, Math.min(100, r.pct))}%`, backgroundColor: ac(r.tone) }} /></div>
          <span className="w-16 shrink-0 text-right font-mono tabular-nums" style={{ color: ac(r.tone) }}>{r.tail ?? String(r.pct)}</span>
        </div>
      ))}
    </div>
  );
}

export function Panel({ title, meta, children }: { title: string; meta?: string; children: React.ReactNode }) {
  return (
    <section className="rounded-[3px] border border-line bg-surface">
      <div className="flex items-center justify-between gap-2 border-b border-line px-2.5 py-1.5">
        <h3 className="text-[10px] font-semibold uppercase tracking-[0.16em] text-ink-soft">{title}</h3>
        {meta ? <span className="text-[10px] text-ink-muted">{meta}</span> : null}
      </div>
      <div className="p-2.5">{children}</div>
    </section>
  );
}

export function PosturePill({ label, tone }: { label: string; tone: 'ok' | 'warn' | 'alert' }) {
  return (
    <span className="rounded-[3px] px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-[0.14em]"
      style={{ backgroundColor: `color-mix(in srgb, ${ac(tone)} 16%, transparent)`, color: ac(tone) }}>
      {label}
    </span>
  );
}

import { fieldOperations } from '@/lib/gov/field-operations';
import type { ArchetypeKey } from '@/lib/api/types';
import { subscribe as rtSub, version as rtVer, directiveInbox, actOnItem } from '@/lib/gov/runtime-store';
import { actionsFor } from '@/lib/gov/runtime-workflow';
import { checkAction, capabilityForAction, type SovereignRole, type Capability } from '@/shared/permissions/rbac';

// Inbound sovereign-command queue rendered INSIDE the institution. A
// national strategic decision injects a directive addressed here; the
// operator executes its workflow on this surface — the loop terminates in
// institutional execution, not a dashboard. RBAC + constitutional withhold
// gate every action exactly as the institution's own runtime does.
export function DirectivesInbox({ instKeys, by = 'Institution', role = 'commander', withheld = [] }: {
  instKeys: string[]; by?: string; role?: SovereignRole; withheld?: Capability[];
}) {
  React.useSyncExternalStore(rtSub, rtVer, rtVer);
  const inbox = directiveInbox(instKeys);
  if (inbox.length === 0) return null;
  const open = inbox.filter(x => !x.item.closed).length;
  return (
    <Panel title="Sovereign directives — inbound command" meta={`${open} open · ${inbox.length} total · national decisions terminating in this institution`}>
      <div className="space-y-1.5">
        {inbox.map(({ scope, item }) => {
          const acts = item.closed ? [] : actionsFor(item.kind, item.stage);
          const dt: 'ok' | 'warn' | 'alert' = item.closed ? 'ok' : item.stage === item.history.at(-1)?.to && acts.length === 0 ? 'warn' : 'warn';
          return (
            <div key={item.id} className="rounded-[3px] border border-line-soft bg-surface-2/40 px-2.5 py-2" style={{ borderLeft: `3px solid ${ac(item.closed ? 'ok' : dt)}` }}>
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-mono text-[9px] tabular-nums text-ink-muted">{item.id}</span>
                <span className="text-[11px] font-medium text-ink">{item.title}</span>
                <span className="ml-auto text-[8.5px] uppercase tracking-wider" style={{ color: ac(item.closed ? 'ok' : 'warn') }}>
                  {item.closed ? 'closed' : item.stage}
                </span>
              </div>
              <div className="mt-0.5 truncate text-[8.5px] text-ink-soft">scope <span className="font-mono">{scope}</span> · {item.kind}</div>
              {acts.length > 0 ? (
                <div className="mt-1 flex flex-wrap gap-1">
                  {acts.map(a => {
                    const allowed = checkAction(role, a).allowed && !withheld.includes(capabilityForAction(a));
                    return (
                      <button key={a} disabled={!allowed}
                        title={allowed ? undefined : 'Not authorised / withheld by constitutional posture'}
                        onClick={() => actOnItem(scope, item.id, a, `${by} (${role})`)}
                        className="focus-ring rounded-[3px] border border-line bg-surface px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wider transition-colors enabled:hover:bg-surface-2 disabled:cursor-not-allowed disabled:opacity-40">
                        {a}
                      </button>
                    );
                  })}
                </div>
              ) : null}
            </div>
          );
        })}
      </div>
    </Panel>
  );
}

// Reusable Field Operations panel — live field-unit deployment & telemetry
// for any institution that runs physical field units.
export function FieldPanel({ instId, archetype, now }: { instId: string; archetype: ArchetypeKey; now: number }) {
  const f = fieldOperations(instId, archetype, now / 4000);
  const pt: 'ok' | 'warn' | 'alert' = f.posture === 'overstretched' ? 'alert' : f.posture === 'surged' ? 'warn' : 'ok';
  return (
    <Panel title="Field operations" meta={`${f.unitClass} · ${f.posture}`}>
      <div className="mb-2 grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-6">
        <Stat l="Fleet" v={`${f.fleet}`} />
        <Stat l="Deployed" v={`${f.deployed}`} t={pt} />
        <Stat l="Available" v={`${f.available}`} t="ok" />
        <Stat l="Mean ETA" v={`${f.meanEtaMin}m`} t={f.meanEtaMin >= 25 ? 'alert' : f.meanEtaMin >= 15 ? 'warn' : 'ok'} />
        <Stat l="Telemetry health" v={`${f.telemetryHealthPct}%`} t={f.telemetryHealthPct >= 85 ? 'ok' : 'warn'} />
        <Stat l="Posture" v={f.posture} t={pt} />
      </div>
      <Bars rows={f.byRegion.map(r => ({ label: r.region, pct: Math.min(100, r.active * 4 + r.backlog), tone: r.tone, tail: `${r.active} active · ${r.backlog} bk` }))} />
    </Panel>
  );
}
