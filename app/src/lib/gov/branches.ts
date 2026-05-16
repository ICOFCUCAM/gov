// Separation-of-powers model. The four branches of the sovereign state
// as first-class governed structures (mirrors the institution factory:
// composition + deterministic operational telemetry + integrity).
// Pure; no React/DOM.

import { seed, wave } from '@/lib/telemetry';

export type BranchKey = 'legislature' | 'judiciary' | 'executive' | 'oversight';

export interface BranchBody { name: string; role: string }
export interface Branch {
  key: BranchKey;
  name: string;
  mandate: string;
  bodies: BranchBody[];
}

export const BRANCHES: Branch[] = [
  {
    key: 'legislature', name: 'Legislature', mandate: 'Law-making · appropriation · oversight of the executive',
    bodies: [
      { name: 'Lower House', role: 'Primary chamber · bills & budget' },
      { name: 'Senate (Upper House)', role: 'Review chamber · territorial representation' },
      { name: 'Standing Committees', role: 'Scrutiny · inquiry · confirmation' },
      { name: 'Budget Office', role: 'Independent fiscal analysis' },
    ],
  },
  {
    key: 'judiciary', name: 'Judiciary', mandate: 'Constitutional review · adjudication · rule of law',
    bodies: [
      { name: 'Constitutional Court', role: 'Constitutionality · separation-of-powers' },
      { name: 'Supreme Court', role: 'Final appellate authority' },
      { name: 'Courts of Appeal', role: 'Appellate review' },
      { name: 'Trial Courts', role: 'First-instance adjudication' },
    ],
  },
  {
    key: 'executive', name: 'Executive', mandate: 'Administration · enforcement · national operations',
    bodies: [
      { name: 'Head of Government', role: 'Executive authority' },
      { name: 'Cabinet', role: 'Collective decision · coordination' },
      { name: 'Ministries', role: 'Institutional delivery' },
      { name: 'Independent Agencies', role: 'Statutory administration' },
    ],
  },
  {
    key: 'oversight', name: 'Oversight', mandate: 'Audit · integrity · constitutional safeguards',
    bodies: [
      { name: 'Auditor-General', role: 'Public-finance assurance' },
      { name: 'Ombudsman', role: 'Maladministration redress' },
      { name: 'Inspectorate', role: 'Anti-corruption enforcement' },
      { name: 'Electoral Commission', role: 'Mandate integrity' },
    ],
  },
];

export function branchFor(key: BranchKey): Branch {
  return BRANCHES.find(b => b.key === key) ?? BRANCHES[2]!;
}

// Deterministic legislative pipeline (bills moving through stages).
export const BILL_STAGES = ['Drafting', 'Committee', 'First reading', 'Second reading', 'Vote', 'Assent'] as const;
export function legislativePipeline(t: number) {
  return BILL_STAGES.map((stage, i) => ({
    stage,
    count: 4 + Math.round(wave(`bill:${stage}`, t, 2, 22)),
    blocked: Math.round(seed(`billx:${stage}:${Math.floor(t / 6)}`) * (i >= 4 ? 3 : 6)),
  }));
}

// Deterministic judicial docket.
export const CASE_STAGES = ['Filed', 'Hearing', 'Deliberation', 'Ruling', 'Constitutional review'] as const;
export function judicialDocket(t: number) {
  return CASE_STAGES.map(stage => ({
    stage,
    count: 6 + Math.round(wave(`case:${stage}`, t, 3, 40)),
    ageDays: 3 + Math.round(seed(`caseage:${stage}`) * 120),
  }));
}

export interface SeparationCheck { l: string; ok: boolean; detail: string }
// Separation-of-powers integrity — invariant watch across the branches.
export function separationIntegrity(t: number): { checks: SeparationCheck[]; intact: boolean } {
  const checks: SeparationCheck[] = [
    { l: 'Executive bound by legislation', ok: true, detail: 'no rule without statute' },
    { l: 'Judicial review available', ok: true, detail: 'constitutional court operational' },
    { l: 'Legislative oversight active', ok: seed(`sep:lo:${Math.floor(t / 30)}`) > 0.1, detail: 'committees sitting' },
    { l: 'Budget requires appropriation', ok: true, detail: 'no expenditure without vote' },
    { l: 'Oversight independence', ok: true, detail: 'auditor-general autonomous' },
    { l: 'No emergency power without sunset', ok: seed(`sep:em:${Math.floor(t / 30)}`) > 0.05, detail: 'time-bound · parliament-renewed' },
  ];
  return { checks, intact: checks.every(c => c.ok) };
}
