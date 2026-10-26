// The records management procedures every institution has (plan step I13;
// forms catalogue Part 13 §7, GOV-REC-001, 007, 008, 010, 011, 012, 017,
// 018; the supplement's ADM-REC-025 and ADM-REC-026). Templates each
// institution adopts as its own (`rec.<function>.<institution>`, drafted on
// request like the internal administration procedures) and a second official
// approves; each institution keeps and decides its own records, the
// legislature, the courts and independent institutions included.
//
//   rec.incoming    registering incoming correspondence and documents (GOV-REC-001, GOV-SVC-009)
//   rec.schedule    a record class with its retention schedule: classification, trigger,
//                   period and disposition as the law sets them, cited, approved by two
//                   officials (GOV-REC-007, GOV-REC-008, ADM-REC-025)
//   rec.hold        a legal hold: who, why, the law, its scope (a class, a document or a
//                   case); placed by an official who can sign, released by two (GOV-REC-012)
//   rec.disposal    disposal of the records a schedule covers and makes due: the exact list
//                   frozen with its hashes, authorised by two officials other than the one
//                   who listed it, held records skipped, a certificate kept (GOV-REC-011,
//                   ADM-REC-026)
//   rec.transfer    transfer to the archive the nation names (slot `archives`), by two
//                   officials; the archive records its own receipt (GOV-REC-010)
//   rec.migration   a migration's plan (source count and manifest), its approval, its
//                   reconciliation against the target computed from the platform's own
//                   records, and its closure (GOV-REC-017, GOV-REC-018); since plan I9 the
//                   plan may carry a per-record manifest (source, transformations, target),
//                   each record verified at every reconciliation (acceptance P5-06)
//
// No class, period or disposition ships: a schedule is the nation's law,
// entered with its citation in the approving case. Nothing is disposed of
// without a schedule; a hold blocks it; disposal destroys only a document's
// content (its record and hashes stay, lib/records/documents.ts) and marks a
// registered item; nothing is deleted from any store. A demonstration or
// training installation disposes of sample records only, never real ones.

import { createHash } from 'node:crypto';
import { registerEffect, registeredEffects, getCase, type EffectContext } from '@/lib/casework/engine';
import { draftPackage, listPackages, activePackage } from '@/lib/casework/packages';
import { getMinistry, authorityFor } from '@/lib/data/store';
import { samplesAllowed } from '@/lib/ops/mode';
import { documentsOfClass, getDocument, disposeDocument } from '@/lib/records/documents';
import { listCases } from '@/lib/casework/engine';
import {
  approveSchedule, placeHold, attachHoldDecision, releaseHold, registerIncoming, listForDisposal, recordDisposal, transferToArchive, planMigration, approveMigration, reconcileMigration, closeMigration,
  scheduleOf, getClass, holdCovering, incomingOf, disposalOfCase, migrationOfCase, listDigest, type ListedItem, type VerificationStatus, type Schedule, type Trigger, type Disposition,
} from './register';
import { parseManifest, verifyRecords, type TargetRecord } from './migration-manifest';
import type { Case, CasePackage, FieldSpec } from '@/lib/casework/types';

type Ref = Omit<CasePackage, 'state' | 'createdAt' | 'author' | 'authorId' | 'approvedBy' | 'approvedAt'>;
const str = (v: unknown, max = 300) => (typeof v === 'string' ? v.trim().slice(0, max) : '');
const int = (v: unknown) => (typeof v === 'number' ? v : typeof v === 'string' && /^\d+$/.test(v.trim()) ? Number(v.trim()) : NaN);
const sample = (c: Pick<Case, 'source'>) => (c.source === 'sample' ? { sample: true as const } : {});
const who = (ctx: EffectContext) => ({ ...(ctx.actor.id ? { id: ctx.actor.id } : {}), name: ctx.actor.name });
/** The officials of this decision: the proposer (four-eyes) and the official confirming it now. */
const officialsOf = (ctx: EffectContext) => [...(ctx.case.pending ? [{ ...(ctx.case.pending.by.id ? { id: ctx.case.pending.by.id } : {}), name: ctx.case.pending.by.name }] : []), who(ctx)];
const citationsOf = (ctx: EffectContext) => ctx.case.pending?.citations ?? [];
const DAY = 86_400_000;
const sha = (s: string) => createHash('sha256').update(s, 'utf8').digest('hex');

/**
 * The records of a class that its schedule makes due on `now`, with what was
 * left out and why (held, not yet due, a real record in a demonstration).
 * Documents carry the class as their retention class; registered items as
 * their class.
 */
