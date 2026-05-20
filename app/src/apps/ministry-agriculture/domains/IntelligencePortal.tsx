'use client';

// Agriculture domains — Intelligence, Portal & Oversight surfaces.

import * as React from 'react';
import { agricultureRuralBoard, AGRICULTURE_RURAL_SAFEGUARDS } from '@/lib/gov/agriculture-rural';
import { SeasonalFrame, SeasonalKpi, SeasonalRule, SeasonalCallout, CropRow, AdvisoryRow, AGRICULTURE_DS } from '@/apps/ministry-agriculture/design-system/agriculture-ds';

export function YieldForecast({ id, now }: { id: string; now: number }) {
  const board = agricultureRuralBoard(now);
  void id;
  return (
    <SeasonalFrame archetype="intelligence" code="IN-YLD-22" title="Yield Forecast"
      subtitle="5-year per-crop trajectory">
      <SeasonalKpi items={[
        { label: 'Crops modelled', value: board.intelligence.yieldForecasts.length },
        { label: 'Strong outlook', value: board.intelligence.yieldForecasts.filter(y => y.currentSeasonOutlook === 'strong').length, tone: 'ok' },
        { label: 'Shortfall outlook', value: board.intelligence.yieldForecasts.filter(y => y.currentSeasonOutlook === 'shortfall').length, tone: 'alert' },
        { label: 'AI reasoning', value: `${board.intelligence.aiReasoningCoveragePct}%`, tone: 'info' },
      ]} />
      <SeasonalRule label="trajectories" />
      <div className="grid grid-cols-2 gap-2 text-[11px] md:grid-cols-3">
        {board.intelligence.yieldForecasts.map(y => (
          <div key={y.crop} className="border p-2" style={{ borderColor: AGRICULTURE_DS.rule }}>
            <div className="text-[9px] uppercase tracking-[0.18em]" style={{ color: AGRICULTURE_DS.mut, fontFamily: 'ui-monospace, monospace' }}>{y.crop}</div>
            <div className="text-[13px] font-semibold tabular-nums" style={{ color: y.currentSeasonOutlook === 'strong' ? AGRICULTURE_DS.harvest : y.currentSeasonOutlook === 'shortfall' ? AGRICULTURE_DS.chestnut : AGRICULTURE_DS.wheat }}>{y.currentSeasonOutlook}</div>
            <div className="mt-1 flex items-end gap-1">
              {y.productionTrajectoryMt.map((v, j) => (
                <div key={j} className="flex-1" style={{ height: `${Math.max(2, Math.min(40, v / 2))}px`, background: AGRICULTURE_DS.wheat }} />
              ))}
            </div>
            <div className="mt-1 text-[10px]" style={{ color: AGRICULTURE_DS.mut }}>
              import dep <span style={{ color: AGRICULTURE_DS.chestnut }}>{y.importDependencyPct}%</span>
            </div>
          </div>
        ))}
      </div>
    </SeasonalFrame>
  );
}

