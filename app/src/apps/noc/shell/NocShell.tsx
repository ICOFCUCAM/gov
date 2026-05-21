'use client';

// apps/noc/shell — National Operations Centre shell.

import * as React from 'react';
import { RuntimeQueue } from '@/components/features/RuntimeQueue';
import { NOC_DS, SituationSeal } from '@/apps/noc/design-system/noc-ds';
import { domainBySurface, type NocSurfaceId } from '@/apps/noc/core/domains';
import { FederationStrip } from '@/apps/noc/federation/federation';
import { CROSS_MINISTRY_COORDINATION } from '@/apps/noc/workflows/noc-workflows';

import { SituationRoom, NationalReadiness, CabinetSync, CrossDomainFabric, MinistryPosture, MinistryContribution, MinistryIncidents, MultiDomainWatch, SovereignTime, DutyRoster } from '@/apps/noc/domains/SituationMinistries';
import { IncidentFloor, MajorIncidents, RegionalRollup, CoordinationDecisions, RecommendationsPublished, CabinetRouted, PublicBriefing, BriefingArchive, Translations, PublicArchiveStream } from '@/apps/noc/domains/IncidentsDecisionsBriefing';
import { NationalContinuity, CogStatus, ContinuityExercises, IntelFusion, OpenSourceFusion, CyberPosture, NocSafeguardsView, CivilianCommandDoctrine, RationaleDoctrine, CabinetNonSubstitution } from '@/apps/noc/domains/ContinuityFusionSafeguards';

import type { SovereignRole, Capability } from '@/shared/permissions/rbac';

type Render = (p: { id: string; now: number; role: SovereignRole; withheld: Capability[] }) => React.ReactElement;

const RENDER: Record<NocSurfaceId, Render> = {
  'situation-room':            p => <SituationRoom id={p.id} now={p.now} />,
  'national-readiness':        p => <NationalReadiness id={p.id} now={p.now} />,
  'cabinet-sync':              p => <CabinetSync id={p.id} now={p.now} />,
  'cross-domain-fabric':       p => <CrossDomainFabric id={p.id} now={p.now} />,
  'ministry-posture':          p => <MinistryPosture id={p.id} now={p.now} />,
  'ministry-contribution':     p => <MinistryContribution id={p.id} now={p.now} />,
  'ministry-incidents':        p => <MinistryIncidents id={p.id} now={p.now} />,
  'incident-floor':            p => <IncidentFloor id={p.id} now={p.now} />,
  'major-incidents':           p => <MajorIncidents id={p.id} now={p.now} />,
  'regional-rollup':           p => <RegionalRollup id={p.id} now={p.now} />,
  'coordination-decisions':    p => <CoordinationDecisions id={p.id} now={p.now} />,
  'recommendations-published': p => <RecommendationsPublished id={p.id} now={p.now} />,
  'cabinet-routed':            p => <CabinetRouted id={p.id} now={p.now} />,
  'public-briefing':           p => <PublicBriefing id={p.id} now={p.now} />,
  'briefing-archive':          p => <BriefingArchive id={p.id} now={p.now} />,
  'translations':              p => <Translations id={p.id} now={p.now} />,
  'national-continuity':       p => <NationalContinuity id={p.id} now={p.now} />,
  'cog-status':                p => <CogStatus id={p.id} now={p.now} />,
  'continuity-exercises':      p => <ContinuityExercises id={p.id} now={p.now} />,
  'intel-fusion':              p => <IntelFusion id={p.id} now={p.now} />,
  'open-source-fusion':        p => <OpenSourceFusion id={p.id} now={p.now} />,
  'cyber-posture':             p => <CyberPosture id={p.id} now={p.now} />,
  'noc-safeguards':            p => <NocSafeguardsView id={p.id} now={p.now} />,
  'civilian-command-doctrine': p => <CivilianCommandDoctrine id={p.id} now={p.now} />,
  'rationale-doctrine':        p => <RationaleDoctrine id={p.id} now={p.now} />,
  'cabinet-non-substitution':  p => <CabinetNonSubstitution id={p.id} now={p.now} />,
  'multi-domain-watch':        p => <MultiDomainWatch id={p.id} now={p.now} />,
  'sovereign-time':            p => <SovereignTime id={p.id} now={p.now} />,
  'duty-roster':               p => <DutyRoster id={p.id} now={p.now} />,
  'public-archive':            p => <PublicArchiveStream id={p.id} now={p.now} />,
};

export function NocShell({ id, surface, now, role, withheld = [] }: {
  id: string; surface: NocSurfaceId; now: number; role: SovereignRole; withheld?: Capability[];
}) {
  const domain = domainBySurface(surface);
  const render = RENDER[surface];
  return (
    <div className="space-y-2 p-2" style={{ background: NOC_DS.graphiteDeep, boxShadow: 'inset 0 0 120px rgba(0,0,0,0.78)' }}>
      {render ? render({ id, now, role, withheld }) : <SituationRoom id={id} now={now} />}
      <FederationStrip />
      <RuntimeQueue
        scope={`noc:${surface}`}
        kind={domain?.archetype === 'incidents' ? 'incident' : domain?.archetype === 'decisions' ? 'approval' : 'case'}
        title={`${domain?.label ?? 'NOC'} runtime — ${CROSS_MINISTRY_COORDINATION.title}`}
        by="NOC Duty Officer"
        role={role}
        withheld={withheld} />
      <SituationSeal maxim="Conspectus rei publicae · the view of the whole" />
    </div>
  );
}
