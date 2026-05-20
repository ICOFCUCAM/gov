'use client';

// apps/police-command/shell — the dedicated Police Command layout engine.
//
// Renders the active sovereign domain through the Police design system,
// applies the Interior-OS federation contract where relevant, carries the
// civil-stability orchestration posture and the actor chain strip. One
// coherent law-enforcement operating system.

import * as React from 'react';
import { policeOps } from '@/lib/gov/agency-systems';
import { ActorChainStrip } from '@/apps/_shared/InstitutionChain';
import { PoliceDomainFrame, POLICE_DS } from '@/apps/police-command/design-system/police-ds';
import { PoliceFederatedMount, PoliceFederatedBadge } from '@/apps/police-command/federation/federation';
import type { PoliceDomain, PoliceSurfaceId } from '@/apps/police-command/core/domains';

import { PoliceCommand } from '@/apps/police-command/PoliceCommand';
import { InvestigationsCommand } from '@/apps/police-command/InvestigationsCommand';
import { IntelligenceCommand } from '@/apps/police-command/IntelligenceCommand';
import { CyberCommand } from '@/apps/police-command/CyberCommand';
import { OperationalRuntime } from '@/apps/police-command/domains/OperationalRuntime';
import { DispatchDeployment } from '@/apps/police-command/domains/DispatchDeployment';
import { InstitutionalFederation } from '@/apps/police-command/domains/InstitutionalFederation';
import { FacilityNetwork } from '@/apps/police-command/domains/FacilityNetwork';
import { WorkflowEngine } from '@/apps/police-command/domains/WorkflowEngine';
import { CitizenServices } from '@/apps/police-command/domains/CitizenServices';
import { ConstitutionalOversight } from '@/apps/police-command/domains/ConstitutionalOversight';
import { SovereignAuditChain } from '@/apps/police-command/domains/SovereignAuditChain';
import {
  WatchCommander, CallStackQueue, TacticalDeployment, TrafficEnforcement, K9Operations,
} from '@/apps/police-command/domains/PatrolResponse';
import {
  HomicideCaseload, ViolentCrimeBoard, OrganisedCrimeFusion, NarcoticsOperations, MissingPersons,
} from '@/apps/police-command/domains/InvestigationLines';
import {
  ForensicsLab, EvidenceCustody, CrimeSceneCoordination,
} from '@/apps/police-command/domains/Forensics';
import {
  ProtestPosture, PublicEventSecurity,
} from '@/apps/police-command/domains/PublicOrder';
import {
  VictimSupport, DomesticIncidentResponse, YouthSafeguarding,
} from '@/apps/police-command/domains/CommunityService';
import {
  InternalAffairsBoard, UseOfForceReview, ComplaintsTribunal,
} from '@/apps/police-command/domains/InternalAffairs';

import type { SovereignRole, Capability } from '@/shared/permissions/rbac';

