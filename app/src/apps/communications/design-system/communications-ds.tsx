'use client';

// apps/communications/design-system — Topology Graph design system.
// Visual identity for Communications & Digital Infrastructure.
// Palette: carbon black / electric cyan / signal violet / lime / coral.

import * as React from 'react';

export const COMMS_DS = {
  carbon: '#04080d',
  carbonDeep: '#0a1018',
  electric: '#5fc4f0',
  signal: '#8a7df0',
  lime: '#7fd06f',
  amber: '#e0a13a',
  coral: '#e0685f',
  ink: '#dfeaf5',
  mut: '#7a8898',
  rule: 'rgba(95,196,240,0.18)',
  ruleSoft: 'rgba(95,196,240,0.08)',
} as const;

export type CommsArchetype =
  | 'command' | 'infrastructure' | 'cloud' | 'cyber'
  | 'broadcast' | 'identity' | 'spectrum' | 'intelligence' | 'portal' | 'oversight';

const ARCHETYPE: Record<CommsArchetype, { tag: string; glyph: string }> = {
  command:        { tag: 'CONNECTIVITY COMMAND',    glyph: '⌬' },
  infrastructure: { tag: 'NETWORK INFRA',           glyph: '⌗' },
  cloud:          { tag: 'SOVEREIGN CLOUD',         glyph: '◯' },
  cyber:          { tag: 'CYBER DEFENCE',           glyph: '⊕' },
  broadcast:      { tag: 'EMERGENCY BROADCAST',     glyph: '⌇' },
  identity:       { tag: 'DIGITAL IDENTITY',        glyph: '◈' },
  spectrum:       { tag: 'SPECTRUM & MEDIA',        glyph: '⌭' },
  intelligence:   { tag: 'COMMS INTELLIGENCE',      glyph: '↬' },
  portal:         { tag: 'CITIZEN PORTAL',          glyph: '⬡' },
  oversight:      { tag: 'CONSTITUTIONAL CHECK',    glyph: '§' },
};

export function TopologyFrame({ archetype, code, title, subtitle, posture, children }: {
  archetype: CommsArchetype;
  code: string;
  title: string;
  subtitle?: string;
  posture?: 'nominal' | 'engaged' | 'degraded' | 'critical' | 'sovereign-lockdown';
  children: React.ReactNode;
}) {
  const a = ARCHETYPE[archetype];
  const postureCol = posture === 'critical' || posture === 'sovereign-lockdown' ? COMMS_DS.coral
    : posture === 'degraded' ? COMMS_DS.amber
    : posture === 'engaged' ? COMMS_DS.electric
    : COMMS_DS.lime;
  return (
    <section className="rounded-[4px] border"
      style={{
        borderColor: 'rgba(95,196,240,0.22)',
        background: `radial-gradient(110% 60% at 0% 0%, rgba(95,196,240,0.05) 0%, transparent 55%), ${COMMS_DS.carbon}`,
        boxShadow: 'inset 0 0 110px rgba(0,0,0,0.7)',
      }}>
      <header className="flex flex-wrap items-center gap-x-3 gap-y-1 border-b px-3 py-2"
        style={{ borderColor: COMMS_DS.rule }}>
        <span className="grid h-6 w-6 place-items-center rounded-[3px] text-[13px]"
          style={{ background: 'rgba(95,196,240,0.16)', color: COMMS_DS.electric }}
          aria-hidden>{a.glyph}</span>
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-[9px] uppercase tracking-[0.22em]" style={{ color: COMMS_DS.mut, fontFamily: 'ui-monospace, monospace' }}>{code}</span>
            <h2 className="truncate text-[13px] font-semibold tracking-tight" style={{ color: COMMS_DS.ink }}>{title}</h2>
            <span className="rounded-[2px] px-1.5 py-px text-[8px] font-semibold uppercase tracking-[0.16em]"
              style={{ background: 'rgba(95,196,240,0.16)', color: COMMS_DS.electric }}>{a.tag}</span>
          </div>
          {subtitle ? <p className="truncate text-[10px] italic" style={{ color: COMMS_DS.mut }}>{subtitle}</p> : null}
        </div>
        {posture ? (
          <div className="ml-auto flex items-center gap-2 text-[10px]">
            <span style={{ color: COMMS_DS.mut }}>posture</span>
            <span className="font-semibold uppercase tracking-[0.18em]" style={{ color: postureCol }}>{posture}</span>
          </div>
        ) : null}
      </header>
      <div className="space-y-2 p-2">{children}</div>
    </section>
  );
}

