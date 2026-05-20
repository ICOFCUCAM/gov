'use client';

// Sector institution apps — Agriculture, Justice, Interior, Labour, Trade,
// Environment. Engine-driven with executable workflow runtimes. Cinematic
// sovereign command rhythm (shared ops kit).

import * as React from 'react';
import { FieldPanel } from '@/apps/_shared/AppKit';
import { RuntimeQueue } from '@/components/features/RuntimeQueue';
import { agricultureOps } from '@/lib/gov/agriculture-systems';
import { justiceOps } from '@/lib/gov/justice-systems';
import { laborOps } from '@/lib/gov/labor-systems';
import { tradeOps } from '@/lib/gov/trade-systems';
import { environmentOps } from '@/lib/gov/environment-systems';
import { OpsHeader, KpiStrip, BarPanel } from '@/apps/_shared/Ops';
import { MinistryChainSection, ActorChainStrip } from '@/apps/_shared/InstitutionChain';
import { PrisonsCorrections } from '@/apps/justice/PrisonsCorrections';
import { ConstitutionalReviewChamber } from '@/apps/ministry-justice/ConstitutionalReviewChamber';
import { JudicialOperationsRoster } from '@/apps/ministry-justice/JudicialOperationsRoster';
import { RightsAdministrativeReview } from '@/apps/ministry-justice/RightsAdministrativeReview';
import { JusticeContinuityForesight } from '@/apps/ministry-justice/JusticeContinuityForesight';
import { LegalRecordsContinuity } from '@/apps/ministry-justice/LegalRecordsContinuity';
import { ForensicEvidenceCoordination } from '@/apps/ministry-justice/ForensicEvidenceCoordination';
import { PublicJusticePortal } from '@/apps/ministry-justice/PublicJusticePortal';
import { NationalIndustrialCommand } from '@/apps/ministry-trade/NationalIndustrialCommand';
import { TradeCorridorsExports } from '@/apps/ministry-trade/TradeCorridorsExports';
import { SupplyChainCommerce } from '@/apps/ministry-trade/SupplyChainCommerce';
import { EconomicForesightCrisis } from '@/apps/ministry-trade/EconomicForesightCrisis';
import { PlanetaryClimateResilience } from '@/apps/ministry-environment/PlanetaryClimateResilience';
import { BiosphereRestorationAtlas } from '@/apps/ministry-environment/BiosphereRestorationAtlas';
import { AtmosphericHydrologicalSystems } from '@/apps/ministry-environment/AtmosphericHydrologicalSystems';
import { EcologicalForesightCrisis } from '@/apps/ministry-environment/EcologicalForesightCrisis';
import { NaturalResourceGovernance } from '@/apps/ministry-environment/NaturalResourceGovernance';
import { EnergyEcologicalCoupling } from '@/apps/ministry-environment/EnergyEcologicalCoupling';
import { PublicEnvironmentPortal } from '@/apps/ministry-environment/PublicEnvironmentPortal';
import { NationalWorkforceCommand } from '@/apps/ministry-labour/NationalWorkforceCommand';
import { SocialProtectionSystems } from '@/apps/ministry-labour/SocialProtectionSystems';
import { DemographicLaborAnalytics } from '@/apps/ministry-labour/DemographicLaborAnalytics';
import { SocialContinuityCrisis } from '@/apps/ministry-labour/SocialContinuityCrisis';
import { LabourEmergencyRecovery } from '@/apps/ministry-labour/LabourEmergencyRecovery';
import { WorkplaceSafetyRights } from '@/apps/ministry-labour/WorkplaceSafetyRights';
import { PublicLabourPortal } from '@/apps/ministry-labour/PublicLabourPortal';
import { FoodContinuityCommand } from '@/apps/ministry-agriculture/FoodContinuityCommand';
import { HarvestProductionField } from '@/apps/ministry-agriculture/HarvestProductionField';
import { WaterClimateInfrastructure } from '@/apps/ministry-agriculture/WaterClimateInfrastructure';
import { FoodContinuityResponse } from '@/apps/ministry-agriculture/FoodContinuityResponse';
import { RuralGovernanceCommunityStability } from '@/apps/ministry-agriculture/RuralGovernanceCommunityStability';
import { AgriculturalIntelligenceForecasting } from '@/apps/ministry-agriculture/AgriculturalIntelligenceForecasting';
import { PublicAgriculturePortal } from '@/apps/ministry-agriculture/PublicAgriculturePortal';
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
  'constitutional-review': 'incident', 'judicial-operations': 'case',
  'rights-administrative': 'incident', 'justice-foresight': 'incident',
  'legal-records': 'permit', 'forensic-evidence': 'case', 'justice-portal': 'approval',
  'industrial-command': 'incident', 'trade-corridors': 'procurement',
  'supply-chain': 'procurement', 'economic-foresight': 'incident',
  'planetary-resilience': 'incident', 'biosphere-restoration': 'case',
  'atmospheric-hydrology': 'incident', 'ecological-foresight': 'incident',
  'resource-governance': 'permit', 'energy-ecological': 'incident',
  'environment-portal': 'approval',
  'workforce-command': 'incident', 'social-protection': 'approval',
  'demographic-analytics': 'case', 'social-continuity': 'incident',
  'labour-recovery': 'incident', 'workplace-rights': 'case', 'labour-portal': 'approval',
  'rural-governance': 'case', 'agri-intelligence': 'incident', 'agri-portal': 'approval',
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
  const justiceCorr = archetype === 'JUSTICE' && domain === 'corrections';
  const justiceConstReview = archetype === 'JUSTICE' && domain === 'constitutional-review';
  const justiceJudOps = archetype === 'JUSTICE' && domain === 'judicial-operations';
  const justiceRights = archetype === 'JUSTICE' && domain === 'rights-administrative';
  const justiceForesight = archetype === 'JUSTICE' && domain === 'justice-foresight';
  const justiceRecords = archetype === 'JUSTICE' && domain === 'legal-records';
  const justiceForensic = archetype === 'JUSTICE' && domain === 'forensic-evidence';
  const justicePortal = archetype === 'JUSTICE' && domain === 'justice-portal';
  const tradeIndCmd = archetype === 'TRADE' && domain === 'industrial-command';
  const tradeCorridors = archetype === 'TRADE' && domain === 'trade-corridors';
  const tradeSupply = archetype === 'TRADE' && domain === 'supply-chain';
  const tradeForesight = archetype === 'TRADE' && domain === 'economic-foresight';
  const envPlanetary = archetype === 'ENVIRONMENT' && domain === 'planetary-resilience';
  const envBiosphere = archetype === 'ENVIRONMENT' && domain === 'biosphere-restoration';
  const envAtmos = archetype === 'ENVIRONMENT' && domain === 'atmospheric-hydrology';
  const envForesight = archetype === 'ENVIRONMENT' && domain === 'ecological-foresight';
  const envResource = archetype === 'ENVIRONMENT' && domain === 'resource-governance';
  const envEnergyEco = archetype === 'ENVIRONMENT' && domain === 'energy-ecological';
  const envPortal = archetype === 'ENVIRONMENT' && domain === 'environment-portal';
  const lbrWorkforce = archetype === 'LABOR' && domain === 'workforce-command';
  const lbrSocial = archetype === 'LABOR' && domain === 'social-protection';
  const lbrDemo = archetype === 'LABOR' && domain === 'demographic-analytics';
  const lbrCrisis = archetype === 'LABOR' && domain === 'social-continuity';
  const lbrRecovery = archetype === 'LABOR' && domain === 'labour-recovery';
  const lbrRights = archetype === 'LABOR' && domain === 'workplace-rights';
  const lbrPortal = archetype === 'LABOR' && domain === 'labour-portal';
  const agriFood = archetype === 'AGRICULTURE' && domain === 'food-continuity';
  const agriProd = archetype === 'AGRICULTURE' && domain === 'harvest-production';
  const agriWater = archetype === 'AGRICULTURE' && domain === 'water-climate';
  const agriResp = archetype === 'AGRICULTURE' && domain === 'food-response';
  const agriRural = archetype === 'AGRICULTURE' && domain === 'rural-governance';
  const agriIntel = archetype === 'AGRICULTURE' && domain === 'agri-intelligence';
  const agriPortal = archetype === 'AGRICULTURE' && domain === 'agri-portal';

  return (
    <div className="space-y-2 rounded-[5px] p-2" style={{ background: '#03070f', boxShadow: 'inset 0 0 90px rgba(0,0,0,0.6)' }}>
      {justiceCorr ? (
        <PrisonsCorrections id={id} now={now} />
      ) : justiceConstReview ? (
        <ConstitutionalReviewChamber id={id} now={now} />
      ) : justiceJudOps ? (
        <JudicialOperationsRoster id={id} now={now} />
      ) : justiceRights ? (
        <RightsAdministrativeReview id={id} now={now} />
      ) : justiceForesight ? (
        <JusticeContinuityForesight id={id} now={now} />
      ) : justiceRecords ? (
        <LegalRecordsContinuity id={id} now={now} />
      ) : justiceForensic ? (
        <ForensicEvidenceCoordination id={id} now={now} />
      ) : justicePortal ? (
        <PublicJusticePortal id={id} now={now} />
      ) : tradeIndCmd ? (
        <NationalIndustrialCommand id={id} now={now} />
      ) : tradeCorridors ? (
        <TradeCorridorsExports id={id} now={now} />
      ) : tradeSupply ? (
        <SupplyChainCommerce id={id} now={now} />
      ) : tradeForesight ? (
        <EconomicForesightCrisis id={id} now={now} />
      ) : envPlanetary ? (
        <PlanetaryClimateResilience id={id} now={now} />
      ) : envBiosphere ? (
        <BiosphereRestorationAtlas id={id} now={now} />
      ) : envAtmos ? (
        <AtmosphericHydrologicalSystems id={id} now={now} />
      ) : envForesight ? (
        <EcologicalForesightCrisis id={id} now={now} />
      ) : envResource ? (
        <NaturalResourceGovernance id={id} now={now} />
      ) : envEnergyEco ? (
        <EnergyEcologicalCoupling id={id} now={now} />
      ) : envPortal ? (
        <PublicEnvironmentPortal id={id} now={now} />
      ) : lbrWorkforce ? (
        <NationalWorkforceCommand id={id} now={now} />
      ) : lbrSocial ? (
        <SocialProtectionSystems id={id} now={now} />
      ) : lbrDemo ? (
        <DemographicLaborAnalytics id={id} now={now} />
      ) : lbrCrisis ? (
        <SocialContinuityCrisis id={id} now={now} />
      ) : lbrRecovery ? (
        <LabourEmergencyRecovery id={id} now={now} />
      ) : lbrRights ? (
        <WorkplaceSafetyRights id={id} now={now} />
      ) : lbrPortal ? (
        <PublicLabourPortal id={id} now={now} />
      ) : agriFood ? (
        <FoodContinuityCommand id={id} now={now} />
      ) : agriProd ? (
        <HarvestProductionField id={id} now={now} />
      ) : agriWater ? (
        <WaterClimateInfrastructure id={id} now={now} />
      ) : agriResp ? (
        <FoodContinuityResponse id={id} now={now} />
      ) : agriRural ? (
        <RuralGovernanceCommunityStability id={id} now={now} />
      ) : agriIntel ? (
        <AgriculturalIntelligenceForecasting id={id} now={now} />
      ) : agriPortal ? (
        <PublicAgriculturePortal id={id} now={now} />
      ) : (
        <>
          <OpsHeader index={1} title={`${label}${focus ? ` · ${domain}` : ''}`} subtitle="Sovereign Institutional Execution"
            posture={pTone === 'alert' ? 'CRITICAL' : pTone === 'warn' ? 'ENGAGED' : 'STABLE'} tone={pTone} now={now} role={role} accent={ACC} />
          <KpiStrip ts={ts} accent={ACC} items={shown} />
          {!focus && bars ? <BarPanel title={bars.title} meta={bars.meta} accent={ACC} live rows={bars.rows} /> : null}
          {(['AGRICULTURE', 'ENVIRONMENT', 'TRANSPORT'] as ArchetypeKey[]).includes(archetype) ? (
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
