'use client';

// apps/ministry-transport/shell — Corridor Map shell. Dispatches all 35
// Transport surfaces through the dedicated design system, blending 9
// existing top-level subsystems with 24 new domains.

import * as React from 'react';
import { RuntimeQueue } from '@/components/features/RuntimeQueue';
import { TRANSPORT_DS, CorridorSeal } from '@/apps/ministry-transport/design-system/transport-ds';
import { domainBySurface, type TransportSurfaceId } from '@/apps/ministry-transport/core/domains';
import { FederationStrip } from '@/apps/ministry-transport/federation/federation';
import { INFRASTRUCTURE_CLOSURE } from '@/apps/ministry-transport/workflows/transport-workflows';

import { MobilityCommandTheater } from '@/apps/ministry-transport/MobilityCommandTheater';
import { MultiModalOperations } from '@/apps/ministry-transport/MultiModalOperations';
import { LogisticsNetwork } from '@/apps/ministry-transport/LogisticsNetwork';
import { TransportContinuity } from '@/apps/ministry-transport/TransportContinuity';
import { TransportEmergencyRecovery } from '@/apps/ministry-transport/TransportEmergencyRecovery';
import { MobilityIntelligenceForesight } from '@/apps/ministry-transport/MobilityIntelligenceForesight';
import { PublicTransportPortal } from '@/apps/ministry-transport/PublicTransportPortal';
import { MunicipalSystems } from '@/apps/ministry-transport/MunicipalSystems';

import { MobilityPosture, NationalThroughput, CorridorBoard, RegionalCongestion, EmergencyCorridors, PortNetwork, MaritimeRisk, RailNetwork, RailDisruption, AirHubs, AirspaceStrain } from '@/apps/ministry-transport/domains/MobilityCorridors';
import { CargoLanes, WarehouseCover, InfrastructureAssets, BridgeTunnelHealth, InfrastructureFailures, RepairCrews, EvacuationCorridors } from '@/apps/ministry-transport/domains/LogisticsEmergency';
import { DemandForecast, ClimateMobilityRisk, FreightBottlenecks, MobilityAnomalies, TransitSchedules, TransportPermits, LogisticsRequests, MobilityAdvisories, TransportSafeguards, EquitableMobilityAudit } from '@/apps/ministry-transport/domains/IntelligencePortal';

import type { SovereignRole, Capability } from '@/shared/permissions/rbac';

type Render = (p: { id: string; now: number; role: SovereignRole; withheld: Capability[] }) => React.ReactElement;

void MunicipalSystems;

const RENDER: Record<TransportSurfaceId, Render> = {
  // mobility
  'mobility-theater':         p => <MobilityCommandTheater id={p.id} now={p.now} />,
  'mobility-posture':         p => <MobilityPosture id={p.id} now={p.now} />,
  'national-throughput':      p => <NationalThroughput id={p.id} now={p.now} />,
  // corridor
  'corridor-board':           p => <CorridorBoard id={p.id} now={p.now} />,
  'regional-congestion':      p => <RegionalCongestion id={p.id} now={p.now} />,
  'emergency-corridors':      p => <EmergencyCorridors id={p.id} now={p.now} />,
  // maritime
  'port-network':             p => <PortNetwork id={p.id} now={p.now} />,
  'maritime-risk':            p => <MaritimeRisk id={p.id} now={p.now} />,
  // rail
  'rail-network':             p => <RailNetwork id={p.id} now={p.now} />,
  'rail-disruption':          p => <RailDisruption id={p.id} now={p.now} />,
  // aviation
  'air-hubs':                 p => <AirHubs id={p.id} now={p.now} />,
  'airspace-strain':          p => <AirspaceStrain id={p.id} now={p.now} />,
  // logistics
  'logistics-network':        p => <LogisticsNetwork id={p.id} now={p.now} />,
  'cargo-lanes':              p => <CargoLanes id={p.id} now={p.now} />,
  'warehouse-cover':          p => <WarehouseCover id={p.id} now={p.now} />,
  // infrastructure
  'infrastructure-assets':    p => <InfrastructureAssets id={p.id} now={p.now} />,
  'bridge-tunnel-health':     p => <BridgeTunnelHealth id={p.id} now={p.now} />,
  // emergency
  'emergency-recovery':       p => <TransportEmergencyRecovery id={p.id} now={p.now} />,
  'infrastructure-failures':  p => <InfrastructureFailures id={p.id} now={p.now} />,
  'repair-crews':             p => <RepairCrews id={p.id} now={p.now} />,
  'evacuation-corridors':     p => <EvacuationCorridors id={p.id} now={p.now} />,
  // intelligence
  'mobility-foresight':       p => <MobilityIntelligenceForesight id={p.id} now={p.now} />,
  'demand-forecast':          p => <DemandForecast id={p.id} now={p.now} />,
  'climate-mobility-risk':    p => <ClimateMobilityRisk id={p.id} now={p.now} />,
  'freight-bottlenecks':      p => <FreightBottlenecks id={p.id} now={p.now} />,
  'mobility-anomalies':       p => <MobilityAnomalies id={p.id} now={p.now} />,
  // portal
  'public-portal':            p => <PublicTransportPortal id={p.id} now={p.now} />,
  'transit-schedules':        p => <TransitSchedules id={p.id} now={p.now} />,
  'transport-permits':        p => <TransportPermits id={p.id} now={p.now} />,
  'logistics-requests':       p => <LogisticsRequests id={p.id} now={p.now} />,
  'mobility-advisories':      p => <MobilityAdvisories id={p.id} now={p.now} />,
  // continuity (legacy)
  'transport-continuity':     p => <TransportContinuity id={p.id} now={p.now} />,
  'multi-modal':              p => <MultiModalOperations id={p.id} now={p.now} />,
  // oversight
  'transport-safeguards':     p => <TransportSafeguards id={p.id} now={p.now} />,
  'equitable-mobility-audit': p => <EquitableMobilityAudit id={p.id} now={p.now} />,
};

export function TransportShell({ id, surface, now, role, withheld = [] }: {
  id: string; surface: TransportSurfaceId; now: number; role: SovereignRole; withheld?: Capability[];
}) {
  const domain = domainBySurface(surface);
  const render = RENDER[surface];
  return (
    <div className="space-y-2 p-2"
      style={{ background: TRANSPORT_DS.asphalt, boxShadow: 'inset 0 0 90px rgba(0,0,0,0.65)' }}>
      {render ? render({ id, now, role, withheld }) : <MobilityCommandTheater id={id} now={now} />}
      <FederationStrip />
      <RuntimeQueue
        scope={`transport:${surface}`}
        kind={domain?.archetype === 'emergency' ? 'incident' : domain?.archetype === 'portal' ? 'permit' : 'approval'}
        title={`${domain?.label ?? 'Transport'} runtime — ${INFRASTRUCTURE_CLOSURE.title}`}
        by="Corridor Officer"
        role={role}
        withheld={withheld} />
      <CorridorSeal maxim="Viae publicae · roads belong to the people" />
    </div>
  );
}
