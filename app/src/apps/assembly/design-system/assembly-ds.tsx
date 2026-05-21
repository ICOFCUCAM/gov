'use client';

// apps/assembly/design-system — Lower Chamber design system.
// Palette: forest green, ochre, parchment-ink, copper.

import * as React from 'react';

export const ASSEMBLY_DS = {
  forest: '#0a1f1a',
  forestDeep: '#142b25',
  jade: '#1f9d63',
  ochre: '#c97a1f',
  rose: '#c14d6a',
  ink: '#dde8e1',
  parchment: '#e5e0c8',
  mut: '#7e8d85',
  coral: '#c1252f',
  rule: 'rgba(31,157,99,0.22)',
  ruleSoft: 'rgba(31,157,99,0.10)',
} as const;

export type AssemblyArchetype =
  | 'chamber' | 'bills' | 'budget' | 'petitions'
  | 'oversight' | 'records' | 'committees' | 'portal' | 'ethics' | 'safeguards';

const ARCHETYPE: Record<AssemblyArchetype, { tag: string; glyph: string }> = {
  chamber:    { tag: 'CHAMBER FLOOR',           glyph: '⌬' },
  bills:      { tag: 'BILL PIPELINE',           glyph: '✎' },
  budget:     { tag: 'APPROPRIATION',           glyph: '✦' },
  petitions:  { tag: 'CITIZEN PETITIONS',       glyph: '✚' },
  oversight:  { tag: 'QUESTION TIME',           glyph: '?' },
  records:    { tag: 'HANSARD & RECORDS',       glyph: '☷' },
  committees: { tag: 'COMMITTEES',              glyph: '⌗' },
  portal:     { tag: 'CITIZEN PORTAL',          glyph: '⬡' },
  ethics:     { tag: 'CONDUCT & ETHICS',        glyph: '§' },
  safeguards: { tag: 'CONSTITUTIONAL CHECK',    glyph: '✓' },
};

export function FloorFrame({ archetype, code, title, subtitle, posture, children }: {
  archetype: AssemblyArchetype;
  code: string;
  title: string;
  subtitle?: string;
  posture?: 'orderly' | 'in-session' | 'voting' | 'recess' | 'disorderly';
  children: React.ReactNode;
}) {
  const a = ARCHETYPE[archetype];
  const postureCol = posture === 'disorderly' ? ASSEMBLY_DS.coral
    : posture === 'voting' ? ASSEMBLY_DS.rose
    : posture === 'in-session' ? ASSEMBLY_DS.ochre
    : posture === 'recess' ? ASSEMBLY_DS.mut
    : ASSEMBLY_DS.jade;
  return (
    <section className="rounded-[4px] border"
      style={{
        borderColor: 'rgba(31,157,99,0.26)',
        background: `radial-gradient(110% 60% at 0% 0%, rgba(31,157,99,0.06) 0%, transparent 55%), ${ASSEMBLY_DS.forest}`,
        boxShadow: 'inset 0 0 110px rgba(0,0,0,0.7)',
      }}>
      <header className="flex flex-wrap items-center gap-x-3 gap-y-1 border-b px-3 py-2"
        style={{ borderColor: ASSEMBLY_DS.rule }}>
        <span className="grid h-6 w-6 place-items-center rounded-[3px] text-[13px]"
          style={{ background: 'rgba(31,157,99,0.18)', color: ASSEMBLY_DS.jade }} aria-hidden>{a.glyph}</span>
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-[9px] uppercase tracking-[0.22em]" style={{ color: ASSEMBLY_DS.mut, fontFamily: 'ui-monospace, monospace' }}>{code}</span>
            <h2 className="truncate text-[13px] font-semibold tracking-tight" style={{ color: ASSEMBLY_DS.parchment, fontFamily: 'Georgia, ui-serif, serif' }}>{title}</h2>
            <span className="rounded-[2px] px-1.5 py-px text-[8px] font-semibold uppercase tracking-[0.16em]"
              style={{ background: 'rgba(31,157,99,0.16)', color: ASSEMBLY_DS.jade }}>{a.tag}</span>
          </div>
          {subtitle ? <p className="truncate text-[10px] italic" style={{ color: ASSEMBLY_DS.mut }}>{subtitle}</p> : null}
        </div>
        {posture ? (
          <div className="ml-auto flex items-center gap-2 text-[10px]">
            <span style={{ color: ASSEMBLY_DS.mut }}>posture</span>
            <span className="font-semibold uppercase tracking-[0.18em]" style={{ color: postureCol }}>{posture}</span>
          </div>
        ) : null}
      </header>
      <div className="space-y-2 p-2">{children}</div>
    </section>
  );
}