export function TradeExposure({ id, now }: { id: string; now: number }) {
  const board = agricultureRuralBoard(now);
  void id;
  return (
    <SeasonalFrame archetype="intelligence" code="IN-TRD-23" title="Trade Exposure"
      subtitle="export / import vulnerability">
      <SeasonalKpi items={[
        { label: 'Counterparty lines', value: board.intelligence.tradeExposure.length },
        { label: 'High-vulnerability', value: board.intelligence.tradeExposure.filter(t => t.vulnerabilityIdx > 65).length, tone: 'alert' },
        { label: 'Imports', value: board.intelligence.tradeExposure.filter(t => t.tradeKind === 'import').length },
        { label: 'Exports', value: board.intelligence.tradeExposure.filter(t => t.tradeKind === 'export').length },
      ]} />
      <SeasonalRule label="exposure ledger" />
      {board.intelligence.tradeExposure.map((t, i) => (
        <div key={`${t.partner}-${t.commodity}-${i}`} className="grid grid-cols-[160px_140px_140px_80px_80px] gap-3 border-b py-1.5 text-[11px]"
          style={{ borderColor: AGRICULTURE_DS.ruleSoft, fontFamily: 'ui-monospace, monospace' }}>
          <span style={{ color: AGRICULTURE_DS.wheat }}>{t.partner}</span>
          <span style={{ color: AGRICULTURE_DS.ink }}>{t.commodity}</span>
          <span style={{ color: AGRICULTURE_DS.mut }}>{t.tradeKind}</span>
          <span className="text-right tabular-nums" style={{ color: AGRICULTURE_DS.mut }}>{t.shareOfPartnerPct}%</span>
          <span className="text-right tabular-nums" style={{ color: t.vulnerabilityIdx > 65 ? AGRICULTURE_DS.chestnut : t.vulnerabilityIdx > 40 ? AGRICULTURE_DS.amber : AGRICULTURE_DS.harvest }}>{t.vulnerabilityIdx}</span>
        </div>
      ))}
    </SeasonalFrame>
  );
}