function dueItems(institution: string, cls: string, s: Schedule, now: Date): { due: ListedItem[]; left: (ListedItem & { why: string })[] } {
  const due: ListedItem[] = [], left: (ListedItem & { why: string })[] = [];
  const cut = now.getTime() - (s.periodDays ?? Infinity) * DAY;
  const demo = samplesAllowed();
  for (const d of documentsOfClass(institution, cls)) {
    if (d.disposed) continue;
    const item: ListedItem = { kind: 'document', id: d.id, sha256: d.versions.at(-1)?.sha256 ?? '' };
    const owning = d.belongsTo.kind === 'case' ? getCase(d.belongsTo.id) : undefined;
    const from = (s.trigger as Trigger) === 'closed' ? owning?.closedAt : d.createdAt;
    if (!from) { left.push({ ...item, why: 'Its case is still open' }); continue; }
    if (Date.parse(from) > cut) { left.push({ ...item, why: 'Not yet due under the schedule' }); continue; }
    if (d.legalHold) { left.push({ ...item, why: `Held: ${d.legalHold.reason}` }); continue; }
    if (owning?.legalHold) { left.push({ ...item, why: `Its case is held: ${owning.legalHold.reason}` }); continue; }
    const h = holdCovering({ institution, class: cls, document: d.id, case: owning ? [owning.id, owning.ref] : [] });
    if (h) { left.push({ ...item, why: `Under legal hold ${h.id}` }); continue; }
    // A demonstration or training installation never disposes of a real record.
    if (demo && owning?.source !== 'sample') { left.push({ ...item, why: 'A real record: a demonstration installation disposes of sample records only' }); continue; }
    due.push(item);
  }
  for (const i of incomingOf(institution).filter(x => x.class === cls && !x.disposed && !x.transferred)) {
    const item: ListedItem = { kind: 'incoming', id: i.number, sha256: sha(`${i.number}:${i.case}:${i.receivedOn}`) };
    if ((s.trigger as Trigger) === 'closed' && !getCase(i.case)?.closedAt) { left.push({ ...item, why: 'Its case is still open' }); continue; }
    if (Date.parse(i.receivedOn) > cut) { left.push({ ...item, why: 'Not yet due under the schedule' }); continue; }
    const h = holdCovering({ institution, class: cls, case: [i.case] });
    if (h) { left.push({ ...item, why: `Under legal hold ${h.id}` }); continue; }
    if (demo && !i.sample) { left.push({ ...item, why: 'A real record: a demonstration installation disposes of sample records only' }); continue; }
    due.push(item);
  }
  return { due, left };
}

// ── Effects ────────────────────────────────────────────────────────────────

registerEffect('rec.incoming.register', (ctx: EffectContext) => {
  const c = ctx.case;
  const cls = str(c.fields.recordClass, 60);
  if (!/^[a-z0-9][a-z0-9-]{1,60}$/.test(cls)) return { error: 'The record class is its key (the retention class its records carry)' };
  const receivedOn = str(c.fields.receivedOn, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(receivedOn)) return { error: 'The date received is a date' };
  const item = registerIncoming({ institution: c.owner, class: cls, subject: str(c.fields.subject, 200), senderKind: str(c.fields.senderKind, 40), channel: str(c.fields.channel, 40), receivedOn, case: c.ref, registeredBy: ctx.actor.name, at: ctx.now.toISOString(), ...sample(c) }, ctx.actor.name);
  return { facts: { registered: item.number, class: cls } };
});

registerEffect('rec.schedule.approve', (ctx: EffectContext) => {
  const c = ctx.case;
  const trigger = str(c.fields.trigger, 20) as Trigger, disposition = str(c.fields.disposition, 20) as Disposition;
  if (!['created', 'closed'].includes(trigger)) return { error: 'The period runs from when the record was created or from when its case closed' };
  if (!['destroy', 'archive', 'permanent'].includes(disposition)) return { error: 'The disposition is destroy, archive or permanent' };
  const days = int(c.fields.periodDays);
  const r = approveSchedule({
    institution: c.owner, key: str(c.fields.classKey, 60), title: str(c.fields.classTitle, 160), description: str(c.fields.classDescription, 2000),
    access: (['normal', 'restricted', 'secret'].includes(str(c.fields.access)) ? str(c.fields.access) : 'normal') as 'normal',
    trigger, ...(Number.isInteger(days) ? { periodDays: days } : {}), disposition, citations: citationsOf(ctx), case: c.ref, approvedBy: officialsOf(ctx), at: ctx.now.toISOString(), ...sample(c),
  }, ctx.actor.name);
  if ('error' in r) return r;
  const s = r.schedules.at(-1)!;
  return { facts: { recordClass: r.key, schedule: s.n, disposition: s.disposition, ...(s.periodDays ? { periodDays: s.periodDays } : {}) } };
});

