// The land registry's procedures (plan step I7; Institutional specification
// Part 3 §C.7 "Workflow: transfer of registered interest"; catalogue Part 8
// §3.1–3.3). Reference drafts the nation adapts and a second official
// approves; none is approved, none names a body: each belongs to the
// `landRegistry` slot of the deployment profile, empty until the nation names
// its land registry under Who is responsible.
//
//   land.transfer     transfer of a registered interest, or its registration on succession (LND-REG-007, LND-REG-012)
//   land.encumbrance  a lease, mortgage, easement, caveat or restriction registered on a parcel (LND-REG-008, 009, 011, 020)
//   land.discharge    a mortgage, easement, lease, caveat or restriction discharged (LND-REG-010, LND-REG-021)
//   land.correction   a controlled correction of a registered interest (LND-REG-016)
//   land.dispute      a boundary dispute, an objection or a conflicting title (LND-REG-005, LND-REG-017, LND-REG-022)
//
// What they share (§3.3 "Land registration safeguards"):
//   - The application or initiating event, the instrument and the evidence of
//     the parties' identity and authority are attached and verified by an
//     official before anything else (steps `lodge`, `verify`).
//   - The parcel must be a published parcel of the register (the spatial unit
//     the cadastre authority keeps, lib/data/parcels.ts); the interest is
//     named by its reference (PCL-000001/R1), never by its holder.
//   - Before the decision the registry checks objections, restrictions and
//     competing claims: an interest a dispute holds is never changed; a
//     caveat registered on the parcel stops a transfer until its holder's
//     consent is attached or it is discharged (effect `land.check`, run
//     again when the decision is made).
//   - The decision is the competent authority's (a signatory, confirmed by a
//     different official: four eyes), under a proposed, unapproved authority
//     mapping (lib/permits/decisions.ts, LAND_PERMITS): refused in production
//     until the nation approves its own. It records the date the registration
//     takes effect; the parcel gets a new version with the case and decision
//     that authorised it, the earlier state kept (applyRightsChange()).
//   - A dispute holds the interest from the moment it is registered and is
//     never resolved on its own: only a decision, a recorded court order or a
//     withdrawal, each by officials with reasons, releases it. A dispute
//     decision never edits the parcel: a change it calls for is its own
//     transfer or correction case.
//   - No day count, fee or transaction type the law decides ships set.

import { registerEffect, registerDecisionGuard, registeredEffects, type EffectContext } from '@/lib/casework/engine';
import { draftPackage, listPackages } from '@/lib/casework/packages';
import { authorityFor, getMinistry } from '@/lib/data/store';
import { getDocument } from '@/lib/records/documents';
import {
  getParcel, applyRightsChange, freezeInterest, releaseInterest, HOLDER_KINDS, SOURCE_KINDS, RIGHT_TYPES, ADDABLE, type RightsChange, type Parcel,
} from '@/lib/data/parcels';
import { recordTransaction, openDispute, referDispute, decideDispute, disputeOfCase, DISPUTE_KINDS, DISPUTE_OUTCOMES, type LandParty, type LandTransaction, type TransactionKind } from './register';
import type { Case, CasePackage, FieldSpec } from '@/lib/casework/types';

type Ref = Omit<CasePackage, 'state' | 'createdAt' | 'author' | 'authorId' | 'approvedBy' | 'approvedAt'>;
const str = (v: unknown) => (typeof v === 'string' ? v.trim() : '');
const today = (now: Date) => now.toISOString().slice(0, 10);

/** The permit type whose approved mapping governs each family's decisions (lib/permits/decisions.ts reads it; the longest prefix first). */
export const LAND_PERMITS: Record<string, string> = {
  'land.dispute': 'land-dispute-decision',
  'land.': 'land-dealing-registration',
};

/** The parties as officials record them: one per line, `name | holder kind | reference | share` (personal data, never in an audit entry). */
function partiesOf(v: unknown): LandParty[] | { error: string } {
  const out: LandParty[] = [];
  for (const [i, l] of str(v).split('\n').map(x => x.trim()).filter(Boolean).entries()) {
    const [holder = '', kind = '', ref = '', share = ''] = l.split('|').map(x => x.trim());
    const holderKind = (kind || 'person') as LandParty['holderKind'];
    if (!HOLDER_KINDS.some(h => h.key === holderKind)) return { error: `Receiving party ${i + 1}: the kind of holder is one of ${HOLDER_KINDS.map(h => h.key).join(', ')}` };
    out.push({ holderKind, holder, ...(ref ? { holderRef: ref } : {}), ...(share ? { share } : {}) });
  }
  return out.length ? out : { error: 'Name who receives the interest: one line each, name | kind of holder | reference | share' };
}

