// Directives kept by the platform itself (register 15.8): how a nation without
// the shared database (substrate) still drafts, signs and withdraws directives.
// Same record shape as the substrate's civicos_directives, so the Directive
// Board and the directive page read either. Every step names the official who
// took it (the verified signed-in official where there is one) and is written
// to the audit chain. Held in platform state (lib/data/persist.ts).

import { randomUUID } from 'node:crypto';
import { recordAudit } from '@/lib/data/store/audit';
import type { DirectiveRow } from '@/lib/db/types';

interface Db { rows: DirectiveRow[] }
const g = globalThis as unknown as { __civicosDirectives?: Db };
const db = (): Db => (g.__civicosDirectives ??= { rows: [] });
export function resetDirectives(): void { g.__civicosDirectives = undefined; }

export const KINDS = ['executive-order', 'policy', 'budget', 'instruction', 'declaration'];
const REF = /^[A-Za-z0-9][A-Za-z0-9._-]{1,63}$/;

export function listDirectives(opts: { status?: string; issuer?: string; limit?: number } = {}): DirectiveRow[] {
  return db().rows
    .filter(r => (!opts.status || r.status === opts.status) && (!opts.issuer || r.issued_by_charter_id === opts.issuer))
    .sort((a, b) => b.updated_at.localeCompare(a.updated_at))
    .slice(0, Math.min(500, opts.limit ?? 50))
    .map(r => ({ ...r, targets: [...r.targets] }));
}

export function directive(ref: string): DirectiveRow | undefined {
  const r = db().rows.find(x => x.ref === ref);
  return r ? { ...r, targets: [...r.targets] } : undefined;
}

export function draftDirective(input: { ref?: string; kind?: string; issuedByCharterId?: string; title?: string; citation?: string | null; targets?: string[]; payload?: Record<string, unknown>; by?: string }): DirectiveRow | { error: string } {
  const by = input.by?.trim();
  if (!by) return { error: 'Name the official drafting the directive' };
  const ref = (input.ref ?? '').trim();
  if (!REF.test(ref)) return { error: 'The reference must be 2–64 letters, digits, dots, dashes or underscores' };
  if (db().rows.some(r => r.ref === ref)) return { error: `A directive ${ref} already exists` };
  const title = (input.title ?? '').trim();
  if (!title) return { error: 'Give the directive a title' };
  const kind = KINDS.includes(input.kind ?? '') ? input.kind! : 'instruction';
  const now = new Date().toISOString();
  const row: DirectiveRow = {
    id: randomUUID(), ref, kind, issued_by_charter_id: (input.issuedByCharterId ?? 'platform').trim() || 'platform',
    issued_by_name: by, title: title.slice(0, 300), citation: input.citation?.trim() || null, status: 'drafting',
    targets: (input.targets ?? []).map(t => String(t).trim()).filter(Boolean).slice(0, 50),
    payload: input.payload && typeof input.payload === 'object' ? input.payload : {},
    signed_at: null, signed_by_id: null, effective_at: null, rescinded_at: null, created_at: now, updated_at: now,
  };
  db().rows.push(row);
  recordAudit(by, 'directive.draft', `Directive:${ref}`, 'ok', `${kind} · ${row.title}`);
  return directive(ref)!;
}

/** Sign a draft. It takes effect now, or at a later effective time. */
export function signDirective(ref: string, by: string | undefined, effectiveAt?: string | null): DirectiveRow | { error: string } {
  const who = by?.trim();
  if (!who) return { error: 'Name the official signing the directive' };
  const r = db().rows.find(x => x.ref === ref);
  if (!r) return { error: 'No such directive' };
  if (r.status !== 'drafting') return { error: `Only a draft can be signed (this one is ${r.status})` };
  const now = new Date();
  const eff = effectiveAt ? new Date(effectiveAt) : now;
  if (!Number.isFinite(eff.getTime())) return { error: 'The effective time is not a date' };
  r.signed_at = now.toISOString();
  r.signed_by_id = who;
  r.effective_at = eff.toISOString();
  r.status = eff.getTime() <= now.getTime() ? 'effective' : 'signed';
  r.updated_at = now.toISOString();
  recordAudit(who, 'directive.sign', `Directive:${ref}`, 'ok', `${r.title} · effective ${r.effective_at}`);
  return directive(ref)!;
}

export function rescindDirective(ref: string, by: string | undefined): DirectiveRow | { error: string } {
  const who = by?.trim();
  if (!who) return { error: 'Name the official withdrawing the directive' };
  const r = db().rows.find(x => x.ref === ref);
  if (!r) return { error: 'No such directive' };
  if (r.status === 'rescinded') return { error: 'Already withdrawn' };
  r.status = 'rescinded';
  r.rescinded_at = r.updated_at = new Date().toISOString();
  recordAudit(who, 'directive.rescind', `Directive:${ref}`, 'ok', r.title);
  return directive(ref)!;
}

/** Signed directives whose effective time has come take effect (read-time; nothing runs in the background). */
export function settleDirectives(now = new Date()): void {
  for (const r of db().rows) {
    if (r.status === 'signed' && r.effective_at && Date.parse(r.effective_at) <= now.getTime()) { r.status = 'effective'; r.updated_at = now.toISOString(); }
  }
}
