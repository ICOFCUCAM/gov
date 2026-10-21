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
// `controlledSubstances` slot (permit type controlled-medicine-authorisation);
// no procedure for them ships. AI never decides here: a safety signal is
// assessed by officials and a recall is ordered only by a sealed decision.

import { registerEffect, registeredEffects, sampleMark, type EffectContext } from '@/lib/casework/engine';
import { draftPackage, listPackages, ownerInstitution } from '@/lib/casework/packages';
import { sectorProcedures } from '@/lib/organisations/procedures';
import { authorityFor } from '@/lib/data/store';
import { getDocument } from '@/lib/records/documents';
import { powerRefusal, mappingInForce, type Power } from '@/lib/permits/authority';
import { samplesAllowed } from '@/lib/ops/mode';
import type { Case, CasePackage, FieldSpec } from '@/lib/casework/types';
import {
  applyForProduct, recordDossier, recordAssessment, decideProduct, varyProduct, renewProduct, changeProductState, orderRecall, publishProductNotice,
  completeRecall, attachProductDecision, getProduct, productOfCase, APPLICATION_KEYS, type ProductEntry, type ApplicationKey,
} from './register';

type Ref = Omit<CasePackage, 'state' | 'createdAt' | 'author' | 'authorId' | 'approvedBy' | 'approvedAt'>;
const str = (v: unknown) => (typeof v === 'string' ? v.trim() : '');
const lines = (v: unknown) => str(v).split(/[;\n]/).map(x => x.trim()).filter(Boolean).slice(0, 30);

/** The permit type whose approved mapping governs a power over a product (lib/permits/decisions.ts reads the same). */
export const PRODUCT_PERMIT_TYPES = { medicine: 'medicine-marketing-authorisation', device: 'medical-device-registration', recall: 'product-recall' } as const;

/** May this case's institution use this power? The approved mapping decides; without one (demo and training only) the medicines authority named in the deployment profile. */
function mayAct(c: Case, permitType: string, power: Power): string | null {
  const resolve = (a: string) => ownerInstitution(a, authorityFor);
  const why = powerRefusal(permitType, power, c.owner, resolve, { required: !samplesAllowed() });
  if (why) return why;
  if (mappingInForce(permitType)) return null;
  return resolve('medicinesRegulation') === c.owner ? null : 'The register of medicines and medical devices is kept by the medicines authority named under Who is responsible';
}
const permitOf = (p: Pick<ProductEntry, 'kind'>) => PRODUCT_PERMIT_TYPES[p.kind];

/** The product a case is about: the one it registered, else the register number in its product field. */
function productOf(c: Case): ProductEntry | { error: string } {
  const p = productOfCase(c.id) ?? (str(c.fields.product) ? getProduct(str(c.fields.product)) : undefined);
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
  const r = orderRecall(p.number, { grounds: str(c.fields.grounds), ...sampleMark(c) }, c.id, actor.name, now);
  return fail(r) ? r : { facts: { product: r.number, recall: true }, after: attach(r, c) };
});

registerEffect('product.publishNotice', ({ case: c, actor, now }: EffectContext) => {
  const p = productOf(c);
  if (fail(p)) return p;
  const r = publishProductNotice(p.number, c.id, str(c.fields.publicNotice), actor.name, now);
  return fail(r) ? r : { facts: { product: r.number, noticePublished: true } };
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
  fields: [PRODUCT, GROUNDS, NOTICE, text('completionSummary', 'Completion and reconciliation summary (restricted)', 'restricted', true)],
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
    { key: 'notify-supply-chain', label: 'Record the supply-chain notification', from: ['notice-published'], to: 'supply-chain-notified', needs: { role: 'officer' }, requires: { documents: ['supply-chain-notice'], reasons: true } },
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

/** The licences of the organisations the medicines authority keeps registers of (register types in lib/organisations/register.ts). */
export const ORGANISATION_LICENCES: Ref[] = [
  ...sectorProcedures({ prefix: 'medicines.manufacturer', owner: 'medicinesRegulation', register: 'medicine-manufacturers', word: 'medicines manufacturing licence', refPrefix: 'MML', linkSites: true }),
  ...sectorProcedures({ prefix: 'medicines.importer', owner: 'medicinesRegulation', register: 'medicine-importers', word: 'medicines import licence', refPrefix: 'MIL' }),
  ...sectorProcedures({ prefix: 'medicines.wholesaler', owner: 'medicinesRegulation', register: 'medicine-wholesalers', word: 'medicines wholesale licence', refPrefix: 'MWL', linkSites: true }),
].map(p => ({ ...p, deadlines: p.deadlines.map(({ sampleDays: _s, ...d }) => d), ...(p.appeal ? { appeal: (({ sampleDays: _a, ...a }) => a)(p.appeal) } : {}) }));

export const PRODUCT_PROCEDURES: Ref[] = [
  REFERENCE_MARKETING_AUTHORISATION, REFERENCE_VARIATION, REFERENCE_RENEWAL, REFERENCE_SUSPENSION, REFERENCE_RECALL, REFERENCE_DEVICE_REGISTRATION, ...ORGANISATION_LICENCES,
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
