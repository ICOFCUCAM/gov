// lib/gov/knowledge-development.ts
//
// Sovereign Education & Civil Development engine. National knowledge
// continuity, institutional capability formation, generational
// development, research lineage, civic literacy and civilizational
// memory — one connected deterministic runtime. Cross-ministry
// propagation chains turn educational instability into a national
// cascade across Treasury / Labour / Interior / Agriculture / Trade &
// Industry / Health / National Coordination. Pure & deterministic;
// SSR-stable per operational epoch.

import { seed, wave } from '@/lib/telemetry';
import { schoolNetwork, examOps, higherEducation, curriculumOps, teacherOps, studentServices } from '@/lib/gov/education-systems';

const REGIONS = ['Capital District', 'Northern', 'Eastern', 'Western', 'Coastal', 'Highland'];

export type LiteracyPosture = 'consolidating' | 'sustained' | 'engaged' | 'strained' | 'fracture-watch';

// ── 1. National education command ───────────────────────────────────
export interface RegionLiteracy {
  region: string;
  literacyPct: number;
  primaryNetPct: number;
  secondaryNetPct: number;
  capabilityIdx: number;        // 0..100 composite developmental capability
  continuityRisk: 'none' | 'monitor' | 'fracture';
}

export interface NationalEduCommand {
  posture: LiteracyPosture;
  literacyIdx: number;
  capabilityIdx: number;
  regions: RegionLiteracy[];
  institutionalPerformance: number;  // 0..100
  yearsEducationContinuity: number;  // continuous years of stable schooling at national level
}

// ── 2. Institutional inventory (schools + universities) ─────────────
export interface InstitutionRecord {
  id: string;
  name: string;
  type: 'Primary' | 'Secondary' | 'Tertiary' | 'Research University' | 'Teacher College';
  region: string;
  enrolment: number;
  faculty: number;
  facilityIntegrity: number;
  accreditation: 'pending' | 'accredited' | 'probation' | 'revoked';
  establishedYearsAgo: number;
}

// ── 3. Research & innovation ────────────────────────────────────────
export interface ResearchProgramme {
  id: string;
  sector: 'Climate' | 'Health' | 'Energy' | 'Agriculture' | 'Constitutional Law' | 'Sovereign Tech' | 'History';
  fundingBn: number;
  fundingLineageYears: number;
  outputsPerYear: number;
  strategicPriority: 'core' | 'advisory' | 'sunset';
  capabilityIdx: number;
}

// ── 4. Generational development & demographics ──────────────────────
export interface Cohort {
  generation: 'Foundational (5-9)' | 'Formative (10-14)' | 'Secondary (15-18)' | 'Tertiary (19-24)' | 'Workforce-ready (25-34)';
  populationM: number;
  capabilityReadiness: number;
  literacyContinuity: number;
  inequalityIdx: number;       // 0..100 (higher = worse)
  workforceReadinessPct: number;
}

// ── 5. Digital learning & knowledge infrastructure ──────────────────
export interface KnowledgeInfra {
  archiveIntegrity: number;
  remoteLearningCoveragePct: number;
  digitalContentDistributionIdx: number;
  bandwidthEquityIdx: number;
  archivalRecordsM: number;
  curationContinuity: number;
}

// ── 6. Educational crisis & continuity management ───────────────────
export type EduIncidentKind =
  | 'school-disruption' | 'university-strike' | 'conflict-disruption'
  | 'natural-disaster-school' | 'exam-integrity-breach' | 'faculty-attrition-wave'
  | 'digital-infrastructure-outage';

export interface EduIncident {
  id: string;
  kind: EduIncidentKind;
  region: string;
  severity: 'advisory' | 'elevated' | 'critical' | 'national';
  affectedLearners: number;
  ageDays: number;
  recoveryPathway: 'remote-continuity' | 'temporary-relocation' | 'curriculum-acceleration' | 'examination-deferral';
  ministryCascade: { ministry: string; effect: string; delayHrs: number; status: 'pending' | 'engaged' | 'cleared' }[];
}

