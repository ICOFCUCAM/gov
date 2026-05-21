'use client';

// apps/senate/design-system — Upper Chamber design system.
// Visual identity for the Senate. Palette: deep aubergine /
// burnished gold / parchment-ink.

import * as React from 'react';

export const SENATE_DS = {
  aubergine: '#170a1f',
  aubergineDeep: '#23142f',
  gold: '#c9a24a',
  goldDim: '#7e6628',
  rose: '#8a4d7a',
  jade: '#4d7a4d',
  coral: '#c1252f',
  parchment: '#e8d6b8',
  parchmentInk: '#dfd0aa',
  mut: '#8a7d7a',
  rule: 'rgba(201,162,74,0.22)',
  ruleSoft: 'rgba(201,162,74,0.10)',
} as const;

export type SenateArchetype =
  | 'chamber' | 'bills' | 'treaties' | 'committees'
  | 'oversight' | 'records' | 'foresight' | 'portal' | 'ethics' | 'safeguards';

const ARCHETYPE: Record<SenateArchetype, { tag: string; glyph: string }> = {
  chamber:    { tag: 'CHAMBER FLOOR',         glyph: '◈' },
  bills:      { tag: 'BILL PIPELINE',         glyph: '✎' },
  treaties:   { tag: 'TREATY DOCKET',         glyph: '⚖' },
  committees: { tag: 'COMMITTEE INQUIRY',     glyph: '⌗' },
  oversight:  { tag: 'EXECUTIVE OVERSIGHT',   glyph: '⌖' },
  records:    { tag: 'HANSARD & RECORDS',     glyph: '☷' },
  foresight:  { tag: 'STRATEGIC FORESIGHT',   glyph: '↬' },
  portal:     { tag: 'CITIZEN PORTAL',        glyph: '⬡' },
  ethics:     { tag: 'CONDUCT & ETHICS',      glyph: '§' },
  safeguards: { tag: 'CONSTITUTIONAL CHECK',  glyph: '✓' },
};

export function ChamberFrame({ archetype, code, title, subtitle, posture, children }: {
  archetype: SenateArchetype;
  code: string;
  title: string;
  subtitle?: string;
  posture?: 'deliberative' | 'in-session' | 'voting' | 'recess' | 'contested';
  children: React.ReactNode;
}) {
  const a = ARCHETYPE[archetype];
  const postureCol = posture === 'contested' ? SENATE_DS.coral
    : posture === 'voting' ? SENATE_DS.rose
    : posture === 'in-session' ? SENATE_DS.gold
    : posture === 'recess' ? SENATE_DS.mut
    : SENATE_DS.jade;
  return (
    <section className="rounded-[4px] border"
      style={{
        borderColor: 'rgba(201,162,74,0.26)',
        background: `radial-gradient(110% 60% at 0% 0%, rgba(201,162,74,0.06) 0%, transparent 55%), ${SENATE_DS.aubergine}`,
        boxShadow: 'inset 0 0 110px rgba(0,0,0,0.72)',
      }}>
      <header className="flex flex-wrap items-center gap-x-3 gap-y-1 border-b px-3 py-2"
        style={{ borderColor: SENATE_DS.rule }}>
        <span className="grid h-6 w-6 place-items-center rounded-[3px] text-[13px]"
          style={{ background: 'rgba(201,162,74,0.18)', color: SENATE_DS.gold }} aria-hidden>{a.glyph}</span>
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-[9px] uppercase tracking-[0.22em]" style={{ color: SENATE_DS.mut, fontFamily: 'ui-monospace, monospace' }}>{code}</span>
            <h2 className="truncate text-[13px] font-semibold tracking-tight" style={{ color: SENATE_DS.parchment, fontFamily: 'Georgia, ui-serif, serif' }}>{title}</h2>
            <span className="rounded-[2px] px-1.5 py-px text-[8px] font-semibold uppercase tracking-[0.16em]"
              style={{ background: 'rgba(201,162,74,0.16)', color: SENATE_DS.gold }}>{a.tag}</span>
          </div>
          {subtitle ? <p className="truncate text-[10px] italic" style={{ color: SENATE_DS.mut }}>{subtitle}</p> : null}
        </div>
        {posture ? (
          <div className="ml-auto flex items-center gap-2 text-[10px]">
            <span style={{ color: SENATE_DS.mut }}>posture</span>
            <span className="font-semibold uppercase tracking-[0.18em]" style={{ color: postureCol }}>{posture}</span>
          </div>
        ) : null}
      </header>
      <div className="space-y-2 p-2">{children}</div>
    </section>
  );
}

