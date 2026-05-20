'use client';

// apps/police-command/design-system — the dedicated Police Command design
// system. Standardized domain chrome + per-domain identity so each domain
// reads as a distinct operational surface within one coherent sovereign
// law-enforcement operating system.

import * as React from 'react';
import type { PoliceDomain, PoliceArchetype } from '@/apps/police-command/core/domains';

export const POLICE_DS = {
  bg: '#03070f',
  line: 'rgba(255,255,255,0.08)',
  shellAccent: '#5fa8ff',
} as const;

const ARCHETYPE: Record<PoliceArchetype, { tag: string; glyph: string }> = {
  command: { tag: 'COMMAND AUTHORITY', glyph: '◈' },
  runtime: { tag: 'EXECUTION RUNTIME', glyph: '⟳' },
  ops: { tag: 'OPERATIONAL COMMAND', glyph: '⊕' },
  fabric: { tag: 'FEDERATION FABRIC', glyph: '⌗' },
  registry: { tag: 'REGISTRY SYSTEM', glyph: '▤' },
  governance: { tag: 'SERVICE DESK', glyph: '⬡' },
  oversight: { tag: 'SOVEREIGN OVERSIGHT', glyph: '§' },
  patrol: { tag: 'PATROL DIVISION', glyph: '◇' },
  casework: { tag: 'INVESTIGATIVE CASEWORK', glyph: '⌖' },
  forensic: { tag: 'FORENSIC TIER', glyph: '⌬' },
  'public-order': { tag: 'PUBLIC ORDER', glyph: '⌘' },
  service: { tag: 'COMMUNITY SERVICE', glyph: '✚' },
  tribunal: { tag: 'INTERNAL TRIBUNAL', glyph: '§' },
};

// ── Police primitives ────────────────────────────────────────────────
// Standard chrome reused across the new operational surfaces. Each
// surface composes a KpiStrip, RosterRow list and a CalloutNote.

export function PoliceKpiStrip({ items, accent }: {
  items: { label: string; value: React.ReactNode; tone?: 'ok' | 'warn' | 'alert' | 'mute' }[];
  accent: string;
}) {
  const tones: Record<'ok' | 'warn' | 'alert' | 'mute', string> = {
    ok: '#54d08f', warn: '#e0a13a', alert: '#e0685f', mute: '#93a0ad',
  };
  return (
    <div className="grid grid-cols-2 gap-1 md:grid-cols-4">
      {items.map(k => (
        <div key={k.label} className="border px-2 py-1.5"
          style={{ borderColor: `color-mix(in srgb, ${accent} 20%, ${POLICE_DS.line})`, background: 'rgba(255,255,255,0.012)' }}>
          <div className="text-[9px] uppercase tracking-[0.18em]" style={{ color: '#93a0ad', fontFamily: 'ui-monospace, monospace' }}>{k.label}</div>
          <div className="text-[14px] font-semibold tabular-nums" style={{ color: k.tone ? tones[k.tone] : accent }}>{k.value}</div>
        </div>
      ))}
    </div>
  );
}

export function PoliceRosterRow({ id, label, status, tail, tone, accent }: {
  id: string; label: string; status: string; tail?: React.ReactNode;
  tone?: 'ok' | 'warn' | 'alert' | 'mute'; accent: string;
}) {
  const tones: Record<'ok' | 'warn' | 'alert' | 'mute', string> = {
    ok: '#54d08f', warn: '#e0a13a', alert: '#e0685f', mute: '#93a0ad',
  };
  const col = tone ? tones[tone] : accent;
  return (
    <div className="grid grid-cols-[110px_1fr_130px_110px] gap-3 border-b py-1.5 text-[11px]"
      style={{ borderColor: POLICE_DS.line, fontFamily: 'ui-monospace, monospace' }}>
      <span className="tabular-nums" style={{ color: accent }}>{id}</span>
      <span style={{ color: '#d6dde6' }}>{label}</span>
      <span className="uppercase tracking-[0.16em]" style={{ color: col }}>● {status}</span>
      <span className="text-right tabular-nums" style={{ color: '#93a0ad' }}>{tail}</span>
    </div>
  );
}

export function PoliceCalloutNote({ kicker, body }: { kicker: string; body: string }) {
  return (
    <div className="rounded-[3px] border border-dashed px-3 py-2 text-[10.5px] italic"
      style={{ borderColor: 'rgba(216,162,58,0.28)', color: '#a8a08a', background: 'rgba(216,162,58,0.04)' }}>
      <span className="not-italic font-semibold uppercase tracking-[0.18em]" style={{ color: '#d8a23a' }}>{kicker}</span>
      {' — '}{body}
    </div>
  );
}

export function PoliceRule({ label }: { label?: string }) {
  return (
    <div className="flex items-center gap-2 py-0.5">
      <div className="h-px flex-1" style={{ background: 'rgba(95,168,255,0.16)' }} />
      {label ? <span className="text-[9px] uppercase tracking-[0.22em]" style={{ color: '#62707e' }}>{label}</span> : null}
      <div className="h-px flex-1" style={{ background: 'rgba(95,168,255,0.16)' }} />
    </div>
  );
}

export function PoliceDomainFrame({ domain, badge, children }: {
  domain: PoliceDomain;
  badge?: React.ReactNode;
  children: React.ReactNode;
}) {
  const a = ARCHETYPE[domain.archetype];
  return (
    <section
      className="rounded-[5px] border"
      style={{
        borderColor: `color-mix(in srgb, ${domain.accent} 24%, ${POLICE_DS.line})`,
        background:
          `radial-gradient(120% 80% at 0% 0%, color-mix(in srgb,${domain.accent} 7%,transparent) 0%, transparent 55%),` +
          POLICE_DS.bg,
        boxShadow: 'inset 0 0 90px rgba(0,0,0,0.62)',
      }}>
      <header
        className="flex flex-wrap items-center gap-x-3 gap-y-1 border-b px-3 py-2"
        style={{ borderColor: POLICE_DS.line }}>
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
