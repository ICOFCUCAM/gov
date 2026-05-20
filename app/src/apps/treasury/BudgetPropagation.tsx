'use client';

// Treasury — Budget Propagation. Annual envelope cascading Treasury →
// ministry → department → encumbrance → spent, with year-to-date variance.

import * as React from 'react';
import { budgetPropagation } from '@/lib/gov/fiscal-execution';

export function BudgetPropagation({ id, now }: { id: string; now: number }) {
  void id;
  const rows = budgetPropagation(now);
  return (
    <div className="space-y-2 font-mono">
      <div className="border-y border-line bg-black/30 px-3 py-1.5 text-[10px] text-ink-muted">
        Annual budget cascades through four levels — encumbrance and spend never exceed the department release,
        which never exceeds the ministry envelope.
      </div>
      <div className="border border-line">
        <div className="flex items-center gap-2 border-b border-line bg-black/30 px-2 py-1 text-[8px] font-semibold uppercase tracking-[0.16em] text-ink-muted">
          <span className="w-32 shrink-0">Ministry</span>
          <span className="w-20 shrink-0">Envelope</span>
          <span className="min-w-0 flex-1">Cascade · ministry → dept → encumbrance → spent</span>
          <span className="w-20 shrink-0">Burndown</span>
          <span className="w-20 shrink-0">Variance</span>
        </div>
        {rows.map(b => {
          const [, dep, enc, spt] = b.cascade;
          return (
            <div key={b.ministry} className="flex items-center gap-2 border-b border-line/60 px-2 py-1.5 text-[10px] last:border-0">
              <span className="w-32 shrink-0 truncate text-ink">{b.ministry}</span>
              <span className="w-20 shrink-0 tabular-nums text-ink">{b.envelopeBn}Bn</span>
              <span className="flex min-w-0 flex-1 items-center gap-1">
                <span className="relative h-2 min-w-0 flex-1 bg-surface-2">
                  <span className="absolute inset-y-0 left-0" style={{ width: '100%', background: 'color-mix(in srgb,#5fb0ff 30%,transparent)' }} />
                  <span className="absolute inset-y-0 left-0" style={{ width: `${dep!.pct}%`, background: 'color-mix(in srgb,#5fb0ff 70%,transparent)' }} />
                  <span className="absolute inset-y-0 left-0" style={{ width: `${enc!.pct}%`, background: '#d8a23a' }} />
                  <span className="absolute inset-y-0 left-0" style={{ width: `${spt!.pct}%`, background: '#54d08f' }} />
                </span>
                <span className="w-12 shrink-0 text-right text-[8.5px] tabular-nums text-ink-muted">{dep!.pct}/{enc!.pct}/{spt!.pct}</span>
              </span>
              <span className="w-20 shrink-0 tabular-nums" style={{ color: b.burndownPct >= 50 ? 'rgb(var(--c-warn))' : 'rgb(var(--c-ok))' }}>{b.burndownPct}%</span>
              <span className="w-20 shrink-0 tabular-nums" style={{ color: b.variancePct < 0 ? 'rgb(var(--c-alert))' : b.variancePct > 20 ? 'rgb(var(--c-warn))' : 'rgb(var(--c-ok))' }}>{b.variancePct >= 0 ? '+' : ''}{b.variancePct}%</span>
            </div>
          );
        })}
      </div>
      <p className="text-[9px] text-ink-muted">
        Blue = department release · gold = encumbrance · green = actual spend. Variance compares year-to-date spend
        against the expected burndown curve — negative variance flags over-execution; high positive flags under-spend.
      </p>
    </div>
  );
}
