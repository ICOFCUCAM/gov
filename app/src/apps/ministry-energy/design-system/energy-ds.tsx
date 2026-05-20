'use client';

// apps/ministry-energy/design-system — One-Line Diagram design system.
// Visual identity for the Ministry of Energy.
// Palette: carbon / hot-amber / electric-blue / lime / coral.

import * as React from 'react';

export const ENERGY_DS = {
  carbon: '#08090c',
  carbonDeep: '#11131a',
  amber: '#f0a13a',
  amberDim: '#7e5a22',
  electric: '#5fc4f0',
  lime: '#a8d04f',
  coral: '#e0685f',
  ink: '#e0e4ec',
  mut: '#828a98',
  rule: 'rgba(240,161,58,0.20)',
  ruleSoft: 'rgba(240,161,58,0.10)',
} as const;

export type EnergyArchetype =
  | 'command' | 'generation' | 'transmission' | 'demand'
  | 'reserve' | 'emergency' | 'intelligence' | 'portal' | 'oversight';

const ARCHETYPE: Record<EnergyArchetype, { tag: string; glyph: string }> = {
  command:      { tag: 'GRID COMMAND',          glyph: '⌬' },
  generation:   { tag: 'GENERATION FLEET',      glyph: '✦' },
  transmission: { tag: 'TRANSMISSION LANE',     glyph: '⌗' },
  demand:       { tag: 'DEMAND LANE',           glyph: '⊕' },
  reserve:      { tag: 'STRATEGIC RESERVE',     glyph: '▤' },
  emergency:    { tag: 'EMERGENCY OPS',         glyph: '✕' },
  intelligence: { tag: 'GRID INTELLIGENCE',     glyph: '↬' },
  portal:       { tag: 'PUBLIC ENERGY',         glyph: '⬡' },
  oversight:    { tag: 'CONSTITUTIONAL CHECK',  glyph: '§' },
};

export function GridFrame({ archetype, code, title, subtitle, posture, children }: {
  archetype: EnergyArchetype;
  code: string;
  title: string;
  subtitle?: string;
  posture?: 'stable' | 'engaged' | 'strained' | 'critical' | 'blackout-watch';
  children: React.ReactNode;
}) {
  const a = ARCHETYPE[archetype];
  const postureCol = posture === 'blackout-watch' || posture === 'critical' ? ENERGY_DS.coral
    : posture === 'strained' ? ENERGY_DS.amber
    : posture === 'engaged' ? ENERGY_DS.electric
    : ENERGY_DS.lime;
  return (
    <section className="rounded-[4px] border"
      style={{
        borderColor: 'rgba(240,161,58,0.22)',
        background: `radial-gradient(110% 60% at 0% 0%, rgba(240,161,58,0.06) 0%, transparent 55%), ${ENERGY_DS.carbon}`,
        boxShadow: 'inset 0 0 110px rgba(0,0,0,0.7)',
      }}>
      <header className="flex flex-wrap items-center gap-x-3 gap-y-1 border-b px-3 py-2"
        style={{ borderColor: ENERGY_DS.rule }}>
        <span className="grid h-6 w-6 place-items-center rounded-[3px] text-[13px]"
          style={{ background: 'rgba(240,161,58,0.16)', color: ENERGY_DS.amber }}
          aria-hidden>{a.glyph}</span>
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-[9px] uppercase tracking-[0.22em]" style={{ color: ENERGY_DS.mut, fontFamily: 'ui-monospace, monospace' }}>{code}</span>
            <h2 className="truncate text-[13px] font-semibold tracking-tight" style={{ color: ENERGY_DS.ink }}>{title}</h2>
            <span className="rounded-[2px] px-1.5 py-px text-[8px] font-semibold uppercase tracking-[0.16em]"
              style={{ background: 'rgba(240,161,58,0.16)', color: ENERGY_DS.amber }}>{a.tag}</span>
          </div>
          {subtitle ? <p className="truncate text-[10px] italic" style={{ color: ENERGY_DS.mut }}>{subtitle}</p> : null}
        </div>
        {posture ? (
          <div className="ml-auto flex items-center gap-2 text-[10px]">
            <span style={{ color: ENERGY_DS.mut }}>posture</span>
            <span className="font-semibold uppercase tracking-[0.18em]" style={{ color: postureCol }}>{posture}</span>
          </div>
        ) : null}
      </header>
      <div className="space-y-2 p-2">{children}</div>
    </section>
  );
}

