'use client';

import * as React from 'react';
import Link from 'next/link';
import { listPostureHistoryRows } from '@/lib/db/repos/memory';
import { useRealtimeRefresh } from './useRealtimeRefresh';
import type { Posture } from '@/lib/db/types';

const TONE_FOR: Record<Posture, string> = {
  'steady':              '#34d39c',
  'elevated':            '#e0b341',
  'crisis':              '#f1707a',
  'national-emergency':  '#f1707a',
  'recovery':            '#5fb0d9',
};

/** PostureBadge — latest posture snapshot for a charter. Pure read,
 *  Realtime-aware. Renders a colored pill with the posture label;
 *  clicks through to /gov/posture. */
export function PostureBadge({ charterId, className = '' }: { charterId: string; className?: string }) {
  const [latest, setLatest] = React.useState<{ posture: Posture; at: string } | null>(null);

  const refresh = React.useCallback(async () => {
    const rows = await listPostureHistoryRows({ charter: charterId, limit: 1 });
    setLatest(rows[0] ? { posture: rows[0].posture, at: rows[0].snapshot_at } : null);
  }, [charterId]);

  React.useEffect(() => { void refresh(); }, [refresh]);

  useRealtimeRefresh(
    React.useMemo(() => [{ table: 'posture_history' as const, filter: `charter_id=eq.${charterId}` }], [charterId]),
    refresh,
  );

  if (!latest) return null;
  const tone = TONE_FOR[latest.posture];
  return (
    <Link
      href="/gov/posture"
      title={`posture · ${latest.posture} · ${new Date(latest.at).toLocaleString()}`}
      className={`inline-flex items-center gap-1 rounded-[3px] border px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-[0.16em] hover:bg-surface-2 ${className}`}
      style={{ borderColor: tone, color: tone }}
    >
      <span aria-hidden>●</span>
      <span>{latest.posture}</span>
    </Link>
  );
}
