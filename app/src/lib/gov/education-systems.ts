// Education Systems — deep operational engine (EDUCATION archetype).
// Schools network, examinations, teacher workforce and learner services
// as live operational environments. Pure & deterministic.

import { seed, wave } from '@/lib/telemetry';

const REGIONS = ['Capital District', 'Northern', 'Eastern', 'Western', 'Coastal', 'Highland'];

export interface SchoolNetwork {
  schools: number; enrolmentM: number; pupilTeacherRatio: number;
  infrastructurePct: number; dropoutRatePct: number;
  byRegion: { region: string; schools: number; capacityPct: number; tone: 'ok' | 'warn' | 'alert' }[];
}
export function schoolNetwork(id: string, t: number): SchoolNetwork {
  return {
    schools: 7400 + Math.round(seed(`ed:sc:${id}`) * 4200),
    enrolmentM: Math.round(wave(`ed:en:${id}`, t, 6, 14) * 10) / 10,
    pupilTeacherRatio: Math.round(wave(`ed:ptr:${id}`, t, 28, 56)),
    infrastructurePct: Math.round(wave(`ed:inf:${id}`, t, 58, 94)),
    dropoutRatePct: Math.round(wave(`ed:dr:${id}`, t, 4, 18) * 10) / 10,
    byRegion: REGIONS.map((region, i) => {
      const cap = Math.round(wave(`ed:rc:${id}:${i}`, t, 55, 99));
      return { region, schools: 600 + Math.round(seed(`ed:rs:${id}:${i}`) * 1800), capacityPct: cap, tone: cap >= 80 ? 'ok' : cap >= 60 ? 'warn' : 'alert' };
    }),
  };
}

export interface ExamOps {
  centres: number; candidates: number; sittingsActive: number;
  resultsPending: number; integrityFlags: number;
  pipeline: { stage: string; count: number }[];
}
export function examOps(id: string, t: number): ExamOps {
  const stages = ['Registration', 'Invigilation', 'Marking', 'Moderation', 'Release'];
  return {
    centres: 540 + Math.round(seed(`ex:c:${id}`) * 420),
    candidates: Math.round(wave(`ex:cd:${id}`, t, 180000, 920000)),
    sittingsActive: Math.round(wave(`ex:sa:${id}`, t, 0, 40)),
    resultsPending: Math.round(wave(`ex:rp:${id}`, t, 0, 60000)),
    integrityFlags: Math.round(seed(`ex:if:${id}:${Math.floor(t / 9)}`) * 22),
    pipeline: stages.map((stage, i) => ({ stage, count: Math.round(wave(`ex:p:${id}:${i}`, t, 4, 80)) })),
  };
}

export interface TeacherOps {
  teachers: number; vacanciesPct: number; postingsPending: number;
  payrollOnTimePct: number; trainingActive: number;
}
export function teacherOps(id: string, t: number): TeacherOps {
  return {
    teachers: 210000 + Math.round(seed(`tc:n:${id}`) * 180000),
    vacanciesPct: Math.round(wave(`tc:v:${id}`, t, 2, 22)),
    postingsPending: Math.round(wave(`tc:pp:${id}`, t, 40, 2400)),
    payrollOnTimePct: Math.round(wave(`tc:py:${id}`, t, 82, 100)),
    trainingActive: Math.round(wave(`tc:tr:${id}`, t, 200, 9000)),
  };
}

export interface StudentServices {
  portalUptime: number; learnerRecordsM: number;
  scholarshipsActive: number; enrolmentRequests: number; satisfactionPct: number;
}
export function studentServices(id: string, t: number): StudentServices {
  return {
    portalUptime: Math.round(wave(`st:up:${id}`, t, 96, 100) * 100) / 100,
    learnerRecordsM: Math.round(wave(`st:lr:${id}`, t, 8, 22) * 10) / 10,
    scholarshipsActive: Math.round(wave(`st:sc:${id}`, t, 4000, 86000)),
    enrolmentRequests: Math.round(wave(`st:er:${id}`, t, 200, 14000)),
    satisfactionPct: Math.round(wave(`st:sf:${id}`, t, 56, 92)),
  };
}

