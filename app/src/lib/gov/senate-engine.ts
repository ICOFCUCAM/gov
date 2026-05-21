// lib/gov/senate-engine.ts
//
// Sovereign Senate (Upper House) engine. Pure & deterministic;
// SSR-stable per operational epoch. Generates plenary state, treaty
// ratification queue, committee inquiries, voting blocs and
// procedural metrics with explicit constitutional safeguards.

import { seed, wave } from '@/lib/telemetry';

export const SENATE_SAFEGUARDS = {
  twoThirdsForOverride: true as const,
  treatyRatificationRequired: true as const,
  openHansardWithin24h: true as const,
  closedSessionRequiresPublishedRationale: true as const,
  prohibited: [
    'closed-session-without-rationale', 'censorship-of-floor-debate',
    'gag-orders-on-senators', 'concealment-of-roll-call',
    'tampering-with-hansard', 'override-without-two-thirds',
    'treaty-deposit-without-concurrence',
  ] as const,
};

export type SenatePosture = 'deliberative' | 'in-session' | 'voting' | 'recess' | 'contested';

export interface SenatorRecord {
  id: string;
  name: string;
  region: string;
  bloc: 'government' | 'opposition' | 'crossbench';
  termRemainingYears: number;
  attendancePct: number;
}

export interface SenateBill {
  id: string;
  title: string;
  stage: 'second-reading' | 'committee' | 'amendment' | 'final-vote' | 'awaiting-assent';
  daysOpen: number;
  pageCount: number;
}

export interface TreatyRatification {
  id: string;
  treaty: string;
  scope: 'bilateral' | 'regional' | 'multilateral' | 'universal';
  stage: 'tabled' | 'committee-review' | 'public-consultation' | 'floor-debate' | 'concurred';
  daysOpen: number;
}

export interface CommitteeWork {
  committee: string;
  inquiriesActive: number;
  reportsTabledYTD: number;
  hearingsThisQ: number;
}

export interface SenateBoard {
  epoch: number;
  posture: SenatePosture;
  totalSenators: number;
  blocs: { bloc: 'government' | 'opposition' | 'crossbench'; seats: number }[];
  bills: SenateBill[];
  treaties: TreatyRatification[];
  committees: CommitteeWork[];
  prohibited: readonly string[];
}

const COMMITTEES = ['Foreign Relations', 'Constitutional Affairs', 'Public Finance', 'Defence & Security', 'Public Service', 'Audit & Accountability', 'Inter-Regional Affairs'];

export function senateBoard(now: number): SenateBoard {
  const epoch = Math.max(0, Math.floor(now / 4000));
  const ts = epoch;
  const total = 84;
  const blocs: SenateBoard['blocs'] = [
    { bloc: 'government', seats: 36 + Math.round(seed('sn:gov') * 8) },
    { bloc: 'opposition', seats: 28 + Math.round(seed('sn:opp') * 8) },
    { bloc: 'crossbench', seats: total - 36 - 28 - 8 + 8 },
  ];
  const postures: SenatePosture[] = ['deliberative', 'in-session', 'voting', 'recess', 'contested'];
  const posture = postures[Math.floor(seed(`sn:p:${Math.floor(ts / 8)}`) * postures.length) % postures.length]!;
  const bills: SenateBill[] = Array.from({ length: 8 }, (_, i) => {
    const k = `sn:b:${i}:${Math.floor(ts / 4)}`;
    const stages: SenateBill['stage'][] = ['second-reading', 'committee', 'amendment', 'final-vote', 'awaiting-assent'];
    return {
      id: `BL-${(8000 + Math.floor(seed(`${k}:i`) * 2000))}`,
      title: ['Budget Appropriation Bill', 'Climate Adaptation Bill', 'Civic Identity Framework', 'Cyber Resilience Act', 'Cooperative Autonomy Act', 'Constitutional Amendment 9', 'Strategic Reserve Bill', 'Sovereign Cloud Act'][i]!,
      stage: stages[Math.floor(seed(`${k}:s`) * stages.length)]!,
      daysOpen: Math.round(wave(`${k}:d`, ts, 4, 240)),
      pageCount: Math.round(wave(`${k}:p`, ts, 18, 480)),
    };
  });
  const treaties: TreatyRatification[] = Array.from({ length: 6 }, (_, i) => {
    const k = `sn:t:${i}:${Math.floor(ts / 4)}`;
    const scopes: TreatyRatification['scope'][] = ['bilateral', 'regional', 'multilateral', 'universal'];
    const stages: TreatyRatification['stage'][] = ['tabled', 'committee-review', 'public-consultation', 'floor-debate', 'concurred'];
    return {
      id: `TR-${(40000 + Math.floor(seed(`${k}:i`) * 30000))}`,
      treaty: ['Climate Cooperation Framework', 'Cyber Norms Compact', 'Maritime Boundary Treaty', 'Cultural Heritage Repatriation', 'Aviation Safety Recognition', 'Polar Frontier Coordination'][i]!,
      scope: scopes[Math.floor(seed(`${k}:s`) * scopes.length)]!,
      stage: stages[Math.floor(seed(`${k}:st`) * stages.length)]!,
      daysOpen: Math.round(wave(`${k}:d`, ts, 14, 720)),
    };
  });
  const committees: CommitteeWork[] = COMMITTEES.map((c, i) => ({
    committee: c,
    inquiriesActive: Math.round(wave(`sn:ci:${i}`, ts, 1, 8)),
    reportsTabledYTD: Math.round(wave(`sn:cr:${i}`, ts, 4, 24)),
    hearingsThisQ: Math.round(wave(`sn:ch:${i}`, ts, 4, 48)),
  }));
  return {
    epoch,
    posture,
    totalSenators: total,
    blocs,
    bills,
    treaties,
    committees,
    prohibited: SENATE_SAFEGUARDS.prohibited,
  };
}
