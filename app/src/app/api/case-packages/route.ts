// /api/case-packages — the nation's procedures (lib/casework/packages.ts,
// design §6.3). GET: every version with its state. POST { op: 'draft',
// package } writes a draft (officials of the responsible institution);
// { op: 'approve', key, version, activeFrom? } approves it (an official who
// can sign there, different from its author, once its tests pass);
// { op: 'install-references' } drafts the reference procedures CivicOS ships
// that the installation does not have yet (administrators; drafts only);
// { op: 'load-demonstration' } loads the demonstration set (a sample act and
// the civil procedures approved under it; administrators, demo and training
// installations only, lib/casework/demo.ts); { op: 'draft-referral',
// institution } drafts that institution's referral procedure from the
// template (its own officials or administrators; lib/casework/referral.ts);
// { op: 'edit', key, version, changes } changes a draft in place (its form,
// evidence, day counts, citations: officials of the responsible institution;
// whoever changes it cannot approve it; lib/casework/packages.ts editDraft()).
// Publication (lib/forms/publication.ts): GET ?publication=<key>&version=
// gives the version's gates, the automatic checks and the human approvals
// apart, the register status they give and the acts recorded; POST { op:
// 'approval', key, version, approval: { kind, outcome?, note?, citation?,
// rollbackPlan?, releaseNotes?, environment? } } records one approval as an
// act of the signed-in official (never a status sent in the request).
// The form contract (lib/forms): GET ?form=<key>[&version=][&locale=] gives
// a procedure's form as it renders; ?contract=1 what a form may use (types,
// classes, named rules, patterns, approved lists, building blocks, exchange
// services); ?library=1 the form library (the specification's sixteen forms,
// the field series' contracts and the catalogue contracts CivicOS wrote in
// batches, each with what the loader reported, every deviation and its
// register status from the publication gates; ?form= and ?publication= answer
// for a library form too, a contract draft no procedure carries yet, whose
// approvals are recorded only on the procedure that carries it). A document's citation
// may be sent as { instrument, eId }: it is cited from the laws register here.
import { NextRequest, NextResponse } from 'next/server';
import { caseActRefusal } from '@/lib/auth/roles';
import { authorityFor } from '@/lib/data/store';
import { listPackages, draftPackage, approvePackage, getPackage, ownerInstitution, runPackageTests, editDraft, activePackage, unsetDays, type DraftChanges } from '@/lib/casework/packages';
import { formView, valueSnapshot } from '@/lib/forms/server';
import { findLibraryForm, libraryForms, libraryInfo } from '@/lib/forms/page-data';
import { BLOCKS } from '@/lib/forms/blocks';
import { DATA_CLASSES, CONFIDENTIALITY, FIELD_TYPES, TYPE_LABEL, PATTERNS, PROFILES, RULE_LABEL, VALUE_REGISTERS, REFERENCE_REGISTERS, LOCATION_KINDS, CONTACT_METHODS } from '@/lib/forms/contract';
import { serviceDirectory } from '@/lib/exchange/services';
import { nationCurrency, nationLanguages } from '@/lib/nation/registry';
import { cite } from '@/lib/law/register';
import type { ContractDocument } from '@/lib/forms/contract';
import { registeredEffects } from '@/lib/casework/engine';
import { routeActor } from '@/lib/casework/actor';
import type { CasePackage } from '@/lib/casework/types';
import { installReferenceProcedures } from '@/lib/casework/modules';
import { adminOnly } from '@/lib/auth/roles';
import { loadDemonstration } from '@/lib/casework/demo';
import { draftReferralProcedure } from '@/lib/casework/referral';
import { publicationOf, libraryPublication, recordApproval, approvalsOf, STATUS_LABEL, APPROVAL_LABEL, type ActInput } from '@/lib/forms/publication';
import { envelopeOf } from '@/lib/forms/envelope';

export const dynamic = 'force-dynamic';

/** A document citation sent as { instrument, eId } is cited from the laws register today (version and digest); a full citation is kept. */
function citeDocuments(docs: ContractDocument[] | undefined): ContractDocument[] | { error: string } {
  const out: ContractDocument[] = [];
  for (const d of docs ?? []) {
    const c = d.citation as (ContractDocument['citation'] & { instrument?: string; eId?: string }) | undefined;
    if (c && (!c.version || !c.digest)) {
      const r = cite(String(c.instrument ?? ''), String(c.eId ?? ''), new Date().toISOString().slice(0, 10));
      if ('error' in r) return { error: `Document ${d.class}: ${r.error}` };
      out.push({ ...d, citation: r });
    } else out.push(d);
  }
  return out;
}

