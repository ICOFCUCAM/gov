'use client';

// apps/noc/design-system — National Operations Centre design system.
// Palette: deep operational graphite, signal cyan, posture amber/crimson,
// jade ok. This is a *situation-room* surface — high information density,
// monochrome backdrop, signal-coloured indicators.

import * as React from 'react';

export const NOC_DS = {
  graphite: '#0a0f14',
  graphiteDeep: '#06090c',
  graphiteSoft: '#121821',
  cyan: '#5bbfd0',
  cyanDeep: '#2e7e8d',
  amber: '#d99827',
  crimson: '#c1252f',
  jade: '#5a8a5c',
  parchment: '#d8d2c2',
  parchmentInk: '#c4bda7',
  mut: '#7a8694',
  rule: 'rgba(91,191,208,0.18)',
  ruleSoft: 'rgba(91,191,208,0.08)',
} as const;

export type NocArchetype =
  | 'situation' | 'ministries' | 'incidents' | 'decisions'
  | 'briefing' | 'continuity' | 'fusion' | 'safeguards';

const ARCHETYPE: Record<NocArchetype, { tag: string; glyph: string }> = {
  situation:  { tag: 'SITUATION ROOM',     glyph: '⌖' },
  ministries: { tag: 'MINISTRY POSTURE',   glyph: '⌬' },
  incidents:  { tag: 'INCIDENT FLOOR',     glyph: '⚠' },
  decisions:  { tag: 'COORDINATION',       glyph: '⌗' },
  briefing:   { tag: 'PUBLIC BRIEFING',    glyph: '☷' },
  continuity: { tag: 'CONTINUITY',         glyph: '↬' },
  fusion:     { tag: 'INTEL FUSION',       glyph: '◈' },
  safeguards: { tag: 'CIVILIAN CHECK',     glyph: '§' },
};

export function SituationFrame({ archetype, code, title, subtitle, posture, children }: {
  archetype: NocArchetype;
  code: string;
  title: string;
  subtitle?: string;
  posture?: 'steady' | 'elevated' | 'crisis' | 'national-emergency' | 'recovery';
  children: React.ReactNode;
}) {
  const a = ARCHETYPE[archetype];
  const postureCol = posture === 'national-emergency' ? NOC_DS.crimson
    : posture === 'crisis' ? NOC_DS.amber
    : posture === 'elevated' ? NOC_DS.cyan
    : posture === 'recovery' ? NOC_DS.parchment
    : NOC_DS.jade;
  return (
    <section className="rounded-[3px] border"
      style={{
        borderColor: 'rgba(91,191,208,0.22)',
        background: `radial-gradient(110% 60% at 0% 0%, rgba(91,191,208,0.06) 0%, transparent 55%), ${NOC_DS.graphite}`,
        boxShadow: 'inset 0 0 120px rgba(0,0,0,0.78)',
      }}>
      <header className="flex flex-wrap items-center gap-x-3 gap-y-1 border-b px-3 py-2"
        style={{ borderColor: NOC_DS.rule }}>
        <span className="grid h-6 w-6 place-items-center rounded-[2px] text-[12px]"
          style={{ background: 'rgba(91,191,208,0.18)', color: NOC_DS.cyan }} aria-hidden>{a.glyph}</span>
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-[9px] uppercase tracking-[0.22em]" style={{ color: NOC_DS.mut, fontFamily: 'ui-monospace, monospace' }}>{code}</span>
            <h2 className="truncate text-[13px] font-semibold tracking-tight" style={{ color: NOC_DS.parchment, fontFamily: 'ui-monospace, monospace' }}>{title}</h2>
            <span className="rounded-[2px] px-1.5 py-px text-[8px] font-semibold uppercase tracking-[0.16em]"
              style={{ background: 'rgba(91,191,208,0.16)', color: NOC_DS.cyan }}>{a.tag}</span>
          </div>
          {subtitle ? <p className="truncate text-[10px]" style={{ color: NOC_DS.mut, fontFamily: 'ui-monospace, monospace' }}>{subtitle}</p> : null}
        </div>
        {posture ? (
          <div className="ml-auto flex items-center gap-2 text-[10px]">
            <span style={{ color: NOC_DS.mut }}>posture</span>
            <span className="font-semibold uppercase tracking-[0.18em]" style={{ color: postureCol }}>{posture}</span>
          </div>
        ) : null}
      </header>
      <div className="space-y-2 p-2">{children}</div>
    </section>
  );
}

