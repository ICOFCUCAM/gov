'use client';

// apps/ministry-health/design-system — the sovereign Health design
// system. Grammar: the CLINICAL FLOOR PLAN. Every Health domain
// renders through this system so the ministry is structurally
// distinct from the chamber (Justice), the ledger (Treasury), and
// the situation room (Interior). Primitives mirror what the
// CivicHealth blueprint (§13) actually describes: facility OS, EHR,
// public-health surveillance, surgical / ICU / ward boards, supply
// cold-chain, community health workers.

import * as React from 'react';

// ── Tokens ─────────────────────────────────────────────────────────
// Clinical palette: vital green, ward white, alert red, sterile
// blue, pharma amber, lab teal. No SaaS gradients, no neon.
export const HEALTH_DS = {
  ward: '#0c1419',           // ward background
  wardDeep: '#070b0e',
  trim: '#1a242c',
  vital: '#2dd17c',          // vital signs green (heartbeat)
  vitalDim: '#1d8a52',
  alert: '#d63f47',          // emergency red
  triage: '#e69830',         // triage amber
  sterile: '#3e9adb',        // sterile clinical blue
  pharma: '#c98a3a',         // pharmacy amber
  lab: '#3a9d8a',            // laboratory teal
  chart: '#e5ecf2',          // chart paper / ward white
  ink: '#c5cdd6',
  mut: '#6f7a86',
  rule: 'rgba(229,236,242,0.10)',
  ruleSoft: 'rgba(229,236,242,0.05)',
} as const;

// ── Layout archetypes ─────────────────────────────────────────────
export type HealthArchetype =
  | 'command'        // national health command (situation room flavour)
  | 'floor-plan'     // ward / OR / ICU / ER floor plan
  | 'vitals'         // patient vital-signs strip
  | 'chart'          // EHR chart / lab result / radiology
  | 'epi'            // epidemiology / outbreak surveillance
  | 'pharmacy'       // drug supply / cold-chain
  | 'lab'            // laboratory pipeline
  | 'registry'       // master patient index / facility / workforce
  | 'portal';        // citizen-facing

const ARCHETYPE: Record<HealthArchetype, { tag: string; glyph: string; accent: string }> = {
  command:    { tag: 'NATIONAL HEALTH COMMAND',  glyph: '⊕', accent: HEALTH_DS.vital },
  'floor-plan': { tag: 'CLINICAL FLOOR PLAN',    glyph: '◧', accent: HEALTH_DS.sterile },
  vitals:     { tag: 'VITAL SIGNS',              glyph: '♡', accent: HEALTH_DS.vital },
  chart:      { tag: 'CLINICAL CHART',           glyph: '⊟', accent: HEALTH_DS.chart },
  epi:        { tag: 'EPIDEMIOLOGY SURVEILLANCE',glyph: '⌬', accent: HEALTH_DS.alert },
  pharmacy:   { tag: 'PHARMACY & COLD-CHAIN',    glyph: '⚕', accent: HEALTH_DS.pharma },
  lab:        { tag: 'LABORATORY NETWORK',       glyph: '⚗', accent: HEALTH_DS.lab },
  registry:   { tag: 'CLINICAL REGISTRY',        glyph: '▤', accent: HEALTH_DS.sterile },
  portal:     { tag: 'CITIZEN HEALTH PORTAL',    glyph: '◇', accent: HEALTH_DS.vital },
};

