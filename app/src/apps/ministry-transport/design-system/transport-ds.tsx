'use client';

// apps/ministry-transport/design-system — Corridor Map design system.
// Visual identity for the Ministry of Transport & National Logistics.
// Palette: asphalt / signal-amber / harbour-blue / rail-green / coral.

import * as React from 'react';

export const TRANSPORT_DS = {
  asphalt: '#0a0c0e',
  asphaltDeep: '#13161a',
  signal: '#e0a13a',
  signalDim: '#7e5a22',
  harbour: '#5fc4f0',
  rail: '#6fcf6a',
  runway: '#8a7df0',
  coral: '#e0685f',
  ink: '#e0e4ec',
  mut: '#7e8a98',
  rule: 'rgba(95,196,240,0.18)',
  ruleSoft: 'rgba(95,196,240,0.08)',
} as const;

export type TransportArchetype =
  | 'mobility' | 'corridor' | 'maritime' | 'rail'
  | 'aviation' | 'logistics' | 'infrastructure'
  | 'emergency' | 'intelligence' | 'portal' | 'oversight';

const ARCHETYPE: Record<TransportArchetype, { tag: string; glyph: string }> = {
  mobility:       { tag: 'MOBILITY COMMAND',     glyph: '⌬' },
  corridor:       { tag: 'CORRIDOR FLOW',        glyph: '⌗' },
  maritime:       { tag: 'MARITIME LANE',        glyph: '⌭' },
  rail:           { tag: 'RAIL CORRIDOR',        glyph: '═' },
  aviation:       { tag: 'AIRSPACE',             glyph: '✈' },
  logistics:      { tag: 'LOGISTICS LANE',       glyph: '⌖' },
  infrastructure: { tag: 'INFRASTRUCTURE',       glyph: '⌂' },
  emergency:      { tag: 'EMERGENCY OPS',        glyph: '✕' },
  intelligence:   { tag: 'MOBILITY INTEL',       glyph: '↬' },
  portal:         { tag: 'PUBLIC TRANSPORT',     glyph: '⬡' },
  oversight:      { tag: 'CONSTITUTIONAL CHECK', glyph: '§' },
};

