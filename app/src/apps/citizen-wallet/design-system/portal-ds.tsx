'use client';

// apps/citizen-portal/design-system — Citizen Wallet design system.
// Palette: clean off-white, ink-on-paper, civic teal, civic ember.
// This is a *citizen-facing* surface — calm, accessible, public.

import * as React from 'react';

export const PORTAL_DS = {
  paper: '#f7f4ee',
  paperSoft: '#f0ebe0',
  paperDeep: '#e8e1d2',
  ink: '#0d1820',
  inkSoft: '#283645',
  inkMut: '#647888',
  teal: '#0e7676',
  tealDeep: '#0c5d5d',
  ember: '#b8460e',
  jade: '#356b3e',
  rule: 'rgba(13,24,32,0.16)',
  ruleSoft: 'rgba(13,24,32,0.08)',
} as const;

export type PortalArchetype =
  | 'wallet' | 'identity' | 'health' | 'education' | 'welfare'
  | 'taxation' | 'justice' | 'civic' | 'permits' | 'mobility'
  | 'records' | 'foreign' | 'business' | 'voting' | 'safeguards';

const ARCHETYPE: Record<PortalArchetype, { tag: string; glyph: string }> = {
  wallet:     { tag: 'CITIZEN WALLET',     glyph: '◯' },
  identity:   { tag: 'SOVEREIGN IDENTITY', glyph: '☷' },
  health:     { tag: 'HEALTH WALLET',      glyph: '✚' },
  education:  { tag: 'LEARNER TWIN',       glyph: '✎' },
  welfare:    { tag: 'WELFARE & BENEFITS', glyph: '⌬' },
  taxation:   { tag: 'TAXATION',           glyph: '◈' },
  justice:    { tag: 'CIVIC JUSTICE',      glyph: '⚖' },
  civic:      { tag: 'CIVIC VOICE',        glyph: '☰' },
  permits:    { tag: 'PERMITS & LICENCES', glyph: '⌗' },
  mobility:   { tag: 'MOBILITY WALLET',    glyph: '↬' },
  records:    { tag: 'PERSONAL RECORDS',   glyph: '⌭' },
  foreign:    { tag: 'CONSULAR',           glyph: '⌖' },
  business:   { tag: 'BUSINESS REGISTRY',  glyph: '⬡' },
  voting:     { tag: 'VOTER WALLET',       glyph: '✓' },
  safeguards: { tag: 'CITIZEN SAFEGUARDS', glyph: '§' },
};

