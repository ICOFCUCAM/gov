// The catalogue's missing field contracts, written by CivicOS in controlled
// batches (owner's direction of 21 October 2026,
// docs/forms-catalogue/DIRECTION-2026-10-21-REGISTER-FIRST.md: register
// first, then contracts in batches, validated automatically, none approved).
//
// Batch 1 (owner approved): the health regulator's own forms, allowed scope
// only. Ten health facility licensing forms (HLT-FAC-001 … 010), fourteen
// health professions licensing forms (HLT-LIC-001 … 014) and the public-health
// aggregate return (HLT-PH-015, counts only), from the field series Part 6
// (docs/forms-catalogue/FIELD-SERIES-PARTS-05-07.md).
//
// Batch 2 (owner approved): medicines and medical devices regulation, Part 6
// §5, records of products, of organisations (holders, manufacturers,
// importers: organisations in the register, never a second identity) and of
// the regulator's decisions only. HLT-MED-001 … 015, 017 … 020, 023 and 024;
// HLT-MED-016, 021 and 022 are excluded by the approved scope and have no
// contract. The safety and incident reports (HLT-MED-015, 020) are about the
// product: no patient identity, no structured clinical field. HLT-MED-004 is
// the field series' additional information request, matched to that row and
// read for scope against Part 6 (form.catalogueSource), never the
// supplement's excluded Stage B form of the same ID.
//
// Batch 3 (owner approved): taxpayer registration and account maintenance,
// the field series Part 2 §2.6 Department A (docs/forms-catalogue/
// FIELD-SERIES-PARTS-01-02.md): 21 of the 22 forms of its service table
// (all but the business registration, whose contract is the catalogue's own,
// ./canonical/forms) and its 8 internal forms, 29 in all. Every field is restricted and
// under tax secrecy (confidentiality tax), read only under canReadTax();
// others learn status only through the taxpayer.status exchange service, and
// the certificates state only what it returns. A business is the
// organisations register's, an institution the institution register's, a
// person the civil register's; the taxpayer identification number is the
// register's. No rate, threshold, trigger, deadline or fee is typed: each is a
// binding rule and a named nation value; tax types, taxpayer categories and
// obligations ship empty. The catalogue names
// taxpayer.registration.further_information twice (the service table and the
// internal forms): the second contract takes the register row ID
// (…@P2) as its form ID, and each names its line.
//
// Batch 4 (owner approved, as part of finishing the Health I4 dependency
// public-health-programmes): public-health programme forms, the field series
// Part 6 §4.1. HLT-PH-011 (vaccination programme administration: sessions
// planned and held, doses administered and programme supply received and
// used, as aggregates by area and period; never a vaccinee) and HLT-PH-014
// (risk communication approval: the message, its audience, channels and
// evidence basis, approved by two officials and released exactly as
// approved). Both are linked by identity to the public-health procedures
// (lib/health/programmes/procedures.ts); every individual public-health form
// stays excluded (docs/requirements/form-scope.json).
//
// Batch 5 (owner approved): internal administration, the supplement's Part 21
// (docs/forms-catalogue/SUPPLEMENT-PARTS-14-22-AND-CONTRACTS-05-13.md §21.1):
// all 40 ADM-* forms. Owner `institution`: each institution adopts the
// internal-administration procedures as its own (adm.<template>.<institution>,
// lib/administration/procedures.ts) and its own officials decide; never a
// ministry, never a central administrator. Nine are linked to those
// procedures by identity (establishment, payroll input, review and
// correction, privileged access, internal policy, delegation, disciplinary
// and legal advice); the others name the procedure they wait for. The seven
// forms whose own JSON contract the supplement gives (§21.2: ADM-HR-002,
// ADM-PAY-012, ADM-PRC-018, ADM-ICT-029, ADM-ICT-030, ADM-AUD-036,
// ADM-GOV-039) answer every line of it, field by field. Separation of duties
// is the procedure's distinctFrom step through dualControlRefusal() and the
// registered SEPARATION-OF-DUTIES and APPROVER-DIFFERS-FROM-MAKER rules;
// personnel, disciplinary and legal-advice data are restricted and every read
// logged; grades, entitlements, rates, limits, schedules and scales are the
// nation's (binding rules, named nation values), none shipped.
//
// Each contract is a JSON file in the canonical format
// (civicos.form-contract.v1, lib/forms/canonical.ts; never a second format),
// with two blocks of its own beside the fields: `catalogue` names the one
// register row it answers (source file and catalogue ID, so an ID the
// catalogue reuses is matched to one form only), and `library` carries what
// the form library needs: title and introduction, the authority from the
// deployment profile (never a ministry), the reference procedure and stage it
// belongs to or, where none exists, the stage it is intended for, the lists
// proposed to the nation, the values the nation's law decides (each named,
// none set), every deviation with the binding rule that requires it, and the
// catalogue passages it answers, each quoted verbatim with what meets it. The
// passages every contract answers the same way are in
// ./catalogue-contracts/shared/common-items.json. The conformance test
// (lib/forms/catalogue-contracts.test.ts) checks all of it against the
// documents. A contract carries no status: its register status is derived by
// lib/forms/publication.ts and is a contract draft until a procedure carrying
// it passes every gate.

