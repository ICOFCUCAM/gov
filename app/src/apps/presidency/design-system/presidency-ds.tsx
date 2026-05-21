'use client';

// apps/presidency/design-system — Executive Mansion design system.
// Palette: midnight navy, gold leaf, parchment, jade, crimson.

import * as React from 'react';

export const PRESIDENCY_DS = {
  midnight: '#0a1326',
  midnightDeep: '#142042',
  gold: '#c9a24a',
  goldLeaf: '#e0b95e',
  parchment: '#ebdcb8',
  parchmentInk: '#dfd0a6',
  jade: '#5a8a5c',
  crimson: '#a01c25',
  mut: '#7e8aa0',
  rule: 'rgba(201,162,74,0.24)',
  ruleSoft: 'rgba(201,162,74,0.10)',
} as const;

export type PresidencyArchetype =
  | 'cabinet' | 'orders' | 'resolutions' | 'engagements'
  | 'security' | 'ministers' | 'address' | 'transparency' | 'continuity' | 'safeguards';

const ARCHETYPE: Record<PresidencyArchetype, { tag: string; glyph: string }> = {
  cabinet:      { tag: 'CABINET FLOOR',           glyph: '◈' },
  orders:       { tag: 'EXECUTIVE ORDERS',        glyph: '✎' },
  resolutions:  { tag: 'CABINET RESOLUTIONS',     glyph: '☷' },
  engagements:  { tag: 'STATE ENGAGEMENTS',       glyph: '◯' },
  security:     { tag: 'NATIONAL SECURITY',       glyph: '⌖' },
  ministers:    { tag: 'MINISTERIAL CORPS',       glyph: '⌬' },
  address:      { tag: 'CITIZEN ADDRESS',         glyph: '⌇' },
  transparency: { tag: 'TRANSPARENCY',            glyph: '✚' },
  continuity:   { tag: 'PRESIDENTIAL CONTINUITY', glyph: '↬' },
  safeguards:   { tag: 'CONSTITUTIONAL CHECK',    glyph: '§' },
};

export function MansionFrame({ archetype, code, title, subtitle, posture, children }: {
  archetype: PresidencyArchetype;
  code: string;
  title: string;
  subtitle?: string;
  posture?: 'governing' | 'cabinet-in-session' | 'national-address' | 'state-visit' | 'crisis-stewardship';
  children: React.ReactNode;
}) {
  const a = ARCHETYPE[archetype];
  const postureCol = posture === 'crisis-stewardship' ? PRESIDENCY_DS.crimson
    : posture === 'state-visit' ? PRESIDENCY_DS.goldLeaf
    : posture === 'national-address' ? PRESIDENCY_DS.parchment
    : posture === 'cabinet-in-session' ? PRESIDENCY_DS.gold
    : PRESIDENCY_DS.jade;
  return (
    <section className="rounded-[4px] border"
      style={{
        borderColor: 'rgba(201,162,74,0.26)',
        background: `radial-gradient(110% 60% at 0% 0%, rgba(201,162,74,0.08) 0%, transparent 55%), ${PRESIDENCY_DS.midnight}`,
        boxShadow: 'inset 0 0 110px rgba(0,0,0,0.7)',
      }}>
      <header className="flex flex-wrap items-center gap-x-3 gap-y-1 border-b px-3 py-2"
        style={{ borderColor: PRESIDENCY_DS.rule }}>
        <span className="grid h-6 w-6 place-items-center rounded-[3px] text-[13px]"
          style={{ background: 'rgba(201,162,74,0.18)', color: PRESIDENCY_DS.gold }} aria-hidden>{a.glyph}</span>
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-[9px] uppercase tracking-[0.22em]" style={{ color: PRESIDENCY_DS.mut, fontFamily: 'ui-monospace, monospace' }}>{code}</span>
            <h2 className="truncate text-[13px] font-semibold tracking-tight" style={{ color: PRESIDENCY_DS.parchment, fontFamily: 'Georgia, ui-serif, serif' }}>{title}</h2>
            <span className="rounded-[2px] px-1.5 py-px text-[8px] font-semibold uppercase tracking-[0.16em]"
              style={{ background: 'rgba(201,162,74,0.16)', color: PRESIDENCY_DS.gold }}>{a.tag}</span>
          </div>
          {subtitle ? <p className="truncate text-[10px] italic" style={{ color: PRESIDENCY_DS.mut }}>{subtitle}</p> : null}
        </div>
        {posture ? (
          <div className="ml-auto flex items-center gap-2 text-[10px]">
            <span style={{ color: PRESIDENCY_DS.mut }}>posture</span>
            <span className="font-semibold uppercase tracking-[0.18em]" style={{ color: postureCol }}>{posture}</span>
          </div>
        ) : null}
      </header>
      <div className="space-y-2 p-2">{children}</div>
    </section>
  );
}