registerEffect('rec.hold.place', (ctx: EffectContext) => {
  const c = ctx.case;
  const kind = str(c.fields.scopeKind, 20) as 'class' | 'document' | 'case';
  const ref = str(c.fields.scopeRef, 80);
  if (kind === 'class' && !/^[a-z0-9][a-z0-9-]{1,60}$/.test(ref)) return { error: 'Name the record class (its key)' };
  if (kind === 'document') { const d = getDocument(ref); if (!d || d.institution !== c.owner) return { error: 'Name a document of this institution (its id)' }; }
  if (kind === 'case') { const x = getCase(ref); if (!x || x.owner !== c.owner) return { error: 'Name a case of this institution (its reference)' }; }
  if (!['class', 'document', 'case'].includes(kind)) return { error: 'A hold covers a record class, a document or a case' };
  const h = placeHold({ institution: c.owner, scope: { kind, ref: kind === 'case' ? getCase(ref)!.ref : ref }, reason: str(c.fields.holdReason, 1000), citations: citationsOf(ctx), case: c.ref, placedBy: officialsOf(ctx), placedAt: ctx.now.toISOString(), ...sample(c) }, ctx.actor.name);
  if ('error' in h) return h;
  // The provisions the hold rests on are the sealed decision's (cited at this step).
  return { facts: { hold: h.id, scope: `${h.scope.kind} ${h.scope.ref}` }, after: d => { if (d) attachHoldDecision(h.id, d.id, d.content.citations); } };
});

registerEffect('rec.hold.release', (ctx: EffectContext) => {
  const r = releaseHold(ctx.case.ref, { by: officialsOf(ctx), at: ctx.now.toISOString(), case: ctx.case.ref, reason: ctx.case.pending?.reason ?? 'Released' }, ctx.actor.name);
  return 'error' in r ? r : { facts: { released: r.id } };
});

registerEffect('rec.disposal.list', (ctx: EffectContext) => {
  const c = ctx.case;
  const cls = str(c.fields.recordClass, 60);
  if (!getClass(c.owner, cls)) return { error: 'No record class of this institution has that key: approve its retention schedule first (rec.schedule)' };
  const s = scheduleOf(c.owner, cls);
  if (!s) return { error: 'No retention schedule is approved for this class: nothing is disposed of without one' };
  if (s.disposition !== 'destroy') return { error: s.disposition === 'archive' ? 'This class is transferred to the archive, never destroyed: use a transfer' : 'This class is kept permanently: nothing of it is disposed of' };
  const { due, left } = dueItems(c.owner, cls, s, ctx.now);
  if (!due.length && left.some(x => /demonstration/.test(x.why))) return { error: 'A demonstration installation disposes of sample records only: the records of this class that are due are real records' };
  const x = listForDisposal({ institution: c.owner, class: cls, schedule: s.n, case: c.ref, listedAt: ctx.now.toISOString(), listedBy: ctx.actor.name, items: due, ...sample(c) }, ctx.actor.name);
  return 'error' in x ? x : { facts: { disposal: x.id, items: x.items.length, listDigest: x.listDigest, leftOut: left.length } };
});

registerEffect('rec.disposal.authorise', (ctx: EffectContext) => {
  const c = ctx.case;
  const x = disposalOfCase(c.ref);
  if (!x) return { error: 'List the records first' };
  const s = scheduleOf(c.owner, x.class);
  if (!s || s.disposition !== 'destroy') return { error: 'The class no longer has a schedule that ends in destruction' };
  // Re-checked now: a hold placed, a schedule lengthened or a document already disposed of since the listing leaves the item out.
  const { due } = dueItems(c.owner, x.class, s, ctx.now);
  const ok = new Set(due.map(i => `${i.kind}:${i.id}`));
  const destroyed: ListedItem[] = [], skipped: (ListedItem & { why: string })[] = [];
  const at = ctx.now.toISOString();
  const rule = `Disposal ${x.id} (class ${x.class}, schedule ${s.n}, case ${c.ref})`;
  for (const i of x.items) {
    if (!ok.has(`${i.kind}:${i.id}`)) { skipped.push({ ...i, why: 'No longer due or now held' }); continue; }
    if (i.kind === 'document') {
      const r = disposeDocument(i.id, rule, ctx.actor.name, ctx.now);
      if ('error' in r) { skipped.push({ ...i, why: r.error }); continue; }
    }
    destroyed.push(i);
  }
  const done = recordDisposal(x.id, { authorisedBy: officialsOf(ctx), at, destroyed, skipped }, ctx.actor.name);
  return 'error' in done ? done : { facts: { disposal: x.id, destroyed: destroyed.length, skipped: skipped.length, certificate: done.executed!.certificate } };
});

