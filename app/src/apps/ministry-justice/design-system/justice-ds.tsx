'use client';

// apps/ministry-justice/design-system — the sovereign Justice design
// system. Every Justice domain renders through this system so the
// ministry has a single coherent visual & informational language
// rooted in the constitutional chamber metaphor. This is the *layout
// grammar*, not a colour palette — primitives are bench, register,
// docket, fascicle, seal.

import * as React from 'react';

// ── Tokens ─────────────────────────────────────────────────────────
export const JUSTICE_DS = {
  charcoal: '#1a1d24',
  charcoalDeep: '#13161c',
  ivory: '#f4f0e6',
  parchment: '#ece6d3',
  ink: '#d8d4c8',
  mut: '#7a766e',
  burgundy: '#7a2d3a',
  burgundyDeep: '#5e1d24',
  bronze: '#8c6a3a',
  bronzeDim: '#6a4f25',
  navy: '#2a3955',
  teal: '#5d7a6d',
  alert: '#a04030',
  rule: 'rgba(140,106,58,0.28)',
  ruleSoft: 'rgba(140,106,58,0.14)',
} as const;

// ── Layout archetypes — each Justice domain belongs to one ─────────
export type JusticeArchetype =
  | 'chamber'       // constitutional chamber surfaces — articles, posture, separation
  | 'bench'         // judicial operations — courts, dockets, schedules
  | 'docket'        // case-management — filing, pipeline, lifecycle
  | 'fascicle'      // archival / records / chain-of-custody
  | 'forensic'      // labs, evidence, authentication
  | 'rights'        // rights protection, oversight, petitions
  | 'corrections'   // detention, rehabilitation
  | 'portal'        // citizen-facing
  | 'continuity';   // forecast, cascade, foresight

const ARCHETYPE: Record<JusticeArchetype, { tag: string; glyph: string; accent: string }> = {
  chamber: { tag: 'CONSTITUTIONAL CHAMBER', glyph: '§', accent: JUSTICE_DS.bronze },
  bench: { tag: 'JUDICIAL BENCH', glyph: '⚖', accent: JUSTICE_DS.navy },
  docket: { tag: 'CASE DOCKET', glyph: '¶', accent: JUSTICE_DS.bronzeDim },
  fascicle: { tag: 'ARCHIVAL FASCICLE', glyph: '✠', accent: JUSTICE_DS.bronze },
  forensic: { tag: 'FORENSIC COORDINATION', glyph: '⚗', accent: JUSTICE_DS.teal },
  rights: { tag: 'RIGHTS OVERSIGHT', glyph: '☩', accent: JUSTICE_DS.burgundy },
  corrections: { tag: 'CORRECTIONAL ADMINISTRATION', glyph: '◇', accent: JUSTICE_DS.bronzeDim },
  portal: { tag: 'PETITIONER & COUNSEL PORTAL', glyph: '◊', accent: JUSTICE_DS.navy },
  continuity: { tag: 'JUDICIAL CONTINUITY', glyph: '⏳', accent: JUSTICE_DS.bronze },
};

// ── DocketFrame ────────────────────────────────────────────────────
// The standardized chrome every Justice domain renders through.
// Roman-numeral header, chamber tag, archive seal motif, accent tied
// to the domain's archetype.
export function DocketFrame({
  archetype, numeral, title, subtitle, accent, headerRight, children,
}: {
  archetype: JusticeArchetype;
  numeral: string;       // e.g. "§ III", "¶ XII"
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
        background: JUSTICE_DS.charcoal,
        borderColor: JUSTICE_DS.rule,
        color: JUSTICE_DS.ink,
        fontFamily: 'ui-serif, Georgia, "Times New Roman", serif',
      }}>
      <header
        className="flex flex-wrap items-baseline gap-x-4 gap-y-1 border-b px-6 py-3"
        style={{ borderColor: JUSTICE_DS.rule, background: 'linear-gradient(180deg, rgba(140,106,58,0.05) 0%, transparent 100%)' }}>
        <span className="text-[14px] italic" style={{ color: col, letterSpacing: '0.04em' }}>{a.glyph}</span>
        <span className="font-serif italic text-[11px] uppercase tracking-[0.34em]" style={{ color: col }}>{numeral}</span>
        <h3 className="text-[14px] tracking-[0.04em]" style={{ color: JUSTICE_DS.ivory }}>{title}</h3>
        {subtitle ? <span className="text-[10px] italic" style={{ color: JUSTICE_DS.mut }}>· {subtitle}</span> : null}
        <span className="ml-auto text-[9px] uppercase tracking-[0.32em]" style={{ color: JUSTICE_DS.mut }}>{a.tag}</span>
        {headerRight ? <span className="ml-3">{headerRight}</span> : null}
      </header>
      <div className="px-6 py-5">{children}</div>
    </section>
  );
}

