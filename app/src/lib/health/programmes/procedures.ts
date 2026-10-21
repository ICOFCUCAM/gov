// The public-health authority's procedures on the register of public-health
// programmes (lib/health/programmes/register.ts; Health I4 dependency
// `public-health-programmes`). Reference procedures, shipped as drafts like
// every reference procedure: the nation's public-health authority (the
// `publicHealth` slot) adapts each to its law, a second official approves it,
// and until then no case runs under it.
//
//   public-health.programme            establish a programme: its terms (eligibility cited
//                                      from the laws register, coverage and its denominator's
//                                      documented source, budget reference, reporting period,
//                                      indicators, areas, supply items) decided by two officials
//   public-health.programme-change     amend, suspend, reinstate or close a programme
//   public-health.intervention         an area or population measure under the nation's
//                                      intervention authority rules (CFG-PH-003, shipped empty):
//                                      production refuses a kind no adopted rule covers; reviewed
//                                      and ended by decision; never a person (individual orders
//                                      are HLT-PH-009/010, excluded by the approved scope)
//   public-health.programme-return     an aggregate return (HLT-PH-015) or programme activity
//                                      record (HLT-PH-011): counts by area and period, each
//                                      reported, suspected, confirmed or modelled, validated by an
//                                      officer and accepted; corrections as new versions
//   public-health.risk-communication   a risk communication (HLT-PH-014): the message, its
//                                      audience and evidence basis, approved by two officials and
//                                      released exactly as approved
//
// Nothing statutory is typed: no period, fee, threshold or outcome list (the
// nation's lists ship empty). Who holds each power comes from the permit
// authority registry (lib/permits/authority.ts: public-health-programme,
// public-health-intervention, public-health-communication, proposed as
// unapproved drafts); a production installation refuses every decision until
// the nation approves a mapping. AI never decides here.

import { createHash } from 'node:crypto';
import { registerEffect, registeredEffects, sampleMark, type EffectContext } from '@/lib/casework/engine';
import { draftPackage, listPackages, ownerInstitution } from '@/lib/casework/packages';
import { authorityFor } from '@/lib/data/store';
import { recordAudit } from '@/lib/data/store/audit';
import { getDecision } from '@/lib/records/decisions';
import { citeBasis } from '@/lib/law/policy-change';
import { powerRefusal, mappingInForce, type Power } from '@/lib/permits/authority';
import { samplesAllowed } from '@/lib/ops/mode';
import { isAuthorityKey } from '@/lib/nation/deployment';
import type { Case, CasePackage, FieldSpec } from '@/lib/casework/types';
import {
  checkTerms, establishProgramme, amendProgramme, setProgrammeState, attachProgrammeDecision, getProgramme, termsOf,
  recordIntervention, reviewIntervention, endIntervention, interventionRule, checkEntries, recordProgrammeReturn,
  COUNT_BASES, COUNT_QUALITY, REPORTING_PERIODS, type ProgrammeState,
} from './register';

type Ref = Omit<CasePackage, 'state' | 'createdAt' | 'author' | 'authorId' | 'approvedBy' | 'approvedAt'>;
const str = (v: unknown) => (typeof v === 'string' ? v.trim() : '');
const fail = (r: { error: string } | object): r is { error: string } => 'error' in r;

/** The permit type whose approved mapping governs each procedure's decisions (lib/permits/decisions.ts reads it). */
export const PROGRAMME_PERMITS: Record<string, string> = {
  'public-health.programme': 'public-health-programme',
  'public-health.programme-change': 'public-health-programme',
  'public-health.intervention': 'public-health-intervention',
  'public-health.risk-communication': 'public-health-communication',
};

/** May this case's institution use this power? The approved mapping decides; without one (demo and training only) the authority named for the public-health slot. */
function mayAct(c: Case, permitType: string, power: Power): string | null {
  const resolve = (a: string) => ownerInstitution(a, authorityFor);
  const why = powerRefusal(permitType, power, c.owner, resolve, { required: !samplesAllowed() });
  if (why) return why;
  if (mappingInForce(permitType)) return null;
  return resolve('publicHealth') === c.owner ? null : 'Public-health programmes are kept by the public-health authority named under Who is responsible';
}
const keeper = (c: Case): string | null => (ownerInstitution('publicHealth', authorityFor) === c.owner ? null : 'Public-health programmes are kept by the public-health authority named under Who is responsible');
const reasonOf = (ctx: EffectContext) => ctx.case.pending?.reason ?? `${ctx.action.label} (${ctx.case.ref})`;
const areasOf = (v: unknown): string[] => (Array.isArray(v) ? v.map(String) : str(v) ? str(v).split(/[;\n,]/) : []).map(x => x.trim()).filter(Boolean);
const attach = (c: Case) => (d?: { id: string }) => { if (d) attachProgrammeDecision(c.id, d.id); };

