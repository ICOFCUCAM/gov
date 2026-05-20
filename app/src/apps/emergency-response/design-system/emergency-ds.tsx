'use client';

// apps/emergency-response/design-system — Crisis Theatre design system.
// Visual identity for the National Emergency Operations Centre. The
// palette is the burning-amber + scarlet of a live response board.

import * as React from 'react';

export const EMERGENCY_DS = {
  // base tones
  obsidian: '#0c0406',
  smoke: '#170809',
  ember: '#ff5d5d',
  emberDim: '#9a3b3b',
  amber: '#f0a050',
  amberDim: '#7e5c3a',
  // accents
  signal: '#5fb0ff',     // information / inter-ministry
  stand: '#54d08f',      // stable / standing-down
  watch: '#e0c14a',      // watch / pre-mobilise
  ash: '#a4a08a',
  // structure
  rule: 'rgba(240,160,80,0.16)',
  ruleSoft: 'rgba(240,160,80,0.08)',
  ink: '#e8d6c4',
  mut: '#8a7e6d',
} as const;

export type EmergencyArchetype =
  | 'theatre'      // crisis-theatre command board
  | 'mobilise'     // mobilisation runtime
  | 'rescue'       // operational rescue
  | 'continuity'   // infrastructure continuity
  | 'humanitarian' // shelter & displacement
  | 'broadcast'    // crisis communications
  | 'recovery'     // reconstruction
  | 'forecast'     // foresight & risk
  | 'registry'     // catalog / inventory
  | 'oversight';   // safeguard governance

const ARCHETYPE: Record<EmergencyArchetype, { tag: string; glyph: string }> = {
  theatre:      { tag: 'CRISIS THEATRE',        glyph: '◬' },
  mobilise:     { tag: 'MOBILISATION RUNTIME',  glyph: '⟳' },
  rescue:       { tag: 'RESCUE OPERATION',      glyph: '✚' },
  continuity:   { tag: 'CONTINUITY LANE',       glyph: '⌗' },
  humanitarian: { tag: 'HUMANITARIAN LINE',     glyph: '⬡' },
  broadcast:    { tag: 'CRISIS BROADCAST',      glyph: '⌇' },
  recovery:     { tag: 'RECOVERY PROGRAMME',    glyph: '↺' },
  forecast:     { tag: 'STRATEGIC FORESIGHT',   glyph: '⌗' },
  registry:     { tag: 'OPERATIONAL REGISTRY',  glyph: '▤' },
  oversight:    { tag: 'CONSTITUTIONAL CHECK',  glyph: '§' },
};

export function TheatreFrame({ archetype, code, title, subtitle, posture, children }: {
  archetype: EmergencyArchetype;
  code: string;
  title: string;
  subtitle?: string;
  posture?: 'standby' | 'watch' | 'engaged' | 'crisis' | 'national-mobilisation';
  children: React.ReactNode;
}) {
  const a = ARCHETYPE[archetype];
  const postureCol = posture === 'national-mobilisation' ? EMERGENCY_DS.ember
    : posture === 'crisis' ? EMERGENCY_DS.ember
    : posture === 'engaged' ? EMERGENCY_DS.amber
    : posture === 'watch' ? EMERGENCY_DS.watch
    : EMERGENCY_DS.stand;
  return (
    <section className="rounded-[4px] border"
      style={{
        borderColor: 'rgba(255,93,93,0.22)',
        background: `radial-gradient(110% 70% at 0% 0%, rgba(255,93,93,0.06) 0%, transparent 55%), ${EMERGENCY_DS.obsidian}`,
        boxShadow: 'inset 0 0 110px rgba(0,0,0,0.65)',
      }}>
      <header className="flex flex-wrap items-center gap-x-3 gap-y-1 border-b px-3 py-2"
        style={{ borderColor: EMERGENCY_DS.rule }}>
        <span className="grid h-6 w-6 place-items-center rounded-[3px] text-[13px]"
          style={{ background: 'rgba(255,93,93,0.16)', color: EMERGENCY_DS.ember }}
          aria-hidden>{a.glyph}</span>
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-[9px] uppercase tracking-[0.22em]" style={{ color: EMERGENCY_DS.mut, fontFamily: 'ui-monospace, monospace' }}>{code}</span>
            <h2 className="truncate text-[13px] font-semibold tracking-tight" style={{ color: EMERGENCY_DS.ink }}>{title}</h2>
            <span className="rounded-[2px] px-1.5 py-px text-[8px] font-semibold uppercase tracking-[0.16em]"
              style={{ background: 'rgba(240,160,80,0.14)', color: EMERGENCY_DS.amber }}>{a.tag}</span>
          </div>
          {subtitle ? <p className="truncate text-[10px]" style={{ color: EMERGENCY_DS.mut }}>{subtitle}</p> : null}
        </div>
        {posture ? (
          <div className="ml-auto flex items-center gap-2 text-[10px]">
            <span style={{ color: EMERGENCY_DS.mut }}>posture</span>
            <span className="font-semibold uppercase tracking-[0.18em]" style={{ color: postureCol }}>{posture}</span>
          </div>
        ) : null}
      </header>
      <div className="space-y-2 p-2">{children}</div>
    </section>
  );
}

