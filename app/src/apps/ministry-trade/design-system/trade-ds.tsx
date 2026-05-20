'use client';

// apps/ministry-trade/design-system — Industrial Corridor design system.
// Visual identity for the Ministry of Trade, Industry & Strategic Production.
// Palette: graphite / brass / industrial-orange / steel-blue / lime / coral.

import * as React from 'react';

export const TRADE_DS = {
  graphite: '#0b0d10',
  graphiteDeep: '#14181f',
  brass: '#c9a24a',
  orange: '#e07a3a',
  steel: '#5fa8d4',
  lime: '#8ad04f',
  coral: '#e0685f',
  ink: '#dde4ec',
  mut: '#7e8696',
  rule: 'rgba(201,162,74,0.20)',
  ruleSoft: 'rgba(201,162,74,0.10)',
} as const;

export type TradeArchetype =
  | 'command' | 'corridor' | 'strategic' | 'commercial'
  | 'supply' | 'foreign' | 'crisis' | 'intelligence' | 'portal' | 'oversight';

const ARCHETYPE: Record<TradeArchetype, { tag: string; glyph: string }> = {
  command:      { tag: 'INDUSTRIAL COMMAND',     glyph: '⌬' },
  corridor:     { tag: 'TRADE CORRIDOR',         glyph: '⌗' },
  strategic:    { tag: 'STRATEGIC PRODUCTION',   glyph: '✦' },
  commercial:   { tag: 'COMMERCIAL CONTINUITY',  glyph: '⌂' },
  supply:       { tag: 'SUPPLY CHAIN',           glyph: '⌖' },
  foreign:      { tag: 'FOREIGN TRADE',          glyph: '◯' },
  crisis:       { tag: 'INDUSTRIAL CRISIS',      glyph: '✕' },
  intelligence: { tag: 'ECONOMIC INTELLIGENCE',  glyph: '↬' },
  portal:       { tag: 'TRADE PORTAL',           glyph: '⬡' },
  oversight:    { tag: 'CONSTITUTIONAL CHECK',   glyph: '§' },
};

export function CorridorFrame({ archetype, code, title, subtitle, posture, children }: {
  archetype: TradeArchetype;
  code: string;
  title: string;
  subtitle?: string;
  posture?: 'productive' | 'engaged' | 'pressured' | 'contraction' | 'industrial-crisis';
  children: React.ReactNode;
}) {
  const a = ARCHETYPE[archetype];
  const postureCol = posture === 'industrial-crisis' ? TRADE_DS.coral
    : posture === 'contraction' ? TRADE_DS.coral
    : posture === 'pressured' ? TRADE_DS.orange
    : posture === 'engaged' ? TRADE_DS.steel
    : TRADE_DS.lime;
  return (
    <section className="rounded-[4px] border"
      style={{
        borderColor: 'rgba(201,162,74,0.22)',
        background: `radial-gradient(110% 60% at 0% 0%, rgba(201,162,74,0.06) 0%, transparent 55%), ${TRADE_DS.graphite}`,
        boxShadow: 'inset 0 0 110px rgba(0,0,0,0.7)',
      }}>
      <header className="flex flex-wrap items-center gap-x-3 gap-y-1 border-b px-3 py-2"
        style={{ borderColor: TRADE_DS.rule }}>
        <span className="grid h-6 w-6 place-items-center rounded-[3px] text-[13px]"
          style={{ background: 'rgba(201,162,74,0.16)', color: TRADE_DS.brass }}
          aria-hidden>{a.glyph}</span>
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-[9px] uppercase tracking-[0.22em]" style={{ color: TRADE_DS.mut, fontFamily: 'ui-monospace, monospace' }}>{code}</span>
            <h2 className="truncate text-[13px] font-semibold tracking-tight" style={{ color: TRADE_DS.ink }}>{title}</h2>
            <span className="rounded-[2px] px-1.5 py-px text-[8px] font-semibold uppercase tracking-[0.16em]"
              style={{ background: 'rgba(201,162,74,0.16)', color: TRADE_DS.brass }}>{a.tag}</span>
          </div>
          {subtitle ? <p className="truncate text-[10px] italic" style={{ color: TRADE_DS.mut }}>{subtitle}</p> : null}
        </div>
        {posture ? (
          <div className="ml-auto flex items-center gap-2 text-[10px]">
            <span style={{ color: TRADE_DS.mut }}>posture</span>
            <span className="font-semibold uppercase tracking-[0.18em]" style={{ color: postureCol }}>{posture}</span>
          </div>
        ) : null}
      </header>
      <div className="space-y-2 p-2">{children}</div>
    </section>
  );
}