export function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams;
  const pubKey = q.get('publication');
  if (pubKey) {
    const p = getPackage(pubKey, Number(q.get('version')));
    if (!p) {
      // A library form no procedure carries yet: its gates as they stand (a contract draft); approvals are recorded on the procedure that carries it.
      const lib = findLibraryForm(pubKey);
      if (!lib) return NextResponse.json({ error: 'No such procedure version' }, { status: 404 });
      const pub = libraryPublication(lib.def, lib.waitsFor);
      return NextResponse.json({ publication: pub, statusLabel: STATUS_LABEL[pub.status], approvalLabels: APPROVAL_LABEL, approvals: [], library: true });
    }
    const pub = publicationOf(p, new Date(), registeredEffects());
    const legalReviewed = pub.human.find(h => h.id === 'legal-review')?.passed ?? false;
    // Checks the platform verifies (automatic) and approvals only a person gives (human), kept apart.
    return NextResponse.json({ publication: pub, statusLabel: STATUS_LABEL[pub.status], approvalLabels: APPROVAL_LABEL, approvals: approvalsOf(p.key, p.version), envelope: envelopeOf(p, ownerInstitution(p.owner, authorityFor), legalReviewed) });
  }
  const formKey = q.get('form');
  if (formKey) {
    const version = Number(q.get('version'));
    const p = version ? getPackage(formKey, version) : activePackage(formKey) ?? listPackages({ key: formKey }).sort((a, b) => b.version - a.version)[0];
    const found = !p ? findLibraryForm(formKey) : undefined;
    if (!p && !found) return NextResponse.json({ error: 'No such procedure or library form' }, { status: 404 });
    const src = p ?? { ...found!.def, version: 1, state: 'draft', library: true };
    return NextResponse.json({ form: formView(src, q.get('locale') ?? undefined), unsetDays: p ? unsetDays(p) : [], ...(found ? { library: libraryInfo(found) } : {}) });
  }
  if (q.get('contract')) {
    return NextResponse.json({
      types: FIELD_TYPES.map(t => ({ key: t, label: TYPE_LABEL[t] })), classes: DATA_CLASSES, confidentiality: CONFIDENTIALITY,
      rules: Object.entries(RULE_LABEL).map(([key, label]) => ({ key, label })), patterns: Object.entries(PATTERNS).map(([key, p]) => ({ key, label: p.label })), profiles: Object.entries(PROFILES).map(([key, label]) => ({ key, label })),
      valueRegisters: VALUE_REGISTERS, referenceRegisters: REFERENCE_REGISTERS, locationKinds: LOCATION_KINDS, contactMethods: CONTACT_METHODS,
      blocks: BLOCKS.map(({ key, label, description }) => ({ key, label, description, example: BLOCKS.find(b => b.key === key)!.make('example') })),
      services: serviceDirectory().filter(s => s.kind === 'query').map(s => ({ id: s.id, title: s.title })),
      snapshot: valueSnapshot(), currency: nationCurrency(), languages: nationLanguages(),
    });
  }
  if (q.get('library')) {
    // A library form is a contract draft until a procedure carries it and its gates pass: its status comes from the publication gates, its scope as it stands.
    return NextResponse.json({ forms: libraryForms().map(({ def: f, waitsFor, catalogue: c }) => {
      const pub = libraryPublication(f, waitsFor);
      return {
        key: f.key, specId: f.specId, title: f.title, owner: f.owner, attachesTo: 'attachesTo' in f ? f.attachesTo ?? null : c?.procedure?.key ?? null, awaits: waitsFor,
        fields: f.fields.length, notes: f.notes, deviations: 'deviations' in f ? f.deviations : [], status: pub.status, scope: pub.scope,
        source: c ? `catalogue batch ${c.batch}` : 'source' in f ? 'field series' : 'specification',
      };
    }) });
  }
  const key = q.get('key') ?? undefined;
  const effects = registeredEffects();
  const packages = listPackages({ key }).map(p => ({ ...p, ownerInstitution: ownerInstitution(p.owner, authorityFor) ?? null, tests: p.tests, testResult: runPackageTests(p), publicationStatus: publicationOf(p, new Date(), effects).status }));
  return NextResponse.json({ packages, effects: registeredEffects() });
}

