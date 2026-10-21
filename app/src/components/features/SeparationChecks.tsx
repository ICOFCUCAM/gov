'use client';

// The separation-of-powers checks as observed (GET /api/constitution/separation;
// lib/gov/separation.ts, plan phase 4, audit G): each read from the records the
// platform enforces, with a link to the record. When the checks cannot be read
// the screens say "Not connected", never a generated value.

import * as React from 'react';
import Link from 'next/link';
import type { SeparationCheck } from '@/lib/gov/separation';

export interface SeparationState { checks: SeparationCheck[]; intact: boolean; observedAt: string }

/** The observed checks, refreshed every `everyMs`; null while loading or when they cannot be read. */
export function useSeparation(everyMs = 30_000): { data: SeparationState | null; failed: boolean } {
  const [data, setData] = React.useState<SeparationState | null>(null);
  const [failed, setFailed] = React.useState(false);
  React.useEffect(() => {
    let live = true;
    const load = () => fetch('/api/constitution/separation', { cache: 'no-store' })
      .then(r => (r.ok ? (r.json() as Promise<SeparationState>) : Promise.reject(new Error(String(r.status)))))
      .then(j => { if (live) { setData(j); setFailed(false); } })
      .catch(() => { if (live) setFailed(true); });
    void load();
    const t = setInterval(() => void load(), everyMs);
    return () => { live = false; clearInterval(t); };
  }, [everyMs]);
  return { data, failed };
}

export const SEPARATION_SOURCE = 'Read from the institution register, who is responsible, official accounts, offices, the access-log rule and the directives register';

/** "Intact", "n of m held" or "Not connected", in words. */
export function separationWord(s: SeparationState | null): string {
  if (!s) return 'Not connected';
  const held = s.checks.filter(c => c.ok).length;
  return s.intact ? 'Intact' : `${held} of ${s.checks.length} held`;
}

/** The checks as a list, each linking to the record that decides it. */
export function SeparationCheckList({ data, failed, compact = false }: { data: SeparationState | null; failed: boolean; compact?: boolean }) {
  if (!data) {
    return <p className="px-2 py-1.5 text-[11px] text-ink-muted">{failed ? 'Not connected: the checks could not be read.' : 'Reading the configuration…'}</p>;
  }
  return (
    <ul className={`grid grid-cols-1 gap-1 ${compact ? '' : 'sm:grid-cols-2'}`}>
      {data.checks.map(c => (
        <li key={c.key}>
          <Link href={c.href} className="focus-ring flex items-center justify-between gap-2 rounded-[3px] border border-line-soft bg-surface-2/40 px-2 py-1.5 no-underline hover:bg-surface-2">
            <span className="min-w-0">
              <span className="block truncate text-[11px] text-ink-soft" title={SEPARATION_SOURCE}>{c.label}</span>
              <span className="block truncate text-[10px] text-ink-muted">{c.detail}</span>
            </span>
            <span className="shrink-0 rounded-[3px] px-1.5 py-0.5 text-[9px] font-bold uppercase"
              style={{ backgroundColor: `color-mix(in srgb, rgb(var(${c.ok ? '--c-ok' : '--c-warn'})) 18%, transparent)`, color: `rgb(var(${c.ok ? '--c-ok' : '--c-warn'}))` }}>
              {c.ok ? 'Held' : 'Not yet'}
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}