/** The eligibility a programme decision cites: a provision of the nation's law (production refuses without one). */
function eligibilityOf(c: Case, now: Date) {
  const instrument = str(c.fields.eligibilityLaw), eId = str(c.fields.eligibilityProvision);
  if (!instrument && !eId) return samplesAllowed() ? [] : { error: 'Cite the provision of the nation\'s law that sets the programme\'s eligibility (laws register)' };
  return citeBasis([{ instrument, eId }], now.toISOString().slice(0, 10), `Eligibility of a public-health programme (${c.ref})`);
}
const termsInput = (c: Case) => ({
  title: c.fields.title, eligibilityNote: c.fields.eligibilityNote, coverageDefinition: c.fields.coverageDefinition, denominator: c.fields.denominator,
  denominatorSource: c.fields.denominatorSource, budgetReference: c.fields.budgetReference, reportingPeriod: c.fields.reportingPeriod,
  indicators: c.fields.indicators, areas: c.fields.areas, supplyItems: c.fields.supplyItems,
});

// ── Effects ──────────────────────────────────────────────────────────────────

registerEffect('programme.check', ({ case: c }: EffectContext) => {
  const why = mayAct(c, PROGRAMME_PERMITS['public-health.programme']!, 'issue');
  if (why) return { error: why };
  const t = checkTerms(termsInput(c));
  return fail(t) ? t : { facts: { indicators: t.indicators.length, supplyItems: t.supplyItems.length } };
});
registerEffect('programme.establish', ({ case: c, actor, now, ...ctx }: EffectContext) => {
  const why = mayAct(c, PROGRAMME_PERMITS['public-health.programme']!, 'issue');
  if (why) return { error: why };
  const basis = eligibilityOf(c, now);
  if (fail(basis)) return basis;
  const t = checkTerms({ ...termsInput(c), basis });
  if (fail(t)) return t;
  const p = establishProgramme(t, reasonOf({ case: c, actor, now, ...ctx }), c.id, actor.name, now, sampleMark(c).sample);
  return fail(p) ? p : { facts: { programme: p.number, eligibility: basis.length ? `${basis[0]!.title ?? basis[0]!.instrument} ${basis[0]!.num ?? basis[0]!.eId}` : 'not cited (demonstration)' }, after: attach(c) };
});

registerEffect('programme.checkChange', ({ case: c }: EffectContext) => {
  const why = mayAct(c, PROGRAMME_PERMITS['public-health.programme-change']!, 'issue');
  if (why) return { error: why };
  const p = getProgramme(str(c.fields.programme));
  if (!p) return { error: `No programme ${str(c.fields.programme) || '(none given)'} on the register` };
  if (p.state === 'closed') return { error: `${p.number} is closed` };
  return { facts: { programme: p.number } };
});
registerEffect('programme.amend', (ctx: EffectContext) => {
  const { case: c, actor, now } = ctx;
  const why = mayAct(c, PROGRAMME_PERMITS['public-health.programme-change']!, 'issue');
  if (why) return { error: why };
  const p = getProgramme(str(c.fields.programme));
  if (!p) return { error: `No programme ${str(c.fields.programme) || '(none given)'} on the register` };
  const cited = str(c.fields.eligibilityLaw) || str(c.fields.eligibilityProvision) ? eligibilityOf(c, now) : undefined;
  if (cited && fail(cited)) return cited;
  const t = checkTerms({ ...termsInput(c), ...(cited ? { basis: cited } : {}) }, termsOf(p));
  if (fail(t)) return t;
  const r = amendProgramme(p.number, t, reasonOf(ctx), c.id, actor.name, now, sampleMark(c).sample);
  return fail(r) ? r : { facts: { programme: r.number, version: r.versions.length }, after: attach(c) };
});
const moveTo = (state: ProgrammeState, power: Power) => (ctx: EffectContext) => {
  const { case: c, actor, now } = ctx;
  const why = mayAct(c, PROGRAMME_PERMITS['public-health.programme-change']!, power);
  if (why) return { error: why };
  const r = setProgrammeState(str(c.fields.programme), state, reasonOf(ctx), c.id, actor.name, now, sampleMark(c).sample);
  return fail(r) ? r : { facts: { programme: r.number, standing: r.state }, after: attach(c) };
};
registerEffect('programme.suspend', moveTo('suspended', 'suspend'));
registerEffect('programme.reinstate', moveTo('established', 'suspend'));
registerEffect('programme.close', moveTo('closed', 'revoke'));

