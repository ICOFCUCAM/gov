'use client';

// apps/ministry-education/design-system — Lecture Hall design system.
// Visual identity for the Ministry of Education.
// Palette: parchment / cobalt / maple / gold / coral.

import * as React from 'react';

export const EDUCATION_DS = {
  ink: '#0a0e15',
  inkDeep: '#13181f',
  parchment: '#e6d9b8',
  cobalt: '#5f8ad0',
  cobaltDim: '#3a5689',
  maple: '#d8704a',
  gold: '#d4a93e',
  jade: '#6fa86a',
  coral: '#e0685f',
  parchmentInk: '#e8dfc6',
  mut: '#7e8090',
  rule: 'rgba(212,169,62,0.20)',
  ruleSoft: 'rgba(212,169,62,0.10)',
} as const;

export type EducationArchetype =
  | 'command' | 'institutions' | 'cohorts' | 'research'
  | 'knowledge' | 'curriculum' | 'continuity' | 'memory' | 'portal' | 'oversight';

const ARCHETYPE: Record<EducationArchetype, { tag: string; glyph: string }> = {
  command:     { tag: 'EDUCATION COMMAND',     glyph: '⌬' },
  institutions:{ tag: 'INSTITUTIONS',          glyph: '⌂' },
  cohorts:     { tag: 'GENERATIONAL COHORTS',  glyph: '⌗' },
  research:    { tag: 'RESEARCH LINEAGE',      glyph: '✦' },
  knowledge:   { tag: 'KNOWLEDGE INFRA',       glyph: '⌭' },
  curriculum:  { tag: 'CURRICULUM',            glyph: '◈' },
  continuity:  { tag: 'CONTINUITY OPS',        glyph: '✕' },
  memory:      { tag: 'CIVILIZATIONAL MEMORY', glyph: '☷' },
  portal:      { tag: 'PUBLIC EDUCATION',      glyph: '⬡' },
  oversight:   { tag: 'CONSTITUTIONAL CHECK',  glyph: '§' },
};

export function HallFrame({ archetype, code, title, subtitle, posture, children }: {
  archetype: EducationArchetype;
  code: string;
  title: string;
  subtitle?: string;
  posture?: 'consolidating' | 'sustained' | 'engaged' | 'strained' | 'fracture-watch';
  children: React.ReactNode;
}) {
  const a = ARCHETYPE[archetype];
  const postureCol = posture === 'fracture-watch' ? EDUCATION_DS.coral
    : posture === 'strained' ? EDUCATION_DS.maple
    : posture === 'engaged' ? EDUCATION_DS.cobalt
    : posture === 'consolidating' ? EDUCATION_DS.gold
    : EDUCATION_DS.jade;
  return (
    <section className="rounded-[4px] border"
      style={{
        borderColor: 'rgba(212,169,62,0.22)',
        background: `radial-gradient(110% 60% at 0% 0%, rgba(212,169,62,0.06) 0%, transparent 55%), ${EDUCATION_DS.ink}`,
        boxShadow: 'inset 0 0 110px rgba(0,0,0,0.7)',
      }}>
      <header className="flex flex-wrap items-center gap-x-3 gap-y-1 border-b px-3 py-2"
        style={{ borderColor: EDUCATION_DS.rule }}>
        <span className="grid h-6 w-6 place-items-center rounded-[3px] text-[13px]"
          style={{ background: 'rgba(212,169,62,0.16)', color: EDUCATION_DS.gold }}
          aria-hidden>{a.glyph}</span>
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-[9px] uppercase tracking-[0.22em]" style={{ color: EDUCATION_DS.mut, fontFamily: 'ui-monospace, monospace' }}>{code}</span>
            <h2 className="truncate text-[13px] font-semibold tracking-tight" style={{ color: EDUCATION_DS.parchmentInk, fontFamily: 'Georgia, ui-serif, serif' }}>{title}</h2>
            <span className="rounded-[2px] px-1.5 py-px text-[8px] font-semibold uppercase tracking-[0.16em]"
              style={{ background: 'rgba(212,169,62,0.16)', color: EDUCATION_DS.gold }}>{a.tag}</span>
          </div>
          {subtitle ? <p className="truncate text-[10px] italic" style={{ color: EDUCATION_DS.mut }}>{subtitle}</p> : null}
        </div>
        {posture ? (
          <div className="ml-auto flex items-center gap-2 text-[10px]">
            <span style={{ color: EDUCATION_DS.mut }}>posture</span>
            <span className="font-semibold uppercase tracking-[0.18em]" style={{ color: postureCol }}>{posture}</span>
          </div>
        ) : null}
      </header>
      <div className="space-y-2 p-2">{children}</div>
    </section>
  );
}