import { importCanonicalForm, type CanonicalForm, type CanonicalDefinition, type CanonicalNote } from '../canonical';
import { fieldGroup } from './catalogue';
import { IDENTITY_EVIDENCE, standardNotices } from '../blocks';
import type { FormSpec } from '../contract';
import { ambiguityRefusal, catalogueEntries, formIdentity, parseFormIdentity, sameForm } from '../identity';
import common from './catalogue-contracts/shared/common-items.json';
import fac001 from './catalogue-contracts/HLT-FAC-001.json';
import fac002 from './catalogue-contracts/HLT-FAC-002.json';
import fac003 from './catalogue-contracts/HLT-FAC-003.json';
import fac004 from './catalogue-contracts/HLT-FAC-004.json';
import fac005 from './catalogue-contracts/HLT-FAC-005.json';
import fac006 from './catalogue-contracts/HLT-FAC-006.json';
import fac007 from './catalogue-contracts/HLT-FAC-007.json';
import fac008 from './catalogue-contracts/HLT-FAC-008.json';
import fac009 from './catalogue-contracts/HLT-FAC-009.json';
import fac010 from './catalogue-contracts/HLT-FAC-010.json';
import lic001 from './catalogue-contracts/HLT-LIC-001.json';
import lic002 from './catalogue-contracts/HLT-LIC-002.json';
import lic003 from './catalogue-contracts/HLT-LIC-003.json';
import lic004 from './catalogue-contracts/HLT-LIC-004.json';
import lic005 from './catalogue-contracts/HLT-LIC-005.json';
import lic006 from './catalogue-contracts/HLT-LIC-006.json';
import lic007 from './catalogue-contracts/HLT-LIC-007.json';
import lic008 from './catalogue-contracts/HLT-LIC-008.json';
import lic009 from './catalogue-contracts/HLT-LIC-009.json';
import lic010 from './catalogue-contracts/HLT-LIC-010.json';
import lic011 from './catalogue-contracts/HLT-LIC-011.json';
import lic012 from './catalogue-contracts/HLT-LIC-012.json';
import lic013 from './catalogue-contracts/HLT-LIC-013.json';
import lic014 from './catalogue-contracts/HLT-LIC-014.json';
import ph015 from './catalogue-contracts/HLT-PH-015.json';
import ph011 from './catalogue-contracts/HLT-PH-011.json';
import ph014 from './catalogue-contracts/HLT-PH-014.json';
import med001 from './catalogue-contracts/HLT-MED-001.json';
import med002 from './catalogue-contracts/HLT-MED-002.json';
import med003 from './catalogue-contracts/HLT-MED-003.json';
import med004 from './catalogue-contracts/HLT-MED-004.json';
import med005 from './catalogue-contracts/HLT-MED-005.json';
import med006 from './catalogue-contracts/HLT-MED-006.json';
import med007 from './catalogue-contracts/HLT-MED-007.json';
import med008 from './catalogue-contracts/HLT-MED-008.json';
import med009 from './catalogue-contracts/HLT-MED-009.json';
import med010 from './catalogue-contracts/HLT-MED-010.json';
import med011 from './catalogue-contracts/HLT-MED-011.json';
import med012 from './catalogue-contracts/HLT-MED-012.json';
import med013 from './catalogue-contracts/HLT-MED-013.json';
import med014 from './catalogue-contracts/HLT-MED-014.json';
import med015 from './catalogue-contracts/HLT-MED-015.json';
import med017 from './catalogue-contracts/HLT-MED-017.json';
import med018 from './catalogue-contracts/HLT-MED-018.json';
import med019 from './catalogue-contracts/HLT-MED-019.json';
import med020 from './catalogue-contracts/HLT-MED-020.json';
import med023 from './catalogue-contracts/HLT-MED-023.json';
import med024 from './catalogue-contracts/HLT-MED-024.json';
import txIndividual from './catalogue-contracts/taxpayer.registration.individual.json';
import txPublicEntity from './catalogue-contracts/taxpayer.registration.public_entity.json';
import txNonresident from './catalogue-contracts/taxpayer.registration.nonresident.json';
import txBranch from './catalogue-contracts/taxpayer.registration.branch.json';
import txAmend from './catalogue-contracts/taxpayer.registration.amend.json';
import txDetailsChange from './catalogue-contracts/taxpayer.details.change.json';
import txObligationAdd from './catalogue-contracts/taxpayer.obligation.add.json';
import txObligationCancel from './catalogue-contracts/taxpayer.obligation.cancel.json';
import txTransfer from './catalogue-contracts/taxpayer.registration.transfer.json';
import txCertificateRequest from './catalogue-contracts/taxpayer.certificate.request.json';
import txAccountStatement from './catalogue-contracts/taxpayer.account.statement.json';
import txDuplicate from './catalogue-contracts/taxpayer.registration.duplicate.json';
import txSuspendRequest from './catalogue-contracts/taxpayer.registration.suspend_request.json';
import txReactivateRequest from './catalogue-contracts/taxpayer.registration.reactivate_request.json';
import txObjection from './catalogue-contracts/taxpayer.registration.objection.json';
import txAppeal from './catalogue-contracts/taxpayer.registration.appeal.json';
import txWithdraw from './catalogue-contracts/taxpayer.registration.withdraw.json';
import txDecision from './catalogue-contracts/taxpayer.registration.decision.json';
import txDecisionRecord from './catalogue-contracts/taxpayer.registration.decision_record.json';
import txInspection from './catalogue-contracts/taxpayer.registration.inspection.json';
import txInspectionChecklist from './catalogue-contracts/taxpayer.registration.inspection_checklist.json';
import txFurtherInformation from './catalogue-contracts/taxpayer.registration.further_information.json';
import txFurtherInformationP2 from './catalogue-contracts/taxpayer.registration.further_information@P2.json';
import txReferral from './catalogue-contracts/taxpayer.registration.referral.json';
import txReferralRecord from './catalogue-contracts/taxpayer.registration.referral_record.json';
import txAssessment from './catalogue-contracts/taxpayer.registration.assessment.json';
import txVerificationRecord from './catalogue-contracts/taxpayer.registration.verification_record.json';
import txAppealAssessment from './catalogue-contracts/taxpayer.registration.appeal_assessment.json';
import txClosureRecord from './catalogue-contracts/taxpayer.registration.closure_record.json';
import admHr001 from './catalogue-contracts/ADM-HR-001.json';
import admHr002 from './catalogue-contracts/ADM-HR-002.json';
import admHr003 from './catalogue-contracts/ADM-HR-003.json';
import admHr004 from './catalogue-contracts/ADM-HR-004.json';
import admHr005 from './catalogue-contracts/ADM-HR-005.json';
import admHr006 from './catalogue-contracts/ADM-HR-006.json';
import admHr007 from './catalogue-contracts/ADM-HR-007.json';
import admHr008 from './catalogue-contracts/ADM-HR-008.json';
import admHr009 from './catalogue-contracts/ADM-HR-009.json';
import admHr010 from './catalogue-contracts/ADM-HR-010.json';
import admPay011 from './catalogue-contracts/ADM-PAY-011.json';
import admPay012 from './catalogue-contracts/ADM-PAY-012.json';
import admPay013 from './catalogue-contracts/ADM-PAY-013.json';
import admFin014 from './catalogue-contracts/ADM-FIN-014.json';
import admFin015 from './catalogue-contracts/ADM-FIN-015.json';
import admFin016 from './catalogue-contracts/ADM-FIN-016.json';
import admFin017 from './catalogue-contracts/ADM-FIN-017.json';
import admPrc018 from './catalogue-contracts/ADM-PRC-018.json';
import admPrc019 from './catalogue-contracts/ADM-PRC-019.json';
import admPrc020 from './catalogue-contracts/ADM-PRC-020.json';
import admPrc021 from './catalogue-contracts/ADM-PRC-021.json';
import admAst022 from './catalogue-contracts/ADM-AST-022.json';
import admAst023 from './catalogue-contracts/ADM-AST-023.json';
import admAst024 from './catalogue-contracts/ADM-AST-024.json';
import admRec025 from './catalogue-contracts/ADM-REC-025.json';
import admRec026 from './catalogue-contracts/ADM-REC-026.json';
import admLeg027 from './catalogue-contracts/ADM-LEG-027.json';
import admLeg028 from './catalogue-contracts/ADM-LEG-028.json';
import admIct029 from './catalogue-contracts/ADM-ICT-029.json';
import admIct030 from './catalogue-contracts/ADM-ICT-030.json';
import admIct031 from './catalogue-contracts/ADM-ICT-031.json';
import admIct032 from './catalogue-contracts/ADM-ICT-032.json';
import admCom033 from './catalogue-contracts/ADM-COM-033.json';
import admCom034 from './catalogue-contracts/ADM-COM-034.json';
import admAud035 from './catalogue-contracts/ADM-AUD-035.json';
import admAud036 from './catalogue-contracts/ADM-AUD-036.json';
import admPln037 from './catalogue-contracts/ADM-PLN-037.json';
import admPln038 from './catalogue-contracts/ADM-PLN-038.json';
import admGov039 from './catalogue-contracts/ADM-GOV-039.json';
import admGov040 from './catalogue-contracts/ADM-GOV-040.json';