// ── Higher Education ─────────────────────────────────────────────────
// Universities & colleges as an operating environment: enrolment,
// graduation, research output and funding by institution type.
export interface HigherEducation {
  institutions: number; enrolmentK: number; graduationRatePct: number;
  researchOutputIndex: number; fundingGapPct: number;
  tiers: { tier: string; institutions: number; utilisationPct: number; tone: 'ok' | 'warn' | 'alert' }[];
  posture: 'healthy' | 'pressured' | 'underfunded';
}
const HE_TIERS = ['Research universities', 'Comprehensive universities', 'Technical colleges', 'Teacher colleges', 'Private accredited'];
export function higherEducation(id: string, t: number): HigherEducation {
  const tiers = HE_TIERS.map((tier, i) => {
    const institutions = 4 + Math.round(seed(`he:n:${id}:${i}`) * 40);
    const utilisationPct = Math.round(wave(`he:u:${id}:${i}`, t, 45, 102));
    const tone: 'ok' | 'warn' | 'alert' =
      utilisationPct >= 98 || utilisationPct < 55 ? 'alert' : utilisationPct >= 90 || utilisationPct < 68 ? 'warn' : 'ok';
    return { tier, institutions, utilisationPct, tone };
  }).sort((a, b) => b.utilisationPct - a.utilisationPct);
  const fundingGapPct = Math.round(wave(`he:fg:${id}`, t, 2, 34));
  const graduationRatePct = Math.round(wave(`he:gr:${id}`, t, 52, 88));
  const stressed = tiers.filter(x => x.tone === 'alert').length;
  const posture: HigherEducation['posture'] =
    fundingGapPct >= 25 || stressed >= 3 ? 'underfunded' : fundingGapPct >= 14 || stressed >= 1 ? 'pressured' : 'healthy';
  return {
    institutions: tiers.reduce((s, x) => s + x.institutions, 0),
    enrolmentK: Math.round(wave(`he:e:${id}`, t, 180, 1400)),
    graduationRatePct,
    researchOutputIndex: Math.round(wave(`he:ro:${id}`, t, 28, 92)),
    fundingGapPct, tiers, posture,
  };
}

// ── Curriculum Systems ───────────────────────────────────────────────
// Standards, content revision, textbook supply & digital adoption.
export interface CurriculumOps {
  frameworks: number; revisionCyclePct: number; textbookCoveragePct: number;
  digitalAdoptionPct: number; outdatedFrameworks: number;
  subjects: { subject: string; coveragePct: number; lastRevisedYrs: number; tone: 'ok' | 'warn' | 'alert' }[];
  posture: 'current' | 'lagging' | 'obsolete';
}
const CURR_SUBJECTS = ['Mathematics', 'Sciences', 'Languages', 'Civics & history', 'Vocational / TVET', 'Digital literacy'];
export function curriculumOps(id: string, t: number): CurriculumOps {
  const subjects = CURR_SUBJECTS.map((subject, i) => {
    const coveragePct = Math.round(wave(`cu:c:${id}:${i}`, t, 48, 100));
    const lastRevisedYrs = Math.round(wave(`cu:r:${id}:${i}`, t, 0, 11));
    const tone: 'ok' | 'warn' | 'alert' =
      lastRevisedYrs >= 8 || coveragePct < 60 ? 'alert' : lastRevisedYrs >= 5 || coveragePct < 78 ? 'warn' : 'ok';
    return { subject, coveragePct, lastRevisedYrs, tone };
  }).sort((a, b) => b.lastRevisedYrs - a.lastRevisedYrs);
  const outdatedFrameworks = subjects.filter(s => s.tone === 'alert').length;
  const posture: CurriculumOps['posture'] =
    outdatedFrameworks >= 3 ? 'obsolete' : outdatedFrameworks >= 1 ? 'lagging' : 'current';
  return {
    frameworks: 6 + Math.round(seed(`cu:f:${id}`) * 18),
    revisionCyclePct: Math.round(wave(`cu:rc:${id}`, t, 40, 96)),
    textbookCoveragePct: Math.round(wave(`cu:tb:${id}`, t, 55, 99)),
    digitalAdoptionPct: Math.round(wave(`cu:da:${id}`, t, 22, 88)),
    outdatedFrameworks, subjects, posture,
  };
}

