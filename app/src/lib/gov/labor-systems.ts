// Labour Systems — deep operational engine (LABOR archetype).
// Employment services, workplace inspection, social insurance and
// dispute resolution as live environments. Pure & deterministic.

import { seed, wave } from '@/lib/telemetry';

export interface LaborOps {
  unemploymentPct: number;
  jobseekersM: number; placementsToday: number; vacancies: number;
  inspection: { unitsActive: number; compliancePct: number; openCases: number };
  socialInsurance: { fundsBn: number; contributorsM: number; claimsPending: number; payoutOnTimePct: number };
  disputes: { tribunals: number; openDisputes: number; medianDays: number; resolvedRate: number };
  skillsTrainingActive: number;
}

export function laborOps(id: string, t: number): LaborOps {
  return {
    unemploymentPct: Math.round(wave(`lb:un:${id}`, t, 4, 26) * 10) / 10,
    jobseekersM: Math.round(wave(`lb:js:${id}`, t, 0.6, 4.2) * 10) / 10,
    placementsToday: Math.round(wave(`lb:pl:${id}`, t, 200, 6400)),
    vacancies: Math.round(wave(`lb:vc:${id}`, t, 2000, 84000)),
    inspection: {
      unitsActive: Math.round(wave(`lb:iu:${id}`, t, 20, 160)),
      compliancePct: Math.round(wave(`lb:ic:${id}`, t, 58, 94)),
      openCases: Math.round(wave(`lb:io:${id}`, t, 40, 2200)),
    },
    socialInsurance: {
      fundsBn: Math.round(wave(`lb:sf:${id}`, t, 8, 64) * 10) / 10,
      contributorsM: Math.round(wave(`lb:sc:${id}`, t, 2, 12) * 10) / 10,
      claimsPending: Math.round(wave(`lb:sp:${id}`, t, 200, 9400)),
      payoutOnTimePct: Math.round(wave(`lb:sy:${id}`, t, 70, 99)),
    },
    disputes: {
      tribunals: 30 + Math.round(seed(`lb:dt:${id}`) * 40),
      openDisputes: Math.round(wave(`lb:do:${id}`, t, 100, 5400)),
      medianDays: Math.round(wave(`lb:dm:${id}`, t, 14, 180)),
      resolvedRate: Math.round(wave(`lb:dr:${id}`, t, 48, 92)),
    },
    skillsTrainingActive: Math.round(wave(`lb:st:${id}`, t, 400, 22000)),
  };
}

export function laborInstability(id: string, t: number): number {
  const o = laborOps(id, t);
  const v =
    Math.max(0, (o.unemploymentPct - 8) * 2.2) +
    Math.max(0, (90 - o.socialInsurance.payoutOnTimePct) * 0.8) +
    Math.max(0, (o.disputes.medianDays - 60) * 0.3) +
    Math.max(0, (85 - o.inspection.compliancePct) * 0.5);
  return Math.round(Math.max(0, Math.min(100, v)));
}
