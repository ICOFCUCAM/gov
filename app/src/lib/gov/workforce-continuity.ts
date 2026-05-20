// lib/gov/workforce-continuity.ts
//
// Sovereign Labour, Social Protection & Workforce Continuity engine.
// National workforce command, social protection & benefits, labour
// rights & workplace safety, demographic & human-capital analytics,
// employment & skills coordination, socioeconomic pressure, labour
// emergencies and 25-year workforce intelligence — one connected
// deterministic runtime. Cross-ministry cascade carries every
// labour-market event through Treasury / Trade & Industry / Interior
// / Health / Education / Agriculture / Cabinet / National Coordination.
// Pure & deterministic; SSR-stable per operational epoch.

import { seed, wave } from '@/lib/telemetry';
import { laborOps } from '@/lib/gov/labor-systems';

export const WORKFORCE_SAFEGUARDS = {
  laborRightsContinuity: true as const,
  equitableProtections: true as const,
  humanitarianSupportDoctrine: true as const,
  inclusiveEmployment: true as const,
  prohibited: [
    'discriminatory-employment-classification', 'forced-labor-practices',
    'benefits-denial-without-due-process', 'wage-theft-tolerance',
    'workforce-data-misuse', 'exploitative-employment-arrangements',
  ] as const,
};

export type WorkforcePosture =
  | 'thriving' | 'stable' | 'tightening' | 'strained' | 'crisis-mobilisation';

export const REGIONS = ['Capital District', 'Northern', 'Eastern', 'Western', 'Coastal', 'Highland'];

// ── 1. National workforce command ───────────────────────────────────
export interface RegionalWorkforce {
  region: string;
  laborForceK: number;
  unemploymentPct: number;
  participationRatePct: number;
  productivityIdx: number;
  hardshipIdx: number;
  classification: 'thriving' | 'stable' | 'tightening' | 'strained' | 'distressed';
}

export interface WorkforceCommand {
  posture: WorkforcePosture;
  employmentContinuityIdx: number;
  participationRatePct: number;
  unemploymentPct: number;
  productivityIdx: number;
  workforceShortagesIdx: number;
  regions: RegionalWorkforce[];
}

// ── 2. Social protection & benefits ─────────────────────────────────
export interface BenefitsProgramme {
  id: string;
  programme: string;            // e.g. National Pension Fund
  category: 'pension' | 'unemployment' | 'welfare' | 'emergency-support' | 'disability';
  beneficiariesK: number;
  fundCoverageMonths: number;
  payoutOnTimePct: number;
  enrolmentBacklog: number;
  status: 'solvent' | 'observant' | 'pressured' | 'stressed';
}

export interface SocialProtection {
  programmes: BenefitsProgramme[];
  vulnerablePopulationCoveragePct: number;
  emergencySupportCasesActive: number;
  pensionContinuityYears: number;       // projected solvency
  welfareDistributionThroughputDaily: number;
}

// ── 3. Labour rights & workplace safety ─────────────────────────────
export interface LaborDispute {
  id: string;
  sector: string;
  region: string;
  workersAffectedK: number;
  daysOpen: number;
  kind: 'wage-dispute' | 'safety-grievance' | 'collective-bargaining' | 'unfair-dismissal' | 'occupational-injury';
  stage: 'filed' | 'mediation' | 'tribunal' | 'arbitration' | 'resolved';
  rightsStatus: 'safeguarded' | 'under-review' | 'alert';
}

export interface LaborRightsReadout {
  inspectionsActive: number;
  occupationalSafetyIdx: number;
  safetyIncidentsThisQ: number;
  complianceIdx: number;
  rightsAlertsRaised: number;
  disputes: LaborDispute[];
}

// ── 4. Demographic & human capital ──────────────────────────────────
export interface AgeCohort {
  band: '15-24' | '25-34' | '35-44' | '45-54' | '55-64' | '65+';
  populationM: number;          // in millions
  participationPct: number;     // engaged in workforce
  unemploymentPct: number;
  skillsMatchIdx: number;
}