/** What meets a catalogue passage: fields of the contract, a documented deviation, a platform rule (with the file that enforces it), a country decision, a step of the linked procedure, an exchange service or a policy of the form. */
export interface MetBy {
  fields?: string[];
  deviation?: string;
  platform?: { file: string; how: string };
  country_decision?: string;
  procedure?: string;
  exchange?: string;
  policy?: string;
}
/** A catalogue passage the contract answers: its source line and the pieces of it quoted verbatim. */
export interface CatalogueItem { source: string; line: number; quotes: string[]; met_by: MetBy }
/** The reference procedure (and stage, step and document) a form belongs to. */
export interface ProcedureLink { key: string; stage: string; action?: string; document?: string; also?: string[] }
/** A value the nation's law decides: named, never set (a fee rule, a day count, a period, a threshold, an amount of continuing education). */
export interface NationValue { key: string; kind: 'fee' | 'days' | 'period' | 'threshold' | 'hours' | 'rate'; source: 'rule' | 'setting' | 'procedure'; decision: string }
export interface CatalogueDeviation { id: string; field?: string; what: string; why: string; rule: string }

export interface CatalogueContractJson extends CanonicalForm {
  catalogue: { source: string; id: string; part: number; section: string; line: number; batch: number };
  library: {
    title: string; intro: string; owner: string; filled_by: string; authority?: string;
    procedure: ProcedureLink | null; exchange?: string; intended?: string;
    lists: Record<string, { values: { value: string; label: string }[]; proposed?: boolean }>;
    policies?: Record<string, string>;
    nation_values: NationValue[];
    deviations: CatalogueDeviation[];
    catalogue_items: CatalogueItem[];
  };
}

