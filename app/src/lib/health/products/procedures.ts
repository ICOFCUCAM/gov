// The medicines regulator's procedures on the register of authorised medicines
// and medical devices (lib/health/products/register.ts; field series Part 6
// §5, Health I4 dependencies procedure-*). Reference procedures, shipped as
// drafts like every reference procedure: the nation's medicines authority
// adapts each to its law, a second official approves it, and until then no
// case runs under it.
//
//   medicines.authorisation       marketing authorisation: application
//                                 registered → dossier version → assessment
//                                 ⇄ information request and response →
//                                 decision (authorise or refuse)
//   medicines.variation           variation of an authorised product
//   medicines.renewal             renewal of an authorisation
//   medicines.suspension          suspension, reinstatement and withdrawal,
//                                 after notice and representations, with the
//                                 public notice published as its own act
//   medicines.recall              recall: notification → risk assessment →
//                                 decision → public notice → supply-chain
//                                 notification → completion report →
//                                 completion verified
//   medicines.device-registration registration of a medical device
//
// and six more (Health I4, second step; see the block "Corrective action,
// import and controlled-medicine authorisation, safety intake,
// reconsideration" below): corrective action after a good-practice
// inspection, import authorisation, controlled-medicine authorisation (the
// `controlledSubstances` slot), safety reports, device incidents and
// reconsideration.
//
// and, on the organisations register, the licences of medicines
// manufacturers, importers and wholesalers (register types kept by the
// `medicinesRegulation` slot; the shared licence, renewal, suspension and
// revocation procedures of lib/organisations/procedures.ts).
//
// Nothing statutory is typed: no outcome list (authorise or refuse is the
// case's action; the kinds of outcome are the nation's list on HLT-MED-006),
// no deadline or appeal period (none ships: the nation's version adds them),
// no fee. Who holds each power comes from the permit authority registry
// (lib/permits/authority.ts: medicine-marketing-authorisation,
// medical-device-registration, product-recall, proposed as unapproved drafts);
// a production installation refuses every decision until the nation approves
// a mapping. Controlled-medicine authorisations belong to the
// `controlledSubstances` slot (permit type controlled-medicine-authorisation).
// AI never decides here: a safety signal is assessed by officials and a recall
// or a safety alert is ordered only by a sealed decision. A published recall
// notice or safety alert reaches the integrations two officials approved for
// HX-005 (lib/health/products/notices.ts), carrying the public view only.

import { registerEffect, registeredEffects, sampleMark, getCase, refer, type EffectContext } from '@/lib/casework/engine';
import { activePackage, draftPackage, listPackages, ownerInstitution } from '@/lib/casework/packages';
import { recordAudit } from '@/lib/data/store/audit';
import { dualControlRefusal } from '@/lib/data/dual-control';
import { getDecision, type SignedDecision } from '@/lib/records/decisions';
import { getOrganisation, publicOrganisation } from '@/lib/organisations/register';
import type { AuthorityKey } from '@/lib/nation/deployment';
import { sectorProcedures } from '@/lib/organisations/procedures';
import { authorityFor } from '@/lib/data/store';
import { getDocument } from '@/lib/records/documents';
import { powerRefusal, mappingInForce, type Power } from '@/lib/permits/authority';
import { samplesAllowed } from '@/lib/ops/mode';
import type { Case, CasePackage, FieldSpec } from '@/lib/casework/types';
import {
  applyForProduct, recordDossier, recordAssessment, decideProduct, varyProduct, renewProduct, changeProductState, orderRecall, publishProductNotice,
  completeRecall, attachProductDecision, getProduct, productOfCase, productByReference, APPLICATION_KEYS, issueSafetyAlert, publishedNoticeOf,
  type ProductEntry, type ApplicationKey,
} from './register';
import { authoriseImport, attachImportDecision } from './imports';
import { authoriseControlled, attachControlledDecision } from './controlled';
import { issueSafetyNotice, noteSupplyChainNotice } from './notices';

type Ref = Omit<CasePackage, 'state' | 'createdAt' | 'author' | 'authorId' | 'approvedBy' | 'approvedAt'>;
const str = (v: unknown) => (typeof v === 'string' ? v.trim() : '');
const lines = (v: unknown) => str(v).split(/[;\n]/).map(x => x.trim()).filter(Boolean).slice(0, 30);

/** The permit type whose approved mapping governs a power over a product (lib/permits/decisions.ts reads the same). */
export const PRODUCT_PERMIT_TYPES = {
  medicine: 'medicine-marketing-authorisation', device: 'medical-device-registration', recall: 'product-recall',
  importAuthorisation: 'medicine-import-authorisation', controlled: 'controlled-medicine-authorisation', correctiveAction: 'good-practice-corrective-action',
  safety: 'product-safety-assessment', reconsideration: 'medicines-decision-reconsideration',
} as const;

/** May this case's institution use this power? The approved mapping decides; without one (demo and training only) the authority named for the slot in the deployment profile. */
function mayAct(c: Case, permitType: string, power: Power, slot: AuthorityKey = 'medicinesRegulation'): string | null {
  const resolve = (a: string) => ownerInstitution(a, authorityFor);
  const why = powerRefusal(permitType, power, c.owner, resolve, { required: !samplesAllowed() });
  if (why) return why;
  if (mappingInForce(permitType)) return null;
  if (resolve(slot) === c.owner) return null;
  return slot === 'controlledSubstances' ? 'Controlled-medicine authorisations are kept by the controlled-substances authority named under Who is responsible' : 'The register of medicines and medical devices is kept by the medicines authority named under Who is responsible';
}
const permitOf = (p: Pick<ProductEntry, 'kind'>) => PRODUCT_PERMIT_TYPES[p.kind];

/** A product by its register number or its authorisation number (what a form's product reference names). */
const byRef = (v: unknown): ProductEntry | undefined => {
  const ref = str(v);
  if (!ref) return undefined;
  const p = getProduct(ref);
  if (p) return p;
  const found = productByReference(ref);
  return found ? getProduct(found.number) : undefined;
};
/** The product a case is about: the one it registered, else the register or authorisation number in its product field. */
function productOf(c: Case): ProductEntry | { error: string } {
  const p = productOfCase(c.id) ?? byRef(c.fields.product);
  return p ?? { error: `No product ${str(c.fields.product) || '(none given)'} in the register of medicines and medical devices` };
}
/** Documents of these classes attached to the case. */
const docsOf = (c: Case, classes: string[]) => c.documents.filter(id => classes.includes(getDocument(id)?.class ?? ''));
const reasonOf = (ctx: EffectContext) => ctx.case.pending?.reason ?? `${ctx.action.label} (${ctx.case.ref})`;
const attach = (p: ProductEntry, c: Case) => (d?: { id: string }) => { if (d) attachProductDecision(p.number, c.id, d.id); };
const fail = (r: { error: string } | object): r is { error: string } => 'error' in r;

const APPLY_FIELDS: Record<ApplicationKey, string> = {
  name: 'productName', strength: 'strength', dosageForm: 'dosageForm', route: 'route', therapeuticClass: 'therapeuticClass', deviceClass: 'deviceClass',
  deviceNomenclature: 'deviceNomenclature', legalSupplyCategory: 'legalSupplyCategory', activeIngredients: 'activeIngredients', composition: 'composition',
  manufacturingSites: 'manufacturingSites', packagingAndLabelling: 'packagingAndLabelling',
};
const attributesOf = (c: Case, prefix = '') => Object.fromEntries(APPLICATION_KEYS.map(k => [k, c.fields[prefix ? `${prefix}${APPLY_FIELDS[k][0]!.toUpperCase()}${APPLY_FIELDS[k].slice(1)}` : APPLY_FIELDS[k]]]).filter(([, v]) => v !== undefined && v !== ''));

// ── Effects ──────────────────────────────────────────────────────────────────

const apply = (kind: 'medicine' | 'device') => (ctx: EffectContext) => {
  const { case: c, actor, now } = ctx;
  const why = mayAct(c, PRODUCT_PERMIT_TYPES[kind], 'issue');
  if (why) return { error: why };
  const had = productOfCase(c.id);
  if (had) return { facts: { product: had.number } };
  const p = applyForProduct({ kind, holder: c.fields.holder, attributes: attributesOf(c), ...sampleMark(c) }, c.id, actor.name, now);
  if (fail(p)) return p;
  return { facts: { product: p.number } };
};
registerEffect('product.apply', apply('medicine'));
registerEffect('product.applyDevice', apply('device'));

/** An authorised (or lapsed) product of the holder named on the case: checked before a variation, renewal, suspension or recall goes on. */
registerEffect('product.check', ({ case: c }: EffectContext) => {
  const p = productOf(c);
  if (fail(p)) return p;
  if (['applied', 'refused'].includes(p.state)) return { error: `${p.number} is not authorised: there is nothing to vary, renew, suspend or recall` };
  if (str(c.fields.holder) && str(c.fields.holder) !== p.holder) return { error: `${p.number} is held by ${p.holder}, not ${str(c.fields.holder)}` };
  const why = mayAct(c, c.package.key === 'medicines.recall' ? PRODUCT_PERMIT_TYPES.recall : permitOf(p), 'issue');
  if (why) return { error: why };
  return { facts: { product: p.number } };
});

registerEffect('product.dossier', ({ case: c, actor, now }: EffectContext) => {
  const p = productOf(c);
  if (fail(p)) return p;
  const seen = new Set(((p.versions.at(-1)!.attributes.dossier?.value as { documents: string[] }[] | undefined) ?? []).flatMap(x => x.documents));
  const docs = docsOf(c, ['dossier', 'applicant-response']).filter(id => !seen.has(id));
  const r = recordDossier(p.number, docs, str(c.fields.dossierNote), c.id, actor.name, now);
  return fail(r) ? r : { facts: { product: p.number, dossierVersions: (r.versions.at(-1)!.attributes.dossier!.value as unknown[]).length } };
});

