'use client';

// What the branch screens (/gov/branches, /gov/branch/[key]) read from the
// branches' own records instead of the reference model:
//   - the legislature's bills (lib/legislature/register.ts, GET /api/legislature/bills:
//     the full record for its officials, the public record for everyone else)
//   - the courts' public cause list (lib/courts/hearings.ts, GET /api/courts/cause-list:
//     hearings by case number, never parties or subject; a court's case files stay
//     closed to every other institution, so no other count of court cases is read)
// and the tile every branch figure is drawn in, marked by where it comes from
// (lib/twin/signal.ts): a record unmarked, a generated figure Sample in demo and
// training and "Not connected" in production (lib/twin/generated.ts).

import * as React from 'react';
import { TONE, Spark, waveSeries } from '@/components/features/SituationRoom';
import { useTile } from '@/components/ui/Generated';
import type { SignalKind } from '@/lib/twin/signal';

interface BillRow { state: string; journal?: { kind: string; date: string }[] }

export interface BranchRecords {
  /** The bills this official may read; null until read, or when the read failed. */
  bills: BillRow[] | null;
  /** Hearings on the public cause list in the next seven days; null until read, or when the read failed. */
  hearings: number | null;
}

export const BILLS_SOURCE = 'The legislature\'s record of bills (GET /api/legislature/bills), as far as this official may read it';
export const HEARINGS_SOURCE = 'The courts\' public cause list for the next 7 days (GET /api/courts/cause-list)';

/** Reads the legislature's bills and the courts' cause list once. */
export function useBranchRecords(): BranchRecords {
  const [r, setR] = React.useState<BranchRecords>({ bills: null, hearings: null });
  React.useEffect(() => {
    let live = true;
    const json = (u: string) => fetch(u, { cache: 'no-store' }).then(x => (x.ok ? x.json() : null)).catch(() => null);
    void Promise.all([json('/api/legislature/bills'), json('/api/courts/cause-list?days=7')]).then(([b, c]) => {
      if (!live) return;
      setR({
        bills: Array.isArray(b?.bills) ? (b.bills as BillRow[]) : null,
        hearings: Array.isArray(c?.hearings) ? (c.hearings as unknown[]).length : null,
      });
    });
    return () => { live = false; };
  }, []);
  return r;
}

/** Counts from the legislature's record: in progress, published this year, all. */
export function billCounts(bills: BillRow[], year = new Date().getFullYear()): { inProgress: number; publishedThisYear: number; total: number } {
  const y = String(year);
  return {
    inProgress: bills.filter(b => b.state === 'in-progress').length,
    publishedThisYear: bills.filter(b => b.state === 'published' && (b.journal ?? []).some(j => j.kind === 'publication' && j.date.startsWith(y))).length,
    total: bills.length,
  };
}

export interface BranchFigure { l: string; v: string; t: string; k: string; kind: SignalKind; src?: string }

/** A record figure, or "Not connected" when its register could not be read. */
export function recordFigure(l: string, k: string, value: number | null, src: string, t = 'ok'): BranchFigure {
  return value === null ? { l, v: '—', t: 'neutral', k, kind: 'unavailable', src: `${src}: not read` } : { l, v: String(value), t, k, kind: 'record', src };
}

/** One branch headline tile. Generated sparklines are drawn only beside generated figures that are shown. */
export function BranchTile({ m, sparkKey, ts, size = 'lg' }: { m: BranchFigure; sparkKey?: string; ts?: number; size?: 'lg' | 'sm' }) {
  const tile = useTile(m.v, m.kind, m.src);
  const generatedShown = !tile.folded && (m.kind === 'sample' || m.kind === 'simulated');
  return (
    <div className="rounded-[3px] border border-line bg-surface px-3 py-2" style={{ boxShadow: 'inset 0 1px 0 rgba(55,199,212,0.06)' }} data-generated={tile.folded ? 'not-connected' : undefined}>
      <div className="flex items-center gap-1 text-[8px] font-semibold uppercase tracking-[0.16em] text-ink-muted"><span className="truncate">{m.l}</span>{tile.marker}</div>
      <div className={`truncate font-mono leading-tight tabular-nums ${tile.folded || m.kind === 'unavailable' ? 'text-[11px] text-ink-muted' : size === 'lg' ? 'text-lg' : 'text-[14px]'}`}
        style={tile.folded || m.kind === 'unavailable' ? undefined : { color: TONE[m.t] }}>{tile.value}</div>
      {generatedShown && sparkKey && ts !== undefined ? <div className="-mb-1 h-5 overflow-hidden opacity-80"><Spark pts={waveSeries(sparkKey, ts, 16, 35, 92)} tone={m.t} /></div> : null}
    </div>
  );
}
