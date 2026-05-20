'use client';

// apps/ministry-agriculture/shell — Seasonal Wheel shell. Dispatches
// all 32 Agriculture surfaces through the dedicated design system,
// blending the 7 existing subsystems with 23 new domains.

import * as React from 'react';
import { RuntimeQueue } from '@/components/features/RuntimeQueue';
import { AGRICULTURE_DS, SeasonalSeal } from '@/apps/ministry-agriculture/design-system/agriculture-ds';
import { domainBySurface, type AgricultureSurfaceId } from '@/apps/ministry-agriculture/core/domains';
import { FederationStrip } from '@/apps/ministry-agriculture/federation/federation';
import { SEED_SUBSIDY_DISBURSEMENT } from '@/apps/ministry-agriculture/workflows/agriculture-workflows';

import { FoodContinuityCommand } from '@/apps/ministry-agriculture/FoodContinuityCommand';
import { HarvestProductionField } from '@/apps/ministry-agriculture/HarvestProductionField';
import { WaterClimateInfrastructure } from '@/apps/ministry-agriculture/WaterClimateInfrastructure';
import { FoodContinuityResponse } from '@/apps/ministry-agriculture/FoodContinuityResponse';
import { RuralGovernanceCommunityStability } from '@/apps/ministry-agriculture/RuralGovernanceCommunityStability';
import { AgriculturalIntelligenceForecasting } from '@/apps/ministry-agriculture/AgriculturalIntelligenceForecasting';
import { PublicAgriculturePortal } from '@/apps/ministry-agriculture/PublicAgriculturePortal';

import { FoodSecurityIndex, StrategicReserve, CropYieldBoard, LivestockBoard, FisheryBoard, IrrigationNetwork, BasinAllocation } from '@/apps/ministry-agriculture/domains/CommandProduction';
import { PestEmergency, DroughtResponse, RuralZones, CooperativeBoard, AgriculturalWorkforce, LandRegistry, SubsidyProgrammes, SubsidyApplications } from '@/apps/ministry-agriculture/domains/GovernanceSubsidy';
import { YieldForecast, TradeExposure, SustainabilityHorizon, ScarcityWatch, ClimateAdvisories, PestAlerts, IrrigationRequests, PermitFlow, RuralSafeguards, SmallholderAudit } from '@/apps/ministry-agriculture/domains/IntelligencePortal';

import type { SovereignRole, Capability } from '@/shared/permissions/rbac';

type Render = (p: { id: string; now: number; role: SovereignRole; withheld: Capability[] }) => React.ReactElement;

const RENDER: Record<AgricultureSurfaceId, Render> = {
  // command
  'food-continuity':         p => <FoodContinuityCommand id={p.id} now={p.now} />,
  'food-security-index':     p => <FoodSecurityIndex id={p.id} now={p.now} />,
  'strategic-reserve':       p => <StrategicReserve id={p.id} now={p.now} />,
  // production
  'harvest-production':      p => <HarvestProductionField id={p.id} now={p.now} />,
  'crop-yield-board':        p => <CropYieldBoard id={p.id} now={p.now} />,
  'livestock-board':         p => <LivestockBoard id={p.id} now={p.now} />,
  'fishery-board':           p => <FisheryBoard id={p.id} now={p.now} />,
  // water
  'water-climate':           p => <WaterClimateInfrastructure id={p.id} now={p.now} />,
  'irrigation-network':      p => <IrrigationNetwork id={p.id} now={p.now} />,
  'basin-allocation':        p => <BasinAllocation id={p.id} now={p.now} />,
  // response
  'food-response':           p => <FoodContinuityResponse id={p.id} now={p.now} />,
  'pest-emergency':          p => <PestEmergency id={p.id} now={p.now} />,
  'drought-response':        p => <DroughtResponse id={p.id} now={p.now} />,
  // governance
  'rural-governance':        p => <RuralGovernanceCommunityStability id={p.id} now={p.now} />,
  'rural-zones':             p => <RuralZones id={p.id} now={p.now} />,
  'cooperative-board':       p => <CooperativeBoard id={p.id} now={p.now} />,
  'agricultural-workforce':  p => <AgriculturalWorkforce id={p.id} now={p.now} />,
  'land-registry':           p => <LandRegistry id={p.id} now={p.now} />,
  // subsidy
  'subsidy-programmes':      p => <SubsidyProgrammes id={p.id} now={p.now} />,
  'subsidy-applications':    p => <SubsidyApplications id={p.id} now={p.now} />,
  // intelligence
  'agri-intelligence':       p => <AgriculturalIntelligenceForecasting id={p.id} now={p.now} />,
  'yield-forecast':          p => <YieldForecast id={p.id} now={p.now} />,
  'trade-exposure':          p => <TradeExposure id={p.id} now={p.now} />,
  'sustainability-horizon':  p => <SustainabilityHorizon id={p.id} now={p.now} />,
  'scarcity-watch':          p => <ScarcityWatch id={p.id} now={p.now} />,
  // portal
  'agri-portal':             p => <PublicAgriculturePortal id={p.id} now={p.now} />,
  'climate-advisories':      p => <ClimateAdvisories id={p.id} now={p.now} />,
  'pest-alerts':             p => <PestAlerts id={p.id} now={p.now} />,
  'irrigation-requests':     p => <IrrigationRequests id={p.id} now={p.now} />,
  'permit-flow':             p => <PermitFlow id={p.id} now={p.now} />,
  // oversight
  'rural-safeguards':        p => <RuralSafeguards id={p.id} now={p.now} />,
  'smallholder-audit':       p => <SmallholderAudit id={p.id} now={p.now} />,
};

export function AgricultureShell({ id, surface, now, role, withheld = [] }: {
  id: string; surface: AgricultureSurfaceId; now: number; role: SovereignRole; withheld?: Capability[];
}) {
  const domain = domainBySurface(surface);
  const render = RENDER[surface];
  return (
    <div className="space-y-2 p-2"
      style={{ background: AGRICULTURE_DS.loam, boxShadow: 'inset 0 0 90px rgba(0,0,0,0.65)' }}>
      {render ? render({ id, now, role, withheld }) : <FoodContinuityCommand id={id} now={now} />}
      <FederationStrip />
      <RuntimeQueue
        scope={`agriculture:${surface}`}
        kind={domain?.archetype === 'subsidy' ? 'procurement' : domain?.archetype === 'response' ? 'incident' : domain?.archetype === 'portal' ? 'permit' : 'approval'}
        title={`${domain?.label ?? 'Agriculture'} runtime — ${SEED_SUBSIDY_DISBURSEMENT.title}`}
        by="Agriculture Officer"
        role={role}
        withheld={withheld} />
      <SeasonalSeal maxim="Tellus mater · the earth is mother to all" />
    </div>
  );
}
