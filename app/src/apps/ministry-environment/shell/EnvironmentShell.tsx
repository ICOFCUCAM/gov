'use client';

// apps/ministry-environment/shell — Biome Map shell. Dispatches all 32
// Environment surfaces through the dedicated design system, blending
// the 7 existing top-level subsystems with 23 new domains.

import * as React from 'react';
import { RuntimeQueue } from '@/components/features/RuntimeQueue';
import { ENVIRONMENT_DS, BiomeSeal } from '@/apps/ministry-environment/design-system/environment-ds';
import { domainBySurface, type EnvironmentSurfaceId } from '@/apps/ministry-environment/core/domains';
import { FederationStrip } from '@/apps/ministry-environment/federation/federation';
import { ENVIRONMENTAL_IMPACT_ASSESSMENT } from '@/apps/ministry-environment/workflows/environment-workflows';

import { PlanetaryClimateResilience } from '@/apps/ministry-environment/PlanetaryClimateResilience';
import { BiosphereRestorationAtlas } from '@/apps/ministry-environment/BiosphereRestorationAtlas';
import { AtmosphericHydrologicalSystems } from '@/apps/ministry-environment/AtmosphericHydrologicalSystems';
import { EcologicalForesightCrisis } from '@/apps/ministry-environment/EcologicalForesightCrisis';
import { NaturalResourceGovernance } from '@/apps/ministry-environment/NaturalResourceGovernance';
import { EnergyEcologicalCoupling } from '@/apps/ministry-environment/EnergyEcologicalCoupling';
import { PublicEnvironmentPortal } from '@/apps/ministry-environment/PublicEnvironmentPortal';

import { EcoregionStress, BiomeCommand, ProtectedRegions, SpeciesConservation, AirQualityBoard, WeatherEventFeed, RiverBasins, OceanicReadout, WaterAllocation } from '@/apps/ministry-environment/domains/BiomeAtmosphere';
import { PollutionRegister, EmissionsTarget, ComplianceBench, ClimateIncidentLedger, WildfireResponse, FloodResponse, DroughtResponse } from '@/apps/ministry-environment/domains/PollutionIncidents';
import { PlanetaryTrajectory, IntergenerationalContinuity, ForestryRegister, ExtractionPermits, LandProtection, CitizenReports, PublicAdvisories, ClimateSafeguards, IntergenerationalAudit } from '@/apps/ministry-environment/domains/RegistryPortal';

import type { SovereignRole, Capability } from '@/shared/permissions/rbac';

type Render = (p: { id: string; now: number; role: SovereignRole; withheld: Capability[] }) => React.ReactElement;

const RENDER: Record<EnvironmentSurfaceId, Render> = {
  // biome
  'planetary-resilience':       p => <PlanetaryClimateResilience id={p.id} now={p.now} />,
  'ecoregion-stress':           p => <EcoregionStress id={p.id} now={p.now} />,
  'biome-command':              p => <BiomeCommand id={p.id} now={p.now} />,
  // ecosystem
  'biosphere-restoration':      p => <BiosphereRestorationAtlas id={p.id} now={p.now} />,
  'protected-regions':          p => <ProtectedRegions id={p.id} now={p.now} />,
  'species-conservation':       p => <SpeciesConservation id={p.id} now={p.now} />,
  // atmosphere
  'atmospheric-hydrology':      p => <AtmosphericHydrologicalSystems id={p.id} now={p.now} />,
  'air-quality-board':          p => <AirQualityBoard id={p.id} now={p.now} />,
  'weather-event-feed':         p => <WeatherEventFeed id={p.id} now={p.now} />,
  // hydrosphere
  'river-basins':               p => <RiverBasins id={p.id} now={p.now} />,
  'oceanic-readout':            p => <OceanicReadout id={p.id} now={p.now} />,
  'water-allocation':           p => <WaterAllocation id={p.id} now={p.now} />,
  // pollution
  'pollution-register':         p => <PollutionRegister id={p.id} now={p.now} />,
  'emissions-target':           p => <EmissionsTarget id={p.id} now={p.now} />,
  'compliance-bench':           p => <ComplianceBench id={p.id} now={p.now} />,
  // incident
  'climate-incident-ledger':    p => <ClimateIncidentLedger id={p.id} now={p.now} />,
  'wildfire-response':          p => <WildfireResponse id={p.id} now={p.now} />,
  'flood-response':             p => <FloodResponse id={p.id} now={p.now} />,
  'drought-response':           p => <DroughtResponse id={p.id} now={p.now} />,
  // forecast
  'ecological-foresight':       p => <EcologicalForesightCrisis id={p.id} now={p.now} />,
  'planetary-trajectory':       p => <PlanetaryTrajectory id={p.id} now={p.now} />,
  'intergenerational-continuity': p => <IntergenerationalContinuity id={p.id} now={p.now} />,
  // registry
  'resource-governance':        p => <NaturalResourceGovernance id={p.id} now={p.now} />,
  'forestry-register':          p => <ForestryRegister id={p.id} now={p.now} />,
  'extraction-permits':         p => <ExtractionPermits id={p.id} now={p.now} />,
  'land-protection':            p => <LandProtection id={p.id} now={p.now} />,
  // portal
  'environment-portal':         p => <PublicEnvironmentPortal id={p.id} now={p.now} />,
  'citizen-reports':             p => <CitizenReports id={p.id} now={p.now} />,
  'public-advisories':           p => <PublicAdvisories id={p.id} now={p.now} />,
  'energy-ecological':           p => <EnergyEcologicalCoupling id={p.id} now={p.now} />,
  // oversight
  'climate-safeguards':          p => <ClimateSafeguards id={p.id} now={p.now} />,
  'intergenerational-audit':     p => <IntergenerationalAudit id={p.id} now={p.now} />,
};

export function EnvironmentShell({ id, surface, now, role, withheld = [] }: {
  id: string; surface: EnvironmentSurfaceId; now: number; role: SovereignRole; withheld?: Capability[];
}) {
  const domain = domainBySurface(surface);
  const render = RENDER[surface];
  return (
    <div className="space-y-2 p-2"
      style={{ background: ENVIRONMENT_DS.obsidian, boxShadow: 'inset 0 0 90px rgba(0,0,0,0.65)' }}>
      {render ? render({ id, now, role, withheld }) : <PlanetaryClimateResilience id={id} now={now} />}
      <FederationStrip />
      <RuntimeQueue
        scope={`environment:${surface}`}
        kind={domain?.archetype === 'incident' ? 'incident' : domain?.archetype === 'registry' ? 'permit' : 'approval'}
        title={`${domain?.label ?? 'Environment'} runtime — ${ENVIRONMENTAL_IMPACT_ASSESSMENT.title}`}
        by="Environmental Officer"
        role={role}
        withheld={withheld} />
      <BiomeSeal maxim="Terra in trust · the earth is held in trust" />
    </div>
  );
}