export function TopologyKpi({ items }: {
  items: { label: string; value: React.ReactNode; tone?: 'ok' | 'warn' | 'alert' | 'mute' | 'info' }[];
}) {
  const tones = {
    ok: COMMS_DS.lime, warn: COMMS_DS.amber, alert: COMMS_DS.coral,
    mute: COMMS_DS.mut, info: COMMS_DS.electric,
  } as const;
  return (
    <div className="grid grid-cols-2 gap-1 md:grid-cols-4">
      {items.map(k => (
        <div key={k.label} className="border px-2 py-1.5"
          style={{ borderColor: COMMS_DS.rule, background: 'rgba(255,255,255,0.012)' }}>
          <div className="text-[9px] uppercase tracking-[0.18em]" style={{ color: COMMS_DS.mut, fontFamily: 'ui-monospace, monospace' }}>{k.label}</div>
          <div className="text-[14px] font-semibold tabular-nums" style={{ color: k.tone ? tones[k.tone] : COMMS_DS.electric }}>{k.value}</div>
        </div>
      ))}
    </div>
  );
}

export function TopologyRule({ label }: { label?: string }) {
  return (
    <div className="flex items-center gap-2 py-0.5">
      <div className="h-px flex-1" style={{ background: COMMS_DS.rule }} />
      {label ? <span className="text-[9px] uppercase tracking-[0.22em]" style={{ color: COMMS_DS.mut, fontFamily: 'ui-monospace, monospace' }}>{label}</span> : null}
      <div className="h-px flex-1" style={{ background: COMMS_DS.rule }} />
    </div>
  );
}

export function NodeBar({ label, pct, tone, tail }: {
  label: string; pct: number;
  tone: 'ok' | 'warn' | 'alert' | 'mute' | 'info';
  tail?: React.ReactNode;
}) {
  const tones = {
    ok: COMMS_DS.lime, warn: COMMS_DS.amber, alert: COMMS_DS.coral,
    mute: COMMS_DS.mut, info: COMMS_DS.electric,
  } as const;
  return (
    <div className="grid grid-cols-[220px_1fr_80px_140px] gap-3 border-b py-1.5 text-[11px]"
      style={{ borderColor: COMMS_DS.ruleSoft, fontFamily: 'ui-monospace, monospace' }}>
      <span style={{ color: COMMS_DS.electric }}>{label}</span>
      <div className="h-1.5 self-center" style={{ background: COMMS_DS.carbonDeep }}>
        <div className="h-full" style={{ width: `${Math.min(100, Math.max(0, pct))}%`, background: tones[tone] }} />
      </div>
      <span className="text-right tabular-nums" style={{ color: COMMS_DS.mut }}>{pct}%</span>
      <span className="text-right" style={{ color: tones[tone] }}>{tail}</span>
    </div>
  );
}

export function TopologyCallout({ kicker, body }: { kicker: string; body: string }) {
  return (
    <div className="rounded-[3px] border border-dashed px-3 py-2 text-[10.5px] italic"
      style={{ borderColor: 'rgba(95,196,240,0.32)', color: COMMS_DS.mut, background: 'rgba(95,196,240,0.04)' }}>
      <span className="not-italic font-semibold uppercase tracking-[0.18em]" style={{ color: COMMS_DS.electric }}>{kicker}</span>
      {' — '}{body}
    </div>
  );
}

export function TopologySeal({ maxim }: { maxim: string }) {
  return (
    <div className="flex items-center justify-between rounded-[3px] border px-3 py-1.5 text-[10px]"
      style={{ borderColor: COMMS_DS.rule, background: 'rgba(95,196,240,0.04)' }}>
      <span className="uppercase tracking-[0.22em]" style={{ color: COMMS_DS.electric, fontFamily: 'ui-monospace, monospace' }}>COMMUNICATIONS · TOPOLOGY GRAPH</span>
      <span className="italic" style={{ color: COMMS_DS.mut }}>{maxim}</span>
    </div>
  );
}
