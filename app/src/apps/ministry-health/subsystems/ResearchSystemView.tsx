'use client';

// Domain — Blood & Genomics Research. Blood-bank network (inventory +
// emergency redistribution) and genomic surveillance (sequencing pipeline
// + variant tracking). Cinematic sovereign command rhythm.

import * as React from 'react';
import { RuntimeQueue } from '@/components/features/RuntimeQueue';
import { DispatchChannel } from '@/apps/_shared/InstitutionChain';
import { researchSystem } from '@/lib/gov/health-operations';
import { aiAdvisory } from '@/shared/ai/advisory';
import { CommandPanel, sc, type Tone } from '@/apps/_shared/SovereignUI';
import { OpsHeader, KpiStrip, BarPanel, AdvisoryPanel } from '@/apps/ministry-health/subsystems/_ops';
import type { SovereignRole, Capability } from '@/shared/permissions/rbac';

const ACC = '#9b8cff';

export function ResearchSystemView({ id, now, role, withheld }: {
  id: string; now: number; role: SovereignRole; withheld: Capability[];
}) {
  const ts = now / 4000;
  const r = researchSystem(id, ts);
  const [redistributed, setRedistributed] = React.useState<Set<string>>(() => new Set());
  const pTone: Tone = r.posture === 'critical' ? 'alert' : r.posture === 'watch' ? 'warn' : 'ok';
  const critical = r.blood.filter(b => b.status === 'critical').length;
  const adv = aiAdvisory('Research · Blood · Genomics', [
    { label: 'Critical blood groups', value: Math.min(100, critical * 26), adverse: true },
    { label: 'VOC variant', value: r.variants.some(v => v.vocFlag) ? 88 : 20, adverse: true },
    { label: 'Genomic coverage gap', value: Math.max(0, 100 - r.genomicCoveragePct * 1.5), adverse: true },
  ]);

  return (
    <div className="space-y-2 rounded-[5px] p-2" style={{ background: '#080612', boxShadow: 'inset 0 0 90px rgba(0,0,0,0.6)' }}>
      <OpsHeader index={16} title="Blood & Genomics Research" subtitle="Blood-Bank Network · Genomic Surveillance"
        posture={r.posture} tone={pTone} now={now} role={role} accent={ACC} />

      <KpiStrip ts={ts} accent={ACC} items={[
        { l: 'Blood Groups', v: `${r.blood.length}`, s: 'tracked', t: 'ok', k: 'rsb' },
        { l: 'Critical Groups', v: `${critical}`, s: 'low cover', t: critical ? 'alert' : 'ok', k: 'rsc' },
        { l: 'Sequencing Stages', v: `${r.sequencing.length}`, s: 'pipeline', t: 'ok', k: 'rss' },
        { l: 'Variants', v: `${r.variants.length}`, s: 'lineages', t: r.variants.some(v => v.vocFlag) ? 'alert' : 'ok', k: 'rsv' },
        { l: 'Genomic Coverage', v: `${r.genomicCoveragePct}%`, s: 'national', t: r.genomicCoveragePct >= 60 ? 'ok' : 'warn', k: 'rsg' },
      ]} />

      <div className="grid gap-2 xl:grid-cols-3">
        <div className="xl:col-span-2">
          <CommandPanel title="Blood bank — inventory & emergency redistribution" meta="group · units · cover (worst-first)" accent={ACC} live>
            <div className="space-y-1.5">
              {r.blood.map(b => {
                const done = b.status !== 'critical' || redistributed.has(b.group);
                return (
                  <div key={b.group} className="flex flex-wrap items-center gap-2 rounded-[3px] border px-2.5 py-1.5" style={{ borderColor: 'rgba(155,140,255,0.18)', background: 'rgba(0,0,0,0.25)', borderLeft: `3px solid ${sc(b.tone)}` }}>
                    <span className="w-10 shrink-0 font-mono text-[12px] font-bold text-ink">{b.group}</span>
                    <span className="text-[8.5px] text-ink-muted">{b.units.toLocaleString()}u · {b.daysCover}d cover</span>
                    <span className="text-[7.5px] font-bold uppercase" style={{ color: sc(b.tone) }}>{b.status}</span>
                    {b.status === 'critical' && !done ? (
                      <button onClick={() => setRedistributed(prev => new Set(prev).add(b.group))}
                        className="focus-ring ml-auto rounded-[3px] border px-2 py-0.5 text-[8px] font-bold uppercase tracking-wider transition-colors"
                        style={{ borderColor: ACC, color: ACC }}>Emergency redistribute</button>
                    ) : <span className="ml-auto text-[8px] uppercase tracking-wider" style={{ color: sc(done ? 'ok' : b.tone) }}>{done && b.status === 'critical' ? '✓ dispatched' : 'stocked'}</span>}
                  </div>
                );
              })}
            </div>
          </CommandPanel>
        </div>
        <AdvisoryPanel accent={ACC} severity={adv.severity} headline={adv.headline} recommended={adv.recommended} />
      </div>

      <div className="grid gap-2 xl:grid-cols-2">
        <BarPanel title="Genomic sequencing pipeline" meta="stage · samples" accent={ACC}
          rows={r.sequencing.map(s => ({ label: s.stage, pct: Math.min(100, s.samples / 18), tone: s.tone, tail: `${s.samples}` }))} />
        <CommandPanel title="Variant / mutation tracking" meta="lineage · share · trend" accent={ACC} live>
          <div className="space-y-1">
            {r.variants.map(v => (
              <div key={v.lineage} className="flex items-center gap-2 text-[8.5px]">
                <span className="w-28 shrink-0 truncate text-ink">{v.lineage}{v.vocFlag ? <span style={{ color: sc('alert') }}> ⚠VOC</span> : null}</span>
                <span className="h-1.5 flex-1 overflow-hidden rounded-full" style={{ background: '#161427' }}><span className="block h-full rounded-full" style={{ width: `${v.sharePct}%`, background: sc(v.tone) }} /></span>
                <span className="w-16 shrink-0 text-right font-mono tabular-nums" style={{ color: sc(v.tone) }}>{v.sharePct}% {v.trend === 'rising' ? '↑' : v.trend === 'falling' ? '↓' : '·'}</span>
              </div>
            ))}
          </div>
        </CommandPanel>
      </div>

      <DispatchChannel scope={`health:resline:${id}`} now={now} accent={ACC}
        selfTier="FACILITY" selfName="Research coordination" toTier="MINISTRY"
        title="Research ↔ ethics board & study sites — protocols & findings" />

      <RuntimeQueue scope={`${id}:research`} kind="case" title="Research runtime — receive → sequence → analyse → report" by="Lab Scientist" role={role} withheld={withheld} />
    </div>
  );
}
