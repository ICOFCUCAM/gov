'use client';

// apps/ministry-labour/shell — Workforce Flow shell. Dispatches all 34
// Labour surfaces, blending 7 existing top-level subsystems with 24
// new domains.

import * as React from 'react';
import { RuntimeQueue } from '@/components/features/RuntimeQueue';
import { LABOUR_DS, WorkforceSeal } from '@/apps/ministry-labour/design-system/labour-ds';
import { domainBySurface, type LabourSurfaceId } from '@/apps/ministry-labour/core/domains';
import { FederationStrip } from '@/apps/ministry-labour/federation/federation';
import { UNEMPLOYMENT_BENEFIT_DISBURSEMENT } from '@/apps/ministry-labour/workflows/labour-workflows';

import { NationalWorkforceCommand } from '@/apps/ministry-labour/NationalWorkforceCommand';
import { SocialProtectionSystems } from '@/apps/ministry-labour/SocialProtectionSystems';
import { DemographicLaborAnalytics } from '@/apps/ministry-labour/DemographicLaborAnalytics';
import { SocialContinuityCrisis } from '@/apps/ministry-labour/SocialContinuityCrisis';
import { LabourEmergencyRecovery } from '@/apps/ministry-labour/LabourEmergencyRecovery';
import { WorkplaceSafetyRights } from '@/apps/ministry-labour/WorkplaceSafetyRights';
import { PublicLabourPortal } from '@/apps/ministry-labour/PublicLabourPortal';

import { EmploymentBoard, SectorAllocation, RegionalWorkforce, BenefitsProgrammes, PensionBoard, WorkplaceInspections, OccupationalIncidents, TribunalLanes } from '@/apps/ministry-labour/domains/WorkforceProtection';
import { AgeCohorts, SkillsPipeline, EmploymentCoordination, SocialPressureRegister, IndustrialClosures, RedeploymentCorridors, EmergencyProgrammes } from '@/apps/ministry-labour/domains/DemographicEmergency';
import { DemandForecast, LabourMarketAnomalies, EmploymentApplications, PensionRequests, LabourComplaints, VocationalEnrolments, LabourAdvisories, LabourSafeguards, WorkplaceSafetyAudit } from '@/apps/ministry-labour/domains/IntelligencePortal';

import type { SovereignRole, Capability } from '@/shared/permissions/rbac';

type Render = (p: { id: string; now: number; role: SovereignRole; withheld: Capability[] }) => React.ReactElement;

const RENDER: Record<LabourSurfaceId, Render> = {
  // workforce
  'workforce-command':       p => <NationalWorkforceCommand id={p.id} now={p.now} />,
  'employment-board':        p => <EmploymentBoard id={p.id} now={p.now} />,
  'sector-allocation':       p => <SectorAllocation id={p.id} now={p.now} />,
  'regional-workforce':      p => <RegionalWorkforce id={p.id} now={p.now} />,
  // protection
  'social-protection':       p => <SocialProtectionSystems id={p.id} now={p.now} />,
  'benefits-programmes':     p => <BenefitsProgrammes id={p.id} now={p.now} />,
  'pension-board':           p => <PensionBoard id={p.id} now={p.now} />,
  // rights
  'workplace-rights':        p => <WorkplaceSafetyRights id={p.id} now={p.now} />,
  'workplace-inspections':   p => <WorkplaceInspections id={p.id} now={p.now} />,
  'occupational-incidents':  p => <OccupationalIncidents id={p.id} now={p.now} />,
  'tribunal-lanes':          p => <TribunalLanes id={p.id} now={p.now} />,
  // demographic
  'demographic-analytics':   p => <DemographicLaborAnalytics id={p.id} now={p.now} />,
  'age-cohorts':             p => <AgeCohorts id={p.id} now={p.now} />,
  'skills-pipeline':         p => <SkillsPipeline id={p.id} now={p.now} />,
  'employment-coordination': p => <EmploymentCoordination id={p.id} now={p.now} />,
  // continuity
  'social-continuity':       p => <SocialContinuityCrisis id={p.id} now={p.now} />,
  'social-pressure-register':p => <SocialPressureRegister id={p.id} now={p.now} />,
  // emergency
  'labour-emergency':        p => <LabourEmergencyRecovery id={p.id} now={p.now} />,
  'industrial-closures':     p => <IndustrialClosures id={p.id} now={p.now} />,
  'redeployment-corridors':  p => <RedeploymentCorridors id={p.id} now={p.now} />,
  'emergency-programmes':    p => <EmergencyProgrammes id={p.id} now={p.now} />,
  // intelligence
  'workforce-foresight':     p => <DemandForecast id={p.id} now={p.now} />,
  'demand-forecast':         p => <DemandForecast id={p.id} now={p.now} />,
  'labour-market-anomalies': p => <LabourMarketAnomalies id={p.id} now={p.now} />,
  // portal
  'labour-portal':           p => <PublicLabourPortal id={p.id} now={p.now} />,
  'employment-applications': p => <EmploymentApplications id={p.id} now={p.now} />,
  'pension-requests':        p => <PensionRequests id={p.id} now={p.now} />,
  'labour-complaints':       p => <LabourComplaints id={p.id} now={p.now} />,
  'vocational-enrolments':   p => <VocationalEnrolments id={p.id} now={p.now} />,
  'labour-advisories':       p => <LabourAdvisories id={p.id} now={p.now} />,
  // legacy
  'social-continuity-crisis':p => <SocialContinuityCrisis id={p.id} now={p.now} />,
  'labour-recovery':         p => <LabourEmergencyRecovery id={p.id} now={p.now} />,
  // oversight
  'labour-safeguards':       p => <LabourSafeguards id={p.id} now={p.now} />,
  'workplace-safety-audit':  p => <WorkplaceSafetyAudit id={p.id} now={p.now} />,
};

export function LabourShell({ id, surface, now, role, withheld = [] }: {
  id: string; surface: LabourSurfaceId; now: number; role: SovereignRole; withheld?: Capability[];
}) {
  const domain = domainBySurface(surface);
  const render = RENDER[surface];
  return (
    <div className="space-y-2 p-2"
      style={{ background: LABOUR_DS.slate, boxShadow: 'inset 0 0 90px rgba(0,0,0,0.65)' }}>
      {render ? render({ id, now, role, withheld }) : <NationalWorkforceCommand id={id} now={now} />}
      <FederationStrip />
      <RuntimeQueue
        scope={`labour:${surface}`}
        kind={domain?.archetype === 'rights' ? 'case' : domain?.archetype === 'protection' || domain?.archetype === 'portal' ? 'permit' : domain?.archetype === 'emergency' ? 'incident' : 'approval'}
        title={`${domain?.label ?? 'Labour'} runtime — ${UNEMPLOYMENT_BENEFIT_DISBURSEMENT.title}`}
        by="Labour Officer"
        role={role}
        withheld={withheld} />
      <WorkforceSeal maxim="Dignitas operis · the dignity of work" />
    </div>
  );
}
