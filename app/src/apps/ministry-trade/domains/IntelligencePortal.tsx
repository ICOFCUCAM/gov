'use client';

// Trade domains — Intelligence, Portal & Oversight surfaces.

import * as React from 'react';
import { industrialContinuityBoard, INDUSTRIAL_CONTINUITY_SAFEGUARDS } from '@/lib/gov/industrial-continuity';
import { tradeOps } from '@/lib/gov/trade-systems';
import { CorridorFrame, CorridorKpi, CorridorRule, TradeBar, CorridorCallout, TRADE_DS } from '@/apps/ministry-trade/design-system/trade-ds';

export function OutputTrajectory({ id, now }: { id: string; now: number }) {
  const board = industrialContinuityBoard(now);
  void id;
  return (
    <CorridorFrame archetype="intelligence" code="IN-OUT-23" title="Output Trajectory"
      subtitle={`${board.forecast.horizonYears.join('y / ')}y industrial-output arc`}>
      <CorridorKpi items={[
        { label: 'Survivability idx', value: `${board.forecast.industrialSurvivabilityIdx}/100`, tone: 'ok' },
        { label: 'Generational competitiveness', value: `${board.forecast.generationalCompetitivenessIdx}/100`, tone: 'info' },
        { label: 'Systemic risk', value: `${board.forecast.systemicEconomicRisk}/100`, tone: 'warn' },
        { label: 'Horizons', value: board.forecast.horizonYears.length },
      ]} />
      <CorridorRule label="multi-horizon trajectories" />
      <div className="grid grid-cols-2 gap-2 text-[11px] md:grid-cols-3">
        {['Industrial output', 'Export capacity', 'Manufacturing capacity', 'Strategic autonomy'].map((label, i) => {
          const series = [board.forecast.industrialOutputTrajectory, board.forecast.exportCapacityTrajectory, board.forecast.manufacturingCapacityTrajectory, board.forecast.strategicAutonomyTrajectory][i]!;
          const last = series[series.length - 1] ?? 0;
          return (
            <div key={label} className="border p-2" style={{ borderColor: TRADE_DS.rule }}>
              <div className="text-[9px] uppercase tracking-[0.18em]" style={{ color: TRADE_DS.mut, fontFamily: 'ui-monospace, monospace' }}>{label}</div>
              <div className="text-[13px] font-semibold tabular-nums" style={{ color: TRADE_DS.brass }}>{last}</div>
              <div className="mt-1 flex items-end gap-1">
                {series.map((v, j) => (
                  <div key={j} className="flex-1" style={{ height: `${Math.max(2, Math.min(40, Math.abs(v) / 3))}px`, background: TRADE_DS.brass }} />
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </CorridorFrame>
  );
}

export function AutonomyTrajectory({ id, now }: { id: string; now: number }) {
  const board = industrialContinuityBoard(now);
  void id;
  return (
    <CorridorFrame archetype="intelligence" code="IN-AUT-24" title="Strategic Autonomy"
      subtitle="sovereign autonomy index trajectory">
      <CorridorKpi items={[
        { label: 'Current autonomy', value: board.forecast.strategicAutonomyTrajectory[0] ?? 0, tone: 'info' },
        { label: '25y autonomy', value: board.forecast.strategicAutonomyTrajectory[board.forecast.strategicAutonomyTrajectory.length - 1] ?? 0, tone: 'ok' },
        { label: 'Generational competitiveness', value: `${board.forecast.generationalCompetitivenessIdx}/100`, tone: 'info' },
        { label: 'Strategic prioritisation', value: `${board.command.strategicPrioritisationIdx}/100`, tone: 'ok' },
      ]} />
      <CorridorCallout kicker="autonomy doctrine" body="Strategic autonomy is a multi-generational commitment. Trajectories that decline are reviewable; reversals require Cabinet justification." />
    </CorridorFrame>
  );
}

export function CompetitivenessBoard({ id, now }: { id: string; now: number }) {
  const board = industrialContinuityBoard(now);
  const o = tradeOps(id, now / 4000);
  return (
    <CorridorFrame archetype="intelligence" code="IN-COM-25" title="Competitiveness Board"
      subtitle="generational competitiveness">
      <CorridorKpi items={[
        { label: 'Generational competitiveness', value: `${board.forecast.generationalCompetitivenessIdx}/100`, tone: 'ok' },
        { label: 'Trade-balance idx', value: `${o.tradeBalanceIdx}/100`, tone: 'info' },
        { label: 'Industrial parks investment', value: `${o.industrialParks.investmentIdx}`, tone: 'info' },
        { label: 'Industrial survivability', value: `${board.forecast.industrialSurvivabilityIdx}/100`, tone: 'ok' },
      ]} />
      <CorridorRule label="ministries engaged in industrial continuity" />
      {board.ministriesEngaged.map(m => (
        <div key={m.ministry} className="grid grid-cols-[160px_1fr_60px] gap-3 border-b py-1.5 text-[11px]"
          style={{ borderColor: TRADE_DS.ruleSoft, fontFamily: 'ui-monospace, monospace' }}>
          <span style={{ color: TRADE_DS.brass }}>{m.ministry}</span>
          <span style={{ color: TRADE_DS.mut }}>industrial engagement</span>
          <span className="text-right tabular-nums" style={{ color: TRADE_DS.ink }}>{m.engaged}</span>
        </div>
      ))}
    </CorridorFrame>
  );
}

export function BusinessRegistry({ id, now }: { id: string; now: number }) {
  const o = tradeOps(id, now / 4000);
  return (
    <CorridorFrame archetype="portal" code="PR-BRG-26" title="Business Registry"
      subtitle="registration backlog & cycle">
      <CorridorKpi items={[
        { label: 'Active businesses', value: `${o.businessRegistry.activeM.toFixed(1)} M`, tone: 'info' },
        { label: 'New today', value: o.businessRegistry.newToday.toLocaleString(), tone: 'ok' },
        { label: 'Backlog', value: o.businessRegistry.backlog.toLocaleString(), tone: o.businessRegistry.backlog > 2500 ? 'alert' : 'warn' },
        { label: 'Median (days)', value: o.businessRegistry.medianDays, tone: o.businessRegistry.medianDays > 14 ? 'alert' : 'ok' },
      ]} />
      <CorridorCallout kicker="registration doctrine" body="Business registration is a sovereign service. SLA breaches are reviewable; arbitrary refusals are constitutionally void." />
    </CorridorFrame>
  );
}

export function StandardsPortal({ id, now }: { id: string; now: number }) {
  const o = tradeOps(id, now / 4000);
  return (
    <CorridorFrame archetype="portal" code="PR-STD-27" title="Standards Portal"
      subtitle="accredited labs & conformity">
      <CorridorKpi items={[
        { label: 'Accredited labs', value: o.standards.labs },
        { label: 'Conformity', value: `${o.standards.conformityPct}%`, tone: 'ok' },
        { label: 'Certifications pending', value: o.standards.certificationsPending.toLocaleString(), tone: o.standards.certificationsPending > 1000 ? 'alert' : 'warn' },
        { label: 'SLA met', value: `${o.licensing.slaMetPct}%`, tone: 'info' },
      ]} />
    </CorridorFrame>
  );
}

export function LicensingPermits({ id, now }: { id: string; now: number }) {
  const o = tradeOps(id, now / 4000);
  return (
    <CorridorFrame archetype="portal" code="PR-LIC-28" title="Licensing Permits"
      subtitle="permit pending & SLA">
      <CorridorKpi items={[
        { label: 'Pending', value: o.licensing.pending.toLocaleString(), tone: o.licensing.pending > 2500 ? 'alert' : 'warn' },
        { label: 'Issued today', value: o.licensing.issuedToday.toLocaleString(), tone: 'ok' },
        { label: 'SLA met', value: `${o.licensing.slaMetPct}%`, tone: 'info' },
        { label: 'Industrial parks', value: o.industrialParks.parks, tone: 'info' },
      ]} />
    </CorridorFrame>
  );
}

export function ExportCertification({ id, now }: { id: string; now: number }) {
  const o = tradeOps(id, now / 4000);
  return (
    <CorridorFrame archetype="portal" code="PR-EXP-29" title="Export Certification"
      subtitle="export certification pipeline">
      <CorridorKpi items={[
        { label: 'Corridors open', value: `${o.exports.corridorsOpen}/${o.exports.corridorsTotal}`, tone: o.exports.corridorsOpen < o.exports.corridorsTotal ? 'warn' : 'ok' },
        { label: 'Value idx', value: `${o.exports.valueIdx}`, tone: 'info' },
        { label: 'Clearance (days)', value: o.exports.clearanceDays, tone: o.exports.clearanceDays > 10 ? 'alert' : 'ok' },
        { label: 'Conformity', value: `${o.standards.conformityPct}%`, tone: 'ok' },
      ]} />
      <CorridorCallout kicker="non-discriminatory access" body="Export certification is non-discriminatory. Arbitrary refusal or favouritism is reviewable on every appeal pathway." />
    </CorridorFrame>
  );
}

export function IndustrialSafeguards({ id, now }: { id: string; now: number }) {
  void id; void now;
  return (
    <CorridorFrame archetype="oversight" code="OV-SFG-30" title="Industrial Safeguards"
      subtitle="INDUSTRIAL_CONTINUITY_SAFEGUARDS contract · §21.10">
      <CorridorKpi items={[
        { label: 'Strategic-reserve protection', value: INDUSTRIAL_CONTINUITY_SAFEGUARDS.strategicReserveProtection ? '✓' : '✗', tone: 'ok' },
        { label: 'Non-discriminatory access', value: INDUSTRIAL_CONTINUITY_SAFEGUARDS.nonDiscriminatoryMarketAccess ? '✓' : '✗', tone: 'ok' },
        { label: 'Worker protection on closure', value: INDUSTRIAL_CONTINUITY_SAFEGUARDS.workerProtectionDuringClosure ? '✓' : '✗', tone: 'ok' },
        { label: 'Transparent tender / licensing', value: INDUSTRIAL_CONTINUITY_SAFEGUARDS.transparentTenderAndLicensing ? '✓' : '✗', tone: 'ok' },
      ]} />
      <CorridorRule label="prohibited postures" />
      <ul className="grid grid-cols-1 gap-1 md:grid-cols-2 text-[11px]"
        style={{ color: TRADE_DS.ink, fontFamily: 'ui-monospace, monospace' }}>
        {INDUSTRIAL_CONTINUITY_SAFEGUARDS.prohibited.map(p => (
          <li key={p} className="border-l-2 pl-2" style={{ borderColor: TRADE_DS.coral }}>
            <span style={{ color: TRADE_DS.coral }}>✕</span> {p}
          </li>
        ))}
      </ul>
      <CorridorCallout kicker="binding contract" body="Every Trade surface attests against this contract. Cartel toleration, arbitrary export bans and concealment of supply-chain vulnerability are constitutionally void." />
    </CorridorFrame>
  );
}

export function TransparentTenderAudit({ id, now }: { id: string; now: number }) {
  void id; void now;
  return (
    <CorridorFrame archetype="oversight" code="OV-TND-31" title="Transparent Tender Audit"
      subtitle="tender & licensing transparency">
      <CorridorKpi items={[
        { label: 'Non-tender awards', value: 0, tone: 'ok' },
        { label: 'Arbitrary refusals', value: 0, tone: 'ok' },
        { label: 'Cartel reports YTD', value: 0, tone: 'ok' },
        { label: 'Transparency index', value: '99/100', tone: 'ok' },
      ]} />
      <CorridorCallout kicker="audit doctrine" body="Every licensing decision is logged with rationale. Patterns of refusal that disproportionately affect specific operators trigger civilian-panel review." />
    </CorridorFrame>
  );
}
