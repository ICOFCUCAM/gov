'use client';

// Charter Registry — the sovereign discovery surface for every
// ministry's institutional depth. Each row pairs a ministry's
// blueprint citation, layout grammar, federation contract and
// maturity tier; rows are sorted by maturity score so the gap to
// reference-tier (Interior) is immediately legible. This is the
// presidential cabinet view that the project was missing.

import * as React from 'react';
import Link from 'next/link';
import { CHARTERS } from '@/lib/institution/charters/registry';
import { maturityFor } from '@/lib/institution/charters/maturity';
import type { MaturityTier } from '@/lib/institution/charters/types';

const TIER_COL: Record<MaturityTier, string> = {
  reference: '#3aa39c',     // teal — the bar
  operational: '#5a8db8',   // institutional blue
  advanced: '#a78947',      // restrained gold
  baseline: '#a05538',      // copper
  stub: '#7a2d3a',          // burgundy — alert
};

const TIER_LABEL: Record<MaturityTier, string> = {
  reference: 'Reference', operational: 'Operational', advanced: 'Advanced', baseline: 'Baseline', stub: 'Stub',
};

function mountHref(c: typeof CHARTERS[number]): string {
  if (c.mount.kind === 'agency') {
    const domainMap: Record<string, string> = {
      'police-command': '/app/police/strategic-command',
      'foreign-affairs': '/app/foreign/geopolitical-command',
      'emergency-response': '/app/emergency/national-command',
      'communications': '/app/communications/connectivity-command',
    };
    return domainMap[c.mount.appId] ?? `/app/${c.mount.appId}`;
  }
  const archetypeMap: Record<string, string> = {
    HEALTH: '/app/health/command',
    EDUCATION: '/app/education/command',
    TRANSPORT: '/app/transport/mobility-theater',
    ENERGY: '/app/energy/grid-theater',
    FINANCE: '/app/treasury/fiscal-command',
    AGRICULTURE: '/app/agriculture/food-continuity',
    JUSTICE: '/app/justice/constitutional-review',
    ENVIRONMENT: '/app/environment/planetary-resilience',
    INTERIOR: '/app/interior/command',
    LABOR: '/app/labour/workforce-command',
    TRADE: '/app/trade/industrial-command',
    GENERIC: '/app/institution',
  };
  return archetypeMap[c.mount.archetype] ?? '/app';
}