registerEffect('product.assess', (ctx: EffectContext) => {
  const { case: c, actor, now } = ctx;
  const p = productOf(c);
  if (fail(p)) return p;
  const r = recordAssessment(p.number, { documents: docsOf(c, ['assessment-report']), summary: str(c.fields.assessmentSummary) || reasonOf(ctx) }, c.id, actor.name, now);
  return fail(r) ? r : { facts: { product: p.number } };
});

const decide = (outcome: 'authorised' | 'refused') => (ctx: EffectContext) => {
  const { case: c, actor, now } = ctx;
  const p = productOf(c);
  if (fail(p)) return p;
  const why = mayAct(c, permitOf(p), 'issue');
  if (why) return { error: why };
  const r = decideProduct(p.number, { outcome, reason: reasonOf(ctx), conditions: lines(c.fields.conditions), ...(str(c.fields.validUntil) ? { validUntil: str(c.fields.validUntil) } : {}), ...sampleMark(c) }, c.id, actor.name, now);
  if (fail(r)) return r;
  const v = r.versions.at(-1)!.attributes;
  return { facts: { product: r.number, standing: r.state, ...(typeof v.authorisationNumber?.value === 'string' && outcome === 'authorised' ? { authorisationNumber: v.authorisationNumber.value } : {}), ...(typeof v.validUntil?.value === 'string' && outcome === 'authorised' ? { validUntil: v.validUntil.value } : {}) }, after: attach(r, c) };
};
registerEffect('product.authorise', decide('authorised'));
registerEffect('product.refuse', decide('refused'));

registerEffect('product.vary', (ctx: EffectContext) => {
  const { case: c, actor, now } = ctx;
  const p = productOf(c);
  if (fail(p)) return p;
  const why = mayAct(c, permitOf(p), 'issue');
  if (why) return { error: why };
  const r = varyProduct(p.number, attributesOf(c, 'new'), reasonOf(ctx), c.id, actor.name, now, sampleMark(c).sample);
  return fail(r) ? r : { facts: { product: r.number, version: r.versions.at(-1)!.n }, after: attach(r, c) };
});

registerEffect('product.renew', (ctx: EffectContext) => {
  const { case: c, actor, now } = ctx;
  const p = productOf(c);
  if (fail(p)) return p;
  const why = mayAct(c, permitOf(p), 'renew');
  if (why) return { error: why };
  const r = renewProduct(p.number, { reason: reasonOf(ctx), conditions: lines(c.fields.conditions), ...(str(c.fields.validUntil) ? { validUntil: str(c.fields.validUntil) } : {}), ...sampleMark(c) }, c.id, actor.name, now);
  return fail(r) ? r : { facts: { product: r.number, standing: r.state }, after: attach(r, c) };
});

const status = (state: 'suspended' | 'authorised' | 'withdrawn', power: Power) => (ctx: EffectContext) => {
  const { case: c, actor, now } = ctx;
  const p = productOf(c);
  if (fail(p)) return p;
  const why = mayAct(c, permitOf(p), power);
  if (why) return { error: why };
  const r = changeProductState(p.number, { state, reason: reasonOf(ctx), grounds: str(c.fields.grounds), ...sampleMark(c) }, c.id, actor.name, now);
  return fail(r) ? r : { facts: { product: r.number, standing: r.state }, after: attach(r, c) };
};
registerEffect('product.suspend', status('suspended', 'suspend'));
// Reinstatement after a suspension uses the suspending power; withdrawal the revoking power.
registerEffect('product.reinstate', status('authorised', 'suspend'));
registerEffect('product.withdraw', status('withdrawn', 'revoke'));

registerEffect('product.recall', ({ case: c, actor, now }: EffectContext) => {
  const p = productOf(c);
  if (fail(p)) return p;
  const why = mayAct(c, PRODUCT_PERMIT_TYPES.recall, 'issue');
  if (why) return { error: why };
  const r = orderRecall(p.number, { grounds: str(c.fields.grounds), ...(str(c.fields.recallClass) ? { recallClass: str(c.fields.recallClass) } : {}), ...sampleMark(c) }, c.id, actor.name, now);
  return fail(r) ? r : { facts: { product: r.number, recall: true }, after: attach(r, c) };
});

registerEffect('product.publishNotice', ({ case: c, actor, now }: EffectContext) => {
  const p = productOf(c);
  if (fail(p)) return p;
  const r = publishProductNotice(p.number, c.id, str(c.fields.publicNotice), actor.name, now);
  if (fail(r)) return r;
  // A published recall notice or safety alert goes to the integrations two officials approved for HX-005: the public view only.
  const n = publishedNoticeOf(r.number, c.id);
  const facts: Record<string, string | number | boolean> = { product: r.number, noticePublished: true };
  if (n) {
    const issued = issueSafetyNotice({ case: c.id, reference: c.ref, kind: n.kind, product: n.product, ...(n.recallClass ? { recallClass: n.recallClass } : {}), decidedOn: n.decidedOn, publishedOn: n.publishedOn }, actor.name, now);
    if (fail(issued)) return issued;
    facts.notice = issued.notice;
  }
  return { facts };
});

registerEffect('product.completeRecall', (ctx: EffectContext) => {
  const { case: c, actor, now } = ctx;
  const p = productOf(c);
  if (fail(p)) return p;
  const r = completeRecall(p.number, c.id, { summary: str(c.fields.completionSummary) || reasonOf(ctx), documents: docsOf(c, ['completion-report']) }, actor.name, now);
  return fail(r) ? r : { facts: { product: r.number, recallCompleted: true } };
});

// ── Reference procedures ─────────────────────────────────────────────────────

const base = { owner: 'medicinesRegulation', reference: true as const, citations: [], notifications: [], deadlines: [], retention: 'medicines-register-permanent', sensitivity: 'restricted' as const };
const configured = (key: string, label: string, list: string, standard: string): FieldSpec => ({ key, label, type: 'enum', valuesSource: { kind: 'configured', list }, personalDataClass: 'public', countryDecision: `The nation's ${standard}; none ship (CFG-MED-001)` });
const HOLDER: FieldSpec = { key: 'holder', label: 'Authorisation holder (organisation register number)', type: 'registryReference', register: 'organisation', rules: [{ rule: 'existingRecord' }], personalDataClass: 'public' };
const PRODUCT: FieldSpec = { key: 'product', label: 'Product (register number, PRD-…)', type: 'text', personalDataClass: 'public' };
const text = (key: string, label: string, cls: 'public' | 'restricted' | 'commercial' | 'administrative', long = false): FieldSpec => ({ key, label, type: long ? 'longtext' : 'text', personalDataClass: cls });
const APPLICATION: FieldSpec[] = [
  HOLDER,
  text('productName', 'Product name', 'public'),
  text('strength', 'Strength', 'public'),
  configured('dosageForm', 'Pharmaceutical form', 'medicines.country.dosage_forms', 'dosage forms (expected source: EDQM Standard Terms)'),
  configured('route', 'Route of administration', 'medicines.country.routes', 'routes of administration (expected source: EDQM Standard Terms)'),
  configured('therapeuticClass', 'Therapeutic class', 'medicines.country.atc_codes', 'therapeutic classification (expected source: WHO ATC)'),
  configured('legalSupplyCategory', 'Legal supply category', 'medicines.country.supply_categories', 'legal supply categories under its medicines law'),
  text('activeIngredients', 'Active ingredients (one per line)', 'public', true),
  text('composition', 'Composition (commercially confidential)', 'restricted', true),
  text('manufacturingSites', 'Manufacturing sites (organisation or site references, one per line)', 'restricted', true),
  text('packagingAndLabelling', 'Packaging and labelling (commercially confidential)', 'restricted', true),
];
const DEVICE: FieldSpec[] = [
  HOLDER,
  text('productName', 'Device name', 'public'),
  configured('deviceClass', 'Risk class', 'medicines.country.device_risk_classes', 'device risk classes (expected source: IMDRF)'),
  configured('deviceNomenclature', 'Nomenclature term', 'medicines.country.device_nomenclature', 'device nomenclature (expected source: GMDN)'),
  text('composition', 'Technical documentation summary (commercially confidential)', 'restricted', true),
  text('manufacturingSites', 'Manufacturing sites (organisation or site references, one per line)', 'restricted', true),
];
const DECISION_FIELDS: FieldSpec[] = [
  text('conditions', 'Conditions of the decision (one per line)', 'public', true),
  { key: 'validUntil', label: 'Valid until (as the decision states it under the nation\'s law; none: until withdrawn)', type: 'date', personalDataClass: 'public' },
  text('assessmentSummary', 'Assessment summary (restricted)', 'restricted', true),
  text('dossierNote', 'Dossier version note', 'administrative'),
];
const ASSESSMENT_DOCS = [
  { class: 'application-form', label: 'The application', required: true },
  { class: 'dossier', label: 'Dossier documents (a version each time)', required: true, multiple: true },
  { class: 'information-request', label: 'Request for further information sent to the applicant', required: false },
  { class: 'applicant-response', label: 'The applicant\'s response', required: false, multiple: true },
  { class: 'assessment-report', label: 'Technical assessment report', required: true },
];
/** The assessment stages every application, variation and renewal shares, ending in a two-official decision. */
function assessed(o: { decision: string; decisionLabel: string; done: string; doneLabel: string; effect: string; refuseEffect?: string; first: CasePackage['actions'][number] }): Pick<Ref, 'stages' | 'actions'> {
  return {
    stages: [
      { key: 'submitted', label: 'Submitted' }, { key: 'dossier', label: 'Dossier' }, { key: 'assessment', label: 'Assessment' },
      { key: 'information-requested', label: 'Further information requested' }, { key: 'pending-approval', label: 'Decision' },
      { key: o.done, label: o.doneLabel, terminal: true }, { key: 'not-granted', label: 'Refused', terminal: true },
    ],
    actions: [
      o.first,
      { key: 'record-dossier', label: 'Record the dossier version', from: ['dossier'], to: 'assessment', needs: { role: 'officer' }, requires: { documents: ['dossier'] }, effects: ['product.dossier'] },
      { key: 'request-information', label: 'Request further information', from: ['assessment'], to: 'information-requested', needs: { role: 'officer' }, requires: { documents: ['information-request'], reasons: true } },
      { key: 'record-response', label: 'Record the applicant\'s response', from: ['information-requested'], to: 'assessment', needs: { role: 'officer' }, requires: { documents: ['applicant-response'] }, effects: ['product.dossier'] },
      { key: 'assess', label: 'Assessment done: propose a decision', from: ['assessment'], to: 'pending-approval', needs: { role: 'officer' }, requires: { documents: ['assessment-report'], reasons: true }, effects: ['product.assess'] },
      { key: 'reassess', label: 'Return to assessment', from: ['pending-approval'], to: 'assessment', needs: { role: 'signatory' }, requires: { reasons: true } },
      { key: o.decision, label: o.decisionLabel, from: ['pending-approval'], to: o.done, decision: o.decision, needs: { role: 'signatory', fourEyes: true }, requires: { reasons: true }, effects: [o.effect] },
      { key: 'refuse', label: 'Refuse, with reasons', from: ['pending-approval'], to: 'not-granted', decision: 'refuse', needs: { role: 'signatory', fourEyes: true }, requires: { reasons: true }, ...(o.refuseEffect ? { effects: [o.refuseEffect] } : {}) },
    ],
  };
}
const assessedTests = (first: { action: string; fields: Record<string, unknown> }, decision: string, done: string): Ref['tests'] => [
  { name: `${done} after a request for further information`, steps: [
    { action: first.action, expect: 'refused' },
    { action: first.action, fields: first.fields, documents: ['application-form'], expect: 'dossier' },
    { action: 'record-dossier', documents: ['dossier'], expect: 'assessment' },
    { action: 'request-information', documents: ['information-request'], expect: 'information-requested' },
    { action: 'record-response', documents: ['applicant-response'], expect: 'assessment' },
    { action: 'assess', documents: ['assessment-report'], expect: 'pending-approval' },
    { action: decision, expect: done },
  ] },
  { name: 'refused', steps: [
    { action: first.action, fields: first.fields, documents: ['application-form'], expect: 'dossier' },
    { action: 'record-dossier', documents: ['dossier'], expect: 'assessment' },
    { action: 'assess', documents: ['assessment-report'], expect: 'pending-approval' },
    { action: 'reassess', expect: 'assessment' },
    { action: 'assess', expect: 'pending-approval' },
    { action: 'refuse', expect: 'not-granted' },
  ] },
];