export function StatusBoardKpi({ items }: {
  items: { label: string; value: React.ReactNode; tone?: 'ok' | 'warn' | 'alert' | 'mute' | 'info' }[];
}) {
  const tones = {
    ok: EMERGENCY_DS.stand, warn: EMERGENCY_DS.watch, alert: EMERGENCY_DS.ember,
    mute: EMERGENCY_DS.mut, info: EMERGENCY_DS.signal,
  } as const;
  return (
    <div className="grid grid-cols-2 gap-1 md:grid-cols-4">
      {items.map(k => (
        <div key={k.label} className="border px-2 py-1.5"
          style={{ borderColor: EMERGENCY_DS.rule, background: 'rgba(255,255,255,0.012)' }}>
          <div className="text-[9px] uppercase tracking-[0.18em]" style={{ color: EMERGENCY_DS.mut, fontFamily: 'ui-monospace, monospace' }}>{k.label}</div>
          <div className="text-[14px] font-semibold tabular-nums" style={{ color: k.tone ? tones[k.tone] : EMERGENCY_DS.amber }}>{k.value}</div>
        </div>
      ))}
    </div>
  );
}

export function TheatreRule({ label }: { label?: string }) {
  return (
    <div className="flex items-center gap-2 py-0.5">
      <div className="h-px flex-1" style={{ background: EMERGENCY_DS.rule }} />
      {label ? <span className="text-[9px] uppercase tracking-[0.22em]" style={{ color: EMERGENCY_DS.mut }}>{label}</span> : null}
      <div className="h-px flex-1" style={{ background: EMERGENCY_DS.rule }} />
    </div>
  );
}

export function IncidentRow({ id, kind, region, status, tail, severity }: {
  id: string;
  kind: string;
  region: string;
  status: string;
  tail?: React.ReactNode;
  severity: 'advisory' | 'elevated' | 'critical' | 'national';
}) {
  const col = severity === 'national' ? EMERGENCY_DS.ember
    : severity === 'critical' ? EMERGENCY_DS.ember
    : severity === 'elevated' ? EMERGENCY_DS.amber
    : EMERGENCY_DS.stand;
  return (
    <div className="grid grid-cols-[120px_1fr_120px_110px_110px] gap-3 border-b py-1.5 text-[11px]"
      style={{ borderColor: EMERGENCY_DS.ruleSoft, fontFamily: 'ui-monospace, monospace' }}>
      <span className="tabular-nums" style={{ color: EMERGENCY_DS.amber }}>{id}</span>
      <span style={{ color: EMERGENCY_DS.ink }}>{kind}</span>
      <span style={{ color: EMERGENCY_DS.mut }}>{region}</span>
      <span className="uppercase tracking-[0.16em]" style={{ color: col }}>● {severity}</span>
      <span className="text-right" style={{ color: EMERGENCY_DS.mut }}>{tail ?? status}</span>
    </div>
  );
}

export function TheatreCallout({ kicker, body }: { kicker: string; body: string }) {
  return (
    <div className="rounded-[3px] border border-dashed px-3 py-2 text-[10.5px] italic"
      style={{ borderColor: 'rgba(240,160,80,0.32)', color: EMERGENCY_DS.ash, background: 'rgba(240,160,80,0.04)' }}>
      <span className="not-italic font-semibold uppercase tracking-[0.18em]" style={{ color: EMERGENCY_DS.amber }}>{kicker}</span>
      {' — '}{body}
    </div>
  );
}

export function TheatreSeal({ maxim }: { maxim: string }) {
  return (
    <div className="flex items-center justify-between rounded-[3px] border px-3 py-1.5 text-[10px]"
      style={{ borderColor: EMERGENCY_DS.rule, background: 'rgba(255,93,93,0.04)' }}>
      <span className="uppercase tracking-[0.22em]" style={{ color: EMERGENCY_DS.amber }}>NATIONAL EMERGENCY OPERATIONS CENTRE</span>
      <span className="italic" style={{ color: EMERGENCY_DS.mut }}>{maxim}</span>
    </div>
  );
}