export interface DemographicAnalytics {
  cohorts: AgeCohort[];
  agingIndex: number;           // higher = more aged dependency
  youthUnemploymentPct: number;
  migrationNetK: number;        // ± net migration (workforce-age)
  dependencyRatio: number;
  skillsMismatchIdx: number;
  longHorizonSustainabilityIdx: number;
}

// ── 5. Employment & skills coordination ─────────────────────────────
export interface SkillsPipeline {
  pipeline: string;               // e.g. Healthcare workforce
  enrolledK: number;
  completionRatePct: number;
  placementRatePct: number;
  priority: 'critical' | 'standard' | 'declining';
}

export interface EmploymentCoordination {
  vacanciesActiveK: number;
  placementsThisMonthK: number;
  jobseekersK: number;
  vocationalTraineesK: number;
  reskillingProgrammesActive: number;
  pipelines: SkillsPipeline[];
}

// ── 6. Socioeconomic pressure ───────────────────────────────────────
export interface SocialPressureRegister {
  socialUnrestIdx: number;
  wagePressureIdx: number;       // higher = more pressure
  householdInflationImpactIdx: number;
  regionalHardship: { region: string; hardshipIdx: number; tone: 'ok' | 'warn' | 'alert' }[];
  laborMarketInstabilityIdx: number;
}

// ── 7. Labour emergency incidents ───────────────────────────────────
export type LaborIncidentKind =
  | 'factory-closure' | 'mass-unemployment' | 'pension-shortfall'
  | 'labor-strike' | 'wage-pressure-crisis' | 'vulnerable-distress'
  | 'youth-unemployment-spike' | 'automation-displacement';

export interface LaborIncident {
  id: string;
  kind: LaborIncidentKind;
  severity: 'advisory' | 'elevated' | 'critical' | 'national';
  region: string;
  ageDays: number;
  workersAffectedK: number;
  recoveryPathway: 'redeployment' | 'reskilling' | 'social-bridge' | 'employment-program';
  ministryCascade: { ministry: string; effect: string; delayHrs: number; status: 'pending' | 'engaged' | 'cleared' }[];
}

// ── 8. Forecast ─────────────────────────────────────────────────────
export interface WorkforceForecast {
  horizonYears: number[];        // 5,10,15,20,25
  employmentTrajectory: number[];
  participationTrajectory: number[];
  productivityTrajectory: number[];
  automationDisplacementTrajectory: number[];
  pensionSolvencyTrajectory: number[];
  generationalContinuityIdx: number;
  socialSustainabilityIdx: number;
  systemicLaborRisk: number;
}

export interface WorkforceContinuityBoard {
  epoch: number;
  command: WorkforceCommand;
  social: SocialProtection;
  rights: LaborRightsReadout;
  demographics: DemographicAnalytics;
  employment: EmploymentCoordination;
  pressure: SocialPressureRegister;
  incidents: LaborIncident[];
  forecast: WorkforceForecast;
  bannerLine: string;
  ministriesEngaged: { ministry: string; engaged: number }[];
  prohibited: readonly string[];
}