export function CorridorKpi({ items }: {
  items: { label: string; value: React.ReactNode; tone?: 'ok' | 'warn' | 'alert' | 'mute' | 'info' }[];
}) {
  const tones = {
    ok: TRADE_DS.lime, warn: TRADE_DS.orange, alert: TRADE_DS.coral,
    mute: TRADE_DS.mut, info: TRADE_DS.steel,
  } as const;
  return (
    <div className="grid grid-cols-2 gap-1 md:grid-cols-4">
      {items.map(k => (
        <div key={k.label} className="border px-2 py-1.5"
          style={{ borderColor: TRADE_DS.rule, background: 'rgba(255,255,255,0.012)' }}>
          <div className="text-[9px] uppercase tracking-[0.18em]" style={{ color: TRADE_DS.mut, fontFamily: 'ui-monospace, monospace' }}>{k.label}</div>
          <div className="text-[14px] font-semibold tabular-nums" style={{ color: k.tone ? tones[k.tone] : TRADE_DS.brass }}>{k.value}</div>
        </div>
      ))}
    </div>
  );
}

export function CorridorRule({ label }: { label?: string }) {
  return (
    <div className="flex items-center gap-2 py-0.5">
      <div className="h-px flex-1" style={{ background: TRADE_DS.rule }} />
      {label ? <span className="text-[9px] uppercase tracking-[0.22em]" style={{ color: TRADE_DS.mut, fontFamily: 'ui-monospace, monospace' }}>{label}</span> : null}
      <div className="h-px flex-1" style={{ background: TRADE_DS.rule }} />
    </div>
  );
}

export function TradeBar({ label, pct, tone, tail }: {
  label: string; pct: number;
  tone: 'ok' | 'warn' | 'alert' | 'mute' | 'info';
  tail?: React.ReactNode;
}) {
  const tones = {
    ok: TRADE_DS.lime, warn: TRADE_DS.orange, alert: TRADE_DS.coral,
    mute: TRADE_DS.mut, info: TRADE_DS.steel,
  } as const;
  return (
    <div className="grid grid-cols-[220px_1fr_80px_140px] gap-3 border-b py-1.5 text-[11px]"
      style={{ borderColor: TRADE_DS.ruleSoft, fontFamily: 'ui-monospace, monospace' }}>
      <span style={{ color: TRADE_DS.brass }}>{label}</span>
      <div className="h-1.5 self-center" style={{ background: TRADE_DS.graphiteDeep }}>
        <div className="h-full" style={{ width: `${Math.min(100, Math.max(0, pct))}%`, background: tones[tone] }} />
      </div>
      <span className="text-right tabular-nums" style={{ color: TRADE_DS.mut }}>{pct}%</span>
      <span className="text-right" style={{ color: tones[tone] }}>{tail}</span>
    </div>
  );
}

export function CorridorCallout({ kicker, body }: { kicker: string; body: string }) {
  return (
    <div className="rounded-[3px] border border-dashed px-3 py-2 text-[10.5px] italic"
      style={{ borderColor: 'rgba(201,162,74,0.32)', color: TRADE_DS.mut, background: 'rgba(201,162,74,0.04)' }}>
      <span className="not-italic font-semibold uppercase tracking-[0.18em]" style={{ color: TRADE_DS.brass }}>{kicker}</span>
      {' — '}{body}
    </div>
  );
}

export function CorridorSeal({ maxim }: { maxim: string }) {
  return (
    <div className="flex items-center justify-between rounded-[3px] border px-3 py-1.5 text-[10px]"
      style={{ borderColor: TRADE_DS.rule, background: 'rgba(201,162,74,0.04)' }}>
      <span className="uppercase tracking-[0.22em]" style={{ color: TRADE_DS.brass, fontFamily: 'ui-monospace, monospace' }}>MINISTRY OF TRADE · INDUSTRIAL CORRIDOR</span>
      <span className="italic" style={{ color: TRADE_DS.mut }}>{maxim}</span>
    </div>
  );
}
