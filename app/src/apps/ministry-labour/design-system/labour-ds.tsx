'use client';

// apps/ministry-labour/design-system — Workforce Flow design system.
// Visual identity for the Ministry of Labour & Social Protection.
// Palette: slate / steel-blue / amber / teal / coral / ink.

import * as React from 'react';

export const LABOUR_DS = {
  slate: '#0a0d12',
  slateDeep: '#13171e',
  steel: '#5fa8ff',
  steelDim: '#3a6dac',
  amber: '#e0a13a',
  teal: '#45c0c8',
  rose: '#d86a8c',
  coral: '#e0685f',
  ink: '#dfe6f2',
  mut: '#7e8a9a',
  rule: 'rgba(95,168,255,0.18)',
  ruleSoft: 'rgba(95,168,255,0.08)',
} as const;

export type LabourArchetype =
  | 'workforce' | 'protection' | 'rights' | 'demographic'
  | 'continuity' | 'emergency' | 'portal' | 'intelligence' | 'oversight';

const ARCHETYPE: Record<LabourArchetype, { tag: string; glyph: string }> = {
  workforce:    { tag: 'WORKFORCE COMMAND',     glyph: '⌬' },
  protection:   { tag: 'SOCIAL PROTECTION',     glyph: '✚' },
  rights:       { tag: 'LABOUR RIGHTS',         glyph: '§' },
  demographic:  { tag: 'DEMOGRAPHIC ANALYTICS', glyph: '⌗' },
  continuity:   { tag: 'CONTINUITY LANE',       glyph: '⌭' },
  emergency:    { tag: 'EMERGENCY OPS',         glyph: '✕' },
  portal:       { tag: 'PUBLIC LABOUR',         glyph: '⬡' },
  intelligence: { tag: 'WORKFORCE INTEL',       glyph: '↬' },
  oversight:    { tag: 'CONSTITUTIONAL CHECK',  glyph: '⌖' },
};

export function WorkforceFrame({ archetype, code, title, subtitle, posture, children }: {
  archetype: LabourArchetype;
  code: string;
  title: string;
  subtitle?: string;
  posture?: 'flowing' | 'engaged' | 'strained' | 'crisis' | 'mobilisation';
  children: React.ReactNode;
}) {
  const a = ARCHETYPE[archetype];
  const postureCol = posture === 'crisis' || posture === 'mobilisation' ? LABOUR_DS.coral
    : posture === 'strained' ? LABOUR_DS.amber
    : posture === 'engaged' ? LABOUR_DS.steel
    : LABOUR_DS.teal;
  return (
    <section className="rounded-[4px] border"
      style={{
        borderColor: 'rgba(95,168,255,0.22)',
        background: `radial-gradient(110% 60% at 0% 0%, rgba(95,168,255,0.06) 0%, transparent 55%), ${LABOUR_DS.slate}`,
        boxShadow: 'inset 0 0 110px rgba(0,0,0,0.7)',
      }}>
      <header className="flex flex-wrap items-center gap-x-3 gap-y-1 border-b px-3 py-2"
        style={{ borderColor: LABOUR_DS.rule }}>
        <span className="grid h-6 w-6 place-items-center rounded-[3px] text-[13px]"
          style={{ background: 'rgba(95,168,255,0.16)', color: LABOUR_DS.steel }}
          aria-hidden>{a.glyph}</span>
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-[9px] uppercase tracking-[0.22em]" style={{ color: LABOUR_DS.mut, fontFamily: 'ui-monospace, monospace' }}>{code}</span>
            <h2 className="truncate text-[13px] font-semibold tracking-tight" style={{ color: LABOUR_DS.ink }}>{title}</h2>
            <span className="rounded-[2px] px-1.5 py-px text-[8px] font-semibold uppercase tracking-[0.16em]"
              style={{ background: 'rgba(95,168,255,0.16)', color: LABOUR_DS.steel }}>{a.tag}</span>
          </div>
          {subtitle ? <p className="truncate text-[10px] italic" style={{ color: LABOUR_DS.mut }}>{subtitle}</p> : null}
        </div>
        {posture ? (
          <div className="ml-auto flex items-center gap-2 text-[10px]">
            <span style={{ color: LABOUR_DS.mut }}>posture</span>
            <span className="font-semibold uppercase tracking-[0.18em]" style={{ color: postureCol }}>{posture}</span>
          </div>
        ) : null}
      </header>
      <div className="space-y-2 p-2">{children}</div>
    </section>
  );
}

