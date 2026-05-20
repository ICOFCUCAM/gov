'use client';

// apps/communications/shell — Topology Graph shell. Dispatches all 31
// Communications surfaces, blending 4 existing top-level subsystems
// with 25 new domains.

import * as React from 'react';
import { RuntimeQueue } from '@/components/features/RuntimeQueue';
import { COMMS_DS, TopologySeal } from '@/apps/communications/design-system/communications-ds';
import { domainBySurface, type CommsSurfaceId } from '@/apps/communications/core/domains';
import { FederationStrip } from '@/apps/communications/federation/federation';
import { CYBER_INCIDENT_RESPONSE } from '@/apps/communications/workflows/communications-workflows';

import { NationalConnectivityCommand } from '@/apps/communications/NationalConnectivityCommand';
import { CyberSecurityResilience } from '@/apps/communications/CyberSecurityResilience';
import { DigitalIdentitySpectrum } from '@/apps/communications/DigitalIdentitySpectrum';
import { CommsForesightPortal } from '@/apps/communications/CommsForesightPortal';

import { ConnectivityPosture, RegionalConnectivity, NetworkAssets, FiberTrunks, MobileTowers, SubmarineCables, SovereignCloud, DataCenters, RoutingHealth } from '@/apps/communications/domains/CommandInfrastructure';
import { CyberIncidents, SocOperations, ThreatIntelligence, EmergencyBroadcast, FailoverChannels, BroadcastStations, DigitalIdentity, AuthenticationBoard, CredentialRecovery } from '@/apps/communications/domains/CyberBroadcast';
import { SpectrumBands, MediaLandscape, PressIndependence, DemandForecast, SignalAnomalies, ServiceRequests, PublicAdvisories, CommunicationsSafeguards, PressIndependenceAudit } from '@/apps/communications/domains/SpectrumPortal';

import type { SovereignRole, Capability } from '@/shared/permissions/rbac';

type Render = (p: { id: string; now: number; role: SovereignRole; withheld: Capability[] }) => React.ReactElement;

const RENDER: Record<CommsSurfaceId, Render> = {
  // command
  'connectivity-command':      p => <NationalConnectivityCommand id={p.id} now={p.now} />,
  'connectivity-posture':      p => <ConnectivityPosture id={p.id} now={p.now} />,
  'regional-connectivity':     p => <RegionalConnectivity id={p.id} now={p.now} />,
  // infrastructure
  'network-assets':            p => <NetworkAssets id={p.id} now={p.now} />,
  'fiber-trunks':              p => <FiberTrunks id={p.id} now={p.now} />,
  'mobile-towers':             p => <MobileTowers id={p.id} now={p.now} />,
  'submarine-cables':          p => <SubmarineCables id={p.id} now={p.now} />,
  // cloud
  'sovereign-cloud':           p => <SovereignCloud id={p.id} now={p.now} />,
  'data-centers':              p => <DataCenters id={p.id} now={p.now} />,
  'routing-health':            p => <RoutingHealth id={p.id} now={p.now} />,
  // cyber
  'cyber-resilience':          p => <CyberSecurityResilience id={p.id} now={p.now} />,
  'cyber-incidents':           p => <CyberIncidents id={p.id} now={p.now} />,
  'soc-operations':            p => <SocOperations id={p.id} now={p.now} />,
  'threat-intelligence':       p => <ThreatIntelligence id={p.id} now={p.now} />,
  // broadcast
  'emergency-broadcast':       p => <EmergencyBroadcast id={p.id} now={p.now} />,
  'failover-channels':         p => <FailoverChannels id={p.id} now={p.now} />,
  'broadcast-stations':        p => <BroadcastStations id={p.id} now={p.now} />,
  // identity
  'digital-identity':          p => <DigitalIdentity id={p.id} now={p.now} />,
  'authentication-board':      p => <AuthenticationBoard id={p.id} now={p.now} />,
  'credential-recovery':       p => <CredentialRecovery id={p.id} now={p.now} />,
  // spectrum
  'identity-spectrum':         p => <DigitalIdentitySpectrum id={p.id} now={p.now} />,
  'spectrum-bands':            p => <SpectrumBands id={p.id} now={p.now} />,
  'media-landscape':           p => <MediaLandscape id={p.id} now={p.now} />,
  'press-independence':        p => <PressIndependence id={p.id} now={p.now} />,
  // intelligence
  'foresight-portal':          p => <CommsForesightPortal id={p.id} now={p.now} />,
  'demand-forecast':           p => <DemandForecast id={p.id} now={p.now} />,
  'signal-anomalies':          p => <SignalAnomalies id={p.id} now={p.now} />,
  // portal
  'service-requests':          p => <ServiceRequests id={p.id} now={p.now} />,
  'public-advisories':         p => <PublicAdvisories id={p.id} now={p.now} />,
  // oversight
  'communications-safeguards': p => <CommunicationsSafeguards id={p.id} now={p.now} />,
  'press-independence-audit':  p => <PressIndependenceAudit id={p.id} now={p.now} />,
};

export function CommunicationsShell({ id, surface, now, role, withheld = [] }: {
  id: string; surface: CommsSurfaceId; now: number; role: SovereignRole; withheld?: Capability[];
}) {
  const domain = domainBySurface(surface);
  const render = RENDER[surface];
  return (
    <div className="space-y-2 p-2"
      style={{ background: COMMS_DS.carbon, boxShadow: 'inset 0 0 90px rgba(0,0,0,0.65)' }}>
      {render ? render({ id, now, role, withheld }) : <NationalConnectivityCommand id={id} now={now} />}
      <FederationStrip />
      <RuntimeQueue
        scope={`comms:${surface}`}
        kind={domain?.archetype === 'cyber' ? 'incident' : domain?.archetype === 'broadcast' ? 'incident' : domain?.archetype === 'spectrum' || domain?.archetype === 'identity' ? 'permit' : 'approval'}
        title={`${domain?.label ?? 'Communications'} runtime — ${CYBER_INCIDENT_RESPONSE.title}`}
        by="Network Officer"
        role={role}
        withheld={withheld} />
      <TopologySeal maxim="Civitas conexa · the connected polity" />
    </div>
  );
}