// ── 7. Cultural & civilizational memory ─────────────────────────────
export interface CivilizationalArchive {
  category: 'Historical archives' | 'Constitutional literacy' | 'Cultural continuity' | 'Civic education' | 'Intergenerational records';
  preservationPct: number;
  publicAccessIdx: number;
  generationalTransferIdx: number;
  digitisationPct: number;
}

// ── 8. Educational intelligence & forecasting ───────────────────────
export interface EduForecast {
  horizonYears: number[];
  literacyTrajectory: number[];
  workforceReadinessTrajectory: number[];
  researchCapabilityTrajectory: number[];
  demographicCapabilityShift: number;       // % delta over horizon
  generationalContinuityRisk: number;       // 0..100
  civilizationalKnowledgeResilience: number;
}

export interface KnowledgeDevelopmentBoard {
  epoch: number;
  command: NationalEduCommand;
  institutions: InstitutionRecord[];
  research: ResearchProgramme[];
  cohorts: Cohort[];
  knowledgeInfra: KnowledgeInfra;
  incidents: EduIncident[];
  civilizationalMemory: CivilizationalArchive[];
  forecast: EduForecast;
  bannerLine: string;
  ministriesEngaged: { ministry: string; engaged: number }[];
}

const PROPAGATION: Record<EduIncidentKind, { ministry: string; effect: string; delayHrs: number }[]> = {
  'school-disruption': [
    { ministry: 'Treasury', effect: 'Emergency education-continuity gate', delayHrs: 24 },
    { ministry: 'Interior', effect: 'Regional youth-stability watch', delayHrs: 12 },
    { ministry: 'Labour', effect: 'Workforce-pipeline projection update', delayHrs: 168 },
    { ministry: 'National Coordination', effect: 'Cabinet development brief', delayHrs: 48 },
  ],
  'university-strike': [
    { ministry: 'Interior', effect: 'Lawful assembly oversight', delayHrs: 4 },
    { ministry: 'Treasury', effect: 'Higher-education funding review', delayHrs: 72 },
    { ministry: 'Labour', effect: 'Graduate-pipeline disruption forecast', delayHrs: 168 },
  ],
  'conflict-disruption': [
    { ministry: 'Interior', effect: 'Regional protection coordination', delayHrs: 0 },
    { ministry: 'Treasury', effect: 'Conflict-zone education contingency', delayHrs: 48 },
    { ministry: 'Health', effect: 'Psychosocial support for learners', delayHrs: 24 },
    { ministry: 'National Coordination', effect: 'Continuity preservation review', delayHrs: 24 },
  ],
  'natural-disaster-school': [
    { ministry: 'Agriculture', effect: 'School-meals supply rerouting', delayHrs: 12 },
    { ministry: 'Treasury', effect: 'Disaster education-rebuild release', delayHrs: 24 },
    { ministry: 'Health', effect: 'Casualty & psychosocial response', delayHrs: 4 },
  ],
  'exam-integrity-breach': [
    { ministry: 'Interior', effect: 'Investigations engaged', delayHrs: 8 },
    { ministry: 'Trade & Industry', effect: 'Certification authority review', delayHrs: 48 },
  ],
  'faculty-attrition-wave': [
    { ministry: 'Treasury', effect: 'Educator retention package review', delayHrs: 72 },
    { ministry: 'Labour', effect: 'Workforce-supply analysis', delayHrs: 168 },
  ],
  'digital-infrastructure-outage': [
    { ministry: 'Trade & Industry', effect: 'Telecom continuity coordination', delayHrs: 4 },
    { ministry: 'Treasury', effect: 'Emergency-bandwidth contingency', delayHrs: 24 },
  ],
};

const KIND_LIST: EduIncidentKind[] = [
  'school-disruption', 'university-strike', 'conflict-disruption',
  'natural-disaster-school', 'exam-integrity-breach', 'faculty-attrition-wave',
  'digital-infrastructure-outage',
];

