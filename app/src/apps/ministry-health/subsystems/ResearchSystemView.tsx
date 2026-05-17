'use client';

// apps/ministry-health/subsystems/ResearchSystemView — Layers 6/9: blood
// bank network (inventory + emergency redistribution) and genomic
// surveillance (sequencing pipeline + variant tracking).

import * as React from 'react';
import { StatGrid, Bars, Panel, PosturePill, ac } from '@/apps/_shared/AppKit';
import { RuntimeQueue } from '@/components/features/RuntimeQueue';
import { researchSystem } from '@/lib/gov/health-operations';
import { aiAdvisory } from '@/shared/ai/advisory';
import type { SovereignRole, Capability } from '@/shared/permissions/rbac';

export function ResearchSystemView({ id, now, role, withheld }: {
  id: string; now: number; role: SovereignRole; withheld: Capability[];
}) {
  const ts = now / 4000;
  const r = researchSystem(id, ts);
  const [redistributed, setRedistributed] = React.useState<Set<string>>(() => new Set());
  const pTone: 'ok' | 'warn' | 'alert' = r.posture === 'critical' ? 'alert' : r.posture === 'watch' ? 'warn' : 'ok';
  const adv = aiAdvisory('Research · Blood · Genomics', [
    { label: 'Critical blood groups', value: Math.min(100, r.blood.filter(b => b.status === 'critical').length * 26), adverse: true },
    { label: 'VOC variant', value: r.variants.some(v => v.vocFlag) ? 88 : 20, adverse: true },
    { label: 'Genomic coverage gap', value: Math.max(0, 100 - r.genomicCoveragePct * 1.5), adverse: true },
  ]);
  const at: 'ok' | 'warn' | 'alert' = adv.severity === 'critical' || adv.severity === 'priority' ? 'alert' : adv.severity === 'advisory' ? 'warn' : 'ok';
  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-3 rounded-[3px] border border-line bg-surface px-2.5 py-1.5">
        <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-ink-soft">Research · Blood Bank · Genomics</span>
        <PosturePill label={r.posture} tone={pTone} />
        <span className="text-[9px] text-ink-muted">genomic coverage · <span className="text-ink-soft">{r.genomicCoveragePct}%</span></span>
        <span className="ml-auto text-[9px] text-ink-muted">operator · {role}</span>
      </div>
      <StatGrid items={[
        { l: 'Critical blood groups', v: `${r.blood.filter(b => b.status === 'critical').length}`, t: r.blood.some(b => b.status === 'critical') ? 'alert' : 'ok' },
        { l: 'Blood redistributions', v: `${r.bloodEmergencyRedistributions}`, t: r.bloodEmergencyRedistributions ? 'warn' : 'ok' },
        { l: 'Genomic coverage', v: `${r.genomicCoveragePct}%`, t: r.genomicCoveragePct >= 30 ? 'ok' : 'warn' },
        { l: 'VOC flagged', v: r.variants.some(v => v.vocFlag) ? 'YES' : 'no', t: r.variants.some(v => v.vocFlag) ? 'alert' : 'ok' },
        { l: 'Sequencing stages', v: `${r.sequencing.length}`, t: 'ok' },
        { l: 'Posture', v: r.posture, t: pTone },
      ]} />
      <div className="rounded-[3px] border border-line bg-surface p-2" style={{ borderLeft: `3px solid ${ac(at)}` }}>
        <div className="text-[10px] font-semibold uppercase tracking-[0.16em]" style={{ color: ac(at) }}>AI research intelligence · {adv.severity}</div>
        <div className="mt-0.5 text-[10px] text-ink">{adv.headline}</div>
      </div>
      <Panel title="Blood bank — inventory & emergency redistribution" meta="group · units · days cover (worst-first)">
        <div className="space-y-1.5">
          {r.blood.map(b => {
            const done = b.status !== 'critical' || redistributed.has(b.group);
            return (
              <div key={b.group} className="flex flex-wrap items-center gap-2 rounded-[3px] border border-line-soft bg-surface-2/40 px-2.5 py-1.5" style={{ borderLeft: `3px solid ${ac(b.tone)}` }}>
                <span className="w-10 shrink-0 font-mono text-[11px] font-bold text-ink">{b.group}</span>
                <span className="text-[9px] text-ink-muted">{b.units.toLocaleString()}u · {b.daysCover}d cover</span>
                <span className="text-[8px] font-bold uppercase" style={{ color: ac(b.tone) }}>{b.status}</span>
                {b.status === 'critical' && !done ? (
                  <button onClick={() => setRedistributed(prev => new Set(prev).add(b.group))}
                    className="focus-ring ml-auto rounded-[3px] border border-line bg-surface px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-ink transition-colors hover:bg-surface-2">Emergency redistribute</button>
                ) : <span className="ml-auto text-[8.5px] uppercase tracking-wider" style={{ color: ac(done ? 'ok' : b.tone) }}>{done && b.status === 'critical' ? '✓ dispatched' : 'stocked'}</span>}
              </div>
            );
          })}
        </div>
      </Panel>
      <div className="grid gap-2 xl:grid-cols-2">
        <Panel title="Genomic sequencing pipeline" meta="stage · samples">
          <Bars rows={r.sequencing.map(s => ({ label: s.stage, pct: Math.min(100, s.samples / 18), tone: s.tone, tail: `${s.samples}` }))} />
        </Panel>
        <Panel title="Variant / mutation tracking" meta="lineage · share · trend (share-ordered)">
          <div className="space-y-1">
            {r.variants.map(v => (
              <div key={v.lineage} className="flex items-center gap-2 text-[10px]">
                <span className="w-32 shrink-0 truncate text-ink">{v.lineage}{v.vocFlag ? <span style={{ color: ac('alert') }}> ⚠VOC</span> : null}</span>
                <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-surface-2"><span className="block h-full" style={{ width: `${v.sharePct}%`, backgroundColor: ac(v.tone) }} /></div>
                <span className="w-16 shrink-0 text-right font-mono tabular-nums" style={{ color: ac(v.tone) }}>{v.sharePct}% {v.trend === 'rising' ? '↑' : v.trend === 'falling' ? '↓' : '·'}</span>
              </div>
            ))}
          </div>
        </Panel>
      </div>
      <RuntimeQueue scope={`${id}:research`} kind="case" title="Research runtime — receive → sequence → analyse → report" by="Lab Scientist" role={role} withheld={withheld} />
    </div>
  );
}
