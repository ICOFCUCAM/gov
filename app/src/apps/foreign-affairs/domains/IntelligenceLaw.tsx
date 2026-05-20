'use client';

// Foreign Affairs domains — Intelligence, Economic & Law surfaces.

import * as React from 'react';
import { foreignAffairsBoard } from '@/lib/gov/foreign-affairs';
import { foreignAffairsExtendedBoard } from '@/lib/gov/foreign-affairs-extended';
import { ChanceryFrame, DispatchKpi, WorldRule, FOREIGN_DS, ChanceryCallout } from '@/apps/foreign-affairs/design-system/foreign-ds';
import { seed, wave } from '@/lib/telemetry';

export function AnomalyDetection({ id, now }: { id: string; now: number }) {
  const ext = foreignAffairsExtendedBoard(now);
  void id;
  return (
    <ChanceryFrame archetype="intelligence" code="IN-ANM-12" title="Anomaly Detection"
      subtitle="live signal anomalies">
      <DispatchKpi items={[
        { label: 'Anomalies tracked', value: ext.intelligence.anomalies.length },
        { label: 'Critical risk', value: ext.intelligence.anomalies.filter(a => a.riskTier === 'critical').length, tone: 'alert' },
        { label: 'AI reasoning coverage', value: `${ext.intelligence.aiReasoningCoverage}%`, tone: 'info' },
        { label: 'Fusion latency', value: `${ext.intelligence.signalProcessingLatencyMs}ms`, tone: 'ok' },
      ]} />
      <WorldRule label="anomaly register" />
      {ext.intelligence.anomalies.map(a => (
        <div key={a.id} className="grid grid-cols-[110px_180px_1fr_80px_100px] gap-3 border-b py-1.5 text-[11px]"
          style={{ borderColor: FOREIGN_DS.ruleSoft, fontFamily: 'ui-monospace, monospace' }}>
          <span style={{ color: FOREIGN_DS.gold }}>{a.id}</span>
          <span style={{ color: FOREIGN_DS.ink }}>{a.signal}</span>
          <span style={{ color: FOREIGN_DS.mut }}>{a.region}</span>
          <span className="text-right tabular-nums" style={{ color: FOREIGN_DS.mut }}>conf {a.confidence}</span>
          <span className="text-right uppercase tracking-[0.16em]"
            style={{ color: a.riskTier === 'critical' ? FOREIGN_DS.fracture : a.riskTier === 'urgent' ? FOREIGN_DS.fracture : a.riskTier === 'elevated' ? FOREIGN_DS.drift : FOREIGN_DS.alliance }}>● {a.riskTier}</span>
        </div>
      ))}
      <ChanceryCallout kicker="provenance" body="Anomalies are derived from open-source signals and consented intelligence-sharing. Per-citizen foreign targeting is constitutionally prohibited (§4.4)." />
    </ChanceryFrame>
  );
}

export function ConflictProbability({ id, now }: { id: string; now: number }) {
  const ext = foreignAffairsExtendedBoard(now);
  void id;
  return (
    <ChanceryFrame archetype="intelligence" code="IN-CFL-13" title="Conflict Probability"
      subtitle="pair-wise 30-day probability">
      <DispatchKpi items={[
        { label: 'Pairs modelled', value: ext.intelligence.conflictProbabilities.length },
        { label: 'Spiking trajectory', value: ext.intelligence.conflictProbabilities.filter(c => c.trajectory === 'spiking').length, tone: 'alert' },
        { label: 'Rising trajectory', value: ext.intelligence.conflictProbabilities.filter(c => c.trajectory === 'rising').length, tone: 'warn' },
        { label: 'Median probability', value: `${Math.round(ext.intelligence.conflictProbabilities.reduce((s, c) => s + c.probability30dPct, 0) / Math.max(1, ext.intelligence.conflictProbabilities.length))}%` },
      ]} />
      <WorldRule label="conflict matrix" />
      {ext.intelligence.conflictProbabilities.map(c => (
        <div key={c.pair} className="grid grid-cols-[1fr_100px_100px_110px] gap-3 border-b py-1.5 text-[11px]"
          style={{ borderColor: FOREIGN_DS.ruleSoft, fontFamily: 'ui-monospace, monospace' }}>
          <span style={{ color: FOREIGN_DS.ink }}>{c.pair}</span>
          <span className="text-right tabular-nums" style={{ color: c.probability30dPct > 40 ? FOREIGN_DS.fracture : c.probability30dPct > 18 ? FOREIGN_DS.drift : FOREIGN_DS.alliance }}>{c.probability30dPct}%</span>
          <span className="text-right" style={{ color: FOREIGN_DS.mut }}>{c.driver}</span>
          <span className="text-right uppercase tracking-[0.16em]"
            style={{ color: c.trajectory === 'spiking' ? FOREIGN_DS.fracture : c.trajectory === 'rising' ? FOREIGN_DS.drift : c.trajectory === 'cooling' ? FOREIGN_DS.signal : FOREIGN_DS.alliance }}>● {c.trajectory}</span>
        </div>
      ))}
    </ChanceryFrame>
  );
}