export function SustainabilityHorizon({ id, now }: { id: string; now: number }) {
  const board = agricultureRuralBoard(now);
  void id;
  return (
    <SeasonalFrame archetype="intelligence" code="IN-SUS-24" title="Sustainability Horizon"
      subtitle={`${board.intelligence.sustainability.horizonYears.join('y / ')}y trajectory`}>
      <SeasonalKpi items={[
        { label: 'Long-horizon resilience', value: `${board.intelligence.sustainability.longHorizonResilienceIdx}/100`, tone: 'ok' },
        { label: 'Systemic agri risk', value: `${board.intelligence.sustainability.systemicAgriRisk}/100`, tone: 'warn' },
        { label: 'AI coverage', value: `${board.intelligence.aiReasoningCoveragePct}%`, tone: 'info' },
        { label: 'Early-warning signals', value: board.intelligence.earlyWarningSignalsActive, tone: 'warn' },
      ]} />
      <SeasonalRule label="multi-horizon trajectories" />
      <div className="grid grid-cols-2 gap-2 text-[11px] md:grid-cols-3">
        {['Soil health', 'Freshwater availability', 'Biodiversity integration', 'Food self-sufficiency', 'Climate migration pressure'].map((label, i) => {
          const series = [board.intelligence.sustainability.soilHealthTrajectory, board.intelligence.sustainability.freshwaterAvailabilityTrajectory, board.intelligence.sustainability.biodiversityIntegrationTrajectory, board.intelligence.sustainability.foodSelfSufficiencyTrajectory, board.intelligence.sustainability.climateMigrationPressureTrajectory][i]!;
          const last = series[series.length - 1] ?? 0;
          const isStress = label === 'Climate migration pressure';
          return (
            <div key={label} className="border p-2" style={{ borderColor: AGRICULTURE_DS.rule }}>
              <div className="text-[9px] uppercase tracking-[0.18em]" style={{ color: AGRICULTURE_DS.mut, fontFamily: 'ui-monospace, monospace' }}>{label}</div>
              <div className="text-[13px] font-semibold tabular-nums" style={{ color: isStress ? AGRICULTURE_DS.amber : AGRICULTURE_DS.harvest }}>{last}</div>
              <div className="mt-1 flex items-end gap-1">
                {series.map((v, j) => (
                  <div key={j} className="flex-1" style={{ height: `${Math.max(2, Math.min(40, v / 2.5))}px`, background: isStress ? AGRICULTURE_DS.amber : AGRICULTURE_DS.harvest }} />
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </SeasonalFrame>
  );
}

export function ScarcityWatch({ id, now }: { id: string; now: number }) {
  const board = agricultureRuralBoard(now);
  void id;
  return (
    <SeasonalFrame archetype="intelligence" code="IN-SCR-25" title="Scarcity Watch"
      subtitle="90-day scarcity early warning">
      <SeasonalKpi items={[
        { label: '90-day probability', value: `${board.intelligence.scarcityProbability90dPct}%`, tone: board.intelligence.scarcityProbability90dPct > 35 ? 'alert' : board.intelligence.scarcityProbability90dPct > 18 ? 'warn' : 'ok' },
        { label: 'Early-warning signals', value: board.intelligence.earlyWarningSignalsActive, tone: 'warn' },
        { label: 'High-risk crops', value: board.intelligence.yieldForecasts.filter(y => y.scarcityRiskIdx > 60).length, tone: 'alert' },
        { label: 'Strategic-reserve health', value: `${Math.round(board.intelligence.yieldForecasts.reduce((s, y) => s + (100 - y.scarcityRiskIdx), 0) / Math.max(1, board.intelligence.yieldForecasts.length))}/100`, tone: 'info' },
      ]} />
      <SeasonalRule label="per-crop scarcity risk" />
      {board.intelligence.yieldForecasts.map(y => (
        <CropRow key={y.crop} crop={y.crop} idx={y.scarcityRiskIdx}
          tone={y.scarcityRiskIdx > 60 ? 'alert' : y.scarcityRiskIdx > 35 ? 'warn' : 'ok'}
          tail={`${y.currentSeasonOutlook}`} />
      ))}
      <SeasonalCallout kicker="early-warning doctrine" body="Scarcity signals trigger automatic Treasury, Trade and Cabinet briefings. Suppression of scarcity intelligence is constitutionally void." />
    </SeasonalFrame>
  );
}

export function ClimateAdvisories({ id, now }: { id: string; now: number }) {
  const board = agricultureRuralBoard(now);
  void id;
  return (
    <SeasonalFrame archetype="portal" code="PR-CLM-27" title="Climate Advisories"
      subtitle="per-region climate advisory feed"
      season={board.season}>
      <SeasonalKpi items={[
        { label: 'Active advisories', value: board.portal.climateAdvisories.length },
        { label: 'Severe', value: board.portal.climateAdvisories.filter(a => a.severity === 'severe').length, tone: 'alert' },
        { label: 'Warning', value: board.portal.climateAdvisories.filter(a => a.severity === 'warning').length, tone: 'warn' },
        { label: 'Portal uptime', value: `${board.portal.portalUptimePct}%`, tone: 'ok' },
      ]} />
      <SeasonalRule label="advisory feed" />
      {board.portal.climateAdvisories.map(a => (
        <AdvisoryRow key={a.id} id={a.id} kind={a.kind} region={a.region}
          severity={a.severity} tail={`${a.daysAhead}d ahead · ${a.cropsAtRisk}`} />
      ))}
    </SeasonalFrame>
  );
}

export function PestAlerts({ id, now }: { id: string; now: number }) {
  const board = agricultureRuralBoard(now);
  void id;
  return (
    <SeasonalFrame archetype="portal" code="PR-PST-28" title="Pest Alerts"
      subtitle="pest outbreak feed">
      <SeasonalKpi items={[
        { label: 'Active alerts', value: board.portal.pestAlerts.length },
        { label: 'Epidemic class', value: board.portal.pestAlerts.filter(p => p.outbreakStatus === 'epidemic').length, tone: 'alert' },
        { label: 'Spreading class', value: board.portal.pestAlerts.filter(p => p.outbreakStatus === 'spreading').length, tone: 'warn' },
        { label: 'Affected area (ha)', value: board.portal.pestAlerts.reduce((s, p) => s + p.affectedAreaHa, 0).toLocaleString() },
      ]} />
      <SeasonalRule label="pest feed" />
      {board.portal.pestAlerts.map(p => (
        <div key={p.id} className="grid grid-cols-[110px_160px_140px_100px_120px] gap-3 border-b py-1.5 text-[11px]"
          style={{ borderColor: AGRICULTURE_DS.ruleSoft, fontFamily: 'ui-monospace, monospace' }}>
          <span style={{ color: AGRICULTURE_DS.wheat }}>{p.id}</span>
          <span style={{ color: AGRICULTURE_DS.ink }}>{p.pest}</span>
          <span style={{ color: AGRICULTURE_DS.mut }}>{p.region}</span>
          <span className="text-right tabular-nums" style={{ color: AGRICULTURE_DS.mut }}>{p.affectedAreaHa.toLocaleString()} ha</span>
          <span className="text-right uppercase tracking-[0.16em]"
            style={{ color: p.outbreakStatus === 'epidemic' ? AGRICULTURE_DS.chestnut : p.outbreakStatus === 'spreading' ? AGRICULTURE_DS.amber : p.outbreakStatus === 'localized' ? AGRICULTURE_DS.sky : AGRICULTURE_DS.harvest }}>● {p.outbreakStatus}</span>
        </div>
      ))}
    </SeasonalFrame>
  );
}

export function IrrigationRequests({ id, now }: { id: string; now: number }) {
  const board = agricultureRuralBoard(now);
  void id;
  return (
    <SeasonalFrame archetype="portal" code="PR-IRR-29" title="Irrigation Requests"
      subtitle="citizen / cooperative water requests">
      <SeasonalKpi items={[
        { label: 'Active requests', value: board.portal.irrigationRequests.length },
        { label: 'Approved', value: board.portal.irrigationRequests.filter(r => r.status === 'approved').length, tone: 'ok' },
        { label: 'Partial / denied', value: board.portal.irrigationRequests.filter(r => r.status === 'partial' || r.status === 'denied').length, tone: 'warn' },
        { label: 'Mean filed (d)', value: Math.round(board.portal.irrigationRequests.reduce((s, r) => s + r.filedDaysAgo, 0) / Math.max(1, board.portal.irrigationRequests.length)) },
      ]} />
      <SeasonalRule label="request docket" />
      {board.portal.irrigationRequests.map(r => (
        <div key={r.id} className="grid grid-cols-[110px_180px_140px_80px_120px] gap-3 border-b py-1.5 text-[11px]"
          style={{ borderColor: AGRICULTURE_DS.ruleSoft, fontFamily: 'ui-monospace, monospace' }}>
          <span style={{ color: AGRICULTURE_DS.wheat }}>{r.id}</span>
          <span style={{ color: AGRICULTURE_DS.ink }}>{r.scheme}</span>
          <span style={{ color: AGRICULTURE_DS.mut }}>{r.region}</span>
          <span className="text-right tabular-nums" style={{ color: AGRICULTURE_DS.mut }}>{r.volumeMcm} Mcm</span>
          <span className="text-right uppercase tracking-[0.16em]"
            style={{ color: r.status === 'denied' ? AGRICULTURE_DS.chestnut : r.status === 'partial' ? AGRICULTURE_DS.amber : r.status === 'approved' ? AGRICULTURE_DS.harvest : AGRICULTURE_DS.sky }}>● {r.status}</span>
        </div>
      ))}
    </SeasonalFrame>
  );
}

export function PermitFlow({ id, now }: { id: string; now: number }) {
  const board = agricultureRuralBoard(now);
  void id;
  return (
    <SeasonalFrame archetype="portal" code="PR-PMT-30" title="Permit Flow"
      subtitle="agriculture permits & throughput">
      <SeasonalKpi items={[
        { label: 'Permit lanes', value: board.portal.permits.length },
        { label: 'Total pending', value: board.portal.permits.reduce((s, p) => s + p.pending, 0).toLocaleString(), tone: 'warn' },
        { label: 'Approved / week', value: board.portal.permits.reduce((s, p) => s + p.approvedThisWeek, 0).toLocaleString(), tone: 'ok' },
        { label: 'Median review (d)', value: Math.round(board.portal.permits.reduce((s, p) => s + p.medianReviewDays, 0) / Math.max(1, board.portal.permits.length)) },
      ]} />
      <SeasonalRule label="permit lanes" />
      {board.portal.permits.map(p => (
        <div key={p.category} className="grid grid-cols-[200px_1fr_80px_80px_80px] gap-3 border-b py-1.5 text-[11px]"
          style={{ borderColor: AGRICULTURE_DS.ruleSoft, fontFamily: 'ui-monospace, monospace' }}>
          <span style={{ color: AGRICULTURE_DS.wheat }}>{p.category}</span>
          <div className="h-1.5 self-center" style={{ background: AGRICULTURE_DS.loamDeep }}>
            <div className="h-full" style={{ width: `${Math.min(100, (p.approvedThisWeek / Math.max(1, p.pending)) * 100)}%`, background: AGRICULTURE_DS.harvest }} />
          </div>
          <span className="text-right tabular-nums" style={{ color: AGRICULTURE_DS.mut }}>{p.pending}</span>
          <span className="text-right tabular-nums" style={{ color: AGRICULTURE_DS.harvest }}>{p.approvedThisWeek}</span>
          <span className="text-right tabular-nums" style={{ color: AGRICULTURE_DS.mut }}>{p.medianReviewDays}d</span>
        </div>
      ))}
    </SeasonalFrame>
  );
}

export function RuralSafeguards({ id, now }: { id: string; now: number }) {
  void id; void now;
  return (
    <SeasonalFrame archetype="oversight" code="OV-SFG-31" title="Rural Safeguards"
      subtitle="AGRICULTURE_RURAL_SAFEGUARDS contract · §17.9">
      <SeasonalKpi items={[
        { label: 'Smallholder protection', value: AGRICULTURE_RURAL_SAFEGUARDS.smallholderProtection ? '✓' : '✗', tone: 'ok' },
        { label: 'Land tenure rights', value: AGRICULTURE_RURAL_SAFEGUARDS.landTenureRights ? '✓' : '✗', tone: 'ok' },
        { label: 'Cooperative autonomy', value: AGRICULTURE_RURAL_SAFEGUARDS.cooperativeAutonomy ? '✓' : '✗', tone: 'ok' },
        { label: 'Right to food', value: AGRICULTURE_RURAL_SAFEGUARDS.rightToFood ? '✓' : '✗', tone: 'ok' },
      ]} />
      <SeasonalRule label="prohibited postures" />
      <ul className="grid grid-cols-1 gap-1 md:grid-cols-2 text-[11px]"
        style={{ color: AGRICULTURE_DS.ink, fontFamily: 'ui-monospace, monospace' }}>
        {AGRICULTURE_RURAL_SAFEGUARDS.prohibited.map(p => (
          <li key={p} className="border-l-2 pl-2" style={{ borderColor: AGRICULTURE_DS.chestnut }}>
            <span style={{ color: AGRICULTURE_DS.chestnut }}>✕</span> {p}
          </li>
        ))}
      </ul>
      <SeasonalCallout kicker="binding contract" body="Every Agriculture surface attests against this contract. Forced land consolidation, subsidy discrimination and extraction of subsistence yields are constitutionally void." />
    </SeasonalFrame>
  );
}

export function SmallholderAudit({ id, now }: { id: string; now: number }) {
  void id; void now;
  return (
    <SeasonalFrame archetype="oversight" code="OV-SMH-32" title="Smallholder Audit"
      subtitle="smallholder protection audit">
      <SeasonalKpi items={[
        { label: 'Forced consolidations', value: 0, tone: 'ok' },
        { label: 'Subsidy discrimination', value: 0, tone: 'ok' },
        { label: 'Suppressed pest alerts', value: 0, tone: 'ok' },
        { label: 'Smallholder share', value: '> 70%', tone: 'ok' },
      ]} />
      <SeasonalCallout kicker="smallholder doctrine" body="The smallholder is the constitutional unit of the agricultural economy. Decisions that displace, dispossess or silence smallholders are reviewable on every appeal pathway." />
    </SeasonalFrame>
  );
}
