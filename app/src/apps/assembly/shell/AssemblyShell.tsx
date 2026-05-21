'use client';

import * as React from 'react';
import { RuntimeQueue } from '@/components/features/RuntimeQueue';
import { ASSEMBLY_DS, FloorSeal } from '@/apps/assembly/design-system/assembly-ds';
import { domainBySurface, type AssemblySurfaceId } from '@/apps/assembly/core/domains';
import { FederationStrip } from '@/apps/assembly/federation/federation';
import { BUDGET_APPROPRIATION } from '@/apps/assembly/workflows/assembly-workflows';

import { AssemblyFloor, PlenaryPosture, MembersRegister, VotingBlocs, BillPipeline, FirstReading, ThirdReading, SentToSenate } from '@/apps/assembly/domains/ChamberBills';
import { BudgetCycle, AppropriationBill, AuditFindings, CitizenPetitions, PetitionDebateQueue, QuestionTime, MinisterialStatements, CabinetSummons } from '@/apps/assembly/domains/BudgetPetitions';
import { Hansard, RollCallRecords, SessionsCalendar, StandingCommittees, SelectCommittees, Inquiries, WatchLive, MembersDirectory, YouthParliament, CodeOfConduct, ConflictsOfInterest, MisconductTribunal, AssemblySafeguards, PublicVotingDoctrine, SovereignAudit } from '@/apps/assembly/domains/RecordsEthics';

import type { SovereignRole, Capability } from '@/shared/permissions/rbac';

type Render = (p: { id: string; now: number; role: SovereignRole; withheld: Capability[] }) => React.ReactElement;

const RENDER: Record<AssemblySurfaceId, Render> = {
  'assembly-floor':          p => <AssemblyFloor id={p.id} now={p.now} />,
  'plenary-posture':         p => <PlenaryPosture id={p.id} now={p.now} />,
  'members-register':        p => <MembersRegister id={p.id} now={p.now} />,
  'voting-blocs':            p => <VotingBlocs id={p.id} now={p.now} />,
  'bill-pipeline':           p => <BillPipeline id={p.id} now={p.now} />,
  'first-reading':           p => <FirstReading id={p.id} now={p.now} />,
  'third-reading':           p => <ThirdReading id={p.id} now={p.now} />,
  'sent-to-senate':          p => <SentToSenate id={p.id} now={p.now} />,
  'budget-cycle':            p => <BudgetCycle id={p.id} now={p.now} />,
  'appropriation-bill':      p => <AppropriationBill id={p.id} now={p.now} />,
  'audit-findings':          p => <AuditFindings id={p.id} now={p.now} />,
  'citizen-petitions':       p => <CitizenPetitions id={p.id} now={p.now} />,
  'petition-debate-queue':   p => <PetitionDebateQueue id={p.id} now={p.now} />,
  'question-time':           p => <QuestionTime id={p.id} now={p.now} />,
  'ministerial-statements':  p => <MinisterialStatements id={p.id} now={p.now} />,
  'cabinet-summons':         p => <CabinetSummons id={p.id} now={p.now} />,
  'hansard':                 p => <Hansard id={p.id} now={p.now} />,
  'roll-call-records':       p => <RollCallRecords id={p.id} now={p.now} />,
  'sessions-calendar':       p => <SessionsCalendar id={p.id} now={p.now} />,
  'standing-committees':     p => <StandingCommittees id={p.id} now={p.now} />,
  'select-committees':       p => <SelectCommittees id={p.id} now={p.now} />,
  'inquiries':               p => <Inquiries id={p.id} now={p.now} />,
  'watch-live':              p => <WatchLive id={p.id} now={p.now} />,
  'members-directory':       p => <MembersDirectory id={p.id} now={p.now} />,
  'youth-parliament':        p => <YouthParliament id={p.id} now={p.now} />,
  'code-of-conduct':         p => <CodeOfConduct id={p.id} now={p.now} />,
  'conflicts-of-interest':   p => <ConflictsOfInterest id={p.id} now={p.now} />,
  'misconduct-tribunal':     p => <MisconductTribunal id={p.id} now={p.now} />,
  'assembly-safeguards':     p => <AssemblySafeguards id={p.id} now={p.now} />,
  'public-voting-doctrine':  p => <PublicVotingDoctrine id={p.id} now={p.now} />,
  'sovereign-audit':         p => <SovereignAudit id={p.id} now={p.now} />,
};

export function AssemblyShell({ id, surface, now, role, withheld = [] }: {
  id: string; surface: AssemblySurfaceId; now: number; role: SovereignRole; withheld?: Capability[];
}) {
  const domain = domainBySurface(surface);
  const render = RENDER[surface];
  return (
    <div className="space-y-2 p-2"
      style={{ background: ASSEMBLY_DS.forest, boxShadow: 'inset 0 0 110px rgba(0,0,0,0.7)' }}>
      {render ? render({ id, now, role, withheld }) : <AssemblyFloor id={id} now={now} />}
      <FederationStrip />
      <RuntimeQueue
        scope={`assembly:${surface}`}
        kind={domain?.archetype === 'budget' ? 'procurement' : domain?.archetype === 'petitions' ? 'case' : domain?.archetype === 'oversight' ? 'case' : 'approval'}
        title={`${domain?.label ?? 'Assembly'} runtime — ${BUDGET_APPROPRIATION.title}`}
        by="Parliamentary Secretary"
        role={role}
        withheld={withheld} />
      <FloorSeal maxim="Vox populi · the voice of the people" />
    </div>
  );
}
