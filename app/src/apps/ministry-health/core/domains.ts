// apps/ministry-health/core — Health domain catalog.
//
// Single source of truth for the Ministry of Health operating system.
// Implements CivicOS Master §13 (Healthcare Infrastructure). Pure
// data; no React, no engine.

import type { HealthArchetype } from '@/apps/ministry-health/design-system/health-ds';

export type HealthGroupKey =
  | 'command'      // national health command
  | 'facility'     // facility OS — hospital / ward / OR / ICU / ER
  | 'workforce'    // doctors / nurses / community health workers
  | 'patient'      // EHR · patient · citizen
  | 'epi'          // public-health surveillance
  | 'lab'          // pathology & testing
  | 'pharmacy'     // supply chain · drugs · vaccines
  | 'maternal'     // maternal & child health
  | 'mental'       // mental health (strict consent)
  | 'finance'      // claims · insurance · procurement
  | 'regulatory'   // licensing · quality · accreditation
  | 'portal';      // citizen-facing

export interface HealthGroup {
  key: HealthGroupKey;
  label: string;
  purpose: string;
}

export const HEALTH_GROUPS: HealthGroup[] = [
  { key: 'command',    label: 'National Health Command',     purpose: 'Outbreak intelligence · emergency coordination · executive briefing' },
  { key: 'facility',   label: 'Facility Operating System',   purpose: 'Hospital · ward · OR · ICU · ER live operations' },
  { key: 'workforce',  label: 'Clinical Workforce',          purpose: 'Doctor roster · CHW deployment · workload intelligence' },
  { key: 'patient',    label: 'EHR & Patient Services',      purpose: 'Master patient index · longitudinal EHR · appointments · prescriptions' },
  { key: 'epi',        label: 'Public-Health Surveillance',  purpose: 'Syndromic surveillance · outbreak detection · contact tracing' },
  { key: 'lab',        label: 'Laboratory Network',          purpose: 'Pathology · testing · result turnaround' },
  { key: 'pharmacy',   label: 'Pharmacy & Supply',           purpose: 'Drug supply · cold-chain · vaccine inventory · expiry' },
  { key: 'maternal',   label: 'Maternal & Child Health',     purpose: 'Antenatal → early childhood registry-linked workflows' },
  { key: 'mental',     label: 'Mental Health',               purpose: 'Confidential separate-consent module' },
  { key: 'finance',    label: 'Health Finance & Claims',     purpose: 'NHIS · claims adjudication · procurement' },
  { key: 'regulatory', label: 'Regulatory & Quality',        purpose: 'Licensing · accreditation · safety incidents' },
  { key: 'portal',     label: 'Citizen Health Portal',       purpose: 'Patient-facing services · break-glass · consent' },
];

export type SurfaceId =
  // command
  | 'health-command'             // ⊕ I — national health command
  | 'situation-room'             // ⊕ II — situation room
  | 'executive-briefing'         // ⊕ III — executive briefing
  | 'national-capacity'          // ⊕ IV — national bed / ICU / OR capacity grid
  // facility
  | 'hospital-floor'             // ◧ I — hospital live floor plan
  | 'ward-board'                 // ◧ II — ward bay board
  | 'icu-board'                  // ◧ III — ICU bay board
  | 'or-board'                   // ◧ IV — OR scheduling board
  | 'emergency-department'       // ◧ V — emergency department
  // workforce
  | 'doctor-roster'              // ⊕ V — doctor roster & workload
  | 'community-health-workers'   // ⊕ VI — CHW deployment
  // patient (EHR)
  | 'master-patient-index'       // ⊟ I — MPI keyed to CivicID
  | 'longitudinal-ehr'           // ⊟ II — FHIR R5+ encounter view
  | 'prescription-validation'    // ⊟ III — drug-drug interaction
  | 'appointments'               // ⊟ IV — appointment system
  // surveillance
  | 'syndromic-surveillance'     // ⌬ I — outbreak detection
  | 'contact-tracing'            // ⌬ II — privacy-safe contact tracing
  | 'disease-intelligence'       // ⌬ III — disease intel (existing)
  // lab
  | 'lab-network'                // ⚗ I — laboratory pipeline
  | 'pathology-turnaround'       // ⚗ II — pathology TAT
  // pharmacy
  | 'drug-supply-chain'          // ⚕ I — drugs / vaccines / cold-chain
  | 'vaccine-inventory'          // ⚕ II — vaccine inventory + expiry
  // maternal
  | 'maternal-child-health'      // ⊕ VII — MCH registry workflows
  // mental
  | 'mental-health'              // ⊕ VIII — confidential consent
  // finance
  | 'health-finance'             // ⊕ IX — NHIS / claims / procurement
  // regulatory
  | 'licensing-accreditation'    // ⊕ X — licensing & accreditation
  | 'safety-incidents'           // ⊕ XI — patient-safety incidents
  // portal
  | 'patient-portal'             // ◇ I — citizen-facing
  | 'break-glass-audit';         // ◇ II — emergency break-glass with mandatory review