/** The land registry the nation named must be the case's institution. */
function keeper(c: Case): { error: string } | null {
  const id = authorityFor('landRegistry');
  return id && id === c.owner ? null : { error: 'Registered interests in land are kept by the land registry the nation names under Who is responsible: this institution is not it' };
}
function parcelOf(c: Case): Parcel | { error: string } {
  const id = str(c.fields.parcel);
  if (!id) return { error: 'Name the parcel (its national parcel id or record number)' };
  const p = getParcel(id);
  if (!p) return { error: `No parcel ${id} in the register` };
  if (p.state !== 'published') return { error: `Parcel ${p.parcelId} is ${p.state}: interests are registered on a published parcel` };
  return p;
}
const sourceOf = (c: Case) => ({ kind: str(c.fields.instrumentKind) || 'other', ref: str(c.fields.instrumentRef), ...(str(c.fields.instrumentDate) ? { date: str(c.fields.instrumentDate) } : {}) });

/** The change a dealing case asks for, from its answers. */
function changeOf(c: Case): RightsChange | { error: string } {
  const key = c.package.key;
  if (key.startsWith('land.transfer')) {
    const to = partiesOf(c.fields.receivingParties);
    if ('error' in to) return to;
    return { kind: 'transfer', interest: str(c.fields.interest), to, source: sourceOf(c) };
  }
  if (key.startsWith('land.encumbrance')) {
    return { kind: 'add', right: { type: str(c.fields.encumbranceType), holderKind: str(c.fields.beneficiaryKind) || 'unknown', holder: str(c.fields.beneficiary), ...(str(c.fields.beneficiaryRef) ? { holderRef: str(c.fields.beneficiaryRef) } : {}), ...(str(c.fields.burdens) ? { burdens: str(c.fields.burdens) } : {}), source: sourceOf(c) } };
  }
  if (key.startsWith('land.discharge')) return { kind: 'discharge', interest: str(c.fields.interest) };
  if (key.startsWith('land.correction')) {
    return { kind: 'correct', interest: str(c.fields.interest), right: { holderKind: str(c.fields.correctedKind) || 'unknown', holder: str(c.fields.correctedHolder), ...(str(c.fields.correctedRef) ? { holderRef: str(c.fields.correctedRef) } : {}), ...(str(c.fields.correctedShare) ? { share: str(c.fields.correctedShare) } : {}), source: sourceOf(c) } };
  }
  return { error: `${key} is not a land dealing` };
}
const kindOf = (c: Case): TransactionKind => {
  const key = c.package.key;
  if (key.startsWith('land.transfer')) return str(c.fields.transactionType) === 'succession' ? 'succession' : 'transfer';
  return key.startsWith('land.encumbrance') ? 'encumbrance' : key.startsWith('land.discharge') ? 'discharge' : 'correction';
};
const hasDocument = (c: Case, cls: string) => c.documents.some(id => getDocument(id)?.class === cls);

/**
 * Everything checked before a dealing is decided, again when it is decided:
 * the keeper, the parcel, the interest and what holds it, a caveat that stops
 * a transfer, and the change itself on a copy of the parcel.
 */
function check(ctx: EffectContext): { parcel: Parcel; change: RightsChange; effective: string } | { error: string } {
  const { case: c, now } = ctx;
  const k = keeper(c);
  if (k) return k;
  const p = parcelOf(c);
  if ('error' in p) return p;
  const change = changeOf(c);
  if ('error' in change) return change;
  if (!str(c.fields.instrumentRef)) return { error: 'Give the reference of the instrument the registration rests on' };
  // A caveat or a transaction restriction on the parcel stops a transfer until its holder consents or it is discharged.
  if (change.kind === 'transfer') {
    const caveats = p.rights.filter(r => r.type === 'caveat' && r.id !== change.interest);
    if (caveats.length && !(c.fields.restrictionConsent === true && hasDocument(c, 'consent'))) {
      return { error: `A caveat is registered on parcel ${p.parcelId} (${caveats.map(r => r.id).join(', ')}): attach its holder's consent and confirm it, or have it discharged, before the transfer is registered` };
    }
  }
  const effective = str(c.fields.effectiveDate) || today(now);
  const dry = applyRightsChange(p.id, change, ctx.actor.name, { case: c.ref, effective, reason: 'checked before the decision', dryRun: true });
  if ('error' in dry) return dry;
  return { parcel: p, change, effective };
}

