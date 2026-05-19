'use client';

// apps/ministry-interior/shell — the dedicated Interior layout engine.
//
// Renders the active sovereign domain through the Interior design system,
// applies the federation contract for embedded operational shells, and
// carries the orchestration posture + runtime execution layer. This is
// the single coherent surface that replaces the generic sector renderer.

import * as React from 'react';
import { RuntimeQueue } from '@/components/features/RuntimeQueue';
import { interiorOps } from '@/lib/gov/interior-systems';
import { DomainFrame, INTERIOR_DS } from '@/apps/ministry-interior/design-system/interior-ds';
import { FederatedMount, FederatedBadge } from '@/apps/ministry-interior/federation/federation';
import type { InteriorDomain, SurfaceId } from '@/apps/ministry-interior/core/domains';

import { NationalOverview } from '@/components/features/NationalOverview';
import { MissionOrchestration } from '@/components/features/MissionOrchestration';
import { EventBusMonitor } from '@/components/features/EventBusMonitor';
import { InteroperabilityFabric } from '@/components/features/InteroperabilityFabric';
import { InteriorCommand } from '@/apps/ministry-interior/domains/InteriorCommand';
import { CivilRegistryCommand } from '@/apps/ministry-interior/domains/CivilRegistryCommand';
import { PopulationAnalytics } from '@/apps/ministry-interior/domains/PopulationAnalytics';
import { PermitsLicensing } from '@/apps/ministry-interior/domains/PermitsLicensing';
import { RegionalAdministration } from '@/apps/ministry-interior/domains/RegionalAdministration';
import { AuditCompliance } from '@/apps/ministry-interior/domains/AuditCompliance';
import { InteriorReports } from '@/apps/ministry-interior/domains/InteriorReports';
import { NationalControlBoard } from '@/apps/ministry-interior/domains/NationalControlBoard';
import { TransactionObservability } from '@/apps/ministry-interior/domains/TransactionObservability';
import { AntiCorruptionRuntime } from '@/apps/ministry-interior/domains/AntiCorruptionRuntime';
import { SeparationOfPowers } from '@/apps/ministry-interior/domains/SeparationOfPowers';
import { SovereignAuthority } from '@/apps/ministry-interior/domains/SovereignAuthority';
import { OversightMirroring } from '@/apps/ministry-interior/domains/OversightMirroring';
import { CitizenAccountability } from '@/apps/ministry-interior/domains/CitizenAccountability';
import { WorkflowOrchestration } from '@/apps/ministry-interior/domains/WorkflowOrchestration';
import { AppealsRights } from '@/apps/ministry-interior/domains/AppealsRights';
import { JurisdictionDelegation } from '@/apps/ministry-interior/domains/JurisdictionDelegation';
import { ConstitutionalInterruption } from '@/apps/ministry-interior/domains/ConstitutionalInterruption';
import { InstitutionalEconomy } from '@/apps/ministry-interior/domains/InstitutionalEconomy';
import { PressurePropagation } from '@/apps/ministry-interior/domains/PressurePropagation';
import { ResilienceContinuity } from '@/apps/ministry-interior/domains/ResilienceContinuity';
import { CorruptionPressure } from '@/apps/ministry-interior/domains/CorruptionPressure';
import { TemporalForecast } from '@/apps/ministry-interior/domains/TemporalForecast';
import { EarlyWarning } from '@/apps/ministry-interior/domains/EarlyWarning';
import { ContinuityForecast } from '@/apps/ministry-interior/domains/ContinuityForecast';
import { TemporalCorruption } from '@/apps/ministry-interior/domains/TemporalCorruption';
import { NationalDigitalTwin } from '@/apps/ministry-interior/domains/NationalDigitalTwin';
import { CausalityGraph } from '@/apps/ministry-interior/domains/CausalityGraph';
import { SystemicCollapseForecast } from '@/apps/ministry-interior/domains/SystemicCollapseForecast';
import { NationalStabilization } from '@/apps/ministry-interior/domains/NationalStabilization';
import { GenerationalForecast } from '@/apps/ministry-interior/domains/GenerationalForecast';
import { InstitutionalAging } from '@/apps/ministry-interior/domains/InstitutionalAging';
import { DemographicEvolution } from '@/apps/ministry-interior/domains/DemographicEvolution';
import { ConstitutionalResilience } from '@/apps/ministry-interior/domains/ConstitutionalResilience';
import { CivicTrust } from '@/apps/ministry-interior/domains/CivicTrust';
import { ProceduralFairness } from '@/apps/ministry-interior/domains/ProceduralFairness';
import { RightsPerception } from '@/apps/ministry-interior/domains/RightsPerception';
import { LegitimacyTrajectory } from '@/apps/ministry-interior/domains/LegitimacyTrajectory';
import { TerritorialContinuity } from '@/apps/ministry-interior/domains/TerritorialContinuity';
import { ClimatePropagation } from '@/apps/ministry-interior/domains/ClimatePropagation';
import { UrbanizationEvolution } from '@/apps/ministry-interior/domains/UrbanizationEvolution';
import { EcologicalResilience } from '@/apps/ministry-interior/domains/EcologicalResilience';
import { CivilizationalIdentity } from '@/apps/ministry-interior/domains/CivilizationalIdentity';
import { MigrationIntegration } from '@/apps/ministry-interior/domains/MigrationIntegration';
import { HeritageMemory } from '@/apps/ministry-interior/domains/HeritageMemory';
import { CivilizationalTrajectory } from '@/apps/ministry-interior/domains/CivilizationalTrajectory';
import { KnowledgeContinuity } from '@/apps/ministry-interior/domains/KnowledgeContinuity';
import { ExpertiseTransfer } from '@/apps/ministry-interior/domains/ExpertiseTransfer';
import { InnovationContinuity } from '@/apps/ministry-interior/domains/InnovationContinuity';
import { CognitiveTrajectory } from '@/apps/ministry-interior/domains/CognitiveTrajectory';
import { GeopoliticalContinuity } from '@/apps/ministry-interior/domains/GeopoliticalContinuity';
import { MigrationHumanitarian } from '@/apps/ministry-interior/domains/MigrationHumanitarian';
import { GlobalShockIntelligence } from '@/apps/ministry-interior/domains/GlobalShockIntelligence';
import { StrategicTrajectory } from '@/apps/ministry-interior/domains/StrategicTrajectory';
import { ExistentialContinuity } from '@/apps/ministry-interior/domains/ExistentialContinuity';
import { PandemicBiosurvival } from '@/apps/ministry-interior/domains/PandemicBiosurvival';
import { PostCollapseRecovery } from '@/apps/ministry-interior/domains/PostCollapseRecovery';
import { ExistentialTrajectory } from '@/apps/ministry-interior/domains/ExistentialTrajectory';
import { CivilizationOrganism } from '@/apps/ministry-interior/domains/CivilizationOrganism';
import { SovereignSafeguardsLedger } from '@/apps/ministry-interior/domains/SovereignSafeguardsLedger';
import { ContinuityMatrix } from '@/apps/ministry-interior/domains/ContinuityMatrix';
import { CitizenPublicBrief } from '@/apps/ministry-interior/domains/CitizenPublicBrief';
import { MunicipalSystems } from '@/apps/ministry-transport/MunicipalSystems';
import { LocalCouncils } from '@/apps/legislature/LocalCouncils';
import { PrisonsCorrections } from '@/apps/justice/PrisonsCorrections';
import { PoliceCommand } from '@/apps/police-command/PoliceCommand';
import { ImmigrationCommand } from '@/apps/immigration/ImmigrationCommand';
import { EmergencyCommand } from '@/apps/emergency-response/EmergencyCommand';
import { IntelligenceCommand } from '@/apps/police-command/IntelligenceCommand';
import { CyberCommand } from '@/apps/police-command/CyberCommand';
import { InvestigationsCommand } from '@/apps/police-command/InvestigationsCommand';