export interface HealthDomain {
  surface: SurfaceId;
  group: HealthGroupKey;
  code: string;
  label: string;
  purpose: string;
  archetype: HealthArchetype;
  blueprintSection: string;
}

export const HEALTH_DOMAINS: HealthDomain[] = [
  // command
  { surface: 'health-command',        group: 'command', code: 'HC-CMD-01',  label: 'National Health Command',    purpose: 'Sovereign health posture & directives', archetype: 'command', blueprintSection: '13' },
  { surface: 'situation-room',        group: 'command', code: 'HC-SIT-02',  label: 'Health Situation Room',      purpose: 'Live cross-facility situation room',     archetype: 'command', blueprintSection: '13' },
  { surface: 'executive-briefing',    group: 'command', code: 'HC-BRF-03',  label: 'Executive Briefing',         purpose: 'Daily briefing for the executive',       archetype: 'command', blueprintSection: '13' },
  { surface: 'national-capacity',     group: 'command', code: 'HC-CAP-04',  label: 'National Healthcare Capacity', purpose: 'Bed / ICU / OR national grid',         archetype: 'command', blueprintSection: '13' },
  // facility
  { surface: 'hospital-floor',        group: 'facility', code: 'FA-HOSP-01', label: 'Hospital Floor Plan',         purpose: 'Live hospital floor plan',              archetype: 'floor-plan', blueprintSection: '13.1' },
  { surface: 'ward-board',            group: 'facility', code: 'FA-WRD-02',  label: 'Ward Board',                  purpose: 'Inpatient ward bay board',              archetype: 'floor-plan', blueprintSection: '13.1' },
  { surface: 'icu-board',             group: 'facility', code: 'FA-ICU-03',  label: 'ICU Board',                   purpose: 'ICU bay board with vital strips',       archetype: 'vitals',     blueprintSection: '13.1' },
  { surface: 'or-board',              group: 'facility', code: 'FA-OR-04',   label: 'Operating Theatre Board',     purpose: 'OR scheduling & status',                archetype: 'floor-plan', blueprintSection: '13.1' },
  { surface: 'emergency-department',  group: 'facility', code: 'FA-ED-05',   label: 'Emergency Department',        purpose: 'ED triage and bay status',              archetype: 'floor-plan', blueprintSection: '13.1' },
  // workforce
  { surface: 'doctor-roster',         group: 'workforce', code: 'WF-DOC-01', label: 'Clinical Workforce',          purpose: 'Doctor roster & workload intelligence', archetype: 'registry', blueprintSection: '13.1' },
  { surface: 'community-health-workers', group: 'workforce', code: 'WF-CHW-02', label: 'Community Health Workers', purpose: 'Mobile-first CHW deployment',           archetype: 'registry', blueprintSection: '13.1' },
  // patient
  { surface: 'master-patient-index',  group: 'patient', code: 'PT-MPI-01',   label: 'Master Patient Index',         purpose: 'MPI keyed to CivicID',                  archetype: 'registry', blueprintSection: '13.1' },
  { surface: 'longitudinal-ehr',      group: 'patient', code: 'PT-EHR-02',   label: 'Longitudinal EHR',             purpose: 'FHIR R5+ encounter view',               archetype: 'chart',    blueprintSection: '13.1' },
  { surface: 'prescription-validation', group: 'patient', code: 'PT-RX-03',  label: 'Prescription Validation',      purpose: 'Drug-drug interaction (Class A)',       archetype: 'chart',    blueprintSection: '13.2' },
  { surface: 'appointments',          group: 'patient', code: 'PT-APT-04',   label: 'Appointments',                 purpose: 'Appointment system',                    archetype: 'registry', blueprintSection: '13.1' },
  // epi
  { surface: 'syndromic-surveillance',group: 'epi', code: 'EP-SYN-01',       label: 'Syndromic Surveillance',       purpose: 'Outbreak detection with constitutional safeguards', archetype: 'epi', blueprintSection: '13.1' },
  { surface: 'contact-tracing',       group: 'epi', code: 'EP-CT-02',        label: 'Contact Tracing',              purpose: 'Privacy-safe contact tracing',          archetype: 'epi',      blueprintSection: '13.1' },
  { surface: 'disease-intelligence',  group: 'epi', code: 'EP-DI-03',        label: 'Disease Intelligence',         purpose: 'Disease intelligence',                  archetype: 'epi',      blueprintSection: '13.1' },
  // lab
  { surface: 'lab-network',           group: 'lab', code: 'LB-NET-01',       label: 'Laboratory Network',           purpose: 'Pathology & testing pipeline',          archetype: 'lab',      blueprintSection: '13.1' },
  { surface: 'pathology-turnaround',  group: 'lab', code: 'LB-TAT-02',       label: 'Pathology Turnaround',         purpose: 'TAT by assay class',                    archetype: 'lab',      blueprintSection: '13.1' },
  // pharmacy
  { surface: 'drug-supply-chain',     group: 'pharmacy', code: 'PH-SC-01',   label: 'Drug Supply Chain',            purpose: 'Drugs · vaccines · cold-chain telemetry · expiry', archetype: 'pharmacy', blueprintSection: '13.1' },
  { surface: 'vaccine-inventory',     group: 'pharmacy', code: 'PH-VAX-02',  label: 'Vaccine Inventory',            purpose: 'Vaccine inventory + expiry',            archetype: 'pharmacy', blueprintSection: '13.1' },
  // maternal
  { surface: 'maternal-child-health', group: 'maternal', code: 'MC-MCH-01',  label: 'Maternal & Child Health',      purpose: 'Antenatal → early childhood workflows', archetype: 'chart',    blueprintSection: '13.1' },
  // mental
  { surface: 'mental-health',         group: 'mental', code: 'MH-CNF-01',    label: 'Mental Health',                purpose: 'Confidential separate-consent regime',  archetype: 'chart',    blueprintSection: '13.1' },
  // finance
  { surface: 'health-finance',        group: 'finance', code: 'FN-HF-01',    label: 'Health Finance',               purpose: 'NHIS · claims · procurement',           archetype: 'registry', blueprintSection: '13.1' },
  // regulatory
  { surface: 'licensing-accreditation', group: 'regulatory', code: 'RG-LIC-01', label: 'Licensing & Accreditation', purpose: 'Licensing & accreditation register',    archetype: 'registry', blueprintSection: '13.1' },
  { surface: 'safety-incidents',      group: 'regulatory', code: 'RG-SAF-02',  label: 'Patient Safety Incidents',   purpose: 'Patient-safety incident registry',      archetype: 'epi',      blueprintSection: '13.1' },
  // portal
  { surface: 'patient-portal',        group: 'portal', code: 'PR-CIT-01',    label: 'Patient Portal',               purpose: 'Citizen-facing patient services',       archetype: 'portal',   blueprintSection: '13.1' },
  { surface: 'break-glass-audit',     group: 'portal', code: 'PR-BGA-02',    label: 'Break-Glass Audit',            purpose: 'Emergency break-glass with mandatory post-hoc review', archetype: 'portal', blueprintSection: '13.3' },
];

export function domainBySurface(surface: SurfaceId): HealthDomain | undefined {
  return HEALTH_DOMAINS.find(d => d.surface === surface);
}