export function GridKpi({ items }: {
  items: { label: string; value: React.ReactNode; tone?: 'ok' | 'warn' | 'alert' | 'mute' | 'info' }[];
}) {
  const tones = {
    ok: ENERGY_DS.lime, warn: ENERGY_DS.amber, alert: ENERGY_DS.coral,
    mute: ENERGY_DS.mut, info: ENERGY_DS.electric,
  } as const;
  return (
    <div className="grid grid-cols-2 gap-1 md:grid-cols-4">
      {items.map(k => (
        <div key={k.label} className="border px-2 py-1.5"
          style={{ borderColor: ENERGY_DS.rule, background: 'rgba(255,255,255,0.012)' }}>
          <div className="text-[9px] uppercase tracking-[0.18em]" style={{ color: ENERGY_DS.mut, fontFamily: 'ui-monospace, monospace' }}>{k.label}</div>
          <div className="text-[14px] font-semibold tabular-nums" style={{ color: k.tone ? tones[k.tone] : ENERGY_DS.amber }}>{k.value}</div>
        </div>
      ))}
    </div>
  );
}

export function GridRule({ label }: { label?: string }) {
  return (
    <div className="flex items-center gap-2 py-0.5">
      <div className="h-px flex-1" style={{ background: ENERGY_DS.rule }} />
      {label ? <span className="text-[9px] uppercase tracking-[0.22em]" style={{ color: ENERGY_DS.mut, fontFamily: 'ui-monospace, monospace' }}>{label}</span> : null}
      <div className="h-px flex-1" style={{ background: ENERGY_DS.rule }} />
    </div>
  );
}

export function LineDiagramRow({ label, pct, tone, tail }: {
  label: string; pct: number;
  tone: 'ok' | 'warn' | 'alert' | 'mute' | 'info';
  tail?: React.ReactNode;
}) {
  const tones = {
    ok: ENERGY_DS.lime, warn: ENERGY_DS.amber, alert: ENERGY_DS.coral,
    mute: ENERGY_DS.mut, info: ENERGY_DS.electric,
  } as const;
  return (
    <div className="grid grid-cols-[220px_1fr_80px_120px] gap-3 border-b py-1.5 text-[11px]"
      style={{ borderColor: ENERGY_DS.ruleSoft, fontFamily: 'ui-monospace, monospace' }}>
      <span style={{ color: ENERGY_DS.amber }}>{label}</span>
      <div className="h-1.5 self-center" style={{ background: ENERGY_DS.carbonDeep }}>
        <div className="h-full" style={{ width: `${Math.min(100, Math.max(0, pct))}%`, background: tones[tone] }} />
      </div>
      <span className="text-right tabular-nums" style={{ color: ENERGY_DS.mut }}>{pct}%</span>
      <span className="text-right" style={{ color: tones[tone] }}>{tail}</span>
    </div>
  );
}

export function GridCallout({ kicker, body }: { kicker: string; body: string }) {
  return (
    <div className="rounded-[3px] border border-dashed px-3 py-2 text-[10.5px] italic"
      style={{ borderColor: 'rgba(240,161,58,0.32)', color: ENERGY_DS.mut, background: 'rgba(240,161,58,0.04)' }}>
      <span className="not-italic font-semibold uppercase tracking-[0.18em]" style={{ color: ENERGY_DS.amber }}>{kicker}</span>
      {' — '}{body}
    </div>
  );
}

export function GridSeal({ maxim }: { maxim: string }) {
  return (
    <div className="flex items-center justify-between rounded-[3px] border px-3 py-1.5 text-[10px]"
      style={{ borderColor: ENERGY_DS.rule, background: 'rgba(240,161,58,0.04)' }}>
      <span className="uppercase tracking-[0.22em]" style={{ color: ENERGY_DS.amber, fontFamily: 'ui-monospace, monospace' }}>MINISTRY OF ENERGY · ONE-LINE DIAGRAM</span>
      <span className="italic" style={{ color: ENERGY_DS.mut }}>{maxim}</span>
    </div>
  );
}
