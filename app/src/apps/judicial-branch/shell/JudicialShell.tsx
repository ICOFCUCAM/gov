'use client';

import * as React from 'react';
import { RuntimeQueue } from '@/components/features/RuntimeQueue';
import { JUDICIAL_DS, CourtSeal } from '@/apps/judicial-branch/design-system/judicial-ds';
import { domainBySurface, type JudicialSurfaceId } from '@/apps/judicial-branch/core/domains';
import { FederationStrip } from '@/apps/judicial-branch/federation/federation';
import { CONSTITUTIONAL_RULING } from '@/apps/judicial-branch/workflows/judicial-workflows';

import { ApexBench, ApexPosture, SeparationOfPowers, ConstitutionalCourt, SupremeCourt, AppealsCourt, TrialCourt, Tribunals } from '@/apps/judicial-branch/domains/ApexCourts';
import { CaseDocket, ConstitutionalCases, CriminalAppeals, CivilAppeals, CommercialCases, JusticesRegister, AppointmentsPipeline, TenureBoard, OpenReasoning, RecentDecisions, DoctrineLibrary, JudicialConduct, CivilianPanelReviews, ConductTribunal } from '@/apps/judicial-branch/domains/CasesJustices';
import { RightsFramework, CounselNetwork, LegalAidBench, WatchLive, CaseSearch, CourtLocator, CivicEducation, JudicialSafeguards, IndependenceAudit, ApexAudit } from '@/apps/judicial-branch/domains/RightsPortal';

import type { SovereignRole, Capability } from '@/shared/permissions/rbac';

type Render = (p: { id: string; now: number; role: SovereignRole; withheld: Capability[] }) => React.ReactElement;

const RENDER: Record<JudicialSurfaceId, Render> = {
  'apex-bench':             p => <ApexBench id={p.id} now={p.now} />,
  'apex-posture':           p => <ApexPosture id={p.id} now={p.now} />,
  'separation-of-powers':   p => <SeparationOfPowers id={p.id} now={p.now} />,
  'constitutional-court':   p => <ConstitutionalCourt id={p.id} now={p.now} />,
  'supreme-court':          p => <SupremeCourt id={p.id} now={p.now} />,
  'appeals-court':          p => <AppealsCourt id={p.id} now={p.now} />,
  'trial-court':            p => <TrialCourt id={p.id} now={p.now} />,
  'tribunals':              p => <Tribunals id={p.id} now={p.now} />,
  'case-docket':            p => <CaseDocket id={p.id} now={p.now} />,
  'constitutional-cases':   p => <ConstitutionalCases id={p.id} now={p.now} />,
  'criminal-appeals':       p => <CriminalAppeals id={p.id} now={p.now} />,
  'civil-appeals':          p => <CivilAppeals id={p.id} now={p.now} />,
  'commercial-cases':       p => <CommercialCases id={p.id} now={p.now} />,
  'justices-register':      p => <JusticesRegister id={p.id} now={p.now} />,
  'appointments-pipeline':  p => <AppointmentsPipeline id={p.id} now={p.now} />,
  'tenure-board':           p => <TenureBoard id={p.id} now={p.now} />,
  'open-reasoning':         p => <OpenReasoning id={p.id} now={p.now} />,
  'recent-decisions':       p => <RecentDecisions id={p.id} now={p.now} />,
  'doctrine-library':       p => <DoctrineLibrary id={p.id} now={p.now} />,
  'judicial-conduct':       p => <JudicialConduct id={p.id} now={p.now} />,
  'civilian-panel-reviews': p => <CivilianPanelReviews id={p.id} now={p.now} />,
  'conduct-tribunal':       p => <ConductTribunal id={p.id} now={p.now} />,
  'rights-framework':       p => <RightsFramework id={p.id} now={p.now} />,
  'counsel-network':        p => <CounselNetwork id={p.id} now={p.now} />,
  'legal-aid-bench':        p => <LegalAidBench id={p.id} now={p.now} />,
  'watch-live':             p => <WatchLive id={p.id} now={p.now} />,
  'case-search':            p => <CaseSearch id={p.id} now={p.now} />,
  'court-locator':          p => <CourtLocator id={p.id} now={p.now} />,
  'civic-education':        p => <CivicEducation id={p.id} now={p.now} />,
  'judicial-safeguards':    p => <JudicialSafeguards id={p.id} now={p.now} />,
  'independence-audit':     p => <IndependenceAudit id={p.id} now={p.now} />,
  'apex-audit':             p => <ApexAudit id={p.id} now={p.now} />,
};

export function JudicialShell({ id, surface, now, role, withheld = [] }: {
  id: string; surface: JudicialSurfaceId; now: number; role: SovereignRole; withheld?: Capability[];
}) {
  const domain = domainBySurface(surface);
  const render = RENDER[surface];
  return (
    <div className="space-y-2 p-2"
      style={{ background: JUDICIAL_DS.aubergine, boxShadow: 'inset 0 0 110px rgba(0,0,0,0.72)' }}>
      {render ? render({ id, now, role, withheld }) : <ApexBench id={id} now={now} />}
      <FederationStrip />
      <RuntimeQueue
        scope={`judicial:${surface}`}
        kind={domain?.archetype === 'conduct' ? 'case' : domain?.archetype === 'case' ? 'case' : 'case'}
        title={`${domain?.label ?? 'Judicial'} runtime — ${CONSTITUTIONAL_RULING.title}`}
        by="Court Officer"
        role={role}
        withheld={withheld} />
      <CourtSeal maxim="Lex aequo · justice without favour" />
    </div>
  );
}