export function MansionKpi({ items }: {
  items: { label: string; value: React.ReactNode; tone?: 'ok' | 'warn' | 'alert' | 'mute' | 'info' }[];
}) {
  const tones = {
    ok: PRESIDENCY_DS.jade, warn: PRESIDENCY_DS.gold, alert: PRESIDENCY_DS.crimson,
    mute: PRESIDENCY_DS.mut, info: PRESIDENCY_DS.parchment,
  } as const;
  return (
    <div className="grid grid-cols-2 gap-1 md:grid-cols-4">
      {items.map(k => (
        <div key={k.label} className="border px-2 py-1.5"
          style={{ borderColor: PRESIDENCY_DS.rule, background: 'rgba(255,255,255,0.012)' }}>
          <div className="text-[9px] uppercase tracking-[0.18em]" style={{ color: PRESIDENCY_DS.mut, fontFamily: 'ui-monospace, monospace' }}>{k.label}</div>
          <div className="text-[14px] font-semibold tabular-nums" style={{ color: k.tone ? tones[k.tone] : PRESIDENCY_DS.goldLeaf }}>{k.value}</div>
        </div>
      ))}
    </div>
  );
}

export function MansionRule({ label }: { label?: string }) {
  return (
    <div className="flex items-center gap-2 py-0.5">
      <div className="h-px flex-1" style={{ background: PRESIDENCY_DS.rule }} />
      {label ? <span className="text-[9px] uppercase tracking-[0.22em]" style={{ color: PRESIDENCY_DS.mut, fontFamily: 'ui-monospace, monospace' }}>{label}</span> : null}
      <div className="h-px flex-1" style={{ background: PRESIDENCY_DS.rule }} />
    </div>
  );
}

export function MansionBar({ label, pct, tone, tail }: {
  label: string; pct: number;
  tone: 'ok' | 'warn' | 'alert' | 'mute' | 'info';
  tail?: React.ReactNode;
}) {
  const tones = {
    ok: PRESIDENCY_DS.jade, warn: PRESIDENCY_DS.gold, alert: PRESIDENCY_DS.crimson,
    mute: PRESIDENCY_DS.mut, info: PRESIDENCY_DS.parchment,
  } as const;
  return (
    <div className="grid grid-cols-[220px_1fr_80px_140px] gap-3 border-b py-1.5 text-[11px]"
      style={{ borderColor: PRESIDENCY_DS.ruleSoft, fontFamily: 'ui-monospace, monospace' }}>
      <span style={{ color: PRESIDENCY_DS.goldLeaf }}>{label}</span>
      <div className="h-1.5 self-center" style={{ background: PRESIDENCY_DS.midnightDeep }}>
        <div className="h-full" style={{ width: `${Math.min(100, Math.max(0, pct))}%`, background: tones[tone] }} />
      </div>
      <span className="text-right tabular-nums" style={{ color: PRESIDENCY_DS.mut }}>{pct}%</span>
      <span className="text-right" style={{ color: tones[tone] }}>{tail}</span>
    </div>
  );
}

export function MansionCallout({ kicker, body }: { kicker: string; body: string }) {
  return (
    <div className="rounded-[3px] border border-dashed px-3 py-2 text-[10.5px] italic"
      style={{ borderColor: 'rgba(201,162,74,0.32)', color: PRESIDENCY_DS.mut, background: 'rgba(201,162,74,0.04)' }}>
      <span className="not-italic font-semibold uppercase tracking-[0.18em]" style={{ color: PRESIDENCY_DS.goldLeaf }}>{kicker}</span>
      {' — '}{body}
    </div>
  );
}

export function MansionSeal({ maxim }: { maxim: string }) {
  return (
    <div className="flex items-center justify-between rounded-[3px] border px-3 py-1.5 text-[10px]"
      style={{ borderColor: PRESIDENCY_DS.rule, background: 'rgba(201,162,74,0.04)' }}>
      <span className="uppercase tracking-[0.22em]" style={{ color: PRESIDENCY_DS.goldLeaf, fontFamily: 'ui-monospace, monospace' }}>OFFICE OF THE PRESIDENT · CABINET</span>
      <span className="italic" style={{ color: PRESIDENCY_DS.mut, fontFamily: 'Georgia, ui-serif, serif' }}>{maxim}</span>
    </div>
  );
}