const INSTITUTION_NAMES: { name: string; type: InstitutionRecord['type']; region: string }[] = [
  { name: 'National University of the Capital', type: 'Research University', region: 'Capital District' },
  { name: 'Highland College of Sciences', type: 'Research University', region: 'Highland' },
  { name: 'Eastern Polytechnic', type: 'Tertiary', region: 'Eastern' },
  { name: 'Coastal Maritime Academy', type: 'Tertiary', region: 'Coastal' },
  { name: 'Capital Teachers College', type: 'Teacher College', region: 'Capital District' },
  { name: 'Northern Secondary Federation', type: 'Secondary', region: 'Northern' },
  { name: 'Western Foundation Network', type: 'Primary', region: 'Western' },
  { name: 'Eastern Cultural Academy', type: 'Secondary', region: 'Eastern' },
  { name: 'Coastal Primary Federation', type: 'Primary', region: 'Coastal' },
];

const RESEARCH_DEFS: { sector: ResearchProgramme['sector'] }[] = [
  { sector: 'Climate' }, { sector: 'Health' }, { sector: 'Energy' },
  { sector: 'Agriculture' }, { sector: 'Constitutional Law' },
  { sector: 'Sovereign Tech' }, { sector: 'History' },
];

const COHORTS: Cohort['generation'][] = [
  'Foundational (5-9)', 'Formative (10-14)', 'Secondary (15-18)',
  'Tertiary (19-24)', 'Workforce-ready (25-34)',
];

