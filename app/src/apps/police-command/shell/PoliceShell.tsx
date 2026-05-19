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

import type { SovereignRole, Capability } from '@/shared/permissions/rbac';

function renderSurface(
  surface: PoliceSurfaceId, id: string, now: number, accent: string,
  role: SovereignRole, withheld: Capability[],
): React.ReactNode {
  switch (surface) {
    case 'strategic-command': return <PoliceCommand id={id} now={now} />;
    case 'investigations': return <InvestigationsCommand id={id} now={now} />;
    case 'intelligence': return <IntelligenceCommand id={id} now={now} />;
    case 'cyber': return <CyberCommand id={id} now={now} />;
    case 'operational-runtime': return <OperationalRuntime id={id} now={now} accent={accent} role={role} withheld={withheld} />;
    case 'dispatch': return <DispatchDeployment id={id} now={now} accent={accent} role={role} withheld={withheld} />;
    case 'institutional-federation': return <InstitutionalFederation id={id} now={now} accent={accent} />;
    case 'facility-network': return <FacilityNetwork id={id} now={now} accent={accent} />;
    case 'workflow-engine': return <WorkflowEngine id={id} role={role} withheld={withheld} />;
    case 'citizen-services': return <CitizenServices id={id} now={now} accent={accent} />;
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
