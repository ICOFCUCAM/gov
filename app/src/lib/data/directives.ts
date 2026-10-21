// The directives register (register 15.8, architecture review D8). The
// platform owns it: every draft, signature and withdrawal goes through
// /api/directives, names the official who took it (the verified signed-in
// official where there is one) and is written to the audit chain. Held in
// platform state (lib/data/persist.ts). With the shared database (substrate)
// connected, its civicos_directives table is a mirror written from here after
// each change (lib/db/mirror.ts); same record shape, so the substrate's own
// aggregates and realtime feeds keep working.

import { cite, type Citation } from '@/lib/law/register';
import { randomUUID } from 'node:crypto';
import { recordAudit } from '@/lib/data/store/audit';
import type { DirectiveRow } from '@/lib/db/types';
import { touch } from '@/lib/data/repo/track';
import { registeredTargets, institutionBounds } from '@/lib/data/store/institutions';
import { getMinistry } from '@/lib/data/store/ministries';
import { COMMUNICATION_KINDS, INSTRUCTION_KINDS, EXECUTIVE_OFFICE, directiveTargetRefusal } from '@/lib/auth/roles';
import { caretakerRefusal, judicialRefusal } from '@/lib/transitions/restrictions';

interface Db { rows: DirectiveRow[] }
const g = globalThis as unknown as { __civicosDirectives?: Db };
const db = (): Db => touch('__civicosDirectives', g.__civicosDirectives ??= { rows: [] });
export function resetDirectives(): void { g.__civicosDirectives = undefined; }

// request, communication and referral only ask or inform: the only kinds an independent institution
// (legislature, court, head of state, independent body) may be addressed with (plan phase 2, audit E),
// unless an approved relationship lets the issuer instruct it (plan phase 3).
export const KINDS = [...INSTRUCTION_KINDS, ...COMMUNICATION_KINDS];

/**
 * Whether an instruction from `issuer` may address these targets: the rule is
 * directiveTargetRefusal() in lib/auth/roles.ts, read against the approved
 * relationships in force (checked when drafted and again when signed, so a
 * relationship suspended, ended or expired in between stops it).
 */
export function instructionRefusal(issuer: string, kind: string, targets: string[], now = new Date()): string | null {
  const name = issuer === EXECUTIVE_OFFICE ? 'the executive office' : getMinistry(issuer)?.name ?? issuer;
  return directiveTargetRefusal(institutionBounds(now), { id: issuer, name }, kind, registeredTargets(targets));
}
const REF = /^[A-Za-z0-9][A-Za-z0-9._-]{1,63}$/;

export function listDirectives(opts: { status?: string; issuer?: string; limit?: number; q?: string } = {}): DirectiveRow[] {
  const q = opts.q?.trim().toLowerCase();
  return db().rows
    .filter(r => (!opts.status || r.status === opts.status) && (!opts.issuer || r.issued_by_charter_id === opts.issuer))
    // ?q: the text search the console's search box used to run on the substrate's mirror (ref, title, issuer).
    .filter(r => !q || [r.ref, r.title, r.issued_by_charter_id].some(v => v.toLowerCase().includes(q)))
    .sort((a, b) => b.updated_at.localeCompare(a.updated_at))
    .slice(0, Math.min(500, opts.limit ?? 50))
    .map(r => ({ ...r, targets: [...r.targets] }));
}

export function directive(ref: string): DirectiveRow | undefined {
  const r = db().rows.find(x => x.ref === ref);
  return r ? { ...r, targets: [...r.targets] } : undefined;
}

