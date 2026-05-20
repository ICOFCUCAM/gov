'use client';

import * as React from 'react';
import { justiceContinuityBoard } from '@/lib/gov/justice-continuity';
import { DocketFrame, ChamberRule, JUSTICE_DS } from '@/apps/ministry-justice/design-system/justice-ds';

// ⚖ III — Appellate routing map. A 5-tier ladder showing how cases
// escalate from magistrates → high → appellate → supreme → constitutional,
// with the live throughput at each tier.

const TIER_ORDER = ['Magistrates', 'High', 'Appellate', 'Supreme', 'Constitutional'] as const;

export function AppellateRouting({ id, now }: { id: string; now: number }) {
  void id;
  const b = justiceContinuityBoard(now);
  const byTier = TIER_ORDER.map(tier => ({
    tier,
    courts: b.courts.filter(c => c.tier === tier),
    pending: b.courts.filter(c => c.tier === tier).reduce((s, c) => s + c.pendingCases, 0),
    medianDays: Math.round(b.courts.filter(c => c.tier === tier).reduce((s, c) => s + c.medianDispositionDays, 0) / Math.max(1, b.courts.filter(c => c.tier === tier).length)),
  }));
  const maxPending = Math.max(...byTier.map(t => t.pending), 1);
  return (
    <DocketFrame archetype="bench" numeral="⚖ III" title="Appellate routing ladder" subtitle="case escalation across 5 tiers">
      <div className="space-y-3">
        {byTier.map((t, i) => (
          <div key={t.tier} className="grid grid-cols-[140px_1fr_120px_120px_100px] items-center gap-4 border-b py-2.5" style={{ borderColor: JUSTICE_DS.ruleSoft }}>
            <div>
              <div className="text-[12px]" style={{ color: JUSTICE_DS.ivory }}>{t.tier}</div>
              <div className="text-[9.5px] italic" style={{ color: JUSTICE_DS.mut }}>{t.courts.length} bench{t.courts.length === 1 ? '' : 'es'}</div>
            </div>
            <div className="relative h-2" style={{ background: JUSTICE_DS.charcoalDeep }}>
              <div className="h-full" style={{ width: `${(t.pending / maxPending) * 100}%`, background: `linear-gradient(90deg, ${JUSTICE_DS.bronze}66 0%, ${JUSTICE_DS.bronze} 100%)` }} />
              {/* arrow up to next tier */}
              {i < byTier.length - 1 ? <span className="absolute right-0 top-1/2 -translate-y-1/2 -translate-x-1 text-[12px]" style={{ color: JUSTICE_DS.bronze }}>↑</span> : null}
            </div>
            <span className="text-right tabular-nums text-[12px]" style={{ color: JUSTICE_DS.ivory }}>{t.pending.toLocaleString()}</span>
            <span className="text-right tabular-nums text-[10px]" style={{ color: t.medianDays >= 360 ? JUSTICE_DS.burgundy : t.medianDays >= 180 ? JUSTICE_DS.bronze : JUSTICE_DS.navy }}>{t.medianDays}d median</span>
            <span className="text-right text-[9.5px] uppercase italic tracking-[0.22em]" style={{ color: JUSTICE_DS.bronze }}>tier {i + 1}/5</span>
          </div>
        ))}
      </div>
      <ChamberRule label="ladder doctrine" />
      <div className="text-[11px] italic" style={{ color: JUSTICE_DS.mut }}>
        Cases originate at the magistrates tier and may rise on appeal. Constitutional questions skip to the apex
        bench. The ladder is monotonic — no court may hear a matter below its assigned tier.
      </div>
    </DocketFrame>
  );
}
