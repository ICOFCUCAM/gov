'use client';

// apps/presidency/shell — Executive Mansion shell. Dispatches all 30
// Presidency surfaces through the dedicated Mansion design system.

import * as React from 'react';
import { RuntimeQueue } from '@/components/features/RuntimeQueue';
import { PRESIDENCY_DS, MansionSeal } from '@/apps/presidency/design-system/presidency-ds';
import { domainBySurface, type PresidencySurfaceId } from '@/apps/presidency/core/domains';
import { FederationStrip } from '@/apps/presidency/federation/federation';
import { EXECUTIVE_ORDER } from '@/apps/presidency/workflows/presidency-workflows';

import { CabinetFloor, CabinetPosture, CabinetCohesion, CabinetCalendar, ExecutiveOrders, OrderDrafting, OrderArchive, CabinetResolutions, ResolutionDebate } from '@/apps/presidency/domains/CabinetOrders';
import { StateEngagements, StateVisits, DiplomaticCalls, SecurityCouncil, NationalStrategy, ContinuityOfGovernment, MinisterialCorps, AppointmentsBoard, RotationSchedule, CitizenAddress, PublicEngagements } from '@/apps/presidency/domains/EngagementsSecurity';
import { TransparencyReports, AssetDisclosures, RecordsPublication, SuccessionLine, CrisisHandover, PresidentialSafeguardsView, CabinetCollectiveResponsibility, CivilMilitaryDoctrine, AuditFabric, PresidentialRecordsAudit } from '@/apps/presidency/domains/TransparencyContinuity';

import type { SovereignRole, Capability } from '@/shared/permissions/rbac';

type Render = (p: { id: string; now: number; role: SovereignRole; withheld: Capability[] }) => React.ReactElement;

const RENDER: Record<PresidencySurfaceId, Render> = {
  'cabinet-floor':                      p => <CabinetFloor id={p.id} now={p.now} />,
  'cabinet-posture':                    p => <CabinetPosture id={p.id} now={p.now} />,
  'cabinet-cohesion':                   p => <CabinetCohesion id={p.id} now={p.now} />,
  'cabinet-calendar':                   p => <CabinetCalendar id={p.id} now={p.now} />,
  'executive-orders':                   p => <ExecutiveOrders id={p.id} now={p.now} />,
  'order-drafting':                     p => <OrderDrafting id={p.id} now={p.now} />,
  'order-archive':                      p => <OrderArchive id={p.id} now={p.now} />,
  'cabinet-resolutions':                p => <CabinetResolutions id={p.id} now={p.now} />,
  'resolution-debate':                  p => <ResolutionDebate id={p.id} now={p.now} />,
  'state-engagements':                  p => <StateEngagements id={p.id} now={p.now} />,
  'state-visits':                       p => <StateVisits id={p.id} now={p.now} />,
  'diplomatic-calls':                   p => <DiplomaticCalls id={p.id} now={p.now} />,
  'security-council':                   p => <SecurityCouncil id={p.id} now={p.now} />,
  'national-strategy':                  p => <NationalStrategy id={p.id} now={p.now} />,
  'continuity-of-government':           p => <ContinuityOfGovernment id={p.id} now={p.now} />,
  'ministerial-corps':                  p => <MinisterialCorps id={p.id} now={p.now} />,
  'appointments-board':                 p => <AppointmentsBoard id={p.id} now={p.now} />,
  'rotation-schedule':                  p => <RotationSchedule id={p.id} now={p.now} />,
  'citizen-address':                    p => <CitizenAddress id={p.id} now={p.now} />,
  'public-engagements':                 p => <PublicEngagements id={p.id} now={p.now} />,
  'transparency-reports':               p => <TransparencyReports id={p.id} now={p.now} />,
  'asset-disclosures':                  p => <AssetDisclosures id={p.id} now={p.now} />,
  'records-publication':                p => <RecordsPublication id={p.id} now={p.now} />,
  'succession-line':                    p => <SuccessionLine id={p.id} now={p.now} />,
  'crisis-handover':                    p => <CrisisHandover id={p.id} now={p.now} />,
  'presidential-safeguards':            p => <PresidentialSafeguardsView id={p.id} now={p.now} />,
  'cabinet-collective-responsibility':  p => <CabinetCollectiveResponsibility id={p.id} now={p.now} />,
  'civil-military-doctrine':            p => <CivilMilitaryDoctrine id={p.id} now={p.now} />,
  'audit-fabric':                       p => <AuditFabric id={p.id} now={p.now} />,
  'presidential-records-audit':         p => <PresidentialRecordsAudit id={p.id} now={p.now} />,
};

export function PresidencyShell({ id, surface, now, role, withheld = [] }: {
  id: string; surface: PresidencySurfaceId; now: number; role: SovereignRole; withheld?: Capability[];
}) {
  const domain = domainBySurface(surface);
  const render = RENDER[surface];
  return (
    <div className="space-y-2 p-2"
      style={{ background: PRESIDENCY_DS.midnight, boxShadow: 'inset 0 0 110px rgba(0,0,0,0.7)' }}>
      {render ? render({ id, now, role, withheld }) : <CabinetFloor id={id} now={now} />}
      <FederationStrip />
      <RuntimeQueue
        scope={`presidency:${surface}`}
        kind={domain?.archetype === 'orders' || domain?.archetype === 'resolutions' || domain?.archetype === 'ministers' ? 'approval' : domain?.archetype === 'engagements' || domain?.archetype === 'address' ? 'case' : 'approval'}
        title={`${domain?.label ?? 'Presidency'} runtime — ${EXECUTIVE_ORDER.title}`}
        by="Cabinet Secretary"
        role={role}
        withheld={withheld} />
      <MansionSeal maxim="Auctoritas est officium · authority is a service" />
    </div>
  );
}