// ── ClinicalFrame ─────────────────────────────────────────────────
// Standardized chrome. Ward header with vital-green pulse rule on top,
// facility code, time stamp, and the archetype tag.
export function ClinicalFrame({
  archetype, code, title, subtitle, accent, headerRight, children,
}: {
  archetype: HealthArchetype;
  code: string;
  title: string;
  subtitle?: string;
  accent?: string;
  headerRight?: React.ReactNode;
  children: React.ReactNode;
}) {
  const a = ARCHETYPE[archetype];
  const col = accent ?? a.accent;
  return (
    <section
      className="border"
      style={{
        background: HEALTH_DS.ward,
        borderColor: HEALTH_DS.rule,
        color: HEALTH_DS.ink,
        fontFamily: 'ui-sans-serif, "Inter", system-ui, sans-serif',
      }}>
      {/* vital-pulse top rule */}
      <div className="h-px w-full" style={{ background: `linear-gradient(90deg, transparent 0%, ${col}88 12%, ${col} 50%, ${col}88 88%, transparent 100%)`, boxShadow: `0 0 4px ${col}55` }} />
      <header
        className="flex flex-wrap items-baseline gap-x-4 gap-y-1 border-b px-6 py-3"
        style={{ borderColor: HEALTH_DS.rule, background: 'linear-gradient(180deg, rgba(45,209,124,0.04) 0%, transparent 100%)' }}>
        <span className="text-[14px]" style={{ color: col }}>{a.glyph}</span>
        <span className="tabular-nums text-[11px] uppercase tracking-[0.28em]" style={{ color: col, fontFamily: 'ui-monospace, monospace' }}>{code}</span>
        <h3 className="text-[14px] tracking-[0.02em]" style={{ color: HEALTH_DS.chart }}>{title}</h3>
        {subtitle ? <span className="text-[10px]" style={{ color: HEALTH_DS.mut }}>· {subtitle}</span> : null}
        <span className="ml-auto text-[9px] uppercase tracking-[0.32em]" style={{ color: HEALTH_DS.mut }}>{a.tag}</span>
        {headerRight ? <span className="ml-3">{headerRight}</span> : null}
      </header>
      <div className="px-6 py-5">{children}</div>
    </section>
  );
}

// ── VitalStrip ────────────────────────────────────────────────────
// Live vital-signs reading. ECG-style line + numeric values.
export function VitalStrip({ heartRate, bp, spo2, temp, label }: {
  heartRate?: number; bp?: string; spo2?: number; temp?: number; label?: string;
}) {
  return (
    <div className="grid grid-cols-[1fr_auto] items-center gap-4 border px-4 py-3" style={{ borderColor: HEALTH_DS.ruleSoft, background: HEALTH_DS.wardDeep }}>
      <svg viewBox="0 0 400 40" className="h-10 w-full" aria-hidden>
        <path d={ecgPath()} stroke={HEALTH_DS.vital} strokeWidth="1.5" fill="none" />
      </svg>
      <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-[10px]" style={{ fontFamily: 'ui-monospace, monospace' }}>
        {heartRate !== undefined ? <Vital label="HR" value={`${heartRate} bpm`} color={HEALTH_DS.vital} /> : null}
        {bp ? <Vital label="BP" value={bp} color={HEALTH_DS.sterile} /> : null}
        {spo2 !== undefined ? <Vital label="SpO₂" value={`${spo2}%`} color={HEALTH_DS.vital} /> : null}
        {temp !== undefined ? <Vital label="T" value={`${temp}°C`} color={HEALTH_DS.triage} /> : null}
        {label ? <div className="col-span-2 text-[9px] uppercase tracking-[0.18em]" style={{ color: HEALTH_DS.mut }}>{label}</div> : null}
      </div>
    </div>
  );
}

function Vital({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div>
      <div className="text-[8.5px] uppercase tracking-[0.22em]" style={{ color: HEALTH_DS.mut }}>{label}</div>
      <div className="tabular-nums text-[13px]" style={{ color }}>{value}</div>
    </div>
  );
}

function ecgPath(): string {
  // Deterministic ECG-ish path so the strip looks alive without being random
  const pts: string[] = ['M 0 20'];
  for (let i = 0; i < 8; i++) {
    const x0 = i * 50;
    pts.push(`L ${x0 + 20} 20`);
    pts.push(`L ${x0 + 22} 6`);   // R-spike up
    pts.push(`L ${x0 + 24} 36`);  // S down
    pts.push(`L ${x0 + 26} 20`);
    pts.push(`L ${x0 + 50} 20`);
  }
  return pts.join(' ');
}

// ── FloorPlanBay ──────────────────────────────────────────────────
// Single bay / room on a clinical floor plan. Used in ward, OR, ICU,
// ER board layouts.
export type BayStatus = 'available' | 'occupied' | 'pending' | 'critical' | 'cleaning';

const BAY_COL: Record<BayStatus, string> = {
  available: HEALTH_DS.vital, occupied: HEALTH_DS.sterile, pending: HEALTH_DS.triage,
  critical: HEALTH_DS.alert, cleaning: HEALTH_DS.mut,
};