export function FloorKpi({ items }: {
  items: { label: string; value: React.ReactNode; tone?: 'ok' | 'warn' | 'alert' | 'mute' | 'info' }[];
}) {
  const tones = {
    ok: ASSEMBLY_DS.jade, warn: ASSEMBLY_DS.ochre, alert: ASSEMBLY_DS.coral,
    mute: ASSEMBLY_DS.mut, info: ASSEMBLY_DS.rose,
  } as const;
  return (
    <div className="grid grid-cols-2 gap-1 md:grid-cols-4">
      {items.map(k => (
        <div key={k.label} className="border px-2 py-1.5"
          style={{ borderColor: ASSEMBLY_DS.rule, background: 'rgba(255,255,255,0.012)' }}>
          <div className="text-[9px] uppercase tracking-[0.18em]" style={{ color: ASSEMBLY_DS.mut, fontFamily: 'ui-monospace, monospace' }}>{k.label}</div>
          <div className="text-[14px] font-semibold tabular-nums" style={{ color: k.tone ? tones[k.tone] : ASSEMBLY_DS.jade }}>{k.value}</div>
        </div>
      ))}
    </div>
  );
}

export function FloorRule({ label }: { label?: string }) {
  return (
    <div className="flex items-center gap-2 py-0.5">
      <div className="h-px flex-1" style={{ background: ASSEMBLY_DS.rule }} />
      {label ? <span className="text-[9px] uppercase tracking-[0.22em]" style={{ color: ASSEMBLY_DS.mut, fontFamily: 'ui-monospace, monospace' }}>{label}</span> : null}
      <div className="h-px flex-1" style={{ background: ASSEMBLY_DS.rule }} />
    </div>
  );
}

export function FloorBar({ label, pct, tone, tail }: {
  label: string; pct: number;
  tone: 'ok' | 'warn' | 'alert' | 'mute' | 'info';
  tail?: React.ReactNode;
}) {
  const tones = {
    ok: ASSEMBLY_DS.jade, warn: ASSEMBLY_DS.ochre, alert: ASSEMBLY_DS.coral,
    mute: ASSEMBLY_DS.mut, info: ASSEMBLY_DS.rose,
  } as const;
  return (
    <div className="grid grid-cols-[220px_1fr_80px_140px] gap-3 border-b py-1.5 text-[11px]"
      style={{ borderColor: ASSEMBLY_DS.ruleSoft, fontFamily: 'ui-monospace, monospace' }}>
      <span style={{ color: ASSEMBLY_DS.jade }}>{label}</span>
      <div className="h-1.5 self-center" style={{ background: ASSEMBLY_DS.forestDeep }}>
        <div className="h-full" style={{ width: `${Math.min(100, Math.max(0, pct))}%`, background: tones[tone] }} />
      </div>
      <span className="text-right tabular-nums" style={{ color: ASSEMBLY_DS.mut }}>{pct}%</span>
      <span className="text-right" style={{ color: tones[tone] }}>{tail}</span>
    </div>
  );
}

export function FloorCallout({ kicker, body }: { kicker: string; body: string }) {
  return (
    <div className="rounded-[3px] border border-dashed px-3 py-2 text-[10.5px] italic"
      style={{ borderColor: 'rgba(31,157,99,0.32)', color: ASSEMBLY_DS.mut, background: 'rgba(31,157,99,0.04)' }}>
      <span className="not-italic font-semibold uppercase tracking-[0.18em]" style={{ color: ASSEMBLY_DS.jade }}>{kicker}</span>
      {' — '}{body}
    </div>
  );
}

export function FloorSeal({ maxim }: { maxim: string }) {
  return (
    <div className="flex items-center justify-between rounded-[3px] border px-3 py-1.5 text-[10px]"
      style={{ borderColor: ASSEMBLY_DS.rule, background: 'rgba(31,157,99,0.04)' }}>
      <span className="uppercase tracking-[0.22em]" style={{ color: ASSEMBLY_DS.jade, fontFamily: 'ui-monospace, monospace' }}>NATIONAL ASSEMBLY · LOWER CHAMBER</span>
      <span className="italic" style={{ color: ASSEMBLY_DS.mut, fontFamily: 'Georgia, ui-serif, serif' }}>{maxim}</span>
    </div>
  );
}
