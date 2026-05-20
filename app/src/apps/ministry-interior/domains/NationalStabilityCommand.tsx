'use client';

// Interior — National Stability Command. The eight role areas Interior
// owns (national stability, policing, identity, borders, emergency
// command, investigations, cyber operations, intelligence fusion) braided
// into one operational apex view, with cross-domain tensions and a
// reinforcement priority queue.

import * as React from 'react';
import Link from 'next/link';
import { nationalStabilityBoard, type StabilityTone, type StabilityPosture } from '@/lib/gov/national-stability';

const COL: Record<StabilityTone, string> = {
  ok: 'rgb(var(--c-ok))', warn: 'rgb(var(--c-warn))', alert: 'rgb(var(--c-alert))',
};
const POSTURE: Record<StabilityPosture, string> = {
  stable: 'rgb(var(--c-ok))', engaged: 'rgb(var(--c-warn))', strained: '#e0673a', critical: 'rgb(var(--c-alert))',
};

export function NationalStabilityCommand({ id, now }: { id: string; now: number }) {
  void id;
  const b = nationalStabilityBoard(now);
  return (
    <div className="space-y-2 font-mono">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 border-y px-3 py-2 text-[11px]"
        style={{ borderColor: `color-mix(in srgb,${POSTURE[b.posture]} 45%,transparent)`, background: 'rgba(0,0,0,0.3)' }}>
        <span className="text-[9px] uppercase tracking-[0.18em] text-ink-muted">National stability posture</span>
        <span className="text-[14px] font-semibold uppercase tracking-[0.12em]" style={{ color: POSTURE[b.posture] }}>{b.posture}</span>
        <span className="text-ink-muted">stability index <span className="font-semibold tabular-nums text-ink">{b.stabilityIndex}</span></span>
        <span className="ml-auto text-[9px] text-ink-muted">alerts {b.alerts} · warns {b.warns} · eight role areas</span>
      </div>

      <div className="border border-line">
        <div className="flex items-center gap-2 border-b border-line bg-black/30 px-2 py-1 text-[8px] font-semibold uppercase tracking-[0.16em] text-ink-muted">
          <span className="w-40 shrink-0">Role area</span>
          <span className="w-14 shrink-0">Index</span>
          <span className="w-44 shrink-0">Headline</span>
          <span className="min-w-0 flex-1">Detail</span>
          <span className="w-28 shrink-0 text-right">Federation</span>
        </div>
        {b.roleAreas.map(r => (
          <div key={r.key} className="flex items-center gap-2 border-b border-line/60 px-2 py-1 text-[10px] last:border-0">
            <span className="flex w-40 shrink-0 items-center gap-2">
              <span className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: COL[r.tone] }} aria-hidden />
              <span className="truncate text-ink">{r.label}</span>
            </span>
            <span className="w-14 shrink-0 tabular-nums" style={{ color: COL[r.tone] }}>{r.index}</span>
            <span className="w-44 shrink-0 truncate text-ink-soft">{r.metric}</span>
            <span className="min-w-0 flex-1 truncate text-ink-muted">{r.detail}</span>
            <Link href={r.federationRoute} className="w-28 shrink-0 truncate text-right text-[9px] text-link underline underline-offset-2">
              {r.federationRoute.replace('/app/interior/', '')} →
            </Link>
          </div>
        ))}
      </div>

      <div>
        <div className="px-1 py-1 text-[9px] font-semibold uppercase tracking-[0.2em] text-ink-soft">▌ Reinforcement priority (worst-first)</div>
        <div className="border border-line">
          {b.reinforcementPriority.map((r, i) => (
            <div key={r.key} className="flex items-center gap-2 border-b border-line/60 px-2 py-1 text-[10px] last:border-0">
              <span className="w-6 shrink-0 text-[9px] uppercase tracking-[0.1em] text-ink-muted">{i + 1}</span>
              <span className="w-40 shrink-0 truncate text-ink">{r.label}</span>
              <span className="w-14 shrink-0 tabular-nums" style={{ color: COL[r.tone] }}>{r.index}</span>
              <span className="min-w-0 flex-1 truncate text-ink-muted">{r.metric}</span>
            </div>
          ))}
        </div>
      </div>

      <div>
        <div className="px-1 py-1 text-[9px] font-semibold uppercase tracking-[0.2em] text-ink-soft">▌ Cross-domain operational tensions</div>
        <div className="border border-line">
          {b.tensions.length === 0 ? (
            <p className="px-2 py-2 text-[10px]" style={{ color: 'rgb(var(--c-ok))' }}>No cross-domain tensions — single-domain command remains sufficient.</p>
          ) : b.tensions.map((t, i) => {
            const col = t.severity === 'critical' ? 'rgb(var(--c-alert))' : t.severity === 'elevated' ? 'rgb(var(--c-warn))' : 'rgb(var(--c-ink-muted))';
            return (
              <div key={i} className="flex items-start gap-2 border-b border-line/60 px-2 py-1.5 text-[10px] last:border-0">
                <span className="mt-0.5 rounded-[2px] border border-line px-1 text-[8px] font-semibold uppercase tracking-[0.08em]" style={{ color: col }}>{t.kind}</span>
                <span className="min-w-0 flex-1 text-ink">{t.rationale}</span>
                <span className="shrink-0 text-[8px] uppercase tracking-[0.1em]" style={{ color: col }}>{t.severity}</span>
              </div>
            );
          })}
        </div>
      </div>
      <p className="text-[9px] text-ink-muted">
        Interior owns eight operational role areas. Each cell drills into its federated sovereign shell; this view
        is read-only orchestration — the source of truth remains in each shell.
      </p>
    </div>
  );
}
