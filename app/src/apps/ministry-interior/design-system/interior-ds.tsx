'use client';

// apps/ministry-interior/design-system — the dedicated Interior design
// system. Standardized layout primitives + per-domain identity so every
// domain has a distinct visual hierarchy and information architecture
// while remaining one coherent sovereign operating system.

import * as React from 'react';
import type { InteriorDomain, LayoutArchetype } from '@/apps/ministry-interior/core/domains';

export const INTERIOR_DS = {
  bg: '#03070f',
  panel: 'rgba(255,255,255,0.02)',
  line: 'rgba(255,255,255,0.08)',
  shellAccent: '#5fb0ff',
} as const;

// Each archetype carries its own operational language: a label, a glyph
// and a framing treatment. This is the structural distinction layer —
// not cosmetic theming.
const ARCHETYPE: Record<LayoutArchetype, { tag: string; glyph: string }> = {
  command: { tag: 'COMMAND SURFACE', glyph: '◈' },
  registry: { tag: 'REGISTRY SYSTEM', glyph: '▤' },
  analytics: { tag: 'ANALYTICS SURFACE', glyph: '◔' },
  governance: { tag: 'GOVERNANCE DESK', glyph: '⬡' },
  ops: { tag: 'OPERATIONAL COMMAND', glyph: '⊕' },
  workflow: { tag: 'WORKFLOW ORCHESTRATION', glyph: '⇉' },
  fabric: { tag: 'INFRASTRUCTURE FABRIC', glyph: '⌗' },
};

/**
 * DomainFrame — the standardized domain shell chrome. Applies the domain's
 * own accent and layout archetype so each domain reads as a distinct
 * operational surface within the unified Interior OS.
 */
export function DomainFrame({ domain, badge, children }: {
  domain: InteriorDomain;
  badge?: React.ReactNode;
  children: React.ReactNode;
}) {
  const a = ARCHETYPE[domain.archetype];
  return (
    <section
      className="rounded-[5px] border"
      style={{
        borderColor: `color-mix(in srgb, ${domain.accent} 24%, ${INTERIOR_DS.line})`,
        background:
          `radial-gradient(120% 80% at 0% 0%, color-mix(in srgb,${domain.accent} 7%,transparent) 0%, transparent 55%),` +
          INTERIOR_DS.bg,
        boxShadow: 'inset 0 0 90px rgba(0,0,0,0.62)',
      }}>
      <header
        className="flex flex-wrap items-center gap-x-3 gap-y-1 border-b px-3 py-2"
        style={{ borderColor: INTERIOR_DS.line }}>
        <span
          className="grid h-6 w-6 place-items-center rounded-[3px] text-[12px]"
          style={{ background: `color-mix(in srgb,${domain.accent} 18%,transparent)`, color: domain.accent }}
          aria-hidden>
          {a.glyph}
        </span>
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h2 className="truncate text-[13px] font-semibold tracking-tight text-ink">{domain.label}</h2>
            <span
              className="rounded-[2px] px-1.5 py-px text-[8px] font-semibold uppercase tracking-[0.16em]"
              style={{ background: `color-mix(in srgb,${domain.accent} 14%,transparent)`, color: domain.accent }}>
              {a.tag}
            </span>
          </div>
          <p className="truncate text-[10px] text-ink-muted">{domain.identity}</p>
        </div>
        <div className="ml-auto flex items-center gap-2">{badge}</div>
      </header>
      <div
        className="space-y-2 p-2"
        style={{ borderTop: `1px solid color-mix(in srgb,${domain.accent} 30%,transparent)` }}>
        {children}
      </div>
    </section>
  );
}
