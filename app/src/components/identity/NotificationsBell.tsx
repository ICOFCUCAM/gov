'use client';

import * as React from 'react';
import { useSubstrateAlerts } from './useSubstrateAlerts';
import { substrateAvailable } from '@/lib/db/client';

const TONE_FOR = (highest: string | undefined) =>
  highest === 'national' || highest === 'major' ? '#f1707a'
  : highest === 'critical' ? '#f1707a'
  : highest === 'urgent' ? '#e0b341'
  : '#34d39c';

/** Compact bell with a count + colour from the highest-severity alert. */
export function NotificationsBell({ className = '' }: { className?: string }) {
  const { unseen } = useSubstrateAlerts();
  if (!substrateAvailable()) return null;
  const count = unseen.length;
  const highest = unseen[0]?.severity;
  const tone = count === 0 ? 'rgb(var(--c-ink-muted))' : TONE_FOR(highest);

  return (
    <a
      href="/gov/alerts"
      title={count === 0 ? 'No alerts' : `${count} substrate alert${count === 1 ? '' : 's'}`}
      className={`inline-flex items-center gap-1 rounded-[3px] border px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-[0.16em] hover:bg-surface-2 ${className}`}
      style={{ borderColor: tone, color: tone }}
    >
      <span aria-hidden className={highest === 'national' || highest === 'major' ? 'animate-pulse' : ''}>◔</span>
      <span>alerts</span>
      <span className="font-mono tabular-nums">{count}</span>
    </a>
  );
}