import type { SovereignRole, Capability } from '@/shared/permissions/rbac';
import type { WorkKind } from '@/lib/gov/runtime-workflow';

// Surface registry: maps the normalized surface id to its renderer. Props
// are uniform ({ id, now }) or prop-less national/infra surfaces.
function renderSurface(surface: SurfaceId, id: string, now: number): React.ReactNode {
  switch (surface) {
    case 'national-overview': return <NationalOverview />;
    case 'interior-command': return <InteriorCommand id={id} now={now} />;
    case 'civil-registry': return <CivilRegistryCommand id={id} now={now} />;
    case 'population': return <PopulationAnalytics id={id} now={now} />;
    case 'permits': return <PermitsLicensing id={id} now={now} />;
    case 'regional': return <RegionalAdministration id={id} now={now} />;
    case 'municipal': return <MunicipalSystems id={id} now={now} />;
    case 'councils': return <LocalCouncils id={id} now={now} />;
    case 'corrections': return <PrisonsCorrections id={id} now={now} />;
    case 'workflows': return <MissionOrchestration />;
    case 'police': return <PoliceCommand id={id} now={now} />;
    case 'immigration': return <ImmigrationCommand id={id} now={now} />;
    case 'emergency': return <EmergencyCommand id={id} now={now} />;
    case 'intelligence': return <IntelligenceCommand id={id} now={now} />;
    case 'cyber': return <CyberCommand id={id} now={now} />;
    case 'investigations': return <InvestigationsCommand id={id} now={now} />;
    case 'event-bus': return <EventBusMonitor />;
    case 'fabric': return <InteroperabilityFabric />;
    case 'audit': return <AuditCompliance id={id} now={now} />;
    case 'reports': return <InteriorReports id={id} now={now} />;
    case 'national-control-board': return <NationalControlBoard id={id} now={now} />;
    case 'transaction-observability': return <TransactionObservability id={id} now={now} />;
    case 'anti-corruption': return <AntiCorruptionRuntime id={id} now={now} />;
    case 'separation-of-powers': return <SeparationOfPowers id={id} />;
    case 'sovereign-authority': return <SovereignAuthority id={id} now={now} />;
    case 'oversight-mirroring': return <OversightMirroring id={id} now={now} />;
    case 'citizen-accountability': return <CitizenAccountability id={id} now={now} />;
    case 'workflow-orchestration': return <WorkflowOrchestration id={id} now={now} />;
    case 'appeals-rights': return <AppealsRights id={id} now={now} />;
    case 'jurisdiction-delegation': return <JurisdictionDelegation id={id} now={now} />;
    case 'constitutional-interruption': return <ConstitutionalInterruption id={id} now={now} />;
    case 'institutional-economy': return <InstitutionalEconomy id={id} now={now} />;
    case 'pressure-propagation': return <PressurePropagation id={id} now={now} />;
    case 'resilience-continuity': return <ResilienceContinuity id={id} now={now} />;
    case 'corruption-pressure': return <CorruptionPressure id={id} now={now} />;
    case 'temporal-forecast': return <TemporalForecast id={id} now={now} />;
    case 'early-warning': return <EarlyWarning id={id} now={now} />;
    case 'continuity-forecast': return <ContinuityForecast id={id} now={now} />;
    case 'temporal-corruption': return <TemporalCorruption id={id} now={now} />;
    case 'national-digital-twin': return <NationalDigitalTwin id={id} now={now} />;
    case 'causality-graph': return <CausalityGraph id={id} now={now} />;
    case 'systemic-collapse-forecast': return <SystemicCollapseForecast id={id} now={now} />;
    case 'national-stabilization': return <NationalStabilization id={id} now={now} />;
    case 'generational-forecast': return <GenerationalForecast id={id} now={now} />;
    case 'institutional-aging': return <InstitutionalAging id={id} now={now} />;
    case 'demographic-evolution': return <DemographicEvolution id={id} now={now} />;
    case 'constitutional-resilience': return <ConstitutionalResilience id={id} now={now} />;
    case 'civic-trust': return <CivicTrust id={id} now={now} />;
    case 'procedural-fairness': return <ProceduralFairness id={id} now={now} />;
    case 'rights-perception': return <RightsPerception id={id} now={now} />;
    case 'legitimacy-trajectory': return <LegitimacyTrajectory id={id} now={now} />;
    case 'territorial-continuity': return <TerritorialContinuity id={id} now={now} />;
    case 'climate-propagation': return <ClimatePropagation id={id} now={now} />;
    case 'urbanization-evolution': return <UrbanizationEvolution id={id} now={now} />;
    case 'ecological-resilience': return <EcologicalResilience id={id} now={now} />;
    case 'civilizational-identity': return <CivilizationalIdentity id={id} now={now} />;
    case 'migration-integration': return <MigrationIntegration id={id} now={now} />;
    case 'heritage-memory': return <HeritageMemory id={id} now={now} />;
    case 'civilizational-trajectory': return <CivilizationalTrajectory id={id} now={now} />;
    case 'knowledge-continuity': return <KnowledgeContinuity id={id} now={now} />;
    case 'expertise-transfer': return <ExpertiseTransfer id={id} now={now} />;
    case 'innovation-continuity': return <InnovationContinuity id={id} now={now} />;
    case 'cognitive-trajectory': return <CognitiveTrajectory id={id} now={now} />;
    case 'geopolitical-continuity': return <GeopoliticalContinuity id={id} now={now} />;
    case 'migration-humanitarian': return <MigrationHumanitarian id={id} now={now} />;
    case 'global-shock-intelligence': return <GlobalShockIntelligence id={id} now={now} />;
    case 'strategic-trajectory': return <StrategicTrajectory id={id} now={now} />;
    case 'existential-continuity': return <ExistentialContinuity id={id} now={now} />;
    case 'pandemic-biosurvival': return <PandemicBiosurvival id={id} now={now} />;
    case 'post-collapse-recovery': return <PostCollapseRecovery id={id} now={now} />;
    case 'existential-trajectory': return <ExistentialTrajectory id={id} now={now} />;
    case 'civilization-organism': return <CivilizationOrganism id={id} now={now} />;
    case 'sovereign-safeguards-ledger': return <SovereignSafeguardsLedger id={id} />;
    case 'continuity-matrix': return <ContinuityMatrix id={id} now={now} />;
    case 'citizen-public-brief': return <CitizenPublicBrief id={id} now={now} />;
  }
}