export function WorkforceKpi({ items }: {
  items: { label: string; value: React.ReactNode; tone?: 'ok' | 'warn' | 'alert' | 'mute' | 'info' }[];
}) {
  const tones = {
    ok: LABOUR_DS.teal, warn: LABOUR_DS.amber, alert: LABOUR_DS.coral,
    mute: LABOUR_DS.mut, info: LABOUR_DS.steel,
  } as const;
  return (
    <div className="grid grid-cols-2 gap-1 md:grid-cols-4">
      {items.map(k => (
        <div key={k.label} className="border px-2 py-1.5"
          style={{ borderColor: LABOUR_DS.rule, background: 'rgba(255,255,255,0.012)' }}>
          <div className="text-[9px] uppercase tracking-[0.18em]" style={{ color: LABOUR_DS.mut, fontFamily: 'ui-monospace, monospace' }}>{k.label}</div>
          <div className="text-[14px] font-semibold tabular-nums" style={{ color: k.tone ? tones[k.tone] : LABOUR_DS.steel }}>{k.value}</div>
        </div>
      ))}
    </div>
  );
}

export function WorkforceRule({ label }: { label?: string }) {
  return (
    <div className="flex items-center gap-2 py-0.5">
      <div className="h-px flex-1" style={{ background: LABOUR_DS.rule }} />
      {label ? <span className="text-[9px] uppercase tracking-[0.22em]" style={{ color: LABOUR_DS.mut, fontFamily: 'ui-monospace, monospace' }}>{label}</span> : null}
      <div className="h-px flex-1" style={{ background: LABOUR_DS.rule }} />
    </div>
  );
}

export function FlowBar({ label, pct, tone, tail }: {
  label: string; pct: number;
  tone: 'ok' | 'warn' | 'alert' | 'mute' | 'info';
  tail?: React.ReactNode;
}) {
  const tones = {
    ok: LABOUR_DS.teal, warn: LABOUR_DS.amber, alert: LABOUR_DS.coral,
    mute: LABOUR_DS.mut, info: LABOUR_DS.steel,
  } as const;
  return (
    <div className="grid grid-cols-[220px_1fr_80px_140px] gap-3 border-b py-1.5 text-[11px]"
      style={{ borderColor: LABOUR_DS.ruleSoft, fontFamily: 'ui-monospace, monospace' }}>
      <span style={{ color: LABOUR_DS.steel }}>{label}</span>
      <div className="h-1.5 self-center" style={{ background: LABOUR_DS.slateDeep }}>
        <div className="h-full" style={{ width: `${Math.min(100, Math.max(0, pct))}%`, background: tones[tone] }} />
      </div>
      <span className="text-right tabular-nums" style={{ color: LABOUR_DS.mut }}>{pct}%</span>
      <span className="text-right" style={{ color: tones[tone] }}>{tail}</span>
    </div>
  );
}

export function WorkforceCallout({ kicker, body }: { kicker: string; body: string }) {
  return (
    <div className="rounded-[3px] border border-dashed px-3 py-2 text-[10.5px] italic"
      style={{ borderColor: 'rgba(95,168,255,0.32)', color: LABOUR_DS.mut, background: 'rgba(95,168,255,0.04)' }}>
      <span className="not-italic font-semibold uppercase tracking-[0.18em]" style={{ color: LABOUR_DS.steel }}>{kicker}</span>
      {' — '}{body}
    </div>
  );
}

export function WorkforceSeal({ maxim }: { maxim: string }) {
  return (
    <div className="flex items-center justify-between rounded-[3px] border px-3 py-1.5 text-[10px]"
      style={{ borderColor: LABOUR_DS.rule, background: 'rgba(95,168,255,0.04)' }}>
      <span className="uppercase tracking-[0.22em]" style={{ color: LABOUR_DS.steel, fontFamily: 'ui-monospace, monospace' }}>MINISTRY OF LABOUR · WORKFORCE FLOW</span>
      <span className="italic" style={{ color: LABOUR_DS.mut }}>{maxim}</span>
    </div>
  );
}