export function SituationKpi({ items }: {
  items: { label: string; value: React.ReactNode; tone?: 'ok' | 'warn' | 'alert' | 'mute' | 'info' }[];
}) {
  const tones = {
    ok: NOC_DS.jade, warn: NOC_DS.amber, alert: NOC_DS.crimson,
    mute: NOC_DS.mut, info: NOC_DS.cyan,
  } as const;
  return (
    <div className="grid grid-cols-2 gap-1 md:grid-cols-4">
      {items.map(k => (
        <div key={k.label} className="border px-2 py-1.5"
          style={{ borderColor: NOC_DS.rule, background: 'rgba(91,191,208,0.03)' }}>
          <div className="text-[9px] uppercase tracking-[0.18em]" style={{ color: NOC_DS.mut, fontFamily: 'ui-monospace, monospace' }}>{k.label}</div>
          <div className="text-[14px] font-semibold tabular-nums" style={{ color: k.tone ? tones[k.tone] : NOC_DS.cyan, fontFamily: 'ui-monospace, monospace' }}>{k.value}</div>
        </div>
      ))}
    </div>
  );
}

export function SituationRule({ label }: { label?: string }) {
  return (
    <div className="flex items-center gap-2 py-0.5">
      <div className="h-px flex-1" style={{ background: NOC_DS.rule }} />
      {label ? <span className="text-[9px] uppercase tracking-[0.22em]" style={{ color: NOC_DS.mut, fontFamily: 'ui-monospace, monospace' }}>{label}</span> : null}
      <div className="h-px flex-1" style={{ background: NOC_DS.rule }} />
    </div>
  );
}

export function SituationBar({ label, pct, tone, tail }: {
  label: string; pct: number;
  tone: 'ok' | 'warn' | 'alert' | 'mute' | 'info';
  tail?: React.ReactNode;
}) {
  const tones = {
    ok: NOC_DS.jade, warn: NOC_DS.amber, alert: NOC_DS.crimson,
    mute: NOC_DS.mut, info: NOC_DS.cyan,
  } as const;
  return (
    <div className="grid grid-cols-[220px_1fr_80px_140px] gap-3 border-b py-1.5 text-[11px]"
      style={{ borderColor: NOC_DS.ruleSoft, fontFamily: 'ui-monospace, monospace' }}>
      <span style={{ color: NOC_DS.cyan }}>{label}</span>
      <div className="h-1.5 self-center" style={{ background: NOC_DS.graphiteSoft }}>
        <div className="h-full" style={{ width: `${Math.min(100, Math.max(0, pct))}%`, background: tones[tone] }} />
      </div>
      <span className="text-right tabular-nums" style={{ color: NOC_DS.mut }}>{pct}%</span>
      <span className="text-right" style={{ color: tones[tone] }}>{tail}</span>
    </div>
  );
}

export function SituationCallout({ kicker, body }: { kicker: string; body: string }) {
  return (
    <div className="rounded-[2px] border border-dashed px-3 py-2 text-[10.5px]"
      style={{ borderColor: 'rgba(91,191,208,0.32)', color: NOC_DS.parchmentInk, background: 'rgba(91,191,208,0.04)', fontFamily: 'ui-monospace, monospace' }}>
      <span className="font-semibold uppercase tracking-[0.18em]" style={{ color: NOC_DS.cyan }}>{kicker}</span>
      {' — '}{body}
    </div>
  );
}

export function SituationSeal({ maxim }: { maxim: string }) {
  return (
    <div className="flex items-center justify-between rounded-[2px] border px-3 py-1.5 text-[10px]"
      style={{ borderColor: NOC_DS.rule, background: 'rgba(91,191,208,0.04)' }}>
      <span className="uppercase tracking-[0.22em]" style={{ color: NOC_DS.cyan, fontFamily: 'ui-monospace, monospace' }}>NATIONAL OPERATIONS CENTRE · CIVILIAN COMMAND</span>
      <span className="italic" style={{ color: NOC_DS.mut, fontFamily: 'ui-monospace, monospace' }}>{maxim}</span>
    </div>
  );
}
