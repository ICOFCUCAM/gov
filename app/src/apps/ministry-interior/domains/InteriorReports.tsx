'use client';

// Interior infrastructure domain — Reports & Analytics. Consolidated
// reporting derived from the Interior operating engine (deterministic).

import * as React from 'react';
import { interiorOps } from '@/lib/gov/interior-systems';

const tone = (ok: boolean, warn: boolean) =>
  ok ? 'rgb(var(--c-ok))' : warn ? 'rgb(var(--c-warn))' : 'rgb(var(--c-alert))';

export function InteriorReports({ id, now }: { id: string; now: number }) {
  const o = interiorOps(id, now / 4000);
  const rows: { l: string; v: string; c: string }[] = [
    { l: 'Citizens enrolled', v: `${o.identity.enrolledM}M`, c: tone(true, false) },
    { l: 'ID issuance backlog', v: o.identity.issuanceBacklog.toLocaleString(), c: tone(o.identity.issuanceBacklog < 4000, o.identity.issuanceBacklog < 7000) },
    { l: 'Registry uptime', v: `${o.identity.uptimePct}%`, c: tone(o.identity.uptimePct >= 99, o.identity.uptimePct >= 97) },
    { l: 'Border posts open', v: `${o.border.open}/${o.border.posts}`, c: tone(o.border.open >= o.border.posts, true) },
    { l: 'Flagged entries', v: `${o.border.flaggedEntries}`, c: tone(o.border.flaggedEntries < 60, o.border.flaggedEntries < 90) },
    { l: 'Permits pending', v: o.licensing.pending.toLocaleString(), c: tone(o.licensing.pending < 2500, o.licensing.pending < 3500) },
    { l: 'Licensing SLA met', v: `${o.licensing.slaMetPct}%`, c: tone(o.licensing.slaMetPct >= 80, o.licensing.slaMetPct >= 65) },
    { l: 'Coordination cells', v: `${o.coordination.cellsActive}`, c: tone(true, false) },
    { l: 'Public-order index', v: `${o.coordination.publicOrderIndex}`, c: tone(o.coordination.publicOrderIndex >= 70, o.coordination.publicOrderIndex >= 55) },
    { l: 'Internal threat level', v: o.internalThreatLevel.toUpperCase(), c: tone(o.internalThreatLevel === 'low', o.internalThreatLevel === 'guarded' || o.internalThreatLevel === 'elevated') },
  ];
  return (
    <div className="space-y-2">
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
        {rows.map(r => (
          <div key={r.l} className="rounded-[3px] border border-line bg-surface p-2">
            <div className="text-[9px] uppercase tracking-[0.14em] text-ink-muted">{r.l}</div>
            <div className="mt-0.5 text-[15px] font-semibold tabular-nums" style={{ color: r.c }}>{r.v}</div>
          </div>
        ))}
      </div>
      <div className="rounded-[3px] border border-line bg-surface p-2">
        <div className="mb-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-ink-soft">
          Civil-service throughput
        </div>
        {[
          { l: 'Identity verifications / hr', pct: Math.min(100, o.identity.verificationsPerHr / 50), tail: `${o.identity.verificationsPerHr}/hr` },
          { l: 'Permits issued today', pct: Math.min(100, o.licensing.issuedToday / 30), tail: `${o.licensing.issuedToday}` },
          { l: 'Border crossings today', pct: Math.min(100, o.border.crossingsToday / 800), tail: o.border.crossingsToday.toLocaleString() },
        ].map(b => (
          <div key={b.l} className="mb-1 last:mb-0">
            <div className="flex justify-between text-[10px] text-ink-muted">
              <span>{b.l}</span><span className="tabular-nums">{b.tail}</span>
            </div>
            <div className="mt-0.5 h-1.5 overflow-hidden rounded-full bg-surface-2">
              <span className="block h-full rounded-full" style={{ width: `${b.pct}%`, background: '#54d08f' }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