// ── Education Command ────────────────────────────────────────────────
// National education authority: synthesises every education subsystem
// engine into one emergent posture, domain rollup and ranked directives.
export interface EduDomainStatus { domain: string; metric: string; value: string; tone: 'ok' | 'warn' | 'alert' }
export interface EduDirective { priority: 'critical' | 'priority' | 'advisory'; title: string; rationale: string; target: string }
export interface EducationCommand {
  postureIndex: number;
  posture: 'steady' | 'engaged' | 'crisis';
  domains: EduDomainStatus[];
  directives: EduDirective[];
  criticalDomains: number;
}
export function educationCommand(id: string, t: number): EducationCommand {
  const sn = schoolNetwork(id, t);
  const ex = examOps(id, t);
  const tch = teacherOps(id, t);
  const he = higherEducation(id, t);
  const cu = curriculumOps(id, t);
  const domains: EduDomainStatus[] = [
    { domain: 'School network', metric: 'Pupil:teacher', value: `${sn.pupilTeacherRatio}:1`,
      tone: sn.pupilTeacherRatio >= 45 ? 'alert' : sn.pupilTeacherRatio >= 35 ? 'warn' : 'ok' },
    { domain: 'Examinations', metric: 'Integrity flags', value: `${ex.integrityFlags}`,
      tone: ex.integrityFlags >= 12 ? 'alert' : ex.integrityFlags >= 4 ? 'warn' : 'ok' },
    { domain: 'Teacher workforce', metric: 'Vacancies', value: `${tch.vacanciesPct}%`,
      tone: tch.vacanciesPct >= 15 ? 'alert' : tch.vacanciesPct >= 8 ? 'warn' : 'ok' },
    { domain: 'Higher education', metric: 'Funding gap', value: `${he.fundingGapPct}%`,
      tone: he.posture === 'underfunded' ? 'alert' : he.posture === 'pressured' ? 'warn' : 'ok' },
    { domain: 'Curriculum', metric: 'Outdated frameworks', value: `${cu.outdatedFrameworks}`,
      tone: cu.posture === 'obsolete' ? 'alert' : cu.posture === 'lagging' ? 'warn' : 'ok' },
  ];
  const directives: EduDirective[] = [];
  if (sn.pupilTeacherRatio >= 45) directives.push({ priority: 'critical', title: 'Emergency teacher deployment', rationale: `Pupil:teacher ${sn.pupilTeacherRatio}:1`, target: 'teacher' });
  if (ex.integrityFlags >= 12) directives.push({ priority: 'critical', title: 'Examination integrity lockdown', rationale: `${ex.integrityFlags} integrity flags`, target: 'exams' });
  if (he.posture === 'underfunded') directives.push({ priority: 'priority', title: 'Tertiary funding intervention', rationale: `Higher-ed funding gap ${he.fundingGapPct}%`, target: 'higher' });
  if (cu.posture === 'obsolete') directives.push({ priority: 'priority', title: 'Curriculum modernisation programme', rationale: `${cu.outdatedFrameworks} obsolete frameworks`, target: 'curriculum' });
  if (sn.dropoutRatePct >= 12) directives.push({ priority: 'priority', title: 'Retention & re-enrolment drive', rationale: `Dropout ${sn.dropoutRatePct}%`, target: 'schools' });
  directives.sort((a, b) => ({ critical: 0, priority: 1, advisory: 2 }[a.priority] - { critical: 0, priority: 1, advisory: 2 }[b.priority]));
  const criticalDomains = domains.filter(d => d.tone === 'alert').length;
  const postureIndex = Math.max(0, Math.min(100, Math.round((100 - educationInstability(id, t)) * 0.5 + (100 - criticalDomains * 18) * 0.5)));
  const posture: EducationCommand['posture'] =
    criticalDomains >= 3 || postureIndex < 45 ? 'crisis' : criticalDomains >= 1 || postureIndex < 70 ? 'engaged' : 'steady';
  return { postureIndex, posture, domains, directives, criticalDomains };
}

/** 0-100 education-sector instability. */
export function educationInstability(id: string, t: number): number {
  const s = schoolNetwork(id, t);
  const x = examOps(id, t);
  const tc = teacherOps(id, t);
  const v =
    Math.max(0, (s.pupilTeacherRatio - 40) * 1.4) +
    s.dropoutRatePct * 1.6 +
    Math.max(0, (90 - s.infrastructurePct)) * 0.5 +
    tc.vacanciesPct * 1.2 +
    x.integrityFlags * 1.2;
  return Math.round(Math.max(0, Math.min(100, v)));
}