// Interventions (CFG-PH-003): an area or population measure, under the adopted rule for its kind.
const interventionCheck = (c: Case): string | null => {
  const why = mayAct(c, PROGRAMME_PERMITS['public-health.intervention']!, 'issue');
  if (why) return why;
  const kind = str(c.fields.kind);
  const rule = interventionRule(kind);
  if (!rule) return samplesAllowed() ? null : `No intervention authority rule for ${kind || '(no kind given)'} is adopted: two officials adopt the nation's rules first, citing the law (CFG-PH-003)`;
  const holder = isAuthorityKey(rule.authority) ? ownerInstitution(rule.authority, authorityFor) : rule.authority;
  return holder === c.owner ? null : `The nation's rules give ${kind} to ${rule.authority}, which is not this institution`;
};
registerEffect('intervention.check', ({ case: c }: EffectContext) => {
  const why = interventionCheck(c);
  if (why) return { error: why };
  if (str(c.fields.programme) && !getProgramme(str(c.fields.programme))) return { error: `No programme ${str(c.fields.programme)} on the register` };
  return { facts: { kind: str(c.fields.kind), rule: interventionRule(str(c.fields.kind)) ? `version ${interventionRule(str(c.fields.kind))!.version}` : 'none adopted (demonstration)' } };
});
registerEffect('intervention.authorise', ({ case: c, actor, now }: EffectContext) => {
  const why = interventionCheck(c);
  if (why) return { error: why };
  const period = (c.fields.effective ?? {}) as { from?: string; to?: string };
  const r = recordIntervention({
    ...(str(c.fields.programme) ? { programme: str(c.fields.programme) } : {}), kind: str(c.fields.kind), areas: areasOf(c.fields.areas), measure: str(c.fields.measure),
    from: str(period.from), ...(str(period.to) ? { to: str(period.to) } : {}), ...(str(c.fields.reviewBy) ? { reviewBy: str(c.fields.reviewBy) } : {}), ...sampleMark(c),
  }, c.id, actor.name, { required: !samplesAllowed() }, now);
  if (fail(r)) return r;
  return { facts: { intervention: r.number, kind: r.kind, areas: r.areas.join(', '), rule: 'none' in r.rule ? 'none adopted (demonstration)' : `version ${r.rule.version}` }, after: attach(c) };
});
registerEffect('intervention.review', (ctx: EffectContext) => {
  const r = reviewIntervention(ctx.case.id, reasonOf(ctx), ctx.actor.name, ctx.now);
  return fail(r) ? r : { facts: { intervention: r.number, reviews: r.reviews.length } };
});
registerEffect('intervention.end', (ctx: EffectContext) => {
  const why = mayAct(ctx.case, PROGRAMME_PERMITS['public-health.intervention']!, 'revoke');
  if (why) return { error: why };
  const r = endIntervention(ctx.case.id, reasonOf(ctx), ctx.actor.name, ctx.now);
  return fail(r) ? r : { facts: { intervention: r.number, ended: r.to ?? '' } };
});

// Aggregate returns (HLT-PH-015, HLT-PH-011): checked on registration, recorded when accepted.
registerEffect('programme.checkReturn', ({ case: c }: EffectContext) => {
  const why = keeper(c);
  if (why) return { error: why };
  const r = checkEntries(str(c.fields.programme), c.fields.counts);
  return fail(r) ? r : { facts: { programme: r.programme.number, counts: r.entries.length } };
});
registerEffect('programme.recordReturn', ({ case: c, actor, now }: EffectContext) => {
  const why = keeper(c);
  if (why) return { error: why };
  const r = recordProgrammeReturn({
    programme: str(c.fields.programme), reporter: str(c.fields.reporter), area: str(c.fields.area), period: (c.fields.period ?? {}) as { from?: string; to?: string },
    entries: c.fields.counts, complete: c.fields.complete === true, method: str(c.fields.method), ...(str(c.fields.corrects) ? { corrects: str(c.fields.corrects) } : {}), ...sampleMark(c),
  }, c.id, actor.name, now);
  return fail(r) ? r : { facts: { return: r.number, version: r.versions.length } };
});

// Risk communication (HLT-PH-014): approved by two officials, released exactly as approved.
const digestOf = (c: Case) => createHash('sha256').update(JSON.stringify([str(c.fields.message), c.fields.audience ?? '', c.fields.channels ?? []])).digest('hex');
registerEffect('communication.approve', ({ case: c }: EffectContext) => {
  const why = mayAct(c, PROGRAMME_PERMITS['public-health.risk-communication']!, 'issue');
  if (why) return { error: why };
  if (str(c.fields.message).length < 10) return { error: 'Write the message to be released' };
  return { facts: { messageDigest: digestOf(c) } };
});
registerEffect('communication.release', ({ case: c, actor }: EffectContext) => {
  const d = c.decisions.length ? getDecision(c.decisions[c.decisions.length - 1]!) : undefined;
  const approved = d?.content.facts?.messageDigest;
  if (!approved) return { error: 'The message is released only once two officials have approved it' };
  if (approved !== digestOf(c)) return { error: 'The message, audience or channels changed after approval: it is released only exactly as approved (start a new approval)' };
  recordAudit(actor.name, 'communication.release', `Case:${c.ref}`, 'ok', `message ${String(approved).slice(0, 12)}… · audience ${str(c.fields.audience) || 'n/a'}`);
  return { facts: { released: true, messageDigest: String(approved) } };
});