export interface CatalogueLibraryForm extends CanonicalDefinition {
  /** The catalogue ID (the form's id in the register). Never the form's identity on its own: see `identity`. */
  specId: string;
  /** Its identity, catalogue + form ID + version (lib/forms/identity.ts): also its library key. */
  identity: string;
  catalogue: CatalogueContractJson['catalogue'];
  batch: number;
  owner: string;
  filledBy: string;
  authorityNote?: string;
  /** The reference procedure it belongs to, where one exists. */
  procedure: ProcedureLink | null;
  exchange?: string;
  /** Where no procedure exists: the stage it is intended for (a library form waits for it). */
  awaits?: string;
  nationValues: NationValue[];
  deviations: CatalogueDeviation[];
  /** Its own catalogue passages and the shared ones. */
  items: CatalogueItem[];
  notes: CanonicalNote[];
  json: CatalogueContractJson;
}

const CHANNELS = (filledBy: string): FormSpec['channels'] => ({
  selfService: `Answered one question at a time; answers are kept on this device until sent, and a reference is given at once. Who completes it: ${filledBy}`.slice(0, 600),
  assisted: 'An official fills in the same form with the person at an office, records which identity document they saw (never its number) and gives a receipt with the reference.',
  paper: 'The printed form asks the same questions. An official types it in from the paper; the case records that it came on paper and who transcribed it.',
  lowConnectivity: 'If the connection drops, the answers stay on the device. Sending again never makes a second submission: the platform recognises it and gives the same reference.',
});

