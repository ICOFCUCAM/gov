'use client';

// Sector institution apps — Agriculture, Justice, Interior, Labour, Trade,
// Environment. Engine-driven with executable workflow runtimes. Cinematic
// sovereign command rhythm (shared ops kit).

import * as React from 'react';
import { FieldPanel } from '@/apps/_shared/AppKit';
import { RuntimeQueue } from '@/components/features/RuntimeQueue';
import { agricultureOps } from '@/lib/gov/agriculture-systems';
import { justiceOps } from '@/lib/gov/justice-systems';
import { interiorOps } from '@/lib/gov/interior-systems';
import { laborOps } from '@/lib/gov/labor-systems';
import { tradeOps } from '@/lib/gov/trade-systems';
import { environmentOps } from '@/lib/gov/environment-systems';
import { OpsHeader, KpiStrip, BarPanel } from '@/apps/_shared/Ops';
import { MinistryChainSection, ActorChainStrip } from '@/apps/_shared/InstitutionChain';
import { InteriorCommand } from '@/apps/interior/InteriorCommand';
import { CivilRegistryCommand } from '@/apps/interior/CivilRegistryCommand';
import { PopulationAnalytics } from '@/apps/interior/PopulationAnalytics';
import { PermitsLicensing } from '@/apps/interior/PermitsLicensing';
import { PrisonsCorrections } from '@/apps/justice/PrisonsCorrections';
import { RegionalAdministration } from '@/apps/interior/RegionalAdministration';
import type { Tone } from '@/apps/_shared/SovereignUI';
import type { ArchetypeKey } from '@/lib/api/types';
import type { SovereignRole, Capability } from '@/shared/permissions/rbac';
import type { WorkKind } from '@/lib/gov/runtime-workflow';

