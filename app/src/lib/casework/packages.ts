// Procedures (case packages, docs/GOVERNMENT_OPERATING_MODEL.md §6.2-6.3,
// directions 5.3-5.5): what a procedure needs (fields, documents), its stages
// and the actions between them, who may take each, the legal deadlines, the
// appeal, the retention class and the laws it rests on. Versioned. A version
// starts as a draft (written by the responsible authority's officials, or
// shipped by CivicOS as a reference), is approved by an official who can sign
// at that authority, different from its author, once its own tests pass,
// and applies from a date; the next approved version supersedes it. Cases
// keep the version they opened under. A procedure the nation has not
// approved never runs. Held in platform state.

import { recordAudit } from '@/lib/data/store/audit';
import { touch } from '@/lib/data/repo/track';
import { dualControlRefusal } from '@/lib/data/dual-control';
import { isAuthorityKey, type AuthorityKey } from '@/lib/nation/deployment';
import type { CasePackage, ActionSpec, FieldSpec, PackageTest } from './types';

interface PackageDb { packages: CasePackage[] }
const g = globalThis as unknown as { __civicosCasePackages?: PackageDb };
const db = (): PackageDb => touch('__civicosCasePackages', g.__civicosCasePackages ??= { packages: [] });
export function resetPackages(): void { g.__civicosCasePackages = undefined; }

const KEY = /^[a-z][a-z0-9]*(?:[.-][a-z0-9]+)*$/;
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
/** Field keys are names a form and its data use: camelCase. */
const FIELD_KEY = /^[a-z][A-Za-z0-9]{0,40}$/;
const FIELD_TYPES = ['text', 'longtext', 'date', 'number', 'choice', 'boolean', 'person', 'organisation', 'place'];

/** Check a procedure's structure: every stage, action, field, document and deadline must fit together. */
export function checkPackage(p: Partial<CasePackage>, effects: string[] = []): string | null {
  if (!p.key || !KEY.test(p.key) || p.key.length > 60) return 'A procedure key is lowercase words joined by dots or dashes (e.g. civil.birth)';
  if (!Number.isInteger(p.version) || p.version! < 1) return 'The version is a whole number from 1';
  if (!p.owner || typeof p.owner !== 'string') return 'Name the authority (or institution) responsible';
  if (!p.title?.trim()) return 'Give the procedure a title';
  if (!p.refPrefix || !/^[A-Z]{2,6}$/.test(p.refPrefix)) return 'The reference prefix is 2 to 6 capital letters';
  const stages = p.stages ?? [];
  if (stages.length < 2) return 'A procedure has at least two stages';
  const sk = new Set(stages.map(s => s.key));
  if (sk.size !== stages.length || stages.some(s => !KEY.test(s.key))) return 'Stage keys must be distinct lowercase words';
  if (!stages.some(s => s.terminal)) return 'At least one stage ends the case';
  const fk = new Set<string>();
  for (const f of p.fields ?? []) {
    if (!FIELD_KEY.test(f.key) || fk.has(f.key)) return `Field ${f.key}: keys must be distinct names in camelCase`;
    if (!FIELD_TYPES.includes(f.type)) return `Field ${f.key}: unknown type ${f.type}`;
    if (f.type === 'choice' && !f.options?.length) return `Field ${f.key}: a choice needs its options`;
    fk.add(f.key);
  }
  const dk = new Set((p.documents ?? []).map(d => d.class));
  const ak = new Set<string>();
  for (const a of p.actions ?? []) {
    if (!KEY.test(a.key) || ak.has(a.key)) return `Action ${a.key}: keys must be distinct lowercase words`;
    ak.add(a.key);
    if (!a.from?.length || a.from.some(s => !sk.has(s))) return `Action ${a.key}: it starts from stages that do not exist`;
    if (!sk.has(a.to)) return `Action ${a.key}: it leads to a stage that does not exist`;
    if (a.from.some(s => stages.find(x => x.key === s)?.terminal)) return `Action ${a.key}: no action starts from a stage that ends the case`;
    if (a.needs?.role !== 'officer' && a.needs?.role !== 'signatory') return `Action ${a.key}: needs an officer or a signatory`;
    if (a.decision && a.needs.role !== 'signatory') return `Action ${a.key}: a decision needs an official who can sign`;
    if (a.decision && !a.requires?.reasons) return `Action ${a.key}: a decision states its reasons`;
    for (const d of a.requires?.documents ?? []) if (!dk.has(d)) return `Action ${a.key}: requires an unknown document class ${d}`;
    for (const f of a.requires?.fields ?? []) if (!fk.has(f)) return `Action ${a.key}: requires an unknown field ${f}`;
    for (const e of a.effects ?? []) if (!effects.includes(e)) return `Action ${a.key}: no module provides the effect ${e}`;
  }
  if (!ak.size) return 'A procedure has at least one action';
  for (const d of p.deadlines ?? []) {
    if (d.from !== 'opened' && !sk.has(d.from)) return `Deadline ${d.key}: counted from a stage that does not exist`;
    if (!Number.isInteger(d.days) || d.days < 1 || d.days > 3650) return `Deadline ${d.key}: days from 1 to 3650`;
  }
  if (p.appeal && (!Number.isInteger(p.appeal.days) || p.appeal.days < 1)) return 'The appeal window is a number of days';
  if (!p.retention?.trim()) return 'Name the retention class of its cases';
  if (!['normal', 'restricted', 'secret'].includes(p.sensitivity ?? '')) return 'Sensitivity must be normal, restricted or secret';
  if (p.migration) for (const [from, to] of Object.entries(p.migration.stageMap)) if (!sk.has(to)) return `Migration maps ${from} to a stage that does not exist`;
  return null;
}