/** Batch 1: health regulation (owner approved, 21 October 2026). */
export const BATCH_1 = [fac001, fac002, fac003, fac004, fac005, fac006, fac007, fac008, fac009, fac010,
  lic001, lic002, lic003, lic004, lic005, lic006, lic007, lic008, lic009, lic010, lic011, lic012, lic013, lic014, ph015] as unknown as CatalogueContractJson[];
/** Batch 2: medicines and medical devices regulation (owner approved, 21 October 2026). */
export const BATCH_2 = [med001, med002, med003, med004, med005, med006, med007, med008, med009, med010, med011, med012, med013, med014, med015, med017, med018, med019, med020, med023, med024] as unknown as CatalogueContractJson[];
/** Batch 3: taxpayer registration and account (owner approved, 21 October 2026). */
export const BATCH_3 = [txIndividual, txPublicEntity, txNonresident, txBranch, txAmend, txDetailsChange, txObligationAdd, txObligationCancel, txTransfer, txCertificateRequest, txAccountStatement, txDuplicate, txSuspendRequest, txReactivateRequest, txObjection, txAppeal, txWithdraw, txDecision, txDecisionRecord, txInspection, txInspectionChecklist, txFurtherInformation, txFurtherInformationP2, txReferral, txReferralRecord, txAssessment, txVerificationRecord, txAppealAssessment, txClosureRecord] as unknown as CatalogueContractJson[];
/** Batch 4: public-health programme forms (owner approved, 21 October 2026). */
export const BATCH_4 = [ph011, ph014] as unknown as CatalogueContractJson[];
/** Batch 5: internal administration, supplement Part 21 (owner approved, 21 October 2026). */
export const BATCH_5 = [admHr001, admHr002, admHr003, admHr004, admHr005, admHr006, admHr007, admHr008, admHr009, admHr010, admPay011, admPay012, admPay013, admFin014, admFin015, admFin016, admFin017, admPrc018, admPrc019, admPrc020, admPrc021, admAst022, admAst023, admAst024, admRec025, admRec026, admLeg027, admLeg028, admIct029, admIct030, admIct031, admIct032, admCom033, admCom034, admAud035, admAud036, admPln037, admPln038, admGov039, admGov040] as unknown as CatalogueContractJson[];
/** The passages contracts answer the same way: every item applies to the forms in applies_to, an item with `for` only to that group (health: batches 1 and 2; tax: batch 3; adm: batch 5). */
export const COMMON_ITEMS = (common as unknown as { applies_to: string[]; groups: Record<string, string[]>; items: (CatalogueItem & { for?: string })[] });
/** The shared items that apply to one contract. */
export const commonItemsFor = (formId: string): CatalogueItem[] => (COMMON_ITEMS.applies_to.includes(formId) ? COMMON_ITEMS.items.filter(i => !i.for || COMMON_ITEMS.groups[i.for]?.includes(formId)).map(({ for: _for, ...i }) => i) : []);
/** Who the standard notices name, by the deployment-profile slot that owns the form. */
const INSTITUTION: Record<string, string> = { professionalRegulation: 'The professional regulator', tax: 'The tax authority', publicHealth: 'The public-health authority', institution: 'This institution' };