export function HallKpi({ items }: {
  items: { label: string; value: React.ReactNode; tone?: 'ok' | 'warn' | 'alert' | 'mute' | 'info' }[];
}) {
  const tones = {
    ok: EDUCATION_DS.jade, warn: EDUCATION_DS.maple, alert: EDUCATION_DS.coral,
    mute: EDUCATION_DS.mut, info: EDUCATION_DS.cobalt,
  } as const;
  return (
    <div className="grid grid-cols-2 gap-1 md:grid-cols-4">
      {items.map(k => (
        <div key={k.label} className="border px-2 py-1.5"
          style={{ borderColor: EDUCATION_DS.rule, background: 'rgba(255,255,255,0.012)' }}>
          <div className="text-[9px] uppercase tracking-[0.18em]" style={{ color: EDUCATION_DS.mut, fontFamily: 'ui-monospace, monospace' }}>{k.label}</div>
          <div className="text-[14px] font-semibold tabular-nums" style={{ color: k.tone ? tones[k.tone] : EDUCATION_DS.gold }}>{k.value}</div>
        </div>
      ))}
    </div>
  );
}

export function HallRule({ label }: { label?: string }) {
  return (
    <div className="flex items-center gap-2 py-0.5">
      <div className="h-px flex-1" style={{ background: EDUCATION_DS.rule }} />
      {label ? <span className="text-[9px] uppercase tracking-[0.22em]" style={{ color: EDUCATION_DS.mut, fontFamily: 'ui-monospace, monospace' }}>{label}</span> : null}
      <div className="h-px flex-1" style={{ background: EDUCATION_DS.rule }} />
    </div>
  );
}

export function HallBar({ label, pct, tone, tail }: {
  label: string; pct: number;
  tone: 'ok' | 'warn' | 'alert' | 'mute' | 'info';
  tail?: React.ReactNode;
}) {
  const tones = {
    ok: EDUCATION_DS.jade, warn: EDUCATION_DS.maple, alert: EDUCATION_DS.coral,
    mute: EDUCATION_DS.mut, info: EDUCATION_DS.cobalt,
  } as const;
  return (
    <div className="grid grid-cols-[220px_1fr_80px_140px] gap-3 border-b py-1.5 text-[11px]"
      style={{ borderColor: EDUCATION_DS.ruleSoft, fontFamily: 'ui-monospace, monospace' }}>
      <span style={{ color: EDUCATION_DS.gold }}>{label}</span>
      <div className="h-1.5 self-center" style={{ background: EDUCATION_DS.inkDeep }}>
        <div className="h-full" style={{ width: `${Math.min(100, Math.max(0, pct))}%`, background: tones[tone] }} />
      </div>
      <span className="text-right tabular-nums" style={{ color: EDUCATION_DS.mut }}>{pct}%</span>
      <span className="text-right" style={{ color: tones[tone] }}>{tail}</span>
    </div>
  );
}

export function HallCallout({ kicker, body }: { kicker: string; body: string }) {
  return (
    <div className="rounded-[3px] border border-dashed px-3 py-2 text-[10.5px] italic"
      style={{ borderColor: 'rgba(212,169,62,0.32)', color: EDUCATION_DS.mut, background: 'rgba(212,169,62,0.04)' }}>
      <span className="not-italic font-semibold uppercase tracking-[0.18em]" style={{ color: EDUCATION_DS.gold }}>{kicker}</span>
      {' — '}{body}
    </div>
  );
}

export function HallSeal({ maxim }: { maxim: string }) {
  return (
    <div className="flex items-center justify-between rounded-[3px] border px-3 py-1.5 text-[10px]"
      style={{ borderColor: EDUCATION_DS.rule, background: 'rgba(212,169,62,0.04)' }}>
      <span className="uppercase tracking-[0.22em]" style={{ color: EDUCATION_DS.gold, fontFamily: 'ui-monospace, monospace' }}>MINISTRY OF EDUCATION · LECTURE HALL</span>
      <span className="italic" style={{ color: EDUCATION_DS.mut, fontFamily: 'Georgia, ui-serif, serif' }}>{maxim}</span>
    </div>
  );
}
