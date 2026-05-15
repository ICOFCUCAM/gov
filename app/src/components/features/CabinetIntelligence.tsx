'use client';

import * as React from 'react';
import Link from 'next/link';
import { api } from '@/lib/api/client';
import { CommandPalette, type CommandItem } from '@/components/ui/CommandPalette';
import { ExecutiveMenu } from '@/components/ui/ExecutiveMenu';
import { identityFor } from '@/lib/archetype-profiles';
import { resolveIdentity } from '@/lib/sovereign-identity';
import {
  TONE, ACCENT, PALETTE, seed, toneFor, rel, Panel, Spark, LiveValue, NationalMap, TerritoryHeat, waveSeries, domainStress,
} from '@/components/features/SituationRoom';
import type {
  NationalSnapshot, NationalCoordination, SovereignProfile, ArchetypeKey,
} from '@/lib/api/types';

const RED = '#f1707a';

const RAIL: { g: string; items: { i: string; l: string; s: string; href: string; on?: boolean }[] }[] = [
  { g: 'Executive', items: [
    { i: '◆', l: 'Cabinet Intelligence', s: 'Executive command', href: '/gov', on: true },
    { i: '◎', l: 'Situation Room', s: 'Real-time command', href: '/gov/situation-room' },
    { i: '⟁', l: 'National Coordination', s: 'Dependency · cascade', href: '/gov/coordination' },
    { i: '◔', l: 'Strategic Foresight', s: 'Advisory simulation', href: '/gov/coordination' },
  ]},
  { g: 'Institutions', items: [
    { i: '▦', l: 'Ministries', s: 'Institutional registry', href: '/ministries' },
    { i: '◫', l: 'Independent Agencies', s: 'Statutory bodies', href: '/ministries' },
    { i: '▣', l: 'State Enterprises', s: 'Public corporations', href: '/ministries' },
  ]},
  { g: 'Operations', items: [
    { i: '⚠', l: 'Incidents', s: 'Active escalations', href: '/gov/coordination' },
    { i: '⊞', l: 'Operations Centre', s: 'Cross-institution', href: '/ops' },
    { i: '⛑', l: 'Emergency Response', s: 'Crisis coordination', href: '/gov/coordination' },
  ]},
  { g: 'Intelligence', items: [
    { i: '⟁', l: 'Analytics & AI', s: 'Strategic foresight', href: '/gov/coordination' },
    { i: '◉', l: 'Regional Overview', s: 'Provincial posture', href: '/gov/coordination' },
  ]},
  { g: 'National Security', items: [
    { i: '◈', l: 'Security & Interior', s: 'National security', href: '/gov/coordination' },
    { i: '◷', l: 'Geopolitical Monitor', s: 'External pressure', href: '/gov/coordination' },
  ]},
  { g: 'Treasury', items: [
    { i: '§', l: 'Treasury Command', s: 'Sovereign fiscal', href: '/gov' },
    { i: '⚡', l: 'Infrastructure', s: 'Grid · corridors', href: '/gov/situation-room' },
  ]},
  { g: 'Governance', items: [
    { i: '▥', l: 'Constitutional Watch', s: 'Policy monitor', href: '/audit' },
    { i: '▤', l: 'Executive Briefings', s: 'Daily intelligence', href: '/gov' },
  ]},
  { g: 'Oversight', items: [
    { i: '⛓', l: 'Audit & Oversight', s: 'Integrity assurance', href: '/audit' },
    { i: '⚙', l: 'Platform', s: 'System operations', href: '/platform' },
  ]},
];

const DOMAINS = ['Operational', 'Fiscal', 'Infrastructure', 'Civil', 'Security', 'Logistics', 'Environment'];
type RiskState = 'stable' | 'watch' | 'elevated' | 'critical';
const RISK_TONE: Record<RiskState, string> = { stable: 'ok', watch: 'neutral', elevated: 'warn', critical: 'alert' };
const RISK_LABEL: Record<RiskState, string> = { stable: 'Stable', watch: 'Watch', elevated: 'Elevated', critical: 'Critical' };

function riskState(v: number): RiskState {
  return v >= 78 ? 'critical' : v >= 58 ? 'elevated' : v >= 40 ? 'watch' : 'stable';
}

const DOMAIN_KEYS = ['ops', 'fisc', 'infra', 'civil', 'sec', 'logi', 'env'];

// Sovereign institutional fallback so the executive brain is never empty
// (live institutions override when composed).
const MIN_FALLBACK: { n: string; a: ArchetypeKey }[] = [
  { n: 'Health', a: 'HEALTH' }, { n: 'Energy', a: 'ENERGY' }, { n: 'Transport', a: 'TRANSPORT' },
  { n: 'Treasury', a: 'FINANCE' }, { n: 'Interior', a: 'INTERIOR' }, { n: 'Defence', a: 'INTERIOR' },
  { n: 'Education', a: 'EDUCATION' }, { n: 'Agriculture', a: 'AGRICULTURE' }, { n: 'Water Resources', a: 'ENVIRONMENT' },
  { n: 'Digital Economy', a: 'TRADE' }, { n: 'Infrastructure', a: 'TRANSPORT' }, { n: 'Emergency Services', a: 'GENERIC' },
];
const ESC_FALLBACK = [
  { sevState: 'critical' as RiskState, title: 'National Grid Instability', ministry: 'Energy Ministry', pop: '8.7', regions: 14, level: 3, age: 6, mid: '/gov/coordination' },
  { sevState: 'elevated' as RiskState, title: 'Hospital Capacity Strain', ministry: 'Health Ministry', pop: '3.1', regions: 6, level: 2, age: 21, mid: '/gov/coordination' },
  { sevState: 'elevated' as RiskState, title: 'Port Congestion Surge', ministry: 'Transport Ministry', pop: '1.2', regions: 3, level: 2, age: 33, mid: '/gov/coordination' },
  { sevState: 'watch' as RiskState, title: 'Treasury Revenue Dip', ministry: 'Treasury Ministry', pop: '0.0', regions: 1, level: 1, age: 48, mid: '/gov/coordination' },
  { sevState: 'watch' as RiskState, title: 'Cross-border Logistics Delay', ministry: 'Interior Ministry', pop: '0.6', regions: 2, level: 1, age: 57, mid: '/gov/coordination' },
  { sevState: 'critical' as RiskState, title: 'Emergency Communications Failure', ministry: 'Emergency Services', pop: '2.4', regions: 4, level: 3, age: 12, mid: '/gov/coordination' },
];