registerEffect('rec.transfer.send', (ctx: EffectContext) => {
  const c = ctx.case;
  const archive = authorityFor('archives');
  if (!archive) return { error: 'No archive is named (Configuration → Who is responsible: National archives): nothing is transferred until one is' };
  const cls = str(c.fields.recordClass, 60);
  const s = scheduleOf(c.owner, cls);
  if (!s) return { error: 'No retention schedule is approved for this class: nothing is transferred without one' };
  if (s.disposition !== 'archive') return { error: 'This class is not transferred to the archive under its schedule' };
  const { due } = dueItems(c.owner, cls, s, ctx.now);
  const t = transferToArchive({ institution: c.owner, archive, class: cls, case: c.ref, items: due, authorised: { by: officialsOf(ctx), at: ctx.now.toISOString() }, ...sample(c) }, ctx.actor.name);
  return 'error' in t ? t : { facts: { transfer: t.id, items: t.items.length, manifest: t.manifest } };
});

/** The platform's own records a migration lands in, as a manifest (the same digest a source system computes over kind, id and SHA-256). */
function targetManifest(c: Case): { count: number; manifest: string } | null {
  const kind = str(c.fields.targetKind, 20), ref = str(c.fields.targetRef, 80);
  if (kind === 'documents') {
    const items = documentsOfClass(c.owner, ref).map(d => ({ kind: 'document' as const, id: d.id, sha256: d.versions[0]?.sha256 ?? '' }));
    return { count: items.length, manifest: listDigest(items) };
  }
  if (kind === 'cases') {
    const items = listCases({ owner: c.owner, procedure: ref, limit: 1000 }).filter(x => x.source === 'imported').map(x => ({ kind: 'document' as const, id: x.id, sha256: sha(`${x.id}:${x.ref}`) }));
    return { count: items.length, manifest: listDigest(items) };
  }
  return null;
}

registerEffect('rec.migration.plan', (ctx: EffectContext) => {
  const c = ctx.case;
  const kind = str(c.fields.targetKind, 20) as 'documents' | 'cases' | 'external';
  if (!['documents', 'cases', 'external'].includes(kind)) return { error: 'The records land as documents of a class, cases of a procedure, or in an external system' };
  if (kind === 'cases' && !activePackage(str(c.fields.targetRef, 80))) return { error: 'Name a procedure in force that the cases are loaded under (its key)' };
  // Plan I9 (acceptance P5-06): a per-record manifest, when given, is the plan's own evidence of each record's source and transformations.
  const given = c.fields.recordManifest !== undefined && c.fields.recordManifest !== null && c.fields.recordManifest !== '' && !(Array.isArray(c.fields.recordManifest) && !c.fields.recordManifest.length);
  const records = given ? parseManifest(c.fields.recordManifest, kind) : undefined;
  if (records && 'error' in records) return records;
  const m = planMigration({ institution: c.owner, case: c.ref, source: { system: str(c.fields.sourceSystem, 200), count: int(c.fields.sourceCount), manifest: str(c.fields.sourceManifest, 64).toLowerCase() }, target: { system: str(c.fields.targetSystem, 200), kind, ...(str(c.fields.targetRef, 80) ? { ref: str(c.fields.targetRef, 80) } : {}) }, ...(records ? { records } : {}), ...sample(c) }, ctx.actor.name);
  return 'error' in m ? m : { facts: { migration: m.id, sourceCount: m.source.count, ...(m.manifest ? { recordManifest: m.manifest.digest } : {}) } };
});

registerEffect('rec.migration.approve', (ctx: EffectContext) => {
  const m = approveMigration(ctx.case.ref, officialsOf(ctx), ctx.now.toISOString(), ctx.actor.name);
  return 'error' in m ? m : { facts: { migration: m.id, approved: true } };
});

/** A target record as the platform holds it: a document (its class and its content as loaded) or a case (its procedure). */
function targetRecord(kind: 'documents' | 'cases', id: string): TargetRecord | undefined {
  if (kind === 'documents') { const d = getDocument(id); return d ? { owner: d.institution, group: d.retention, sha256: d.versions[0]?.sha256 } : undefined; }
  const x = getCase(id);
  return x ? { owner: x.owner, group: x.package.key, sha256: sha(`${x.id}:${x.ref}`) } : undefined;
}

