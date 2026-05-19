'use client';

// Interior National Apex — Sovereign Stabilization & Constitutional
// Boundaries. Advisory national stabilization orchestration, the
// constitutionally-bounded cross-shell exchange ledger, and national
// civilization memory.

import * as React from 'react';
import { digitalTwin } from '@/lib/gov/national-causality';

export function NationalStabilization({ id, now }: { id: string; now: number }) {
  void id;
  const t = digitalTwin(now);
  return (
    <div className="space-y-2 font-mono">
      <div>
        <div className="px-1 py-1 text-[9px] font-semibold uppercase tracking-[0.2em] text-ink-soft">▌Sovereign stabilization orchestration — advisory</div>
        <div className="border border-line">
          {t.stabilization.length === 0 ? (
            <p className="px-2 py-2 text-[10px]" style={{ color: 'rgb(var(--c-ok))' }}>Nation within continuity tolerance — no stabilization deployment required.</p>
          ) : t.stabilization.map((s, i) => (
            <div key={i} className="flex items-start gap-2 border-b border-line/60 px-2 py-1.5 text-[10px] last:border-0">
              <span className="mt-0.5 rounded-[2px] border border-line px-1 text-[8px] font-semibold uppercase tracking-[0.08em] text-ink-soft">{s.kind}</span>
              <span className="min-w-0 flex-1 text-ink">{s.detail}</span>
              <span className="shrink-0 text-[8px] uppercase tracking-[0.1em] text-ink-muted">advisory</span>
            </div>
          ))}
        </div>
      </div>

      <div>
        <div className="px-1 py-1 text-[9px] font-semibold uppercase tracking-[0.2em] text-ink-soft">▌Cross-shell exchange ledger — constitutional separation preserved</div>
        <div className="border border-line">
          <div className="flex items-center gap-2 border-b border-line bg-black/30 px-2 py-1 text-[8px] font-semibold uppercase tracking-[0.16em] text-ink-muted">
            <span className="w-28 shrink-0">From → To</span>
            <span className="w-24 shrink-0">Data class</span>
            <span className="w-28 shrink-0">Justified·Logged·Audit</span>
            <span className="w-20 shrink-0">Bounded</span>
            <span className="min-w-0 flex-1">Purpose</span>
          </div>
          {t.exchanges.map((x, i) => (
            <div key={i} className="flex items-center gap-2 border-b border-line/50 px-2 py-1 text-[10px] last:border-0">
              <span className="w-28 shrink-0 truncate text-ink">{x.from}→{x.to}</span>
              <span className="w-24 shrink-0 text-[9px]" style={{ color: 'rgb(var(--c-ok))' }}>{x.dataClass}</span>
              <span className="w-28 shrink-0" style={{ color: 'rgb(var(--c-ok))' }}>{x.justified && x.logged && x.auditable ? '✓ ✓ ✓' : '—'}</span>
              <span className="w-20 shrink-0 text-[9px]" style={{ color: x.jurisdictionBounded ? 'rgb(var(--c-ok))' : 'rgb(var(--c-warn))' }}>{x.jurisdictionBounded ? 'bounded' : 'review'}</span>
              <span className="min-w-0 flex-1 truncate text-ink-muted">{x.purpose}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-2 lg:grid-cols-3">
        <div className="border border-line p-2">
          <div className="text-[9px] font-semibold uppercase tracking-[0.16em] text-ink-soft">Recurring crisis cycle</div>
          <div className="mt-0.5 text-[10px]" style={{ color: 'rgb(var(--c-warn))' }}>{t.memory.recurringCrisisCycle}</div>
        </div>
        <div className="border border-line p-2">
          <div className="text-[9px] font-semibold uppercase tracking-[0.16em] text-ink-soft">Chronic failure shells</div>
          {t.memory.chronicFailureShells.length === 0 ? <div className="mt-0.5 text-[10px]" style={{ color: 'rgb(var(--c-ok))' }}>none</div>
            : t.memory.chronicFailureShells.map(s => <div key={s} className="mt-0.5 text-[10px]" style={{ color: 'rgb(var(--c-alert))' }}>{s}</div>)}
        </div>
        <div className="border border-line p-2">
          <div className="text-[9px] font-semibold uppercase tracking-[0.16em] text-ink-soft">Recovery effectiveness</div>
          <div className="mt-0.5 text-[14px] font-semibold tabular-nums" style={{ color: t.memory.recoveryEffectivenessPct >= 60 ? 'rgb(var(--c-ok))' : 'rgb(var(--c-warn))' }}>{t.memory.recoveryEffectivenessPct}%</div>
        </div>
      </div>
      <p className="text-[9px] text-ink-muted">
        The nation behaves as a self-stabilizing constitutional organism. Cross-shell intelligence is posture-only,
        justified, logged and auditable — systemic awareness never violates constitutional separation or citizen protections.
      </p>
    </div>
  );
}
