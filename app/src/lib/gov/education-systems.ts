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