export function draftDirective(input: { ref?: string; kind?: string; issuedByCharterId?: string; title?: string; citation?: string | null; legalBasis?: { instrument?: string; eId?: string }[]; targets?: string[]; payload?: Record<string, unknown>; by?: string }): DirectiveRow | { error: string } {
  const by = input.by?.trim();
  if (!by) return { error: 'Name the official drafting the directive' };
  const ref = (input.ref ?? '').trim();
  if (!REF.test(ref)) return { error: 'The reference must be 2–64 letters, digits, dots, dashes or underscores' };
  if (db().rows.some(r => r.ref === ref)) return { error: `A directive ${ref} already exists` };
  const title = (input.title ?? '').trim();
  if (!title) return { error: 'Give the directive a title' };
  const kind = KINDS.includes(input.kind ?? '') ? input.kind! : 'instruction';
  const targets = (input.targets ?? []).map(t => String(t).trim()).filter(Boolean).slice(0, 50);
  // An independent institution receives no instruction, and one institution does not instruct another, unless an
  // approved relationship lets the issuer instruct it (guidance §5.1; plan phase 3); otherwise a request, a
  // communication or a referral.
  const issuer = (input.issuedByCharterId ?? 'platform').trim() || 'platform';
  const refused = instructionRefusal(issuer, kind, targets);
  if (refused) return { error: refused };
  const now = new Date().toISOString();
  // The legal basis (directions 7.1): each provision resolved to the version in force today, kept as it was.
  const legalBasis: Citation[] = [];
  for (const l of (input.legalBasis ?? []).slice(0, 20)) {
    const c = cite(String(l?.instrument ?? ''), String(l?.eId ?? ''), now.slice(0, 10));
    if ('error' in c) return { error: `Legal basis: ${c.error}` };
    legalBasis.push(c);
  }
  // A caretaker restriction the nation adopted, or a court's ruling that a cited provision is invalid or suspended (plan phase 6).
  const transition = caretakerRefusal({ institution: issuer, directive: kind }) ?? judicialRefusal(legalBasis);
  if (transition) return { error: transition };
  const row: DirectiveRow = {
    id: randomUUID(), ref, kind, issued_by_charter_id: issuer,
    issued_by_name: by, title: title.slice(0, 300), citation: input.citation?.trim() || null, status: 'drafting',
    targets,
    // The legal basis travels in the payload (the substrate mirror's columns stay as they are).
    payload: { ...(input.payload && typeof input.payload === 'object' ? input.payload : {}), ...(legalBasis.length ? { legalBasis } : {}) },
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
  // The relationship that allowed the draft may have been suspended, ended or expired since.
  const refused = instructionRefusal(r.issued_by_charter_id, r.kind, r.targets)
    // A caretaker period or a court's ruling recorded since the draft stops it too (plan phase 6).
    ?? caretakerRefusal({ institution: r.issued_by_charter_id, directive: r.kind })
    ?? judicialRefusal(((r.payload as { legalBasis?: Citation[] } | null)?.legalBasis) ?? []);
  if (refused) return { error: refused };
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

/** Signed directives whose effective time has come take effect (read-time; nothing runs in the background). Returns the refs that did. */
export function settleDirectives(now = new Date()): string[] {
  const settled: string[] = [];
  for (const r of db().rows) {
    if (r.status === 'signed' && r.effective_at && Date.parse(r.effective_at) <= now.getTime()) { r.status = 'effective'; r.updated_at = now.toISOString(); settled.push(r.ref); }
  }
  return settled;
}

/** Every directive's reference (the mirror's full re-copy). */
export function allDirectiveRefs(): string[] { return db().rows.map(r => r.ref); }

/** Every signed directive (copies), for the governance-output statistics (lib/data/directive-stats.ts). */
export function signedDirectives(): DirectiveRow[] {
  return db().rows.filter(r => r.signed_at).map(r => ({ ...r, targets: [...r.targets] }));
}

/**
 * Once, when the platform takes over a substrate that owned directives before
 * (lib/db/mirror.ts): keep the ones the platform does not hold yet, as they
 * were, under one audit entry. Returns how many were added.
 */
export function adoptDirectives(rows: DirectiveRow[]): number {
  const have = new Set(db().rows.map(r => r.ref));
  let n = 0;
  for (const r of rows) {
    if (!r || typeof r.ref !== 'string' || !REF.test(r.ref) || have.has(r.ref)) continue;
    db().rows.push({
      id: String(r.id || randomUUID()), ref: r.ref, kind: String(r.kind || 'instruction'), issued_by_charter_id: String(r.issued_by_charter_id || 'platform'),
      issued_by_name: r.issued_by_name ?? null, title: String(r.title || r.ref).slice(0, 300), citation: r.citation ?? null, status: String(r.status || 'drafting'),
      targets: Array.isArray(r.targets) ? r.targets.map(String) : [], payload: r.payload && typeof r.payload === 'object' ? r.payload : {},
      signed_at: r.signed_at ?? null, signed_by_id: r.signed_by_id ?? null, effective_at: r.effective_at ?? null, rescinded_at: r.rescinded_at ?? null,
      created_at: r.created_at || new Date().toISOString(), updated_at: r.updated_at || r.created_at || new Date().toISOString(),
    });
    have.add(r.ref);
    n++;
  }
  if (n) recordAudit('platform', 'directive.adopt', 'Directives', 'ok', `${n} directive${n === 1 ? '' : 's'} taken over from the substrate, which now mirrors the platform`);
  return n;
}
