'use client';

// Shared federated-app UI kit. Execution surfaces, not dashboards:
// terse operational cells, load bars and panels reused by every
// institutional application so apps stay thin and consistent.

import * as React from 'react';

export const ac = (t: 'ok' | 'warn' | 'alert') => `rgb(var(--c-${t}))`;

export function Stat({ l, v, t }: { l: string; v: string; t?: 'ok' | 'warn' | 'alert' }) {
  return (
    <div className="rounded-[3px] border border-line bg-surface px-3 py-2">
      <div className="truncate text-[8px] font-semibold uppercase tracking-[0.16em] text-ink-muted">{l}</div>
      <div className="font-mono text-[15px] tabular-nums" style={{ color: t ? ac(t) : 'rgb(var(--c-ink))' }}>{v}</div>
    </div>
  );
}

export function StatGrid({ items }: { items: { l: string; v: string; t?: 'ok' | 'warn' | 'alert' }[] }) {
  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-6">
      {items.map(s => <Stat key={s.l} {...s} />)}
    </div>
  );
}

export function Bars({ rows }: { rows: { label: string; pct: number; tone: 'ok' | 'warn' | 'alert'; tail?: string }[] }) {
  return (
    <div className="space-y-1">
      {rows.map(r => (
        <div key={r.label} className="flex items-center gap-2 text-[10px]">
          <span className="w-32 shrink-0 truncate text-ink-soft">{r.label}</span>
          <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-surface-2"><span className="block h-full" style={{ width: `${Math.max(0, Math.min(100, r.pct))}%`, backgroundColor: ac(r.tone) }} /></div>
          <span className="w-16 shrink-0 text-right font-mono tabular-nums" style={{ color: ac(r.tone) }}>{r.tail ?? String(r.pct)}</span>
        </div>
      ))}
    </div>
  );
}

export function Panel({ title, meta, children }: { title: string; meta?: string; children: React.ReactNode }) {
  return (
    <section className="rounded-[3px] border border-line bg-surface">
      <div className="flex items-center justify-between gap-2 border-b border-line px-2.5 py-1.5">
        <h3 className="text-[10px] font-semibold uppercase tracking-[0.16em] text-ink-soft">{title}</h3>
        {meta ? <span className="text-[10px] text-ink-muted">{meta}</span> : null}
      </div>
      <div className="p-2.5">{children}</div>
    </section>
  );
}

export function PosturePill({ label, tone }: { label: string; tone: 'ok' | 'warn' | 'alert' }) {
  return (
    <span className="rounded-[3px] px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-[0.14em]"
      style={{ backgroundColor: `color-mix(in srgb, ${ac(tone)} 16%, transparent)`, color: ac(tone) }}>
      {label}
    </span>
  );
}
