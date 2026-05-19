'use client';

// Interior Geopolitical Continuity — Global Economic Shock + Diplomatic
// & Strategic-Information resilience (institutional/factual only).

import * as React from 'react';
import { geopoliticalBoard } from '@/lib/gov/geopolitical-continuity';

const G = (v: number) => v >= 62 ? 'rgb(var(--c-ok))' : v >= 45 ? 'rgb(var(--c-warn))' : 'rgb(var(--c-alert))';
const BAD = (v: number) => v >= 60 ? 'rgb(var(--c-alert))' : v >= 40 ? 'rgb(var(--c-warn))' : 'rgb(var(--c-ok))';

export function GlobalShockIntelligence({ id, now }: { id: string; now: number }) {
  void id;
  const b = geopoliticalBoard(now);
  const g = b.globalShock; const d = b.diplomacy; const s = b.strategicInformation;
  const Row = ({ l, v, good }: { l: string; v: number; good: boolean }) => (
    <div className="flex items-center gap-2 border-b border-line/60 px-2 py-1.5 text-[10px] last:border-0">
      <span className="w-56 shrink-0 text-ink">{l}</span>
      <span className="relative h-2 min-w-0 flex-1 bg-surface-2"><span className="absolute inset-y-0 left-0" style={{ width: `${v}%`, background: good ? G(v) : BAD(v) }} /></span>
      <span className="w-10 shrink-0 text-right tabular-nums" style={{ color: good ? G(v) : BAD(v) }}>{v}</span>
    </div>
  );
  return (
    <div className="space-y-2 font-mono">
      <div>
        <div className="px-1 py-1 text-[9px] font-semibold uppercase tracking-[0.2em] text-ink-soft">▌Global economic-shock transmission</div>
        <div className="border border-line">
          <Row l="Commodity instability" v={g.commodityInstability} good={false} />
          <Row l="Supply-chain disruption" v={g.supplyChainDisruption} good={false} />
          <Row l="Inflation pressure" v={g.inflationPressure} good={false} />
          <Row l="Import dependence" v={g.importDependence} good={false} />
          <Row l="Trade-route fragility" v={g.tradeRouteFragility} good={false} />
          <Row l="Resulting institutional strain" v={g.institutionalStrain} good={false} />
        </div>
      </div>
      <div>
        <div className="px-1 py-1 text-[9px] font-semibold uppercase tracking-[0.2em] text-ink-soft">▌Diplomatic & alliance continuity</div>
        <div className="border border-line">
          <Row l="Regional coordination" v={d.regionalCoordination} good />
          <Row l="Alliance stability" v={d.allianceStability} good />
          <Row l="Emergency cooperation" v={d.emergencyCooperation} good />
          <Row l="Partnership resilience" v={d.partnershipResilience} good />
          <Row l="Isolation pressure" v={d.isolationPressure} good={false} />
        </div>
      </div>
      <div>
        <div className="px-1 py-1 text-[9px] font-semibold uppercase tracking-[0.2em] text-ink-soft">▌Strategic-information resilience — institutional / factual only</div>
        <div className="border border-line">
          <Row l="Communication resilience" v={s.communicationResilience} good />
          <Row l="Crisis-information continuity" v={s.crisisInfoContinuity} good />
          <Row l="Diplomatic clarity" v={s.diplomaticClarity} good />
          <Row l="Misinformation pressure" v={s.misinformationPressure} good={false} />
        </div>
      </div>
      <p className="text-[9px] text-ink-muted">
        The runtime preserves sovereign continuity under global instability through lawful cooperation and factual
        continuity — it never conducts influence operations, propaganda or external targeting.
      </p>
    </div>
  );
}
