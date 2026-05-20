'use client';

// apps/ministry-health/shell — the sovereign Health layout engine.
// Dispatches all 30 Health domain surfaces through the Health design
// system. Subsystems with established UIs (Hospital, Doctor, Patient,
// Pharma, Lab, Disease, Emergency, Ward/OR, Finance, Regulatory,
// Citizen Portal, Research, Security, Simulation, Interoperability,
// Healthcare Grid, Situation Room, Command Centre, Executive
// Briefing) keep their existing renderers; new domains use the new
// clinical primitives.

import * as React from 'react';
import { RuntimeQueue } from '@/components/features/RuntimeQueue';
import { HEALTH_DS, ClinicalSeal } from '@/apps/ministry-health/design-system/health-ds';
import { domainBySurface, type SurfaceId } from '@/apps/ministry-health/core/domains';
import { FederationStrip } from '@/apps/ministry-health/federation/federation';
import { PATIENT_ADMISSION } from '@/apps/ministry-health/workflows/health-workflows';

// Existing subsystem surfaces
import { HealthCommandCentre } from '@/apps/ministry-health/subsystems/HealthCommandCentre';
import { NationalSituationRoom } from '@/apps/ministry-health/subsystems/NationalSituationRoom';
import { ExecutiveBriefingSystem } from '@/apps/ministry-health/subsystems/ExecutiveBriefingSystem';
import { HealthcareGridSystem } from '@/apps/ministry-health/subsystems/HealthcareGridSystem';
import { HospitalSystem } from '@/apps/ministry-health/subsystems/HospitalSystem';
import { DoctorSystem } from '@/apps/ministry-health/subsystems/DoctorSystem';
import { PatientSystem } from '@/apps/ministry-health/subsystems/PatientSystem';
import { PharmaceuticalSystem } from '@/apps/ministry-health/subsystems/PharmaceuticalSystem';
import { LaboratorySystem } from '@/apps/ministry-health/subsystems/LaboratorySystem';
import { DiseaseSystem } from '@/apps/ministry-health/subsystems/DiseaseSystem';
import { EmergencySystem } from '@/apps/ministry-health/subsystems/EmergencySystem';
import { WardSurgicalSystem } from '@/apps/ministry-health/subsystems/WardSurgicalSystem';
import { HealthFinanceSystem } from '@/apps/ministry-health/subsystems/HealthFinanceSystem';
import { RegulatorySystem } from '@/apps/ministry-health/subsystems/RegulatorySystem';
import { InteroperabilitySystem } from '@/apps/ministry-health/subsystems/InteroperabilitySystem';
import { CitizenPortalSystem } from '@/apps/ministry-health/subsystems/CitizenPortalSystem';
import { ResearchSystemView } from '@/apps/ministry-health/subsystems/ResearchSystemView';
import { SecuritySystem } from '@/apps/ministry-health/subsystems/SecuritySystem';
import { SimulationSystem } from '@/apps/ministry-health/subsystems/SimulationSystem';

// New domain surfaces
import {
  WardBoard, ICUBoard, ORBoard, EmergencyDepartmentBoard,
  SyndromicSurveillance, ContactTracing, MasterPatientIndex, LongitudinalEHR, BreakGlassAudit,
} from '@/apps/ministry-health/domains/ClinicalDomains';

import type { SovereignRole, Capability } from '@/shared/permissions/rbac';

type Render = (p: { id: string; now: number; role: SovereignRole; withheld: Capability[] }) => React.ReactElement;

const RENDER: Record<SurfaceId, Render> = {
  // command
  'health-command':       p => <HealthCommandCentre {...p} />,
  'situation-room':       p => <NationalSituationRoom {...p} />,
  'executive-briefing':   p => <ExecutiveBriefingSystem {...p} />,
  'national-capacity':    p => <HealthcareGridSystem {...p} />,
  // facility
  'hospital-floor':       p => <HospitalSystem {...p} />,
  'ward-board':           p => <WardBoard id={p.id} now={p.now} />,
  'icu-board':            p => <ICUBoard id={p.id} now={p.now} />,
  'or-board':             p => <ORBoard id={p.id} now={p.now} />,
  'emergency-department': p => <EmergencyDepartmentBoard id={p.id} now={p.now} />,
  // workforce
  'doctor-roster':            p => <DoctorSystem {...p} />,
  'community-health-workers': p => <WardSurgicalSystem {...p} />,
  // patient
  'master-patient-index':     p => <MasterPatientIndex id={p.id} now={p.now} />,
  'longitudinal-ehr':         p => <LongitudinalEHR id={p.id} now={p.now} />,
  'prescription-validation':  p => <PatientSystem {...p} />,
  'appointments':             p => <PatientSystem {...p} />,
  // epi
  'syndromic-surveillance':   p => <SyndromicSurveillance id={p.id} now={p.now} />,
  'contact-tracing':          p => <ContactTracing id={p.id} now={p.now} />,
  'disease-intelligence':     p => <DiseaseSystem {...p} />,
  // lab
  'lab-network':              p => <LaboratorySystem {...p} />,
  'pathology-turnaround':     p => <LaboratorySystem {...p} />,
  // pharmacy
  'drug-supply-chain':        p => <PharmaceuticalSystem {...p} />,
  'vaccine-inventory':        p => <PharmaceuticalSystem {...p} />,
  // maternal
  'maternal-child-health':    p => <ResearchSystemView {...p} />,
  // mental
  'mental-health':            p => <SecuritySystem {...p} />,
  // finance
  'health-finance':           p => <HealthFinanceSystem {...p} />,
  // regulatory
  'licensing-accreditation':  p => <RegulatorySystem {...p} />,
  'safety-incidents':         p => <SimulationSystem {...p} />,
  // portal
  'patient-portal':           p => <CitizenPortalSystem {...p} />,
  'break-glass-audit':        p => <BreakGlassAudit id={p.id} now={p.now} />,
};

void InteroperabilitySystem;
void EmergencySystem;

export function HealthShell({ id, surface, now, role, withheld = [] }: {
  id: string; surface: SurfaceId; now: number; role: SovereignRole; withheld?: Capability[];
}) {
  const domain = domainBySurface(surface);
  const render = RENDER[surface];
  return (
    <div className="space-y-2 p-2" style={{ background: HEALTH_DS.wardDeep, boxShadow: 'inset 0 0 90px rgba(0,0,0,0.6)' }}>
      {render ? render({ id, now, role, withheld }) : <HealthCommandCentre id={id} now={now} role={role} withheld={withheld} />}
      <FederationStrip />
      <RuntimeQueue
        scope={`health:${surface}`}
        kind={domain?.archetype === 'pharmacy' ? 'procurement' : domain?.archetype === 'lab' ? 'lab' : domain?.archetype === 'epi' ? 'incident' : 'case'}
        title={`${domain?.label ?? 'Health'} runtime — ${PATIENT_ADMISSION.title}`}
        by="Clinical Officer"
        role={role}
        withheld={withheld} />
      <ClinicalSeal maxim="Primum non nocere · first, do no harm" />
    </div>
  );
}
