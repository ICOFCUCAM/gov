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

// ── Legislature operating environment ────────────────────────────────
export function chambers(t: number) {
  return [
    { name: 'National Assembly', seats: 350, role: 'Primary chamber' },
    { name: 'Senate', seats: 68, role: 'Territorial review chamber' },
  ].map(c => {
    const present = Math.round(c.seats * (0.55 + seed(`quorum:${c.name}`) * 0.4));
    const quorum = Math.ceil(c.seats / 2);
    return {
      ...c, present, quorum, inQuorum: present >= quorum,
      sitting: seed(`sit:${c.name}:${Math.floor(t / 30)}`) > 0.25,
    };
  });
}
export function committees(t: number) {
  return ['Budget & Finance', 'Public Accounts', 'Justice & Legal', 'Defence & Security',
    'Health', 'Infrastructure', 'Foreign Affairs', 'Constitutional Review'].map(name => ({
    name,
    hearings: Math.round(wave(`cmte:${name}`, t, 0, 6)),
    inquiries: Math.round(seed(`inq:${name}:${Math.floor(t / 20)}`) * 4),
    status: seed(`cst:${name}`) > 0.7 ? 'in session' : 'scheduled',
  }));
}
export function legislativeCalendar(t: number) {
  const items = ['Budget appropriation debate', 'Constitutional amendment — second reading',
    'Public accounts hearing', 'Ministerial question time', 'Electoral reform bill vote',
    'Oversight inquiry — energy procurement'];
  return items.map((l, i) => ({
    l, when: `${9 + i}:00`,
    chamber: i % 2 === 0 ? 'National Assembly' : 'Senate',
    priority: seed(`cal:${l}`) > 0.6 ? 'high' : 'normal',
  }));
}

// ── Judiciary operating ecosystem ────────────────────────────────────
export function courtHierarchy(t: number) {
  return [
    { name: 'Constitutional Court', tier: 'Apex', benches: 9 },
    { name: 'Supreme Court', tier: 'Apex', benches: 21 },
    { name: 'Courts of Appeal', tier: 'Appellate', benches: 64 },
    { name: 'High Courts', tier: 'Superior', benches: 140 },
    { name: 'Regional / Trial Courts', tier: 'First instance', benches: 920 },
  ].map(c => {
    const load = 40 + Math.round(wave(`court:${c.name}`, t, 0, 55));
    return { ...c, load, backlog: Math.round(c.benches * seed(`bk:${c.name}`) * 6),
      clearance: 70 + Math.round(seed(`clr:${c.name}`) * 28) };
  });
}
export function constitutionalReview(t: number) {
  return ['Executive decree challenge', 'Electoral boundary petition', 'Rights-limitation review',
    'Inter-branch competence dispute', 'Emergency-power sunset review'].map(l => ({
    l, stage: ['Admitted', 'Briefed', 'Hearing', 'Deliberation'][Math.floor(seed(`crv:${l}`) * 4)]!,
    ageDays: 10 + Math.round(seed(`crva:${l}`) * 160),
  }));
}
export function judicialRegistries(t: number) {
  return ['Civil registry', 'Criminal registry', 'Land & titles', 'Commercial registry',
    'Constitutional registry', 'Digital filings'].map(name => ({
    name,
    filings: 200 + Math.round(wave(`reg:${name}`, t, 0, 1400)),
    integrity: 96 + Math.round(seed(`regi:${name}`) * 4),
  }));
}

// ── Branch readiness (mirrors institution factory) ───────────────────
export interface BranchReadiness { total: number; posture: string; tone: string; dims: { l: string; v: number }[] }
export function branchReadiness(key: BranchKey, t: number): BranchReadiness {
  const dims = [
    { l: 'Constitutional standing', v: 90 + Math.round(seed(`brc:${key}`) * 9) },
    { l: 'Operational capacity', v: 60 + Math.round(wave(`bro:${key}`, t, 0, 38)) },
    { l: 'Independence', v: key === 'judiciary' || key === 'oversight' ? 88 + Math.round(seed(`bri:${key}`) * 11) : 70 + Math.round(seed(`bri:${key}`) * 20) },
    { l: 'Process integrity', v: 75 + Math.round(seed(`brp:${key}`) * 24) },
    { l: 'Public accountability', v: 65 + Math.round(wave(`bra:${key}`, t, 0, 33)) },
  ];
  const total = Math.round(dims.reduce((a, d) => a + d.v, 0) / dims.length);
  const posture = total >= 85 ? 'Robust' : total >= 70 ? 'Functioning' : total >= 55 ? 'Strained' : 'Compromised';
  const tone = total >= 85 ? 'ok' : total >= 70 ? 'ok' : total >= 55 ? 'warn' : 'alert';
  return { total, posture, tone, dims };
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