export const REFERENCE_MARKETING_AUTHORISATION: Ref = {
  ...base, key: 'medicines.authorisation', version: 1, title: 'Marketing authorisation of a medicine', refPrefix: 'MAA',
  authority: { permitType: PRODUCT_PERMIT_TYPES.medicine },
  fields: [...APPLICATION, ...DECISION_FIELDS], documents: ASSESSMENT_DOCS,
  ...assessed({ decision: 'authorise', decisionLabel: 'Authorise', done: 'authorised', doneLabel: 'Authorised', effect: 'product.authorise', refuseEffect: 'product.refuse',
    first: { key: 'register', label: 'Register the application', from: ['submitted'], to: 'dossier', needs: { role: 'officer' }, requires: { fields: ['holder', 'productName'], documents: ['application-form'] }, effects: ['product.apply'] } }),
  tests: assessedTests({ action: 'register', fields: { holder: 'ORG-1', productName: 'A' } }, 'authorise', 'authorised'),
};

export const REFERENCE_DEVICE_REGISTRATION: Ref = {
  ...base, key: 'medicines.device-registration', version: 1, title: 'Registration of a medical device', refPrefix: 'MDA',
  authority: { permitType: PRODUCT_PERMIT_TYPES.device },
  fields: [...DEVICE, ...DECISION_FIELDS], documents: ASSESSMENT_DOCS.map(d => d.class === 'dossier' ? { ...d, label: 'Technical documentation (a version each time)' } : d),
  ...assessed({ decision: 'register', decisionLabel: 'Register the device', done: 'registered', doneLabel: 'Registered', effect: 'product.authorise', refuseEffect: 'product.refuse',
    first: { key: 'register-application', label: 'Register the application', from: ['submitted'], to: 'dossier', needs: { role: 'officer' }, requires: { fields: ['holder', 'productName'], documents: ['application-form'] }, effects: ['product.applyDevice'] } }),
  tests: assessedTests({ action: 'register-application', fields: { holder: 'ORG-1', productName: 'A' } }, 'register', 'registered'),
};

const prefixed = (fs: FieldSpec[]) => fs.filter(f => f.key !== 'holder').map(f => ({ ...f, key: `new${f.key[0]!.toUpperCase()}${f.key.slice(1)}`, label: `New: ${f.label.charAt(0).toLowerCase()}${f.label.slice(1)}` }));
export const REFERENCE_VARIATION: Ref = {
  ...base, key: 'medicines.variation', version: 1, title: 'Variation of a product authorisation', refPrefix: 'MAV',
  authority: { permitType: PRODUCT_PERMIT_TYPES.medicine },
  fields: [PRODUCT, { ...HOLDER, label: 'Holder (organisation register number, as on the authorisation)' }, ...prefixed(APPLICATION), ...DECISION_FIELDS.filter(f => f.key !== 'validUntil' && f.key !== 'conditions')], documents: ASSESSMENT_DOCS,
  ...assessed({ decision: 'vary', decisionLabel: 'Approve the variation', done: 'varied', doneLabel: 'Varied', effect: 'product.vary',
    first: { key: 'register', label: 'Register the variation', from: ['submitted'], to: 'dossier', needs: { role: 'officer' }, requires: { fields: ['product'], documents: ['application-form'] }, effects: ['product.check'] } }),
  tests: assessedTests({ action: 'register', fields: { product: 'PRD-1' } }, 'vary', 'varied'),
};

export const REFERENCE_RENEWAL: Ref = {
  ...base, key: 'medicines.renewal', version: 1, title: 'Renewal of a product authorisation', refPrefix: 'MAR',
  authority: { permitType: PRODUCT_PERMIT_TYPES.medicine },
  fields: [PRODUCT, { ...HOLDER, label: 'Holder (organisation register number, as on the authorisation)' }, ...DECISION_FIELDS], documents: ASSESSMENT_DOCS,
  ...assessed({ decision: 'renew', decisionLabel: 'Renew', done: 'renewed', doneLabel: 'Renewed', effect: 'product.renew',
    first: { key: 'register', label: 'Register the renewal application', from: ['submitted'], to: 'dossier', needs: { role: 'officer' }, requires: { fields: ['product'], documents: ['application-form'] }, effects: ['product.check'] } }),
  tests: assessedTests({ action: 'register', fields: { product: 'PRD-1' } }, 'renew', 'renewed'),
};

const NOTICE = text('publicNotice', 'Public notice (what the public needs to know; never the grounds or who reported)', 'public', true);
const RECALL_CLASS: FieldSpec = { key: 'recallClass', label: 'Recall class (from the nation\'s recall classes)', type: 'enum', valuesSource: { kind: 'configured', list: 'medicines.country.recall_classes' }, personalDataClass: 'public', countryDecision: 'The nation\'s recall classes and what each requires; none ship (CFG-MED-003)' };
const GROUNDS = text('grounds', 'Grounds (restricted: never published)', 'restricted', true);