// ── Reference procedures ─────────────────────────────────────────────────────

const base = { owner: 'publicHealth', reference: true as const, citations: [], notifications: [], deadlines: [], retention: 'public-health-programme-permanent', sensitivity: 'normal' as const };
const text = (key: string, label: string, cls: 'public' | 'administrative' | 'restricted', long = false, hint?: string): FieldSpec => ({ key, label, type: long ? 'longtext' : 'text', personalDataClass: cls, ...(hint ? { hint } : {}) });
const configured = (key: string, label: string, list: string, what: string, multiple = false): FieldSpec => ({ key, label, type: 'enum', valuesSource: { kind: 'configured', list }, personalDataClass: 'administrative', countryDecision: `The nation's ${what}; none ship`, ...(multiple ? { multiple: true } : {}) });
const AREAS: FieldSpec = { key: 'areas', label: 'Areas (the nation\'s regions; none: the whole nation)', type: 'enum', valuesSource: { kind: 'regions' }, multiple: true, personalDataClass: 'administrative' };
const NO_PERSON = 'Programme-level only: never a person\'s name, identity or health details.';
const TERMS: FieldSpec[] = [
  text('title', 'Programme title', 'public'),
  text('eligibilityLaw', 'Eligibility: the law that sets it (its identifier in the laws register)', 'administrative'),
  text('eligibilityProvision', 'Eligibility: the provision (its eId, e.g. sec_12)', 'administrative'),
  text('eligibilityNote', 'Eligibility in plain words (as the provision states it)', 'public', true, NO_PERSON),
  text('coverageDefinition', 'Coverage definition (what is counted as covered)', 'public', true, NO_PERSON),
  text('denominator', 'Coverage denominator (the population or units counted against)', 'public'),
  text('denominatorSource', 'Documented source of the denominator (register, census or survey, with its date)', 'public'),
  text('budgetReference', 'Budget reference (the nation\'s budget line; kept by finance)', 'administrative'),
  { key: 'reportingPeriod', label: 'Reporting period', type: 'choice', options: [...REPORTING_PERIODS], personalDataClass: 'administrative' },
  text('indicators', 'Indicators reported (keys from the nation\'s approved indicator definitions, one per line)', 'administrative', true),
  AREAS,
  text('supplyItems', 'Supply items (one per line: product register number | unit)', 'administrative', true, 'A product of the register of medicines and medical devices and the unit counted (doses, packs, vials). No lot, stock or location.'),
];
const PROGRAMME: FieldSpec = { key: 'programme', label: 'Programme (its register number, PHP-…)', type: 'registryReference', register: 'programme', rules: [{ rule: 'existingRecord' }], personalDataClass: 'administrative' };

export const REFERENCE_PROGRAMME: Ref = {
  ...base, key: 'public-health.programme', version: 1, title: 'Establishment of a public-health programme', refPrefix: 'PHE',
  authority: { permitType: PROGRAMME_PERMITS['public-health.programme']! },
  fields: TERMS,
  documents: [
    { class: 'programme-proposal', label: 'The programme proposal (objectives, eligibility, coverage, indicators)', required: true },
    { class: 'evidence-basis', label: 'Evidence basis', required: false, multiple: true },
    { class: 'budget-note', label: 'Budget note (from the finance authority)', required: false },
  ],
  stages: [
    { key: 'submitted', label: 'Submitted' }, { key: 'review', label: 'Review' }, { key: 'pending-approval', label: 'Decision' },
    { key: 'established', label: 'Established', terminal: true }, { key: 'not-established', label: 'Not established', terminal: true },
  ],
  actions: [
    { key: 'register', label: 'Register the proposal', from: ['submitted'], to: 'review', needs: { role: 'officer' }, requires: { fields: ['title', 'coverageDefinition', 'indicators', 'reportingPeriod'], documents: ['programme-proposal'] }, effects: ['programme.check'] },
    { key: 'propose', label: 'Reviewed: propose the decision', from: ['review'], to: 'pending-approval', needs: { role: 'officer' }, requires: { reasons: true }, effects: ['programme.check'] },
    { key: 'return', label: 'Return to review', from: ['pending-approval'], to: 'review', needs: { role: 'signatory' }, requires: { reasons: true } },
    { key: 'establish', label: 'Establish the programme', from: ['pending-approval'], to: 'established', decision: 'establish', needs: { role: 'signatory', fourEyes: true }, requires: { reasons: true }, effects: ['programme.establish'] },
    { key: 'refuse', label: 'Do not establish, with reasons', from: ['pending-approval'], to: 'not-established', decision: 'refuse', needs: { role: 'signatory', fourEyes: true }, requires: { reasons: true } },
  ],
  tests: [
    { name: 'established after a return', steps: [
      { action: 'register', expect: 'refused' },
      { action: 'register', fields: { title: 'Programme A', coverageDefinition: 'Units reached', indicators: 'sessions.held', reportingPeriod: 'quarter' }, documents: ['programme-proposal'], expect: 'review' },
      { action: 'propose', expect: 'pending-approval' }, { action: 'return', expect: 'review' }, { action: 'propose', expect: 'pending-approval' },
      { action: 'establish', expect: 'established' },
    ] },
    { name: 'not established', steps: [
      { action: 'register', fields: { title: 'Programme A', coverageDefinition: 'Units reached', indicators: 'sessions.held', reportingPeriod: 'quarter' }, documents: ['programme-proposal'], expect: 'review' },
      { action: 'propose', expect: 'pending-approval' }, { action: 'refuse', expect: 'not-established' },
    ] },
  ],
};

