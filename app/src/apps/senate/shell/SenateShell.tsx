'use client';

// apps/senate/shell — Upper Chamber shell. Dispatches all 31 Senate
// surfaces through the dedicated Chamber Floor design system.

import * as React from 'react';
import { RuntimeQueue } from '@/components/features/RuntimeQueue';
import { SENATE_DS, ChamberSeal } from '@/apps/senate/design-system/senate-ds';
import { domainBySurface, type SenateSurfaceId } from '@/apps/senate/core/domains';
import { FederationStrip } from '@/apps/senate/federation/federation';
import { TREATY_RATIFICATION } from '@/apps/senate/workflows/senate-workflows';

import { SenateFloor, PlenaryPosture, SenatorsRegister, VotingBlocs, BillPipeline, SecondReading, AmendmentDocket, ConferenceCommittee } from '@/apps/senate/domains/ChamberBills';
import { TreatyAtlas, RatificationQueue, PublicConsultation, StandingCommittees, SpecialCommittees, Inquiries, ExecutiveOversight, QuestionTime, CabinetAppearance } from '@/apps/senate/domains/TreatiesCommittees';
import { Hansard, RollCallRecords, SessionsCalendar, StrategicForesight, LongHorizonReview, CitizenPetitions, WatchLive, SenatorsDirectory, CodeOfConduct, ConflictsOfInterest, MisconductTribunal, SenateSafeguards, OverrideDoctrine, SovereignAudit } from '@/apps/senate/domains/RecordsEthics';

import type { SovereignRole, Capability } from '@/shared/permissions/rbac';

type Render = (p: { id: string; now: number; role: SovereignRole; withheld: Capability[] }) => React.ReactElement;

const RENDER: Record<SenateSurfaceId, Render> = {
  'senate-floor':          p => <SenateFloor id={p.id} now={p.now} />,
  'plenary-posture':       p => <PlenaryPosture id={p.id} now={p.now} />,
  'senators-register':     p => <SenatorsRegister id={p.id} now={p.now} />,
  'voting-blocs':          p => <VotingBlocs id={p.id} now={p.now} />,
  'bill-pipeline':         p => <BillPipeline id={p.id} now={p.now} />,
  'second-reading':        p => <SecondReading id={p.id} now={p.now} />,
  'amendment-docket':      p => <AmendmentDocket id={p.id} now={p.now} />,
  'conference-committee':  p => <ConferenceCommittee id={p.id} now={p.now} />,
  'treaty-atlas':          p => <TreatyAtlas id={p.id} now={p.now} />,
  'ratification-queue':    p => <RatificationQueue id={p.id} now={p.now} />,
  'public-consultation':   p => <PublicConsultation id={p.id} now={p.now} />,
  'standing-committees':   p => <StandingCommittees id={p.id} now={p.now} />,
  'special-committees':    p => <SpecialCommittees id={p.id} now={p.now} />,
  'inquiries':             p => <Inquiries id={p.id} now={p.now} />,
  'executive-oversight':   p => <ExecutiveOversight id={p.id} now={p.now} />,
  'question-time':         p => <QuestionTime id={p.id} now={p.now} />,
  'cabinet-appearance':    p => <CabinetAppearance id={p.id} now={p.now} />,
  'hansard':               p => <Hansard id={p.id} now={p.now} />,
  'roll-call-records':     p => <RollCallRecords id={p.id} now={p.now} />,
  'sessions-calendar':     p => <SessionsCalendar id={p.id} now={p.now} />,
  'strategic-foresight':   p => <StrategicForesight id={p.id} now={p.now} />,
  'long-horizon-review':   p => <LongHorizonReview id={p.id} now={p.now} />,
  'citizen-petitions':     p => <CitizenPetitions id={p.id} now={p.now} />,
  'watch-live':            p => <WatchLive id={p.id} now={p.now} />,
  'senators-directory':    p => <SenatorsDirectory id={p.id} now={p.now} />,
  'code-of-conduct':       p => <CodeOfConduct id={p.id} now={p.now} />,
  'conflicts-of-interest': p => <ConflictsOfInterest id={p.id} now={p.now} />,
  'misconduct-tribunal':   p => <MisconductTribunal id={p.id} now={p.now} />,
  'senate-safeguards':     p => <SenateSafeguards id={p.id} now={p.now} />,
  'override-doctrine':     p => <OverrideDoctrine id={p.id} now={p.now} />,
  'sovereign-audit':       p => <SovereignAudit id={p.id} now={p.now} />,
};

export function SenateShell({ id, surface, now, role, withheld = [] }: {
  id: string; surface: SenateSurfaceId; now: number; role: SovereignRole; withheld?: Capability[];
}) {
  const domain = domainBySurface(surface);
  const render = RENDER[surface];
  return (
    <div className="space-y-2 p-2"
      style={{ background: SENATE_DS.aubergine, boxShadow: 'inset 0 0 110px rgba(0,0,0,0.7)' }}>
      {render ? render({ id, now, role, withheld }) : <SenateFloor id={id} now={now} />}
      <FederationStrip />
      <RuntimeQueue
        scope={`senate:${surface}`}
        kind={domain?.archetype === 'treaties' ? 'approval' : domain?.archetype === 'committees' || domain?.archetype === 'oversight' ? 'case' : 'approval'}
        title={`${domain?.label ?? 'Senate'} runtime — ${TREATY_RATIFICATION.title}`}
        by="Parliamentary Secretary"
        role={role}
        withheld={withheld} />
      <ChamberSeal maxim="Senatus deliberans · the deliberating chamber" />
    </div>
  );
}
