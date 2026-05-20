'use client';

// Interior — Event Propagation. For the highest-severity active incidents
// show the inter-ministry cascade: which ministries are engaged, the
// effect each one absorbs, the propagation delay & live status.

import * as React from 'react';
import { eventStreamBoard, type MinistryEffect } from '@/lib/gov/sovereign-events';

const EFF_COL: Record<MinistryEffect['status'], string> = {
  pending: 'rgb(var(--c-warn))', engaged: '#e0a23a', cleared: 'rgb(var(--c-ok))',
};

export function EventPropagation({ id, now }: { id: string; now: number }) {
  void id;
  const b = eventStreamBoard(now);
  const top = b.incidents.filter(i => i.severity === 'critical' || i.severity === 'national').slice(0, 6);
  return (
    <div className="space-y-2 font-mono">
      <div className="border-y border-line bg-black/30 px-3 py-1.5 text-[10px] text-ink-muted">
        Inter-ministry propagation — sovereign events propagate to Health · Treasury · Transport · Energy ·
        Emergency · Justice · National Coordination. Source of truth stays in each ministry.
      </div>

      <div>
        <div className="px-1 py-1 text-[9px] font-semibold uppercase tracking-[0.2em] text-ink-soft">▌ Ministries currently engaged</div>
        <div className="flex flex-wrap gap-1 border border-line p-2">
          {b.ministriesActive.length === 0 ? <span className="text-[10px]" style={{ color: 'rgb(var(--c-ok))' }}>No ministries engaged this epoch</span> :
            b.ministriesActive.map(m => (
              <span key={m.ministry} className="rounded-[2px] border px-1.5 py-px text-[10px]"
                style={{ borderColor: 'color-mix(in srgb,#e0a23a 40%,transparent)', color: '#e0a23a' }}>
                {m.ministry} · {m.engaged}
              </span>
            ))}
        </div>
      </div>

      {top.length === 0 ? (
        <p className="border border-line px-2 py-2 text-[10px]" style={{ color: 'rgb(var(--c-ok))' }}>
          No critical or national-tier incident in the active window — single-shell command remains sufficient.
        </p>
      ) : (
        <div className="space-y-2">
          {top.map(i => (
            <div key={i.id} className="border border-line">
              <div className="flex items-center gap-2 border-b border-line bg-black/35 px-2 py-1 text-[10px]">
                <span className="font-mono tabular-nums text-ink-muted">{i.id}</span>
                <span className="font-semibold text-ink">{i.kind}</span>
                <span className="text-ink-muted">· {i.region}</span>
                <span className="ml-auto text-[9px] font-semibold uppercase tracking-[0.08em]"
                  style={{ color: i.severity === 'national' ? 'rgb(var(--c-alert))' : i.severity === 'critical' ? '#e0673a' : 'rgb(var(--c-warn))' }}>
                  {i.severity}
                </span>
              </div>
              <div className="px-2 py-1.5 text-[10px] text-ink-soft">{i.rationale}</div>
              <div className="border-t border-line/60">
                <div className="flex items-center gap-2 border-b border-line/60 bg-black/15 px-2 py-1 text-[8px] font-semibold uppercase tracking-[0.16em] text-ink-muted">
                  <span className="w-44 shrink-0">Ministry</span>
                  <span className="min-w-0 flex-1">Effect</span>
                  <span className="w-20 shrink-0">Delay</span>
                  <span className="w-20 shrink-0 text-right">Status</span>
                </div>
                {i.propagation.map((e, idx) => (
                  <div key={idx} className="flex items-center gap-2 border-b border-line/40 px-2 py-1 text-[10px] last:border-0">
                    <span className="w-44 shrink-0 truncate text-ink">{e.ministry}</span>
                    <span className="min-w-0 flex-1 truncate text-ink-soft">{e.effect}</span>
                    <span className="w-20 shrink-0 tabular-nums text-ink-muted">+{e.delayHrs}h</span>
                    <span className="w-20 shrink-0 text-right text-[9px] font-semibold uppercase tracking-[0.08em]" style={{ color: EFF_COL[e.status] }}>{e.status}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