const ACC = '#54d08f';
const WF: Record<string, WorkKind> = {
  command: 'incident', regulatory: 'permit', permit: 'permit', citizen: 'approval',
  farmer: 'approval', legalaid: 'case', registries: 'permit', corrections: 'case',
  disputes: 'case', insurance: 'approval', identity: 'permit', border: 'incident',
  licensing: 'permit', registry: 'permit', export: 'procurement', monitoring: 'case',
};
type FocusItem = { l: string; v: string; t?: Tone };
function focusFor(a: ArchetypeKey, d: string, id: string, ts: number): FocusItem[] | null {
  if (a === 'AGRICULTURE') {
    const o = agricultureOps(id, ts);
    if (d === 'crop') return [{ l: 'Food security', v: `${o.foodSecurityIndex}`, t: o.foodSecurityIndex >= 70 ? 'ok' : 'warn' }, { l: 'Pest alerts', v: `${o.pestAlerts}`, t: o.pestAlerts > 8 ? 'alert' : 'warn' }, { l: 'Reserve cover', v: `${o.strategicReserveDays}d`, t: o.strategicReserveDays < 30 ? 'alert' : 'ok' }];
    if (d === 'livestock') return [{ l: 'Livestock health', v: `${o.livestockHealthPct}%`, t: o.livestockHealthPct >= 85 ? 'ok' : 'warn' }, { l: 'Pest/disease alerts', v: `${o.pestAlerts}`, t: o.pestAlerts > 8 ? 'alert' : 'warn' }];
    if (d === 'irrigation') return [{ l: 'Irrigation coverage', v: `${o.irrigationCoveragePct}%`, t: o.irrigationCoveragePct >= 60 ? 'ok' : 'warn' }, { l: 'Reserve cover', v: `${o.strategicReserveDays}d`, t: o.strategicReserveDays < 30 ? 'alert' : 'ok' }];
    if (d === 'farmer') return [{ l: 'Farmers registered', v: `${o.farmersRegisteredM}M`, t: 'ok' }, { l: 'Subsidy disbursed', v: `${o.subsidyDisbursementPct}%`, t: o.subsidyDisbursementPct >= 75 ? 'ok' : 'warn' }];
    if (d === 'market') return [{ l: 'Strategic reserve', v: `${o.strategicReserveDays}d`, t: o.strategicReserveDays < 30 ? 'alert' : 'ok' }, { l: 'Food security', v: `${o.foodSecurityIndex}`, t: o.foodSecurityIndex >= 70 ? 'ok' : 'warn' }];
  } else if (a === 'JUSTICE') {
    const o = justiceOps(id, ts);
    if (d === 'legalaid') return [{ l: 'Aid centres', v: `${o.legalAid.centres}`, t: 'ok' }, { l: 'Represented', v: `${o.legalAid.representedPct}%`, t: o.legalAid.representedPct >= 75 ? 'ok' : 'warn' }, { l: 'Backlog', v: o.legalAid.backlog.toLocaleString(), t: o.legalAid.backlog > 4000 ? 'alert' : 'warn' }];
    if (d === 'corrections') return [{ l: 'Occupancy', v: `${o.corrections.occupancyPct}%`, t: o.corrections.occupancyPct >= 110 ? 'alert' : o.corrections.occupancyPct >= 95 ? 'warn' : 'ok' }, { l: 'Rehab active', v: o.corrections.rehabActive.toLocaleString(), t: 'ok' }];
    if (d === 'registries') return [{ l: 'Records', v: `${o.registries.recordsM}M`, t: 'ok' }, { l: 'Integrity', v: `${o.registries.integrityPct}%`, t: o.registries.integrityPct >= 98 ? 'ok' : 'warn' }, { l: 'Backlog', v: o.registries.backlog.toLocaleString(), t: o.registries.backlog > 2500 ? 'alert' : 'ok' }];
    if (d === 'courts') return [{ l: 'Cases coordinated', v: o.courtLiaison.casesCoordinated.toLocaleString(), t: 'ok' }, { l: 'Transfers pending', v: `${o.courtLiaison.transfersPending}`, t: o.courtLiaison.transfersPending > 500 ? 'alert' : 'ok' }, { l: 'SLA met', v: `${o.courtLiaison.slaMetPct}%`, t: o.courtLiaison.slaMetPct >= 80 ? 'ok' : 'warn' }];
  } else if (a === 'INTERIOR') {
    const o = interiorOps(id, ts);
    if (d === 'identity') return [{ l: 'Enrolled', v: `${o.identity.enrolledM}M`, t: 'ok' }, { l: 'Issuance backlog', v: o.identity.issuanceBacklog.toLocaleString(), t: o.identity.issuanceBacklog > 6000 ? 'alert' : 'warn' }, { l: 'Uptime', v: `${o.identity.uptimePct}%`, t: o.identity.uptimePct >= 99 ? 'ok' : 'warn' }];
    if (d === 'border') return [{ l: 'Posts open', v: `${o.border.open}/${o.border.posts}`, t: o.border.open < o.border.posts ? 'warn' : 'ok' }, { l: 'Flagged entries', v: `${o.border.flaggedEntries}`, t: o.border.flaggedEntries > 90 ? 'alert' : 'warn' }, { l: 'Mean clearance', v: `${o.border.meanClearanceMin}m`, t: o.border.meanClearanceMin >= 30 ? 'alert' : 'ok' }];
    if (d === 'licensing') return [{ l: 'Permits pending', v: o.licensing.pending.toLocaleString(), t: o.licensing.pending > 3500 ? 'alert' : 'warn' }, { l: 'SLA met', v: `${o.licensing.slaMetPct}%`, t: o.licensing.slaMetPct >= 80 ? 'ok' : 'warn' }];
    if (d === 'coordination') return [{ l: 'Cells active', v: `${o.coordination.cellsActive}`, t: 'ok' }, { l: 'Public order', v: `${o.coordination.publicOrderIndex}`, t: o.coordination.publicOrderIndex >= 70 ? 'ok' : 'warn' }, { l: 'Threat level', v: o.internalThreatLevel, t: o.internalThreatLevel === 'high' ? 'alert' : o.internalThreatLevel === 'elevated' ? 'warn' : 'ok' }];
  } else if (a === 'LABOR') {
    const o = laborOps(id, ts);
    if (d === 'employment') return [{ l: 'Unemployment', v: `${o.unemploymentPct}%`, t: o.unemploymentPct >= 16 ? 'alert' : o.unemploymentPct >= 9 ? 'warn' : 'ok' }, { l: 'Placements today', v: o.placementsToday.toLocaleString(), t: 'ok' }, { l: 'Vacancies', v: o.vacancies.toLocaleString(), t: 'ok' }];
    if (d === 'inspection') return [{ l: 'Compliance', v: `${o.inspection.compliancePct}%`, t: o.inspection.compliancePct >= 80 ? 'ok' : 'warn' }, { l: 'Open cases', v: o.inspection.openCases.toLocaleString(), t: o.inspection.openCases > 1500 ? 'alert' : 'ok' }];
    if (d === 'insurance') return [{ l: 'Funds', v: `${o.socialInsurance.fundsBn}bn`, t: 'ok' }, { l: 'Claims pending', v: o.socialInsurance.claimsPending.toLocaleString(), t: o.socialInsurance.claimsPending > 6000 ? 'alert' : 'warn' }, { l: 'Payout on-time', v: `${o.socialInsurance.payoutOnTimePct}%`, t: o.socialInsurance.payoutOnTimePct >= 90 ? 'ok' : 'warn' }];
    if (d === 'disputes') return [{ l: 'Open disputes', v: o.disputes.openDisputes.toLocaleString(), t: o.disputes.openDisputes > 3500 ? 'alert' : 'ok' }, { l: 'Median days', v: `${o.disputes.medianDays}`, t: o.disputes.medianDays >= 120 ? 'alert' : 'warn' }, { l: 'Resolved rate', v: `${o.disputes.resolvedRate}%`, t: o.disputes.resolvedRate >= 75 ? 'ok' : 'warn' }];
  } else if (a === 'TRADE') {
    const o = tradeOps(id, ts);
    if (d === 'registry') return [{ l: 'Active businesses', v: `${o.businessRegistry.activeM}M`, t: 'ok' }, { l: 'Backlog', v: o.businessRegistry.backlog.toLocaleString(), t: o.businessRegistry.backlog > 2800 ? 'alert' : 'ok' }, { l: 'Median days', v: `${o.businessRegistry.medianDays}`, t: o.businessRegistry.medianDays >= 18 ? 'alert' : 'ok' }];
    if (d === 'standards') return [{ l: 'Accredited labs', v: `${o.standards.labs}`, t: 'ok' }, { l: 'Conformity', v: `${o.standards.conformityPct}%`, t: o.standards.conformityPct >= 85 ? 'ok' : 'warn' }, { l: 'Certs pending', v: o.standards.certificationsPending.toLocaleString(), t: o.standards.certificationsPending > 1200 ? 'alert' : 'ok' }];
    if (d === 'export') return [{ l: 'Corridors open', v: `${o.exports.corridorsOpen}/${o.exports.corridorsTotal}`, t: o.exports.corridorsOpen < o.exports.corridorsTotal ? 'warn' : 'ok' }, { l: 'Value index', v: `${o.exports.valueIdx}`, t: o.exports.valueIdx >= 70 ? 'ok' : 'warn' }, { l: 'Clearance days', v: `${o.exports.clearanceDays}`, t: o.exports.clearanceDays >= 12 ? 'alert' : 'ok' }];
    if (d === 'licensing') return [{ l: 'Permits pending', v: o.licensing.pending.toLocaleString(), t: o.licensing.pending > 2500 ? 'alert' : 'ok' }, { l: 'SLA met', v: `${o.licensing.slaMetPct}%`, t: o.licensing.slaMetPct >= 80 ? 'ok' : 'warn' }];
    if (d === 'industry') return [{ l: 'Industrial parks', v: `${o.industrialParks.parks}`, t: 'ok' }, { l: 'Occupancy', v: `${o.industrialParks.occupancyPct}%`, t: o.industrialParks.occupancyPct >= 70 ? 'ok' : 'warn' }, { l: 'Investment idx', v: `${o.industrialParks.investmentIdx}`, t: o.industrialParks.investmentIdx >= 60 ? 'ok' : 'warn' }];
  } else if (a === 'ENVIRONMENT') {
    const o = environmentOps(id, ts);
    if (d === 'monitoring') return [{ l: 'Sensors online', v: `${o.monitoringOnline}/${o.monitoringTotal}`, t: o.monitoringOnline < o.monitoringTotal * 0.85 ? 'warn' : 'ok' }, { l: 'Air quality', v: `${o.airQualityIndex}`, t: o.airQualityIndex >= 120 ? 'alert' : 'warn' }, { l: 'Water quality', v: `${o.waterQualityPct}%`, t: o.waterQualityPct >= 80 ? 'ok' : 'warn' }];
    if (d === 'protected') return [{ l: 'Area integrity', v: `${o.protectedAreaIntegrityPct}%`, t: o.protectedAreaIntegrityPct >= 80 ? 'ok' : 'warn' }, { l: 'Compliance', v: `${o.compliancePct}%`, t: o.compliancePct >= 80 ? 'ok' : 'warn' }];
    if (d === 'permit') return [{ l: 'Permits pending', v: o.permitsPending.toLocaleString(), t: o.permitsPending > 1800 ? 'alert' : 'ok' }, { l: 'Compliance', v: `${o.compliancePct}%`, t: o.compliancePct >= 80 ? 'ok' : 'warn' }];
    if (d === 'climate') return [{ l: 'Emissions vs target', v: `${o.emissionsVsTargetPct}%`, t: o.emissionsVsTargetPct > 115 ? 'alert' : o.emissionsVsTargetPct > 100 ? 'warn' : 'ok' }, { l: 'Protected integrity', v: `${o.protectedAreaIntegrityPct}%`, t: o.protectedAreaIntegrityPct >= 80 ? 'ok' : 'warn' }];
  }
  return null;
}

