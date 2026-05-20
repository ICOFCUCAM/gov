'use client';

// apps/ministry-agriculture/design-system — Seasonal Wheel design system.
// Visual identity for the Ministry of Agriculture & Food Security.
// Palette: deep-loam / wheat / harvest / sky / amber / chestnut.

import * as React from 'react';

export const AGRICULTURE_DS = {
  loam: '#0c0a06',
  loamDeep: '#16110a',
  wheat: '#d9b76a',
  wheatDim: '#7e6b3c',
  harvest: '#8acf6a',
  harvestDim: '#4f7c3d',
  sky: '#5fc4d8',
  amber: '#e0a13a',
  chestnut: '#a14a32',
  ink: '#e6dcc6',
  mut: '#7e7660',
  rule: 'rgba(217,183,106,0.20)',
  ruleSoft: 'rgba(217,183,106,0.10)',
} as const;

export type AgricultureArchetype =
  | 'command' | 'production' | 'water' | 'response'
  | 'governance' | 'subsidy' | 'intelligence' | 'portal' | 'oversight';

const ARCHETYPE: Record<AgricultureArchetype, { tag: string; glyph: string }> = {
  command:      { tag: 'FOOD CONTINUITY COMMAND',  glyph: '◬' },
  production:   { tag: 'PRODUCTION FIELD',         glyph: '✻' },
  water:        { tag: 'WATER & CLIMATE',          glyph: '⌭' },
  response:     { tag: 'CRISIS RESPONSE',          glyph: '✕' },
  governance:   { tag: 'RURAL GOVERNANCE',         glyph: '⌂' },
  subsidy:      { tag: 'SUBSIDY PROGRAMME',        glyph: '✤' },
  intelligence: { tag: 'AGRI INTELLIGENCE',        glyph: '⌗' },
  portal:       { tag: 'PUBLIC PORTAL',            glyph: '⬡' },
  oversight:    { tag: 'CONSTITUTIONAL CHECK',     glyph: '§' },
};

export function SeasonalFrame({ archetype, code, title, subtitle, season, children }: {
  archetype: AgricultureArchetype;
  code: string;
  title: string;
  subtitle?: string;
  season?: 'spring' | 'summer' | 'autumn' | 'winter';
  children: React.ReactNode;
}) {
  const a = ARCHETYPE[archetype];
  const seasonCol = season === 'summer' ? AGRICULTURE_DS.amber
    : season === 'autumn' ? AGRICULTURE_DS.chestnut
    : season === 'winter' ? AGRICULTURE_DS.sky
    : AGRICULTURE_DS.harvest;
  return (
    <section className="rounded-[4px] border"
      style={{
        borderColor: 'rgba(217,183,106,0.22)',
        background: `radial-gradient(110% 60% at 0% 0%, rgba(217,183,106,0.05) 0%, transparent 55%), ${AGRICULTURE_DS.loam}`,
        boxShadow: 'inset 0 0 110px rgba(0,0,0,0.7)',
      }}>
      <header className="flex flex-wrap items-center gap-x-3 gap-y-1 border-b px-3 py-2"
        style={{ borderColor: AGRICULTURE_DS.rule }}>
        <span className="grid h-6 w-6 place-items-center rounded-[3px] text-[13px]"
          style={{ background: 'rgba(217,183,106,0.16)', color: AGRICULTURE_DS.wheat }}
          aria-hidden>{a.glyph}</span>
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-[9px] uppercase tracking-[0.22em]" style={{ color: AGRICULTURE_DS.mut, fontFamily: 'ui-monospace, monospace' }}>{code}</span>
            <h2 className="truncate text-[13px] font-semibold tracking-tight" style={{ color: AGRICULTURE_DS.ink }}>{title}</h2>
            <span className="rounded-[2px] px-1.5 py-px text-[8px] font-semibold uppercase tracking-[0.16em]"
              style={{ background: 'rgba(217,183,106,0.16)', color: AGRICULTURE_DS.wheat }}>{a.tag}</span>
          </div>
          {subtitle ? <p className="truncate text-[10px] italic" style={{ color: AGRICULTURE_DS.mut }}>{subtitle}</p> : null}
        </div>
        {season ? (
          <div className="ml-auto flex items-center gap-2 text-[10px]">
            <span style={{ color: AGRICULTURE_DS.mut }}>season</span>
            <span className="font-semibold uppercase tracking-[0.18em]" style={{ color: seasonCol }}>{season}</span>
          </div>
        ) : null}
      </header>
      <div className="space-y-2 p-2">{children}</div>
    </section>
  );
}

