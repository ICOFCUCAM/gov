'use client';

// apps/foreign-affairs/design-system — World Dispatch design system.
// Diplomatic chrome — navy / gold / parchment — with primitives that
// echo the typography of dispatches and the seals of treaties.

import * as React from 'react';

export const FOREIGN_DS = {
  // base
  midnight: '#040813',
  navy: '#0b1428',
  parchment: '#e6d4a6',
  parchmentDim: '#a8916a',
  gold: '#d4a93e',
  goldDim: '#7e6628',
  // accents
  signal: '#5fb0ff',
  alliance: '#54d08f',
  drift: '#e0a13a',
  fracture: '#e0685f',
  ink: '#dde6f5',
  mut: '#7e8aa4',
  // structure
  rule: 'rgba(212,169,62,0.20)',
  ruleSoft: 'rgba(212,169,62,0.08)',
} as const;

export type ForeignArchetype =
  | 'dispatch'      // command surface
  | 'mission'       // mission post
  | 'treaty'        // treaty docket
  | 'intelligence'  // analytical signal
  | 'economic'      // economic diplomacy
  | 'law'           // sovereignty / legal
  | 'consular'      // citizen-facing
  | 'foresight'     // trajectory
  | 'organization'  // multilateral org
  | 'oversight';    // safeguards / audit

const ARCHETYPE: Record<ForeignArchetype, { tag: string; glyph: string }> = {
  dispatch:     { tag: 'WORLD DISPATCH',         glyph: '◈' },
  mission:      { tag: 'DIPLOMATIC MISSION',     glyph: '⌂' },
  treaty:       { tag: 'TREATY DOCKET',          glyph: '⚖' },
  intelligence: { tag: 'STRATEGIC INTEL',        glyph: '⌗' },
  economic:     { tag: 'ECONOMIC DIPLOMACY',     glyph: '✦' },
  law:          { tag: 'INTERNATIONAL LAW',      glyph: '§' },
  consular:     { tag: 'CONSULAR LINE',          glyph: '⬡' },
  foresight:    { tag: 'STRATEGIC FORESIGHT',    glyph: '↬' },
  organization: { tag: 'MULTILATERAL FORUM',     glyph: '◯' },
  oversight:    { tag: 'CONSTITUTIONAL CHECK',   glyph: '⌖' },
};

export function ChanceryFrame({ archetype, code, title, subtitle, posture, children }: {
  archetype: ForeignArchetype;
  code: string;
  title: string;
  subtitle?: string;
  posture?: 'aligned' | 'balanced' | 'realigning' | 'pressured' | 'crisis-engagement';
  children: React.ReactNode;
}) {
  const a = ARCHETYPE[archetype];
  const postureCol = posture === 'crisis-engagement' ? FOREIGN_DS.fracture
    : posture === 'pressured' ? FOREIGN_DS.drift
    : posture === 'realigning' ? FOREIGN_DS.signal
    : posture === 'balanced' ? FOREIGN_DS.gold
    : FOREIGN_DS.alliance;
  return (
    <section className="rounded-[4px] border"
      style={{
        borderColor: 'rgba(212,169,62,0.26)',
        background: `radial-gradient(110% 60% at 0% 0%, rgba(212,169,62,0.06) 0%, transparent 55%), ${FOREIGN_DS.midnight}`,
        boxShadow: 'inset 0 0 110px rgba(0,0,0,0.7)',
      }}>
      <header className="flex flex-wrap items-center gap-x-3 gap-y-1 border-b px-3 py-2"
        style={{ borderColor: FOREIGN_DS.rule }}>
        <span className="grid h-6 w-6 place-items-center rounded-[3px] text-[13px]"
          style={{ background: 'rgba(212,169,62,0.16)', color: FOREIGN_DS.gold }}
          aria-hidden>{a.glyph}</span>
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-[9px] uppercase tracking-[0.22em]" style={{ color: FOREIGN_DS.mut, fontFamily: 'ui-monospace, monospace' }}>{code}</span>
            <h2 className="truncate text-[13px] font-semibold tracking-tight" style={{ color: FOREIGN_DS.parchment, fontFamily: 'Georgia, ui-serif, serif' }}>{title}</h2>
            <span className="rounded-[2px] px-1.5 py-px text-[8px] font-semibold uppercase tracking-[0.16em]"
              style={{ background: 'rgba(212,169,62,0.16)', color: FOREIGN_DS.gold }}>{a.tag}</span>
          </div>
          {subtitle ? <p className="truncate text-[10px] italic" style={{ color: FOREIGN_DS.parchmentDim }}>{subtitle}</p> : null}
        </div>
        {posture ? (
          <div className="ml-auto flex items-center gap-2 text-[10px]">
            <span style={{ color: FOREIGN_DS.mut }}>posture</span>
            <span className="font-semibold uppercase tracking-[0.18em]" style={{ color: postureCol }}>{posture}</span>
          </div>
        ) : null}
      </header>
      <div className="space-y-2 p-2">{children}</div>
    </section>
  );
}