function load(c: CatalogueContractJson, batch: number): CatalogueLibraryForm {
  const { definition, notes } = importCanonicalForm(c, { title: c.library.title, groups: fieldGroup });
  const l = c.library;
  const form: FormSpec = {
    ...definition.form,
    intro: l.intro,
    catalogueIds: [c.catalogue.id],
    // An ID the catalogue reuses for another form is read for scope against this document only (lib/forms/scope.ts).
    catalogueSource: c.catalogue.source,
    ...(Object.keys(l.lists).length ? { lists: structuredClone(l.lists) } : {}),
    ...(l.policies ? { policies: { ...l.policies } } : {}),
    notices: standardNotices({ institution: INSTITUTION[l.owner] ?? (batch === 2 ? 'The medicines regulator' : 'The health regulator') }),
    channels: CHANNELS(l.filled_by),
    identityEvidence: IDENTITY_EVIDENCE,
  };
  // The library key is the identity: a bare catalogue ID never identifies the form (owner's direction 2026-10-21, health integration §1).
  const identity = formIdentity({ source: c.catalogue.source, formId: c.form_id, version: c.form_version });
  return {
    ...definition, key: identity, identity, form, specId: c.form_id, catalogue: { ...c.catalogue }, batch,
    owner: l.owner, filledBy: l.filled_by, ...(l.authority ? { authorityNote: l.authority } : {}),
    procedure: l.procedure ? { ...l.procedure } : null, ...(l.exchange ? { exchange: l.exchange } : {}), ...(l.intended ? { awaits: l.intended } : {}),
    nationValues: l.nation_values.map(v => ({ ...v })), deviations: l.deviations.map(d => ({ ...d })),
    items: [...l.catalogue_items, ...commonItemsFor(c.form_id)],
    notes, json: c,
  };
}

/** Every catalogue contract CivicOS has written, as library drafts. */
export const CATALOGUE_CONTRACTS: CatalogueLibraryForm[] = [...BATCH_1.map(c => load(c, 1)), ...BATCH_2.map(c => load(c, 2)), ...BATCH_3.map(c => load(c, 3)), ...BATCH_4.map(c => load(c, 4)), ...BATCH_5.map(c => load(c, 5))];

/**
 * A catalogue contract by its identity (CATALOGUE:FORM-ID@VERSION; without
 * the version, the one contract of that catalogue entry), or by a bare
 * catalogue ID only where no other catalogue uses that ID. An ambiguous bare
 * ID is refused with the candidates, never resolved to one of them.
 */
export function catalogueContract(ref: string): CatalogueLibraryForm | { error: string; candidates: string[] } | undefined {
  const id = parseFormIdentity(ref);
  if (id) {
    const hits = CATALOGUE_CONTRACTS.filter(f => sameForm(parseFormIdentity(f.identity), id, { version: !!id.version }));
    return hits.length === 1 ? hits[0] : undefined;
  }
  const bare = ref.replace(/^library\./, '').toUpperCase();
  const mine = CATALOGUE_CONTRACTS.filter(f => f.specId.toUpperCase() === bare);
  const entries = catalogueEntries(bare);
  const candidates = [...new Set([...mine.map(f => f.identity), ...entries.filter(e => !mine.some(f => parseFormIdentity(f.identity)!.catalogue === e.catalogue)).map(e => e.identity)])];
  if (candidates.length > 1) return { error: ambiguityRefusal(bare, candidates.map(identity => ({ ...(entries.find(e => identity.startsWith(`${e.catalogue}:`)) ?? {}), identity })))!, candidates };
  return mine[0];
}
