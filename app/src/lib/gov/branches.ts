// Constitutional process engines. Government TOPOLOGY is not defined
// here — it is resolved from the Constitution Engine per sovereign
// form. This module supplies the deterministic operational engines
// (legislative pipeline, judicial docket, separation integrity,
// readiness) that any constitutional branch runs. Pure; no React/DOM.

import { seed, wave } from '@/lib/telemetry';
import type { StateForm } from '@/lib/api/types';
import { constitutionFor, type BranchDef, type BranchKey } from '@/lib/gov/constitution';

export type { BranchKey, BranchDef } from '@/lib/gov/constitution';
export type Branch = BranchDef;

/** Branches resolved from the configured constitutional form. */
export function branchesFor(form: StateForm): BranchDef[] {
  return constitutionFor(form).branches;
}
export function branchFor(form: StateForm, key: string): BranchDef {
  const bs = constitutionFor(form).branches;
  return bs.find(b => b.key === key) ?? bs.find(b => b.key === 'executive') ?? bs[0]!;
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
export function chambersFor(form: StateForm, t: number) {
  return constitutionFor(form).legislature.chambers.map(c => {
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
export function courtHierarchyFor(form: StateForm, t: number) {
  const c0 = constitutionFor(form);
  return c0.judicialTiers.map((name, i) => {
    const benches = [9, 21, 64, 140, 920][i] ?? Math.max(6, 60 - i * 8);
    const tier = name === c0.judicialApex ? 'Apex' : i <= 1 ? 'Superior' : i === c0.judicialTiers.length - 1 ? 'First instance' : 'Appellate';
    const load = 40 + Math.round(wave(`court:${name}`, t, 0, 55));
    return { name, tier, benches, load,
      backlog: Math.round(benches * seed(`bk:${name}`) * 6),
      clearance: 70 + Math.round(seed(`clr:${name}`) * 28) };
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