export function CitizenFrame({ archetype, code, title, subtitle, children }: {
  archetype: PortalArchetype;
  code: string;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  const a = ARCHETYPE[archetype];
  return (
    <section className="rounded-[6px] border"
      style={{
        borderColor: PORTAL_DS.rule,
        background: PORTAL_DS.paper,
        boxShadow: '0 1px 2px rgba(0,0,0,0.04), inset 0 0 60px rgba(255,255,255,0.6)',
      }}>
      <header className="flex flex-wrap items-center gap-x-3 gap-y-1 border-b px-3 py-2"
        style={{ borderColor: PORTAL_DS.rule, background: PORTAL_DS.paperSoft }}>
        <span className="grid h-7 w-7 place-items-center rounded-full text-[14px]"
          style={{ background: PORTAL_DS.teal, color: PORTAL_DS.paper }} aria-hidden>{a.glyph}</span>
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-[9px] uppercase tracking-[0.22em]" style={{ color: PORTAL_DS.inkMut, fontFamily: 'ui-monospace, monospace' }}>{code}</span>
            <h2 className="truncate text-[14px] font-semibold tracking-tight" style={{ color: PORTAL_DS.ink }}>{title}</h2>
            <span className="rounded-[3px] px-1.5 py-px text-[8px] font-semibold uppercase tracking-[0.16em]"
              style={{ background: PORTAL_DS.teal, color: PORTAL_DS.paper }}>{a.tag}</span>
          </div>
          {subtitle ? <p className="truncate text-[10.5px]" style={{ color: PORTAL_DS.inkMut }}>{subtitle}</p> : null}
        </div>
      </header>
      <div className="space-y-2 p-3">{children}</div>
    </section>
  );
}

export function CitizenKpi({ items }: {
  items: { label: string; value: React.ReactNode; tone?: 'ok' | 'warn' | 'alert' | 'mute' | 'info' }[];
}) {
  const tones = {
    ok: PORTAL_DS.jade, warn: PORTAL_DS.ember, alert: PORTAL_DS.ember,
    mute: PORTAL_DS.inkMut, info: PORTAL_DS.teal,
  } as const;
  return (
    <div className="grid grid-cols-2 gap-1.5 md:grid-cols-4">
      {items.map(k => (
        <div key={k.label} className="rounded-[4px] border px-2.5 py-2"
          style={{ borderColor: PORTAL_DS.rule, background: PORTAL_DS.paperSoft }}>
          <div className="text-[9px] uppercase tracking-[0.18em]" style={{ color: PORTAL_DS.inkMut, fontFamily: 'ui-monospace, monospace' }}>{k.label}</div>
          <div className="text-[15px] font-semibold tabular-nums" style={{ color: k.tone ? tones[k.tone] : PORTAL_DS.ink }}>{k.value}</div>
        </div>
      ))}
    </div>
  );
}

export function CitizenRule({ label }: { label?: string }) {
  return (
    <div className="flex items-center gap-2 py-0.5">
      <div className="h-px flex-1" style={{ background: PORTAL_DS.rule }} />
      {label ? <span className="text-[9px] uppercase tracking-[0.22em]" style={{ color: PORTAL_DS.inkMut, fontFamily: 'ui-monospace, monospace' }}>{label}</span> : null}
      <div className="h-px flex-1" style={{ background: PORTAL_DS.rule }} />
    </div>
  );
}

export function CitizenBar({ label, pct, tone, tail }: {
  label: string; pct: number;
  tone: 'ok' | 'warn' | 'alert' | 'mute' | 'info';
  tail?: React.ReactNode;
}) {
  const tones = {
    ok: PORTAL_DS.jade, warn: PORTAL_DS.ember, alert: PORTAL_DS.ember,
    mute: PORTAL_DS.inkMut, info: PORTAL_DS.teal,
  } as const;
  return (
    <div className="grid grid-cols-[220px_1fr_80px_140px] gap-3 border-b py-1.5 text-[11px]"
      style={{ borderColor: PORTAL_DS.ruleSoft, fontFamily: 'ui-monospace, monospace' }}>
      <span style={{ color: PORTAL_DS.ink }}>{label}</span>
      <div className="h-1.5 self-center rounded-full" style={{ background: PORTAL_DS.paperDeep }}>
        <div className="h-full rounded-full" style={{ width: `${Math.min(100, Math.max(0, pct))}%`, background: tones[tone] }} />
      </div>
      <span className="text-right tabular-nums" style={{ color: PORTAL_DS.inkMut }}>{pct}%</span>
      <span className="text-right" style={{ color: tones[tone] }}>{tail}</span>
    </div>
  );
}

export function CitizenCallout({ kicker, body }: { kicker: string; body: string }) {
  return (
    <div className="rounded-[4px] border-l-4 px-3 py-2 text-[11px]"
      style={{ borderLeftColor: PORTAL_DS.teal, background: 'rgba(14,118,118,0.06)', color: PORTAL_DS.inkSoft }}>
      <span className="font-semibold uppercase tracking-[0.16em]" style={{ color: PORTAL_DS.teal }}>{kicker}</span>
      {' — '}{body}
    </div>
  );
}

export function CitizenSeal({ maxim }: { maxim: string }) {
  return (
    <div className="flex items-center justify-between rounded-[4px] border px-3 py-1.5 text-[10.5px]"
      style={{ borderColor: PORTAL_DS.rule, background: PORTAL_DS.paperSoft }}>
      <span className="uppercase tracking-[0.22em]" style={{ color: PORTAL_DS.teal, fontFamily: 'ui-monospace, monospace' }}>CITIZEN SUPER-PORTAL · UNIFIED WALLET</span>
      <span className="italic" style={{ color: PORTAL_DS.inkMut, fontFamily: 'Georgia, ui-serif, serif' }}>{maxim}</span>
    </div>
  );
}
