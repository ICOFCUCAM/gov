'use client';

// apps/ministry-environment/design-system — Biome Map design system.
// Visual identity for the Ministry of Environment & Climate Resilience.
// Palette: deep-moss / leaf / soil / sky / amber / coral.

import * as React from 'react';

export const ENVIRONMENT_DS = {
  // base
  obsidian: '#040b0a',
  moss: '#0a1714',
  leaf: '#6fcf6a',
  leafDim: '#3d6a3a',
  soil: '#8a6b3a',
  soilDim: '#5a4422',
  sky: '#5fc4d8',
  amber: '#e0a13a',
  coral: '#e0685f',
  ink: '#d8e2d6',
  mut: '#7e8a82',
  // structure
  rule: 'rgba(111,207,106,0.18)',
  ruleSoft: 'rgba(111,207,106,0.08)',
} as const;

export type EnvironmentArchetype =
  | 'biome'         // climate command / ecoregion stress
  | 'ecosystem'     // biosphere / protected regions
  | 'atmosphere'    // air / weather
  | 'hydrosphere'   // water / oceans / basins
  | 'pollution'     // emissions / compliance
  | 'incident'      // active climate incidents
  | 'forecast'      // long-horizon trajectory
  | 'registry'      // permits / resources / catalog
  | 'portal'        // citizen-facing
  | 'oversight';    // safeguards / audit

const ARCHETYPE: Record<EnvironmentArchetype, { tag: string; glyph: string }> = {
  biome:       { tag: 'BIOME COMMAND',          glyph: '◬' },
  ecosystem:   { tag: 'ECOSYSTEM CONTINUITY',   glyph: '⌬' },
  atmosphere:  { tag: 'ATMOSPHERIC SYSTEMS',    glyph: '⌗' },
  hydrosphere: { tag: 'HYDROSPHERE LANE',       glyph: '⌭' },
  pollution:   { tag: 'POLLUTION COMPLIANCE',   glyph: '⊗' },
  incident:    { tag: 'CLIMATE INCIDENT',       glyph: '✕' },
  forecast:    { tag: 'PLANETARY FORESIGHT',    glyph: '↬' },
  registry:    { tag: 'RESOURCE REGISTRY',      glyph: '▤' },
  portal:      { tag: 'PUBLIC ENVIRONMENT',     glyph: '⬡' },
  oversight:   { tag: 'CONSTITUTIONAL CHECK',   glyph: '§' },
};

export function BiomeFrame({ archetype, code, title, subtitle, posture, children }: {
  archetype: EnvironmentArchetype;
  code: string;
  title: string;
  subtitle?: string;
  posture?: 'stable' | 'observant' | 'engaged' | 'stressed' | 'crisis-coordination';
  children: React.ReactNode;
}) {
  const a = ARCHETYPE[archetype];
  const postureCol = posture === 'crisis-coordination' ? ENVIRONMENT_DS.coral
    : posture === 'stressed' ? ENVIRONMENT_DS.coral
    : posture === 'engaged' ? ENVIRONMENT_DS.amber
    : posture === 'observant' ? ENVIRONMENT_DS.sky
    : ENVIRONMENT_DS.leaf;
  return (
    <section className="rounded-[4px] border"
      style={{
        borderColor: 'rgba(111,207,106,0.22)',
        background: `radial-gradient(110% 60% at 0% 0%, rgba(111,207,106,0.06) 0%, transparent 55%), ${ENVIRONMENT_DS.obsidian}`,
        boxShadow: 'inset 0 0 110px rgba(0,0,0,0.7)',
      }}>
      <header className="flex flex-wrap items-center gap-x-3 gap-y-1 border-b px-3 py-2"
        style={{ borderColor: ENVIRONMENT_DS.rule }}>
        <span className="grid h-6 w-6 place-items-center rounded-[3px] text-[13px]"
          style={{ background: 'rgba(111,207,106,0.16)', color: ENVIRONMENT_DS.leaf }}
          aria-hidden>{a.glyph}</span>
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-[9px] uppercase tracking-[0.22em]" style={{ color: ENVIRONMENT_DS.mut, fontFamily: 'ui-monospace, monospace' }}>{code}</span>
            <h2 className="truncate text-[13px] font-semibold tracking-tight" style={{ color: ENVIRONMENT_DS.ink }}>{title}</h2>
            <span className="rounded-[2px] px-1.5 py-px text-[8px] font-semibold uppercase tracking-[0.16em]"
              style={{ background: 'rgba(111,207,106,0.16)', color: ENVIRONMENT_DS.leaf }}>{a.tag}</span>
          </div>
          {subtitle ? <p className="truncate text-[10px] italic" style={{ color: ENVIRONMENT_DS.mut }}>{subtitle}</p> : null}
        </div>
        {posture ? (
          <div className="ml-auto flex items-center gap-2 text-[10px]">
            <span style={{ color: ENVIRONMENT_DS.mut }}>posture</span>
            <span className="font-semibold uppercase tracking-[0.18em]" style={{ color: postureCol }}>{posture}</span>
          </div>
        ) : null}
      </header>
      <div className="space-y-2 p-2">{children}</div>
    </section>
  );
}

