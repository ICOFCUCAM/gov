// lib/gov/labour-extended.ts
//
// Sovereign Labour extension — three operational layers
// complementing the core workforce-command / social-protection /
// demographic-analytics / social-continuity stack: dedicated labour
// emergency & recovery operations (mass-unemployment & industrial
// closure response), workplace safety & labour rights enforcement
// (inspections, incidents, tribunal lanes), and the public labour
// & welfare portal (applications, pension access, complaints,
// vocational enrollment, advisories). Pure & deterministic.

import { seed, wave } from '@/lib/telemetry';
import { workforceContinuityBoard } from '@/lib/gov/workforce-continuity';

export const LABOUR_EXTENDED_SAFEGUARDS = {
  rightToCounselInDisputes: true as const,
  workplaceSafetyAsPublicGood: true as const,
  benefitsContinuityDuringTransition: true as const,
  nonRetaliationForComplaints: true as const,
  prohibited: [
    'retaliatory-termination-for-complaint', 'denial-of-mandatory-safety-inspection',
    'wage-theft-tolerance', 'discriminatory-redeployment',
    'concealment-of-occupational-fatality', 'benefits-clawback-without-notice',
  ] as const,
};

export const REGIONS = ['Capital District', 'Northern', 'Eastern', 'Western', 'Coastal', 'Highland'];

// ── A. Labour Emergency & Recovery Operations ───────────────────────
export type RecoveryPhase = 'assessment' | 'support-activation' | 'redeployment' | 'reskilling' | 'reabsorption' | 'closed';

export interface IndustrialClosure {
  id: string;
  sector: 'manufacturing' | 'mining' | 'agriculture' | 'logistics' | 'energy' | 'services' | 'retail';
  region: string;
  workersDisplacedK: number;
  closureCause: 'restructuring' | 'bankruptcy' | 'automation' | 'climate-shock' | 'export-shock' | 'cyber-incident' | 'regulatory';
  daysSinceClosure: number;
  phase: RecoveryPhase;
  estimatedReabsorptionMonths: number;
  reabsorptionRatePct: number;
}

export interface RedeploymentCorridor {
  id: string;
  fromSector: IndustrialClosure['sector'];
  toSector: IndustrialClosure['sector'];
  workersRoutedK: number;
  capacityRoutedPct: number;        // % of redeployment capacity utilised
  bridgingMonths: number;
  status: 'opening' | 'active' | 'congested' | 'saturated';
}

export interface EmergencySocialProgramme {
  programme: 'emergency-bridge' | 'rapid-reskilling' | 'relocation-grant' | 'pension-acceleration' | 'family-support';
  beneficiariesActiveK: number;
  enrolmentsThisWeekK: number;
  disbursementBnThisMonth: number;
  fulfilmentPct: number;
}

export interface LabourEmergency {
  posture: 'standby' | 'engaged' | 'major-displacement' | 'national-mobilisation';
  closures: IndustrialClosure[];
  redeploymentCorridors: RedeploymentCorridor[];
  emergencyProgrammes: EmergencySocialProgramme[];
  totalDisplacedK: number;
  totalRedeployedK: number;
  meanReabsorptionMonths: number;
}

// ── B. Workplace Safety & Labour Rights Enforcement ─────────────────
export interface WorkplaceInspection {
  id: string;
  region: string;
  sector: IndustrialClosure['sector'];
  inspectionKind: 'routine' | 'complaint-triggered' | 'post-incident' | 'high-risk-sector' | 'follow-up';
  daysSinceInspection: number;
  findings: number;
  severity: 'compliant' | 'minor-findings' | 'major-findings' | 'shutdown-order';
  remediationProgressPct: number;
}

export interface OccupationalIncident {
  id: string;
  region: string;
  sector: IndustrialClosure['sector'];
  kind: 'injury' | 'fatality' | 'chemical-exposure' | 'mental-health-event' | 'equipment-failure' | 'harassment';
  ageDays: number;
  workersAffected: number;
  status: 'reported' | 'investigation' | 'remediation' | 'closed';
}

