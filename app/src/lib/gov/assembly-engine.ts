// lib/gov/assembly-engine.ts
//
// Sovereign National Assembly (Lower House) engine. Pure &
// deterministic. Generates plenary state, bill pipeline, budget cycle,
// citizen-petition queue, Question Time and committee work.

import { seed, wave } from '@/lib/telemetry';

export const ASSEMBLY_SAFEGUARDS = {
  publicVotingByDefault: true as const,
  budgetAppropriationRequiresAssembly: true as const,
  questionTimeWeekly: true as const,
  petitionsTrigger5000: true as const,
  prohibited: [
    'secret-ballots-on-policy', 'budget-without-assembly-vote',
    'cancelling-question-time', 'suppression-of-petitions',
    'tampering-with-hansard', 'closure-without-published-rationale',
    'ministerial-non-appearance',
  ] as const,
};

export type AssemblyPosture = 'orderly' | 'in-session' | 'voting' | 'recess' | 'disorderly';

export interface AssemblyBill {
  id: string;
  title: string;
  stage: 'first-reading' | 'committee' | 'second-reading' | 'amendment' | 'third-reading' | 'sent-to-senate';
  daysOpen: number;
  sponsor: string;
}

export interface AssemblyMember {
  id: string;
  constituency: string;
  bloc: 'government' | 'opposition' | 'crossbench';
  attendancePct: number;
}

export interface BudgetCycleState {
  stage: 'tabled' | 'committee' | 'debate' | 'appropriation-vote' | 'assented';
  scrutinyDaysLeft: number;
  appropriationBn: number;
  ministriesScrutinised: number;
}

export interface CitizenPetition {
  id: string;
  title: string;
  signatures: number;
  daysOpen: number;
  status: 'collecting' | 'threshold-met' | 'scheduled' | 'debated' | 'closed';
}

export interface AssemblyBoard {
  epoch: number;
  posture: AssemblyPosture;
  totalMembers: number;
  blocs: { bloc: 'government' | 'opposition' | 'crossbench'; seats: number }[];
  bills: AssemblyBill[];
  budget: BudgetCycleState;
  petitions: CitizenPetition[];
  questionsThisWeek: number;
  prohibited: readonly string[];
}

export function assemblyBoard(now: number): AssemblyBoard {
  const epoch = Math.max(0, Math.floor(now / 4000));
  const ts = epoch;
  const total = 420;
  const blocs: AssemblyBoard['blocs'] = [
    { bloc: 'government', seats: 218 + Math.round(seed('as:gov') * 18) },
    { bloc: 'opposition', seats: 168 + Math.round(seed('as:opp') * 18) },
    { bloc: 'crossbench', seats: total - 218 - 168 + 4 },
  ];
  const postures: AssemblyPosture[] = ['orderly', 'in-session', 'voting', 'recess', 'disorderly'];
  const posture = postures[Math.floor(seed(`as:p:${Math.floor(ts / 8)}`) * postures.length) % postures.length]!;

  const billTitles = ['Budget Appropriation Bill', 'Education Reform Bill', 'Universal Basic Care Bill', 'National Skills Bill', 'Cyber Sovereignty Bill', 'Strategic Industries Bill', 'Citizen Identity Bill', 'Rural Continuity Bill', 'Emergency Powers Review', 'Climate Resilience Bill'];
  const bills: AssemblyBill[] = Array.from({ length: 10 }, (_, i) => {
    const k = `as:b:${i}:${Math.floor(ts / 4)}`;
    const stages: AssemblyBill['stage'][] = ['first-reading', 'committee', 'second-reading', 'amendment', 'third-reading', 'sent-to-senate'];
    return {
      id: `BL-${(20000 + Math.floor(seed(`${k}:i`) * 30000))}`,
      title: billTitles[i]!,
      stage: stages[Math.floor(seed(`${k}:s`) * stages.length)]!,
      daysOpen: Math.round(wave(`${k}:d`, ts, 4, 120)),
      sponsor: ['Hon. Adamu', 'Hon. Petrov', 'Hon. Mehta', 'Hon. Oduya', 'Hon. Tanaka'][i % 5]!,
    };
  });
  const budgetStages: BudgetCycleState['stage'][] = ['tabled', 'committee', 'debate', 'appropriation-vote', 'assented'];
  const budget: BudgetCycleState = {
    stage: budgetStages[Math.floor(seed(`as:bdg:${Math.floor(ts / 8)}`) * budgetStages.length) % budgetStages.length]!,
    scrutinyDaysLeft: Math.round(wave(`as:bds`, ts, 0, 60)),
    appropriationBn: Math.round(wave(`as:bda`, ts, 240, 980) * 10) / 10,
    ministriesScrutinised: Math.round(wave(`as:bdm`, ts, 4, 15)),
  };
  const petitionTopics = ['Climate-adaptation funding', 'Universal access to legal aid', 'Open-source curriculum mandate', 'Right to repair', 'Sovereign cloud audit', 'Workplace co-determination', 'Citizen data privacy', 'Rural broadband acceleration'];
  const petitions: CitizenPetition[] = Array.from({ length: 8 }, (_, i) => {
    const k = `as:pet:${i}:${Math.floor(ts / 4)}`;
    const statuses: CitizenPetition['status'][] = ['collecting', 'threshold-met', 'scheduled', 'debated', 'closed'];
    return {
      id: `PT-${(80000 + Math.floor(seed(`${k}:i`) * 20000))}`,
      title: petitionTopics[i]!,
      signatures: Math.round(wave(`${k}:sg`, ts, 800, 84000)),
      daysOpen: Math.round(wave(`${k}:dy`, ts, 4, 180)),
      status: statuses[Math.floor(seed(`${k}:st`) * statuses.length)]!,
    };
  });
  return {
    epoch,
    posture,
    totalMembers: total,
    blocs,
    bills,
    budget,
    petitions,
    questionsThisWeek: Math.round(wave('as:qw', ts, 80, 380)),
    prohibited: ASSEMBLY_SAFEGUARDS.prohibited,
  };
}
