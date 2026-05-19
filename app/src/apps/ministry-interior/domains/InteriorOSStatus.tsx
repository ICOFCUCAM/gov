'use client';

// Interior — OS Status. The single apex synthesis view of pulse + trend +
// citizen brief + registry counts.

import * as React from 'react';
import { interiorOSStatus } from '@/lib/gov/interior-os-status';

export function InteriorOSStatus({ id, now }: { id: string; now: number }) {
  void id;
  const s = interiorOSStatus(now);
  const col = s.brief.nationalHealth >= 70 ? 'rgb(var(--c-ok))' : s.brief.nationalHealth >= 50 ? 'rgb(var(--c-warn))' : 'rgb(var(--c-alert))';
  return (
    <div className="space-y-2 font-mono">
      <div className="border-y border-line bg-black/30 px-3 py-2 text-[11px]">
        <span className="text-[9px] uppercase tracking-[0.18em] text-ink-muted mr-2">Interior OS · sovereign synthesis</span>
        <span className="text-[14px] font-semibold uppercase tracking-[0.12em] text-ink">{s.pulse.mode}</span>
        <span className="ml-3 text-ink-muted">national health <span className="font-semibold tabular-nums" style={{ color: col }}>{s.brief.nationalHealth}</span></span>
        <span className="ml-3 text-ink-muted">trend <span className="uppercase tracking-[0.1em]">{s.trend.direction}</span> {s.trend.slope >= 0 ? '+' : ''}{s.trend.slope}</span>
      </div>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <div className="border border-line p-2"><div className="text-[8px] uppercase tracking-[0.14em] text-ink-muted">Engines</div><div className="text-[16px] font-semibold tabular-nums text-ink">{s.totalEngines}</div></div>
        <div className="border border-line p-2"><div className="text-[8px] uppercase tracking-[0.14em] text-ink-muted">Safeguard families</div><div className="text-[16px] font-semibold tabular-nums text-ink">{s.totalSafeguardFamilies}</div></div>
        <div className="border border-line p-2"><div className="text-[8px] uppercase tracking-[0.14em] text-ink-muted">Constitutional prohibitions</div><div className="text-[16px] font-semibold tabular-nums text-ink">{s.brief.totalProhibitions}</div></div>
        <div className="border border-line p-2"><div className="text-[8px] uppercase tracking-[0.14em] text-ink-muted">Priority reinforcement layers</div><div className="text-[16px] font-semibold tabular-nums text-ink">{s.totalPriorityLayers}</div></div>
      </div>

      <div className="border border-line p-2 text-[10px] text-ink-soft">{s.pulse.line}</div>
      <div className="border border-line p-2 text-[10px] text-ink-soft">{s.brief.briefLine}</div>
    </div>
  );
}
