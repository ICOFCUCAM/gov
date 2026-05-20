'use client';

// apps/ministry-education/shell — Lecture Hall shell. Dispatches all 34
// Education surfaces, blending 4 existing top-level subsystems with 28
// new domains.

import * as React from 'react';
import { RuntimeQueue } from '@/components/features/RuntimeQueue';
import { EDUCATION_DS, HallSeal } from '@/apps/ministry-education/design-system/education-ds';
import { domainBySurface, type EducationSurfaceId } from '@/apps/ministry-education/core/domains';
import { FederationStrip } from '@/apps/ministry-education/federation/federation';
import { CURRICULUM_REVIEW } from '@/apps/ministry-education/workflows/education-workflows';

import { NationalEducationCommand } from '@/apps/ministry-education/NationalEducationCommand';
import { InstitutionsResearchLineage } from '@/apps/ministry-education/InstitutionsResearchLineage';
import { KnowledgeInfrastructure } from '@/apps/ministry-education/KnowledgeInfrastructure';
import { ContinuityForesightChamber } from '@/apps/ministry-education/ContinuityForesightChamber';

import { LiteracyBoard, RegionalLiteracy, PrimarySecondary, Tertiary, TeacherColleges, GenerationalCohorts, WorkforceReadiness, CohortEquality } from '@/apps/ministry-education/domains/CommandInstitutions';
import { ResearchProgrammes, StrategicResearchPriority, RemoteLearning, ArchivalRecords, BandwidthEquity, CurriculumBoard, ExaminationBoard, TeacherWorkforce, StudentServicesBoard } from '@/apps/ministry-education/domains/ResearchKnowledge';
import { EducationIncidents, SchoolDisruption, ExamIntegrity, CivilizationalMemoryBoard, HistoricalArchives, ConstitutionalLiteracy, CivicEducation, StudentApplications, ScholarshipPortal, PublicAdvisories, KnowledgeSafeguards, PluralismAudit } from '@/apps/ministry-education/domains/ContinuityMemory';

import type { SovereignRole, Capability } from '@/shared/permissions/rbac';

type Render = (p: { id: string; now: number; role: SovereignRole; withheld: Capability[] }) => React.ReactElement;

const RENDER: Record<EducationSurfaceId, Render> = {
  // command
  'education-command':            p => <NationalEducationCommand id={p.id} now={p.now} />,
  'literacy-board':               p => <LiteracyBoard id={p.id} now={p.now} />,
  'regional-literacy':            p => <RegionalLiteracy id={p.id} now={p.now} />,
  // institutions
  'institutions-lineage':         p => <InstitutionsResearchLineage id={p.id} now={p.now} />,
  'primary-secondary':            p => <PrimarySecondary id={p.id} now={p.now} />,
  'tertiary':                     p => <Tertiary id={p.id} now={p.now} />,
  'teacher-colleges':             p => <TeacherColleges id={p.id} now={p.now} />,
  // cohorts
  'generational-cohorts':         p => <GenerationalCohorts id={p.id} now={p.now} />,
  'workforce-readiness':          p => <WorkforceReadiness id={p.id} now={p.now} />,
  'cohort-equality':              p => <CohortEquality id={p.id} now={p.now} />,
  // research
  'research-lineage':             p => <InstitutionsResearchLineage id={p.id} now={p.now} />,
  'research-programmes':          p => <ResearchProgrammes id={p.id} now={p.now} />,
  'strategic-research-priority':  p => <StrategicResearchPriority id={p.id} now={p.now} />,
  // knowledge
  'knowledge-infrastructure':     p => <KnowledgeInfrastructure id={p.id} now={p.now} />,
  'remote-learning':              p => <RemoteLearning id={p.id} now={p.now} />,
  'archival-records':             p => <ArchivalRecords id={p.id} now={p.now} />,
  'bandwidth-equity':             p => <BandwidthEquity id={p.id} now={p.now} />,
  // curriculum
  'curriculum-board':             p => <CurriculumBoard id={p.id} now={p.now} />,
  'examination-board':            p => <ExaminationBoard id={p.id} now={p.now} />,
  'teacher-workforce':            p => <TeacherWorkforce id={p.id} now={p.now} />,
  'student-services':             p => <StudentServicesBoard id={p.id} now={p.now} />,
  // continuity
  'continuity-chamber':           p => <ContinuityForesightChamber id={p.id} now={p.now} />,
  'education-incidents':          p => <EducationIncidents id={p.id} now={p.now} />,
  'school-disruption':            p => <SchoolDisruption id={p.id} now={p.now} />,
  'exam-integrity':               p => <ExamIntegrity id={p.id} now={p.now} />,
  // memory
  'civilizational-memory':        p => <CivilizationalMemoryBoard id={p.id} now={p.now} />,
  'historical-archives':          p => <HistoricalArchives id={p.id} now={p.now} />,
  'constitutional-literacy':      p => <ConstitutionalLiteracy id={p.id} now={p.now} />,
  'civic-education':               p => <CivicEducation id={p.id} now={p.now} />,
  // portal
  'student-applications':         p => <StudentApplications id={p.id} now={p.now} />,
  'scholarship-portal':           p => <ScholarshipPortal id={p.id} now={p.now} />,
  'public-advisories':            p => <PublicAdvisories id={p.id} now={p.now} />,
  // oversight
  'knowledge-safeguards':         p => <KnowledgeSafeguards id={p.id} now={p.now} />,
  'pluralism-audit':              p => <PluralismAudit id={p.id} now={p.now} />,
};

export function EducationShell({ id, surface, now, role, withheld = [] }: {
  id: string; surface: EducationSurfaceId; now: number; role: SovereignRole; withheld?: Capability[];
}) {
  const domain = domainBySurface(surface);
  const render = RENDER[surface];
  return (
    <div className="space-y-2 p-2"
      style={{ background: EDUCATION_DS.ink, boxShadow: 'inset 0 0 90px rgba(0,0,0,0.65)' }}>
      {render ? render({ id, now, role, withheld }) : <NationalEducationCommand id={id} now={now} />}
      <FederationStrip />
      <RuntimeQueue
        scope={`education:${surface}`}
        kind={domain?.archetype === 'research' ? 'approval' : domain?.archetype === 'continuity' ? 'incident' : domain?.archetype === 'portal' ? 'permit' : 'approval'}
        title={`${domain?.label ?? 'Education'} runtime — ${CURRICULUM_REVIEW.title}`}
        by="Education Officer"
        role={role}
        withheld={withheld} />
      <HallSeal maxim="Mens sana civitatis · the cultivated mind of the polity" />
    </div>
  );
}