// ── Effects ──────────────────────────────────────────────────────────────────

registerEffect('land.check', (ctx: EffectContext) => {
  const r = check(ctx);
  if ('error' in r) return r;
  return { facts: { parcel: r.parcel.parcelId, parcelVersion: r.parcel.versions.length } };
});

registerEffect('land.register', (ctx: EffectContext) => {
  const r = check(ctx);
  if ('error' in r) return r;
  const { case: c, now } = ctx;
  const p = r.parcel;
  return {
    facts: { parcel: p.parcelId, parcelVersion: p.versions.length, effective: r.effective, kind: kindOf(c) },
    after: (d, done) => {
      const applied = applyRightsChange(p.id, r.change, ctx.actor.name, { case: c.ref, ...(d ? { decision: d.id } : {}), effective: r.effective, reason: done.history.at(-1)?.reason ?? 'Registered' });
      if ('error' in applied) return;
      const transferring = r.change.kind === 'transfer' ? str(c.fields.transferringParties) : '';
      const receiving = r.change.kind === 'transfer' ? (partiesOf(c.fields.receivingParties) as LandParty[])
        : r.change.kind === 'add' ? [{ holderKind: (str(c.fields.beneficiaryKind) || 'unknown') as LandParty['holderKind'], holder: str(c.fields.beneficiary), ...(str(c.fields.beneficiaryRef) ? { holderRef: str(c.fields.beneficiaryRef) } : {}) }]
          : r.change.kind === 'correct' ? [{ holderKind: (str(c.fields.correctedKind) || 'unknown') as LandParty['holderKind'], holder: str(c.fields.correctedHolder), ...(str(c.fields.correctedRef) ? { holderRef: str(c.fields.correctedRef) } : {}), ...(str(c.fields.correctedShare) ? { share: str(c.fields.correctedShare) } : {}) }] : [];
      const right = applied.parcel.rights.find(x => x.id === applied.interest) ?? p.rights.find(x => x.id === applied.interest);
      recordTransaction({
        kind: kindOf(c), parcel: { id: p.id, parcelId: p.parcelId }, interest: applied.interest, ...(right ? { rightType: right.type } : {}),
        parties: { ...(transferring ? { transferring } : {}), receiving }, instrument: sourceOf(c) as LandTransaction['instrument'],
        case: { id: c.id, ref: c.ref }, ...(d ? { decision: d.id } : {}), effective: r.effective, versions: { before: applied.before, after: applied.after },
        by: ctx.actor.name, sample: c.source === 'sample',
      }, now);
    },
  };
});

/** A dispute's interest: a right's reference on the parcel, `boundary` or `parcel`. */
function disputed(c: Case): { parcel: Parcel; interest: string } | { error: string } {
  const k = keeper(c);
  if (k) return k;
  const p = parcelOf(c);
  if ('error' in p) return p;
  const interest = str(c.fields.interest) || (str(c.fields.disputeKind) === 'boundary' ? 'boundary' : 'parcel');
  if (interest !== 'boundary' && interest !== 'parcel' && !p.rights.some(r => r.id === interest)) return { error: `No interest ${interest} on parcel ${p.parcelId}: name a right's reference, boundary or parcel` };
  if (!DISPUTE_KINDS.some(d => d.key === str(c.fields.disputeKind))) return { error: `The dispute is one of ${DISPUTE_KINDS.map(d => d.key).join(', ')}` };
  return { parcel: p, interest };
}