export function StrategicDependency({ id, now }: { id: string; now: number }) {
  const ext = foreignAffairsExtendedBoard(now);
  void id;
  return (
    <ChanceryFrame archetype="intelligence" code="IN-DEP-14" title="Strategic Dependency"
      subtitle="critical-resource source exposure">
      <DispatchKpi items={[
        { label: 'Critical exposures', value: ext.intelligence.strategicDependencies.filter(d => d.exposureClass === 'critical').length, tone: 'alert' },
        { label: 'Concentration risks', value: ext.intelligence.strategicDependencies.filter(d => d.exposureClass === 'concentration').length, tone: 'warn' },
        { label: 'Resources tracked', value: ext.intelligence.strategicDependencies.length },
        { label: 'Mean diversification', value: Math.round(ext.intelligence.strategicDependencies.reduce((s, d) => s + d.diversificationIdx, 0) / Math.max(1, ext.intelligence.strategicDependencies.length)) },
      ]} />
      <WorldRule label="dependency ledger" />
      {ext.intelligence.strategicDependencies.map(d => (
        <div key={`${d.resource}-${d.sourcePartner}`} className="grid grid-cols-[140px_1fr_80px_100px_100px] gap-3 border-b py-1.5 text-[11px]"
          style={{ borderColor: FOREIGN_DS.ruleSoft, fontFamily: 'ui-monospace, monospace' }}>
          <span style={{ color: FOREIGN_DS.gold }}>{d.resource}</span>
          <span style={{ color: FOREIGN_DS.ink }}>{d.sourcePartner}</span>
          <span className="text-right tabular-nums" style={{ color: d.dependencyPct > 50 ? FOREIGN_DS.fracture : d.dependencyPct > 25 ? FOREIGN_DS.drift : FOREIGN_DS.alliance }}>{d.dependencyPct}%</span>
          <span className="text-right tabular-nums" style={{ color: FOREIGN_DS.mut }}>div {d.diversificationIdx}</span>
          <span className="text-right uppercase tracking-[0.16em]"
            style={{ color: d.exposureClass === 'critical' ? FOREIGN_DS.fracture : d.exposureClass === 'concentration' ? FOREIGN_DS.drift : d.exposureClass === 'moderate' ? FOREIGN_DS.signal : FOREIGN_DS.alliance }}>● {d.exposureClass}</span>
        </div>
      ))}
    </ChanceryFrame>
  );
}

