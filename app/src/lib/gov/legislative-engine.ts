// Live Legislative Engine.
//
// The legislature is not a static pipeline diagram — it is a running
// state machine. Bills are instantiated and advance through the
// constitutional stages as a function of time; some stall in committee,
// some are withdrawn, one sits on the floor for a live division. Pure &
// deterministic; the chamber as a continuously operating institution.

import { seed, wave } from '@/lib/telemetry';

export const BILL_STAGES = [
  'Drafting', 'Committee', 'Debate', 'Amendment', 'Division',
  'Constitutional review', 'Assent', 'Published',
] as const;
export type BillStage = (typeof BILL_STAGES)[number] | 'Withdrawn';

const TITLES = [
  'Public Finance Management Amendment', 'National Health Insurance', 'Data Protection',
  'Electoral Reform', 'Climate Resilience', 'Devolution Funding', 'Anti-Corruption Strengthening',
  'Critical Infrastructure Security', 'Education Modernisation', 'Agricultural Stabilisation',
  'Digital Identity', 'Energy Transition', 'Labour Relations', 'Procurement Integrity',
];
const SPONSORS = ['Government', 'Opposition', 'Private Member', 'Committee', 'Senate'];

export interface Bill {
  id: string;
  title: string;
  sponsor: string;
  chamber: string;
  stage: BillStage;
  stageIdx: number;       // index into BILL_STAGES (-1 if withdrawn)
  progressPct: number;    // 0-100 lifecycle completion
  blocked: boolean;
  priority: 'routine' | 'priority' | 'flagship';
  ageDays: number;
}

export interface Division {
  billId: string;
  billTitle: string;
  ayes: number;
  noes: number;
  abstain: number;
  total: number;
  threshold: number;      // votes needed to carry
  carried: boolean;
}

export interface Party { party: string; seats: number; bloc: 'government' | 'opposition' | 'crossbench' }

export interface LegislativeState {
  bills: Bill[];
  division: Division | null;
  parties: Party[];
  attendancePct: number;
  quorum: boolean;
  inSession: number;
  blocked: number;
  publishedYtd: number;
  withdrawn: number;
}

const PARTIES: Party[] = [
  { party: 'National Coalition', seats: 168, bloc: 'government' },
  { party: 'Democratic Front', seats: 121, bloc: 'opposition' },
  { party: 'Reform Alliance', seats: 44, bloc: 'opposition' },
  { party: 'Independents', seats: 17, bloc: 'crossbench' },
];

export function legislativeState(t: number, chambers: string[] = ['House', 'Senate']): LegislativeState {
  const bills: Bill[] = TITLES.map((title, i) => {
    const offset = seed(`bill:off:${i}`) * BILL_STAGES.length;
    const cadence = 9 + seed(`bill:cad:${i}`) * 7; // ticks per stage
    const raw = (t / cadence) + offset;
    let stageIdx = Math.floor(raw) % (BILL_STAGES.length + 2); // +2 → terminal dwell
    const withdrawn = seed(`bill:wd:${i}`) > 0.88;
    const blocked = !withdrawn && seed(`bill:bk:${i}:${Math.floor(raw)}`) > 0.8;
    let stage: BillStage;
    if (withdrawn) { stage = 'Withdrawn'; stageIdx = -1; }
    else {
      if (stageIdx >= BILL_STAGES.length) stageIdx = BILL_STAGES.length - 1; // dwell at Published
      stage = BILL_STAGES[stageIdx]!;
    }
    const progressPct = withdrawn ? 0 : Math.round(((stageIdx + (raw % 1)) / BILL_STAGES.length) * 100);
    const pr = seed(`bill:pr:${i}`);
    return {
      id: `B-${100 + i}`,
      title: `${title} Bill`,
      sponsor: SPONSORS[Math.floor(seed(`bill:sp:${i}`) * SPONSORS.length)]!,
      chamber: chambers[i % chambers.length]!,
      stage, stageIdx,
      progressPct: Math.max(0, Math.min(100, progressPct)),
      blocked,
      priority: pr > 0.8 ? 'flagship' : pr > 0.5 ? 'priority' : 'routine',
      ageDays: 12 + Math.round(seed(`bill:age:${i}`) * 240),
    };
  });

  // The bill currently at Division gets a live floor vote.
  const onFloor = bills.find(b => b.stage === 'Division' && !b.blocked) ?? null;
  let division: Division | null = null;
  if (onFloor) {
    const govSeats = PARTIES.filter(p => p.bloc === 'government').reduce((a, p) => a + p.seats, 0);
    const oppSeats = PARTIES.filter(p => p.bloc === 'opposition').reduce((a, p) => a + p.seats, 0);
    const cross = PARTIES.filter(p => p.bloc === 'crossbench').reduce((a, p) => a + p.seats, 0);
    const swing = Math.round(wave(`div:${onFloor.id}`, t, -0.2, 0.55) * cross);
    const ayes = Math.round(govSeats * (0.86 + seed(`div:a:${onFloor.id}`) * 0.1)) + Math.max(0, swing);
    const noes = Math.round(oppSeats * (0.8 + seed(`div:n:${onFloor.id}`) * 0.15)) + Math.max(0, -swing);
    const total = govSeats + oppSeats + cross;
    const abstain = Math.max(0, total - ayes - noes);
    const threshold = Math.floor(total / 2) + 1;
    division = { billId: onFloor.id, billTitle: onFloor.title, ayes, noes, abstain, total, threshold, carried: ayes >= threshold };
  }

  const attendancePct = Math.round(wave('leg:att', t, 78, 97));
  const quorum = attendancePct >= 50;

  return {
    bills,
    division,
    parties: PARTIES,
    attendancePct,
    quorum,
    inSession: bills.filter(b => ['Committee', 'Debate', 'Amendment', 'Division'].includes(b.stage)).length,
    blocked: bills.filter(b => b.blocked).length,
    publishedYtd: bills.filter(b => b.stage === 'Published').length + 30 + Math.round(seed('leg:pub') * 40),
    withdrawn: bills.filter(b => b.stage === 'Withdrawn').length,
  };
}

export interface CommitteeInquiry {
  committee: string;
  subject: string;
  status: 'gathering evidence' | 'hearings' | 'report drafting' | 'reported';
  witnessesHeard: number;
  daysActive: number;
}
const COMMITTEES = ['Public Accounts', 'Finance & Budget', 'Defence & Security', 'Health', 'Justice & Legal', 'Infrastructure'];
const SUBJECTS = ['Budget overrun inquiry', 'Procurement irregularity', 'Service-delivery audit', 'Constitutional compliance', 'Emergency-powers review', 'Infrastructure cost review'];
export function committeeInquiries(t: number): CommitteeInquiry[] {
  return COMMITTEES.map((committee, i) => {
    const phase = Math.floor((t / (14 + seed(`ci:c:${i}`) * 10)) + seed(`ci:o:${i}`) * 4) % 4;
    const status = (['gathering evidence', 'hearings', 'report drafting', 'reported'] as const)[phase]!;
    return {
      committee: `${committee} Committee`,
      subject: SUBJECTS[Math.floor(seed(`ci:s:${i}`) * SUBJECTS.length)]!,
      status,
      witnessesHeard: 2 + Math.round(seed(`ci:w:${i}`) * 22 * (phase >= 1 ? 1 : 0.3)),
      daysActive: 4 + Math.round(seed(`ci:d:${i}`) * 90),
    };
  });
}