export const REFERENCE_SUSPENSION: Ref = {
  ...base, key: 'medicines.suspension', version: 1, title: 'Suspension or withdrawal of a product authorisation', refPrefix: 'MAS',
  authority: { permitType: PRODUCT_PERMIT_TYPES.medicine },
  fields: [PRODUCT, GROUNDS, NOTICE],
  documents: [{ class: 'grounds', label: 'Grounds (safety signal, inspection, report)', required: true }, { class: 'representations', label: 'The holder\'s representations', required: false }],
  stages: [
    { key: 'opened', label: 'Opened' }, { key: 'hearing', label: 'Notice given: representations' }, { key: 'pending-approval', label: 'Decision' },
    { key: 'suspended', label: 'Suspended' }, { key: 'withdrawn', label: 'Withdrawn' },
    { key: 'reinstated', label: 'Reinstated', terminal: true }, { key: 'withdrawal-published', label: 'Withdrawal published', terminal: true }, { key: 'closed', label: 'Closed without action', terminal: true },
  ],
  actions: [
    { key: 'notify', label: 'Give notice and invite representations', from: ['opened'], to: 'hearing', needs: { role: 'officer' }, requires: { fields: ['product'], documents: ['grounds'], reasons: true }, effects: ['product.check'] },
    { key: 'propose', label: 'Representations considered: propose', from: ['hearing'], to: 'pending-approval', needs: { role: 'officer' }, requires: { reasons: true } },
    { key: 'suspend', label: 'Suspend', from: ['pending-approval'], to: 'suspended', decision: 'suspend', needs: { role: 'signatory', fourEyes: true }, requires: { reasons: true }, effects: ['product.suspend'] },
    { key: 'withdraw', label: 'Withdraw the authorisation', from: ['pending-approval', 'suspended'], to: 'withdrawn', decision: 'withdraw', needs: { role: 'signatory', fourEyes: true }, requires: { reasons: true }, effects: ['product.withdraw'] },
    { key: 'reinstate', label: 'Reinstate', from: ['suspended'], to: 'reinstated', decision: 'reinstate', needs: { role: 'signatory', fourEyes: true }, requires: { reasons: true }, effects: ['product.reinstate'] },
    { key: 'publish-notice', label: 'Publish the suspension notice', from: ['suspended'], to: 'suspended', needs: { role: 'officer' }, requires: { fields: ['publicNotice'] }, effects: ['product.publishNotice'] },
    { key: 'publish-withdrawal', label: 'Publish the withdrawal notice', from: ['withdrawn'], to: 'withdrawal-published', needs: { role: 'officer' }, requires: { fields: ['publicNotice'] }, effects: ['product.publishNotice'] },
    { key: 'close', label: 'Close without action', from: ['hearing', 'pending-approval'], to: 'closed', needs: { role: 'signatory' }, requires: { reasons: true } },
  ],
  tests: [
    { name: 'suspended, notice published, reinstated', steps: [
      { action: 'notify', fields: { product: 'PRD-1' }, documents: ['grounds'], expect: 'hearing' }, { action: 'propose', expect: 'pending-approval' },
      { action: 'suspend', expect: 'suspended' }, { action: 'publish-notice', expect: 'refused' }, { action: 'publish-notice', fields: { publicNotice: 'Stop using it.' }, expect: 'suspended' },
      { action: 'reinstate', expect: 'reinstated' },
    ] },
    { name: 'withdrawn and published', steps: [
      { action: 'notify', fields: { product: 'PRD-1' }, documents: ['grounds'], expect: 'hearing' }, { action: 'propose', expect: 'pending-approval' },
      { action: 'withdraw', expect: 'withdrawn' }, { action: 'publish-withdrawal', fields: { publicNotice: 'Withdrawn.' }, expect: 'withdrawal-published' },
    ] },
    { name: 'closed after representations', steps: [{ action: 'notify', fields: { product: 'PRD-1' }, documents: ['grounds'], expect: 'hearing' }, { action: 'close', expect: 'closed' }] },
  ],
};

export const REFERENCE_RECALL: Ref = {
  ...base, key: 'medicines.recall', version: 1, title: 'Recall of a medicine or medical device', refPrefix: 'RCL',
  authority: { permitType: PRODUCT_PERMIT_TYPES.recall },
  fields: [PRODUCT, GROUNDS, RECALL_CLASS, NOTICE, text('completionSummary', 'Completion and reconciliation summary (restricted)', 'restricted', true)],
  documents: [
    { class: 'recall-notification', label: 'Recall notification (the holder\'s, or the regulator\'s signal)', required: true },
    { class: 'risk-assessment', label: 'Risk assessment', required: true },
    { class: 'supply-chain-notice', label: 'Notification sent to the supply chain', required: true },
    { class: 'completion-report', label: 'Recall completion report', required: true },
  ],
  stages: [
    { key: 'notified', label: 'Notified' }, { key: 'risk-assessment', label: 'Risk assessment' }, { key: 'pending-approval', label: 'Decision' },
    { key: 'ordered', label: 'Recall ordered' }, { key: 'notice-published', label: 'Public notice published' }, { key: 'supply-chain-notified', label: 'Supply chain notified' },
    { key: 'completion-review', label: 'Completion reported' }, { key: 'completed', label: 'Completion verified', terminal: true }, { key: 'closed', label: 'Closed without recall', terminal: true },
  ],
  actions: [
    { key: 'assess-risk', label: 'Register the notification and assess the risk', from: ['notified'], to: 'risk-assessment', needs: { role: 'officer' }, requires: { fields: ['product'], documents: ['recall-notification'] }, effects: ['product.check'] },
    { key: 'propose', label: 'Risk assessed: propose a recall', from: ['risk-assessment'], to: 'pending-approval', needs: { role: 'officer' }, requires: { documents: ['risk-assessment'], reasons: true } },
    { key: 'recall', label: 'Order the recall', from: ['pending-approval'], to: 'ordered', decision: 'recall', needs: { role: 'signatory', fourEyes: true }, requires: { reasons: true }, effects: ['product.recall'] },
    { key: 'close', label: 'Close without a recall', from: ['notified', 'risk-assessment', 'pending-approval'], to: 'closed', needs: { role: 'signatory' }, requires: { reasons: true } },
    { key: 'publish-notice', label: 'Publish the recall notice', from: ['ordered'], to: 'notice-published', needs: { role: 'officer' }, requires: { fields: ['publicNotice'] }, effects: ['product.publishNotice'] },
    // The holder's notice to its supply chain stays a document of this case; the regulator's own notice to approved institutions is HX-005 (sent on publication), which then says it is recorded.
    { key: 'notify-supply-chain', label: 'Record the supply-chain notification', from: ['notice-published'], to: 'supply-chain-notified', needs: { role: 'officer' }, requires: { documents: ['supply-chain-notice'], reasons: true }, effects: ['notice.supplyChain'] },
    { key: 'report-completion', label: 'Record the completion report', from: ['supply-chain-notified'], to: 'completion-review', needs: { role: 'officer' }, requires: { documents: ['completion-report'] } },
    { key: 'return-completion', label: 'Return: completion not shown', from: ['completion-review'], to: 'supply-chain-notified', needs: { role: 'signatory' }, requires: { reasons: true } },
    { key: 'verify-completion', label: 'Verify completion', from: ['completion-review'], to: 'completed', needs: { role: 'signatory' }, requires: { reasons: true }, effects: ['product.completeRecall'] },
  ],
  tests: [
    { name: 'recall ordered, published, completed', steps: [
      { action: 'assess-risk', fields: { product: 'PRD-1' }, documents: ['recall-notification'], expect: 'risk-assessment' },
      { action: 'propose', documents: ['risk-assessment'], expect: 'pending-approval' }, { action: 'recall', expect: 'ordered' },
      { action: 'publish-notice', fields: { publicNotice: 'Return batch 1.' }, expect: 'notice-published' },
      { action: 'notify-supply-chain', documents: ['supply-chain-notice'], expect: 'supply-chain-notified' },
      { action: 'report-completion', documents: ['completion-report'], expect: 'completion-review' },
      { action: 'verify-completion', expect: 'completed' },
    ] },
    { name: 'closed without a recall', steps: [{ action: 'assess-risk', fields: { product: 'PRD-1' }, documents: ['recall-notification'], expect: 'risk-assessment' }, { action: 'close', expect: 'closed' }] },
  ],
};

// ── Corrective action, import and controlled-medicine authorisation, safety intake, reconsideration (Health I4) ──
//
//   medicines.corrective-action      corrective action plan after a good-practice inspection
//                                    (HLT-MED-012): linked to the inspection case and its findings;
//                                    accepted by the regulator, tracked against the period the nation's
//                                    rules set (a deadline whose day count ships unset), closed by a
//                                    two-official decision
//   medicines.import-authorisation   authorisation to import a consignment (HLT-MED-013): an importer
//                                    holding the medicine-importers standing, an authorised product, a
//                                    quantity and a point of entry from the nation's list (shipped empty);
//                                    customs learns only whether it is valid (product.import-authorisation)
//   medicines.controlled             controlled-medicine authorisation (HLT-MED-014), kept by the
//                                    `controlledSubstances` slot: an organisation, a product and a quantity
//                                    within the limits the nation's law sets (lib/health/products/controlled.ts,
//                                    shipped unset); never a named patient
//   medicines.safety-report          safety report about a medicine (HLT-MED-015) and
//   medicines.device-incident        device safety incident (HLT-MED-020): product-level signals assessed by
//                                    the assigned officer with reasons (never a score; AI never decides);
//                                    the assessment may refer the product to a variation, suspension or recall
//                                    case (engine refer()), or lead to a safety alert decided by two officials
//                                    and published as its own act (HX-005 notifies approved subscribers)
//   medicines.reconsideration        internal reconsideration of a medicines decision (HLT-MED-023), decided by
//                                    officials other than those who made the decision; an appeal to a court is
//                                    filed with the court and recorded here by reference only
//
// No period, fee or outcome is typed; every decision step is classified under a proposed, unapproved
// permit mapping (PROCEDURE_PERMITS below; lib/permits/decisions.ts) and refused in production until the
// nation approves one.

/** The permit type whose approved mapping governs each of these procedures' powers (lib/permits/decisions.ts reads it). */
export const PROCEDURE_PERMITS: Record<string, string> = {
  'medicines.corrective-action': PRODUCT_PERMIT_TYPES.correctiveAction,
  'medicines.import-authorisation': PRODUCT_PERMIT_TYPES.importAuthorisation,
  'medicines.controlled': PRODUCT_PERMIT_TYPES.controlled,
  'medicines.safety-report': PRODUCT_PERMIT_TYPES.safety,
  'medicines.device-incident': PRODUCT_PERMIT_TYPES.safety,
  'medicines.reconsideration': PRODUCT_PERMIT_TYPES.reconsideration,
};
/** The procedures a safety assessment may refer a product to (the regulator's own cases on the product register). */
const FOLLOW_UPS = ['medicines.variation', 'medicines.suspension', 'medicines.recall'];
const quantityOf = (v: unknown): { amount: number; unit: string } | null => {
  const q = v as { amount?: unknown; unit?: unknown } | null;
  return q && typeof q === 'object' && typeof q.amount === 'number' && typeof q.unit === 'string' ? { amount: q.amount, unit: q.unit } : null;
};
const permitOfCase = (c: Case) => PROCEDURE_PERMITS[c.package.key] ?? PRODUCT_PERMIT_TYPES.medicine;