export function knowledgeDevelopmentBoard(now: number): KnowledgeDevelopmentBoard {
  const epoch = Math.max(0, Math.floor(now / 4000));
  const ts = epoch;
  const sn = schoolNetwork('national', ts);
  const ex = examOps('national', ts);
  const he = higherEducation('national', ts);
  const cu = curriculumOps('national', ts);
  const te = teacherOps('national', ts);
  const ss = studentServices('national', ts);
  void cu; void te; void ss;

  // 1. Command + regional literacy
  const regions: RegionLiteracy[] = REGIONS.map(region => {
    const k = `kd:rg:${region}`;
    const literacyPct = Math.round(wave(`${k}:l`, epoch / 8, 62, 96));
    const primaryNetPct = Math.round(wave(`${k}:p`, epoch / 9, 70, 99));
    const secondaryNetPct = Math.round(wave(`${k}:s`, epoch / 9, 38, 92));
    const capabilityIdx = Math.round((literacyPct + primaryNetPct + secondaryNetPct) / 3);
    const continuityRisk: RegionLiteracy['continuityRisk'] =
      literacyPct < 70 ? 'fracture' : literacyPct < 82 ? 'monitor' : 'none';
    return { region, literacyPct, primaryNetPct, secondaryNetPct, capabilityIdx, continuityRisk };
  });
  const literacyIdx = Math.round(regions.reduce((s, r) => s + r.literacyPct, 0) / regions.length);
  const capabilityIdx = Math.round(regions.reduce((s, r) => s + r.capabilityIdx, 0) / regions.length);
  // Composite institutional performance: schooling continuity (inverse
  // dropout), exam-integrity (inverse flag rate) and higher-ed throughput.
  const schoolingContinuity = Math.max(0, Math.min(100, Math.round(100 - sn.dropoutRatePct)));
  const examIntegrity = Math.max(0, Math.min(100, Math.round(100 - ex.integrityFlags * 4)));
  const institutionalPerformance = Math.round((schoolingContinuity + examIntegrity + he.graduationRatePct) / 3);
  const yearsEducationContinuity = 4 + Math.floor(seed(`kd:yr:${epoch}`) * 24);
  const fractureCount = regions.filter(r => r.continuityRisk === 'fracture').length;
  const posture: LiteracyPosture =
    fractureCount >= 3 ? 'fracture-watch'
      : fractureCount >= 1 ? 'strained'
        : literacyIdx < 80 ? 'engaged'
          : literacyIdx < 90 ? 'sustained' : 'consolidating';
  const command: NationalEduCommand = {
    posture, literacyIdx, capabilityIdx, regions, institutionalPerformance, yearsEducationContinuity,
  };

  // 2. Institutions
  const institutions: InstitutionRecord[] = INSTITUTION_NAMES.map((inst, i) => {
    const k = `kd:inst:${inst.name}`;
    const enrolment = Math.round(wave(`${k}:e`, epoch / 11, 800, 28000));
    const faculty = Math.round(wave(`${k}:f`, epoch / 12, 40, 1800));
    const facilityIntegrity = Math.round(wave(`${k}:fi`, epoch / 13, 48, 96));
    const accreditationRoll = seed(`${k}:a`);
    const accreditation: InstitutionRecord['accreditation'] =
      accreditationRoll > 0.94 ? 'revoked'
        : accreditationRoll > 0.86 ? 'probation'
          : accreditationRoll > 0.18 ? 'accredited' : 'pending';
    const establishedYearsAgo = 8 + Math.floor(seed(`${k}:y`) * 140);
    void i;
    return {
      id: `INST-${i + 1}`, name: inst.name, type: inst.type, region: inst.region,
      enrolment, faculty, facilityIntegrity, accreditation, establishedYearsAgo,
    };
  });

  // 3. Research programmes
  const research: ResearchProgramme[] = RESEARCH_DEFS.map((r, i) => {
    const k = `kd:rs:${r.sector}`;
    const fundingBn = Math.round(wave(`${k}:f`, epoch / 14, 0.4, 12) * 10) / 10;
    const fundingLineageYears = 3 + Math.floor(seed(`${k}:l`) * 60);
    const outputsPerYear = Math.round(wave(`${k}:o`, epoch / 9, 24, 480));
    const priRoll = seed(`${k}:p`);
    const strategicPriority: ResearchProgramme['strategicPriority'] =
      priRoll > 0.78 ? 'core' : priRoll > 0.32 ? 'advisory' : 'sunset';
    const capabilityIdx = Math.round(wave(`${k}:c`, epoch / 8, 38, 94));
    void i;
    return { id: `RES-${i + 1}`, sector: r.sector, fundingBn, fundingLineageYears, outputsPerYear, strategicPriority, capabilityIdx };
  }).sort((a, b) => b.capabilityIdx - a.capabilityIdx);

  // 4. Cohorts
  const cohorts: Cohort[] = COHORTS.map((generation, i) => {
    const k = `kd:co:${generation}`;
    const populationM = Math.round(wave(`${k}:p`, epoch / 16, 1.4, 5.6) * 10) / 10;
    const capabilityReadiness = Math.round(wave(`${k}:cr`, epoch / 9, 42, 92));
    const literacyContinuity = Math.round(wave(`${k}:lc`, epoch / 9, 58, 96));
    const inequalityIdx = Math.round(wave(`${k}:iq`, epoch / 12, 12, 64));
    const workforceReadinessPct = i >= 3 ? Math.round(wave(`${k}:wr`, epoch / 9, 42, 90)) : 0;
    return { generation, populationM, capabilityReadiness, literacyContinuity, inequalityIdx, workforceReadinessPct };
  });

  // 5. Knowledge infrastructure
  const knowledgeInfra: KnowledgeInfra = {
    archiveIntegrity: Math.round(wave(`kd:ki:ai`, epoch / 14, 64, 98)),
    remoteLearningCoveragePct: Math.round(wave(`kd:ki:rl`, epoch / 8, 38, 92)),
    digitalContentDistributionIdx: Math.round(wave(`kd:ki:dc`, epoch / 9, 42, 88)),
    bandwidthEquityIdx: Math.round(wave(`kd:ki:be`, epoch / 10, 32, 84)),
    archivalRecordsM: Math.round(wave(`kd:ki:ar`, epoch / 15, 4, 48) * 10) / 10,
    curationContinuity: Math.round(wave(`kd:ki:cc`, epoch / 11, 58, 96)),
  };

  // 6. Incidents
  const incidents: EduIncident[] = Array.from({ length: 7 }, (_, i) => {
    const k = `kd:inc:${i}:${Math.floor(epoch / 4)}`;
    const kind = KIND_LIST[Math.floor(seed(`${k}:k`) * KIND_LIST.length)]!;
    const region = REGIONS[Math.floor(seed(`${k}:r`) * REGIONS.length)]!;
    const sevRoll = seed(`${k}:sv`);
    const severity: EduIncident['severity'] = sevRoll > 0.92 ? 'national' : sevRoll > 0.76 ? 'critical' : sevRoll > 0.5 ? 'elevated' : 'advisory';
    const affectedLearners = Math.round(wave(`${k}:al`, epoch / 5, 200, 18000));
    const ageDays = Math.round(wave(`${k}:age`, epoch / 6, 1, 90));
    const pathRoll = seed(`${k}:rp`);
    const recoveryPathway: EduIncident['recoveryPathway'] =
      kind === 'digital-infrastructure-outage' ? 'remote-continuity'
        : kind === 'conflict-disruption' || kind === 'natural-disaster-school' ? 'temporary-relocation'
          : kind === 'exam-integrity-breach' ? 'examination-deferral'
            : pathRoll > 0.5 ? 'curriculum-acceleration' : 'remote-continuity';
    const cascade = (PROPAGATION[kind] ?? []).map(c => ({
      ...c,
      status: (ageDays * 24 < c.delayHrs ? 'pending' : ageDays * 24 > c.delayHrs * 6 ? 'cleared' : 'engaged') as 'pending' | 'engaged' | 'cleared',
    }));
    return {
      id: `EDI-${(4000 + Math.floor(seed(`${k}:id`) * 50000))}`,
      kind, region, severity, affectedLearners, ageDays, recoveryPathway, ministryCascade: cascade,
    };
  }).sort((a, b) => {
    const sev = (s: EduIncident['severity']) => s === 'national' ? 3 : s === 'critical' ? 2 : s === 'elevated' ? 1 : 0;
    return sev(b.severity) - sev(a.severity) || b.affectedLearners - a.affectedLearners;
  });

  // 7. Civilizational memory
  const civilizationalMemory: CivilizationalArchive[] = (
    ['Historical archives', 'Constitutional literacy', 'Cultural continuity', 'Civic education', 'Intergenerational records'] as CivilizationalArchive['category'][]
  ).map(category => {
    const k = `kd:cm:${category}`;
    return {
      category,
      preservationPct: Math.round(wave(`${k}:pr`, epoch / 14, 58, 98)),
      publicAccessIdx: Math.round(wave(`${k}:pa`, epoch / 10, 42, 92)),
      generationalTransferIdx: Math.round(wave(`${k}:gt`, epoch / 12, 52, 94)),
      digitisationPct: Math.round(wave(`${k}:dg`, epoch / 9, 32, 88)),
    };
  });

  // 8. Forecast — 25-year horizon at 5-year steps
  const horizon = [5, 10, 15, 20, 25];
  const forecast: EduForecast = {
    horizonYears: horizon,
    literacyTrajectory: horizon.map(h => Math.max(0, Math.min(100, Math.round(literacyIdx + wave(`kd:fc:lt`, epoch / 6 + h * 0.1, -8, 8))))),
    workforceReadinessTrajectory: horizon.map(h => Math.round(wave(`kd:fc:wr`, epoch / 7 + h * 0.12, 42, 92))),
    researchCapabilityTrajectory: horizon.map(h => Math.round(wave(`kd:fc:rc`, epoch / 5 + h * 0.14, 38, 94))),
    demographicCapabilityShift: Math.round(wave(`kd:fc:ds`, epoch / 18, -12, 22)),
    generationalContinuityRisk: Math.min(100, Math.round(fractureCount * 18 + (100 - literacyIdx) * 0.4)),
    civilizationalKnowledgeResilience: Math.round((knowledgeInfra.archiveIntegrity + knowledgeInfra.curationContinuity) / 2),
  };

  const banner =
    posture === 'fracture-watch' ? 'GENERATIONAL CONTINUITY FRACTURE WATCH'
      : posture === 'strained' ? 'NATIONAL EDUCATION STRAINED'
        : posture === 'engaged' ? 'EDUCATIONAL CONTINUITY ENGAGED'
          : posture === 'sustained' ? 'KNOWLEDGE CONTINUITY SUSTAINED' : 'CIVILIZATIONAL KNOWLEDGE CONSOLIDATING';

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
    epoch, command, institutions, research, cohorts, knowledgeInfra,
    incidents, civilizationalMemory, forecast,
    bannerLine: banner, ministriesEngaged,
  };
}
