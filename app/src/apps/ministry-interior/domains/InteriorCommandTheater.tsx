'use client';

// Interior — Command Theater. Dense tactical view of the national event
// stream: posture banner, incident pulse strip, regional sector grid and
// the active-incident table with live escalation rail. Dark graphite,
// amber & red operational accents.

import * as React from 'react';
import {
  eventStreamBoard,
  type Severity,
  type EscalationStage,
  type SovereignIncident,
} from '@/lib/gov/sovereign-events';

const SEV_COL: Record<Severity, string> = {
  advisory: 'rgb(var(--c-warn))',
  elevated: '#e0a23a',
  critical: '#e0673a',
  national: 'rgb(var(--c-alert))',
};
const POSTURE_COL: Record<string, string> = {
  STABLE: 'rgb(var(--c-ok))', ENGAGED: 'rgb(var(--c-warn))', ELEVATED: '#e0a23a', CRITICAL: 'rgb(var(--c-alert))',
};
const STAGE_ORDER: EscalationStage[] = [
  'detected', 'verified', 'tactical-response', 'regional-escalation',
  'national-coordination', 'contained', 'recovery',
];

function PulseDot({ inc }: { inc: SovereignIncident }) {
  return (
    <span
      title={`${inc.id} · ${inc.kind} · ${inc.region} · ${inc.severity}`}
      className={`inline-block h-2 w-2 rounded-full ${inc.severity === 'national' || inc.severity === 'critical' ? 'animate-pulse' : ''}`}
      style={{ background: SEV_COL[inc.severity] }}
      aria-hidden
    />
  );
}

export function InteriorCommandTheater({ id, now }: { id: string; now: number }) {
  void id;
  const b = eventStreamBoard(now);
  return (
    <div className="space-y-2 font-mono"
      style={{ background: 'radial-gradient(120% 80% at 0% 0%, rgba(224,103,58,0.06) 0%, transparent 55%)' }}>
      {/* Posture banner */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 border-y px-3 py-2 text-[11px]"
        style={{ borderColor: `color-mix(in srgb,${POSTURE_COL[b.postureBanner]} 50%,transparent)`, background: 'rgba(0,0,0,0.35)' }}>
        <span className="text-[9px] uppercase tracking-[0.2em] text-ink-muted">National posture</span>
        <span className="text-[16px] font-bold uppercase tracking-[0.14em]" style={{ color: POSTURE_COL[b.postureBanner] }}>{b.postureBanner}</span>
        <span className="text-ink-muted">active <span className="font-semibold text-ink tabular-nums">{b.totalActive}</span></span>
        <span className="text-ink-muted">critical <span className="font-semibold tabular-nums" style={{ color: '#e0673a' }}>{b.criticalCount}</span></span>
        <span className="text-ink-muted">national-tier <span className="font-semibold tabular-nums" style={{ color: 'rgb(var(--c-alert))' }}>{b.nationalCount}</span></span>
        <span className="ml-auto flex items-center gap-1">
          {b.incidents.slice(0, 12).map(i => <PulseDot key={i.id} inc={i} />)}
        </span>
      </div>

      {/* Regional sector grid */}
      <div>
        <div className="px-1 py-1 text-[9px] font-semibold uppercase tracking-[0.2em] text-ink-soft">▌ Regional sectors — territorial heat</div>
        <div className="grid grid-cols-2 gap-px border border-line bg-line sm:grid-cols-3 lg:grid-cols-6">
          {b.byRegion.map(r => {
            const intensity = Math.min(1, r.criticalCount * 0.4 + r.count * 0.08);
            const col = r.criticalCount > 0 ? 'rgb(var(--c-alert))' : r.count > 0 ? '#e0a23a' : 'rgb(var(--c-ok))';
            return (
              <div key={r.region} className="px-2 py-1.5"
                style={{ background: `color-mix(in srgb,${col} ${Math.round(intensity * 32)}%,#03070f)` }}>
                <div className="text-[8px] uppercase tracking-[0.16em] text-ink-muted">{r.region}</div>
                <div className="mt-0.5 text-[14px] font-semibold tabular-nums text-ink">{r.count}</div>
                <div className="text-[8.5px]" style={{ color: r.criticalCount ? 'rgb(var(--c-alert))' : 'rgb(var(--c-ok))' }}>
                  {r.criticalCount} critical
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Active incidents table with escalation rail */}
      <div className="border border-line">
        <div className="flex items-center gap-2 border-b border-line bg-black/35 px-2 py-1 text-[8px] font-semibold uppercase tracking-[0.16em] text-ink-muted">
          <span className="w-20 shrink-0">Incident</span>
          <span className="w-28 shrink-0">Kind</span>
          <span className="w-28 shrink-0">Region</span>
          <span className="w-20 shrink-0">Severity</span>
          <span className="min-w-0 flex-1">Escalation rail</span>
          <span className="w-24 shrink-0 text-right">Status</span>
        </div>
        <div className="max-h-[440px] overflow-y-auto">
          {b.incidents.map(i => {
            const cur = STAGE_ORDER.indexOf(i.escalationStage);
            return (
              <div key={i.id} className="flex items-center gap-2 border-b border-line/60 px-2 py-1 text-[10px] last:border-0">
                <span className="w-20 shrink-0 truncate tabular-nums text-ink-muted">{i.id}</span>
                <span className="w-28 shrink-0 truncate text-[9px] uppercase tracking-[0.06em] text-ink-soft">{i.kind}</span>
                <span className="w-28 shrink-0 truncate text-ink">{i.region}</span>
                <span className="w-20 shrink-0 text-[9px] font-semibold uppercase tracking-[0.08em]" style={{ color: SEV_COL[i.severity] }}>{i.severity}</span>
                <span className="flex min-w-0 flex-1 items-center gap-px">
                  {STAGE_ORDER.map((_, idx) => (
                    <span key={idx} className="h-2 min-w-0 flex-1"
                      style={{ background: idx <= cur ? SEV_COL[i.severity] : 'rgb(var(--c-line))', opacity: idx <= cur ? 1 : 0.35 }}
                      title={STAGE_ORDER[idx]} />
                  ))}
                </span>
                <span className="w-24 shrink-0 text-right text-[9px] uppercase tracking-[0.08em]"
                  style={{ color: i.status === 'open' || i.status === 'escalating' ? SEV_COL[i.severity] : 'rgb(var(--c-ok))' }}>
                  {i.status}
                </span>
              </div>
            );
          })}
        </div>
      </div>
      <p className="text-[9px] text-ink-muted">
        Tactical view only — every incident remains owned by its federated operational shell. The escalation rail
        traverses detected → verified → tactical-response → regional-escalation → national-coordination → contained → recovery.
      </p>
    </div>
  );
}