registerEffect('land.hold', (ctx: EffectContext) => {
  const { case: c, now } = ctx;
  const r = disputed(c);
  if ('error' in r) return r;
  return {
    facts: { parcel: r.parcel.parcelId, interest: r.interest },
    after: () => {
      freezeInterest(r.parcel.id, r.interest, c.ref, ctx.actor.name);
      openDispute({ kind: str(c.fields.disputeKind) as never, parcel: { id: r.parcel.id, parcelId: r.parcel.parcelId }, interest: r.interest, grounds: str(c.fields.grounds), parties: str(c.fields.disputeParties), case: { id: c.id, ref: c.ref }, by: ctx.actor.name, sample: c.source === 'sample' }, now);
    },
  };
});

registerEffect('land.refer-dispute', (ctx: EffectContext) => {
  const { case: c, now } = ctx;
  const k = keeper(c);
  if (k) return k;
  const to = str(c.fields.referTo);
  if (!to || !getMinistry(to)) return { error: 'Name the court, tribunal or body the dispute is referred to (its id in the institution register)' };
  if (to === c.owner) return { error: 'A referral goes to another institution' };
  if (disputeOfCase(c.id)?.state !== 'held') return { error: 'Only a dispute the registry holds is referred' };
  // The interest stays held: the referral carries the case reference only, and the outcome is recorded when it comes back.
  return { facts: { referredTo: to }, after: (_d, done) => { referDispute(c.id, { to, by: ctx.actor.name, reason: done.history.at(-1)?.reason ?? 'Referred' }, now); } };
});

/** A decision, a recorded court order or a withdrawal ends the dispute and releases what it held; nothing else does. */
function settle(result: 'decide' | 'court-order' | 'withdrawn') {
  return (ctx: EffectContext) => {
    const { case: c, now } = ctx;
    const k = keeper(c);
    if (k) return k;
    const d = disputeOfCase(c.id);
    if (!d) return { error: 'No dispute is recorded for this case' };
    const outcome = result === 'decide' ? str(c.fields.outcome) : result;
    if (result === 'decide' && !['upheld', 'dismissed', 'settled'].includes(outcome)) return { error: 'The outcome is upheld, dismissed or settled (a court\'s outcome is recorded from its order)' };
    if (result === 'court-order' && d.state !== 'referred') return { error: 'A court\'s order is recorded for a dispute referred to it' };
    if (!DISPUTE_OUTCOMES.includes(outcome as never) && outcome !== 'withdrawn') return { error: 'Unknown outcome' };
    return {
      facts: { parcel: d.parcel.parcelId, interest: d.interest, outcome },
      after: (sealed: { id: string } | undefined, done: Case) => {
        const last = done.history.at(-1)!;
        decideDispute(c.id, { result: outcome as never, reasons: last.reason ?? '', ...(sealed ? { decision: sealed.id } : {}), by: last.by.name, ...(last.confirmedBy ? { confirmedBy: last.confirmedBy.name } : {}) }, now);
        releaseInterest(d.parcel.id, c.ref, ctx.actor.name);
      },
    };
  };
}
registerEffect('land.decide-dispute', settle('decide'));
registerEffect('land.record-order', settle('court-order'));
registerEffect('land.withdraw-dispute', settle('withdrawn'));

// The same check when a registration is proposed (the first of the two officials), not only when it is confirmed:
// an interest held by a dispute, a caveat without consent or a slot that changed refuses the proposal itself.
registerDecisionGuard('land-register', (c, a, pkg, now) => {
  if (!pkg.key.startsWith('land.') || a.key !== 'register') return {};
  const r = check({ case: c, package: pkg, action: a, actor: { name: 'Land registry check', scope: null }, now });
  return 'error' in r ? r : {};
});

// ── Reference procedures ─────────────────────────────────────────────────────