export const REFERENCE_PROGRAMME_CHANGE: Ref = {
  ...base, key: 'public-health.programme-change', version: 1, title: 'Amendment, suspension or closure of a public-health programme', refPrefix: 'PHC',
  authority: { permitType: PROGRAMME_PERMITS['public-health.programme-change']! },
  fields: [PROGRAMME, ...TERMS.map(f => ({ ...f, label: `New: ${f.label.charAt(0).toLowerCase()}${f.label.slice(1)} (empty keeps it)` }))],
  documents: [{ class: 'change-request', label: 'What changes and why', required: true }, { class: 'evidence-basis', label: 'Evidence basis', required: false, multiple: true }],
  stages: [
    { key: 'opened', label: 'Opened' }, { key: 'review', label: 'Review' }, { key: 'pending-approval', label: 'Decision' },
    { key: 'amended', label: 'Amended', terminal: true }, { key: 'suspended', label: 'Suspended' }, { key: 'reinstated', label: 'Reinstated', terminal: true },
    { key: 'closed', label: 'Programme closed', terminal: true }, { key: 'withdrawn', label: 'Withdrawn', terminal: true },
  ],
  actions: [
    { key: 'register', label: 'Register the change request', from: ['opened'], to: 'review', needs: { role: 'officer' }, requires: { fields: ['programme'], documents: ['change-request'] }, effects: ['programme.checkChange'] },
    { key: 'propose', label: 'Reviewed: propose the decision', from: ['review'], to: 'pending-approval', needs: { role: 'officer' }, requires: { reasons: true } },
    { key: 'return', label: 'Return to review', from: ['pending-approval'], to: 'review', needs: { role: 'signatory' }, requires: { reasons: true } },
    { key: 'amend', label: 'Amend the programme', from: ['pending-approval'], to: 'amended', decision: 'amend', needs: { role: 'signatory', fourEyes: true }, requires: { reasons: true }, effects: ['programme.amend'] },
    { key: 'suspend', label: 'Suspend the programme', from: ['pending-approval'], to: 'suspended', decision: 'suspend', needs: { role: 'signatory', fourEyes: true }, requires: { reasons: true }, effects: ['programme.suspend'] },
    { key: 'reinstate', label: 'Reinstate the programme', from: ['suspended'], to: 'reinstated', decision: 'reinstate', needs: { role: 'signatory', fourEyes: true }, requires: { reasons: true }, effects: ['programme.reinstate'] },
    { key: 'close', label: 'Close the programme', from: ['pending-approval', 'suspended'], to: 'closed', decision: 'withdraw', needs: { role: 'signatory', fourEyes: true }, requires: { reasons: true }, effects: ['programme.close'] },
    { key: 'withdraw', label: 'Withdraw the request', from: ['opened', 'review'], to: 'withdrawn', needs: { role: 'officer' }, requires: { reasons: true } },
  ],
  tests: [
    { name: 'amended', steps: [
      { action: 'register', fields: { programme: 'PHP-1' }, documents: ['change-request'], expect: 'review' }, { action: 'propose', expect: 'pending-approval' }, { action: 'amend', expect: 'amended' },
    ] },
    { name: 'suspended, reinstated', steps: [
      { action: 'register', fields: { programme: 'PHP-1' }, documents: ['change-request'], expect: 'review' }, { action: 'propose', expect: 'pending-approval' },
      { action: 'suspend', expect: 'suspended' }, { action: 'reinstate', expect: 'reinstated' },
    ] },
    { name: 'closed', steps: [
      { action: 'register', fields: { programme: 'PHP-1' }, documents: ['change-request'], expect: 'review' }, { action: 'propose', expect: 'pending-approval' }, { action: 'close', expect: 'closed' },
    ] },
    { name: 'withdrawn', steps: [{ action: 'register', fields: { programme: 'PHP-1' }, documents: ['change-request'], expect: 'review' }, { action: 'withdraw', expect: 'withdrawn' }] },
  ],
};