/** Walk a procedure's own tests without a case: each step's action must be allowed from the stage reached and land where expected. */
export function runPackageTests(p: CasePackage): { ok: boolean; failures: string[] } {
  const failures: string[] = [];
  const start = p.stages[0]!.key;
  for (const t of p.tests) {
    let stage = start;
    const fields: Record<string, unknown> = {};
    const docs = new Set<string>();
    for (const [i, s] of t.steps.entries()) {
      Object.assign(fields, s.fields ?? {});
      for (const d of s.documents ?? []) docs.add(d);
      const a = p.actions.find(x => x.key === s.action);
      const why = !a ? 'no such action' : !a.from.includes(stage) ? `not allowed from ${stage}`
        : (a.requires?.fields ?? []).find(f => fields[f] === undefined || fields[f] === '') ? `missing field ${(a.requires?.fields ?? []).find(f => fields[f] === undefined || fields[f] === '')}`
        : (a.requires?.documents ?? []).find(d => !docs.has(d)) ? `missing document ${(a.requires?.documents ?? []).find(d => !docs.has(d))}` : null;
      if (why) { if (s.expect !== 'refused') failures.push(`${t.name}, step ${i + 1} (${s.action}): ${why}`); continue; }
      if (s.expect === 'refused') { failures.push(`${t.name}, step ${i + 1} (${s.action}): expected a refusal`); continue; }
      stage = a!.to;
      if (stage !== s.expect) failures.push(`${t.name}, step ${i + 1} (${s.action}): reached ${stage}, expected ${s.expect}`);
    }
  }
  if (!p.tests.length) failures.push('A procedure needs at least one test before it is approved');
  return { ok: failures.length === 0, failures };
}

/** The institution responsible for a procedure: the authority the nation named, or the institution it names. */
export function ownerInstitution(owner: AuthorityKey | string, authorityFor: (k: AuthorityKey) => string | undefined): string | undefined {
  return isAuthorityKey(owner) ? authorityFor(owner) : owner;
}

const clone = <T,>(x: T): T => structuredClone(x);

/** Write a draft (a new procedure, or the next version of one). */
export function draftPackage(input: Omit<CasePackage, 'state' | 'createdAt' | 'author' | 'authorId' | 'approvedBy' | 'approvedAt'>, by: string, byId: string | undefined, effects: string[], now = new Date()): CasePackage | { error: string } {
  const problem = checkPackage(input, effects);
  if (problem) return { error: problem };
  if (db().packages.some(p => p.key === input.key && p.version === input.version)) return { error: `${input.key} version ${input.version} already exists` };
  const latest = Math.max(0, ...db().packages.filter(p => p.key === input.key).map(p => p.version));
  if (input.version !== latest + 1) return { error: `The next version of ${input.key} is ${latest + 1}` };
  const p: CasePackage = { ...clone(input), state: 'draft', author: by, ...(byId ? { authorId: byId } : {}), createdAt: now.toISOString() };
  db().packages.push(p);
  recordAudit(by, 'procedure.draft', `Procedure:${p.key}@${p.version}`, 'ok', `${p.title}${p.reference ? ' (reference)' : ''}`);
  return clone(p);
}

/**
 * Approve a draft: a different official, who can sign at the responsible
 * authority (checked by the route), once the procedure's tests pass. It
 * applies from `activeFrom` (default today); the version in force before it
 * is superseded from then.
 */
export function approvePackage(key: string, version: number, by: string, byId: string | undefined, activeFrom: string | undefined, effects: string[], now = new Date()): CasePackage | { error: string } {
  const p = db().packages.find(x => x.key === key && x.version === version);
  if (!p) return { error: 'No such procedure version' };
  if (p.state !== 'draft') return { error: `This version is already ${p.state}` };
  if (!p.reference) {
    const same = dualControlRefusal({ by: p.author, byId: p.authorId }, { by, byId });
    if (same) return { error: same };
  }
  const problem = checkPackage(p, effects);
  if (problem) return { error: problem };
  const tests = runPackageTests(p);
  if (!tests.ok) return { error: `Its tests fail: ${tests.failures.join('; ')}` };
  const from = activeFrom ?? now.toISOString().slice(0, 10);
  if (!ISO_DATE.test(from)) return { error: 'It applies from a date (YYYY-MM-DD)' };
  for (const q of db().packages) if (q.key === key && q.state === 'approved' && (q.activeFrom ?? '') <= from) q.state = 'superseded';
  Object.assign(p, { state: 'approved', approvedBy: by, approvedAt: now.toISOString(), activeFrom: from });
  recordAudit(by, 'procedure.approve', `Procedure:${key}@${version}`, 'ok', `${p.title} · applies from ${from} · ${p.tests.length} tests passed · written by ${p.author}`);
  return clone(p);
}

/** The approved version in force on a date (none: the procedure cannot start). */
export function activePackage(key: string, on = new Date().toISOString().slice(0, 10)): CasePackage | undefined {
  const live = db().packages.filter(p => p.key === key && p.state === 'approved' && (p.activeFrom ?? '') <= on).sort((a, b) => b.version - a.version);
  return live[0] ? clone(live[0]) : undefined;
}

export const getPackage = (key: string, version: number): CasePackage | undefined => { const p = db().packages.find(x => x.key === key && x.version === version); return p ? clone(p) : undefined; };
export const listPackages = (filter: { key?: string; state?: CasePackage['state'] } = {}): CasePackage[] =>
  db().packages.filter(p => (!filter.key || p.key === filter.key) && (!filter.state || p.state === filter.state)).map(clone);

export type { ActionSpec, FieldSpec, PackageTest };