// Corrective action (HLT-MED-012).
registerEffect('corrective.register', ({ case: c }: EffectContext) => {
  const why = mayAct(c, PRODUCT_PERMIT_TYPES.correctiveAction, 'issue');
  if (why) return { error: why };
  const site = str(c.fields.site);
  if (!getOrganisation(site)) return { error: `The inspected site must be an organisation in the register of organisations (${site || 'none given'})` };
  // The inspection the plan answers: a case of the medicines authority's own, with its inspection report.
  const ins = getCase(str(c.fields.inspection));
  if (!ins || !ins.package.key.startsWith('medicines.') || ins.owner !== c.owner) return { error: `No inspection case ${str(c.fields.inspection) || '(none given)'} of the medicines authority` };
  if (!ins.documents.some(id => getDocument(id)?.class === 'inspection-report')) return { error: `${ins.ref} has no inspection report: a corrective action plan answers recorded findings` };
  return { facts: { inspection: ins.ref, site } };
});
registerEffect('corrective.decide', ({ case: c }: EffectContext) => {
  const why = mayAct(c, PRODUCT_PERMIT_TYPES.correctiveAction, 'issue');
  return why ? { error: why } : { facts: { site: str(c.fields.site), inspection: str(c.fields.inspection) } };
});

// Import authorisation (HLT-MED-013).
const importerStanding = (number: string): string | null => {
  const o = getOrganisation(number);
  if (!o) return `The importer must be an organisation in the register of organisations (${number || 'none given'})`;
  return publicOrganisation(o).standings.some(s => s.register === 'medicine-importers' && s.state === 'granted') ? null : `${o.number} holds no granted standing in the register of licensed importers of medicines and medical devices`;
};
registerEffect('imports.check', ({ case: c }: EffectContext) => {
  const why = mayAct(c, PRODUCT_PERMIT_TYPES.importAuthorisation, 'issue') ?? importerStanding(str(c.fields.importer));
  if (why) return { error: why };
  const p = byRef(c.fields.product);
  if (!p || p.state !== 'authorised') return { error: `${str(c.fields.product) || 'The product'} is not an authorised product on the register of medicines and medical devices` };
  if (!quantityOf(c.fields.quantity)) return { error: 'Give the quantity, with its unit' };
  return { facts: { importer: str(c.fields.importer), product: p.number } };
});
registerEffect('imports.authorise', ({ case: c, actor, now }: EffectContext) => {
  const why = mayAct(c, PRODUCT_PERMIT_TYPES.importAuthorisation, 'issue') ?? importerStanding(str(c.fields.importer));
  if (why) return { error: why };
  const q = quantityOf(c.fields.quantity);
  if (!q) return { error: 'Give the quantity, with its unit' };
  // The product must still be authorised when the decision is made (a suspension since registration refuses it).
  const p = byRef(c.fields.product);
  if (!p || p.state !== 'authorised') return { error: `${str(c.fields.product) || 'The product'} is not an authorised product on the register of medicines and medical devices` };
  const r = authoriseImport({ importer: str(c.fields.importer), product: p.number, quantity: q, entryPoint: str(c.fields.entryPoint), ...(str(c.fields.validUntil) ? { validUntil: str(c.fields.validUntil) } : {}), ...(str(c.fields.customsDeclaration) ? { customsDeclaration: str(c.fields.customsDeclaration) } : {}), ...sampleMark(c) }, c.id, actor.name, now);
  if (fail(r)) return r;
  return { facts: { importAuthorisation: r.number, product: r.product, ...(r.validUntil ? { validUntil: r.validUntil } : {}) }, after: (d?: { id: string }) => { if (d) attachImportDecision(c.id, d.id); } };
});

// Controlled-medicine authorisation (HLT-MED-014), kept by the controlled-substances authority.
registerEffect('controlled.check', ({ case: c }: EffectContext) => {
  const why = mayAct(c, PRODUCT_PERMIT_TYPES.controlled, 'issue', 'controlledSubstances');
  if (why) return { error: why };
  if (!getOrganisation(str(c.fields.organisation))) return { error: `The organisation must be in the register of organisations (${str(c.fields.organisation) || 'none given'})` };
  const p = byRef(c.fields.product);
  if (!p || p.state !== 'authorised') return { error: `${str(c.fields.product) || 'The product'} is not an authorised product on the register of medicines and medical devices` };
  if (!quantityOf(c.fields.quantity)) return { error: 'Give the quantity, with its unit' };
  return { facts: { organisation: str(c.fields.organisation), product: p.number } };
});
registerEffect('controlled.authorise', ({ case: c, actor, now }: EffectContext) => {
  const why = mayAct(c, PRODUCT_PERMIT_TYPES.controlled, 'issue', 'controlledSubstances');
  if (why) return { error: why };
  const q = quantityOf(c.fields.quantity);
  if (!q) return { error: 'Give the quantity, with its unit' };
  const p = byRef(c.fields.product);
  if (!p || p.state !== 'authorised') return { error: `${str(c.fields.product) || 'The product'} is not an authorised product on the register of medicines and medical devices` };
  const period = c.fields.period as { from?: string; to?: string } | undefined;
  const r = authoriseControlled({ organisation: str(c.fields.organisation), product: p.number, schedule: str(c.fields.schedule), activity: str(c.fields.activity), quantity: q, ...(period?.from ? { period: { from: period.from, ...(period.to ? { to: period.to } : {}) } } : {}), ...sampleMark(c) }, c.id, actor.name, { required: !samplesAllowed() }, now);
  if (fail(r)) return r;
  return { facts: { controlledAuthorisation: r.number, product: r.product, schedule: r.schedule, limit: 'none' in r.limit ? 'none adopted (demonstration)' : `version ${r.limit.version}` }, after: (d?: { id: string }) => { if (d) attachControlledDecision(c.id, d.id); } };
});

// Safety reports and device incidents (HLT-MED-015, 020): signals for assessment, never findings.
registerEffect('safety.register', ({ case: c }: EffectContext) => {
  const why = mayAct(c, PRODUCT_PERMIT_TYPES.safety, 'issue');
  if (why) return { error: why };
  // A report may name a product not on the register (a suspected falsified one): it is recorded as given.
  const p = byRef(c.fields.product);
  if (str(c.fields.product) && !p) return { error: `No product ${str(c.fields.product)} in the register of medicines and medical devices (leave it empty and describe the product as named on the pack)` };
  return { facts: { ...(p ? { product: p.number } : {}), received: true } };
});
/** Possible duplicates are linked by an official, never merged: each named case must be another report of this institution, and each stays as it is. */
registerEffect('safety.link', ({ case: c }: EffectContext) => {
  const refs = lines(c.fields.linkedReports).flatMap(x => x.split(/[\s,]+/)).filter(Boolean);
  if (!refs.length) return { error: 'Name the reports this one may duplicate (their case references)' };
  for (const r of refs) {
    const o = getCase(r);
    if (!o || o.id === c.id || o.owner !== c.owner || !['medicines.safety-report', 'medicines.device-incident'].includes(o.package.key)) return { error: `${r} is not another safety report or device incident of this authority` };
  }
  return { facts: { linked: refs.length } };
});
registerEffect('safety.assess', ({ case: c }: EffectContext) => {
  const why = mayAct(c, PRODUCT_PERMIT_TYPES.safety, 'issue');
  return why ? { error: why } : { facts: { assessed: true } };
});
/** Refer the product to the regulator's own variation, suspension or recall case: checked here, opened once the step is recorded (engine refer()). */
registerEffect('safety.refer', ({ case: c, actor, now }: EffectContext) => {
  const why = mayAct(c, PRODUCT_PERMIT_TYPES.safety, 'issue');
  if (why) return { error: why };
  const to = str(c.fields.followUp);
  if (!FOLLOW_UPS.includes(to)) return { error: `Choose the case to open: ${FOLLOW_UPS.join(', ')}` };
  const pkg = activePackage(to, now.toISOString().slice(0, 10));
  if (!pkg || ownerInstitution(pkg.owner, authorityFor) !== c.owner) return { error: `No approved version of ${to} of this authority applies today: it is approved before a report is referred to it` };
  const p = byRef(c.fields.product);
  if (!p || ['applied', 'refused'].includes(p.state)) return { error: 'Name the authorised product the report concerns (its register number) before referring it' };
  const reason = c.pending?.reason ?? `Referred from ${c.ref} after assessment`;
  return {
    facts: { product: p.number, referredTo: to },
    after: () => { const r = refer(c.id, { procedure: to, fields: { product: p.number }, reason: `Safety report ${c.ref} assessed: ${reason}`.slice(0, 300) }, actor, now); if ('error' in r) recordAudit(actor.name, 'case.refer', `Case:${c.ref}`, 'error', r.error.slice(0, 200)); },
  };
});
registerEffect('product.alert', ({ case: c, actor, now }: EffectContext) => {
  const p = productOf(c);
  if (fail(p)) return p;
  const why = mayAct(c, PRODUCT_PERMIT_TYPES.safety, 'issue');
  if (why) return { error: why };
  const r = issueSafetyAlert(p.number, { grounds: str(c.fields.grounds), ...sampleMark(c) }, c.id, actor.name, now);
  return fail(r) ? r : { facts: { product: r.number, safetyAlert: true }, after: attach(r, c) };
});
registerEffect('notice.supplyChain', ({ case: c, actor }: EffectContext) => { noteSupplyChainNotice(c.id, actor.name); return {}; });

