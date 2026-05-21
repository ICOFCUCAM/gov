// lib/gov/judicial-branch-engine.ts
//
// Sovereign Judicial Branch engine — constitutional & supreme court
// posture, case docket, justices, judicial conduct. Pure &
// deterministic. SSR-stable per operational epoch.

import { seed, wave } from '@/lib/telemetry';

export const JUDICIAL_BRANCH_SAFEGUARDS = {
  judicialIndependence: true as const,
  openReasoningInEveryDecision: true as const,
  rightToCounselGuaranteed: true as const,
  prohibitionOfPoliticalInfluence: true as const,
  prohibited: [
    'political-pressure-on-justices', 'sealed-rulings-without-rationale',
    'denial-of-counsel', 'evidence-tampering',
    'forum-shopping-by-the-state', 'concealment-of-judicial-conduct-findings',
    'compulsory-uniformity-of-jurisprudence',
  ] as const,
};

export type JudicialPosture = 'orderly' | 'in-session' | 'deliberation' | 'recess' | 'contested';

export interface CourtTier {
  tier: 'Constitutional' | 'Supreme' | 'Appeals' | 'Trial' | 'Tribunal';
  benches: number;
  activeCases: number;
  backlog: number;
  clearancePct: number;
}

export interface Justice {
  id: string;
  name: string;
  court: 'Constitutional' | 'Supreme';
  termRemainingYears: number;
  appointedBy: 'Senate two-thirds' | 'Independent panel';
}

export interface CaseRecord {
  id: string;
  kind: 'constitutional' | 'criminal-appeal' | 'civil-appeal' | 'commercial' | 'administrative';
  stage: 'filing' | 'pleadings' | 'hearing' | 'deliberation' | 'ruling-published';
  daysOpen: number;
  publicHearing: boolean;
}

export interface ConductCase {
  id: string;
  justice: string;
  ground: 'misconduct' | 'conflict' | 'capacity' | 'political-pressure';
  stage: 'review' | 'civilian-panel' | 'tribunal' | 'closed';
  daysOpen: number;
}

export interface JudicialBranchBoard {
  epoch: number;
  posture: JudicialPosture;
  tiers: CourtTier[];
  justices: Justice[];
  cases: CaseRecord[];
  conductCases: ConductCase[];
  medianDecisionDays: number;
  rightsToCounselGuaranteed: boolean;
  prohibited: readonly string[];
}

export function judicialBranchBoard(now: number): JudicialBranchBoard {
  const epoch = Math.max(0, Math.floor(now / 4000));
  const ts = epoch;
  const tiers: CourtTier[] = [
    { tier: 'Constitutional', benches: 1,   activeCases: Math.round(wave(`jb:c1`, ts, 14, 48)),   backlog: Math.round(wave(`jb:c1b`, ts, 4, 28)),   clearancePct: Math.round(wave(`jb:c1c`, ts, 78, 96)) },
    { tier: 'Supreme',        benches: 6,   activeCases: Math.round(wave(`jb:c2`, ts, 84, 240)),  backlog: Math.round(wave(`jb:c2b`, ts, 24, 120)), clearancePct: Math.round(wave(`jb:c2c`, ts, 72, 92)) },
    { tier: 'Appeals',        benches: 24,  activeCases: Math.round(wave(`jb:c3`, ts, 240, 980)), backlog: Math.round(wave(`jb:c3b`, ts, 60, 460)), clearancePct: Math.round(wave(`jb:c3c`, ts, 68, 88)) },
    { tier: 'Trial',          benches: 380, activeCases: Math.round(wave(`jb:c4`, ts, 2400, 12000)), backlog: Math.round(wave(`jb:c4b`, ts, 480, 4800)), clearancePct: Math.round(wave(`jb:c4c`, ts, 64, 84)) },
    { tier: 'Tribunal',       benches: 38,  activeCases: Math.round(wave(`jb:c5`, ts, 80, 480)),  backlog: Math.round(wave(`jb:c5b`, ts, 24, 240)),  clearancePct: Math.round(wave(`jb:c5c`, ts, 70, 92)) },
  ];
  const postures: JudicialPosture[] = ['orderly', 'in-session', 'deliberation', 'recess', 'contested'];
  const posture = postures[Math.floor(seed(`jb:p:${Math.floor(ts / 8)}`) * postures.length) % postures.length]!;
  const justices: Justice[] = Array.from({ length: 11 }, (_, i) => ({
    id: `J-${String(i + 1).padStart(2, '0')}`,
    name: ['Chief Justice Adamu', 'J. Petrov', 'J. Mehta', 'J. Oduya', 'J. Tanaka', 'J. Brennan', 'J. Park', 'J. Chen', 'J. Okafor', 'J. Ngozi', 'J. Hassan'][i]!,
    court: i === 0 || i % 4 === 0 ? 'Constitutional' : 'Supreme',
    termRemainingYears: Math.round(wave(`jb:j:${i}`, ts, 2, 24)),
    appointedBy: i % 2 === 0 ? 'Senate two-thirds' : 'Independent panel',
  }));
  const caseKinds: CaseRecord['kind'][] = ['constitutional', 'criminal-appeal', 'civil-appeal', 'commercial', 'administrative'];
  const cases: CaseRecord[] = Array.from({ length: 10 }, (_, i) => {
    const k = `jb:cs:${i}:${Math.floor(ts / 4)}`;
    const stages: CaseRecord['stage'][] = ['filing', 'pleadings', 'hearing', 'deliberation', 'ruling-published'];
    return {
      id: `C-${(40000 + Math.floor(seed(`${k}:i`) * 30000))}`,
      kind: caseKinds[i % caseKinds.length]!,
      stage: stages[Math.floor(seed(`${k}:s`) * stages.length)]!,
      daysOpen: Math.round(wave(`${k}:d`, ts, 14, 720)),
      publicHearing: seed(`${k}:p`) > 0.18,
    };
  });
  const conductGrounds: ConductCase['ground'][] = ['misconduct', 'conflict', 'capacity', 'political-pressure'];
  const conductCases: ConductCase[] = Array.from({ length: 3 }, (_, i) => {
    const k = `jb:cc:${i}:${Math.floor(ts / 4)}`;
    const stages: ConductCase['stage'][] = ['review', 'civilian-panel', 'tribunal', 'closed'];
    return {
      id: `JC-${(60000 + Math.floor(seed(`${k}:i`) * 20000))}`,
      justice: justices[i + 1]!.name,
      ground: conductGrounds[Math.floor(seed(`${k}:g`) * conductGrounds.length)]!,
      stage: stages[Math.floor(seed(`${k}:s`) * stages.length)]!,
      daysOpen: Math.round(wave(`${k}:d`, ts, 14, 240)),
    };
  });
  return {
    epoch,
    posture,
    tiers,
    justices,
    cases,
    conductCases,
    medianDecisionDays: Math.round(wave('jb:md', ts, 18, 84)),
    rightsToCounselGuaranteed: true,
    prohibited: JUDICIAL_BRANCH_SAFEGUARDS.prohibited,
  };
}