export function CabinetIntelligence() {
  const [nat, setNat] = React.useState<NationalSnapshot | null>(null);
  const [coord, setCoord] = React.useState<NationalCoordination | null>(null);
  const [sov, setSov] = React.useState<SovereignProfile | null>(null);
  const [now, setNow] = React.useState(() => Date.now());
  const [war, setWar] = React.useState(false);
  const [openEsc, setOpenEsc] = React.useState<number | null>(0);
  const [layers, setLayers] = React.useState({ infra: true, grid: false, corridors: true, incidents: true });

  React.useEffect(() => {
    const load = async () => {
      const [n, c, s] = await Promise.all([
        api.cabinet.national().catch(() => null),
        api.cabinet.coordination().catch(() => null),
        api.sovereign.get().then(r => r.sovereign).catch(() => null),
      ]);
      setNat(n); setCoord(c); setSov(s);
    };
    void load();
    const poll = setInterval(() => void load(), 10_000);
    const tick = setInterval(() => setNow(Date.now()), 1000);
    return () => { clearInterval(poll); clearInterval(tick); };
  }, []);

  const tickN = coord?.tick ?? 0;
  const epoch = Math.floor(tickN / 2);
  const identity = sov ? resolveIdentity(sov) : null;
  const nodes = coord?.nodes ?? [];
  const fabricById = new Map((coord?.fabric ?? []).map(f => [f.ministryId, f]));
  const mapNodes = nodes.map((nd, i) => ({
    ...nd,
    x: 14 + seed(`mx:${nd.ministryId}`) * 72,
    y: 18 + ((i % 5) / 4) * 60 + (seed(`my:${nd.ministryId}`) - 0.5) * 10,
    pressure: fabricById.get(nd.ministryId)?.pressure ?? nd.riskScore,
  }));
  const incidents = nat?.crossMinistryIncidents ?? [];
  const posture = coord?.posture;
  const nationalRisk = posture?.nationalRisk ?? 42;
  const pressOf = (arch: string) => {
    const n = nodes.find(x => x.archetype === arch);
    return n ? (fabricById.get(n.ministryId)?.pressure ?? n.riskScore) : 30 + Math.round(seed(`syn:${arch}:${epoch}`) * 50);
  };

  const stability = Math.max(1, 100 - nationalRisk);
  const instr = [
    { l: 'National stability index', v: `${stability}`, sub: `${stability < 50 ? 'Critical' : stability < 70 ? 'Elevated risk' : 'Stable'} / 100`, t: toneFor(100 - stability), spark: 'stab' },
    { l: 'Institutional pressure', v: posture?.label ?? 'STABLE', sub: `+${Math.round(seed(`ip:${epoch}`) * 22)}% vs yesterday`, t: posture?.level ?? 'ok', spark: 'ip' },
    { l: 'Economic resilience', v: `${55 + Math.round(seed(`er:${epoch}`) * 22)}%`, sub: 'Moderate', t: 'warn', spark: 'er' },
    { l: 'Treasury liquidity', v: `$${(18 + seed(`tl:${epoch}`) * 14).toFixed(1)}B`, sub: `Adequate · ${20 + Math.round(seed(`td:${epoch}`) * 14)}d`, t: 'ok', spark: 'tl' },
    { l: 'Energy stability', v: `${Math.max(1, 100 - pressOf('ENERGY'))}%`, sub: pressOf('ENERGY') >= 60 ? 'Stressed' : 'Stable', t: toneFor(pressOf('ENERGY')), spark: 'en' },
    { l: 'Healthcare capacity', v: `${Math.max(1, 100 - pressOf('HEALTH'))}%`, sub: pressOf('HEALTH') >= 55 ? 'Stressed' : 'Stable', t: toneFor(pressOf('HEALTH')), spark: 'hc' },
    { l: 'Civil stability', v: `${Math.max(1, 100 - Math.round(nationalRisk * 0.9))}%`, sub: 'Stable', t: toneFor(nationalRisk), spark: 'cs' },
    { l: 'Infrastructure readiness', v: `${Math.max(1, 100 - pressOf('TRANSPORT'))}%`, sub: pressOf('TRANSPORT') >= 60 ? 'Strained' : 'Stable', t: toneFor(pressOf('TRANSPORT')), spark: 'ir' },
    { l: 'Security readiness', v: `${Math.max(1, 100 - pressOf('INTERIOR'))}%`, sub: pressOf('INTERIOR') >= 60 ? 'Heightened' : 'Nominal', t: toneFor(pressOf('INTERIOR')), spark: 'sc' },
    { l: 'Constitutional integrity', v: nat?.totals.auditIntact === false ? '71%' : `${96 + Math.round(seed(`ci:${epoch}`) * 3)}%`, sub: nat?.totals.auditIntact === false ? 'Review' : 'Intact', t: nat?.totals.auditIntact === false ? 'alert' : 'ok', spark: 'ci' },
  ];
  const ts = now / 4000;
  const sparkPts = (k: string) => waveSeries(`sp:${k}`, ts, 16, 38, 95);

  const escalations = [...incidents]
    .sort((a, b) => a.severity.localeCompare(b.severity))
    .slice(0, 5)
    .map((c, i) => ({
      sevState: (c.severity === 'sev1' ? 'critical' : c.severity === 'sev2' ? 'elevated' : c.severity === 'sev3' ? 'watch' : 'watch') as RiskState,
      title: c.label,
      ministry: c.ministry,
      arch: c.archetype,
      regions: 1 + Math.floor(seed(`er:${c.ministry}:${i}`) * 13),
      pop: (0.4 + seed(`pp:${c.ministry}:${i}`) * 8).toFixed(1),
      level: c.severity === 'sev1' ? 3 : c.severity === 'sev2' ? 2 : 1,
      age: 2 + Math.floor(seed(`ag:${c.ministry}:${i}`) * 58),
      mid: c.ministryId,
    }));

  const mRows = mapNodes.length
    ? mapNodes.map(m => ({ ministryId: m.ministryId, ministry: m.ministry, archetype: m.archetype as ArchetypeKey, pressure: m.pressure, href: `/gov/ministry/${m.ministryId}` }))
    : MIN_FALLBACK.map(m => ({ ministryId: m.n, ministry: m.n, archetype: m.a, pressure: Math.round(35 + seed(`mf:${m.n}:${epoch}`) * 55), href: '/ministries' }));
  const escList = escalations.length ? escalations : ESC_FALLBACK;

  const dep = [
    { k: 'Energy', g: '⚡', arch: 'ENERGY', x: 14, y: 32 },
    { k: 'Transport', g: '⇄', arch: 'TRANSPORT', x: 42, y: 20 },
    { k: 'Healthcare', g: '✚', arch: 'HEALTH', x: 78, y: 30 },
    { k: 'Treasury', g: '§', arch: 'FINANCE', x: 40, y: 74 },
    { k: 'Civil stability', g: '◈', arch: 'INTERIOR', x: 76, y: 76 },
  ].map(d => ({ ...d, p: pressOf(d.arch) }));
  const depLinks: [number, number][] = [[0, 1], [1, 2], [0, 2], [2, 3], [1, 3], [3, 4], [2, 4]];

  const forecast = [
    { l: 'Energy reserve threshold', v: `In ${10 + Math.round(seed(`f1:${epoch}`) * 40)} hours`, t: pressOf('ENERGY') >= 60 ? 'alert' : 'warn' },
    { l: 'Hospital capacity stress', v: `+${8 + Math.round(seed(`f2:${epoch}`) * 18)}%`, t: pressOf('HEALTH') >= 55 ? 'alert' : 'warn' },
    { l: 'Logistics delay impact', v: pressOf('TRANSPORT') >= 60 ? 'High' : 'Moderate', t: pressOf('TRANSPORT') >= 60 ? 'alert' : 'warn' },
    { l: 'Treasury intervention need', v: 'Within 48 hours', t: 'warn' },
    { l: 'Civil unrest probability', v: nationalRisk >= 60 ? 'Elevated' : 'Low–Moderate', t: nationalRisk >= 60 ? 'alert' : 'ok' },
  ];

  const kpiTrends = [
    { l: 'Stability index', v: stability, d: -3 },
    { l: 'Economic resilience', v: 63, d: 2 },
    { l: 'Fiscal balance', v: -1.8, d: -0.4, pct: true },
    { l: 'Service availability', v: 94, d: 1 },
    { l: 'Public satisfaction', v: 72, d: -2 },
  ];
  const fiscal = [
    { l: 'Revenue', v: `$${(100 + seed(`fr:${epoch}`) * 22).toFixed(1)}B`, d: '+4.2%', t: 'ok' },
    { l: 'Expenditure', v: `$${(100 + seed(`fe:${epoch}`) * 16).toFixed(1)}B`, d: '+3.1%', t: 'warn' },
    { l: 'Deficit', v: `-$${(1 + seed(`fd:${epoch}`) * 5).toFixed(1)}B`, d: '-12.4%', t: 'alert' },
    { l: 'Debt to GDP', v: `${(38 + seed(`fg:${epoch}`) * 12).toFixed(1)}%`, d: '-0.6%', t: 'neutral' },
  ];
  const geo = [
    { l: 'Border tension — North', s: 'Medium', t: 'warn' },
    { l: 'Maritime activity', s: 'Low', t: 'ok' },
    { l: 'Global market impact', s: 'Moderate', t: 'warn' },
    { l: 'Diplomatic engagements', s: 'Active', t: 'ok' },
  ];
  const quick = [
    { l: 'Emergency War Room', a: () => setWar(true) },
    { l: 'Cabinet Meeting', href: '/gov/coordination' },
    { l: 'National Alert', href: '/gov/situation-room' },
    { l: 'Resource Reallocation', href: '/ops' },
    { l: 'Intelligence Report', href: '/gov/coordination' },
    { l: 'Executive Directive', href: '/audit' },
  ];

  const brief = [
    `National stability: ${stability < 70 ? 'Elevated' : 'Stable'}`,
    `${escalations.filter(e => e.sevState === 'critical').length} critical · ${escalations.filter(e => e.sevState === 'elevated').length} elevated escalations`,
    pressOf('ENERGY') >= 60 ? 'Energy sector requires immediate attention' : 'Energy sector within tolerance',
    `Healthcare capacity at ${Math.max(1, 100 - pressOf('HEALTH'))}%`,
    'Treasury liquidity adequate for 28 days',
    nationalRisk >= 60 ? 'Security posture: heightened' : 'No major security threats',
    'Cabinet coordination recommended',
  ];

  const cmdItems: CommandItem[] = [
    { id: 's-cab', group: 'Surfaces', label: 'Cabinet Intelligence', href: '/gov' },
    { id: 's-sr', group: 'Surfaces', label: 'Situation Room', href: '/gov/situation-room' },
    { id: 's-coord', group: 'Surfaces', label: 'National Coordination', href: '/gov/coordination' },
    { id: 's-ops', group: 'Surfaces', label: 'Operations Centre', href: '/ops' },
    { id: 's-aud', group: 'Surfaces', label: 'Oversight & Audit', href: '/audit' },
    { id: 's-min', group: 'Surfaces', label: 'Institutions Admin', href: '/ministries' },
    { id: 's-cfg', group: 'Surfaces', label: 'Sovereign Configuration', href: '/gov/configuration' },
    ...mapNodes.map(m => ({ id: `m-${m.ministryId}`, group: 'Ministries', label: m.ministry, hint: `pressure ${m.pressure}`, href: `/gov/ministry/${m.ministryId}` })),
    ...incidents.slice(0, 12).map((c, i) => ({ id: `i-${i}`, group: 'Incident jump', label: c.label, hint: c.ministry, href: `/gov/ministry/${c.ministryId}` })),
  ];

  return (
    <div className="sov flex h-screen flex-col overflow-hidden font-sans [height:100dvh]"
      style={{ ...PALETTE, ...(war ? ({ ['--accent' as string]: RED }) : {}) }}>
      <CommandPalette items={cmdItems} accent={war ? RED : ACCENT} />
      {war ? (
        <div className="flex shrink-0 items-center justify-between gap-3 bg-[color:var(--accent)]/15 px-4 py-1.5 text-xs"
          style={{ borderBottom: `1px solid ${RED}` }}>
          <span className="flex items-center gap-2 font-semibold uppercase tracking-[0.2em]" style={{ color: RED }}>
            <span className="h-2 w-2 animate-pulse rounded-full" style={{ backgroundColor: RED }} />
            War Room · National crisis coordination active
          </span>
          <button onClick={() => setWar(false)} className="focus-ring rounded border px-2 py-0.5 text-[10px] uppercase tracking-widest" style={{ borderColor: RED, color: RED }}>Stand down</button>
        </div>
      ) : null}

      {/* Command top bar */}
      <header className="flex h-14 shrink-0 items-center gap-4 border-b border-line bg-surface px-4">
        <Link href="/" className="focus-ring flex items-center gap-2.5 no-underline">
          <span aria-hidden className="grid h-9 w-9 place-items-center rounded-sm text-sm font-bold text-white ring-1 ring-white/15" style={{ backgroundColor: war ? RED : ACCENT }}>
            {identity ? identity.seal : 'CO'}
          </span>
          <span className="leading-tight">
            <span className="block text-sm font-bold tracking-[0.18em] text-ink">CIVICOS</span>
            <span className="block text-[9px] uppercase tracking-[0.16em] text-ink-muted">Sovereign Operating System</span>
          </span>
        </Link>
        <div className="hidden flex-1 text-center md:block">
          <div className="text-sm font-semibold tracking-[0.22em] text-ink">CABINET INTELLIGENCE</div>
          <div className="text-[10px] uppercase tracking-[0.16em] text-ink-muted">National executive command &amp; strategic coordination</div>
        </div>
        <div className="ml-auto flex items-center gap-3">
          <button type="button"
            onClick={() => { const e = new KeyboardEvent('keydown', { key: 'k', metaKey: true }); window.dispatchEvent(e); }}
            className="focus-ring hidden items-center gap-1.5 rounded-sm border border-line bg-bg px-2 py-1 text-xs text-ink-muted transition-colors hover:text-ink lg:flex">
            <span style={{ color: ACCENT }}>⌕</span> Search across government
            <kbd className="ml-1 rounded border border-line px-1 text-[9px] text-ink-muted">⌘K</kbd>
          </button>
          <span className="hidden font-mono text-xs tabular-nums text-ink-muted sm:inline">{new Date(now).toLocaleTimeString()}</span>
          <span className="border-l border-line pl-3">
            <ExecutiveMenu title={sov?.executiveTitle ?? 'Head of Government'} sub="Leader of the Nation" accent={war ? RED : ACCENT} />
          </span>
        </div>
      </header>

      <div className="flex min-h-0 flex-1">
        {/* Command rail */}
        <nav aria-label="Cabinet navigation" className="hidden w-[212px] shrink-0 flex-col border-r border-line bg-bg lg:flex">
          <div className="flex-1 overflow-y-auto py-1">
            {RAIL.map((grp, gi) => (
              <div key={gi} className="mb-0.5">
                <div className="px-3 pb-0.5 pt-2 text-[8px] font-semibold uppercase tracking-[0.18em] text-ink-muted">{grp.g}</div>
                {grp.items.map(it => (
                  <Link key={it.l} href={it.href}
                    className={`focus-ring flex items-center gap-2 border-l-2 px-3 py-1 no-underline transition-colors duration-150 ${
                      it.on ? 'bg-surface-2 font-medium' : 'border-transparent text-ink-muted hover:bg-surface-2/50 hover:text-ink'
                    }`}
                    style={it.on ? { borderLeftColor: ACCENT } : undefined}>
                    <span aria-hidden className="grid h-5 w-5 shrink-0 place-items-center rounded-[4px] bg-surface-2 text-[10px] ring-1 ring-line"
                      style={it.on ? { color: ACCENT } : { color: 'rgb(var(--c-ink-soft))' }}>{it.i}</span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[11.5px]" style={it.on ? { color: ACCENT } : undefined}>{it.l}</span>
                      <span className="block truncate text-[8.5px] text-ink-muted">{it.s}</span>
                    </span>
                  </Link>
                ))}
              </div>
            ))}
          </div>
          <button onClick={() => setWar(w => !w)}
            className="focus-ring mx-2 mb-1 mt-1 flex items-center gap-2 rounded border px-2.5 py-1.5 text-left text-[11px] transition-colors"
            style={{ borderColor: war ? RED : 'rgb(var(--c-line))', backgroundColor: war ? `color-mix(in srgb, ${RED} 14%, transparent)` : 'transparent' }}>
            <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: RED }} />
            <span><span className="block font-semibold uppercase tracking-widest" style={{ color: RED }}>Command Mode</span><span className="block text-ink-muted">{war ? 'War Room — active' : 'War Room'}</span></span>
          </button>
          <div className="grid grid-cols-2 gap-x-2 gap-y-0.5 border-t border-line px-3 py-2 text-[9px]">
            <div className="text-ink-muted">Executive</div><div className="truncate text-right text-ink-soft">{sov?.executiveTitle ?? 'Head of Govt'}</div>
            <div className="text-ink-muted">State</div><div className="text-right" style={{ color: TONE.ok }}>Online</div>
            <div className="text-ink-muted">Channel</div><div className="text-right" style={{ color: TONE.ok }}>Encrypted</div>
            <div className="text-ink-muted">Version</div><div className="text-right text-ink-soft">v2.1.0</div>
          </div>
        </nav>

        {/* Canvas */}
        <main className="min-w-0 flex-1 space-y-2 overflow-y-auto p-2"
          style={{ backgroundImage: 'linear-gradient(rgba(55,199,212,0.022) 1px, transparent 1px), linear-gradient(90deg, rgba(55,199,212,0.022) 1px, transparent 1px)', backgroundSize: '36px 36px' }}>
          {/* Row 1 — executive telemetry (11) */}
          <div className="grid grid-cols-3 gap-1.5 sm:grid-cols-4 lg:grid-cols-6 xl:grid-cols-11">
            {instr.map(t => (
              <div key={t.l} className="rounded-[3px] border border-line bg-surface px-2 py-1.5"
                style={{ boxShadow: 'inset 0 1px 0 rgba(55,199,212,0.06)' }}>
                <div className="truncate text-[8px] font-semibold uppercase tracking-[0.12em] text-ink-muted">{t.l}</div>
                <div className="font-mono text-[15px] leading-tight tabular-nums" style={{ color: t.t ? TONE[t.t] : 'rgb(var(--c-ink))' }}><LiveValue raw={t.v} /></div>
                <div className="mt-1 opacity-80"><Spark pts={sparkPts(t.spark)} tone={t.t ?? 'ok'} /></div>
                <div className="truncate text-[8px] text-ink-muted">{t.sub}</div>
              </div>
            ))}
            <div className="rounded-[3px] border border-line bg-surface px-2 py-1.5" style={{ boxShadow: 'inset 0 1px 0 rgba(55,199,212,0.06)' }}>
              <div className="text-[8px] font-semibold uppercase tracking-[0.12em] text-ink-muted">Classification</div>
              <div className="text-[13px] font-bold tracking-widest" style={{ color: ACCENT }}>OFFICIAL</div>
              <div className="font-mono text-[9px] tabular-nums text-ink-soft">{new Date(now).toLocaleTimeString()}</div>
              <div className="truncate text-[8px] text-ink-muted">ENV · <span style={{ color: TONE.ok }}>{nat?.environment ?? 'PROD'}</span></div>
            </div>
          </div>

          {/* ROW 2 — primary command surface (map 58% · matrix 25% · escalation 17%) */}
          <div className="grid gap-2 xl:grid-cols-12">
            <Panel title="National strategic map" meta="live operational command view" className="xl:col-span-7" bodyClass="!p-2">
              <NationalMap mapNodes={mapNodes} edges={coord?.edges ?? []} incidents={incidents} now={now} layers={layers} epoch={epoch} focus={sov?.stateName} height={372} onToggleLayer={k => setLayers(s => ({ ...s, [k]: !s[k] }))} />
            </Panel>

            <Panel title="Ministry risk matrix" meta={`${mRows.length} institutions`} className="xl:col-span-3" bodyClass="!p-0">
              <table className="w-full text-[11px]">
                <thead>
                  <tr className="sticky top-0 z-10 border-b border-line bg-surface-2 text-left text-[8.5px] uppercase tracking-wider text-ink-muted">
                    <th className="px-2 py-1.5">Ministry</th>
                    {DOMAINS.map(d => <th key={d} className="px-1 py-1.5 text-center">{d.slice(0, 5)}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {mRows.map(m => {
                    const id = identityFor(m.archetype as ArchetypeKey);
                    return (
                      <tr key={m.ministryId} className="border-b border-line-soft last:border-0">
                        <td className="px-2 py-1.5">
                          <Link href={m.href} className="focus-ring flex items-center gap-1.5 no-underline">
                            <span className="grid h-3.5 w-3.5 place-items-center rounded-[3px] text-[7px] text-white" style={{ backgroundColor: id.accent }}>{id.glyph}</span>
                            <span className="truncate text-ink">{m.ministry}</span>
                          </Link>
                        </td>
                        {DOMAINS.map((d, di) => {
                          const v = domainStress(m.archetype, DOMAIN_KEYS[di] ?? 'ops', m.pressure, ts, m.ministryId);
                          const st = riskState(v);
                          return (
                            <td key={d} className="px-1 py-1.5 text-center">
                              <span className="inline-block rounded px-1 py-0.5 text-[9px] font-semibold"
                                style={{ backgroundColor: `color-mix(in srgb, ${TONE[RISK_TONE[st]]} 16%, transparent)`, color: TONE[RISK_TONE[st]] }}>
                                {RISK_LABEL[st]}
                              </span>
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </Panel>

            <Panel title="Cabinet escalation feed" meta={`${escList.length} active`} className="xl:col-span-2" bodyClass="!p-0">
              {escList.map((e, i) => {
                const open = openEsc === i;
                const tn = TONE[RISK_TONE[e.sevState]];
                const owner = ['Dep. Chief of Staff', 'National Security Adviser', 'Cabinet Secretary', 'Crisis Coordinator', 'Principal Secretary'][Math.floor(seed(`own:${e.title}`) * 5)];
                const chron = [
                  { t: `${e.age}m`, l: 'Signal detected', c: TONE.neutral },
                  { t: `${Math.max(1, e.age - 2)}m`, l: `${e.ministry} acknowledged`, c: TONE.ok },
                  { t: `${Math.max(1, Math.round(e.age * 0.6))}m`, l: `Escalated to Cabinet L${e.level}`, c: TONE.warn },
                  { t: `${Math.max(1, Math.round(e.age * 0.3))}m`, l: `${owner} assigned`, c: tn },
                ];
                const action = e.sevState === 'critical' ? 'Convene Cabinet · activate War Room' : e.sevState === 'elevated' ? 'Pre-position reserves · regional coordination' : 'Ministry-level containment · monitor';
                return (
                  <div key={i} className="border-b border-line-soft last:border-0" style={{ borderLeft: `3px solid ${tn}` }}>
                    <button onClick={() => setOpenEsc(open ? null : i)}
                      className="focus-ring block w-full px-3 py-2.5 text-left transition-colors hover:bg-surface-2/50">
                      <div className="flex items-center justify-between">
                        <span className="rounded px-1 py-0.5 text-[9px] font-bold uppercase tracking-wider" style={{ backgroundColor: `color-mix(in srgb, ${tn} 18%, transparent)`, color: tn }}>{RISK_LABEL[e.sevState]}</span>
                        <span className="flex items-center gap-1.5 font-mono text-[10px] tabular-nums text-ink-muted">{e.age}m<span className="transition-transform" style={{ transform: open ? 'rotate(90deg)' : 'none' }}>›</span></span>
                      </div>
                      <div className="mt-1 truncate text-xs font-medium text-ink">{e.title}</div>
                      <div className="truncate text-[10px] text-ink-muted">{e.ministry} · affecting {e.pop}M · {e.regions} regions</div>
                    </button>
                    {open ? (
                      <div className="px-3 pb-2.5 pt-0.5">
                        <div className="rounded-[3px] border border-line-soft bg-surface-2/40 p-2">
                          <div className="mb-1 text-[8px] font-semibold uppercase tracking-[0.16em] text-ink-muted">Chronology</div>
                          {chron.map((c, k) => (
                            <div key={k} className="flex items-center gap-2 py-0.5 text-[10px]">
                              <span className="w-8 shrink-0 font-mono tabular-nums text-ink-muted">{c.t}</span>
                              <span className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ backgroundColor: c.c }} />
                              <span className="truncate text-ink-soft">{c.l}</span>
                            </div>
                          ))}
                          <div className="mt-1.5 flex items-center justify-between border-t border-line-soft pt-1.5 text-[10px]">
                            <span className="text-ink-muted">Owner</span><span className="text-ink-soft">{owner}</span>
                          </div>
                          <div className="mt-1 text-[10px]" style={{ color: TONE.warn }}>Recommended: {action}</div>
                          <Link href={e.mid.startsWith('/') ? e.mid : `/gov/ministry/${e.mid}`}
                            className="focus-ring mt-1.5 inline-block text-[10px] text-link underline underline-offset-2">Open ministry workspace →</Link>
                        </div>
                      </div>
                    ) : null}
                  </div>
                );
              })}
              <Link href="/gov/coordination" className="focus-ring block px-3 py-2 text-center text-[11px] text-link underline underline-offset-2">View all escalations →</Link>
            </Panel>
          </div>

          {/* ROW 3 — 5 containers: dependency · timeline · forecast · heatmap(wider) · brief(taller) */}
          <div className="grid gap-2 lg:grid-cols-2 xl:grid-cols-12">
            <Panel title="National dependency graph" meta="systemic impact propagation" className="xl:col-span-3">
              <div className="relative h-[200px] w-full">
                <svg viewBox="0 0 100 100" className="absolute inset-0 h-full w-full" preserveAspectRatio="none">
                  {depLinks.map(([a, b], i) => {
                    const A = dep[a], B = dep[b];
                    if (!A || !B) return null;
                    const t = Math.max(A.p, B.p);
                    const tn = t >= 67 ? 'alert' : t >= 40 ? 'warn' : 'ok';
                    return <line key={i} x1={A.x} y1={A.y} x2={B.x} y2={B.y} stroke={TONE[tn]} strokeWidth="0.7"
                      strokeOpacity={0.3 + (t / 100) * 0.5} strokeDasharray={t >= 67 ? '0' : '2 3'}
                      className={t >= 67 ? 'motion-safe:animate-[shimmer_2s_linear_infinite]' : ''} vectorEffect="non-scaling-stroke" />;
                  })}
                </svg>
                {dep.map(d => {
                  const tn = toneFor(d.p);
                  return (
                    <span key={d.k} className="absolute -translate-x-1/2 -translate-y-1/2 text-center" style={{ left: `${d.x}%`, top: `${d.y}%` }}>
                      <span className="grid h-9 w-9 place-items-center rounded-full text-sm text-white ring-2" style={{ backgroundColor: 'rgb(var(--c-surface-2))', color: TONE[tn], borderColor: TONE[tn], boxShadow: d.p >= 67 ? `0 0 10px ${TONE.alert}` : undefined }}>{d.g}</span>
                      <span className="mt-0.5 block text-[9px] text-ink-muted">{d.k}</span>
                    </span>
                  );
                })}
              </div>
              <div className="mt-1 flex gap-3 text-[10px] text-ink-muted">
                <span className="flex items-center gap-1"><span className="h-px w-4" style={{ backgroundColor: TONE.ok }} />Direct</span>
                <span className="flex items-center gap-1"><span className="h-px w-4 border-t border-dashed" style={{ borderColor: TONE.warn }} />Indirect</span>
                <span className="flex items-center gap-1"><span className="h-px w-4" style={{ backgroundColor: TONE.alert }} />Critical path</span>
              </div>
            </Panel>

            <Panel title="Operational timeline" meta="chronology" className="xl:col-span-2" bodyClass="!p-0">
              {(coord?.timeline ?? []).slice(0, 9).map((e, i) => (
                <div key={i} className="flex items-start gap-2 border-b border-line-soft px-3 py-1.5 text-xs last:border-0">
                  <span className="font-mono text-[10px] tabular-nums text-ink-muted">{rel(e.at, now)}</span>
                  <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full" style={{ backgroundColor: TONE[e.tone] ?? TONE.neutral }} />
                  <span className="min-w-0"><span className="block truncate text-ink-soft">{e.title}</span></span>
                </div>
              ))}
              {(coord?.timeline ?? []).length === 0 ? <p className="p-3 text-xs text-ink-muted">Awaiting events…</p> : null}
            </Panel>

            <Panel title="Strategic forecast · 72h" meta="advisory" className="xl:col-span-2">
              <ul className="space-y-2 text-xs">
                {forecast.map(f => (
                  <li key={f.l} className="flex items-center justify-between gap-2">
                    <span className="flex items-center gap-1.5"><span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: TONE[f.t] }} /><span className="text-ink-soft">{f.l}</span></span>
                    <span className="font-mono text-[11px] tabular-nums" style={{ color: TONE[f.t] }}>{f.v}</span>
                  </li>
                ))}
              </ul>
              <p className="mt-2 text-[9px] leading-relaxed text-ink-muted">Advisory projection only — no autonomous action. Cabinet decides.</p>
            </Panel>

            <Panel title="National heatmap" meta="ministry stress · region" className="xl:col-span-3" bodyClass="!p-2">
              <TerritoryHeat epoch={epoch} height={210} focus={sov?.stateName} />
              <div className="mt-1.5 flex items-center justify-between text-[10px] text-ink-muted">
                <span>Low</span>
                <span className="mx-2 h-1.5 flex-1 rounded-full" style={{ background: `linear-gradient(90deg, ${TONE.ok}, ${TONE.warn}, ${TONE.alert})` }} />
                <span>Critical</span>
              </div>
            </Panel>

            <Panel title="Morning executive brief" meta="classified" className="xl:col-span-2" bodyClass="">
              <div className="mb-1.5 flex items-center gap-2 border-b border-line pb-1.5 font-mono text-[9px] uppercase tracking-[0.16em] text-ink-muted">
                <span style={{ color: ACCENT }}>◆</span> INTEL SUMMARY<span className="ml-auto">{new Date(now).toLocaleDateString()}</span>
              </div>
              <ul className="space-y-1.5 text-[11px] leading-relaxed">
                {brief.map((b, i) => (
                  <li key={i} className="flex gap-1.5"><span className="mt-1.5 h-1 w-1 shrink-0 rounded-full" style={{ backgroundColor: ACCENT }} /><span className="text-ink-soft">{b}</span></li>
                ))}
              </ul>
              <div className="mt-2 border-t border-line pt-1.5 text-[9px] text-ink-muted">
                Attention: <span style={{ color: TONE.warn }}>{escList[0]?.ministry ?? 'none'}</span> · Cabinet <span style={{ color: TONE.ok }}>OPERATIONAL</span>
              </div>
            </Panel>
          </div>

          {/* ROW A — heterogeneous executive micro-panel band (4 columns) */}
          <div className="grid gap-2 lg:grid-cols-2 xl:grid-cols-4">
            <Panel title="National KPI trends" meta="strategic indicators" bodyClass="!p-1.5">
              <div className="grid grid-cols-1 gap-1">
                {kpiTrends.map(k => {
                  const up = k.d >= 0;
                  const tn = k.pct ? (k.v < 0 ? 'alert' : 'ok') : k.v >= 70 ? 'ok' : k.v >= 50 ? 'warn' : 'alert';
                  return (
                    <div key={k.l} className="flex items-center gap-2 rounded-[3px] border border-line-soft bg-surface-2/40 px-2 py-1">
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-[8px] font-semibold uppercase tracking-[0.12em] text-ink-muted">{k.l}</div>
                        <div className="font-mono text-[13px] leading-none tabular-nums" style={{ color: TONE[tn] }}>{k.v}{k.pct ? '%' : ''}</div>
                      </div>
                      <div className="h-5 w-16 shrink-0 opacity-80"><Spark pts={waveSeries(`kpi:${k.l}`, ts, 12, 35, 92)} tone={tn} /></div>
                      <span className="w-9 shrink-0 text-right font-mono text-[10px] tabular-nums" style={{ color: up ? TONE.ok : TONE.alert }}>{up ? '▲' : '▼'}{Math.abs(k.d)}</span>
                    </div>
                  );
                })}
              </div>
            </Panel>

            <Panel title="Fiscal overview" meta="treasury position" bodyClass="!p-1.5">
              <div className="grid grid-cols-2 gap-1">
                {fiscal.map(f => (
                  <div key={f.l} className="rounded-[3px] border border-line-soft bg-surface-2/40 px-2 py-1.5">
                    <div className="truncate text-[8px] font-semibold uppercase tracking-[0.12em] text-ink-muted">{f.l}</div>
                    <div className="font-mono text-[13px] leading-tight tabular-nums" style={{ color: TONE[f.t] }}>{f.v}</div>
                    <div className="mt-0.5 opacity-70"><Spark pts={waveSeries(`fis:${f.l}`, ts, 10, 35, 92)} tone={f.t} /></div>
                    <div className="text-[9px] tabular-nums" style={{ color: f.d.startsWith('-') ? TONE.alert : TONE.ok }}>{f.d}</div>
                  </div>
                ))}
              </div>
            </Panel>

            <Panel title="Geopolitical monitor" meta="external pressure" bodyClass="!p-1.5">
              <div className="grid grid-cols-1 gap-1">
                {geo.map(g => (
                  <div key={g.l} className="flex items-center justify-between gap-2 rounded-[3px] border border-line-soft bg-surface-2/40 px-2 py-1.5">
                    <span className="min-w-0 flex-1 truncate text-[11px] text-ink-soft">{g.l}</span>
                    <span className="shrink-0 rounded-[3px] px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider" style={{ backgroundColor: `color-mix(in srgb, ${TONE[g.t]} 18%, transparent)`, color: TONE[g.t] }}>{g.s}</span>
                  </div>
                ))}
                <div className="mt-0.5 flex items-center justify-between border-t border-line-soft px-1 pt-1.5 text-[9px] text-ink-muted">
                  <span>Posture</span><span className="font-mono" style={{ color: nationalRisk >= 60 ? TONE.alert : TONE.ok }}>{nationalRisk >= 60 ? 'Heightened' : 'Nominal'}</span>
                </div>
              </div>
            </Panel>

            <Panel title="Quick actions" meta="executive command" bodyClass="!p-1.5">
              <div className="grid grid-cols-2 gap-1">
                {quick.map((q, i) => {
                  const danger = i === 0;
                  const glyph = ['⛨', '◆', '⚠', '⇄', '▤', '§'][i] ?? '◆';
                  const cls = 'focus-ring group flex items-center gap-1.5 rounded-[3px] border px-2 py-1.5 text-left text-[10px] font-medium transition-all';
                  const st = { borderColor: danger ? RED : 'rgb(var(--c-line))', color: danger ? RED : 'rgb(var(--c-ink-soft))' };
                  const inner = (
                    <>
                      <span className="grid h-5 w-5 shrink-0 place-items-center rounded-[3px] text-[11px] transition-colors group-hover:text-white" style={{ backgroundColor: 'rgb(var(--c-surface-2))', color: danger ? RED : ACCENT }}>{glyph}</span>
                      <span className="min-w-0 truncate">{q.l}</span>
                    </>
                  );
                  return q.href
                    ? <Link key={q.l} href={q.href} className={`${cls} no-underline hover:bg-surface-2/60`} style={st}>{inner}</Link>
                    : <button key={q.l} onClick={q.a} className={cls} style={{ ...st, backgroundColor: `color-mix(in srgb, ${RED} 8%, transparent)` }}>{inner}</button>;
                })}
              </div>
            </Panel>
          </div>

          {/* Row 5 — executive posture strip */}
          <div className="grid grid-cols-2 gap-px overflow-hidden rounded-[3px] border border-line bg-line text-[10px] md:grid-cols-5">
            {[
              { l: 'Readiness posture', v: war ? 'CRITICAL' : posture?.label ?? 'STABLE', t: war ? 'alert' : posture?.level ?? 'ok' },
              { l: 'Operational tempo', v: `${Math.round(40 + seed(`tempo:${epoch}`) * 55)} ops/min`, t: 'ok' },
              { l: 'Active escalations', v: `${escalations.length} · ${escalations.filter(e => e.sevState === 'critical').length} crit`, t: escalations.length ? 'alert' : 'ok' },
              { l: 'Population impacted', v: `${(0.4 + seed(`pi:${epoch}`) * 9).toFixed(1)}M`, t: 'warn' },
              { l: 'War Room', v: war ? 'ENGAGED' : 'Standby', t: war ? 'alert' : 'neutral' },
            ].map(s => (
              <div key={s.l} className="flex items-center justify-between gap-2 bg-surface px-3 py-1.5">
                <span className="uppercase tracking-[0.14em] text-ink-muted">{s.l}</span>
                <span className="flex items-center gap-1.5 font-mono font-semibold tabular-nums" style={{ color: TONE[s.t] }}>
                  {s.l === 'War Room' || s.l === 'Readiness posture' ? <span className="h-1.5 w-1.5 animate-pulse rounded-full" style={{ backgroundColor: TONE[s.t] }} /> : null}
                  {s.v}
                </span>
              </div>
            ))}
          </div>
        </main>
      </div>
    </div>
  );
}