export function CorridorFrame({ archetype, code, title, subtitle, posture, children }: {
  archetype: TransportArchetype;
  code: string;
  title: string;
  subtitle?: string;
  posture?: 'flowing' | 'engaged' | 'congested' | 'critical' | 'collapse-watch';
  children: React.ReactNode;
}) {
  const a = ARCHETYPE[archetype];
  const postureCol = posture === 'collapse-watch' || posture === 'critical' ? TRANSPORT_DS.coral
    : posture === 'congested' ? TRANSPORT_DS.signal
    : posture === 'engaged' ? TRANSPORT_DS.harbour
    : TRANSPORT_DS.rail;
  return (
    <section className="rounded-[4px] border"
      style={{
        borderColor: 'rgba(95,196,240,0.22)',
        background: `radial-gradient(110% 60% at 0% 0%, rgba(95,196,240,0.05) 0%, transparent 55%), ${TRANSPORT_DS.asphalt}`,
        boxShadow: 'inset 0 0 110px rgba(0,0,0,0.7)',
      }}>
      <header className="flex flex-wrap items-center gap-x-3 gap-y-1 border-b px-3 py-2"
        style={{ borderColor: TRANSPORT_DS.rule }}>
        <span className="grid h-6 w-6 place-items-center rounded-[3px] text-[13px]"
          style={{ background: 'rgba(95,196,240,0.16)', color: TRANSPORT_DS.harbour }}
          aria-hidden>{a.glyph}</span>
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-[9px] uppercase tracking-[0.22em]" style={{ color: TRANSPORT_DS.mut, fontFamily: 'ui-monospace, monospace' }}>{code}</span>
            <h2 className="truncate text-[13px] font-semibold tracking-tight" style={{ color: TRANSPORT_DS.ink }}>{title}</h2>
            <span className="rounded-[2px] px-1.5 py-px text-[8px] font-semibold uppercase tracking-[0.16em]"
              style={{ background: 'rgba(95,196,240,0.16)', color: TRANSPORT_DS.harbour }}>{a.tag}</span>
          </div>
          {subtitle ? <p className="truncate text-[10px] italic" style={{ color: TRANSPORT_DS.mut }}>{subtitle}</p> : null}
        </div>
        {posture ? (
          <div className="ml-auto flex items-center gap-2 text-[10px]">
            <span style={{ color: TRANSPORT_DS.mut }}>posture</span>
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
    ok: TRANSPORT_DS.rail, warn: TRANSPORT_DS.signal, alert: TRANSPORT_DS.coral,
    mute: TRANSPORT_DS.mut, info: TRANSPORT_DS.harbour,
  } as const;
  return (
    <div className="grid grid-cols-2 gap-1 md:grid-cols-4">
      {items.map(k => (
        <div key={k.label} className="border px-2 py-1.5"
          style={{ borderColor: TRANSPORT_DS.rule, background: 'rgba(255,255,255,0.012)' }}>
          <div className="text-[9px] uppercase tracking-[0.18em]" style={{ color: TRANSPORT_DS.mut, fontFamily: 'ui-monospace, monospace' }}>{k.label}</div>
          <div className="text-[14px] font-semibold tabular-nums" style={{ color: k.tone ? tones[k.tone] : TRANSPORT_DS.harbour }}>{k.value}</div>
        </div>
      ))}
    </div>
  );
}

export function CorridorRule({ label }: { label?: string }) {
  return (
    <div className="flex items-center gap-2 py-0.5">
      <div className="h-px flex-1" style={{ background: TRANSPORT_DS.rule }} />
      {label ? <span className="text-[9px] uppercase tracking-[0.22em]" style={{ color: TRANSPORT_DS.mut, fontFamily: 'ui-monospace, monospace' }}>{label}</span> : null}
      <div className="h-px flex-1" style={{ background: TRANSPORT_DS.rule }} />
    </div>
  );
}

export function CorridorBar({ label, pct, tone, tail }: {
  label: string; pct: number;
  tone: 'ok' | 'warn' | 'alert' | 'mute' | 'info';
  tail?: React.ReactNode;
}) {
  const tones = {
    ok: TRANSPORT_DS.rail, warn: TRANSPORT_DS.signal, alert: TRANSPORT_DS.coral,
    mute: TRANSPORT_DS.mut, info: TRANSPORT_DS.harbour,
  } as const;
  return (
    <div className="grid grid-cols-[220px_1fr_80px_140px] gap-3 border-b py-1.5 text-[11px]"
      style={{ borderColor: TRANSPORT_DS.ruleSoft, fontFamily: 'ui-monospace, monospace' }}>
      <span style={{ color: TRANSPORT_DS.harbour }}>{label}</span>
      <div className="h-1.5 self-center" style={{ background: TRANSPORT_DS.asphaltDeep }}>
        <div className="h-full" style={{ width: `${Math.min(100, Math.max(0, pct))}%`, background: tones[tone] }} />
      </div>
      <span className="text-right tabular-nums" style={{ color: TRANSPORT_DS.mut }}>{pct}%</span>
      <span className="text-right" style={{ color: tones[tone] }}>{tail}</span>
    </div>
  );
}

export function CorridorCallout({ kicker, body }: { kicker: string; body: string }) {
  return (
    <div className="rounded-[3px] border border-dashed px-3 py-2 text-[10.5px] italic"
      style={{ borderColor: 'rgba(95,196,240,0.32)', color: TRANSPORT_DS.mut, background: 'rgba(95,196,240,0.04)' }}>
      <span className="not-italic font-semibold uppercase tracking-[0.18em]" style={{ color: TRANSPORT_DS.harbour }}>{kicker}</span>
      {' — '}{body}
    </div>
  );
}

export function CorridorSeal({ maxim }: { maxim: string }) {
  return (
    <div className="flex items-center justify-between rounded-[3px] border px-3 py-1.5 text-[10px]"
      style={{ borderColor: TRANSPORT_DS.rule, background: 'rgba(95,196,240,0.04)' }}>
      <span className="uppercase tracking-[0.22em]" style={{ color: TRANSPORT_DS.harbour, fontFamily: 'ui-monospace, monospace' }}>MINISTRY OF TRANSPORT · CORRIDOR MAP</span>
      <span className="italic" style={{ color: TRANSPORT_DS.mut }}>{maxim}</span>
    </div>
  );
}