// ── RegisterRow ────────────────────────────────────────────────────
// A single tabular row in a chamber / docket register, sized for
// scanning at archive density. Cells slot into a grid.
export function RegisterRow({
  numeral, primary, secondary, status, statusColor, columns,
}: {
  numeral: string;
  primary: string;
  secondary?: string;
  status?: string;
  statusColor?: string;
  columns?: { label?: string; value: string; tone?: string }[];
}) {
  return (
    <div className="grid grid-cols-[60px_1fr_auto] items-baseline gap-3 border-b py-2.5" style={{ borderColor: JUSTICE_DS.ruleSoft }}>
      <span className="tabular-nums text-[11px] italic" style={{ color: JUSTICE_DS.bronze }}>{numeral}</span>
      <div>
        <div className="text-[12px]" style={{ color: JUSTICE_DS.ivory }}>{primary}</div>
        {secondary ? <div className="mt-0.5 text-[10px] italic" style={{ color: JUSTICE_DS.mut }}>{secondary}</div> : null}
      </div>
      <div className="flex items-baseline gap-4">
        {columns?.map((c, i) => (
          <div key={i} className="text-right">
            {c.label ? <div className="text-[8.5px] uppercase tracking-[0.22em]" style={{ color: JUSTICE_DS.mut }}>{c.label}</div> : null}
            <div className="tabular-nums text-[12px]" style={{ color: c.tone ?? JUSTICE_DS.ink }}>{c.value}</div>
          </div>
        ))}
        {status ? <span className="text-[9.5px] uppercase italic tracking-[0.22em]" style={{ color: statusColor ?? JUSTICE_DS.bronze }}>· {status}</span> : null}
      </div>
    </div>
  );
}

// ── BenchPanel ─────────────────────────────────────────────────────
// A single bench / court tile used in the judicial-operations roster.
export function BenchPanel({ tier, court, region, children, accent }: {
  tier: string; court: string; region: string; accent?: string; children: React.ReactNode;
}) {
  const col = accent ?? JUSTICE_DS.navy;
  return (
    <article className="border px-4 py-3" style={{ background: JUSTICE_DS.charcoalDeep, borderColor: JUSTICE_DS.ruleSoft, borderLeft: `2px solid ${col}` }}>
      <div className="flex items-baseline justify-between">
        <span className="text-[11.5px]" style={{ color: JUSTICE_DS.ivory }}>{court}</span>
        <span className="text-[9px] uppercase italic tracking-[0.22em]" style={{ color: col }}>· {tier}</span>
      </div>
      <div className="text-[9.5px] italic" style={{ color: JUSTICE_DS.mut }}>{region}</div>
      <div className="mt-2">{children}</div>
    </article>
  );
}

// ── SealStrip ──────────────────────────────────────────────────────
// Archive seal motif placed at the foot of every chamber. The single
// piece of decoration that's *cited* (Latin maxim) — never ornamental.
export function SealStrip({ maxim }: { maxim: string }) {
  return (
    <footer
      className="flex items-center justify-center gap-3 border-t px-6 py-3"
      style={{ borderColor: JUSTICE_DS.rule, background: 'rgba(140,106,58,0.04)' }}>
      <span style={{ color: JUSTICE_DS.bronze }}>✠</span>
      <span className="text-[10px] uppercase italic tracking-[0.34em]" style={{ color: JUSTICE_DS.mut }}>{maxim}</span>
      <span style={{ color: JUSTICE_DS.bronze }}>✠</span>
    </footer>
  );
}

// ── ChamberRule ───────────────────────────────────────────────────
// Sub-section separator used inside a frame.
export function ChamberRule({ label }: { label?: string }) {
  return (
    <div className="my-4 flex items-center gap-3">
      <span className="h-px flex-1" style={{ background: JUSTICE_DS.rule }} />
      {label ? <span className="text-[9px] uppercase italic tracking-[0.34em]" style={{ color: JUSTICE_DS.bronze }}>{label}</span> : null}
      <span className="h-px flex-1" style={{ background: JUSTICE_DS.rule }} />
    </div>
  );
}

// ── StatPair ───────────────────────────────────────────────────────
// Constitution-style stat strip used at the top of any chamber.
export function StatPair({ items }: { items: { label: string; value: string | number; tone?: string }[] }) {
  return (
    <div className="grid grid-cols-2 gap-px md:grid-cols-4" style={{ background: JUSTICE_DS.rule }}>
      {items.map((x, i) => (
        <div key={i} className="px-4 py-3" style={{ background: JUSTICE_DS.charcoal }}>
          <div className="text-[9px] uppercase tracking-[0.28em]" style={{ color: JUSTICE_DS.mut }}>{x.label}</div>
          <div className="mt-1 tabular-nums text-[17px]" style={{ color: x.tone ?? JUSTICE_DS.ivory, fontFamily: 'ui-serif, Georgia, serif' }}>{x.value}</div>
        </div>
      ))}
    </div>
  );
}
