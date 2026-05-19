'use client';

// Interior Constitutional Governance — Independent Oversight Mirroring.
// Critical audit streams do not belong solely to Interior: they are
// immutably mirrored to the judiciary, independent audit authority,
// anti-corruption inspectorate and parliament — preventing internal
// coverups, political manipulation and evidence destruction.

import * as React from 'react';
import { oversightMirrors, type MirrorTarget } from '@/lib/gov/constitutional-governance';

const TARGET_LABEL: Record<MirrorTarget, string> = {
  JUDICIARY: 'Judiciary',
  INDEPENDENT_AUDIT: 'Independent Audit',
  ANTI_CORRUPTION_INSPECTORATE: 'Anti-Corruption Inspectorate',
  PARLIAMENT: 'Parliament',
};

export function OversightMirroring({ id, now }: { id: string; now: number }) {
  void id;
  const mirrors = oversightMirrors(now);
  return (
    <div className="space-y-2 font-mono">
      <div className="flex items-center gap-2 border-y px-3 py-1.5 text-[10px]"
        style={{ borderColor: 'color-mix(in srgb,#5fb0ff 40%,transparent)', background: 'rgba(0,0,0,0.3)' }}>
        <span className="h-1.5 w-1.5 rounded-full" style={{ background: '#5fb0ff' }} aria-hidden />
        <span className="font-semibold uppercase tracking-[0.18em]" style={{ color: '#5fb0ff' }}>Immutable · independently mirrored</span>
        <span className="text-ink-muted">even administrators cannot silently remove evidence — chains are cryptographically linked & non-erasable</span>
      </div>

      <div className="border border-line">
        <div className="flex items-center gap-2 border-b border-line bg-black/30 px-2 py-1 text-[8px] font-semibold uppercase tracking-[0.16em] text-ink-muted">
          <span className="w-52 shrink-0">Audit stream</span>
          <span className="min-w-0 flex-1">Independent mirror targets</span>
          <span className="w-24 shrink-0 text-right">Mirror sync</span>
        </div>
        {mirrors.map(m => (
          <div key={m.stream} className="flex items-center gap-2 border-b border-line/60 px-2 py-1.5 text-[10px] last:border-0">
            <span className="w-52 shrink-0 text-ink">{m.stream}</span>
            <span className="flex min-w-0 flex-1 flex-wrap gap-1">
              {m.targets.map(t => (
                <span key={t} className="border px-1 text-[8px] uppercase tracking-[0.06em]"
                  style={{ borderColor: 'color-mix(in srgb,#5fb0ff 40%,transparent)', color: '#5fb0ff' }}>
                  {TARGET_LABEL[t]}
                </span>
              ))}
            </span>
            <span className="w-24 shrink-0 text-right tabular-nums"
              style={{ color: m.syncedPct >= 97 ? 'rgb(var(--c-ok))' : 'rgb(var(--c-warn))' }}>
              {m.syncedPct}% · immutable
            </span>
          </div>
        ))}
      </div>
      <p className="text-[9px] text-ink-muted">
        Tracked: file access · workflow delays · unauthorized actions · override attempts · surveillance requests ·
        escalation actions · deadline breaches. Oversight data is federated, not Interior-owned.
      </p>
    </div>
  );
}