// Reconsideration (HLT-MED-023): never by an official who made the decision reconsidered.
/** The sealed decision a reconsideration names: by its number, or the latest decision of the case named. */
function reconsidered(c: Case): { decision: SignedDecision; original: Case } | { error: string } {
  const ref = str(c.fields.decision);
  const byId = ref ? getDecision(ref) : undefined;
  const original = byId ? getCase(byId.content.subject.id) : getCase(ref);
  const decision = byId ?? (original?.decisions.length ? getDecision(original.decisions.at(-1)!) : undefined);
  if (!decision || !original) return { error: `No decision ${ref || '(none given)'}: give the decision's number or the reference of the case that made it` };
  if (!original.package.key.startsWith('medicines.') || original.package.key === 'medicines.reconsideration') return { error: `${original.ref} is not a decision of the medicines procedures` };
  if (original.owner !== c.owner) return { error: `${original.ref} was decided by another institution: it is reconsidered there` };
  return { decision, original };
}
/** Whether an official is one of those who made (or confirmed) the decision, by the same rule as dual control (persons, never names alone). */
const madeIt = (d: SignedDecision, who: { name: string; id?: string }): string | null => {
  for (const o of d.content.officials) if (dualControlRefusal({ by: o.name, ...(o.id ? { byId: o.id } : {}) }, { by: who.name, ...(who.id ? { byId: who.id } : {}) })) return `${who.name} ${o.role} the decision reconsidered: a different official reconsiders it`;
  return null;
};
registerEffect('reconsider.register', ({ case: c, now }: EffectContext) => {
  const why = mayAct(c, PRODUCT_PERMIT_TYPES.reconsideration, 'issue');
  if (why) return { error: why };
  const r = reconsidered(c);
  if ('error' in r) return r;
  // The period the nation's law gives, where its version of the original procedure sets one (the engine's appeal deadline); none ships.
  const due = r.original.deadlines.find(d => d.key === 'appeal')?.due;
  if (due && now.toISOString().slice(0, 10) > due.slice(0, 10)) return { error: `The period to ask for reconsideration of ${r.original.ref} ended on ${due.slice(0, 10)}` };
  return { facts: { reconsiders: r.decision.id, originalCase: r.original.ref, requestPeriod: due ? `until ${due.slice(0, 10)}` : 'not set in the nation\'s version of the procedure' } };
});
registerEffect('reconsider.review', ({ case: c, actor }: EffectContext) => {
  const r = reconsidered(c);
  if ('error' in r) return r;
  const who = madeIt(r.decision, { name: actor.name, ...(actor.id ? { id: actor.id } : {}) }) ?? (c.assignee ? madeIt(r.decision, c.assignee) : null);
  return who ? { error: who } : { facts: { reviewed: true } };
});
registerEffect('reconsider.decide', ({ case: c, actor }: EffectContext) => {
  const why = mayAct(c, PRODUCT_PERMIT_TYPES.reconsideration, 'issue');
  if (why) return { error: why };
  const r = reconsidered(c);
  if ('error' in r) return r;
  // Both officials of the two-official decision: the one who proposed it and the one confirming.
  for (const who of [c.pending?.by, { name: actor.name, ...(actor.id ? { id: actor.id } : {}) }]) {
    if (!who) continue;
    const same = madeIt(r.decision, who);
    if (same) return { error: same };
  }
  return { facts: { reconsiders: r.decision.id, originalCase: r.original.ref, ...(str(c.fields.courtReference) ? { courtReference: str(c.fields.courtReference) } : {}) } };
});

const REPORT_DOCS = [{ class: 'report', label: 'The report as received (form, letter or message)', required: true }, { class: 'evidence', label: 'Photographs, samples kept or other evidence', required: false, multiple: true }, { class: 'assessment-report', label: 'Assessment of the signal, with reasons', required: true }];
const configuredList = (key: string, label: string, list: string, what: string, cls: 'public' | 'administrative' | 'restricted' = 'administrative'): FieldSpec => ({ key, label, type: 'enum', valuesSource: { kind: 'configured', list }, personalDataClass: cls, countryDecision: `The nation's ${what}; none ship` });
const PRODUCT_REF = (label: string, active: boolean): FieldSpec => ({ key: 'product', label, type: 'registryReference', register: 'product', rules: [{ rule: 'existingRecord', ...(active ? { active: true } : {}) }], personalDataClass: 'public' });
const ORG_REF = (key: string, label: string): FieldSpec => ({ key, label, type: 'registryReference', register: 'organisation', rules: [{ rule: 'existingRecord' }], personalDataClass: 'public' });
const QUANTITY: FieldSpec = { key: 'quantity', label: 'Quantity (amount and unit)', type: 'quantity', personalDataClass: 'administrative' };

export const REFERENCE_CORRECTIVE_ACTION: Ref = {
  ...base, key: 'medicines.corrective-action', version: 1, title: 'Corrective action plan after a good-practice inspection', refPrefix: 'CAP',
  authority: { permitType: PRODUCT_PERMIT_TYPES.correctiveAction },
  fields: [
    ORG_REF('site', 'Inspected site (organisation register number)'),
    text('inspection', 'Inspection case (its reference: the inspection whose findings this plan answers)', 'administrative'),
    text('findings', 'Findings the plan answers (as the inspection report records them; restricted)', 'restricted', true),
    text('planNote', 'Regulator\'s note on the plan and its dates (restricted)', 'restricted', true),
  ],
  documents: [
    { class: 'corrective-action-plan', label: 'The corrective action plan (each finding: cause, corrective and preventive action, responsible role, date)', required: true, multiple: true },
    { class: 'progress-report', label: 'Progress report', required: false, multiple: true },
    { class: 'completion-evidence', label: 'Evidence the actions are completed', required: true, multiple: true },
  ],
  stages: [
    { key: 'submitted', label: 'Submitted' }, { key: 'review', label: 'Plan under review' }, { key: 'revision-requested', label: 'Revision requested' },
    { key: 'tracking', label: 'Plan accepted: actions tracked' }, { key: 'closure-review', label: 'Completion reported' },
    { key: 'closed', label: 'Closed: actions verified', terminal: true }, { key: 'not-completed', label: 'Not completed: referred for enforcement', terminal: true },
  ],
  actions: [
    { key: 'register', label: 'Register the plan against its inspection', from: ['submitted'], to: 'review', needs: { role: 'officer' }, requires: { fields: ['site', 'inspection'], documents: ['corrective-action-plan'] }, effects: ['corrective.register'] },
    { key: 'request-revision', label: 'Ask for a revised plan', from: ['review'], to: 'revision-requested', needs: { role: 'officer' }, requires: { reasons: true } },
    { key: 'record-revision', label: 'Record the revised plan', from: ['revision-requested'], to: 'review', needs: { role: 'officer' }, requires: { documents: ['corrective-action-plan'] } },
    // Accepting the plan starts the period the nation's rules set for the deficiencies found (the deadline below, unset until the nation sets it).
    { key: 'accept-plan', label: 'Accept the plan and set it running', from: ['review'], to: 'tracking', decision: 'accept-plan', needs: { role: 'signatory' }, requires: { reasons: true }, effects: ['corrective.decide'] },
    { key: 'record-progress', label: 'Record a progress report', from: ['tracking'], to: 'tracking', needs: { role: 'officer' }, requires: { documents: ['progress-report'] } },
    { key: 'report-completion', label: 'Record that the actions are completed', from: ['tracking'], to: 'closure-review', needs: { role: 'officer' }, requires: { documents: ['completion-evidence'] } },
    { key: 'return', label: 'Return: completion not shown', from: ['closure-review'], to: 'tracking', needs: { role: 'signatory' }, requires: { reasons: true } },
    { key: 'close', label: 'Verify and close', from: ['closure-review'], to: 'closed', decision: 'close-corrective-action', needs: { role: 'signatory', fourEyes: true }, requires: { reasons: true }, effects: ['corrective.decide'] },
    { key: 'refer-enforcement', label: 'Not completed: refer for enforcement (the licence\'s own procedure)', from: ['tracking', 'closure-review'], to: 'not-completed', needs: { role: 'signatory' }, requires: { reasons: true } },
  ],
  deadlines: [{ key: 'corrective-actions', label: 'Corrective actions completed within the period the nation\'s rules set for the deficiencies found', from: 'tracking', calendar: 'calendar', onLapse: 'escalate' }],
  tests: [
    { name: 'plan revised, accepted, completed and closed', steps: [
      { action: 'register', expect: 'refused' },
      { action: 'register', fields: { site: 'ORG-1', inspection: 'MML-1' }, documents: ['corrective-action-plan'], expect: 'review' },
      { action: 'request-revision', expect: 'revision-requested' }, { action: 'record-revision', expect: 'review' },
      { action: 'accept-plan', expect: 'tracking' }, { action: 'record-progress', documents: ['progress-report'], expect: 'tracking' },
      { action: 'report-completion', documents: ['completion-evidence'], expect: 'closure-review' }, { action: 'return', expect: 'tracking' },
      { action: 'report-completion', expect: 'closure-review' }, { action: 'close', expect: 'closed' },
    ] },
    { name: 'not completed', steps: [
      { action: 'register', fields: { site: 'ORG-1', inspection: 'MML-1' }, documents: ['corrective-action-plan'], expect: 'review' },
      { action: 'accept-plan', expect: 'tracking' }, { action: 'refer-enforcement', expect: 'not-completed' },
    ] },
  ],
};