const PROPAGATION: Record<LaborIncidentKind, { ministry: string; effect: string; delayHrs: number }[]> = {
  'factory-closure': [
    { ministry: 'Treasury', effect: 'Unemployment-benefit surge funding', delayHrs: 12 },
    { ministry: 'Trade & Industry', effect: 'Industrial-cluster continuity review', delayHrs: 6 },
    { ministry: 'Interior', effect: 'Civil-stability monitoring', delayHrs: 12 },
    { ministry: 'Health', effect: 'Mental-health support pathway', delayHrs: 24 },
    { ministry: 'Education', effect: 'Reskilling intake engaged', delayHrs: 48 },
    { ministry: 'Cabinet', effect: 'Continuity advisory', delayHrs: 48 },
  ],
  'mass-unemployment': [
    { ministry: 'Treasury', effect: 'Emergency social-support disbursement', delayHrs: 6 },
    { ministry: 'Interior', effect: 'Civil-order monitoring engaged', delayHrs: 12 },
    { ministry: 'Health', effect: 'Public mental-health resources', delayHrs: 24 },
    { ministry: 'Education', effect: 'Reskilling capacity expansion', delayHrs: 48 },
    { ministry: 'Cabinet', effect: 'Economic-continuity review', delayHrs: 24 },
  ],
  'pension-shortfall': [
    { ministry: 'Treasury', effect: 'Pension-fund recapitalisation review', delayHrs: 24 },
    { ministry: 'Cabinet', effect: 'Intergenerational-continuity directive', delayHrs: 48 },
    { ministry: 'National Coordination', effect: 'Pension-reform working group', delayHrs: 72 },
  ],
  'labor-strike': [
    { ministry: 'Trade & Industry', effect: 'Industrial-production impact assessment', delayHrs: 4 },
    { ministry: 'Transport', effect: 'Supply-chain mitigation engaged', delayHrs: 6 },
    { ministry: 'Treasury', effect: 'Revenue-impact modelling', delayHrs: 24 },
    { ministry: 'Interior', effect: 'Lawful-assembly protections engaged', delayHrs: 4 },
  ],
  'wage-pressure-crisis': [
    { ministry: 'Treasury', effect: 'Inflation-impact household analysis', delayHrs: 12 },
    { ministry: 'Trade & Industry', effect: 'Sectoral wage-resilience review', delayHrs: 24 },
    { ministry: 'Cabinet', effect: 'Cost-of-living advisory', delayHrs: 24 },
  ],
  'vulnerable-distress': [
    { ministry: 'Health', effect: 'Outreach & care coordination', delayHrs: 6 },
    { ministry: 'Interior', effect: 'Shelter & emergency-services coordination', delayHrs: 12 },
    { ministry: 'Cabinet', effect: 'Humanitarian advisory issued', delayHrs: 24 },
  ],
  'youth-unemployment-spike': [
    { ministry: 'Education', effect: 'Youth-skills programme expansion', delayHrs: 48 },
    { ministry: 'Interior', effect: 'Youth-services engagement', delayHrs: 24 },
    { ministry: 'Cabinet', effect: 'Generational-continuity review', delayHrs: 72 },
  ],
  'automation-displacement': [
    { ministry: 'Education', effect: 'Strategic reskilling capacity', delayHrs: 72 },
    { ministry: 'Trade & Industry', effect: 'Transition-sector planning', delayHrs: 48 },
    { ministry: 'Treasury', effect: 'Transition-support funding', delayHrs: 72 },
    { ministry: 'Cabinet', effect: 'Long-horizon workforce review', delayHrs: 96 },
  ],
};

const KIND_LIST: LaborIncidentKind[] = [
  'factory-closure', 'mass-unemployment', 'pension-shortfall', 'labor-strike',
  'wage-pressure-crisis', 'vulnerable-distress', 'youth-unemployment-spike', 'automation-displacement',
];

const BENEFITS_DEFS: { programme: string; category: BenefitsProgramme['category'] }[] = [
  { programme: 'National Pension Fund', category: 'pension' },
  { programme: 'Public-Sector Pension Trust', category: 'pension' },
  { programme: 'Unemployment Insurance', category: 'unemployment' },
  { programme: 'Universal Family Allowance', category: 'welfare' },
  { programme: 'Disability Support Programme', category: 'disability' },
  { programme: 'Emergency Social Bridge', category: 'emergency-support' },
  { programme: 'Senior Care Stipend', category: 'welfare' },
  { programme: 'Youth Transition Allowance', category: 'unemployment' },
];

const PIPELINE_DEFS: { pipeline: string; priority: SkillsPipeline['priority'] }[] = [
  { pipeline: 'Healthcare workforce', priority: 'critical' },
  { pipeline: 'Industrial & manufacturing trades', priority: 'critical' },
  { pipeline: 'Digital & technology', priority: 'critical' },
  { pipeline: 'Agricultural & food production', priority: 'standard' },
  { pipeline: 'Construction & infrastructure', priority: 'standard' },
  { pipeline: 'Transport & logistics', priority: 'standard' },
  { pipeline: 'Hospitality & services', priority: 'standard' },
  { pipeline: 'Legacy industries', priority: 'declining' },
];