export async function POST(req: NextRequest) {
  const b = (await req.json().catch(() => ({}))) as { op?: string; package?: CasePackage; key?: string; version?: number; activeFrom?: string; by?: string };
  const actor = await routeActor(b.by);
  if (b.op === 'draft') {
    const p = b.package;
    if (!p || typeof p !== 'object') return NextResponse.json({ error: 'Send the procedure' }, { status: 422 });
    const owner = ownerInstitution(p.owner, authorityFor);
    if (!owner) return NextResponse.json({ error: 'Name the responsible institution under Who is responsible first' }, { status: 422 });
    if (actor.scope) {
      const why = caseActRefusal(actor.scope, { owner, sensitivity: 'normal' });
      if (why) return NextResponse.json({ error: why }, { status: 403 });
    }
    // Only what a procedure states; who wrote and approved it comes from the sign-in, never the request.
    const documents = citeDocuments(p.documents);
    if ('error' in documents) return NextResponse.json(documents, { status: 422 });
    const input = { key: p.key, version: p.version, owner: p.owner, title: p.title, refPrefix: p.refPrefix, citations: p.citations ?? [], fields: p.fields ?? [], documents, ...(p.form ? { form: p.form } : {}), stages: p.stages ?? [], actions: p.actions ?? [], deadlines: p.deadlines ?? [], notifications: p.notifications ?? [], ...(p.appeal ? { appeal: p.appeal } : {}), retention: p.retention, sensitivity: p.sensitivity, ...(p.migration ? { migration: p.migration } : {}), tests: p.tests ?? [] };
    const r = draftPackage(input, actor.name, actor.id, registeredEffects());
    return 'error' in r ? NextResponse.json(r, { status: 422 }) : NextResponse.json({ package: r }, { status: 201 });
  }
  if (b.op === 'approve') {
    const p = getPackage(String(b.key ?? ''), Number(b.version));
    if (!p) return NextResponse.json({ error: 'No such procedure version' }, { status: 404 });
    const owner = ownerInstitution(p.owner, authorityFor);
    if (!owner) return NextResponse.json({ error: 'Name the responsible institution under Who is responsible first' }, { status: 422 });
    if (actor.scope) {
      const why = caseActRefusal(actor.scope, { owner, sensitivity: 'normal', decision: true });
      if (why) return NextResponse.json({ error: why }, { status: 403 });
    }
    const r = approvePackage(p.key, p.version, actor.name, actor.id, b.activeFrom, registeredEffects());
    return 'error' in r ? NextResponse.json(r, { status: 422 }) : NextResponse.json({ package: r });
  }
  if (b.op === 'edit') {
    const p = getPackage(String(b.key ?? ''), Number(b.version));
    if (!p) return NextResponse.json({ error: 'No such procedure version' }, { status: 404 });
    const owner = ownerInstitution(p.owner, authorityFor);
    if (!owner) return NextResponse.json({ error: 'Name the responsible institution under Who is responsible first' }, { status: 422 });
    if (actor.scope) {
      const why = caseActRefusal(actor.scope, { owner, sensitivity: 'normal' });
      if (why) return NextResponse.json({ error: why }, { status: 403 });
    }
    const changes = ((b as { changes?: DraftChanges }).changes ?? {}) as DraftChanges;
    if (changes.documents) {
      const documents = citeDocuments(changes.documents);
      if ('error' in documents) return NextResponse.json(documents, { status: 422 });
      changes.documents = documents;
    }
    const r = editDraft(p.key, p.version, changes, actor.name, actor.id, registeredEffects());
    return 'error' in r ? NextResponse.json(r, { status: 422 }) : NextResponse.json({ package: r });
  }
  if (b.op === 'approval') {
    // An approval is an act of the signed-in official (who acted comes from the session); only these fields are read.
    const a = ((b as { approval?: Partial<ActInput> }).approval ?? {}) as Partial<ActInput>;
    const input: ActInput = {
      kind: a.kind as ActInput['kind'], ...(a.outcome === 'returned' ? { outcome: 'returned' as const } : {}),
      ...(typeof a.note === 'string' ? { note: a.note } : {}),
      ...(a.citation && typeof a.citation === 'object' ? { citation: { instrument: String(a.citation.instrument ?? ''), eId: String(a.citation.eId ?? '') } } : {}),
      ...(typeof a.rollbackPlan === 'string' ? { rollbackPlan: a.rollbackPlan } : {}),
      ...(typeof a.releaseNotes === 'string' ? { releaseNotes: a.releaseNotes } : {}),
      ...(a.environment === 'staging' ? { environment: 'staging' } : {}),
    };
    const r = recordApproval(String(b.key ?? ''), Number(b.version), input, { ...(actor.id ? { id: actor.id } : {}), name: actor.name, scope: actor.scope ?? null });
    return 'error' in r ? NextResponse.json(r, { status: actor.scope ? 422 : 403 }) : NextResponse.json({ publication: r });
  }
  if (b.op === 'install-references') {
    if (actor.scope) {
      const why = adminOnly(actor.scope);
      if (why) return NextResponse.json({ error: why }, { status: 403 });
    }
    return NextResponse.json(installReferenceProcedures(actor.name));
  }
  if (b.op === 'load-demonstration') {
    if (actor.scope) {
      const why = adminOnly(actor.scope);
      if (why) return NextResponse.json({ error: why }, { status: 403 });
    }
    const r = loadDemonstration(actor.name);
    return 'error' in r ? NextResponse.json(r, { status: 422 }) : NextResponse.json(r);
  }
  if (b.op === 'draft-referral') {
    const institution = String((b as { institution?: unknown }).institution ?? '');
    if (actor.scope) {
      const why = actor.scope.institution === institution ? null : adminOnly(actor.scope);
      if (why) return NextResponse.json({ error: why }, { status: 403 });
    }
    const r = draftReferralProcedure(institution, actor.name);
    return 'error' in r ? NextResponse.json(r, { status: 422 }) : NextResponse.json(r);
  }
  return NextResponse.json({ error: 'op must be draft, edit, approve, install-references, load-demonstration or draft-referral' }, { status: 422 });
}
