'use client';

// apps/emergency-response/shell — the National Emergency Operations Centre
// shell. Dispatches all 31 Emergency surfaces through the Crisis Theatre
// design system, layered over the existing engine.

import * as React from 'react';
import { RuntimeQueue } from '@/components/features/RuntimeQueue';
import { EMERGENCY_DS, TheatreSeal } from '@/apps/emergency-response/design-system/emergency-ds';
import { domainBySurface, type EmergencySurfaceId } from '@/apps/emergency-response/core/domains';
import { FederationStrip } from '@/apps/emergency-response/federation/federation';
import { INCIDENT_ACTIVATION } from '@/apps/emergency-response/workflows/emergency-workflows';

import { EmergencyCommand } from '@/apps/emergency-response/EmergencyCommand';
import { NationalEmergencyCommandCenter } from '@/apps/emergency-response/NationalEmergencyCommandCenter';
import { HumanitarianContinuityCoordination } from '@/apps/emergency-response/HumanitarianContinuityCoordination';
import { CrisisCommunicationsAlertNetwork } from '@/apps/emergency-response/CrisisCommunicationsAlertNetwork';
import { ResilienceRecoveryForesight } from '@/apps/emergency-response/ResilienceRecoveryForesight';

import { TheatreBoard, IncidentLedger, MobilisationRuntime, ResponderRoster, MutualAidBoard } from '@/apps/emergency-response/domains/TheatreMobilisation';
import { SearchAndRescue, FireSuppression, FloodRescue, MaritimeRescue, UrbanCollapse, InfrastructureContinuity, PowerRestoration, TransportCorridors, WaterSanitation } from '@/apps/emergency-response/domains/RescueContinuity';
import {
  ShelterNetwork, DisplacementRegistry, ReliefSupply,
  AlertNetwork, SmsCellBroadcast, MultilingualAdvisories,
  RecoveryProgrammes, ReconstructionBench,
  ResilienceForesight, NationalRiskBoard,
  AssetRegistry, TrainingReadiness,
  ConstitutionalSafeguards, AfterActionReview,
} from '@/apps/emergency-response/domains/HumanitarianRecovery';

import type { SovereignRole, Capability } from '@/shared/permissions/rbac';

type Render = (p: { id: string; now: number; role: SovereignRole; withheld: Capability[] }) => React.ReactElement;

const RENDER: Record<EmergencySurfaceId, Render> = {
  // theatre
  'crisis-command':           p => <EmergencyCommand id={p.id} now={p.now} />,
  'national-command-centre':  p => <NationalEmergencyCommandCenter id={p.id} now={p.now} />,
  'theatre-board':            p => <TheatreBoard id={p.id} now={p.now} />,
  'incident-ledger':          p => <IncidentLedger id={p.id} now={p.now} />,
  // mobilisation
  'mobilisation-runtime':     p => <MobilisationRuntime id={p.id} now={p.now} />,
  'responder-roster':         p => <ResponderRoster id={p.id} now={p.now} />,
  'mutual-aid-board':         p => <MutualAidBoard id={p.id} now={p.now} />,
  // rescue
  'search-and-rescue':        p => <SearchAndRescue id={p.id} now={p.now} />,
  'fire-suppression':         p => <FireSuppression id={p.id} now={p.now} />,
  'flood-rescue':             p => <FloodRescue id={p.id} now={p.now} />,
  'maritime-rescue':          p => <MaritimeRescue id={p.id} now={p.now} />,
  'urban-collapse':           p => <UrbanCollapse id={p.id} now={p.now} />,
  // continuity
  'infrastructure-continuity':p => <InfrastructureContinuity id={p.id} now={p.now} />,
  'power-restoration':        p => <PowerRestoration id={p.id} now={p.now} />,
  'transport-corridors':      p => <TransportCorridors id={p.id} now={p.now} />,
  'water-sanitation':         p => <WaterSanitation id={p.id} now={p.now} />,
  // humanitarian
  'humanitarian-continuity':  p => <HumanitarianContinuityCoordination id={p.id} now={p.now} />,
  'shelter-network':          p => <ShelterNetwork id={p.id} now={p.now} />,
  'displacement-registry':    p => <DisplacementRegistry id={p.id} now={p.now} />,
  'relief-supply':            p => <ReliefSupply id={p.id} now={p.now} />,
  // broadcast
  'alert-network':            p => <AlertNetwork id={p.id} now={p.now} />,
  'sms-cell-broadcast':       p => <SmsCellBroadcast id={p.id} now={p.now} />,
  'multilingual-advisories':  p => <MultilingualAdvisories id={p.id} now={p.now} />,
  // recovery
  'recovery-programmes':      p => <RecoveryProgrammes id={p.id} now={p.now} />,
  'reconstruction-bench':     p => <ReconstructionBench id={p.id} now={p.now} />,
  // foresight
  'resilience-foresight':     p => <ResilienceForesight id={p.id} now={p.now} />,
  'national-risk-board':      p => <NationalRiskBoard id={p.id} now={p.now} />,
  // registry
  'asset-registry':           p => <AssetRegistry id={p.id} now={p.now} />,
  'training-readiness':       p => <TrainingReadiness id={p.id} now={p.now} />,
  // oversight
  'constitutional-safeguards':p => <ConstitutionalSafeguards id={p.id} now={p.now} />,
  'after-action-review':      p => <AfterActionReview id={p.id} now={p.now} />,
};

// Reference legacy components to suppress unused warnings.
void CrisisCommunicationsAlertNetwork;
void ResilienceRecoveryForesight;

export function EmergencyShell({ id, surface, now, role, withheld = [] }: {
  id: string; surface: EmergencySurfaceId; now: number; role: SovereignRole; withheld?: Capability[];
}) {
  const domain = domainBySurface(surface);
  const render = RENDER[surface];
  return (
    <div className="space-y-2 p-2"
      style={{ background: EMERGENCY_DS.obsidian, boxShadow: 'inset 0 0 90px rgba(0,0,0,0.6)' }}>
      {render ? render({ id, now, role, withheld }) : <EmergencyCommand id={id} now={now} />}
      <FederationStrip />
      <RuntimeQueue
        scope={`emergency:${surface}`}
        kind="incident"
        title={`${domain?.label ?? 'Crisis'} runtime — ${INCIDENT_ACTIVATION.title}`}
        by="Crisis Coordinator"
        role={role}
        withheld={withheld} />
      <TheatreSeal maxim="Salus populi suprema lex · the welfare of the people is the supreme law" />
    </div>
  );
}