registerEffect('rec.migration.reconcile', (ctx: EffectContext) => {
  const c = ctx.case;
  // The target is counted and hashed from the platform's own records where they are here; only an external target's figures are entered.
  const computed = targetManifest(c);
  const count = computed ? computed.count : int(c.fields.targetCount);
  const manifest = computed ? computed.manifest : str(c.fields.targetManifest, 64).toLowerCase();
  if (!computed && (!Number.isInteger(count) || !/^[0-9a-f]{64}$/.test(manifest))) return { error: 'For an external target, give its count and its manifest SHA-256' };
  // Plan I9 (P5-06): each record of a per-record manifest verified against the platform's own records, its status kept.
  const planned = migrationOfCase(c.ref);
  let perRecord: { perRecord: { status: VerificationStatus; detail?: string }[]; unexpected: number } | undefined;
  if (planned?.records) {
    const kind = planned.target.kind, ref = planned.target.ref;
    const under = kind === 'documents' && ref ? documentsOfClass(c.owner, ref).map(d => d.id) : kind === 'cases' && ref ? listCases({ owner: c.owner, procedure: ref, limit: 5000 }).filter(x => x.source === 'imported').map(x => x.id) : [];
    perRecord = verifyRecords(planned.records, { institution: c.owner, kind, ...(ref ? { ref } : {}) }, id => (kind === 'external' ? undefined : targetRecord(kind, id)), under);
  }
  const m = reconcileMigration(c.ref, { count, manifest, computed: !!computed, discrepancies: str(c.fields.discrepancies, 4000), corrective: str(c.fields.correctiveActions, 4000), by: ctx.actor.name, at: ctx.now.toISOString(), ...(perRecord ?? {}) });
  if ('error' in m) return m;
  const last = m.reconciliation!.at(-1)!;
  return { facts: { migration: m.id, targetCount: count, matched: last.matched, ...(last.records ? { verified: last.records.verified, hashDiffers: last.records.mismatched, missing: last.records.missing, unexpected: last.records.unexpected } : {}) } };
});

registerEffect('rec.migration.close', (ctx: EffectContext) => {
  const m = closeMigration(ctx.case.ref, officialsOf(ctx), ctx.now.toISOString(), ctx.actor.name);
  return 'error' in m ? m : { facts: { migration: m.id, outcome: m.closed!.outcome } };
});

// ── Reference procedures (templates) ──────────────────────────────────────

const f = (key: string, label: string, type: FieldSpec['type'] = 'text', extra: Partial<FieldSpec> = {}): FieldSpec => ({ key, label, type, personalDataClass: 'administrative', ...extra });
const choice = (key: string, label: string, options: string[], extra: Partial<FieldSpec> = {}): FieldSpec => f(key, label, 'choice', { options, ...extra });
const base = { reference: true as const, citations: [], notifications: [], deadlines: [], sensitivity: 'normal' as const, owner: 'institution' };