export function SeasonalKpi({ items }: {
  items: { label: string; value: React.ReactNode; tone?: 'ok' | 'warn' | 'alert' | 'mute' | 'info' }[];
}) {
  const tones = {
    ok: AGRICULTURE_DS.harvest, warn: AGRICULTURE_DS.amber, alert: AGRICULTURE_DS.chestnut,
    mute: AGRICULTURE_DS.mut, info: AGRICULTURE_DS.sky,
  } as const;
  return (
    <div className="grid grid-cols-2 gap-1 md:grid-cols-4">
      {items.map(k => (
        <div key={k.label} className="border px-2 py-1.5"
          style={{ borderColor: AGRICULTURE_DS.rule, background: 'rgba(255,255,255,0.012)' }}>
          <div className="text-[9px] uppercase tracking-[0.18em]" style={{ color: AGRICULTURE_DS.mut, fontFamily: 'ui-monospace, monospace' }}>{k.label}</div>
          <div className="text-[14px] font-semibold tabular-nums" style={{ color: k.tone ? tones[k.tone] : AGRICULTURE_DS.wheat }}>{k.value}</div>
        </div>
      ))}
    </div>
  );
}

export function SeasonalRule({ label }: { label?: string }) {
  return (
    <div className="flex items-center gap-2 py-0.5">
      <div className="h-px flex-1" style={{ background: AGRICULTURE_DS.rule }} />
      {label ? <span className="text-[9px] uppercase tracking-[0.22em]" style={{ color: AGRICULTURE_DS.mut, fontFamily: 'ui-monospace, monospace' }}>{label}</span> : null}
      <div className="h-px flex-1" style={{ background: AGRICULTURE_DS.rule }} />
    </div>
  );
}

export function CropRow({ crop, idx, tone, tail }: {
  crop: string; idx: number;
  tone: 'ok' | 'warn' | 'alert' | 'mute' | 'info';
  tail?: React.ReactNode;
}) {
  const tones = {
    ok: AGRICULTURE_DS.harvest, warn: AGRICULTURE_DS.amber, alert: AGRICULTURE_DS.chestnut,
    mute: AGRICULTURE_DS.mut, info: AGRICULTURE_DS.sky,
  } as const;
  return (
    <div className="grid grid-cols-[200px_1fr_80px_100px] gap-3 border-b py-1.5 text-[11px]"
      style={{ borderColor: AGRICULTURE_DS.ruleSoft, fontFamily: 'ui-monospace, monospace' }}>
      <span style={{ color: AGRICULTURE_DS.wheat }}>{crop}</span>
      <div className="h-1.5 self-center" style={{ background: AGRICULTURE_DS.loamDeep }}>
        <div className="h-full" style={{ width: `${Math.min(100, idx)}%`, background: tones[tone] }} />
      </div>
      <span className="text-right tabular-nums" style={{ color: AGRICULTURE_DS.mut }}>{idx}</span>
      <span className="text-right" style={{ color: tones[tone] }}>{tail ?? tone}</span>
    </div>
  );
}

export function AdvisoryRow({ id, kind, region, severity, tail }: {
  id: string; kind: string; region: string;
  severity: 'advisory' | 'warning' | 'severe';
  tail?: React.ReactNode;
}) {
  const col = severity === 'severe' ? AGRICULTURE_DS.chestnut
    : severity === 'warning' ? AGRICULTURE_DS.amber
    : AGRICULTURE_DS.harvest;
  return (
    <div className="grid grid-cols-[110px_180px_140px_100px_120px] gap-3 border-b py-1.5 text-[11px]"
      style={{ borderColor: AGRICULTURE_DS.ruleSoft, fontFamily: 'ui-monospace, monospace' }}>
      <span style={{ color: AGRICULTURE_DS.wheat }}>{id}</span>
      <span style={{ color: AGRICULTURE_DS.ink }}>{kind}</span>
      <span style={{ color: AGRICULTURE_DS.mut }}>{region}</span>
      <span className="text-right uppercase tracking-[0.16em]" style={{ color: col }}>● {severity}</span>
      <span className="text-right" style={{ color: AGRICULTURE_DS.mut }}>{tail}</span>
    </div>
  );
}

export function SeasonalCallout({ kicker, body }: { kicker: string; body: string }) {
  return (
    <div className="rounded-[3px] border border-dashed px-3 py-2 text-[10.5px] italic"
      style={{ borderColor: 'rgba(217,183,106,0.32)', color: AGRICULTURE_DS.mut, background: 'rgba(217,183,106,0.04)' }}>
      <span className="not-italic font-semibold uppercase tracking-[0.18em]" style={{ color: AGRICULTURE_DS.wheat }}>{kicker}</span>
      {' — '}{body}
    </div>
  );
}

export function SeasonalSeal({ maxim }: { maxim: string }) {
  return (
    <div className="flex items-center justify-between rounded-[3px] border px-3 py-1.5 text-[10px]"
      style={{ borderColor: AGRICULTURE_DS.rule, background: 'rgba(217,183,106,0.04)' }}>
      <span className="uppercase tracking-[0.22em]" style={{ color: AGRICULTURE_DS.wheat, fontFamily: 'ui-monospace, monospace' }}>MINISTRY OF AGRICULTURE · SEASONAL WHEEL</span>
      <span className="italic" style={{ color: AGRICULTURE_DS.mut }}>{maxim}</span>
    </div>
  );
}