export interface TribunalLane {
  lane: 'mediation' | 'conciliation' | 'arbitration' | 'labour-court';
  casesActive: number;
  meanResolutionDays: number;
  workerWinRatePct: number;
  pendingHearings: number;
}

export interface LabourRights {
  inspections: WorkplaceInspection[];
  incidents: OccupationalIncident[];
  tribunalLanes: TribunalLane[];
  workplaceFatalitiesThisYear: number;
  workplaceInjuriesThisQ: number;
  enforcementActionsMonth: number;
  complianceIdx: number;
}

// ── C. Public Labour & Welfare Portal ───────────────────────────────
export interface EmploymentApplication {
  id: string;
  region: string;
  applicant: 'jobseeker' | 'youth' | 'returner' | 'displaced-worker' | 'apprentice' | 'migrant';
  sectorPreference: IndustrialClosure['sector'];
  daysOpen: number;
  status: 'received' | 'screening' | 'matching' | 'interview' | 'placed';
}

export interface PensionAccessRequest {
  id: string;
  scheme: 'state-pension' | 'occupational' | 'disability' | 'survivor' | 'early-retirement' | 'rural-elder';
  daysOpen: number;
  amountMonthly: number;
  status: 'submitted' | 'verifying' | 'approved' | 'disbursed';
}

export interface LabourComplaint {
  id: string;
  region: string;
  kind: 'wage-theft' | 'unsafe-conditions' | 'discrimination' | 'unfair-dismissal' | 'harassment' | 'unpaid-overtime';
  daysOpen: number;
  severity: 'standard' | 'serious' | 'critical';
  stage: 'received' | 'investigating' | 'mediation' | 'tribunal' | 'resolved';
}

export interface VocationalEnrolmentFlow {
  programme: 'apprenticeship' | 'reskilling' | 'upskilling' | 'youth-pathway' | 'returner-bridging' | 'rural-vocational';
  enrolledThisMonthK: number;
  completionRatePct: number;
  placementRatePct: number;
  waitlistMonths: number;
}

export interface PublicAdvisoryLabour {
  id: string;
  kind: 'sector-shortage' | 'reskilling-cohort' | 'pension-reform-notice' | 'workplace-safety-campaign' | 'welfare-coverage-update' | 'youth-pathway-open';
  region: string;
  ageHrs: number;
  reachM: number;
}

export interface PublicLabourPortal {
  employmentApplications: EmploymentApplication[];
  pensionRequests: PensionAccessRequest[];
  complaints: LabourComplaint[];
  vocationalEnrolments: VocationalEnrolmentFlow[];
  advisories: PublicAdvisoryLabour[];
  citizenContactsDailyK: number;
  portalAvailabilityPct: number;
}

export interface LabourExtendedBoard {
  epoch: number;
  emergency: LabourEmergency;
  rights: LabourRights;
  portal: PublicLabourPortal;
  prohibited: readonly string[];
}

const SECTORS: IndustrialClosure['sector'][] = ['manufacturing', 'mining', 'agriculture', 'logistics', 'energy', 'services', 'retail'];
const CAUSES: IndustrialClosure['closureCause'][] = ['restructuring', 'bankruptcy', 'automation', 'climate-shock', 'export-shock', 'cyber-incident', 'regulatory'];
const PHASES: RecoveryPhase[] = ['assessment', 'support-activation', 'redeployment', 'reskilling', 'reabsorption', 'closed'];

const EMERGENCY_PROGRAMMES: EmergencySocialProgramme['programme'][] = ['emergency-bridge', 'rapid-reskilling', 'relocation-grant', 'pension-acceleration', 'family-support'];

const INSPECTION_KINDS: WorkplaceInspection['inspectionKind'][] = ['routine', 'complaint-triggered', 'post-incident', 'high-risk-sector', 'follow-up'];
const INCIDENT_KINDS: OccupationalIncident['kind'][] = ['injury', 'fatality', 'chemical-exposure', 'mental-health-event', 'equipment-failure', 'harassment'];
const TRIBUNAL_LANES: TribunalLane['lane'][] = ['mediation', 'conciliation', 'arbitration', 'labour-court'];