const DISPUTE_SECTORS = ['Heavy industry', 'Transport', 'Public services', 'Healthcare', 'Mining & resources', 'Hospitality', 'Construction'];

export function workforceContinuityBoard(now: number): WorkforceContinuityBoard {
  const epoch = Math.max(0, Math.floor(now / 4000));
  const ts = epoch;
  const lo = laborOps('national', ts);

  // 1. Regional workforce
  const regions: RegionalWorkforce[] = REGIONS.map(region => {
    const k = `wf:rg:${region}`;
    const laborForceK = Math.round(wave(`${k}:lf`, epoch / 7, 280, 2200));
    const unemploymentPct = Math.round(wave(`${k}:un`, epoch / 5, 3, 24) * 10) / 10;
    const participationRatePct = Math.round(wave(`${k}:pr`, epoch / 6, 52, 78));
    const productivityIdx = Math.round(wave(`${k}:pd`, epoch / 7, 44, 92));
    const hardshipIdx = Math.round(unemploymentPct * 3 + Math.max(0, 70 - participationRatePct) * 0.6);
    const classification: RegionalWorkforce['classification'] =
      hardshipIdx >= 72 ? 'distressed'
        : hardshipIdx >= 56 ? 'strained'
          : hardshipIdx >= 38 ? 'tightening'
            : hardshipIdx >= 22 ? 'stable' : 'thriving';
    return { region, laborForceK, unemploymentPct, participationRatePct, productivityIdx, hardshipIdx, classification };
  });
  const distressed = regions.filter(r => r.classification === 'distressed').length;
  const strained = regions.filter(r => r.classification === 'strained').length;
  const employmentContinuityIdx = Math.round(100 - lo.unemploymentPct * 3);
  const participationRatePct = Math.round(regions.reduce((s, r) => s + r.participationRatePct, 0) / regions.length);
  const productivityIdx = Math.round(regions.reduce((s, r) => s + r.productivityIdx, 0) / regions.length);
  const workforceShortagesIdx = Math.round(wave(`wf:cmd:ws`, epoch / 6, 18, 78));
  const posture: WorkforcePosture =
    distressed >= 2 || lo.unemploymentPct >= 18 ? 'crisis-mobilisation'
      : distressed >= 1 || lo.unemploymentPct >= 12 ? 'strained'
        : strained >= 1 || lo.unemploymentPct >= 8 ? 'tightening'
          : participationRatePct < 64 ? 'stable' : 'thriving';
  const command: WorkforceCommand = {
    posture, employmentContinuityIdx, participationRatePct,
    unemploymentPct: lo.unemploymentPct, productivityIdx, workforceShortagesIdx, regions,
  };

  // 2. Social protection
  const programmes: BenefitsProgramme[] = BENEFITS_DEFS.map((b, i) => {
    const k = `wf:bn:${b.programme}`;
    const beneficiariesK = Math.round(wave(`${k}:be`, epoch / 6, 80, 4800));
    const fundCoverageMonths = Math.round(wave(`${k}:fc`, epoch / 7, 3, 72));
    const payoutOnTimePct = Math.round(wave(`${k}:po`, epoch / 5, 74, 98));
    const enrolmentBacklog = Math.round(wave(`${k}:eb`, epoch / 5, 40, 4800));
    const status: BenefitsProgramme['status'] =
      fundCoverageMonths < 6 || payoutOnTimePct < 80 ? 'stressed'
        : fundCoverageMonths < 18 || payoutOnTimePct < 88 ? 'pressured'
          : fundCoverageMonths < 36 ? 'observant' : 'solvent';
    return { id: `BP-${i + 1}`, programme: b.programme, category: b.category, beneficiariesK, fundCoverageMonths, payoutOnTimePct, enrolmentBacklog, status };
  });
  const social: SocialProtection = {
    programmes,
    vulnerablePopulationCoveragePct: Math.round(wave(`wf:sp:vp`, epoch / 6, 56, 96)),
    emergencySupportCasesActive: Math.round(wave(`wf:sp:es`, epoch / 4, 200, 12800)),
    pensionContinuityYears: Math.round(wave(`wf:sp:py`, epoch / 9, 8, 38) * 10) / 10,
    welfareDistributionThroughputDaily: Math.round(wave(`wf:sp:wt`, epoch / 5, 4000, 86000)),
  };

  // 3. Labour rights & disputes
  const disputeStages: LaborDispute['stage'][] = ['filed', 'mediation', 'tribunal', 'arbitration', 'resolved'];
  const disputeKinds: LaborDispute['kind'][] = ['wage-dispute', 'safety-grievance', 'collective-bargaining', 'unfair-dismissal', 'occupational-injury'];
  const disputes: LaborDispute[] = Array.from({ length: 8 }, (_, i) => {
    const k = `wf:dp:${i}:${Math.floor(epoch / 4)}`;
    const sector = DISPUTE_SECTORS[Math.floor(seed(`${k}:s`) * DISPUTE_SECTORS.length)]!;
    const region = REGIONS[Math.floor(seed(`${k}:r`) * REGIONS.length)]!;
    const workersAffectedK = Math.round(wave(`${k}:w`, epoch / 4, 0.2, 28) * 10) / 10;
    const daysOpen = Math.round(wave(`${k}:do`, epoch / 5, 1, 180));
    const stage = disputeStages[Math.floor(seed(`${k}:st`) * disputeStages.length)]!;
    const kind = disputeKinds[Math.floor(seed(`${k}:k`) * disputeKinds.length)]!;
    const rightsRoll = seed(`${k}:rs`);
    const rightsStatus: LaborDispute['rightsStatus'] = rightsRoll > 0.9 ? 'alert' : rightsRoll > 0.72 ? 'under-review' : 'safeguarded';
    return { id: `LD-${(2000 + Math.floor(seed(`${k}:id`) * 50000))}`, sector, region, workersAffectedK, daysOpen, kind, stage, rightsStatus };
  }).sort((a, b) => b.workersAffectedK - a.workersAffectedK);
  const rights: LaborRightsReadout = {
    inspectionsActive: lo.inspection.unitsActive,
    occupationalSafetyIdx: Math.round(wave(`wf:rt:os`, epoch / 6, 58, 96)),
    safetyIncidentsThisQ: Math.round(wave(`wf:rt:si`, epoch / 5, 40, 1800)),
    complianceIdx: lo.inspection.compliancePct,
    rightsAlertsRaised: disputes.filter(d => d.rightsStatus === 'alert').length,
    disputes,
  };

  // 4. Demographics
  const cohortDefs: AgeCohort['band'][] = ['15-24', '25-34', '35-44', '45-54', '55-64', '65+'];
  const cohorts: AgeCohort[] = cohortDefs.map(band => {
    const k = `wf:co:${band}`;
    const populationM = Math.round(wave(`${k}:p`, epoch / 8, 2.4, 9.2) * 10) / 10;
    const participationPct = band === '15-24' ? Math.round(wave(`${k}:pa`, epoch / 6, 28, 56))
      : band === '65+' ? Math.round(wave(`${k}:pa`, epoch / 7, 6, 26))
        : Math.round(wave(`${k}:pa`, epoch / 6, 66, 90));
    const unemploymentPct = band === '15-24' ? Math.round(wave(`${k}:un`, epoch / 4, 12, 32) * 10) / 10
      : Math.round(wave(`${k}:un`, epoch / 5, 3, 14) * 10) / 10;
    const skillsMatchIdx = Math.round(wave(`${k}:sk`, epoch / 7, 42, 92));
    return { band, populationM, participationPct, unemploymentPct, skillsMatchIdx };
  });
  const youthUnemploymentPct = cohorts[0]!.unemploymentPct;
  const totalPop = cohorts.reduce((s, c) => s + c.populationM, 0);
  const workforceAge = cohorts.filter(c => c.band !== '65+' && c.band !== '15-24').reduce((s, c) => s + c.populationM, 0);
  const dependent = (cohorts.find(c => c.band === '65+')!.populationM + cohorts.find(c => c.band === '15-24')!.populationM);
  const dependencyRatio = Math.round((dependent / Math.max(0.1, workforceAge)) * 100);
  const agingIndex = Math.round((cohorts.find(c => c.band === '65+')!.populationM / Math.max(0.1, totalPop)) * 100);
  const demographics: DemographicAnalytics = {
    cohorts,
    agingIndex,
    youthUnemploymentPct,
    migrationNetK: Math.round(wave(`wf:dm:mg`, epoch / 8, -240, 480)),
    dependencyRatio,
    skillsMismatchIdx: Math.round(wave(`wf:dm:sm`, epoch / 6, 18, 68)),
    longHorizonSustainabilityIdx: Math.round(wave(`wf:dm:lh`, epoch / 9, 42, 92)),
  };

  // 5. Employment & pipelines
  const pipelines: SkillsPipeline[] = PIPELINE_DEFS.map(p => {
    const k = `wf:pl:${p.pipeline}`;
    const enrolledK = Math.round(wave(`${k}:e`, epoch / 5, 6, 220));
    const completionRatePct = Math.round(wave(`${k}:c`, epoch / 7, 48, 94));
    const placementRatePct = Math.round(wave(`${k}:p`, epoch / 6, 38, 92));
    return { pipeline: p.pipeline, enrolledK, completionRatePct, placementRatePct, priority: p.priority };
  });
  const employment: EmploymentCoordination = {
    vacanciesActiveK: Math.round(lo.vacancies / 1000),
    placementsThisMonthK: Math.round(wave(`wf:em:pl`, epoch / 4, 12, 320) * 10) / 10,
    jobseekersK: Math.round(lo.jobseekersM * 1000),
    vocationalTraineesK: Math.round(lo.skillsTrainingActive / 1000),
    reskillingProgrammesActive: Math.round(wave(`wf:em:rp`, epoch / 6, 18, 220)),
    pipelines,
  };

  // 6. Social pressure
  const regionalHardship = regions.map(r => ({
    region: r.region, hardshipIdx: r.hardshipIdx,
    tone: (r.hardshipIdx >= 60 ? 'alert' : r.hardshipIdx >= 38 ? 'warn' : 'ok') as 'ok' | 'warn' | 'alert',
  })).sort((a, b) => b.hardshipIdx - a.hardshipIdx);
  const pressure: SocialPressureRegister = {
    socialUnrestIdx: Math.round(wave(`wf:ps:un`, epoch / 5, 12, 78)),
    wagePressureIdx: Math.round(wave(`wf:ps:wp`, epoch / 6, 14, 72)),
    householdInflationImpactIdx: Math.round(wave(`wf:ps:hi`, epoch / 5, 18, 76)),
    regionalHardship,
    laborMarketInstabilityIdx: Math.round(wave(`wf:ps:lm`, epoch / 5, 14, 74)),
  };

  // 7. Incidents
  const recoveries: LaborIncident['recoveryPathway'][] = ['redeployment', 'reskilling', 'social-bridge', 'employment-program'];
  const incidents: LaborIncident[] = Array.from({ length: 7 }, (_, i) => {
    const k = `wf:inc:${i}:${Math.floor(epoch / 4)}`;
    const kind = KIND_LIST[Math.floor(seed(`${k}:k`) * KIND_LIST.length)]!;
    const sevRoll = seed(`${k}:sv`);
    const severity: LaborIncident['severity'] = sevRoll > 0.92 ? 'national' : sevRoll > 0.76 ? 'critical' : sevRoll > 0.5 ? 'elevated' : 'advisory';
    const ageDays = Math.round(wave(`${k}:age`, epoch / 5, 1, 160));
    const workersAffectedK = Math.round(wave(`${k}:wa`, epoch / 5, 0.4, 240) * 10) / 10;
    const region = REGIONS[Math.floor(seed(`${k}:rg`) * REGIONS.length)]!;
    const cascade = (PROPAGATION[kind] ?? []).map(c => ({
      ...c,
      status: (ageDays * 24 < c.delayHrs ? 'pending' : ageDays * 24 > c.delayHrs * 6 ? 'cleared' : 'engaged') as 'pending' | 'engaged' | 'cleared',
    }));
    return {
      id: `LCI-${(3000 + Math.floor(seed(`${k}:id`) * 50000))}`,
      kind, severity, region, ageDays, workersAffectedK,
      recoveryPathway: recoveries[Math.floor(seed(`${k}:rp`) * recoveries.length)]!,
      ministryCascade: cascade,
    };
  }).sort((a, b) => {
    const sev = (s: LaborIncident['severity']) => s === 'national' ? 3 : s === 'critical' ? 2 : s === 'elevated' ? 1 : 0;
    return sev(b.severity) - sev(a.severity) || b.workersAffectedK - a.workersAffectedK;
  });

  // 8. Forecast — 25 years, 5-year steps
  const horizon = [5, 10, 15, 20, 25];
  const forecast: WorkforceForecast = {
    horizonYears: horizon,
    employmentTrajectory: horizon.map(h => Math.max(0, Math.min(100, Math.round(employmentContinuityIdx + wave(`wf:fc:em`, epoch / 6 + h * 0.12, -14, 8))))),
    participationTrajectory: horizon.map(h => Math.max(0, Math.min(100, Math.round(participationRatePct + wave(`wf:fc:pa`, epoch / 7 + h * 0.13, -10, 6))))),
    productivityTrajectory: horizon.map(h => Math.max(0, Math.min(100, Math.round(productivityIdx + wave(`wf:fc:pr`, epoch / 5 + h * 0.14, -8, 12))))),
    automationDisplacementTrajectory: horizon.map(h => Math.round(wave(`wf:fc:au`, epoch / 5 + h * 0.16, 8, 64))),
    pensionSolvencyTrajectory: horizon.map(h => Math.round(wave(`wf:fc:pn`, epoch / 7 + h * 0.13, 30, 88))),
    generationalContinuityIdx: Math.round((employmentContinuityIdx + demographics.longHorizonSustainabilityIdx + social.vulnerablePopulationCoveragePct) / 3),
    socialSustainabilityIdx: Math.round((social.vulnerablePopulationCoveragePct + (100 - dependencyRatio * 0.5)) / 2),
    systemicLaborRisk: Math.min(100, Math.round(
      distressed * 18
      + strained * 10
      + Math.max(0, lo.unemploymentPct - 8) * 2.5
      + pressure.socialUnrestIdx * 0.3
    )),
  };

  const banner =
    posture === 'crisis-mobilisation' ? 'WORKFORCE CRISIS — emergency mobilisation in effect'
      : posture === 'strained' ? 'LABOUR MARKET UNDER STRAIN — continuity engaged'
        : posture === 'tightening' ? 'LABOUR MARKET TIGHTENING — capacity coordination'
          : posture === 'stable' ? 'WORKFORCE STABLE — continuity protected' : 'WORKFORCE THRIVING — full participation';

  const ministries = new Map<string, number>();
  for (const inc of incidents) {
    for (const c of inc.ministryCascade) {
      if (c.status !== 'pending') ministries.set(c.ministry, (ministries.get(c.ministry) ?? 0) + 1);
    }
  }
  const ministriesEngaged = Array.from(ministries.entries())
    .map(([ministry, engaged]) => ({ ministry, engaged }))
    .sort((a, b) => b.engaged - a.engaged);

  return {
    epoch, command, social, rights, demographics, employment, pressure, incidents,
    forecast, bannerLine: banner, ministriesEngaged,
    prohibited: WORKFORCE_SAFEGUARDS.prohibited,
  };
}