function renderSurface(
  surface: PoliceSurfaceId, id: string, now: number, accent: string,
  role: SovereignRole, withheld: Capability[],
): React.ReactNode {
  switch (surface) {
    // Command
    case 'strategic-command': return <PoliceCommand id={id} now={now} />;
    case 'operational-runtime': return <OperationalRuntime id={id} now={now} accent={accent} role={role} withheld={withheld} />;
    case 'dispatch': return <DispatchDeployment id={id} now={now} accent={accent} role={role} withheld={withheld} />;
    case 'watch-commander': return <WatchCommander id={id} now={now} accent={accent} />;
    case 'call-stack': return <CallStackQueue id={id} now={now} accent={accent} />;
    case 'tactical-deployment': return <TacticalDeployment id={id} now={now} accent={accent} />;
    case 'traffic-enforcement': return <TrafficEnforcement id={id} now={now} accent={accent} />;
    case 'k9-operations': return <K9Operations id={id} now={now} accent={accent} />;
    // Investigative
    case 'investigations': return <InvestigationsCommand id={id} now={now} />;
    case 'intelligence': return <IntelligenceCommand id={id} now={now} />;
    case 'cyber': return <CyberCommand id={id} now={now} />;
    case 'homicide-caseload': return <HomicideCaseload id={id} now={now} accent={accent} />;
    case 'violent-crime': return <ViolentCrimeBoard id={id} now={now} accent={accent} />;
    case 'organised-crime-fusion': return <OrganisedCrimeFusion id={id} now={now} accent={accent} />;
    case 'narcotics-operations': return <NarcoticsOperations id={id} now={now} accent={accent} />;
    case 'missing-persons': return <MissingPersons id={id} now={now} accent={accent} />;
    // Forensics
    case 'forensics-lab': return <ForensicsLab id={id} now={now} accent={accent} />;
    case 'evidence-custody': return <EvidenceCustody id={id} now={now} accent={accent} />;
    case 'crime-scene': return <CrimeSceneCoordination id={id} now={now} accent={accent} />;
    // Public Order
    case 'protest-posture': return <ProtestPosture id={id} now={now} accent={accent} />;
    case 'public-event-security': return <PublicEventSecurity id={id} now={now} accent={accent} />;
    // Community
    case 'victim-support': return <VictimSupport id={id} now={now} accent={accent} />;
    case 'domestic-incident': return <DomesticIncidentResponse id={id} now={now} accent={accent} />;
    case 'youth-safeguarding': return <YouthSafeguarding id={id} now={now} accent={accent} />;
    // Internal Affairs
    case 'internal-affairs': return <InternalAffairsBoard id={id} now={now} accent={accent} />;
    case 'use-of-force-review': return <UseOfForceReview id={id} now={now} accent={accent} />;
    case 'complaints-tribunal': return <ComplaintsTribunal id={id} now={now} accent={accent} />;
    // Federation
    case 'institutional-federation': return <InstitutionalFederation id={id} now={now} accent={accent} />;
    case 'facility-network': return <FacilityNetwork id={id} now={now} accent={accent} />;
    case 'workflow-engine': return <WorkflowEngine id={id} role={role} withheld={withheld} />;
    case 'citizen-services': return <CitizenServices id={id} now={now} accent={accent} />;
    // Oversight
    case 'constitutional-oversight': return <ConstitutionalOversight id={id} now={now} accent={accent} />;
    case 'audit-chain': return <SovereignAuditChain id={id} />;
  }
}

export function PoliceShell({ domain, appId, now, role, withheld }: {
  domain: PoliceDomain;
  appId: string;
  now: number;
  role: SovereignRole;
  withheld: Capability[];
}) {
  const o = policeOps(appId, now / 4000);
  const postureTone = o.activeIncidents > 90 ? 'alert' : o.activeIncidents > 40 || o.meanResponseMin >= 18 ? 'warn' : 'ok';
  const postureColor = postureTone === 'alert' ? 'rgb(var(--c-alert))' : postureTone === 'warn' ? 'rgb(var(--c-warn))' : 'rgb(var(--c-ok))';
  const postureLabel = postureTone === 'alert' ? 'CRITICAL' : postureTone === 'warn' ? 'ENGAGED' : 'STABLE';

  return (
    <div
      className="space-y-2 rounded-[5px] p-2"
      style={{ background: POLICE_DS.bg, boxShadow: 'inset 0 0 90px rgba(0,0,0,0.6)' }}>
      <div
        className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-[4px] border px-3 py-1.5 text-[10px]"
        style={{ borderColor: `color-mix(in srgb,${POLICE_DS.shellAccent} 22%,${POLICE_DS.line})` }}>
        <span className="text-[9px] font-semibold uppercase tracking-[0.18em]" style={{ color: POLICE_DS.shellAccent }}>
          Police Command · Sovereign Civil-Stability OS
        </span>
        <span className="flex items-center gap-1 text-ink-muted">
          Posture <span className="font-semibold uppercase" style={{ color: postureColor }}>{postureLabel}</span>
        </span>
        <span className="text-ink-muted">Active incidents <span className="font-semibold tabular-nums text-ink">{o.activeIncidents}</span></span>
        <span className="text-ink-muted">Clearance <span className="font-semibold tabular-nums text-ink">{o.clearanceRatePct}%</span></span>
        <span className="ml-auto text-ink-muted">Units <span className="font-semibold tabular-nums text-ink">{o.unitsDeployed}/{o.unitsTotal}</span></span>
      </div>

      <PoliceDomainFrame domain={domain} badge={domain.federation ? <PoliceFederatedBadge /> : null}>
        {domain.federation
          ? <PoliceFederatedMount federation={domain.federation}>{renderSurface(domain.surface, appId, now, domain.accent, role, withheld)}</PoliceFederatedMount>
          : renderSurface(domain.surface, appId, now, domain.accent, role, withheld)}
      </PoliceDomainFrame>

      <ActorChainStrip ministryKey="INTERIOR" idKey={appId} now={now} accent={POLICE_DS.shellAccent} recordPrefix="CASE" />
    </div>
  );
}
