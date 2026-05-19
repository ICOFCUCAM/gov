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