const adm = (key: string, label: string, type: FieldSpec['type'] = 'text', extra: Partial<FieldSpec> = {}): FieldSpec => ({ key, label, type, personalDataClass: 'administrative', ...extra });
const per = (key: string, label: string, type: FieldSpec['type'] = 'text', extra: Partial<FieldSpec> = {}): FieldSpec => ({ key, label, type, personalDataClass: 'restricted', ...extra });
const PARCEL: FieldSpec[] = [
  adm('parcel', 'Parcel (its national parcel id or record number, from the register)'),
];
const INSTRUMENT: FieldSpec[] = [
  adm('instrumentKind', 'Kind of instrument', 'choice', { options: SOURCE_KINDS.map(s => s.key) }),
  per('instrumentRef', 'Reference of the instrument (the deed, lease, charge, order or record)'),
  adm('instrumentDate', 'Date of the instrument', 'date'),
  adm('effectiveDate', 'Date the registration takes effect (the decision date when left empty)', 'date'),
];
const HOLDER_OPTIONS = HOLDER_KINDS.map(h => h.key);
const base = { reference: true as const, citations: [], notifications: [], deadlines: [], retention: 'land-register-file', sensitivity: 'restricted' as const, owner: 'landRegistry' };
const STAGES = [
  { key: 'lodged', label: 'Lodged' }, { key: 'verification', label: 'Parties and instrument being verified' }, { key: 'review', label: 'Checked against the register (objections, restrictions, competing claims)' },
  { key: 'registered', label: 'Registered: a new version of the parcel', terminal: true }, { key: 'not-registered', label: 'Refused, with reasons', terminal: true }, { key: 'withdrawn', label: 'Withdrawn, with reasons', terminal: true },
];

/** A dealing in registered land: lodged with its instrument, the parties verified, checked against the register, decided by two officials. */
function dealing(p: { key: string; title: string; refPrefix: string; decision: string; fields: FieldSpec[]; required: string[]; documents?: CasePackage['documents'] }): Ref {
  return {
    ...base, key: p.key, version: 1, title: p.title, refPrefix: p.refPrefix,
    fields: [...PARCEL, ...p.fields, ...INSTRUMENT],
    documents: [
      { class: 'instrument', label: 'The instrument the registration rests on (signed)', required: true },
      { class: 'identity-evidence', label: 'Evidence of the parties\' identity and authority to act', required: true, multiple: true },
      ...(p.documents ?? []),
    ],
    stages: STAGES,
    actions: [
      { key: 'lodge', label: 'Accept the lodgement: the application and its instrument', from: ['lodged'], to: 'verification', needs: { role: 'officer' }, requires: { fields: ['parcel', ...p.required, 'instrumentRef'], documents: ['instrument'] } },
      { key: 'verify', label: 'Verify the parties\' identity and authority and the instrument\'s validity', from: ['verification'], to: 'review', needs: { role: 'officer', assigned: true }, requires: { documents: ['identity-evidence'], reasons: true }, effects: ['land.check'] },
      { key: 'ask-information', label: 'Ask for information or a corrected instrument', from: ['review'], to: 'verification', needs: { role: 'officer' }, requires: { reasons: true } },
      { key: 'register', label: 'Register: the competent authority decides, a second official confirms', from: ['review'], to: 'registered', decision: p.decision, needs: { role: 'signatory', fourEyes: true, distinctFrom: ['verify'] }, requires: { reasons: true }, effects: ['land.register'] },
      { key: 'refuse', label: 'Refuse, with reasons and the review route', from: ['review'], to: 'not-registered', decision: 'refuse', needs: { role: 'signatory' }, requires: { reasons: true } },
      { key: 'withdraw', label: 'Withdrawn by the applicant, with reasons', from: ['lodged', 'verification', 'review'], to: 'withdrawn', needs: { role: 'officer' }, requires: { reasons: true } },
    ],
    tests: [
      { name: 'lodged, verified, checked and registered', steps: [
        { action: 'lodge', expect: 'refused' },
        { action: 'lodge', fields: Object.fromEntries(['parcel', ...p.required, 'instrumentRef'].map(k => [k, 'x'])), documents: ['instrument'], expect: 'verification' },
        { action: 'verify', expect: 'refused' },
        { action: 'verify', documents: ['identity-evidence'], expect: 'review' },
        { action: 'register', expect: 'registered' },
      ] },
      { name: 'refused', steps: [
        { action: 'lodge', fields: Object.fromEntries(['parcel', ...p.required, 'instrumentRef'].map(k => [k, 'x'])), documents: ['instrument'], expect: 'verification' },
        { action: 'verify', documents: ['identity-evidence'], expect: 'review' },
        { action: 'refuse', expect: 'not-registered' },
      ] },
    ],
  };
}

