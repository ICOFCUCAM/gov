'use client';

// apps/ministry-health/subsystems/PharmaceuticalSystem — a TRUE supply-
// chain execution system: inventory with depletion prediction, regional
// medicine routing, procurement pipeline, an emergency-redistribution
// queue with authorisation, AI guidance and the executable procurement
// runtime. Multi-role aware.

import * as React from 'react';
import { StatGrid, Bars, Panel, PosturePill, ac } from '@/apps/_shared/AppKit';
import { RuntimeQueue } from '@/components/features/RuntimeQueue';
import { pharmaceuticalSupply, pharmaceuticalDeepExecution } from '@/lib/gov/health-operations';
import { aiAdvisory } from '@/shared/ai/advisory';
import type { SovereignRole, Capability } from '@/shared/permissions/rbac';

export function PharmaceuticalSystem({ id, now, role, withheld }: {
  id: string; now: number; role: SovereignRole; withheld: Capability[];
}) {
  const ts = now / 4000;
  const base = pharmaceuticalSupply(id, ts);
  const px = pharmaceuticalDeepExecution(id, ts);

  // Emergency-redistribution authorisation — a real operational action.
  const [authorised, setAuthorised] = React.useState<Set<string>>(() => new Set());
  const isAuth = (o: { id: string; status: string }) => o.status !== 'proposed' || authorised.has(o.id);
  const pendingAuth = px.redistribution.filter(o => !isAuth(o)).length;

  const pTone: 'ok' | 'warn' | 'alert' =
    px.posture === 'shortage' ? 'alert' : px.posture === 'strained' ? 'warn' : 'ok';

  const adv = aiAdvisory('Pharmaceutical Systems', [
    { label: 'Critical drug classes', value: Math.min(100, px.criticalDrugs * 22), adverse: true },
    { label: 'National cover days', value: Math.max(0, 100 - px.nationalCoverDays * 2), adverse: true },
    { label: 'Pending redistribution', value: Math.min(100, pendingAuth * 25), adverse: true },
    { label: 'Stockout risk', value: base.stockoutRiskPct, adverse: true },
  ]);
  const at: 'ok' | 'warn' | 'alert' =
    adv.severity === 'critical' || adv.severity === 'priority' ? 'alert' : adv.severity === 'advisory' ? 'warn' : 'ok';

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-3 rounded-[3px] border border-line bg-surface px-2.5 py-1.5">
        <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-ink-soft">Pharmaceutical Systems</span>
        <PosturePill label={px.posture} tone={pTone} />
        <span className="text-[9px] text-ink-muted">national cover · <span className="text-ink-soft">{px.nationalCoverDays}d</span> · critical <span className="text-ink-soft">{px.criticalDrugs}</span></span>
        <span className="ml-auto text-[9px] text-ink-muted">operator · {role}</span>
      </div>

      <StatGrid items={[
        { l: 'Outlets', v: base.outlets.toLocaleString(), t: 'ok' },
        { l: 'National cover', v: `${px.nationalCoverDays}d`, t: px.nationalCoverDays < 21 ? 'alert' : px.nationalCoverDays < 35 ? 'warn' : 'ok' },
        { l: 'Critical drugs', v: `${px.criticalDrugs}`, t: px.criticalDrugs ? 'alert' : 'ok' },
        { l: 'Stockout risk', v: `${base.stockoutRiskPct}%`, t: base.stockoutRiskPct >= 25 ? 'alert' : base.stockoutRiskPct >= 12 ? 'warn' : 'ok' },
        { l: 'In transit', v: base.pipelineInTransit.toLocaleString(), t: 'ok' },
        { l: 'Redistribution', v: `${pendingAuth} pending`, t: pendingAuth ? 'warn' : 'ok' },
      ]} />

      <div className="rounded-[3px] border border-line bg-surface p-2" style={{ borderLeft: `3px solid ${ac(at)}` }}>
        <div className="flex items-center justify-between gap-2">
          <span className="text-[10px] font-semibold uppercase tracking-[0.16em]" style={{ color: ac(at) }}>AI operational guidance · {adv.severity}</span>
          <span className="font-mono text-[9px] tabular-nums text-ink-muted">confidence {adv.confidence}%</span>
        </div>
        <div className="mt-0.5 text-[11px] text-ink">{adv.headline}</div>
        <div className="text-[9px] text-ink-muted">{adv.rationale}</div>
        <ul className="mt-0.5 flex flex-wrap gap-x-4">{adv.recommended.map((r, i) => <li key={i} className="text-[9px] text-ink-soft">▸ {r}</li>)}</ul>
      </div>

      <Panel title="Inventory & depletion prediction" meta="drug · cover · burn/mo · ETA stockout · status">
        <div className="space-y-1">
          {px.inventory.map(d => (
            <div key={d.drug} className="flex items-center gap-2 text-[10px]">
              <span className="w-28 shrink-0 truncate text-ink">{d.drug}</span>
              <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-surface-2"><span className="block h-full" style={{ width: `${Math.min(100, d.coverDays * 1.4)}%`, backgroundColor: ac(d.tone) }} /></div>
              <span className="w-32 shrink-0 text-right font-mono tabular-nums text-ink-muted">{d.coverDays}d · {(d.monthlyBurn / 1000).toFixed(0)}k/mo</span>
              <span className="w-14 shrink-0 text-right text-[8px] font-bold uppercase" style={{ color: ac(d.tone) }}>{d.status}</span>
            </div>
          ))}
        </div>
      </Panel>

      <Panel title="Emergency redistribution queue" meta="surplus → deficit · authorise to dispatch">
        {px.redistribution.length === 0 ? (
          <p className="text-[11px] text-ink-muted">No active redistribution orders — regional fill within tolerance.</p>
        ) : (
          <div className="space-y-1.5">
            {px.redistribution.map(o => {
              const done = isAuth(o);
              return (
                <div key={o.id} className="flex flex-wrap items-center gap-2 rounded-[3px] border border-line-soft bg-surface-2/40 px-2.5 py-1.5" style={{ borderLeft: `3px solid ${ac(done ? 'ok' : o.tone)}` }}>
                  <span className="font-mono text-[9px] tabular-nums text-ink-muted">{o.id}</span>
                  <span className="text-[11px] font-medium text-ink">{o.drug}</span>
                  <span className="text-[9px] text-ink-muted">{o.fromRegion} → {o.toRegion} · {o.units.toLocaleString()}u</span>
                  {done ? (
                    <span className="ml-auto text-[8.5px] font-semibold uppercase tracking-wider" style={{ color: ac('ok') }}>✓ {o.status === 'proposed' ? 'authorised' : o.status}</span>
                  ) : (
                    <button
                      onClick={() => setAuthorised(prev => new Set(prev).add(o.id))}
                      className="focus-ring ml-auto rounded-[3px] border border-line bg-surface px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-ink transition-colors hover:bg-surface-2">
                      Authorise
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </Panel>

      <div className="grid gap-2 xl:grid-cols-2">
        <Panel title="Regional medicine routing" meta="region · fill rate · action">
          <Bars rows={px.regions.map(r => ({ label: `${r.region} (${r.shortages} short)`, pct: r.fillRatePct, tone: r.tone, tail: `${r.fillRatePct}%` }))} />
        </Panel>
        <Panel title="Procurement pipeline" meta="requisition → received · value $M">
          <Bars rows={px.procurement.map(s => ({ label: `${s.stage} ($${s.valueM}M)`, pct: Math.min(100, s.count * 3), tone: s.tone, tail: `${s.count}` }))} />
        </Panel>
      </div>

      <Panel title="Operational timeline" meta="most recent first">
        <div className="space-y-1">
          {px.timeline.map((e, i) => (
            <div key={i} className="flex items-start gap-2 text-[10px]">
              <span className="w-12 shrink-0 font-mono tabular-nums text-ink-muted">−{e.atHrsAgo}h</span>
              <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full" style={{ backgroundColor: ac(e.tone) }} />
              <span className="min-w-0"><span className="text-[8px] uppercase tracking-wider text-ink-muted">{e.kind}</span><span className="block text-ink-soft">{e.detail}</span></span>
            </div>
          ))}
        </div>
      </Panel>

      <RuntimeQueue
        scope={`${id}:pharma`}
        kind="procurement"
        title="Pharmaceutical supply runtime — requisition → sourced → contracted → delivered"
        by="Supply Officer"
        role={role}
        withheld={withheld}
      />
    </div>
  );
}