export function InfluenceSignals({ id, now }: { id: string; now: number }) {
  const ext = foreignAffairsExtendedBoard(now);
  void id;
  return (
    <ChanceryFrame archetype="intelligence" code="IN-INF-15" title="Influence Signals"
      subtitle="inbound / outbound influence net">
      <DispatchKpi items={[
        { label: 'Domains tracked', value: ext.intelligence.influenceSignals.length },
        { label: 'Net positive', value: ext.intelligence.influenceSignals.filter(s => s.netIdx >= 50).length, tone: 'ok' },
        { label: 'Net negative', value: ext.intelligence.influenceSignals.filter(s => s.netIdx < 50).length, tone: 'warn' },
        { label: 'Fusion index', value: `${ext.intelligence.intelligenceFusionIdx}/100`, tone: 'info' },
      ]} />
      <WorldRule label="influence matrix" />
      {ext.intelligence.influenceSignals.map(s => (
        <div key={s.domain} className="grid grid-cols-[200px_1fr_80px_80px_80px] gap-3 border-b py-1.5 text-[11px]"
          style={{ borderColor: FOREIGN_DS.ruleSoft, fontFamily: 'ui-monospace, monospace' }}>
          <span style={{ color: FOREIGN_DS.gold }}>{s.domain}</span>
          <div className="h-1.5 self-center" style={{ background: FOREIGN_DS.navy }}>
            <div className="h-full" style={{ width: `${Math.min(100, s.netIdx)}%`, background: s.netIdx >= 60 ? FOREIGN_DS.alliance : s.netIdx >= 40 ? FOREIGN_DS.gold : FOREIGN_DS.fracture }} />
          </div>
          <span className="text-right tabular-nums" style={{ color: FOREIGN_DS.mut }}>in {s.inboundIdx}</span>
          <span className="text-right tabular-nums" style={{ color: FOREIGN_DS.ink }}>out {s.outboundIdx}</span>
          <span className="text-right tabular-nums" style={{ color: s.netIdx >= 50 ? FOREIGN_DS.alliance : FOREIGN_DS.fracture }}>net {s.netIdx}</span>
        </div>
      ))}
    </ChanceryFrame>
  );
}

export function EconomicDiplomacy({ id, now }: { id: string; now: number }) {
  const board = foreignAffairsBoard(now);
  void id;
  return (
    <ChanceryFrame archetype="economic" code="EC-DIP-16" title="Economic Diplomacy"
      subtitle="trade alignment & bilateral partners">
      <DispatchKpi items={[
        { label: 'Trade alignment', value: `${board.economic.tradeAlignmentIdx}/100`, tone: 'ok' },
        { label: 'Investment continuity', value: `${board.economic.investmentContinuityIdx}/100`, tone: 'info' },
        { label: 'Sanctions exposure', value: `${board.economic.sanctionsExposureIdx}/100`, tone: board.economic.sanctionsExposureIdx > 40 ? 'alert' : 'warn' },
        { label: 'Resource coverage', value: `${board.economic.strategicResourceCoverageIdx}/100`, tone: 'ok' },
      ]} />
      <WorldRule label="bilateral partners (top)" />
      {board.economic.bilateralPartners.slice(0, 12).map(p => (
        <div key={p.partner} className="grid grid-cols-[200px_1fr_100px_100px] gap-3 border-b py-1.5 text-[11px]"
          style={{ borderColor: FOREIGN_DS.ruleSoft, fontFamily: 'ui-monospace, monospace' }}>
          <span style={{ color: FOREIGN_DS.gold }}>{p.partner}</span>
          <div className="h-1.5 self-center" style={{ background: FOREIGN_DS.navy }}>
            <div className="h-full" style={{ width: `${p.alignmentIdx}%`, background: p.alignmentIdx > 65 ? FOREIGN_DS.alliance : p.alignmentIdx > 40 ? FOREIGN_DS.gold : FOREIGN_DS.fracture }} />
          </div>
          <span className="text-right tabular-nums" style={{ color: FOREIGN_DS.mut }}>align {p.alignmentIdx}</span>
          <span className="text-right tabular-nums" style={{ color: FOREIGN_DS.ink }}>{(p.tradeShare * 100).toFixed(1)}%</span>
        </div>
      ))}
    </ChanceryFrame>
  );
}

