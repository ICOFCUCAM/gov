'use client';

import * as React from 'react';
import Link from 'next/link';
import { TONE, Panel } from '@/components/features/SituationRoom';
import { subscribe, getLedger, runtimeStats, version as rtVersion } from '@/lib/gov/runtime-store';

const actTone = (a: string) =>
  a === 'approve' || a === 'resolve' ? TONE.ok : a === 'reject' ? TONE.alert : a === 'escalate' ? TONE.warn : TONE.link;

// Best-effort: map a runtime scope back to the surface that owns it.
function scopeHref(scope: string): string {
  if (scope.startsWith('MIN-')) {
    const id = scope.split(':')[0]!;
    const grp = scope.split(':')[1];
    return grp ? `/ministries/${id}/system/${grp}` : `/ministries/${id}/operations`;
  }
  if (scope.startsWith('leg:')) return '/gov/branch/legislature';
  if (scope.startsWith('jud:')) return '/gov/branch/judiciary';
  if (scope.startsWith('natcoord')) return '/gov/coordination';
  if (scope.startsWith('ops:')) return '/ops';
  if (scope.startsWith('sim:')) return '/gov/simulation';
  if (scope.startsWith('domain:')) {
    const d = scope.split(':')[1];
    return d === 'treasury' ? '/gov/treasury' : d === 'security' ? '/gov/security' : '/gov';
  }
  if (scope.startsWith('cabinet:')) return '/gov';
  return '/gov/shell';
}

/**
 * Operations Ledger — the running record of every executed state
 * transition across the platform's runtime. Proof the state is operating,
 * not just displaying: each entry is a real action an operator drove.
 */
export function OperationsLedger() {
  React.useSyncExternalStore(subscribe, rtVersion, rtVersion);
  const ledger = getLedger(80);
  const stats = runtimeStats();
  const [now, setNow] = React.useState(() => Date.now());
  React.useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div className="flex items-center gap-2">
          <h1 className="text-base font-semibold uppercase tracking-[0.16em] text-ink">Operations Ledger</h1>
          <span className="rounded-[3px] border px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-[0.16em]" style={{ borderColor: 'rgb(var(--c-line))', color: 'rgb(var(--c-ink-muted))' }}>
            runtime · executed transitions
          </span>
          <span className="font-mono text-[10px] tabular-nums text-ink-muted">{new Date(now).toLocaleTimeString()}</span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-5">
        {[
          { l: 'Active scopes', v: String(stats.scopes) },
          { l: 'Work items', v: String(stats.totalItems) },
          { l: 'Open', v: String(stats.open) },
          { l: 'Transitions executed', v: String(stats.transitions) },
          { l: 'Operator dispositions', v: String(stats.closedByOperator) },
        ].map(s => (
          <div key={s.l} className="rounded-[3px] border border-line bg-surface px-3 py-2" style={{ boxShadow: 'inset 0 1px 0 rgba(55,199,212,0.06)' }}>
            <div className="truncate text-[8px] font-semibold uppercase tracking-[0.16em] text-ink-muted">{s.l}</div>
            <div className="font-mono text-[15px] tabular-nums text-ink">{s.v}</div>
          </div>
        ))}
      </div>

      <Panel title="Transition ledger" meta={`${ledger.length} most-recent executed actions`} bodyClass="!p-0">
        {ledger.length === 0 ? (
          <p className="px-3 py-4 text-[11px] text-ink-muted">
            No transitions executed yet this session. Drive a workflow in any subsystem runtime,
            legislature, judiciary or coordination surface — actions appear here as the state operates.
          </p>
        ) : (
          <div className="max-h-[480px] overflow-y-auto">
            {ledger.map((e, i) => (
              <div key={i} className="flex items-center gap-2 border-b border-line-soft px-3 py-1.5 last:border-0 text-[10px]">
                <span className="w-16 shrink-0 font-mono tabular-nums text-ink-muted">
                  {new Date(e.at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                </span>
                <Link href={scopeHref(e.scope)} className="w-32 shrink-0 truncate font-mono text-link no-underline hover:underline">{e.scope}</Link>
                <span className="w-16 shrink-0 truncate text-ink-soft">{e.itemId}</span>
                <span className="min-w-0 flex-1 truncate text-ink-soft">{e.from} → {e.to}</span>
                <span className="w-16 shrink-0 text-right text-[8.5px] font-bold uppercase tracking-wider" style={{ color: actTone(e.action) }}>{e.action}</span>
                <span className="w-24 shrink-0 truncate text-right text-[8.5px] text-ink-muted">{e.by}</span>
              </div>
            ))}
          </div>
        )}
      </Panel>

      <p className="text-[10px] text-ink-muted">
        The ledger persists for the session across navigation. Open a runtime queue
        (<Link href="/gov/coordination" className="text-link underline underline-offset-2">National Coordination</Link>,
        any ministry subsystem, <Link href="/gov/branch/legislature" className="text-link underline underline-offset-2">Legislature</Link>,
        <Link href="/gov/branch/judiciary" className="text-link underline underline-offset-2"> Judiciary</Link>) and drive items —
        every transition is recorded here.
      </p>
    </div>
  );
}
