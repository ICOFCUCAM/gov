// Citizen–State Interaction Lifecycle.
//
// A citizen request is a real cross-institution case: submitted via the
// Citizen Wallet, routed to the responsible institution, processed there,
// resolved or escalated. This engine models the live request population,
// its routing and SLA, and the per-institution inbound load — feeding
// both Citizen Wallet and the target institutions. Pure & deterministic.

import { seed, wave } from '@/lib/telemetry';
import type { ArchetypeKey } from '@/lib/api/types';

export type RequestStage = 'submitted' | 'routed' | 'in-process' | 'resolved' | 'escalated';

const CATEGORIES: { category: string; target: ArchetypeKey }[] = [
  { category: 'Health appointment / record', target: 'HEALTH' },
  { category: 'Tax / payment query', target: 'FINANCE' },
  { category: 'School enrolment', target: 'EDUCATION' },
  { category: 'Vehicle / licence', target: 'TRANSPORT' },
  { category: 'Power connection', target: 'ENERGY' },
  { category: 'Identity / civil record', target: 'INTERIOR' },
  { category: 'Land / business permit', target: 'TRADE' },
  { category: 'Legal aid request', target: 'JUSTICE' },
  { category: 'Subsidy / cooperative', target: 'AGRICULTURE' },
  { category: 'Environmental complaint', target: 'ENVIRONMENT' },
];

export interface CitizenRequest {
  id: string;
  category: string;
  target: ArchetypeKey;
  stage: RequestStage;
  ageHrs: number;
  slaHrs: number;
  breaching: boolean;
}

export interface CitizenRequestState {
  requests: CitizenRequest[];
  open: number;
  resolved: number;
  escalated: number;
  breaching: number;
  slaMetPct: number;
  byTarget: { target: ArchetypeKey; inbound: number; breaching: number }[];
}

export function citizenRequests(t: number, count = 16): CitizenRequestState {
  const stages: RequestStage[] = ['submitted', 'routed', 'in-process', 'resolved'];
  const requests: CitizenRequest[] = Array.from({ length: count }, (_, i): CitizenRequest => {
    const c = CATEGORIES[i % CATEGORIES.length]!;
    const cadence = 6 + seed(`cr:c:${i}`) * 9;
    const raw = (t / cadence) + seed(`cr:o:${i}`) * stages.length;
    const escalated = seed(`cr:e:${i}:${Math.floor(raw / 2)}`) > 0.86;
    const sIdx = Math.min(stages.length - 1, Math.floor(raw) % stages.length);
    const stage: RequestStage = escalated ? 'escalated' : stages[sIdx]!;
    const slaHrs = [48, 72, 120][i % 3]!;
    const ageHrs = Math.round(wave(`cr:a:${i}`, t, 1, 200));
    return {
      id: `CR-${5000 + i}`,
      category: c.category,
      target: c.target,
      stage,
      ageHrs,
      slaHrs,
      breaching: stage !== 'resolved' && ageHrs > slaHrs,
    };
  });
  const open = requests.filter(r => r.stage !== 'resolved').length;
  const resolved = requests.filter(r => r.stage === 'resolved').length;
  const escalated = requests.filter(r => r.stage === 'escalated').length;
  const breaching = requests.filter(r => r.breaching).length;
  const slaMetPct = requests.length ? Math.round(((requests.length - breaching) / requests.length) * 100) : 100;

  const targets = [...new Set(requests.map(r => r.target))];
  const byTarget = targets.map(target => ({
    target,
    inbound: requests.filter(r => r.target === target && r.stage !== 'resolved').length,
    breaching: requests.filter(r => r.target === target && r.breaching).length,
  })).sort((a, b) => b.inbound - a.inbound);

  return { requests, open, resolved, escalated, breaching, slaMetPct, byTarget };
}

/** Inbound citizen-request pressure on a given institution archetype. */
export function citizenLoad(archetype: ArchetypeKey, t: number): number {
  const s = citizenRequests(t);
  const row = s.byTarget.find(b => b.target === archetype);
  if (!row) return 0;
  return Math.round(Math.min(100, row.inbound * 9 + row.breaching * 14));
}