export function FloorPlanBay({ id, occupant, status, since, note }: {
  id: string; occupant?: string; status: BayStatus; since?: string; note?: string;
}) {
  const col = BAY_COL[status];
  return (
    <div className="border px-3 py-2" style={{ background: HEALTH_DS.wardDeep, borderColor: HEALTH_DS.ruleSoft, borderLeft: `3px solid ${col}` }}>
      <div className="flex items-baseline justify-between">
        <span className="tabular-nums text-[10.5px]" style={{ color: HEALTH_DS.chart, fontFamily: 'ui-monospace, monospace' }}>{id}</span>
        <span className="text-[9px] uppercase tracking-[0.22em]" style={{ color: col }}>● {status}</span>
      </div>
      <div className="mt-0.5 text-[10.5px]" style={{ color: HEALTH_DS.ink }}>{occupant ?? '—'}</div>
      {since ? <div className="text-[9px]" style={{ color: HEALTH_DS.mut }}>since {since}</div> : null}
      {note ? <div className="mt-1 text-[9px] italic" style={{ color: HEALTH_DS.triage }}>{note}</div> : null}
    </div>
  );
}

// ── ChartLine ─────────────────────────────────────────────────────
// EHR chart row — a single line of clinical telemetry.
export function ChartLine({ when, action, by, severity }: {
  when: string; action: string; by: string; severity?: 'routine' | 'note' | 'alert';
}) {
  const col = severity === 'alert' ? HEALTH_DS.alert : severity === 'note' ? HEALTH_DS.triage : HEALTH_DS.mut;
  return (
    <div className="grid grid-cols-[80px_1fr_140px_60px] gap-3 border-b py-1.5 text-[10.5px]" style={{ borderColor: HEALTH_DS.ruleSoft, fontFamily: 'ui-monospace, monospace' }}>
      <span className="tabular-nums" style={{ color: HEALTH_DS.mut }}>{when}</span>
      <span style={{ color: HEALTH_DS.chart }}>{action}</span>
      <span className="text-right italic" style={{ color: HEALTH_DS.mut }}>{by}</span>
      <span className="text-right uppercase tracking-[0.18em]" style={{ color: col }}>· {severity ?? 'routine'}</span>
    </div>
  );
}

// ── KpiBar ────────────────────────────────────────────────────────
// Clinical KPI bar.
export function KpiBar({ items }: { items: { label: string; value: string | number; tone?: string; sub?: string }[] }) {
  return (
    <div className="grid grid-cols-2 gap-px md:grid-cols-4" style={{ background: HEALTH_DS.rule }}>
      {items.map((x, i) => (
        <div key={i} className="px-4 py-3" style={{ background: HEALTH_DS.ward }}>
          <div className="text-[9px] uppercase tracking-[0.28em]" style={{ color: HEALTH_DS.mut }}>{x.label}</div>
          <div className="mt-1 tabular-nums text-[17px]" style={{ color: x.tone ?? HEALTH_DS.chart, fontFamily: 'ui-monospace, monospace' }}>{x.value}</div>
          {x.sub ? <div className="text-[9px]" style={{ color: HEALTH_DS.mut }}>{x.sub}</div> : null}
        </div>
      ))}
    </div>
  );
}

// ── WardRule ──────────────────────────────────────────────────────
// Sub-section separator with optional label.
export function WardRule({ label }: { label?: string }) {
  return (
    <div className="my-4 flex items-center gap-3">
      <span className="h-px flex-1" style={{ background: HEALTH_DS.rule }} />
      {label ? <span className="text-[9px] uppercase tracking-[0.32em]" style={{ color: HEALTH_DS.vital }}>{label}</span> : null}
      <span className="h-px flex-1" style={{ background: HEALTH_DS.rule }} />
    </div>
  );
}

// ── ClinicalSeal ──────────────────────────────────────────────────
// Hippocratic seal footer.
export function ClinicalSeal({ maxim }: { maxim: string }) {
  return (
    <footer
      className="flex items-center justify-center gap-3 border-t px-6 py-3"
      style={{ borderColor: HEALTH_DS.rule, background: 'rgba(45,209,124,0.04)' }}>
      <span style={{ color: HEALTH_DS.vital }}>⊕</span>
      <span className="text-[10px] uppercase tracking-[0.32em]" style={{ color: HEALTH_DS.mut }}>{maxim}</span>
      <span style={{ color: HEALTH_DS.vital }}>⊕</span>
    </footer>
  );
}
