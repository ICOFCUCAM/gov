'use client';

// Interior — Ministry Character. Displays the Tier-1 ministry character
// registry — the formal sovereign identity each ministry must preserve.

import * as React from 'react';
import { MINISTRY_CHARACTER } from '@/lib/gov/ministry-character';

export function MinistryCharacter({ id }: { id: string }) {
  void id;
  return (
    <div className="space-y-2 font-mono">
      <div className="border-y border-line bg-black/30 px-3 py-1.5 text-[10px] text-ink-muted">
        Tier-1 sovereign character — formal identity per ministry shell. No two ministries should feel the same.
      </div>
      <div className="space-y-2">
        {MINISTRY_CHARACTER.map(c => (
          <div key={c.key} className="border border-line p-2" style={{ borderColor: `color-mix(in srgb,${c.accent} 22%,rgb(var(--c-line)))` }}>
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: c.accent }} aria-hidden />
              <span className="text-[12px] font-semibold text-ink">{c.label}</span>
              <span className="ml-auto text-[8px] uppercase tracking-[0.14em] text-ink-muted">{c.key}</span>
            </div>
            <p className="mt-0.5 text-[10px] text-ink">{c.identity}</p>
            <p className="mt-0.5 text-[10px] italic text-ink-soft">{c.interactionPhilosophy}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