export function ChamberKpi({ items }: {
  items: { label: string; value: React.ReactNode; tone?: 'ok' | 'warn' | 'alert' | 'mute' | 'info' }[];
}) {
  const tones = {
    ok: SENATE_DS.jade, warn: SENATE_DS.gold, alert: SENATE_DS.coral,
    mute: SENATE_DS.mut, info: SENATE_DS.rose,
  } as const;
  return (
    <div className="grid grid-cols-2 gap-1 md:grid-cols-4">
      {items.map(k => (
        <div key={k.label} className="border px-2 py-1.5"
          style={{ borderColor: SENATE_DS.rule, background: 'rgba(255,255,255,0.012)' }}>
          <div className="text-[9px] uppercase tracking-[0.18em]" style={{ color: SENATE_DS.mut, fontFamily: 'ui-monospace, monospace' }}>{k.label}</div>
          <div className="text-[14px] font-semibold tabular-nums" style={{ color: k.tone ? tones[k.tone] : SENATE_DS.gold }}>{k.value}</div>
        </div>
      ))}
    </div>
  );
}

export function ChamberRule({ label }: { label?: string }) {
  return (
    <div className="flex items-center gap-2 py-0.5">
      <div className="h-px flex-1" style={{ background: SENATE_DS.rule }} />
      {label ? <span className="text-[9px] uppercase tracking-[0.22em]" style={{ color: SENATE_DS.mut, fontFamily: 'ui-monospace, monospace' }}>{label}</span> : null}
      <div className="h-px flex-1" style={{ background: SENATE_DS.rule }} />
    </div>
  );
}

export function ChamberBar({ label, pct, tone, tail }: {
  label: string; pct: number;
  tone: 'ok' | 'warn' | 'alert' | 'mute' | 'info';
  tail?: React.ReactNode;
}) {
  const tones = {
    ok: SENATE_DS.jade, warn: SENATE_DS.gold, alert: SENATE_DS.coral,
    mute: SENATE_DS.mut, info: SENATE_DS.rose,
  } as const;
  return (
    <div className="grid grid-cols-[220px_1fr_80px_140px] gap-3 border-b py-1.5 text-[11px]"
      style={{ borderColor: SENATE_DS.ruleSoft, fontFamily: 'ui-monospace, monospace' }}>
      <span style={{ color: SENATE_DS.gold }}>{label}</span>
      <div className="h-1.5 self-center" style={{ background: SENATE_DS.aubergineDeep }}>
        <div className="h-full" style={{ width: `${Math.min(100, Math.max(0, pct))}%`, background: tones[tone] }} />
      </div>
      <span className="text-right tabular-nums" style={{ color: SENATE_DS.mut }}>{pct}%</span>
      <span className="text-right" style={{ color: tones[tone] }}>{tail}</span>
    </div>
  );
}

export function ChamberCallout({ kicker, body }: { kicker: string; body: string }) {
  return (
    <div className="rounded-[3px] border border-dashed px-3 py-2 text-[10.5px] italic"
      style={{ borderColor: 'rgba(201,162,74,0.32)', color: SENATE_DS.mut, background: 'rgba(201,162,74,0.04)' }}>
      <span className="not-italic font-semibold uppercase tracking-[0.18em]" style={{ color: SENATE_DS.gold }}>{kicker}</span>
      {' — '}{body}
    </div>
  );
}

export function ChamberSeal({ maxim }: { maxim: string }) {
  return (
    <div className="flex items-center justify-between rounded-[3px] border px-3 py-1.5 text-[10px]"
      style={{ borderColor: SENATE_DS.rule, background: 'rgba(201,162,74,0.04)' }}>
      <span className="uppercase tracking-[0.22em]" style={{ color: SENATE_DS.gold, fontFamily: 'ui-monospace, monospace' }}>SENATE · UPPER CHAMBER</span>
      <span className="italic" style={{ color: SENATE_DS.mut, fontFamily: 'Georgia, ui-serif, serif' }}>{maxim}</span>
    </div>
  );
}