const AUTHORISATION_DOCS = (extra: CasePackage['documents']): CasePackage['documents'] => [
  { class: 'application-form', label: 'The application', required: true }, ...extra,
  { class: 'assessment-report', label: 'Assessment, with reasons', required: true },
];
const authorisationSteps = (effectCheck: string, effectDecide: string, fields: string[], decideFields: string[]): CasePackage['actions'] => [
  { key: 'register', label: 'Register the application', from: ['submitted'], to: 'assessment', needs: { role: 'officer' }, requires: { fields, documents: ['application-form'] }, effects: [effectCheck] },
  { key: 'propose', label: 'Assessed: propose a decision', from: ['assessment'], to: 'pending-approval', needs: { role: 'officer' }, requires: { documents: ['assessment-report'], reasons: true } },
  { key: 'reassess', label: 'Return to assessment', from: ['pending-approval'], to: 'assessment', needs: { role: 'signatory' }, requires: { reasons: true } },
  { key: 'authorise', label: 'Authorise', from: ['pending-approval'], to: 'authorised', decision: 'authorise', needs: { role: 'signatory', fourEyes: true }, requires: { reasons: true, fields: decideFields }, effects: [effectDecide] },
  { key: 'refuse', label: 'Refuse, with reasons', from: ['pending-approval'], to: 'not-granted', decision: 'refuse', needs: { role: 'signatory', fourEyes: true }, requires: { reasons: true } },
];
const AUTHORISATION_STAGES = [
  { key: 'submitted', label: 'Submitted' }, { key: 'assessment', label: 'Assessment' }, { key: 'pending-approval', label: 'Decision' },
  { key: 'authorised', label: 'Authorised', terminal: true }, { key: 'not-granted', label: 'Refused', terminal: true },
];
const authorisationTests = (fields: Record<string, unknown>, decideFields: Record<string, unknown>): Ref['tests'] => [
  { name: 'authorised', steps: [
    { action: 'register', expect: 'refused' },
    { action: 'register', fields, documents: ['application-form'], expect: 'assessment' },
    { action: 'propose', documents: ['assessment-report'], expect: 'pending-approval' }, { action: 'reassess', expect: 'assessment' },
    { action: 'propose', expect: 'pending-approval' }, { action: 'authorise', fields: decideFields, expect: 'authorised' },
  ] },
  { name: 'refused', steps: [
    { action: 'register', fields, documents: ['application-form'], expect: 'assessment' },
    { action: 'propose', documents: ['assessment-report'], expect: 'pending-approval' }, { action: 'refuse', expect: 'not-granted' },
  ] },
];

export const REFERENCE_IMPORT_AUTHORISATION: Ref = {
  ...base, key: 'medicines.import-authorisation', version: 1, title: 'Authorisation to import medicines or medical devices', refPrefix: 'IMA',
  authority: { permitType: PRODUCT_PERMIT_TYPES.importAuthorisation },
  fields: [
    ORG_REF('importer', 'Importer (organisation register number; it holds the licence of importers of medicines and medical devices)'),
    PRODUCT_REF('Authorised product (register or authorisation number)', true),
    QUANTITY,
    configuredList('entryPoint', 'Point of entry', 'medicines.country.entry_points', 'points of entry for medicines and medical devices'),
    text('supplier', 'Supplier abroad (commercially confidential)', 'commercial'),
    { key: 'arrival', label: 'Expected arrival', type: 'date', personalDataClass: 'administrative' },
    text('customsDeclaration', 'Customs declaration (its reference only: customs keeps the declaration)', 'administrative'),
    { key: 'validUntil', label: 'Valid until (as the decision states it under the nation\'s law)', type: 'date', personalDataClass: 'administrative' },
  ],
  documents: AUTHORISATION_DOCS([{ class: 'supplier-documents', label: 'Supplier and shipment documents (commercially confidential)', required: false, multiple: true }]),
  stages: AUTHORISATION_STAGES,
  actions: authorisationSteps('imports.check', 'imports.authorise', ['importer', 'product', 'quantity'], ['entryPoint']),
  tests: authorisationTests({ importer: 'ORG-1', product: 'PRD-1', quantity: { amount: 1, unit: 'packs' } }, { entryPoint: 'entry-1' }),
};

export const REFERENCE_CONTROLLED: Ref = {
  ...base, owner: 'controlledSubstances', key: 'medicines.controlled', version: 1, title: 'Controlled medicine authorisation', refPrefix: 'CMP',
  authority: { permitType: PRODUCT_PERMIT_TYPES.controlled },
  fields: [
    ORG_REF('organisation', 'Organisation (register number): an organisation, never a named person'),
    PRODUCT_REF('Authorised product (register or authorisation number)', true),
    configuredList('activity', 'Activity authorised', 'medicines.country.controlled_activities', 'controlled activities under its controlled-substances law'),
    configuredList('schedule', 'Schedule', 'medicines.country.controlled_schedules', 'controlled-substance schedules (expected source: the Single Convention and the Convention on Psychotropic Substances as national law adopts them)'),
    QUANTITY,
    { key: 'period', label: 'Period (as the decision states it)', type: 'dateRange', personalDataClass: 'administrative' },
    text('premises', 'Licensed premises (organisation or site reference)', 'administrative'),
  ],
  documents: AUTHORISATION_DOCS([{ class: 'security-arrangements', label: 'Storage and security arrangements (restricted)', required: true }]),
  stages: AUTHORISATION_STAGES,
  actions: authorisationSteps('controlled.check', 'controlled.authorise', ['organisation', 'product', 'quantity'], ['schedule', 'activity']).map(a => a.key === 'register' ? { ...a, requires: { ...a.requires, documents: ['application-form', 'security-arrangements'] } } : a),
  tests: authorisationTests({ organisation: 'ORG-1', product: 'PRD-1', quantity: { amount: 1, unit: 'g' } }, { schedule: 's-1', activity: 'a-1' }).map(t => ({ ...t, steps: t.steps.map(s => s.action === 'register' && s.fields ? { ...s, documents: ['application-form', 'security-arrangements'] } : s) })),
};

/** A safety report about a medicine or a device incident: product-level only (no person but an optional, restricted reporter). */
function safetyIntake(o: { key: string; title: string; refPrefix: string; device: boolean }): Ref {
  const what = o.device ? 'device' : 'medicine';
  const HINT = 'Describe what is wrong with the product. Do not give anyone\'s name, identity or medical details.';
  return {
    ...base, key: o.key, version: 1, title: o.title, refPrefix: o.refPrefix,
    authority: { permitType: PRODUCT_PERMIT_TYPES.safety },
    fields: [
      text('productNamed', o.device ? 'The device as named on its label' : 'The medicine as named on the pack', 'administrative'),
      { ...PRODUCT_REF(`The ${what} on the register, where it is (register or authorisation number)`, false), personalDataClass: 'administrative' },
      text('batch', o.device ? 'Model, serial or lot number' : 'Batch or lot number', 'administrative'),
      { key: 'expiry', label: 'Expiry date on the pack or label', type: 'date', personalDataClass: 'administrative' },
      text('manufacturer', 'Manufacturer as on the pack or label', 'administrative'),
      configuredList('category', 'Kind of problem', o.device ? 'medicines.country.device_incident_kinds' : 'medicines.country.safety_concern_kinds', o.device ? 'device incident kinds' : 'safety concern kinds', 'restricted'),
      { ...text('concern', 'What is wrong with the product (restricted)', 'restricted', true), hint: HINT },
      configuredList('reporterKind', 'Who reports', 'medicines.country.reporter_kinds', 'reporter kinds'),
      ORG_REF('reporterOrganisation', 'Reporting organisation, where one reports (register number)'),
      { key: 'reporterAnonymous', label: 'The reporter asked not to be identified', type: 'boolean', personalDataClass: 'restricted' },
      text('reporterName', 'Reporter\'s name (restricted: read only by the assigned officials, every read logged)', 'restricted'),
      { key: 'reporterContact', label: 'How to reach the reporter (restricted)', type: 'contact', personalDataClass: 'restricted' },
      text('linkedReports', 'Possible duplicates (case references): linked by an official, never merged', 'restricted', true),
      { key: 'followUp', label: 'Case to open for the product (the regulator\'s own procedure)', type: 'choice', options: FOLLOW_UPS, personalDataClass: 'administrative' },
      GROUNDS, NOTICE,
    ],
    documents: REPORT_DOCS,
    stages: [
      { key: 'received', label: 'Received' }, { key: 'assessment', label: 'Assessment' }, { key: 'assessed', label: 'Assessed' },
      { key: 'pending-approval', label: 'Safety alert: decision' }, { key: 'alert-decided', label: 'Safety alert decided' },
      { key: 'alert-published', label: 'Safety alert published', terminal: true }, { key: 'referred', label: 'Referred to a case on the product', terminal: true },
      { key: 'closed', label: 'Closed: no action on the product', terminal: true },
    ],
    actions: [
      { key: 'register', label: 'Register the report and assign it for assessment', from: ['received'], to: 'assessment', needs: { role: 'officer' }, requires: { fields: ['productNamed', 'concern'], documents: ['report'] }, effects: ['safety.register'] },
      { key: 'link-report', label: 'Link a possible duplicate (both reports kept)', from: ['assessment'], to: 'assessment', needs: { role: 'officer' }, requires: { fields: ['linkedReports'], reasons: true }, effects: ['safety.link'] },
      // The assigned officer assesses the signal with reasons: a prompt for officials, never a finding by itself and never a score.
      { key: 'assess', label: 'Record the assessment, with reasons', from: ['assessment'], to: 'assessed', needs: { role: 'officer', assigned: true }, requires: { documents: ['assessment-report'], reasons: true }, effects: ['safety.assess'] },
      { key: 'reassess', label: 'Return to assessment', from: ['assessed', 'pending-approval'], to: 'assessment', needs: { role: 'signatory' }, requires: { reasons: true } },
      { key: 'refer', label: 'Open a case on the product (variation, suspension or recall)', from: ['assessed'], to: 'referred', needs: { role: 'signatory' }, requires: { fields: ['product', 'followUp'], reasons: true }, effects: ['safety.refer'] },
      { key: 'propose-alert', label: 'Propose a safety alert', from: ['assessed'], to: 'pending-approval', needs: { role: 'officer' }, requires: { fields: ['product', 'grounds'], reasons: true } },
      { key: 'issue-alert', label: 'Decide the safety alert', from: ['pending-approval'], to: 'alert-decided', decision: 'safety-alert', needs: { role: 'signatory', fourEyes: true }, requires: { reasons: true }, effects: ['product.alert'] },
      { key: 'publish-alert', label: 'Publish the safety alert', from: ['alert-decided'], to: 'alert-published', needs: { role: 'officer' }, requires: { fields: ['publicNotice'] }, effects: ['product.publishNotice'] },
      { key: 'close', label: 'Close: no action on the product', from: ['assessment', 'assessed'], to: 'closed', needs: { role: 'signatory' }, requires: { reasons: true } },
    ],
    tests: [
      { name: 'assessed and closed', steps: [
        { action: 'register', expect: 'refused' },
        { action: 'register', fields: { productNamed: 'A', concern: 'Broken seal' }, documents: ['report'], expect: 'assessment' },
        { action: 'assess', documents: ['assessment-report'], expect: 'assessed' }, { action: 'close', expect: 'closed' },
      ] },
      { name: 'referred to a recall', steps: [
        { action: 'register', fields: { productNamed: 'A', concern: 'Broken seal' }, documents: ['report'], expect: 'assessment' },
        { action: 'assess', documents: ['assessment-report'], expect: 'assessed' },
        { action: 'refer', fields: { product: 'PRD-1', followUp: 'medicines.recall' }, expect: 'referred' },
      ] },
      { name: 'safety alert decided and published', steps: [
        { action: 'register', fields: { productNamed: 'A', concern: 'Broken seal' }, documents: ['report'], expect: 'assessment' },
        { action: 'assess', documents: ['assessment-report'], expect: 'assessed' },
        { action: 'propose-alert', fields: { product: 'PRD-1', grounds: 'G' }, expect: 'pending-approval' },
        { action: 'issue-alert', expect: 'alert-decided' }, { action: 'publish-alert', fields: { publicNotice: 'Check the seal.' }, expect: 'alert-published' },
      ] },
    ],
  };
}
export const REFERENCE_SAFETY_REPORT = safetyIntake({ key: 'medicines.safety-report', title: 'Safety report about a medicine', refPrefix: 'MSR', device: false });
export const REFERENCE_DEVICE_INCIDENT = safetyIntake({ key: 'medicines.device-incident', title: 'Medical device safety incident', refPrefix: 'MDI', device: true });