export const REFERENCE_INTERVENTION: Ref = {
  ...base, key: 'public-health.intervention', version: 1, title: 'Public-health intervention (an area or population measure)', refPrefix: 'PHI',
  authority: { permitType: PROGRAMME_PERMITS['public-health.intervention']! },
  fields: [
    { ...PROGRAMME, label: 'Programme it belongs to, if any (PHP-…)' },
    configured('kind', 'Kind of intervention (from the nation\'s intervention rules)', 'public-health.country.intervention_kinds', 'kinds of public-health intervention under its law (CFG-PH-003)'),
    { ...AREAS, label: 'Areas it applies to (the nation\'s regions)' },
    text('measure', 'The measure: what applies, where and to whom as a group', 'public', true, 'An area or population measure. Never a named person: orders on individuals are outside this platform.'),
    { key: 'effective', label: 'In force (from, and until where the decision sets an end)', type: 'dateRange', allowSingle: true, personalDataClass: 'public' },
    { key: 'reviewBy', label: 'Review by (as the decision sets it under the nation\'s rules)', type: 'date', personalDataClass: 'public' },
    text('evidenceSummary', 'Evidence summary (aggregate figures and their classes: reported, suspected, confirmed, modelled)', 'administrative', true, NO_PERSON),
  ],
  documents: [
    { class: 'evidence', label: 'Evidence basis (aggregate figures, assessments)', required: true, multiple: true },
    { class: 'legal-assessment', label: 'Legal assessment: the provision, the competent authority and the procedure', required: true },
    { class: 'review-report', label: 'Review report', required: false, multiple: true },
  ],
  stages: [
    { key: 'proposed', label: 'Proposed' }, { key: 'assessment', label: 'Assessment' }, { key: 'pending-approval', label: 'Decision' },
    { key: 'in-force', label: 'In force' }, { key: 'ended', label: 'Ended', terminal: true }, { key: 'not-authorised', label: 'Not authorised', terminal: true },
  ],
  actions: [
    { key: 'register', label: 'Register the proposed intervention', from: ['proposed'], to: 'assessment', needs: { role: 'officer' }, requires: { fields: ['kind', 'areas', 'measure', 'effective'], documents: ['evidence'] }, effects: ['intervention.check'] },
    { key: 'propose', label: 'Assessed: propose the decision', from: ['assessment'], to: 'pending-approval', needs: { role: 'officer' }, requires: { documents: ['legal-assessment'], reasons: true }, effects: ['intervention.check'] },
    { key: 'reassess', label: 'Return to assessment', from: ['pending-approval'], to: 'assessment', needs: { role: 'signatory' }, requires: { reasons: true } },
    { key: 'authorise', label: 'Authorise the intervention', from: ['pending-approval'], to: 'in-force', decision: 'authorise-intervention', needs: { role: 'signatory', fourEyes: true }, requires: { reasons: true }, effects: ['intervention.authorise'] },
    { key: 'refuse', label: 'Do not authorise, with reasons', from: ['pending-approval'], to: 'not-authorised', decision: 'refuse', needs: { role: 'signatory', fourEyes: true }, requires: { reasons: true } },
    { key: 'record-review', label: 'Record a review, with reasons', from: ['in-force'], to: 'in-force', needs: { role: 'officer' }, requires: { documents: ['review-report'], reasons: true }, effects: ['intervention.review'] },
    { key: 'end', label: 'End the intervention', from: ['in-force'], to: 'ended', decision: 'withdraw', needs: { role: 'signatory', fourEyes: true }, requires: { reasons: true }, effects: ['intervention.end'] },
  ],
  tests: [
    { name: 'authorised, reviewed, ended', steps: [
      { action: 'register', expect: 'refused' },
      { action: 'register', fields: { kind: 'k-1', areas: ['North'], measure: 'A measure for the area', effective: { from: '2026-01-01' } }, documents: ['evidence'], expect: 'assessment' },
      { action: 'propose', documents: ['legal-assessment'], expect: 'pending-approval' }, { action: 'reassess', expect: 'assessment' }, { action: 'propose', expect: 'pending-approval' },
      { action: 'authorise', expect: 'in-force' }, { action: 'record-review', documents: ['review-report'], expect: 'in-force' }, { action: 'end', expect: 'ended' },
    ] },
    { name: 'not authorised', steps: [
      { action: 'register', fields: { kind: 'k-1', areas: ['North'], measure: 'A measure for the area', effective: { from: '2026-01-01' } }, documents: ['evidence'], expect: 'assessment' },
      { action: 'propose', documents: ['legal-assessment'], expect: 'pending-approval' }, { action: 'refuse', expect: 'not-authorised' },
    ] },
  ],
};

