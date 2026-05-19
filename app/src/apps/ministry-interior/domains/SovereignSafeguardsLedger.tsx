'use client';

// Interior Infrastructure — Sovereign Safeguards Ledger. The unified
// registry of every constitutional safeguard family, with their scope,
// extras and the kebab-cased structural identifiers each one forbids.

import * as React from 'react';
import { SAFEGUARD_REGISTRY, allProhibitedTerms } from '@/lib/gov/sovereign-safeguards';
import { safeguardDoctrineFor } from '@/lib/gov/safeguard-doctrine';

export function SovereignSafeguardsLedger({ id }: { id: string }) {
  void id;
  const total = allProhibitedTerms().length;
  const distinct = new Set(allProhibitedTerms()).size;
  return (
    <div className="space-y-2 font-mono">
      <div className="flex flex-wrap items-stretch divide-x divide-line border-y border-line bg-black/30">
        <div className="min-w-[140px] flex-1 px-3 py-1.5"><div className="text-[8px] uppercase tracking-[0.16em] text-ink-muted">Safeguard families</div><div className="text-[17px] font-semibold tabular-nums text-ink">{SAFEGUARD_REGISTRY.length}</div></div>
        <div className="min-w-[140px] flex-1 px-3 py-1.5"><div className="text-[8px] uppercase tracking-[0.16em] text-ink-muted">Prohibitions (total)</div><div className="text-[17px] font-semibold tabular-nums text-ink">{total}</div></div>
        <div className="min-w-[140px] flex-1 px-3 py-1.5"><div className="text-[8px] uppercase tracking-[0.16em] text-ink-muted">Distinct vocabulary</div><div className="text-[17px] font-semibold tabular-nums text-ink">{distinct}</div></div>
        <div className="min-w-[240px] flex-[2] px-3 py-1.5"><div className="text-[8px] uppercase tracking-[0.16em] text-ink-muted">Guarantee</div><div className="text-[10px] text-ink-soft">Every prohibition is structural — declared in code, locked by tests.</div></div>
      </div>

      <div className="space-y-2">
        {SAFEGUARD_REGISTRY.map(s => (
          <div key={s.key} className="border border-line p-2">
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px]">
              <span className="text-[12px] font-semibold text-ink">{s.label}</span>
              <span className="text-[9px] uppercase tracking-[0.1em] text-ink-muted">scope · {s.scope}</span>
              <span className="rounded-[2px] border border-line px-1 text-[8px] uppercase tracking-[0.1em]" style={{ color: 'rgb(var(--c-ok))' }}>per-citizen data · {String(s.perCitizenData)}</span>
              {s.extras.map(e => (
                <span key={e.label} className="rounded-[2px] border border-line px-1 text-[8px] uppercase tracking-[0.1em]" style={{ color: e.value ? 'rgb(var(--c-ok))' : 'rgb(var(--c-warn))' }}>{e.label} · {String(e.value)}</span>
              ))}
            </div>
            <p className="mt-1 text-[10px] italic text-ink-soft">{safeguardDoctrineFor(s.key)}</p>
            <div className="mt-1 flex flex-wrap gap-1">
              {s.prohibited.map(p => (
                <span key={p} className="border px-1 text-[8px] uppercase tracking-[0.06em]" style={{ borderColor: 'color-mix(in srgb,rgb(var(--c-alert)) 40%,transparent)', color: 'rgb(var(--c-alert))' }}>✗ {p}</span>
              ))}
            </div>
          </div>
        ))}
      </div>
      <p className="text-[9px] text-ink-muted">
        These are not advisory commitments — they are structural prohibitions enforced by code & test invariants that
        scan every engine's serialized output for the forbidden vocabulary.
      </p>
    </div>
  );
}
