'use client';

// apps/ministry-energy/shell — One-Line Diagram shell. Dispatches all 33
// Energy surfaces through the dedicated design system, blending the 7
// existing top-level subsystems with 23 new domains.

import * as React from 'react';
import { RuntimeQueue } from '@/components/features/RuntimeQueue';
import { ENERGY_DS, GridSeal } from '@/apps/ministry-energy/design-system/energy-ds';
import { domainBySurface, type EnergySurfaceId } from '@/apps/ministry-energy/core/domains';
import { FederationStrip } from '@/apps/ministry-energy/federation/federation';
import { BLACKOUT_RESTORATION } from '@/apps/ministry-energy/workflows/energy-workflows';

import { GridCommandTheater } from '@/apps/ministry-energy/GridCommandTheater';
import { GenerationReserves } from '@/apps/ministry-energy/GenerationReserves';
import { TransmissionInfrastructure } from '@/apps/ministry-energy/TransmissionInfrastructure';
import { EnergyContinuity } from '@/apps/ministry-energy/EnergyContinuity';
import { EnergyEmergencyRecovery } from '@/apps/ministry-energy/EnergyEmergencyRecovery';
import { EnergyIntelligenceForesight } from '@/apps/ministry-energy/EnergyIntelligenceForesight';
import { PublicEnergyServicesPortal } from '@/apps/ministry-energy/PublicEnergyServicesPortal';

import { PostureBoard, FrequencyBoard, RenewableFleet, BaseloadFleet, GenerationMix, CorridorBoard, TransformerHealth, IndustrialAllocation, LoadShedDoctrine, PeakDemandForecast } from '@/apps/ministry-energy/domains/CommandGeneration';
import { StrategicReserve, FuelStockpile, BatteryStack, BlackoutLedger, RestorationCrews, CriticalServicesBackup } from '@/apps/ministry-energy/domains/ReserveEmergency';
import { DemandTrajectory, ClimateEnergyRisk, CascadingFailure, GeopoliticalExposure, OutageReports, EnergyPermits, RenewableRequests, EnergyAdvisories, EnergySafeguards, EquityAudit } from '@/apps/ministry-energy/domains/IntelligencePortal';

import type { SovereignRole, Capability } from '@/shared/permissions/rbac';

type Render = (p: { id: string; now: number; role: SovereignRole; withheld: Capability[] }) => React.ReactElement;

const RENDER: Record<EnergySurfaceId, Render> = {
  // command
  'grid-theater':              p => <GridCommandTheater id={p.id} now={p.now} />,
  'posture-board':             p => <PostureBoard id={p.id} now={p.now} />,
  'frequency-board':           p => <FrequencyBoard id={p.id} now={p.now} />,
  // generation
  'generation-reserves':       p => <GenerationReserves id={p.id} now={p.now} />,
  'renewable-fleet':           p => <RenewableFleet id={p.id} now={p.now} />,
  'baseload-fleet':            p => <BaseloadFleet id={p.id} now={p.now} />,
  'generation-mix':            p => <GenerationMix id={p.id} now={p.now} />,
  // transmission
  'transmission-infra':        p => <TransmissionInfrastructure id={p.id} now={p.now} />,
  'corridor-board':            p => <CorridorBoard id={p.id} now={p.now} />,
  'transformer-health':        p => <TransformerHealth id={p.id} now={p.now} />,
  // demand
  'industrial-allocation':     p => <IndustrialAllocation id={p.id} now={p.now} />,
  'load-shed-doctrine':        p => <LoadShedDoctrine id={p.id} now={p.now} />,
  'peak-demand-forecast':      p => <PeakDemandForecast id={p.id} now={p.now} />,
  // reserve
  'strategic-reserve':         p => <StrategicReserve id={p.id} now={p.now} />,
  'fuel-stockpile':            p => <FuelStockpile id={p.id} now={p.now} />,
  'battery-stack':             p => <BatteryStack id={p.id} now={p.now} />,
  // emergency
  'emergency-recovery':        p => <EnergyEmergencyRecovery id={p.id} now={p.now} />,
  'blackout-ledger':           p => <BlackoutLedger id={p.id} now={p.now} />,
  'restoration-crews':         p => <RestorationCrews id={p.id} now={p.now} />,
  'critical-services-backup':  p => <CriticalServicesBackup id={p.id} now={p.now} />,
  // intelligence
  'intel-foresight':           p => <EnergyIntelligenceForesight id={p.id} now={p.now} />,
  'demand-trajectory':         p => <DemandTrajectory id={p.id} now={p.now} />,
  'climate-energy-risk':       p => <ClimateEnergyRisk id={p.id} now={p.now} />,
  'cascading-failure':         p => <CascadingFailure id={p.id} now={p.now} />,
  'geopolitical-exposure':     p => <GeopoliticalExposure id={p.id} now={p.now} />,
  // portal
  'public-portal':             p => <PublicEnergyServicesPortal id={p.id} now={p.now} />,
  'outage-reports':            p => <OutageReports id={p.id} now={p.now} />,
  'energy-permits':            p => <EnergyPermits id={p.id} now={p.now} />,
  'renewable-requests':        p => <RenewableRequests id={p.id} now={p.now} />,
  'energy-advisories':         p => <EnergyAdvisories id={p.id} now={p.now} />,
  // continuity
  'energy-continuity':         p => <EnergyContinuity id={p.id} now={p.now} />,
  // oversight
  'energy-safeguards':         p => <EnergySafeguards id={p.id} now={p.now} />,
  'equity-audit':              p => <EquityAudit id={p.id} now={p.now} />,
};

export function EnergyShell({ id, surface, now, role, withheld = [] }: {
  id: string; surface: EnergySurfaceId; now: number; role: SovereignRole; withheld?: Capability[];
}) {
  const domain = domainBySurface(surface);
  const render = RENDER[surface];
  return (
    <div className="space-y-2 p-2"
      style={{ background: ENERGY_DS.carbon, boxShadow: 'inset 0 0 90px rgba(0,0,0,0.65)' }}>
      {render ? render({ id, now, role, withheld }) : <GridCommandTheater id={id} now={now} />}
      <FederationStrip />
      <RuntimeQueue
        scope={`energy:${surface}`}
        kind={domain?.archetype === 'emergency' ? 'incident' : domain?.archetype === 'portal' ? 'permit' : 'approval'}
        title={`${domain?.label ?? 'Energy'} runtime — ${BLACKOUT_RESTORATION.title}`}
        by="Grid Officer"
        role={role}
        withheld={withheld} />
      <GridSeal maxim="Lumen civitatis · the light of the polity" />
    </div>
  );
}