export function BiomeKpi({ items }: {
  items: { label: string; value: React.ReactNode; tone?: 'ok' | 'warn' | 'alert' | 'mute' | 'info' }[];
}) {
  const tones = {
    ok: ENVIRONMENT_DS.leaf, warn: ENVIRONMENT_DS.amber, alert: ENVIRONMENT_DS.coral,
    mute: ENVIRONMENT_DS.mut, info: ENVIRONMENT_DS.sky,
  } as const;
  return (
    <div className="grid grid-cols-2 gap-1 md:grid-cols-4">
      {items.map(k => (
        <div key={k.label} className="border px-2 py-1.5"
          style={{ borderColor: ENVIRONMENT_DS.rule, background: 'rgba(255,255,255,0.012)' }}>
          <div className="text-[9px] uppercase tracking-[0.18em]" style={{ color: ENVIRONMENT_DS.mut, fontFamily: 'ui-monospace, monospace' }}>{k.label}</div>
          <div className="text-[14px] font-semibold tabular-nums" style={{ color: k.tone ? tones[k.tone] : ENVIRONMENT_DS.leaf }}>{k.value}</div>
        </div>
      ))}
    </div>
  );
}

export function BiomeRule({ label }: { label?: string }) {
  return (
    <div className="flex items-center gap-2 py-0.5">
      <div className="h-px flex-1" style={{ background: ENVIRONMENT_DS.rule }} />
      {label ? <span className="text-[9px] uppercase tracking-[0.22em]" style={{ color: ENVIRONMENT_DS.mut, fontFamily: 'ui-monospace, monospace' }}>{label}</span> : null}
      <div className="h-px flex-1" style={{ background: ENVIRONMENT_DS.rule }} />
    </div>
  );
}

export function EcoregionRow({ name, stress, classification, tail }: {
  name: string; stress: number;
  classification: 'stable' | 'observant' | 'stressed' | 'critical' | 'tipping';
  tail?: React.ReactNode;
}) {
  const col = classification === 'tipping' ? ENVIRONMENT_DS.coral
    : classification === 'critical' ? ENVIRONMENT_DS.coral
    : classification === 'stressed' ? ENVIRONMENT_DS.amber
    : classification === 'observant' ? ENVIRONMENT_DS.sky
    : ENVIRONMENT_DS.leaf;
  return (
    <div className="grid grid-cols-[200px_1fr_100px_100px] gap-3 border-b py-1.5 text-[11px]"
      style={{ borderColor: ENVIRONMENT_DS.ruleSoft, fontFamily: 'ui-monospace, monospace' }}>
      <span style={{ color: ENVIRONMENT_DS.leaf }}>{name}</span>
      <div className="h-1.5 self-center" style={{ background: ENVIRONMENT_DS.moss }}>
        <div className="h-full" style={{ width: `${stress}%`, background: col }} />
      </div>
      <span className="text-right tabular-nums" style={{ color: ENVIRONMENT_DS.mut }}>stress {stress}</span>
      <span className="text-right uppercase tracking-[0.16em]" style={{ color: col }}>● {classification}</span>
    </div>
  );
}

export function BiomeIncidentRow({ id, kind, region, severity, pathway, tail }: {
  id: string; kind: string; region: string;
  severity: 'advisory' | 'elevated' | 'critical' | 'national';
  pathway: string; tail?: React.ReactNode;
}) {
  const col = severity === 'national' ? ENVIRONMENT_DS.coral
    : severity === 'critical' ? ENVIRONMENT_DS.coral
    : severity === 'elevated' ? ENVIRONMENT_DS.amber
    : ENVIRONMENT_DS.leaf;
  return (
    <div className="grid grid-cols-[110px_1fr_140px_120px_120px] gap-3 border-b py-1.5 text-[11px]"
      style={{ borderColor: ENVIRONMENT_DS.ruleSoft, fontFamily: 'ui-monospace, monospace' }}>
      <span style={{ color: ENVIRONMENT_DS.leaf }}>{id}</span>
      <span style={{ color: ENVIRONMENT_DS.ink }}>{kind}</span>
      <span style={{ color: ENVIRONMENT_DS.mut }}>{region}</span>
      <span className="uppercase tracking-[0.16em]" style={{ color: col }}>● {severity}</span>
      <span className="text-right" style={{ color: ENVIRONMENT_DS.mut }}>{tail ?? pathway}</span>
    </div>
  );
}

export function BiomeCallout({ kicker, body }: { kicker: string; body: string }) {
  return (
    <div className="rounded-[3px] border border-dashed px-3 py-2 text-[10.5px] italic"
      style={{ borderColor: 'rgba(111,207,106,0.32)', color: ENVIRONMENT_DS.mut, background: 'rgba(111,207,106,0.04)' }}>
      <span className="not-italic font-semibold uppercase tracking-[0.18em]" style={{ color: ENVIRONMENT_DS.leaf }}>{kicker}</span>
      {' — '}{body}
    </div>
  );
}

export function BiomeSeal({ maxim }: { maxim: string }) {
  return (
    <div className="flex items-center justify-between rounded-[3px] border px-3 py-1.5 text-[10px]"
      style={{ borderColor: ENVIRONMENT_DS.rule, background: 'rgba(111,207,106,0.04)' }}>
      <span className="uppercase tracking-[0.22em]" style={{ color: ENVIRONMENT_DS.leaf, fontFamily: 'ui-monospace, monospace' }}>MINISTRY OF ENVIRONMENT · BIOME MAP</span>
      <span className="italic" style={{ color: ENVIRONMENT_DS.mut }}>{maxim}</span>
    </div>
  );
}