export const REFERENCE_LAND_TRANSFER: Ref = dealing({
  key: 'land.transfer', title: 'Transfer of a registered interest in land (or its registration on succession)', refPrefix: 'LTF', decision: 'register',
  required: ['interest', 'receivingParties'],
  fields: [
    adm('interest', 'The interest transferred (its reference on the parcel, e.g. PCL-000001/R1)'),
    adm('transactionType', 'Kind of transaction', 'choice', { options: ['sale', 'gift', 'exchange', 'succession', 'court-order', 'other'] }),
    per('transferringParties', 'Transferring parties, as the register names them', 'longtext'),
    per('receivingParties', 'Receiving parties: one line each, name | kind of holder | reference | share', 'longtext', { hint: 'Kind of holder: person, group, organisation, state, community or unknown. A share is a fraction such as 1/2.' }),
    adm('restrictionConsent', 'The holder of each caveat on the parcel consents (the consent is attached)', 'boolean'),
  ],
  documents: [
    { class: 'consent', label: 'Consent of a caveat holder, or another consent the law requires', required: false, multiple: true },
    { class: 'succession-evidence', label: 'Evidence of succession (a grant, an order or a customary record), where the transfer is on succession', required: false, multiple: true },
  ],
});

export const REFERENCE_LAND_ENCUMBRANCE: Ref = dealing({
  key: 'land.encumbrance', title: 'Registration of a lease, mortgage, easement, caveat or restriction on a parcel', refPrefix: 'LEN', decision: 'register',
  required: ['encumbranceType', 'beneficiary'],
  fields: [
    adm('encumbranceType', 'What is registered', 'choice', { options: ADDABLE }),
    adm('burdens', 'The interest it burdens, where it burdens one (its reference; the parcel when left empty)'),
    per('beneficiary', 'Who holds it (the lessee, the lender, the person entitled to the easement, the caveator)'),
    adm('beneficiaryKind', 'Kind of holder', 'choice', { options: HOLDER_OPTIONS }),
    per('beneficiaryRef', 'The holder\'s reference (identity or company number), where the registry keeps one'),
    per('terms', 'Its terms as the instrument states them (term, the obligation secured, the route of the easement)', 'longtext'),
  ],
});

export const REFERENCE_LAND_DISCHARGE: Ref = dealing({
  key: 'land.discharge', title: 'Discharge of a mortgage, lease, easement, caveat or restriction', refPrefix: 'LDC', decision: 'discharge',
  required: ['interest'],
  fields: [
    adm('interest', 'The interest discharged (its reference on the parcel)'),
    per('dischargeGrounds', 'Why it ends (repaid, released, expired, ordered)', 'longtext'),
  ],
});

export const REFERENCE_LAND_CORRECTION: Ref = dealing({
  key: 'land.correction', title: 'Controlled correction of a registered interest in land', refPrefix: 'LCR', decision: 'correct',
  required: ['interest', 'correctedHolder', 'correctionGrounds'],
  fields: [
    adm('interest', 'The interest corrected (its reference on the parcel)'),
    per('correctedHolder', 'The holder as corrected'),
    adm('correctedKind', 'Kind of holder', 'choice', { options: HOLDER_OPTIONS }),
    per('correctedRef', 'The holder\'s reference as corrected'),
    adm('correctedShare', 'The share as corrected (a fraction)'),
    per('correctionGrounds', 'What is wrong and the evidence that shows it', 'longtext'),
  ],
});