const COUNTS: FieldSpec = {
  key: 'counts', label: 'Counts (one line per indicator, breakdown and class)', type: 'group', multiple: true, personalDataClass: 'administrative',
  hint: 'Whole numbers by area and period. Keep reported, suspected, confirmed and modelled counts apart. If a count is not available, say so rather than entering 0.',
  items: [
    { key: 'indicator', label: 'Indicator', type: 'text', personalDataClass: 'administrative' },
    { key: 'breakdown', label: 'Breakdown, where the dataset defines one', type: 'text', personalDataClass: 'administrative' },
    { key: 'supplyItem', label: 'Supply item, where the count is of one', type: 'text', personalDataClass: 'administrative' },
    { key: 'basis', label: 'Class', type: 'choice', options: [...COUNT_BASES], personalDataClass: 'administrative' },
    { key: 'quality', label: 'Counted, estimated, incomplete or not available', type: 'choice', options: [...COUNT_QUALITY], personalDataClass: 'administrative' },
    { key: 'value', label: 'Count', type: 'number', personalDataClass: 'administrative' },
  ] as FieldSpec[],
};
export const REFERENCE_PROGRAMME_RETURN: Ref = {
  ...base, key: 'public-health.programme-return', version: 1, title: 'Public-health aggregate return or programme activity record', refPrefix: 'PHR',
  fields: [
    { key: 'reporter', label: 'Reporting facility or reporter (organisation register number)', type: 'registryReference', register: 'organisation', rules: [{ rule: 'existingRecord' }], personalDataClass: 'administrative' },
    PROGRAMME,
    { key: 'area', label: 'Area the counts cover (one of the nation\'s regions)', type: 'enum', valuesSource: { kind: 'regions' }, personalDataClass: 'administrative' },
    { key: 'period', label: 'Period the counts cover', type: 'dateRange', personalDataClass: 'administrative' },
    COUNTS,
    { key: 'complete', label: 'The return is complete for the period', type: 'boolean', personalDataClass: 'administrative' },
    text('method', 'How the counts were produced (source system, estimate method)', 'administrative', true),
    text('corrects', 'Return this corrects, if any (PHR-…): the original is kept', 'administrative'),
  ],
  documents: [{ class: 'return-form', label: 'The return as received', required: true }],
  stages: [
    { key: 'submitted', label: 'Submitted' }, { key: 'validation', label: 'Validation' }, { key: 'correction-requested', label: 'Correction requested' },
    { key: 'accepted', label: 'Accepted', terminal: true }, { key: 'rejected', label: 'Rejected', terminal: true },
  ],
  actions: [
    { key: 'register', label: 'Register the return', from: ['submitted'], to: 'validation', needs: { role: 'officer' }, requires: { fields: ['reporter', 'programme', 'area', 'period', 'counts'], documents: ['return-form'] }, effects: ['programme.checkReturn'] },
    { key: 'request-correction', label: 'Ask the reporter to correct it', from: ['validation'], to: 'correction-requested', needs: { role: 'officer' }, requires: { reasons: true } },
    { key: 'record-correction', label: 'Record the corrected return', from: ['correction-requested'], to: 'validation', needs: { role: 'officer' }, requires: { documents: ['return-form'] }, effects: ['programme.checkReturn'] },
    { key: 'accept', label: 'Validated: accept the return', from: ['validation'], to: 'accepted', needs: { role: 'officer' }, requires: { reasons: true }, effects: ['programme.recordReturn'] },
    { key: 'reject', label: 'Reject, with reasons', from: ['validation', 'correction-requested'], to: 'rejected', needs: { role: 'signatory' }, requires: { reasons: true } },
  ],
  tests: [
    { name: 'accepted after a correction', steps: [
      { action: 'register', expect: 'refused' },
      { action: 'register', fields: { reporter: 'ORG-1', programme: 'PHP-1', area: 'North', period: { from: '2026-01-01', to: '2026-03-31' }, counts: [{ indicator: 'a', basis: 'reported', quality: 'counted', value: 1 }] }, documents: ['return-form'], expect: 'validation' },
      { action: 'request-correction', expect: 'correction-requested' }, { action: 'record-correction', expect: 'validation' }, { action: 'accept', expect: 'accepted' },
    ] },
    { name: 'rejected', steps: [
      { action: 'register', fields: { reporter: 'ORG-1', programme: 'PHP-1', area: 'North', period: { from: '2026-01-01', to: '2026-03-31' }, counts: [{ indicator: 'a', basis: 'reported', quality: 'counted', value: 1 }] }, documents: ['return-form'], expect: 'validation' },
      { action: 'reject', expect: 'rejected' },
    ] },
  ],
};