export function SectorInstitutionApp({ instanceId, archetype, label, domain, now, role, withheld }: {
  instanceId: string; archetype: ArchetypeKey; label: string; domain: string;
  now: number; role: SovereignRole; withheld: Capability[];
}) {
  const id = instanceId; const ts = now / 4000;
  const wf = WF[domain] ?? 'case';
  let items: FocusItem[] = [];
  let bars: { title: string; meta: string; rows: { label: string; pct: number; tone: Tone; tail: string }[] } | null = null;

  if (archetype === 'AGRICULTURE') {
    const o = agricultureOps(id, ts);
    items = [
      { l: 'Food security', v: `${o.foodSecurityIndex}`, t: o.foodSecurityIndex >= 75 ? 'ok' : o.foodSecurityIndex >= 55 ? 'warn' : 'alert' },
      { l: 'Strategic reserve', v: `${o.strategicReserveDays}d`, t: o.strategicReserveDays >= 45 ? 'ok' : o.strategicReserveDays >= 21 ? 'warn' : 'alert' },
      { l: 'Livestock health', v: `${o.livestockHealthPct}%`, t: o.livestockHealthPct >= 85 ? 'ok' : 'warn' },
      { l: 'Irrigation coverage', v: `${o.irrigationCoveragePct}%`, t: o.irrigationCoveragePct >= 60 ? 'ok' : 'warn' },
      { l: 'Pest alerts', v: `${o.pestAlerts}`, t: o.pestAlerts > 8 ? 'alert' : o.pestAlerts ? 'warn' : 'ok' },
      { l: 'Subsidy disbursed', v: `${o.subsidyDisbursementPct}%`, t: o.subsidyDisbursementPct >= 75 ? 'ok' : 'warn' },
    ];
    bars = { title: 'Crop production', meta: 'yield index', rows: o.crops.map(c => ({ label: c.crop, pct: c.yieldIdx, tone: c.tone, tail: `${c.yieldIdx}` })) };
  } else if (archetype === 'JUSTICE') {
    const o = justiceOps(id, ts);
    items = [
      { l: 'Access to justice', v: `${o.accessToJusticeIndex}`, t: o.accessToJusticeIndex >= 75 ? 'ok' : o.accessToJusticeIndex >= 55 ? 'warn' : 'alert' },
      { l: 'Legal-aid represented', v: `${o.legalAid.representedPct}%`, t: o.legalAid.representedPct >= 75 ? 'ok' : 'warn' },
      { l: 'Prison occupancy', v: `${o.corrections.occupancyPct}%`, t: o.corrections.occupancyPct >= 110 ? 'alert' : o.corrections.occupancyPct >= 95 ? 'warn' : 'ok' },
      { l: 'Registry integrity', v: `${o.registries.integrityPct}%`, t: o.registries.integrityPct >= 98 ? 'ok' : 'warn' },
      { l: 'Court-liaison SLA', v: `${o.courtLiaison.slaMetPct}%`, t: o.courtLiaison.slaMetPct >= 80 ? 'ok' : 'warn' },
      { l: 'Transfers pending', v: `${o.courtLiaison.transfersPending}`, t: o.courtLiaison.transfersPending > 500 ? 'warn' : 'ok' },
    ];
  } else if (archetype === 'INTERIOR') {
    const o = interiorOps(id, ts);
    const lt: Tone = o.internalThreatLevel === 'high' ? 'alert' : o.internalThreatLevel === 'elevated' ? 'warn' : 'ok';
    items = [
      { l: 'Identity enrolled', v: `${o.identity.enrolledM}M`, t: 'ok' },
      { l: 'ID issuance backlog', v: o.identity.issuanceBacklog.toLocaleString(), t: o.identity.issuanceBacklog > 5000 ? 'alert' : 'warn' },
      { l: 'Border posts open', v: `${o.border.open}/${o.border.posts}`, t: o.border.open < o.border.posts ? 'warn' : 'ok' },
      { l: 'Flagged entries', v: `${o.border.flaggedEntries}`, t: o.border.flaggedEntries > 80 ? 'alert' : 'warn' },
      { l: 'Public order', v: `${o.coordination.publicOrderIndex}`, t: lt },
      { l: 'Threat level', v: o.internalThreatLevel, t: lt },
    ];
  } else if (archetype === 'LABOR') {
    const o = laborOps(id, ts);
    items = [
      { l: 'Unemployment', v: `${o.unemploymentPct}%`, t: o.unemploymentPct >= 16 ? 'alert' : o.unemploymentPct >= 9 ? 'warn' : 'ok' },
      { l: 'Placements today', v: o.placementsToday.toLocaleString(), t: 'ok' },
      { l: 'Inspection compliance', v: `${o.inspection.compliancePct}%`, t: o.inspection.compliancePct >= 80 ? 'ok' : 'warn' },
      { l: 'Insurance on-time', v: `${o.socialInsurance.payoutOnTimePct}%`, t: o.socialInsurance.payoutOnTimePct >= 90 ? 'ok' : 'warn' },
      { l: 'Open disputes', v: o.disputes.openDisputes.toLocaleString(), t: o.disputes.openDisputes > 3000 ? 'warn' : 'ok' },
      { l: 'Median resolution', v: `${o.disputes.medianDays}d`, t: o.disputes.medianDays >= 90 ? 'alert' : 'warn' },
    ];
  } else if (archetype === 'TRADE') {
    const o = tradeOps(id, ts);
    items = [
      { l: 'Trade balance', v: `${o.tradeBalanceIdx}`, t: o.tradeBalanceIdx >= 70 ? 'ok' : o.tradeBalanceIdx >= 50 ? 'warn' : 'alert' },
      { l: 'Export corridors', v: `${o.exports.corridorsOpen}/${o.exports.corridorsTotal}`, t: o.exports.corridorsOpen < o.exports.corridorsTotal ? 'warn' : 'ok' },
      { l: 'Export clearance', v: `${o.exports.clearanceDays}d`, t: o.exports.clearanceDays >= 10 ? 'alert' : o.exports.clearanceDays >= 5 ? 'warn' : 'ok' },
      { l: 'Businesses active', v: `${o.businessRegistry.activeM}M`, t: 'ok' },
      { l: 'Registration median', v: `${o.businessRegistry.medianDays}d`, t: o.businessRegistry.medianDays >= 14 ? 'warn' : 'ok' },
      { l: 'Standards conformity', v: `${o.standards.conformityPct}%`, t: o.standards.conformityPct >= 85 ? 'ok' : 'warn' },
    ];
  } else {
    const o = environmentOps(id, ts);
    items = [
      { l: 'Air quality index', v: `${o.airQualityIndex}`, t: o.airQualityIndex >= 150 ? 'alert' : o.airQualityIndex >= 100 ? 'warn' : 'ok' },
      { l: 'Water quality', v: `${o.waterQualityPct}%`, t: o.waterQualityPct >= 80 ? 'ok' : 'warn' },
      { l: 'Monitoring online', v: `${o.monitoringOnline}/${o.monitoringTotal}`, t: o.monitoringOnline < o.monitoringTotal * 0.85 ? 'warn' : 'ok' },
      { l: 'Emissions vs target', v: `${o.emissionsVsTargetPct}%`, t: o.emissionsVsTargetPct > 110 ? 'alert' : o.emissionsVsTargetPct > 100 ? 'warn' : 'ok' },
      { l: 'Protected integrity', v: `${o.protectedAreaIntegrityPct}%`, t: o.protectedAreaIntegrityPct >= 75 ? 'ok' : 'warn' },
      { l: 'Compliance', v: `${o.compliancePct}%`, t: o.compliancePct >= 80 ? 'ok' : 'warn' },
    ];
    bars = { title: 'Environmental hazards', meta: 'regional risk', rows: o.hazards.map(h => ({ label: `${h.region} · ${h.kind}`, pct: h.level === 'severe' ? 92 : h.level === 'moderate' ? 58 : 26, tone: (h.level === 'severe' ? 'alert' : h.level === 'moderate' ? 'warn' : 'ok') as Tone, tail: h.level })) };
  }

  const focus = focusFor(archetype, domain, id, ts);
  const shown = (focus ?? items).map((m, i) => ({ l: m.l, v: m.v, t: (m.t ?? 'ok') as Tone, s: '', k: `si${i}` }));
  const pTone: Tone = shown.some(x => x.t === 'alert') ? 'alert' : shown.some(x => x.t === 'warn') ? 'warn' : 'ok';

  // The Ministry of Interior command surface is the dense National Security
  // & Civil Operations ecosystem; other archetypes/domains keep the ops
  // execution rhythm.
  const interiorCmd = archetype === 'INTERIOR' && domain === 'command';
  const interiorReg = archetype === 'INTERIOR' && domain === 'identity';
  const interiorPop = archetype === 'INTERIOR' && domain === 'population';
  const interiorLic = archetype === 'INTERIOR' && domain === 'licensing';
  const justiceCorr = archetype === 'JUSTICE' && domain === 'corrections';
  const interiorReg2 = archetype === 'INTERIOR' && domain === 'coordination';

  return (
    <div className="space-y-2 rounded-[5px] p-2" style={{ background: '#03070f', boxShadow: 'inset 0 0 90px rgba(0,0,0,0.6)' }}>
      {interiorCmd ? (
        <InteriorCommand id={id} now={now} />
      ) : interiorReg ? (
        <CivilRegistryCommand id={id} now={now} />
      ) : interiorPop ? (
        <PopulationAnalytics id={id} now={now} />
      ) : interiorLic ? (
        <PermitsLicensing id={id} now={now} />
      ) : justiceCorr ? (
        <PrisonsCorrections id={id} now={now} />
      ) : interiorReg2 ? (
        <RegionalAdministration id={id} now={now} />
      ) : (
        <>
          <OpsHeader index={1} title={`${label}${focus ? ` · ${domain}` : ''}`} subtitle="Sovereign Institutional Execution"
            posture={pTone === 'alert' ? 'CRITICAL' : pTone === 'warn' ? 'ENGAGED' : 'STABLE'} tone={pTone} now={now} role={role} accent={ACC} />
          <KpiStrip ts={ts} accent={ACC} items={shown} />
          {!focus && bars ? <BarPanel title={bars.title} meta={bars.meta} accent={ACC} live rows={bars.rows} /> : null}
          {(['AGRICULTURE', 'INTERIOR', 'ENVIRONMENT', 'TRANSPORT'] as ArchetypeKey[]).includes(archetype) ? (
            <>
              <FieldPanel instId={id} archetype={archetype} now={now} />
              <RuntimeQueue scope={`${id}:field`} kind="field" title={`${label} field deployment runtime — stage → task → on-scene → cleared`} by="Field Coordinator" role={role} withheld={withheld} />
            </>
          ) : null}
        </>
      )}
      <ActorChainStrip ministryKey={archetype} idKey={id} now={now} accent={ACC} />
      <MinistryChainSection ministryKey={archetype} id={id} now={now} accent={ACC} />
      <RuntimeQueue scope={`${id}:${domain}`} kind={wf} title={`${label} · ${domain} runtime — execute the institutional workflow`} by="Institution Officer" role={role} withheld={withheld} />
    </div>
  );
}
