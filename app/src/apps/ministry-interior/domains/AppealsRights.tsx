'use client';

// Interior Procedural Execution — Appeals & Rights Protection. Lawful
// citizen recourse: immutable appeal chains, enforced review timelines,
// and unresolved/overdue appeals exposed so nothing is silently dismissed.

import * as React from 'react';
import { proceduralLedger, proceduralBoard } from '@/lib/gov/procedural-execution';

export function AppealsRights({ id, now }: { id: string; now: number }) {
  void id;
  const b = proceduralBoard(now);
  const appeals = proceduralLedger(now).filter(f => f.appeal)
    .sort((a, x) => Number(a.appeal!.resolved) - Number(x.appeal!.resolved) || x.appeal!.filedHrsAgo - a.appeal!.filedHrsAgo);

  return (
    <div className="space-y-2 font-mono">
      <div className="flex flex-wrap items-stretch divide-x divide-line border-y border-line bg-black/30">
        <div className="min-w-[140px] flex-1 px-3 py-1.5">
          <div className="text-[8px] uppercase tracking-[0.16em] text-ink-muted">Active appeals</div>
          <div className="mt-0.5 text-[17px] font-semibold tabular-nums text-ink">{b.appealed}</div>
        </div>
        <div className="min-w-[140px] flex-1 px-3 py-1.5">
          <div className="text-[8px] uppercase tracking-[0.16em] text-ink-muted">Unresolved</div>
          <div className="mt-0.5 text-[17px] font-semibold tabular-nums" style={{ color: b.unresolvedAppeals ? 'rgb(var(--c-warn))' : 'rgb(var(--c-ok))' }}>{b.unresolvedAppeals}</div>
        </div>
        <div className="min-w-[140px] flex-1 px-3 py-1.5">
          <div className="text-[8px] uppercase tracking-[0.16em] text-ink-muted">Overdue review</div>
          <div className="mt-0.5 text-[17px] font-semibold tabular-nums" style={{ color: b.overdueAppeals ? 'rgb(var(--c-alert))' : 'rgb(var(--c-ok))' }}>{b.overdueAppeals}</div>
        </div>
        <div className="min-w-[220px] flex-[2] px-3 py-1.5">
          <div className="text-[8px] uppercase tracking-[0.16em] text-ink-muted">Guarantee</div>
          <div className="mt-0.5 text-[10px] text-ink-soft">No silent dismissal — immutable appeal chains, enforced timelines.</div>
        </div>
      </div>

      <div className="border border-line">
        <div className="flex items-center gap-2 border-b border-line bg-black/30 px-2 py-1 text-[8px] font-semibold uppercase tracking-[0.16em] text-ink-muted">
          <span className="w-20 shrink-0">File</span>
          <span className="w-36 shrink-0">Office</span>
          <span className="w-28 shrink-0">Filed / deadline</span>
          <span className="w-24 shrink-0">State</span>
          <span className="min-w-0 flex-1">Immutable appeal chain</span>
        </div>
        <div className="max-h-[440px] overflow-y-auto">
          {appeals.length === 0 ? (
            <p className="px-2 py-2 text-[10px]" style={{ color: 'rgb(var(--c-ok))' }}>No appeals filed in the active window.</p>
          ) : appeals.map(f => {
            const a = f.appeal!;
            const state = a.resolved ? 'resolved' : a.overdue ? 'OVERDUE' : 'under review';
            const col = a.resolved ? 'rgb(var(--c-ok))' : a.overdue ? 'rgb(var(--c-alert))' : '#8a7df0';
            return (
              <div key={f.id} className="flex items-center gap-2 border-b border-line/50 px-2 py-1 text-[10px] last:border-0">
                <span className="w-20 shrink-0 truncate tabular-nums text-ink-muted">{f.id}</span>
                <span className="w-36 shrink-0 truncate text-ink">{f.office}</span>
                <span className="w-28 shrink-0 tabular-nums text-ink-soft">{a.filedHrsAgo}h / {a.reviewDeadlineHrs}h</span>
                <span className="w-24 shrink-0 text-[9px] font-semibold uppercase tracking-[0.06em]" style={{ color: col }}>{state}</span>
                <span className="min-w-0 flex-1 truncate text-ink-muted">
                  {a.chain.map(c => `${c.step} (−${c.atHrsAgo}h)`).join('  ▸  ')}
                </span>
              </div>
            );
          })}
        </div>
      </div>
      <p className="text-[9px] text-ink-muted">
        Citizens may appeal decisions, challenge delays, escalate abuse, request review and report corruption.
        Overdue reviews escalate automatically to oversight — procedural fairness is tracked, not optional.
      </p>
    </div>
  );
}