const WF: Record<string, WorkKind> = {
  police: 'incident', immigration: 'incident', emergency: 'incident',
  intelligence: 'case', cyber: 'case', investigations: 'case',
  corrections: 'case', permits: 'approval', 'civil-registry': 'approval',
};

export function InteriorShell({ domain, instanceId, now, role, withheld }: {
  domain: InteriorDomain;
  instanceId: string;
  now: number;
  role: SovereignRole;
  withheld: Capability[];
}) {
  const ts = now / 4000;
  const o = interiorOps(instanceId, ts);
  const order = o.coordination.publicOrderIndex;
  const postureTone = o.internalThreatLevel === 'high' ? 'alert' : o.internalThreatLevel === 'elevated' ? 'warn' : 'ok';
  const postureColor = postureTone === 'alert' ? 'rgb(var(--c-alert))' : postureTone === 'warn' ? 'rgb(var(--c-warn))' : 'rgb(var(--c-ok))';
  const wf = WF[domain.key] ?? 'case';

  return (
    <div
      className="space-y-2 rounded-[5px] p-2"
      style={{ background: INTERIOR_DS.bg, boxShadow: 'inset 0 0 90px rgba(0,0,0,0.6)' }}>
      {/* Orchestration band — Interior's sovereign posture across domains */}
      <div
        className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-[4px] border px-3 py-1.5 text-[10px]"
        style={{ borderColor: `color-mix(in srgb,${INTERIOR_DS.shellAccent} 22%,${INTERIOR_DS.line})` }}>
        <span className="text-[9px] font-semibold uppercase tracking-[0.18em]" style={{ color: INTERIOR_DS.shellAccent }}>
          Interior OS · National Internal Governance
        </span>
        <span className="text-ink-muted">Public order <span className="font-semibold tabular-nums text-ink">{order}</span></span>
        <span className="flex items-center gap-1 text-ink-muted">
          Internal threat
          <span className="font-semibold uppercase" style={{ color: postureColor }}>{o.internalThreatLevel}</span>
        </span>
        <span className="ml-auto text-ink-muted">
          Identity uptime <span className="font-semibold tabular-nums text-ink">{o.identity.uptimePct}%</span>
        </span>
      </div>

      <DomainFrame domain={domain} badge={domain.federation ? <FederatedBadge /> : null}>
        {domain.federation
          ? <FederatedMount federation={domain.federation}>{renderSurface(domain.surface, instanceId, now)}</FederatedMount>
          : renderSurface(domain.surface, instanceId, now)}
      </DomainFrame>

      <RuntimeQueue
        scope={`${instanceId}:${domain.key}`}
        kind={wf}
        title={`${domain.label} runtime — execute the Interior workflow`}
        by="Interior Officer"
        role={role}
        withheld={withheld}
      />
    </div>
  );
}