export const REFERENCE_RISK_COMMUNICATION: Ref = {
  ...base, key: 'public-health.risk-communication', version: 1, title: 'Approval of a public-health risk communication', refPrefix: 'PHM',
  authority: { permitType: PROGRAMME_PERMITS['public-health.risk-communication']! },
  fields: [
    { ...PROGRAMME, label: 'Programme it belongs to, if any (PHP-…)' },
    text('message', 'The message, exactly as it is to be released', 'public', true, 'About a risk to the public or a group. Never a named person or anyone\'s health details.'),
    configured('audience', 'Audience', 'public-health.country.communication_audiences', 'audiences for public-health communications'),
    configured('channels', 'Channels', 'public-health.country.communication_channels', 'channels for public-health communications', true),
    { ...AREAS, label: 'Areas (the nation\'s regions; none: the whole nation)' },
    text('evidenceBasis', 'Evidence basis (the aggregate figures, with their classes, and the assessment the message rests on)', 'administrative', true, NO_PERSON),
  ],
  documents: [{ class: 'draft-message', label: 'The draft message', required: true }, { class: 'evidence', label: 'Evidence the message rests on', required: true, multiple: true }],
  stages: [
    { key: 'drafted', label: 'Drafted' }, { key: 'review', label: 'Review' }, { key: 'pending-approval', label: 'Approval' },
    { key: 'approved', label: 'Approved for release' }, { key: 'released', label: 'Released', terminal: true },
    { key: 'not-approved', label: 'Not approved', terminal: true }, { key: 'withdrawn', label: 'Withdrawn', terminal: true },
  ],
  actions: [
    { key: 'register', label: 'Register the draft', from: ['drafted'], to: 'review', needs: { role: 'officer' }, requires: { fields: ['message', 'audience', 'evidenceBasis'], documents: ['draft-message'] } },
    { key: 'propose', label: 'Reviewed: propose for approval', from: ['review'], to: 'pending-approval', needs: { role: 'officer' }, requires: { documents: ['evidence'], reasons: true } },
    { key: 'return', label: 'Return to review', from: ['pending-approval'], to: 'review', needs: { role: 'signatory' }, requires: { reasons: true } },
    { key: 'approve', label: 'Approve the message for release', from: ['pending-approval'], to: 'approved', decision: 'approve-message', needs: { role: 'signatory', fourEyes: true }, requires: { reasons: true }, effects: ['communication.approve'] },
    { key: 'refuse', label: 'Do not approve, with reasons', from: ['pending-approval'], to: 'not-approved', decision: 'refuse', needs: { role: 'signatory', fourEyes: true }, requires: { reasons: true } },
    { key: 'release', label: 'Record the release (exactly as approved)', from: ['approved'], to: 'released', needs: { role: 'officer' }, effects: ['communication.release'] },
    { key: 'withdraw', label: 'Withdraw', from: ['drafted', 'review', 'approved'], to: 'withdrawn', needs: { role: 'signatory' }, requires: { reasons: true } },
  ],
  tests: [
    { name: 'approved and released', steps: [
      { action: 'register', expect: 'refused' },
      { action: 'register', fields: { message: 'Boil water before drinking in the area.', audience: 'a-1', evidenceBasis: 'Aggregate counts' }, documents: ['draft-message'], expect: 'review' },
      { action: 'propose', documents: ['evidence'], expect: 'pending-approval' }, { action: 'return', expect: 'review' }, { action: 'propose', expect: 'pending-approval' },
      { action: 'approve', expect: 'approved' }, { action: 'release', expect: 'released' },
    ] },
    { name: 'not approved', steps: [
      { action: 'register', fields: { message: 'Boil water before drinking in the area.', audience: 'a-1', evidenceBasis: 'Aggregate counts' }, documents: ['draft-message'], expect: 'review' },
      { action: 'propose', documents: ['evidence'], expect: 'pending-approval' }, { action: 'refuse', expect: 'not-approved' },
    ] },
  ],
};

export const PROGRAMME_PROCEDURES: Ref[] = [REFERENCE_PROGRAMME, REFERENCE_PROGRAMME_CHANGE, REFERENCE_INTERVENTION, REFERENCE_PROGRAMME_RETURN, REFERENCE_RISK_COMMUNICATION];

export function installProgrammeProcedures(by: string): { drafted: string[]; present: string[] } {
  const drafted: string[] = [], present: string[] = [];
  for (const p of PROGRAMME_PROCEDURES) {
    if (listPackages({ key: p.key }).length) { present.push(p.key); continue; }
    const r = draftPackage(p, by, undefined, registeredEffects());
    if (!('error' in r)) drafted.push(p.key);
  }
  return { drafted, present };
}