export function CharterRegistry() {
  const reports = React.useMemo(() => CHARTERS.map(maturityFor).sort((a, b) => b.score - a.score), []);

  // Aggregate counts for the masthead
  const tierCounts: Record<MaturityTier, number> = { reference: 0, operational: 0, advanced: 0, baseline: 0, stub: 0 };
  for (const r of reports) tierCounts[r.tier]++;

  const totalDomains = reports.reduce((s, r) => s + r.charter.shippedDomains, 0);
  const expectedDomains = reports.reduce((s, r) => s + r.charter.expectedDomains, 0);

  const [selected, setSelected] = React.useState<string | null>(null);
  const detail = selected ? reports.find(r => r.charter.id === selected) ?? null : null;

  return (
    <div className="min-h-screen" style={{ background: 'rgb(var(--c-bg))', color: 'rgb(var(--c-ink))', fontFamily: 'ui-sans-serif, system-ui, sans-serif' }}>
      {/* Masthead */}
      <header className="border-b" style={{ borderColor: 'rgb(var(--c-line))', background: 'linear-gradient(180deg, rgba(55,199,212,0.04) 0%, transparent 100%)' }}>
        <div className="mx-auto max-w-[1320px] px-8 py-7">
          <div className="flex items-baseline justify-between">
            <div>
              <div className="text-[10px] uppercase tracking-[0.42em] text-ink-soft">CivicOS · Sovereign Institutional Registry</div>
              <h1 className="mt-2 text-[22px] tracking-[0.02em]">Ministry Charter Registry</h1>
              <p className="mt-1 max-w-3xl text-[12px] text-ink-soft">
                Every sovereign institution measured against a single charter contract — design system, shell, layout grammar,
                domain depth, federation, workflows and constitutional safeguards. The gap to <span style={{ color: TIER_COL.reference }}>reference-tier</span>{' '}
                (Ministry of the Interior) is the implementation backlog.
              </p>
            </div>
            <Link href="/gov" className="rounded-md border border-line bg-surface px-3 py-1.5 text-[11px] uppercase tracking-[0.24em] text-ink-soft hover:bg-surface-2">
              ← Cabinet
            </Link>
          </div>
          <div className="mt-5 grid grid-cols-2 gap-px md:grid-cols-6" style={{ background: 'rgb(var(--c-line))' }}>
            {[
              { l: 'Reference', v: tierCounts.reference, c: TIER_COL.reference },
              { l: 'Operational', v: tierCounts.operational, c: TIER_COL.operational },
              { l: 'Advanced', v: tierCounts.advanced, c: TIER_COL.advanced },
              { l: 'Baseline', v: tierCounts.baseline, c: TIER_COL.baseline },
              { l: 'Domains shipped', v: totalDomains.toString(), c: 'rgb(var(--c-ink))' },
              { l: 'Of expected', v: expectedDomains.toString(), c: 'rgb(var(--c-ink-soft))' },
            ].map(x => (
              <div key={x.l} className="px-4 py-3" style={{ background: 'rgb(var(--c-bg))' }}>
                <div className="text-[8.5px] uppercase tracking-[0.28em] text-ink-soft">{x.l}</div>
                <div className="mt-1 tabular-nums text-[18px]" style={{ color: x.c }}>{x.v}</div>
              </div>
            ))}
          </div>
        </div>
      </header>

      {/* Two-column: registry list + selected charter detail */}
      <main className="mx-auto max-w-[1320px] px-8 py-6">
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_420px]">
          {/* Registry list */}
          <section>
            <div className="mb-3 flex items-baseline justify-between border-b pb-2" style={{ borderColor: 'rgb(var(--c-line))' }}>
              <h2 className="text-[11px] uppercase tracking-[0.32em] text-ink-soft">Institutions · {reports.length}</h2>
              <span className="text-[10px] uppercase tracking-[0.22em] text-ink-soft">sorted by maturity score</span>
            </div>
            <div className="space-y-2">
              {reports.map(r => {
                const isSel = selected === r.charter.id;
                return (
                  <article key={r.charter.id} onClick={() => setSelected(r.charter.id)}
                    className="cursor-pointer rounded-md border bg-surface p-4 transition-colors hover:bg-surface-2"
                    style={{ borderColor: isSel ? TIER_COL[r.tier] : 'rgb(var(--c-line))' }}>
                    <div className="flex items-baseline justify-between">
                      <div>
                        <div className="text-[13px]">{r.charter.label}</div>
                        <div className="mt-0.5 text-[10px] uppercase tracking-[0.22em] text-ink-soft">
                          {r.charter.mount.kind === 'agency' ? `agency · ${r.charter.mount.appId}` : `archetype · ${r.charter.mount.archetype}`}
                          {' · '}grammar · <span style={{ color: 'rgb(var(--c-ink))' }}>{r.charter.grammar}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="rounded-full px-2.5 py-0.5 text-[10px] uppercase tracking-[0.2em]" style={{ background: `${TIER_COL[r.tier]}22`, color: TIER_COL[r.tier] }}>
                          {TIER_LABEL[r.tier]}
                        </span>
                        <span className="tabular-nums text-[15px]" style={{ color: TIER_COL[r.tier] }}>{r.score}</span>
                      </div>
                    </div>
                    <div className="mt-3 grid grid-cols-[1fr_60px_60px_70px_70px_70px] items-center gap-3 text-[10px]">
                      {/* maturity score bar */}
                      <div className="h-[3px] rounded-full" style={{ background: 'rgb(var(--c-line))' }}>
                        <div className="h-full rounded-full" style={{ width: `${r.score}%`, background: TIER_COL[r.tier] }} />
                      </div>
                      <span className="tabular-nums text-right text-ink-soft">{r.charter.shippedDomains}/{r.charter.expectedDomains}</span>
                      <span className="text-right uppercase tracking-[0.18em]" style={{ color: r.charter.hasDesignSystem ? TIER_COL.reference : 'rgb(var(--c-ink-soft))' }}>{r.charter.hasDesignSystem ? '✓ DS' : '· ds'}</span>
                      <span className="text-right uppercase tracking-[0.18em]" style={{ color: r.charter.hasShell ? TIER_COL.reference : 'rgb(var(--c-ink-soft))' }}>{r.charter.hasShell ? '✓ shell' : '· shell'}</span>
                      <span className="text-right uppercase tracking-[0.18em]" style={{ color: r.charter.federation.emitsCascade ? TIER_COL.operational : 'rgb(var(--c-ink-soft))' }}>{r.charter.federation.emitsCascade ? '✓ fed' : '· fed'}</span>
                      <span className="text-right uppercase tracking-[0.18em]" style={{ color: r.charter.workflows.length ? TIER_COL.advanced : 'rgb(var(--c-ink-soft))' }}>{r.charter.workflows.length} wf</span>
                    </div>
                  </article>
                );
              })}
            </div>
          </section>

          {/* Charter detail */}
          <aside className="sticky top-6 self-start rounded-md border bg-surface" style={{ borderColor: 'rgb(var(--c-line))' }}>
            {detail ? (
              <div className="p-5">
                <div className="text-[10px] uppercase tracking-[0.32em] text-ink-soft">Charter · {detail.charter.id}</div>
                <h3 className="mt-1 text-[15px]">{detail.charter.label}</h3>
                <Link href={mountHref(detail.charter)}
                  className="mt-3 inline-block rounded-md border border-line px-3 py-1.5 text-[11px] uppercase tracking-[0.22em] hover:bg-surface-2">
                  Open ministry app →
                </Link>

                <div className="mt-5">
                  <div className="text-[9px] uppercase tracking-[0.28em] text-ink-soft">Blueprint citations</div>
                  <ul className="mt-1.5 space-y-1">
                    {detail.charter.blueprint.map(b => (
                      <li key={`${b.document}-${b.section}`} className="text-[11px]">
                        <span className="text-ink-soft">{b.document === 'master' ? '§' : 'Vol II §'}{b.section}</span>
                        <span className="ml-2">{b.title}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="mt-5">
                  <div className="text-[9px] uppercase tracking-[0.28em] text-ink-soft">Federation contract</div>
                  <div className="mt-1.5 grid grid-cols-2 gap-3 text-[11px]">
                    <div>
                      <div className="text-[9px] uppercase tracking-[0.2em] text-ink-soft">Produces →</div>
                      <div className="mt-0.5 flex flex-wrap gap-1">
                        {detail.charter.federation.produces.length === 0
                          ? <span className="text-[10px] italic text-ink-soft">none declared</span>
                          : detail.charter.federation.produces.map(m => (
                            <span key={m} className="rounded px-1.5 py-0.5 text-[10px]" style={{ background: 'rgba(58,163,156,0.12)', color: TIER_COL.reference }}>{m}</span>
                          ))}
                      </div>
                    </div>
                    <div>
                      <div className="text-[9px] uppercase tracking-[0.2em] text-ink-soft">Consumes ←</div>
                      <div className="mt-0.5 flex flex-wrap gap-1">
                        {detail.charter.federation.consumes.length === 0
                          ? <span className="text-[10px] italic text-ink-soft">none declared</span>
                          : detail.charter.federation.consumes.map(m => (
                            <span key={m} className="rounded px-1.5 py-0.5 text-[10px]" style={{ background: 'rgba(90,141,184,0.12)', color: TIER_COL.operational }}>{m}</span>
                          ))}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="mt-5">
                  <div className="text-[9px] uppercase tracking-[0.28em] text-ink-soft">Executable workflows</div>
                  {detail.charter.workflows.length === 0
                    ? <div className="mt-1 text-[10px] italic text-ink-soft">No workflows declared — ministry is read-only.</div>
                    : <ul className="mt-1.5 space-y-0.5 text-[11px]">
                      {detail.charter.workflows.map(w => (
                        <li key={w.id}><span className="text-ink-soft">·</span> {w.title} <span className="text-[9px] uppercase tracking-[0.22em] text-ink-soft">{w.kind}</span></li>
                      ))}
                    </ul>}
                </div>

                <div className="mt-5">
                  <div className="text-[9px] uppercase tracking-[0.28em] text-ink-soft">Constitutional safeguard</div>
                  <div className="mt-1 text-[11px]">{detail.charter.safeguardsConstant || <span className="italic text-ink-soft">none declared</span>}</div>
                </div>

                <div className="mt-5 border-t pt-4" style={{ borderColor: 'rgb(var(--c-line))' }}>
                  <div className="text-[9px] uppercase tracking-[0.28em]" style={{ color: TIER_COL[detail.tier] }}>Gaps to next tier ({detail.gaps.length})</div>
                  <ul className="mt-2 space-y-1 text-[11px]">
                    {detail.gaps.length === 0
                      ? <li className="italic text-ink-soft">At reference tier — no gaps.</li>
                      : detail.gaps.map((g, i) => (<li key={i}>· {g}</li>))}
                  </ul>
                </div>
              </div>
            ) : (
              <div className="p-8 text-center">
                <div className="text-[10px] uppercase tracking-[0.32em] text-ink-soft">Charter detail</div>
                <div className="mt-2 text-[12px] text-ink-soft">Select a ministry to inspect its charter, federation contract and gaps to next maturity tier.</div>
              </div>
            )}
          </aside>
        </div>

        {/* Reference-tier definition strip */}
        <footer className="mt-8 rounded-md border p-5" style={{ borderColor: 'rgb(var(--c-line))', background: 'rgba(58,163,156,0.04)' }}>
          <div className="text-[10px] uppercase tracking-[0.32em]" style={{ color: TIER_COL.reference }}>The Reference Tier — what every ministry must reach</div>
          <ul className="mt-2 grid grid-cols-1 gap-1 text-[11px] md:grid-cols-2 lg:grid-cols-3">
            <li>· Own design system (<code className="text-[10px]">apps/&lt;ministry&gt;/design-system/</code>)</li>
            <li>· Own shell engine (<code className="text-[10px]">apps/&lt;ministry&gt;/shell/</code>)</li>
            <li>· ≥30 domain surfaces with bespoke layouts</li>
            <li>· Distinct layout grammar (not generic-sector)</li>
            <li>· Emits cross-ministry cascade (federation)</li>
            <li>· ≥1 executable workflow (writes, not just reads)</li>
            <li>· Cites at least one blueprint section</li>
            <li>· Constitutional safeguards enforced, not declarative</li>
          </ul>
          <div className="mt-3 text-[10px] italic text-ink-soft">
            Today: 1 ministry at reference. Target by end of programme: all 15.
          </div>
        </footer>
      </main>
    </div>
  );
}
