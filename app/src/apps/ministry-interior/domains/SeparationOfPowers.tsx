'use client';

// Interior Constitutional Governance — Separation of Powers. The federated
// branch map with bounded powers and the live concentration check: no
// institution may execute, monitor, investigate, judge and punish at once.

import * as React from 'react';
import { BRANCHES, separationIntact, type Power } from '@/lib/gov/constitutional-governance';

const ALL_POWERS: Power[] = ['execute', 'monitor', 'investigate', 'judge', 'punish'];

export function SeparationOfPowers({ id }: { id: string }) {
  void id;
  const intact = separationIntact();
  return (
    <div className="space-y-2 font-mono">
      <div className="flex items-center gap-2 border-y px-3 py-1.5 text-[10px]"
        style={{ borderColor: intact ? 'color-mix(in srgb,rgb(var(--c-ok)) 40%,transparent)' : 'rgb(var(--c-alert))', background: 'rgba(0,0,0,0.3)' }}>
        <span className="h-1.5 w-1.5 rounded-full" style={{ background: intact ? 'rgb(var(--c-ok))' : 'rgb(var(--c-alert))' }} aria-hidden />
        <span className="font-semibold uppercase tracking-[0.18em]" style={{ color: intact ? 'rgb(var(--c-ok))' : 'rgb(var(--c-alert))' }}>
          {intact ? 'Separation enforced' : 'CONCENTRATION DETECTED'}
        </span>
        <span className="text-ink-muted">no single institution executes · monitors · investigates · judges · punishes simultaneously</span>
      </div>

      <div className="border border-line">
        <div className="flex items-center gap-2 border-b border-line bg-black/30 px-2 py-1 text-[8px] font-semibold uppercase tracking-[0.16em] text-ink-muted">
          <span className="w-40 shrink-0">Branch</span>
          <span className="w-56 shrink-0">Institutions</span>
          <span className="min-w-0 flex-1">Bounded powers</span>
        </div>
        {BRANCHES.map(b => (
          <div key={b.key} className="flex items-start gap-2 border-b border-line/60 px-2 py-1.5 text-[10px] last:border-0">
            <span className="w-40 shrink-0">
              <span className="font-semibold text-ink">{b.label}</span>
              <span className="block text-[8.5px] text-ink-muted">{b.purpose}</span>
            </span>
            <span className="w-56 shrink-0 text-ink-soft">{b.institutions.join(' · ')}</span>
            <span className="flex min-w-0 flex-1 flex-wrap gap-1">
              {ALL_POWERS.map(p => {
                const has = b.powers.includes(p);
                return (
                  <span key={p} className="border px-1 text-[8px] uppercase tracking-[0.08em]"
                    style={{
                      borderColor: has ? 'color-mix(in srgb,rgb(var(--c-ok)) 50%,transparent)' : 'rgb(var(--c-line))',
                      color: has ? 'rgb(var(--c-ok))' : 'rgb(var(--c-line))',
                    }}>
                    {has ? p : `¬${p}`}
                  </span>
                );
              })}
            </span>
          </div>
        ))}
      </div>
      <p className="text-[9px] text-ink-muted">
        Operations may only execute within mandate — it can never self-judge or self-punish. Coercive power
        (judge / punish) is judicial-only and requires legal authorization. Interior is a coordination &
        accountability layer, not an all-seeing authority.
      </p>
    </div>
  );
}