export const REFERENCE_RECONSIDERATION: Ref = {
  ...base, key: 'medicines.reconsideration', version: 1, title: 'Reconsideration of a medicines regulatory decision', refPrefix: 'MRC',
  authority: { permitType: PRODUCT_PERMIT_TYPES.reconsideration },
  fields: [
    text('decision', 'The decision to reconsider (its decision number, or the reference of the case that made it)', 'administrative'),
    ORG_REF('applicant', 'Who asks (organisation register number)'),
    { key: 'notifiedOn', label: 'When the decision was notified', type: 'date', personalDataClass: 'administrative' },
    text('grounds', 'Grounds for reconsideration (restricted)', 'restricted', true),
    text('remedy', 'What is asked for', 'administrative', true),
    { key: 'newInformation', label: 'New information is given', type: 'boolean', personalDataClass: 'administrative' },
    { key: 'holdRequested', label: 'A hold on the decision is asked for (as the nation\'s law allows)', type: 'boolean', personalDataClass: 'administrative' },
    { key: 'hearingRequested', label: 'A hearing is asked for', type: 'boolean', personalDataClass: 'administrative' },
    text('courtReference', 'Court case reference, where the matter is also before a court (filed with the court and worked only by the judiciary; recorded here by reference)', 'administrative'),
    text('reviewNote', 'Reviewer\'s note (restricted)', 'restricted', true),
  ],
  documents: [
    { class: 'request-form', label: 'The request for reconsideration', required: true },
    { class: 'new-information', label: 'New information given', required: false, multiple: true },
    { class: 'review-report', label: 'Review, with reasons', required: true },
  ],
  stages: [
    { key: 'received', label: 'Received' }, { key: 'review', label: 'Under review' }, { key: 'pending-approval', label: 'Decision' },
    { key: 'upheld', label: 'Decision upheld', terminal: true }, { key: 'set-aside', label: 'Decision set aside: the original procedure decides again', terminal: true },
    { key: 'withdrawn', label: 'Withdrawn', terminal: true },
  ],
  actions: [
    { key: 'register', label: 'Register the request', from: ['received'], to: 'review', needs: { role: 'officer' }, requires: { fields: ['decision', 'applicant'], documents: ['request-form'] }, effects: ['reconsider.register'] },
    // The assigned reviewer, who neither made nor confirmed the decision reconsidered (checked by person, as dual control does).
    { key: 'propose', label: 'Reviewed: propose a decision', from: ['review'], to: 'pending-approval', needs: { role: 'officer', assigned: true }, requires: { documents: ['review-report'], reasons: true }, effects: ['reconsider.review'] },
    { key: 'return', label: 'Return to review', from: ['pending-approval'], to: 'review', needs: { role: 'signatory' }, requires: { reasons: true } },
    { key: 'uphold', label: 'Uphold the decision', from: ['pending-approval'], to: 'upheld', decision: 'uphold', needs: { role: 'signatory', fourEyes: true }, requires: { reasons: true }, effects: ['reconsider.decide'] },
    { key: 'set-aside', label: 'Set the decision aside', from: ['pending-approval'], to: 'set-aside', decision: 'set-aside', needs: { role: 'signatory', fourEyes: true }, requires: { reasons: true }, effects: ['reconsider.decide'] },
    { key: 'withdraw', label: 'Record the request\'s withdrawal', from: ['received', 'review'], to: 'withdrawn', needs: { role: 'officer' }, requires: { reasons: true } },
  ],
  tests: [
    { name: 'upheld', steps: [
      { action: 'register', expect: 'refused' },
      { action: 'register', fields: { decision: 'MAA-1', applicant: 'ORG-1' }, documents: ['request-form'], expect: 'review' },
      { action: 'propose', documents: ['review-report'], expect: 'pending-approval' }, { action: 'uphold', expect: 'upheld' },
    ] },
    { name: 'set aside after a return', steps: [
      { action: 'register', fields: { decision: 'MAA-1', applicant: 'ORG-1' }, documents: ['request-form'], expect: 'review' },
      { action: 'propose', documents: ['review-report'], expect: 'pending-approval' }, { action: 'return', expect: 'review' },
      { action: 'propose', expect: 'pending-approval' }, { action: 'set-aside', expect: 'set-aside' },
    ] },
    { name: 'withdrawn', steps: [{ action: 'register', fields: { decision: 'MAA-1', applicant: 'ORG-1' }, documents: ['request-form'], expect: 'review' }, { action: 'withdraw', expect: 'withdrawn' }] },
  ],
};

/** The six procedures of Health I4's second step (batch-2 forms HLT-MED-012, 013, 014, 015, 020, 023). */
export const OVERSIGHT_PROCEDURES: Ref[] = [
  REFERENCE_CORRECTIVE_ACTION, REFERENCE_IMPORT_AUTHORISATION, REFERENCE_CONTROLLED, REFERENCE_SAFETY_REPORT, REFERENCE_DEVICE_INCIDENT, REFERENCE_RECONSIDERATION,
];

/** The licences of the organisations the medicines authority keeps registers of (register types in lib/organisations/register.ts). */
export const ORGANISATION_LICENCES: Ref[] = [
  ...sectorProcedures({ prefix: 'medicines.manufacturer', owner: 'medicinesRegulation', register: 'medicine-manufacturers', word: 'medicines manufacturing licence', refPrefix: 'MML', linkSites: true }),
  ...sectorProcedures({ prefix: 'medicines.importer', owner: 'medicinesRegulation', register: 'medicine-importers', word: 'medicines import licence', refPrefix: 'MIL' }),
  ...sectorProcedures({ prefix: 'medicines.wholesaler', owner: 'medicinesRegulation', register: 'medicine-wholesalers', word: 'medicines wholesale licence', refPrefix: 'MWL', linkSites: true }),
].map(p => ({ ...p, deadlines: p.deadlines.map(({ sampleDays: _s, ...d }) => d), ...(p.appeal ? { appeal: (({ sampleDays: _a, ...a }) => a)(p.appeal) } : {}) }));

export const PRODUCT_PROCEDURES: Ref[] = [
  REFERENCE_MARKETING_AUTHORISATION, REFERENCE_VARIATION, REFERENCE_RENEWAL, REFERENCE_SUSPENSION, REFERENCE_RECALL, REFERENCE_DEVICE_REGISTRATION, ...OVERSIGHT_PROCEDURES, ...ORGANISATION_LICENCES,
];

export function installProductProcedures(by: string): { drafted: string[]; present: string[] } {
  const drafted: string[] = [], present: string[] = [];
  for (const p of PRODUCT_PROCEDURES) {
    if (listPackages({ key: p.key }).length) { present.push(p.key); continue; }
    const r = draftPackage(p, by, undefined, registeredEffects());
    if (!('error' in r)) drafted.push(p.key);
  }
  return { drafted, present };
}