export const REFERENCE_LAND_DISPUTE: Ref = {
  ...base, key: 'land.dispute', version: 1, title: 'Land dispute, objection or conflicting title (the interest held until decided)', refPrefix: 'LDP',
  fields: [
    ...PARCEL,
    adm('disputeKind', 'Kind of dispute', 'choice', { options: DISPUTE_KINDS.map(d => d.key) }),
    adm('interest', 'What it concerns: an interest\'s reference, boundary, or parcel for the whole parcel'),
    per('grounds', 'The grounds, as stated', 'longtext'),
    per('disputeParties', 'The parties to the dispute and their representatives', 'longtext'),
    adm('referTo', 'Court, tribunal or other body referred to (its id in the institution register)'),
    adm('outcome', 'Outcome of the registry\'s decision', 'choice', { options: ['upheld', 'dismissed', 'settled'] }),
  ],
  documents: [
    { class: 'dispute-submission', label: 'The dispute, objection or report as received', required: true },
    { class: 'evidence', label: 'Evidence from the parties (surveys, instruments, statements)', required: false, multiple: true },
    { class: 'court-order', label: 'The order of the court or tribunal the dispute was referred to', required: false },
  ],
  stages: [
    { key: 'lodged', label: 'Lodged' }, { key: 'held', label: 'Registered: the interest is held' }, { key: 'investigation', label: 'Under investigation (restricted)' },
    { key: 'referred', label: 'Referred to a court or tribunal: the interest stays held' },
    { key: 'decided', label: 'Decided, with reasons: the interest released', terminal: true }, { key: 'withdrawn', label: 'Withdrawn, with reasons: the interest released', terminal: true },
  ],
  actions: [
    { key: 'register', label: 'Register the dispute: the interest is held from now until it is decided', from: ['lodged'], to: 'held', needs: { role: 'officer' }, requires: { fields: ['parcel', 'disputeKind', 'grounds'], documents: ['dispute-submission'] }, effects: ['land.hold'] },
    { key: 'investigate', label: 'Open the investigation and assign it', from: ['held'], to: 'investigation', needs: { role: 'officer' }, requires: { reasons: true } },
    { key: 'refer', label: 'Refer to the court, tribunal or body the law names (the case reference only)', from: ['held', 'investigation'], to: 'referred', needs: { role: 'signatory' }, requires: { fields: ['referTo'], reasons: true }, effects: ['land.refer-dispute'] },
    { key: 'decide', label: 'Decide, with reasons: the competent authority, confirmed by a second official', from: ['investigation'], to: 'decided', decision: 'decide', needs: { role: 'signatory', fourEyes: true }, requires: { fields: ['outcome'], reasons: true }, effects: ['land.decide-dispute'] },
    { key: 'record-order', label: 'Record the court\'s or tribunal\'s order (a second official confirms)', from: ['referred'], to: 'decided', needs: { role: 'signatory', fourEyes: true }, requires: { documents: ['court-order'], reasons: true }, effects: ['land.record-order'] },
    { key: 'withdraw', label: 'Withdrawn by the party who raised it, with reasons', from: ['held', 'investigation'], to: 'withdrawn', needs: { role: 'signatory' }, requires: { reasons: true }, effects: ['land.withdraw-dispute'] },
  ],
  tests: [
    { name: 'held, investigated and decided', steps: [
      { action: 'register', expect: 'refused' },
      { action: 'register', fields: { parcel: 'x', disputeKind: 'boundary', grounds: 'x' }, documents: ['dispute-submission'], expect: 'held' },
      { action: 'investigate', expect: 'investigation' },
      { action: 'decide', expect: 'refused' },
      { action: 'decide', fields: { outcome: 'dismissed' }, expect: 'decided' },
    ] },
    { name: 'referred and the order recorded', steps: [
      { action: 'register', fields: { parcel: 'x', disputeKind: 'title', grounds: 'x' }, documents: ['dispute-submission'], expect: 'held' },
      { action: 'refer', fields: { referTo: 'x' }, expect: 'referred' },
      { action: 'record-order', expect: 'refused' },
      { action: 'record-order', documents: ['court-order'], expect: 'decided' },
    ] },
  ],
};

export const LAND_PROCEDURES: Ref[] = [REFERENCE_LAND_TRANSFER, REFERENCE_LAND_ENCUMBRANCE, REFERENCE_LAND_DISCHARGE, REFERENCE_LAND_CORRECTION, REFERENCE_LAND_DISPUTE];
/** What each right type is called, for the dealing forms (the vocabulary of lib/data/parcels.ts). */
export const LAND_RIGHT_LABELS: Record<string, string> = Object.fromEntries(RIGHT_TYPES.map(t => [t.key, t.label]));

export function installLandProcedures(by: string): { drafted: string[]; present: string[] } {
  const drafted: string[] = [], present: string[] = [];
  for (const p of LAND_PROCEDURES) {
    if (listPackages({ key: p.key }).length) { present.push(p.key); continue; }
    const d = draftPackage(p, by, undefined, registeredEffects());
    if (!('error' in d)) drafted.push(p.key);
  }
  return { drafted, present };
}