export function SanctionsExposure({ id, now }: { id: string; now: number }) {
  const ts = now / 4000;
  const lanes = [
    { label: 'Outbound sanctions (we impose)',     code: 'OUT' },
    { label: 'Inbound sanctions (imposed on us)',  code: 'INB' },
    { label: 'Multilateral coordination',          code: 'MUL' },
    { label: 'Humanitarian carve-outs',            code: 'HUM' },
    { label: 'Compliance audits',                  code: 'AUD' },
  ];
  return (
    <ChanceryFrame archetype="economic" code="EC-SAN-17" title="Sanctions Exposure"
      subtitle="bidirectional sanctions board">
      <DispatchKpi items={[
        { label: 'Active sanctions regimes', value: Math.round(wave(`sn:a:${id}`, ts, 4, 32)) },
        { label: 'Inbound exposure (Bn)', value: (wave(`sn:i:${id}`, ts, 0.4, 18)).toFixed(2), tone: 'warn' },
        { label: 'Outbound footprint', value: Math.round(wave(`sn:o:${id}`, ts, 12, 240)) },
        { label: 'Humanitarian carve-outs', value: Math.round(wave(`sn:h:${id}`, ts, 4, 38)), tone: 'ok' },
      ]} />
      <WorldRule label="sanctions lanes" />
      {lanes.map((l, i) => {
        const k = `sn:${id}:${i}`;
        const n = Math.round(wave(`${k}:n`, ts, 4, 38));
        return (
          <div key={l.code} className="grid grid-cols-[80px_1fr_80px] gap-3 border-b py-1.5 text-[11px]"
            style={{ borderColor: FOREIGN_DS.ruleSoft, fontFamily: 'ui-monospace, monospace' }}>
            <span style={{ color: FOREIGN_DS.gold }}>{l.code}</span>
            <span style={{ color: FOREIGN_DS.ink }}>{l.label}</span>
            <span className="text-right tabular-nums" style={{ color: FOREIGN_DS.mut }}>{n}</span>
          </div>
        );
      })}
      <ChanceryCallout kicker="proportionality doctrine" body="Sanctions are proportionate, multilaterally coordinated where possible, and carry mandatory humanitarian carve-outs. Indiscriminate coercion is prohibited." />
    </ChanceryFrame>
  );
}

export function SovereignAssetExposure({ id, now }: { id: string; now: number }) {
  const ts = now / 4000;
  const counterparties = ['Northern Federation', 'Atlantic Union', 'Pacific Realm', 'Indo-Maritime Pact', 'Southern Bloc', 'Polar Initiative'];
  return (
    <ChanceryFrame archetype="economic" code="EC-AST-18" title="Sovereign-Asset Exposure"
      subtitle="counterparty exposure register">
      <DispatchKpi items={[
        { label: 'Counterparties', value: counterparties.length },
        { label: 'Total exposure (Bn)', value: (wave(`as:t:${id}`, ts, 12, 280)).toFixed(1), tone: 'warn' },
        { label: 'Hedged', value: `${Math.round(wave(`as:h:${id}`, ts, 48, 88))}%`, tone: 'ok' },
        { label: 'Frozen-asset disputes', value: Math.round(wave(`as:f:${id}`, ts, 0, 6)), tone: 'mute' },
      ]} />
      <WorldRule label="counterparty register" />
      {counterparties.map((c, i) => {
        const k = `as:${id}:${i}`;
        const exp = Math.round(wave(`${k}:e`, ts, 2, 84));
        const cls = exp > 60 ? 'critical' : exp > 30 ? 'concentration' : 'moderate';
        return (
          <div key={c} className="grid grid-cols-[200px_1fr_80px_100px] gap-3 border-b py-1.5 text-[11px]"
            style={{ borderColor: FOREIGN_DS.ruleSoft, fontFamily: 'ui-monospace, monospace' }}>
            <span style={{ color: FOREIGN_DS.gold }}>{c}</span>
            <div className="h-1.5 self-center" style={{ background: FOREIGN_DS.navy }}>
              <div className="h-full" style={{ width: `${exp}%`, background: cls === 'critical' ? FOREIGN_DS.fracture : cls === 'concentration' ? FOREIGN_DS.drift : FOREIGN_DS.alliance }} />
            </div>
            <span className="text-right tabular-nums" style={{ color: FOREIGN_DS.mut }}>{exp}%</span>
            <span className="text-right uppercase tracking-[0.16em]"
              style={{ color: cls === 'critical' ? FOREIGN_DS.fracture : cls === 'concentration' ? FOREIGN_DS.drift : FOREIGN_DS.alliance }}>● {cls}</span>
          </div>
        );
      })}
    </ChanceryFrame>
  );
}