export function DispatchKpi({ items }: {
  items: { label: string; value: React.ReactNode; tone?: 'ok' | 'warn' | 'alert' | 'mute' | 'info' }[];
}) {
  const tones = {
    ok: FOREIGN_DS.alliance, warn: FOREIGN_DS.drift, alert: FOREIGN_DS.fracture,
    mute: FOREIGN_DS.mut, info: FOREIGN_DS.signal,
  } as const;
  return (
    <div className="grid grid-cols-2 gap-1 md:grid-cols-4">
      {items.map(k => (
        <div key={k.label} className="border px-2 py-1.5"
          style={{ borderColor: FOREIGN_DS.rule, background: 'rgba(255,255,255,0.012)' }}>
          <div className="text-[9px] uppercase tracking-[0.18em]" style={{ color: FOREIGN_DS.mut, fontFamily: 'ui-monospace, monospace' }}>{k.label}</div>
          <div className="text-[14px] font-semibold tabular-nums" style={{ color: k.tone ? tones[k.tone] : FOREIGN_DS.gold }}>{k.value}</div>
        </div>
      ))}
    </div>
  );
}

export function WorldRule({ label }: { label?: string }) {
  return (
    <div className="flex items-center gap-2 py-0.5">
      <div className="h-px flex-1" style={{ background: FOREIGN_DS.rule }} />
      {label ? <span className="text-[9px] uppercase tracking-[0.22em]" style={{ color: FOREIGN_DS.mut, fontFamily: 'ui-monospace, monospace' }}>{label}</span> : null}
      <div className="h-px flex-1" style={{ background: FOREIGN_DS.rule }} />
    </div>
  );
}

export function MissionRow({ post, partner, ambassador, security, continuity, flag }: {
  post: string; partner: string; ambassador: string;
  security: 'normal' | 'heightened' | 'lockdown' | 'evacuation';
  continuity: number;
  flag: string;
}) {
  const col = security === 'evacuation' ? FOREIGN_DS.fracture
    : security === 'lockdown' ? FOREIGN_DS.fracture
    : security === 'heightened' ? FOREIGN_DS.drift
    : FOREIGN_DS.alliance;
  return (
    <div className="grid grid-cols-[140px_1fr_140px_140px_120px] gap-3 border-b py-1.5 text-[11px]"
      style={{ borderColor: FOREIGN_DS.ruleSoft, fontFamily: 'ui-monospace, monospace' }}>
      <span style={{ color: FOREIGN_DS.gold }}>{post}</span>
      <span style={{ color: FOREIGN_DS.ink }}>{partner} · <span style={{ color: FOREIGN_DS.mut }}>{flag}</span></span>
      <span style={{ color: FOREIGN_DS.mut }}>{ambassador}</span>
      <span className="uppercase tracking-[0.16em]" style={{ color: col }}>● {security}</span>
      <span className="text-right tabular-nums" style={{ color: FOREIGN_DS.mut }}>continuity {continuity}</span>
    </div>
  );
}

export function TreatyStamp({ id, title, scope, status, compliance, signatories, domain }: {
  id: string; title: string; scope: string; status: string; compliance: number; signatories: number; domain: string;
}) {
  const col = status === 'in-force' ? FOREIGN_DS.alliance
    : status === 'review' || status === 'amendment' ? FOREIGN_DS.drift
    : status === 'suspended' ? FOREIGN_DS.fracture
    : FOREIGN_DS.mut;
  return (
    <div className="rounded-[4px] border px-3 py-2"
      style={{ borderColor: 'rgba(212,169,62,0.22)', background: 'rgba(212,169,62,0.04)' }}>
      <div className="flex items-center justify-between text-[10px]" style={{ fontFamily: 'ui-monospace, monospace' }}>
        <span style={{ color: FOREIGN_DS.gold }}>{id}</span>
        <span className="uppercase tracking-[0.16em]" style={{ color: col }}>● {status}</span>
      </div>
      <div className="mt-0.5 text-[12px]" style={{ color: FOREIGN_DS.parchment, fontFamily: 'Georgia, ui-serif, serif' }}>{title}</div>
      <div className="flex justify-between text-[10px]" style={{ color: FOREIGN_DS.mut, fontFamily: 'ui-monospace, monospace' }}>
        <span>{scope} · {domain} · {signatories} signatories</span>
        <span>compliance {compliance}</span>
      </div>
    </div>
  );
}

export function ChanceryCallout({ kicker, body }: { kicker: string; body: string }) {
  return (
    <div className="rounded-[3px] border border-dashed px-3 py-2 text-[10.5px] italic"
      style={{ borderColor: 'rgba(212,169,62,0.32)', color: FOREIGN_DS.parchmentDim, background: 'rgba(212,169,62,0.04)' }}>
      <span className="not-italic font-semibold uppercase tracking-[0.18em]" style={{ color: FOREIGN_DS.gold }}>{kicker}</span>
      {' — '}{body}
    </div>
  );
}

export function ChancerySeal({ maxim }: { maxim: string }) {
  return (
    <div className="flex items-center justify-between rounded-[3px] border px-3 py-1.5 text-[10px]"
      style={{ borderColor: FOREIGN_DS.rule, background: 'rgba(212,169,62,0.04)' }}>
      <span className="uppercase tracking-[0.22em]" style={{ color: FOREIGN_DS.gold, fontFamily: 'ui-monospace, monospace' }}>MINISTRY OF FOREIGN AFFAIRS · WORLD DISPATCH</span>
      <span className="italic" style={{ color: FOREIGN_DS.parchmentDim, fontFamily: 'Georgia, ui-serif, serif' }}>{maxim}</span>
    </div>
  );
}