const APPLICANT_KINDS: EmploymentApplication['applicant'][] = ['jobseeker', 'youth', 'returner', 'displaced-worker', 'apprentice', 'migrant'];
const PENSION_SCHEMES: PensionAccessRequest['scheme'][] = ['state-pension', 'occupational', 'disability', 'survivor', 'early-retirement', 'rural-elder'];
const COMPLAINT_KINDS: LabourComplaint['kind'][] = ['wage-theft', 'unsafe-conditions', 'discrimination', 'unfair-dismissal', 'harassment', 'unpaid-overtime'];
const VOCATIONAL_PROGRAMMES: VocationalEnrolmentFlow['programme'][] = ['apprenticeship', 'reskilling', 'upskilling', 'youth-pathway', 'returner-bridging', 'rural-vocational'];
const ADVISORY_KINDS: PublicAdvisoryLabour['kind'][] = ['sector-shortage', 'reskilling-cohort', 'pension-reform-notice', 'workplace-safety-campaign', 'welfare-coverage-update', 'youth-pathway-open'];

export function labourExtendedBoard(now: number): LabourExtendedBoard {
  const epoch = Math.max(0, Math.floor(now / 4000));
  const wf = workforceContinuityBoard(now);

  // ── A. Emergency operations ───────────────────────────────────────
  const closures: IndustrialClosure[] = Array.from({ length: 7 }, (_, i) => {
    const k = `lx:ic:${i}:${Math.floor(epoch / 4)}`;
    const sector = SECTORS[Math.floor(seed(`${k}:s`) * SECTORS.length)]!;
    const region = REGIONS[Math.floor(seed(`${k}:r`) * REGIONS.length)]!;
    const closureCause = CAUSES[Math.floor(seed(`${k}:c`) * CAUSES.length)]!;
    const workersDisplacedK = Math.round(wave(`${k}:wd`, epoch / 4, 0.4, 36) * 10) / 10;
    const daysSinceClosure = Math.round(wave(`${k}:d`, epoch / 4, 1, 240));
    const phaseIdx = Math.min(PHASES.length - 1, Math.floor((daysSinceClosure / 180) * PHASES.length));
    const phase = PHASES[phaseIdx]!;
    const estimatedReabsorptionMonths = Math.max(1, Math.round(wave(`${k}:em`, epoch / 5, 2, 18) - daysSinceClosure / 30));
    const reabsorptionRatePct = phase === 'closed' ? 95 + Math.round(seed(`${k}:rr`) * 5)
      : phase === 'reabsorption' ? 70 + Math.round(seed(`${k}:rr`) * 25)
        : phase === 'reskilling' ? 40 + Math.round(seed(`${k}:rr`) * 30)
          : phase === 'redeployment' ? 18 + Math.round(seed(`${k}:rr`) * 22)
            : phase === 'support-activation' ? 4 + Math.round(seed(`${k}:rr`) * 14) : 0;
    return {
      id: `IC-${(25000 + Math.floor(seed(`${k}:id`) * 60000))}`,
      sector, region, workersDisplacedK, closureCause, daysSinceClosure,
      phase, estimatedReabsorptionMonths, reabsorptionRatePct,
    };
  }).sort((a, b) => b.workersDisplacedK - a.workersDisplacedK);

  const redeploymentCorridors: RedeploymentCorridor[] = Array.from({ length: 6 }, (_, i) => {
    const k = `lx:rc:${i}:${Math.floor(epoch / 4)}`;
    const fromSector = SECTORS[Math.floor(seed(`${k}:f`) * SECTORS.length)]!;
    let toSector = SECTORS[Math.floor(seed(`${k}:t`) * SECTORS.length)]!;
    if (toSector === fromSector) toSector = SECTORS[(SECTORS.indexOf(fromSector) + 1) % SECTORS.length]!;
    const workersRoutedK = Math.round(wave(`${k}:wr`, epoch / 4, 0.2, 28) * 10) / 10;
    const capacityRoutedPct = Math.round(wave(`${k}:cr`, epoch / 4, 14, 124));
    const bridgingMonths = Math.round(wave(`${k}:bm`, epoch / 5, 1, 14));
    const status: RedeploymentCorridor['status'] =
      capacityRoutedPct >= 100 ? 'saturated'
        : capacityRoutedPct >= 80 ? 'congested'
          : capacityRoutedPct >= 35 ? 'active' : 'opening';
    return { id: `RD-${i + 1}`, fromSector, toSector, workersRoutedK, capacityRoutedPct, bridgingMonths, status };
  });

  const emergencyProgrammes: EmergencySocialProgramme[] = EMERGENCY_PROGRAMMES.map(programme => {
    const k = `lx:ep:${programme}`;
    return {
      programme,
      beneficiariesActiveK: Math.round(wave(`${k}:b`, epoch / 4, 4, 280)),
      enrolmentsThisWeekK: Math.round(wave(`${k}:e`, epoch / 3, 0.4, 38) * 10) / 10,
      disbursementBnThisMonth: Math.round(wave(`${k}:d`, epoch / 4, 0.2, 8.4) * 10) / 10,
      fulfilmentPct: Math.round(wave(`${k}:f`, epoch / 5, 42, 96)),
    };
  });

  const totalDisplacedK = Math.round(closures.reduce((s, c) => s + c.workersDisplacedK, 0) * 10) / 10;
  const totalRedeployedK = Math.round(redeploymentCorridors.reduce((s, c) => s + c.workersRoutedK, 0) * 10) / 10;
  const meanReabsorptionMonths = Math.round(closures.reduce((s, c) => s + c.estimatedReabsorptionMonths, 0) / Math.max(1, closures.length));
  const activeMajor = closures.filter(c => c.workersDisplacedK >= 8 && c.phase !== 'closed').length;
  const posture: LabourEmergency['posture'] =
    activeMajor >= 3 || totalDisplacedK >= 80 ? 'national-mobilisation'
      : activeMajor >= 1 || totalDisplacedK >= 30 ? 'major-displacement'
        : closures.some(c => c.phase !== 'closed') ? 'engaged' : 'standby';

  const emergency: LabourEmergency = {
    posture, closures, redeploymentCorridors, emergencyProgrammes,
    totalDisplacedK, totalRedeployedK, meanReabsorptionMonths,
  };

  // ── B. Workplace safety & rights ──────────────────────────────────
  const inspections: WorkplaceInspection[] = Array.from({ length: 10 }, (_, i) => {
    const k = `lx:wi:${i}:${Math.floor(epoch / 4)}`;
    const region = REGIONS[Math.floor(seed(`${k}:r`) * REGIONS.length)]!;
    const sector = SECTORS[Math.floor(seed(`${k}:s`) * SECTORS.length)]!;
    const inspectionKind = INSPECTION_KINDS[Math.floor(seed(`${k}:k`) * INSPECTION_KINDS.length)]!;
    const daysSinceInspection = Math.round(wave(`${k}:d`, epoch / 4, 0, 96));
    const findings = Math.floor(seed(`${k}:f`) * 18);
    const severity: WorkplaceInspection['severity'] =
      findings === 0 ? 'compliant'
        : findings >= 12 ? 'shutdown-order'
          : findings >= 6 ? 'major-findings' : 'minor-findings';
    const remediationProgressPct = severity === 'compliant' ? 100
      : Math.round(wave(`${k}:rp`, epoch / 4, 8, 92));
    return {
      id: `WI-${(26000 + Math.floor(seed(`${k}:id`) * 60000))}`,
      region, sector, inspectionKind, daysSinceInspection, findings, severity, remediationProgressPct,
    };
  }).sort((a, b) => {
    const sev = (s: WorkplaceInspection['severity']) => s === 'shutdown-order' ? 3 : s === 'major-findings' ? 2 : s === 'minor-findings' ? 1 : 0;
    return sev(b.severity) - sev(a.severity) || a.daysSinceInspection - b.daysSinceInspection;
  });

  const incidents: OccupationalIncident[] = Array.from({ length: 8 }, (_, i) => {
    const k = `lx:oi:${i}:${Math.floor(epoch / 4)}`;
    const region = REGIONS[Math.floor(seed(`${k}:r`) * REGIONS.length)]!;
    const sector = SECTORS[Math.floor(seed(`${k}:s`) * SECTORS.length)]!;
    const kind = INCIDENT_KINDS[Math.floor(seed(`${k}:k`) * INCIDENT_KINDS.length)]!;
    const ageDays = Math.round(wave(`${k}:a`, epoch / 4, 0, 90));
    const workersAffected = kind === 'fatality' ? 1 + Math.floor(seed(`${k}:wa`) * 4)
      : kind === 'chemical-exposure' ? 2 + Math.floor(seed(`${k}:wa`) * 38)
        : Math.floor(seed(`${k}:wa`) * 14) + 1;
    const status: OccupationalIncident['status'] =
      ageDays > 60 ? 'closed'
        : ageDays > 21 ? 'remediation'
          : ageDays > 3 ? 'investigation' : 'reported';
    return { id: `OI-${(27000 + Math.floor(seed(`${k}:id`) * 60000))}`, region, sector, kind, ageDays, workersAffected, status };
  }).sort((a, b) => {
    const isFatal = (i: OccupationalIncident) => i.kind === 'fatality' ? 1 : 0;
    return isFatal(b) - isFatal(a) || a.ageDays - b.ageDays;
  });

  const tribunalLanes: TribunalLane[] = TRIBUNAL_LANES.map(lane => {
    const k = `lx:tl:${lane}`;
    return {
      lane,
      casesActive: Math.round(wave(`${k}:c`, epoch / 4, 40, 2800)),
      meanResolutionDays: Math.round(wave(`${k}:m`, epoch / 5, 14, lane === 'labour-court' ? 320 : 120)),
      workerWinRatePct: Math.round(wave(`${k}:ww`, epoch / 7, 38, 78)),
      pendingHearings: Math.round(wave(`${k}:p`, epoch / 4, 8, 480)),
    };
  });

  const rights: LabourRights = {
    inspections, incidents, tribunalLanes,
    workplaceFatalitiesThisYear: Math.round(wave(`lx:wr:fy`, epoch / 9, 40, 380)),
    workplaceInjuriesThisQ: Math.round(wave(`lx:wr:iq`, epoch / 5, 400, 12800)),
    enforcementActionsMonth: Math.round(wave(`lx:wr:em`, epoch / 4, 20, 480)),
    complianceIdx: Math.round(wave(`lx:wr:ci`, epoch / 6, 52, 92)),
  };

  // ── C. Public portal ──────────────────────────────────────────────
  const employmentApplications: EmploymentApplication[] = Array.from({ length: 10 }, (_, i) => {
    const k = `lx:ea:${i}:${Math.floor(epoch / 4)}`;
    const region = REGIONS[Math.floor(seed(`${k}:r`) * REGIONS.length)]!;
    const applicant = APPLICANT_KINDS[Math.floor(seed(`${k}:a`) * APPLICANT_KINDS.length)]!;
    const sectorPreference = SECTORS[Math.floor(seed(`${k}:s`) * SECTORS.length)]!;
    const daysOpen = Math.round(wave(`${k}:d`, epoch / 4, 0, 60));
    const status: EmploymentApplication['status'] =
      daysOpen >= 40 ? 'placed'
        : daysOpen >= 21 ? 'interview'
          : daysOpen >= 10 ? 'matching'
            : daysOpen >= 3 ? 'screening' : 'received';
    return { id: `EA-${(28000 + Math.floor(seed(`${k}:id`) * 70000))}`, region, applicant, sectorPreference, daysOpen, status };
  }).sort((a, b) => a.daysOpen - b.daysOpen);

  const pensionRequests: PensionAccessRequest[] = Array.from({ length: 8 }, (_, i) => {
    const k = `lx:pr:${i}:${Math.floor(epoch / 4)}`;
    const scheme = PENSION_SCHEMES[Math.floor(seed(`${k}:s`) * PENSION_SCHEMES.length)]!;
    const daysOpen = Math.round(wave(`${k}:d`, epoch / 4, 0, 90));
    const amountMonthly = Math.round(wave(`${k}:am`, epoch / 5, 80, 1200));
    const status: PensionAccessRequest['status'] =
      daysOpen >= 50 ? 'disbursed'
        : daysOpen >= 25 ? 'approved'
          : daysOpen >= 7 ? 'verifying' : 'submitted';
    return { id: `PR-${(29000 + Math.floor(seed(`${k}:id`) * 70000))}`, scheme, daysOpen, amountMonthly, status };
  });

  const complaints: LabourComplaint[] = Array.from({ length: 10 }, (_, i) => {
    const k = `lx:cp:${i}:${Math.floor(epoch / 4)}`;
    const region = REGIONS[Math.floor(seed(`${k}:r`) * REGIONS.length)]!;
    const kind = COMPLAINT_KINDS[Math.floor(seed(`${k}:k`) * COMPLAINT_KINDS.length)]!;
    const daysOpen = Math.round(wave(`${k}:d`, epoch / 4, 1, 180));
    const sevRoll = seed(`${k}:sv`);
    const severity: LabourComplaint['severity'] =
      kind === 'wage-theft' || kind === 'unsafe-conditions' || kind === 'harassment'
        ? (sevRoll > 0.5 ? 'critical' : 'serious')
        : sevRoll > 0.85 ? 'critical' : sevRoll > 0.5 ? 'serious' : 'standard';
    const stage: LabourComplaint['stage'] =
      daysOpen >= 120 ? 'resolved'
        : daysOpen >= 60 ? 'tribunal'
          : daysOpen >= 21 ? 'mediation'
            : daysOpen >= 3 ? 'investigating' : 'received';
    return { id: `LC-${(30000 + Math.floor(seed(`${k}:id`) * 80000))}`, region, kind, daysOpen, severity, stage };
  }).sort((a, b) => {
    const sev = (s: LabourComplaint['severity']) => s === 'critical' ? 2 : s === 'serious' ? 1 : 0;
    return sev(b.severity) - sev(a.severity) || a.daysOpen - b.daysOpen;
  });

  const vocationalEnrolments: VocationalEnrolmentFlow[] = VOCATIONAL_PROGRAMMES.map(programme => {
    const k = `lx:ve:${programme}`;
    return {
      programme,
      enrolledThisMonthK: Math.round(wave(`${k}:e`, epoch / 4, 0.4, 48) * 10) / 10,
      completionRatePct: Math.round(wave(`${k}:c`, epoch / 5, 48, 96)),
      placementRatePct: Math.round(wave(`${k}:p`, epoch / 5, 38, 92)),
      waitlistMonths: Math.round(wave(`${k}:w`, epoch / 6, 0, 14)),
    };
  });

  const advisories: PublicAdvisoryLabour[] = Array.from({ length: 6 }, (_, i) => {
    const k = `lx:ad:${i}:${Math.floor(epoch / 4)}`;
    const kind = ADVISORY_KINDS[Math.floor(seed(`${k}:k`) * ADVISORY_KINDS.length)]!;
    const region = REGIONS[Math.floor(seed(`${k}:r`) * REGIONS.length)]!;
    const ageHrs = Math.round(wave(`${k}:h`, epoch / 4, 1, 96));
    const reachM = Math.round(wave(`${k}:rm`, epoch / 5, 0.2, 8) * 10) / 10;
    return { id: `LAD-${i + 1}`, kind, region, ageHrs, reachM };
  });

  const portal: PublicLabourPortal = {
    employmentApplications, pensionRequests, complaints, vocationalEnrolments, advisories,
    citizenContactsDailyK: Math.round(wave(`lx:po:cc`, epoch / 4, 4, 84) * 10) / 10,
    portalAvailabilityPct: Math.round(wave(`lx:po:av`, epoch / 4, 94, 99.95) * 100) / 100,
  };

  void wf;
  return {
    epoch, emergency, rights, portal,
    prohibited: LABOUR_EXTENDED_SAFEGUARDS.prohibited,
  };
}
