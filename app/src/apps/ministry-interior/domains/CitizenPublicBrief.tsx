'use client';

// Interior — Citizen Public Brief. The citizen-safe summary of the
// constitutional civilization's operational state. Aggregate institutional
// readings only; no per-citizen exposure.

import * as React from 'react';
import { citizenPublicBrief } from '@/lib/gov/citizen-public-brief';

export function CitizenPublicBrief({ id, now }: { id: string; now: number }) {
  void id;
  const b = citizenPublicBrief(now);
  const col = b.nationalHealth >= 70 ? 'rgb(var(--c-ok))' : b.nationalHealth >= 50 ? 'rgb(var(--c-warn))' : 'rgb(var(--c-alert))';
  return (
    <div className="space-y-2 font-mono">
      <div className="border-y border-line bg-black/30 px-3 py-2 text-[11px]">
        <span className="text-[9px] uppercase tracking-[0.18em] text-ink-muted mr-2">National status (citizen-safe)</span>
        <span className="text-[14px] font-semibold uppercase tracking-[0.12em] text-ink">{b.organismMode}</span>
        <span className="ml-3 text-ink-muted">national health <span className="font-semibold tabular-nums" style={{ color: col }}>{b.nationalHealth}</span></span>
      </div>
      <div className="border border-line p-2 text-[10px] text-ink-soft">
        {b.briefLine}
      </div>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <div className="border border-line p-2"><div className="text-[8px] uppercase tracking-[0.14em] text-ink-muted">Trust</div><div className="text-[16px] font-semibold tabular-nums text-ink">{b.trustIndex}</div></div>
        <div className="border border-line p-2"><div className="text-[8px] uppercase tracking-[0.14em] text-ink-muted">Appeals under review</div><div className="text-[16px] font-semibold tabular-nums text-ink">{b.unresolvedAppeals}</div></div>
        <div className="border border-line p-2"><div className="text-[8px] uppercase tracking-[0.14em] text-ink-muted">Safeguard families</div><div className="text-[16px] font-semibold tabular-nums text-ink">{b.safeguardFamilies}</div></div>
        <div className="border border-line p-2"><div className="text-[8px] uppercase tracking-[0.14em] text-ink-muted">Constitutional prohibitions</div><div className="text-[16px] font-semibold tabular-nums text-ink">{b.totalProhibitions}</div></div>
      </div>
      <p className="text-[9px] text-ink-muted">
        This brief is aggregate-only — there is no per-citizen data, no ideological classification and no profiling
        anywhere in the runtime that feeds it.
      </p>
    </div>
  );
}