export function SovereigntyDisputes({ id, now }: { id: string; now: number }) {
  const ext = foreignAffairsExtendedBoard(now);
  void id;
  return (
    <ChanceryFrame archetype="law" code="IL-DIS-20" title="Sovereignty Disputes"
      subtitle="active sovereignty / boundary disputes">
      <DispatchKpi items={[
        { label: 'Active disputes', value: ext.law.disputes.length },
        { label: 'In international court', value: ext.law.disputes.filter(d => d.forum === 'international-court').length },
        { label: 'In arbitration', value: ext.law.disputes.filter(d => d.forum === 'arbitration-tribunal').length },
        { label: 'Sovereignty integrity', value: `${ext.law.sovereigntyIntegrityIdx}/100`, tone: 'ok' },
      ]} />
      <WorldRule label="dispute docket" />
      {ext.law.disputes.map(d => (
        <div key={d.id} className="grid grid-cols-[110px_200px_140px_140px_120px] gap-3 border-b py-1.5 text-[11px]"
          style={{ borderColor: FOREIGN_DS.ruleSoft, fontFamily: 'ui-monospace, monospace' }}>
          <span style={{ color: FOREIGN_DS.gold }}>{d.id}</span>
          <span style={{ color: FOREIGN_DS.ink }}>{d.counterparty}</span>
          <span style={{ color: FOREIGN_DS.mut }}>{d.domain}</span>
          <span style={{ color: FOREIGN_DS.mut }}>{d.forum}</span>
          <span className="text-right uppercase tracking-[0.16em]" style={{ color: FOREIGN_DS.gold }}>● {d.stage}</span>
        </div>
      ))}
    </ChanceryFrame>
  );
}

export function TreatyLegalityBench({ id, now }: { id: string; now: number }) {
  const ext = foreignAffairsExtendedBoard(now);
  void id;
  return (
    <ChanceryFrame archetype="law" code="IL-LEG-21" title="Treaty Legality Bench"
      subtitle="compliance class check">
      <DispatchKpi items={[
        { label: 'Treaties reviewed', value: ext.law.treatyLegality.length },
        { label: 'Compliant', value: ext.law.treatyLegality.filter(t => t.complianceClass === 'compliant').length, tone: 'ok' },
        { label: 'In breach', value: ext.law.treatyLegality.filter(t => t.complianceClass === 'in-breach').length, tone: 'alert' },
        { label: 'Active arbitrations', value: ext.law.activeArbitrationsOurs, tone: 'warn' },
      ]} />
      <WorldRule label="legality docket" />
      {ext.law.treatyLegality.map(t => (
        <div key={t.treatyTitle} className="grid grid-cols-[1fr_100px_100px_100px_100px] gap-3 border-b py-1.5 text-[11px]"
          style={{ borderColor: FOREIGN_DS.ruleSoft, fontFamily: 'ui-monospace, monospace' }}>
          <span style={{ color: FOREIGN_DS.ink }}>{t.treatyTitle}</span>
          <span style={{ color: FOREIGN_DS.mut }}>{t.scope}</span>
          <span className="text-right tabular-nums" style={{ color: FOREIGN_DS.mut }}>{t.outstandingObligations} obl</span>
          <span className="text-right tabular-nums" style={{ color: FOREIGN_DS.mut }}>review {t.nextReviewDays}d</span>
          <span className="text-right uppercase tracking-[0.16em]"
            style={{ color: t.complianceClass === 'in-breach' ? FOREIGN_DS.fracture : t.complianceClass === 'partial' ? FOREIGN_DS.drift : t.complianceClass === 'reservation-filed' ? FOREIGN_DS.signal : FOREIGN_DS.alliance }}>● {t.complianceClass}</span>
        </div>
      ))}
    </ChanceryFrame>
  );
}
