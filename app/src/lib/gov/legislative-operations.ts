// Legislature — operational engine extensions (scheduling, amendment
// workflow, oversight hearings, budget-approval pipeline, public
// hearings) beyond legislative-engine.ts. Pure & deterministic.

import { seed, wave } from '@/lib/telemetry';

export interface ParliamentarySchedule {
  sittingsThisWeek: number;
  orderPaperItems: number;
  scheduledHearings: number;
  recess: boolean;
  scheduleConflicts: number;
}
export function parliamentarySchedule(t: number): ParliamentarySchedule {
  return {
    sittingsThisWeek: 3 + Math.round(seed(`ps:sw:${Math.floor(t / 40)}`) * 5),
    orderPaperItems: Math.round(wave('ps:op', t, 8, 64)),
    scheduledHearings: Math.round(wave('ps:sh', t, 2, 28)),
    recess: seed(`ps:rc:${Math.floor(t / 120)}`) > 0.85,
    scheduleConflicts: Math.round(wave('ps:cf', t, 0, 12)),
  };
}

export interface BudgetApprovalPipeline {
  stage: 'tabled' | 'committee' | 'debate' | 'appropriation vote' | 'assented';
  appropriationBn: number;
  scrutinyDaysLeft: number;
  blocked: boolean;
  amendmentsTabled: number;
}
const BAP = ['tabled', 'committee', 'debate', 'appropriation vote', 'assented'] as const;
export function budgetApprovalPipeline(t: number): BudgetApprovalPipeline {
  const idx = Math.floor((t / 26) % BAP.length);
  return {
    stage: BAP[idx]!,
    appropriationBn: Math.round(wave('bap:ap', t, 80, 220) * 10) / 10,
    scrutinyDaysLeft: Math.max(0, 30 - Math.round((t / 26 % 1) * 30)),
    blocked: seed(`bap:bl:${Math.floor(t / 26)}`) > 0.8,
    amendmentsTabled: Math.round(wave('bap:am', t, 0, 40)),
  };
}

export interface OversightHearings {
  active: { committee: string; subject: string; witnesses: number; status: 'scheduled' | 'in session' | 'reported' }[];
  inquiriesOpen: number;
  summonsesIssued: number;
}
const OC = ['Public Accounts', 'Finance & Budget', 'Defence & Security', 'Health', 'Justice'];
const OS = ['Procurement irregularity', 'Budget overrun', 'Constitutional compliance', 'Emergency-powers review', 'Service delivery'];
export function oversightHearings(t: number): OversightHearings {
  const active = OC.map((committee, i) => {
    const phase = Math.floor((t / (16 + seed(`oh:c:${i}`) * 8) + seed(`oh:o:${i}`) * 3)) % 3;
    return {
      committee: `${committee} Committee`,
      subject: OS[Math.floor(seed(`oh:s:${i}`) * OS.length)]!,
      witnesses: 2 + Math.round(seed(`oh:w:${i}`) * 20),
      status: (['scheduled', 'in session', 'reported'] as const)[phase]!,
    };
  });
  return {
    active,
    inquiriesOpen: active.filter(a => a.status !== 'reported').length,
    summonsesIssued: Math.round(wave('oh:su', t, 0, 30)),
  };
}