/** The templates; each institution drafts `rec.<name>.<institution>` from them. */
export const RECORDKEEPING_PROCEDURES: (Ref & { forms: string[] })[] = [
  {
    ...base, key: 'rec.incoming', version: 1, refPrefix: 'RINC', retention: 'records-registry', forms: ['GOV-REC-001', 'GOV-SVC-009'],
    title: 'Incoming correspondence and documents',
    fields: [
      f('subject', 'Subject', 'text', { required: true }),
      choice('senderKind', 'Who sent it', ['person', 'organisation', 'institution', 'not-stated'], { required: true }),
      choice('channel', 'How it arrived', ['post', 'email', 'by-hand', 'online', 'other'], { required: true }),
      f('receivedOn', 'Date received', 'date', { required: true }),
      f('recordClass', 'Record class (its key)', 'text', { required: true }),
      f('summary', 'What it asks or says (restricted)', 'longtext', { personalDataClass: 'restricted' }),
    ],
    documents: [{ class: 'correspondence', label: 'The correspondence as received', required: false }],
    stages: [{ key: 'received', label: 'Received' }, { key: 'registered', label: 'Registered', terminal: true }, { key: 'not-registered', label: 'Not registered (duplicate or misdirected)', terminal: true }],
    actions: [
      { key: 'register', label: 'Register it', from: ['received'], to: 'registered', needs: { role: 'officer', task: 'government.record.access' }, requires: { fields: ['subject', 'senderKind', 'channel', 'receivedOn', 'recordClass'] }, effects: ['rec.incoming.register'] },
      { key: 'decline', label: 'Do not register, with reasons', from: ['received'], to: 'not-registered', needs: { role: 'officer' }, requires: { reasons: true } },
    ],
    tests: [{ name: 'registered', steps: [{ action: 'register', expect: 'refused' }, { action: 'register', fields: { subject: 'Letter', senderKind: 'person', channel: 'post', receivedOn: '2026-10-01', recordClass: 'correspondence' }, expect: 'registered' }] }, { name: 'declined', steps: [{ action: 'decline', expect: 'not-registered' }] }],
  },
  {
    ...base, key: 'rec.schedule', version: 1, refPrefix: 'RSCH', retention: 'records-management-permanent', forms: ['GOV-REC-007', 'GOV-REC-008', 'ADM-REC-025'],
    title: 'Record class and retention schedule',
    fields: [
      f('classKey', 'Record class key (the retention class its records carry, e.g. a procedure\'s)', 'text', { required: true }),
      f('classTitle', 'Record class title', 'text', { required: true }),
      f('classDescription', 'What records the class holds', 'longtext', { required: true }),
      choice('access', 'How its records are classified for access', ['normal', 'restricted', 'secret'], { required: true }),
      choice('trigger', 'The period runs', ['created', 'closed'], { required: true }),
      f('periodDays', 'Retention period in days, as the law sets it (empty for a permanent class)', 'number'),
      choice('disposition', 'At the end of the period', ['destroy', 'archive', 'permanent'], { required: true }),
    ],
    documents: [{ class: 'schedule', label: 'The retention schedule as the law or the archive authority sets it', required: true }],
    stages: [{ key: 'drafted', label: 'Drafted' }, { key: 'review', label: 'Reviewed' }, { key: 'approved', label: 'Approved', terminal: true }, { key: 'rejected', label: 'Rejected', terminal: true }],
    actions: [
      { key: 'review', label: 'Record the review', from: ['drafted'], to: 'review', needs: { role: 'officer' }, requires: { fields: ['classKey', 'classTitle', 'classDescription', 'access', 'trigger', 'disposition'], documents: ['schedule'] } },
      { key: 'approve', label: 'Approve the schedule', from: ['review'], to: 'approved', decision: 'approve-schedule', needs: { role: 'signatory', fourEyes: true, task: 'government.record.dispose', distinctFrom: ['review'] }, requires: { reasons: true, citations: true }, effects: ['rec.schedule.approve'] },
      { key: 'reject', label: 'Reject, with reasons', from: ['drafted', 'review'], to: 'rejected', needs: { role: 'signatory' }, requires: { reasons: true } },
    ],
    tests: [{ name: 'approved', steps: [{ action: 'review', expect: 'refused' }, { action: 'review', fields: { classKey: 'correspondence', classTitle: 'Correspondence', classDescription: 'Letters', access: 'normal', trigger: 'created', periodDays: 3650, disposition: 'destroy' }, documents: ['schedule'], expect: 'review' }, { action: 'approve', expect: 'approved' }] }, { name: 'rejected', steps: [{ action: 'reject', expect: 'rejected' }] }],
  },
  {
    ...base, sensitivity: 'restricted', key: 'rec.hold', version: 1, refPrefix: 'RHLD', retention: 'records-management-permanent', forms: ['GOV-REC-012'],
    title: 'Legal hold',
    fields: [
      choice('scopeKind', 'What the hold covers', ['class', 'document', 'case'], { required: true }),
      f('scopeRef', 'The record class key, document id or case reference', 'text', { required: true }),
      f('holdReason', 'Why the records must be kept (litigation, audit, investigation, a request) (restricted)', 'longtext', { required: true, personalDataClass: 'restricted' }),
    ],
    documents: [{ class: 'hold-instruction', label: 'The instruction or notice that requires the hold', required: false }],
    stages: [{ key: 'requested', label: 'Requested' }, { key: 'in-force', label: 'In force' }, { key: 'released', label: 'Released', terminal: true }, { key: 'turned-down', label: 'Refused', terminal: true }],
    actions: [
      { key: 'place', label: 'Place the hold', from: ['requested'], to: 'in-force', decision: 'place-hold', needs: { role: 'signatory' }, requires: { fields: ['scopeKind', 'scopeRef', 'holdReason'], reasons: true, citations: true }, effects: ['rec.hold.place'] },
      { key: 'release', label: 'Release the hold', from: ['in-force'], to: 'released', decision: 'release-hold', needs: { role: 'signatory', fourEyes: true }, requires: { reasons: true }, effects: ['rec.hold.release'] },
      { key: 'refuse', label: 'Refuse, with reasons', from: ['requested'], to: 'turned-down', needs: { role: 'signatory' }, requires: { reasons: true } },
    ],
    tests: [{ name: 'placed then released', steps: [{ action: 'place', expect: 'refused' }, { action: 'place', fields: { scopeKind: 'class', scopeRef: 'correspondence', holdReason: 'Litigation' }, expect: 'in-force' }, { action: 'release', expect: 'released' }] }, { name: 'refused', steps: [{ action: 'refuse', expect: 'turned-down' }] }],
  },
  {
    ...base, key: 'rec.disposal', version: 1, refPrefix: 'RDSP', retention: 'records-management-permanent', forms: ['GOV-REC-011', 'ADM-REC-026'],
    title: 'Records disposal',
    fields: [f('recordClass', 'Record class (its key)', 'text', { required: true })],
    documents: [],
    stages: [{ key: 'opened', label: 'Opened' }, { key: 'listed', label: 'Listed' }, { key: 'disposed', label: 'Disposed of', terminal: true }, { key: 'cancelled', label: 'Cancelled', terminal: true }],
    actions: [
      { key: 'list', label: 'List the records due under the schedule', from: ['opened'], to: 'listed', needs: { role: 'officer' }, requires: { fields: ['recordClass'] }, effects: ['rec.disposal.list'] },
      { key: 'authorise', label: 'Authorise and carry out the disposal', from: ['listed'], to: 'disposed', decision: 'authorise-disposal', needs: { role: 'signatory', fourEyes: true, task: 'government.record.dispose', distinctFrom: ['list'] }, requires: { reasons: true }, effects: ['rec.disposal.authorise'] },
      { key: 'cancel', label: 'Cancel, with reasons', from: ['opened', 'listed'], to: 'cancelled', needs: { role: 'officer' }, requires: { reasons: true } },
    ],
    tests: [{ name: 'disposed', steps: [{ action: 'list', expect: 'refused' }, { action: 'list', fields: { recordClass: 'correspondence' }, expect: 'listed' }, { action: 'authorise', expect: 'disposed' }] }, { name: 'cancelled', steps: [{ action: 'cancel', expect: 'cancelled' }] }],
  },
  {
    ...base, key: 'rec.transfer', version: 1, refPrefix: 'RTRF', retention: 'records-management-permanent', forms: ['GOV-REC-010'],
    title: 'Records transfer to the archive',
    fields: [f('recordClass', 'Record class (its key)', 'text', { required: true })],
    documents: [{ class: 'transfer-list', label: 'The transfer list agreed with the archive', required: false }],
    stages: [{ key: 'prepared', label: 'Prepared' }, { key: 'sent', label: 'Sent to the archive', terminal: true }, { key: 'cancelled', label: 'Cancelled', terminal: true }],
    actions: [
      { key: 'send', label: 'Authorise and send the transfer', from: ['prepared'], to: 'sent', decision: 'authorise-transfer', needs: { role: 'signatory', fourEyes: true, distinctFrom: ['open'] }, requires: { fields: ['recordClass'], reasons: true }, effects: ['rec.transfer.send'] },
      { key: 'cancel', label: 'Cancel, with reasons', from: ['prepared'], to: 'cancelled', needs: { role: 'officer' }, requires: { reasons: true } },
    ],
    tests: [{ name: 'sent', steps: [{ action: 'send', expect: 'refused' }, { action: 'send', fields: { recordClass: 'board-minutes' }, expect: 'sent' }] }, { name: 'cancelled', steps: [{ action: 'cancel', expect: 'cancelled' }] }],
  },
  {
    ...base, key: 'rec.migration', version: 1, refPrefix: 'RMIG', retention: 'records-management-permanent', forms: ['GOV-REC-017', 'GOV-REC-018'],
    title: 'Records migration',
    fields: [
      f('sourceSystem', 'Source system', 'text', { required: true }),
      f('targetSystem', 'Target system', 'text', { required: true }),
      choice('targetKind', 'Where the records land', ['documents', 'cases', 'external'], { required: true }),
      f('targetRef', 'The record class (documents) or procedure key (cases) they land under', 'text'),
      f('sourceCount', 'Number of records in the source extract', 'number', { required: true }),
      f('sourceManifest', 'SHA-256 of the source manifest (kind, id and hash of each record, sorted)', 'text', { required: true }),
      f('description', 'The migration plan: scope, mapping, validation and rollback', 'longtext', { required: true }),
      f('targetCount', 'Number of records in an external target (computed by the platform for its own records)', 'number', { audience: 'officer' }),
      f('targetManifest', 'SHA-256 of an external target\'s manifest (computed by the platform for its own records)', 'text', { audience: 'officer' }),
      f('discrepancies', 'Discrepancies found', 'longtext', { audience: 'officer' }),
      f('correctiveActions', 'Corrective actions', 'longtext', { audience: 'officer' }),
      // Plan I9 (acceptance P5-06): each record's source, transformations and target, verified at every reconciliation.
      {
        key: 'recordManifest', label: 'Per-record manifest (one item per record: source id, source SHA-256, transformations, target id, target SHA-256)', type: 'group', multiple: true, textLines: true, personalDataClass: 'administrative',
        hint: 'Transformations are named steps of the plan, in order: step[:rule][@version], separated by ;. Give the items as lines with | between the columns if you prefer. The source count and manifest are this manifest\'s own.',
        items: [
          { key: 'sourceId', label: 'Id in the source system', type: 'text', personalDataClass: 'administrative' },
          { key: 'sourceSha256', label: 'SHA-256 of the record as extracted', type: 'text', personalDataClass: 'administrative' },
          { key: 'transformations', label: 'Transformations, in order', type: 'text', personalDataClass: 'administrative' },
          { key: 'targetId', label: 'Id where it landed', type: 'text', personalDataClass: 'administrative' },
          { key: 'targetSha256', label: 'SHA-256 it has where it landed (a document\'s content as loaded)', type: 'text', personalDataClass: 'administrative' },
        ] as FieldSpec[],
      },
    ],
    documents: [{ class: 'migration-plan', label: 'The migration plan and its validation rules', required: true }],
    stages: [{ key: 'drafted', label: 'Drafted' }, { key: 'planned', label: 'Plan recorded' }, { key: 'approved', label: 'Approved' }, { key: 'reconciled', label: 'Reconciled' }, { key: 'closed', label: 'Closed', terminal: true }, { key: 'abandoned', label: 'Abandoned', terminal: true }],
    actions: [
      { key: 'record-plan', label: 'Record the plan', from: ['drafted'], to: 'planned', needs: { role: 'officer' }, requires: { fields: ['sourceSystem', 'targetSystem', 'targetKind', 'sourceCount', 'sourceManifest', 'description'], documents: ['migration-plan'] }, effects: ['rec.migration.plan'] },
      { key: 'approve', label: 'Approve the migration', from: ['planned'], to: 'approved', decision: 'approve-migration', needs: { role: 'signatory', fourEyes: true, distinctFrom: ['record-plan'] }, requires: { reasons: true }, effects: ['rec.migration.approve'] },
      { key: 'reconcile', label: 'Reconcile the target with the source', from: ['approved', 'reconciled'], to: 'reconciled', needs: { role: 'officer' }, effects: ['rec.migration.reconcile'] },
      { key: 'close', label: 'Close the migration', from: ['reconciled'], to: 'closed', decision: 'close-migration', needs: { role: 'signatory', fourEyes: true, distinctFrom: ['reconcile'] }, requires: { reasons: true }, effects: ['rec.migration.close'] },
      { key: 'abandon', label: 'Abandon, with reasons', from: ['drafted', 'planned', 'approved', 'reconciled'], to: 'abandoned', needs: { role: 'signatory' }, requires: { reasons: true } },
    ],
    tests: [{ name: 'closed', steps: [{ action: 'record-plan', expect: 'refused' }, { action: 'record-plan', fields: { sourceSystem: 'A', targetSystem: 'CivicOS', targetKind: 'external', sourceCount: 1, sourceManifest: 'x', description: 'Plan' }, documents: ['migration-plan'], expect: 'planned' }, { action: 'approve', expect: 'approved' }, { action: 'reconcile', expect: 'reconciled' }, { action: 'close', expect: 'closed' }] }, { name: 'abandoned', steps: [{ action: 'abandon', expect: 'abandoned' }] }],
  },
];

/** The key an institution's own version of a template takes: rec.<name>.<institution>. */
export const recordkeepingKey = (template: string, institution: string) => `${template}.${institution.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')}`.slice(0, 60);

/** Draft the institution's own records management procedures from the templates (once each); a second official approves each. */
export function installRecordkeepingProcedures(institution: string, by: string, byId?: string): { drafted: string[]; present: string[] } | { error: string } {
  const m = getMinistry(institution);
  if (!m) return { error: 'No such institution' };
  const drafted: string[] = [], present: string[] = [];
  for (const t of RECORDKEEPING_PROCEDURES) {
    const key = recordkeepingKey(t.key, institution);
    if (listPackages({ key }).length) { present.push(key); continue; }
    const { forms: _forms, ...pkg } = t;
    const d = draftPackage({ ...pkg, key, owner: institution, title: `${t.title} (${m.name})` }, by, byId, registeredEffects());
    if ('error' in d) return { error: `${key}: ${d.error}` };
    drafted.push(key);
  }
  return { drafted, present };
}
