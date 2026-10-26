// Conformance of the catalogue contracts CivicOS wrote (batch 1, health
// regulation: HLT-FAC-001 … 010, HLT-LIC-001 … 014, HLT-PH-015; batch 2,
// medicines and medical devices regulation: HLT-MED-001 … 015, 017 … 020,
// 023, 024; batch 3, taxpayer registration and account: the 29
// taxpayer.* rows of Part 2 §2.6; batch 4, public-health programme forms:
// HLT-PH-011, HLT-PH-014; batch 5, internal administration: the 40 ADM-*
// forms of the supplement's Part 21; batch 6, tax services: the 95 tax.* rows
// of Part 2 §2.6 Departments B–H; batch 7, independent oversight: DEM-CON-012,
// 013, 014, 018, 019, 020 and DEM-PUB-009; batch 8, executive office, Cabinet,
// treasury and budget: 57 rows of Part 2 §2.1, §2.2, §2.4 and §2.5; batch 10,
// territory and infrastructure: 12 LND-REG, 14 HPC, 5 LRG and 5 TRN forms) to the
// documents they answer (docs/FORMS_CONFORMANCE.md §8, §9, §10, §12, §13, §14,
// §15, §16, §18). The test holds its
// own list of the catalogue lines each form must answer and reads the
// documents themselves: every piece of every line (each table cell, list item
// and sentence) is quoted verbatim by the contract and met by a field, a
// named deviation, a country decision, a step of the linked procedure, an
// exchange service, a policy of the form or a platform rule whose file
// exists. Then, for each form: every field typed and classed with registered
// rules only; nothing in the binding scope; nothing a law decides set; the
// same questions in all three channels; and a register status of contract
// draft, never approved.
import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import * as React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { CATALOGUE_CONTRACTS, BATCH_1, BATCH_2, BATCH_3, BATCH_4, BATCH_5, BATCH_6, BATCH_7, BATCH_8, BATCH_9, BATCH_10, COMMON_ITEMS, type CatalogueLibraryForm } from './library/catalogue-contracts';
import { CANONICAL_LIBRARY } from './library/catalogue';
import SPEC_TAXPAYER from './library/spec/taxpayer-registration-v1.json';
import { SPEC_CLASSES } from './spec-import';
import { CLASS_RANK, DATA_CLASSES, FIELD_TYPES, fieldProblem, formProblem, type ContractField } from './contract';
import { isRegisteredRule, RULE_REGISTRY } from './rules';
import { scopeOf, formScope } from './scope';
import { formView } from './server';
import { libraryPublication } from './publication';
import { findLibraryForm } from './page-data';
import { ruleInForce } from '@/lib/law/rules';
import { HEALTH_PROCEDURES } from '@/lib/health/procedures';
import { PROFESSION_PROCEDURES } from '@/lib/professions/procedures';
import { TAX_PROCEDURES } from '@/lib/tax/procedures';
import { PRODUCT_PROCEDURES } from '@/lib/health/products/procedures';
import { PROGRAMME_PROCEDURES } from '@/lib/health/programmes/procedures';
import { COMPLAINT_PROCEDURES } from '@/lib/health/complaints/procedures';
import { INDEPENDENT_OVERSIGHT_PROCEDURES } from '@/lib/oversight/procedures';
import { ADMINISTRATION_PROCEDURES } from '@/lib/administration/procedures';
import { LAND_PROCEDURES } from '@/lib/land/procedures';
import { BUILDING_PROCEDURES } from '@/lib/building/procedures';
import { HOUSING_PROCEDURES } from '@/lib/housing/procedures';
import { LOCAL_GOVERNMENT_TEMPLATES } from '@/lib/localgov/procedures';
import { TRANSPORT_PROCEDURES } from '@/lib/transport/procedures';
import { FINANCE_PROCEDURES } from '@/lib/finance/procedures';
import { CABINET_PROCEDURES } from '@/lib/cabinet/procedures';
import { PROCUREMENT_PROCEDURES } from '@/lib/procurement/procedures';
import { IDENTITY_PROCEDURES } from '@/lib/identity/procedures';
import { PASSPORT_PROCEDURES } from '@/lib/passports/procedures';
import { CITIZENSHIP_PROCEDURES } from '@/lib/citizenship/procedures';
import { LABOUR_PROCEDURES } from '@/lib/labour/procedures';
import { SOCIAL_PROCEDURES } from '@/lib/social/procedures';
import { dualControlRefusal } from '@/lib/data/dual-control';
import { serviceDirectory } from '@/lib/exchange/services';
import { AUTHORITIES } from '@/lib/nation/deployment';
import { pagesOf } from '@/components/features/forms/answers';
import { FormRenderer } from '@/components/features/forms/FormRenderer';
import { PrintForm } from '@/components/features/forms/PrintForm';

const ROOT = join(process.cwd(), '..');
const SRC = {
  A: 'docs/forms-catalogue/FIELD-SERIES-PARTS-05-07.md',
  B: 'docs/forms-catalogue/FIELD-SERIES-PARTS-01-02.md',
  C: 'docs/forms-catalogue/SUPPLEMENT-PARTS-14-22-AND-CONTRACTS-05-13.md',
  D: 'docs/INSTITUTIONAL_ARCHITECTURE_SPEC.md',
  E: 'docs/forms-catalogue/PARTS-12-13.md',
  F: 'docs/forms-catalogue/PARTS-08-11.md',
  G: 'docs/forms-catalogue/FIELD-SERIES-PARTS-03-04.md',
} as const;
type Src = keyof typeof SRC;
const DOC = Object.fromEntries(Object.entries(SRC).map(([k, p]) => [k, readFileSync(join(ROOT, p), 'utf8').split('\n')])) as Record<Src, string[]>;
const range = (a: number, b: number) => Array.from({ length: b - a + 1 }, (_, i) => a + i);

const IDS_1 = [...range(1, 10).map(n => `HLT-FAC-${String(n).padStart(3, '0')}`), ...range(1, 14).map(n => `HLT-LIC-${String(n).padStart(3, '0')}`), 'HLT-PH-015'];
// Batch 2: HLT-MED-016, 021 and 022 are excluded by the approved scope (docs/requirements/form-scope.json) and have no contract.
const IDS_2 = [...range(1, 15), ...range(17, 20), 23, 24].map(n => `HLT-MED-${String(n).padStart(3, '0')}`);
// Batch 3: every taxpayer.* row of the register but the business registration (its contract is the catalogue's own). Two rows share the
// catalogue ID taxpayer.registration.further_information (the service table, line 2543; the internal forms, line 2714): the second is …@P2.
const IDS_3 = [
  'taxpayer.registration.individual', 'taxpayer.registration.public_entity', 'taxpayer.registration.nonresident', 'taxpayer.registration.branch',
  'taxpayer.registration.amend', 'taxpayer.details.change', 'taxpayer.obligation.add', 'taxpayer.obligation.cancel', 'taxpayer.registration.transfer',
  'taxpayer.certificate.request', 'taxpayer.account.statement', 'taxpayer.registration.duplicate', 'taxpayer.registration.suspend_request',
  'taxpayer.registration.reactivate_request', 'taxpayer.registration.objection', 'taxpayer.registration.appeal', 'taxpayer.registration.withdraw',
  'taxpayer.registration.decision', 'taxpayer.registration.inspection', 'taxpayer.registration.further_information', 'taxpayer.registration.referral',
  'taxpayer.registration.assessment', 'taxpayer.registration.verification_record', 'taxpayer.registration.inspection_checklist',
  'taxpayer.registration.further_information@P2', 'taxpayer.registration.decision_record', 'taxpayer.registration.referral_record',
  'taxpayer.registration.appeal_assessment', 'taxpayer.registration.closure_record',
];
// Batch 4: public-health programme forms (the individual public-health forms stay excluded by the approved scope).
const IDS_4 = ['HLT-PH-011', 'HLT-PH-014'];
// Batch 5: internal administration, the supplement's Part 21 §21.1, all 40 forms.
const IDS_5 = [
  ...range(1, 10).map(n => `ADM-HR-${String(n).padStart(3, '0')}`), ...range(11, 13).map(n => `ADM-PAY-0${n}`), ...range(14, 17).map(n => `ADM-FIN-0${n}`),
  ...range(18, 21).map(n => `ADM-PRC-0${n}`), ...range(22, 24).map(n => `ADM-AST-0${n}`), 'ADM-REC-025', 'ADM-REC-026', 'ADM-LEG-027', 'ADM-LEG-028',
  ...range(29, 32).map(n => `ADM-ICT-0${n}`), 'ADM-COM-033', 'ADM-COM-034', 'ADM-AUD-035', 'ADM-AUD-036', 'ADM-PLN-037', 'ADM-PLN-038', 'ADM-GOV-039', 'ADM-GOV-040',
];
// Batch 6: tax services, every tax.* row of the register that had no contract (Part 2 §2.6 Departments B–H; the periodic return and the
// inspection checklist have the catalogue's own contracts).
const IDS_6 = [
  'tax.appeal.response', 'tax.appeal.submit', 'tax.appeal.transmit', 'tax.assessment.amendment',
  'tax.assessment.notice', 'tax.assessment.review_request', 'tax.assistance.enquiry', 'tax.assistance.guidance_request',
  'tax.compliance.assessment_decision', 'tax.compliance.case.open', 'tax.compliance.case_closure', 'tax.compliance.complaint',
  'tax.compliance.evidence_register', 'tax.compliance.extension_decision', 'tax.compliance.extension_request', 'tax.compliance.findings_draft',
  'tax.compliance.findings_review', 'tax.compliance.information_request', 'tax.compliance.information_response', 'tax.compliance.inspection_plan',
  'tax.compliance.interview_record', 'tax.compliance.referral', 'tax.compliance.scope.approve', 'tax.compliance.taxpayer_response',
  'tax.credit.adjustment', 'tax.debt.disclosure.assessment', 'tax.debt.payment_plan.cancel_request', 'tax.debt.payment_plan.change_request',
  'tax.debt.payment_plan.decision', 'tax.debt.payment_plan.default_review', 'tax.debt.payment_plan.evidence', 'tax.debt.payment_plan.request',
  'tax.debt.recovery.authorize', 'tax.debt.recovery.close', 'tax.debt.recovery.dispute', 'tax.debt.recovery.notice',
  'tax.debt.recovery.response', 'tax.debt.recovery.suspend_request', 'tax.debt.statement.request', 'tax.debt.voluntary_disclosure',
  'tax.dispute.closure', 'tax.dispute.settlement_proposal', 'tax.dispute.settlement_review', 'tax.dispute.withdraw',
  'tax.incentive.amendment', 'tax.incentive.application', 'tax.incentive.compliance_report', 'tax.incentive.decision',
  'tax.incentive.renewal', 'tax.incentive.review_request', 'tax.incentive.surrender', 'tax.incentive.withdrawal',
  'tax.objection.assessment', 'tax.objection.decision', 'tax.objection.extension_request', 'tax.objection.submit',
  'tax.objection.supplement', 'tax.payment.allocation_request', 'tax.payment.dispute', 'tax.payment.external_reference',
  'tax.payment.initiate', 'tax.payment.reversal_request', 'tax.payment.transfer_request', 'tax.refund.application',
  'tax.refund.assessment', 'tax.refund.decision', 'tax.refund.payment_instruction', 'tax.refund.reconciliation',
  'tax.refund.supporting_evidence', 'tax.return.periodic.amend', 'tax.return.periodic.appeal', 'tax.return.periodic.correction',
  'tax.return.periodic.decision', 'tax.return.periodic.further_information', 'tax.return.periodic.late_submission', 'tax.return.periodic.nil',
  'tax.return.periodic.notice', 'tax.return.periodic.objection', 'tax.return.periodic.officer_assessment', 'tax.return.periodic.withdraw_request',
  'tax.ruling.decision', 'tax.ruling.further_information', 'tax.ruling.reconsideration', 'tax.ruling.request',
  'tax.ruling.withdraw', 'tax.withholding.certificate.issue', 'tax.withholding.details.amend', 'tax.withholding.discrepancy.decision',
  'tax.withholding.discrepancy.response', 'tax.withholding.payment', 'tax.withholding.registration', 'tax.withholding.return.amend',
  'tax.withholding.return.submit', 'tax.withholding.statement.correct', 'tax.withholding.statement.submit',
];
// Batch 7: the Part 12 accountability forms the independent oversight procedures carry (plan I8).
const IDS_7 = ['DEM-CON-012', 'DEM-CON-013', 'DEM-CON-014', 'DEM-CON-018', 'DEM-CON-019', 'DEM-CON-020', 'DEM-PUB-009'];
// Batch 10: territory and infrastructure, the forms the I7 procedures carry (catalogue Parts 8 and 9; the supplement's Parts 19 and 20).
const IDS_10 = [
  'LND-REG-007', 'LND-REG-012', 'LND-REG-008', 'LND-REG-009', 'LND-REG-011', 'LND-REG-020', 'LND-REG-010', 'LND-REG-021', 'LND-REG-016', 'LND-REG-005', 'LND-REG-017', 'LND-REG-022', 'HPC-HOU-001', 'HPC-HOU-002', 'HPC-HOU-003', 'HPC-HOU-004', 'HPC-PLN-009', 'HPC-PLN-012', 'HPC-PLN-013', 'HPC-BLD-014', 'HPC-BLD-015', 'HPC-BLD-016', 'HPC-BLD-017', 'HPC-BLD-018', 'HPC-BLD-019', 'HPC-BLD-020', 'LRG-ORG-005', 'LRG-ORG-004', 'LRG-FIN-008', 'LRG-SVC-013', 'LRG-SVC-014', 'TRN-DRV-001', 'TRN-VEH-001', 'TRN-VEH-002', 'TRN-ROAD-002', 'TRN-OPS-001',
];
// Batch 8: the Part 2 forms of the executive office, Cabinet, treasury and budget the I5 procedures carry or wait for (plan I5).
const IDS_8 = [
  'budget.allocation.approve', 'budget.allocation.notify', 'budget.allocation.propose',
  'budget.bid.justification', 'budget.bid.revise', 'budget.bid.withdraw',
  'budget.ceiling.approve', 'budget.ceiling.propose', 'budget.circular.issue',
  'budget.execution.commitment', 'budget.execution.commitment.approve', 'budget.execution.correction',
  'budget.execution.overrun.report', 'budget.execution.reallocation.approve', 'budget.execution.reallocation.request',
  'budget.execution.supplementary.request', 'budget.execution.underspend.report', 'budget.execution.variance.report',
  'budget.execution.virement', 'budget.execution.year_end', 'budget.negotiation.record',
  'budget.programme.costing', 'exec.cabinet.action.close', 'exec.cabinet.action.update',
  'exec.cabinet.agenda.approve', 'exec.cabinet.agenda.propose', 'exec.cabinet.decision.action_assign',
  'exec.cabinet.decision.correct', 'exec.cabinet.decision.distribution', 'exec.cabinet.decision.record',
  'exec.cabinet.paper.fiscal_review', 'exec.cabinet.paper.legal_review', 'exec.cabinet.paper.revise',
  'exec.presidency.correspondence.complaint', 'exec.presidency.correspondence.decision', 'exec.presidency.correspondence.notice',
  'exec.presidency.correspondence.referral', 'exec.presidency.correspondence.submit', 'exec.presidency.correspondence.supplement',
  'exec.presidency.correspondence.withdraw', 'treasury.cash_forecast.close', 'treasury.cash_forecast.review',
  'treasury.cash_forecast.revise', 'treasury.cash_forecast.submit', 'treasury.cash_position.report',
  'treasury.liquidity.response', 'treasury.liquidity.shortfall', 'treasury.payment.approve',
  'treasury.payment.cancel_request', 'treasury.payment.correction', 'treasury.payment.dispute',
  'treasury.payment.execute', 'treasury.payment.reconcile', 'treasury.payment.refund',
  'treasury.payment.reject', 'treasury.payment.supporting_evidence', 'treasury.payment.verify',
];
// Batch 9: human services, field series Part 4 (IDN, PAS, NAT) and supplement Parts 14 (LAB) and 15 (SOC) (plan I6).
const IDS_9 = [
  'IDN-REG-001', 'IDN-REG-002', 'IDN-REG-003', 'IDN-REG-004', 'IDN-REG-005', 'IDN-CARD-001', 'IDN-CARD-002', 'IDN-CARD-003',
  'IDN-CARD-004', 'IDN-CARD-005', 'IDN-CARD-006', 'IDN-CARD-007', 'IDN-VER-001', 'IDN-VER-002', 'IDN-VER-003', 'IDN-ACC-001',
  'IDN-ACC-002', 'IDN-ACC-003', 'IDN-ACC-004', 'IDN-SEC-001', 'IDN-SEC-002', 'IDN-SEC-003', 'PAS-APP-001', 'PAS-APP-002',
  'PAS-APP-003', 'PAS-APP-004', 'PAS-APP-005', 'PAS-APP-008', 'PAS-APP-009', 'PAS-APP-010', 'PAS-APP-006', 'PAS-APP-007',
  'PAS-APP-011', 'PAS-APP-012', 'PAS-APP-013', 'PAS-APP-014', 'PAS-APP-015', 'PAS-APP-016', 'PAS-APP-017', 'PAS-APP-018',
  'NAT-APP-001', 'NAT-APP-002', 'NAT-APP-003', 'NAT-APP-004', 'NAT-APP-005', 'NAT-APP-006', 'NAT-APP-007', 'NAT-APP-010',
  'NAT-APP-012', 'NAT-APP-008', 'NAT-APP-009', 'NAT-APP-011', 'LAB-EMP-001', 'LAB-EMP-002', 'LAB-EMP-003', 'LAB-EMP-004',
  'LAB-EMP-005', 'LAB-EMP-006', 'LAB-EMP-007', 'LAB-EMP-008', 'LAB-EMP-009', 'LAB-EMP-010', 'LAB-EMP-011', 'LAB-EMP-012',
  'LAB-EMP-013', 'LAB-EMP-014', 'LAB-EMP-015', 'LAB-EMP-016', 'LAB-EMP-017', 'LAB-EMP-018', 'LAB-EMP-019', 'LAB-EMP-020',
  'SOC-BEN-001', 'SOC-BEN-002', 'SOC-BEN-003', 'SOC-BEN-004', 'SOC-BEN-005', 'SOC-BEN-006', 'SOC-BEN-017', 'SOC-BEN-007',
  'SOC-BEN-009', 'SOC-BEN-011', 'SOC-BEN-012', 'SOC-BEN-014', 'SOC-BEN-010', 'SOC-BEN-008', 'SOC-BEN-013', 'SOC-BEN-016',
  'SOC-BEN-021', 'SOC-BEN-022', 'SOC-BEN-023', 'SOC-BEN-024', 'SOC-BEN-015', 'SOC-BEN-018', 'SOC-BEN-019', 'SOC-BEN-020',
];
const IDS = [...IDS_1, ...IDS_2, ...IDS_3, ...IDS_4, ...IDS_5, ...IDS_6, ...IDS_7, ...IDS_8, ...IDS_9, ...IDS_10];
const batchOf = (id: string) => (IDS_10.includes(id) ? 10 : IDS_9.includes(id) ? 9 : IDS_8.includes(id) ? 8 : id.startsWith('ADM-') ? 5 : id.startsWith('tax.') ? 6 : id.startsWith('taxpayer.') ? 3 : id.startsWith('HLT-MED') ? 2 : IDS_4.includes(id) ? 4 : IDS_7.includes(id) ? 7 : 1);
const sourceOf = (id: string): Src => (batchOf(id) === 10 ? (/^(LND|TRN)-/.test(id) ? 'F' : 'C') : batchOf(id) === 9 ? (/^(LAB|SOC)-/.test(id) ? 'C' : 'G') : batchOf(id) === 5 ? 'C' : [3, 6, 8].includes(batchOf(id)) ? 'B' : batchOf(id) === 7 ? 'E' : 'A');
const HUMAN_SLOTS = ['identity', 'travelDocuments', 'citizenship', 'labour', 'socialProtection'];
const OVERSIGHT_SLOTS = ['ombudsman', 'humanRights', 'anticorruption', 'supremeAudit', 'dataProtection'];
const TERRITORY_OWNERS = ['landRegistry', 'buildingControl', 'housing', 'vehicleRegistration', 'roadAuthority', 'transportRegulator', 'institution'];

// ── The catalogue text each form answers (held here, apart from the contracts) ──
// Every form: Part 1's universal rules, the three channels and minimisation, and the supplement's conventions and activation gates.
const COMMON: Partial<Record<Src, number[]>> = {
  B: [...range(1699, 1710), 1756, ...range(1760, 1764), ...range(1769, 1774), ...range(1779, 1784), 1787, 1789, ...range(1792, 1799)],
  C: [...range(144, 156), ...range(2390, 2399)],
};
// Every health form (batches 1 and 2): Part 6's common rules (clinical confidentiality, the access model, the common health schema,
// validation, configuration and acceptance gates).
const COMMON_HEALTH: Partial<Record<Src, number[]>> = {
  A: [496, 498, 509, ...range(786, 794), 809, ...range(811, 825), 841, 850, 851, 855, 870, 873, 875, 876, 885, 886, 887],
};
// Every tax form (batch 3): Part 2 §2.6's opening rules, the business contract's country decisions and the decision-record rule,
// country.tax.registration and the retention record of §2.8 with its versioning rule, the §2.9 gates that apply to registration; the
// specification's tax authority mandate (§5.1), its registration department (§5.2) and the decision controls on amendments, access and the
// twin (§5.5).
const TAX: Partial<Record<Src, number[]>> = {
  B: [2517, 2519, ...range(2700, 2704), 2730, 3219, 3225, 3226, 3231, 3236, 3251, 3256, 3261, 3266, 3271],
  D: [376, 378, 380, 387, 509, 510, 511],
};
const FAMILY: Record<'FAC' | 'LIC' | 'PH' | 'MED', Partial<Record<Src, number[]>>> = {
  FAC: { A: [694, 723, 847, 866, 881, 894], D: [1323] },
  LIC: { A: [504, 694, 723, 847, 865, 881, 894], D: [1324, 1805] },
  PH: { A: [502, 601, 626, 633, 634, ...range(642, 647), 805, 807, 849, 859, 880, 892], D: [1328] },
  // Part 6 §1 (the medicines regulator), §5 and §5.2's closing rule, the regulatory-authority validation, CFG-MED-001 … 003, the
  // regulatory-integrity gate, deliverable 4; the specification's sector-regulator controls (its §9: it has no medicines archetype).
  MED: { A: [505, 649, 688, 847, 862, 863, 864, 881, 893], D: [3237] },
};
// Batch 3: the families of taxpayer forms and the lines each answers.
const TAX_REG: Partial<Record<Src, number[]>> = { D: [386, 403, 501] };
const TAX_AMEND: Partial<Record<Src, number[]>> = { D: [404] };
const TAX_DISPUTE: Partial<Record<Src, number[]>> = { B: [...range(3062, 3070), 3076, 3078, 3223], D: [392, 410, 508] };
const TAX_INSPECT: Partial<Record<Src, number[]>> = { B: [3191, 3194, 3195, 2896, 3043, 3222], D: [397] };
const TAX_DECIDE: Partial<Record<Src, number[]>> = { B: [3191, ...range(2725, 2729), 3193, ...range(3198, 3201)], D: [507] };
const TAX_REQUEST: Partial<Record<Src, number[]>> = { B: [3191, 3196, 3197] };
const TAX_REFER: Partial<Record<Src, number[]>> = { B: [3191, 3202, 3203] };
/** Officers' forms answer the universal control of internal records (§2.7); the internal forms also their opening line. */
const TAX_OFFICER = ['decision', 'decision_record', 'inspection', 'inspection_checklist', 'further_information', 'further_information@P2', 'referral', 'referral_record', 'assessment', 'verification_record', 'appeal_assessment', 'closure_record'].map(x => `taxpayer.registration.${x}`);
const TAX_INTERNAL = ['assessment', 'verification_record', 'inspection_checklist', 'further_information@P2', 'decision_record', 'referral_record', 'appeal_assessment', 'closure_record'].map(x => `taxpayer.registration.${x}`);
const TAX_FAMILY: Record<string, Partial<Record<Src, number[]>>[]> = {
  ...Object.fromEntries(['individual', 'public_entity', 'nonresident', 'branch'].map(x => [`taxpayer.registration.${x}`, [TAX_REG]])),
  ...Object.fromEntries(['taxpayer.registration.amend', 'taxpayer.details.change', 'taxpayer.obligation.cancel', 'taxpayer.registration.transfer', 'taxpayer.registration.suspend_request', 'taxpayer.registration.reactivate_request'].map(x => [x, [TAX_AMEND]])),
  'taxpayer.obligation.add': [TAX_AMEND, { B: [3246] }],
  'taxpayer.registration.objection': [TAX_DISPUTE],
  'taxpayer.registration.appeal': [TAX_DISPUTE, { B: [3074] }],
  'taxpayer.registration.inspection': [TAX_INSPECT],
  'taxpayer.registration.inspection_checklist': [TAX_INSPECT],
  'taxpayer.registration.decision': [TAX_DECIDE],
  'taxpayer.registration.decision_record': [TAX_DECIDE],
  'taxpayer.registration.further_information': [TAX_REQUEST],
  'taxpayer.registration.further_information@P2': [TAX_REQUEST, { B: [2723] }],
  'taxpayer.registration.referral': [TAX_REFER],
  'taxpayer.registration.referral_record': [TAX_REFER],
  'taxpayer.certificate.request': [{ D: [403] }],
  'taxpayer.registration.duplicate': [{ D: [403] }],
  'taxpayer.account.statement': [{ B: [3241], D: [386, 408, 414] }],
  'taxpayer.registration.assessment': [{ B: [...range(2720, 2724), 3191, 3193, 3194], D: [397] }],
  'taxpayer.registration.verification_record': [{ B: [3191, 3194] }],
  'taxpayer.registration.appeal_assessment': [{ B: [3191, 3193, 3062, 3063, 3070, 3076, 3078, 3223], D: [392, 410, 508] }],
  'taxpayer.registration.closure_record': [{ B: [3191, 3204] }],
};

// Batch 5: Part 21's opening and critical internal controls; the specification's §10 (one workspace from the departments; domains are no grant
// of authority) and the row of its table for the form's function; for the seven forms §21.2 gives a JSON contract, its form_id, title and every
// field line.
const ADM: Partial<Record<Src, number[]>> = { C: [1085, ...range(1241, 1245)], D: [966, 981] };
const ADM_FUNCTION: Record<string, number> = { HR: 970, PAY: 970, FIN: 971, PRC: 972, AST: 973, REC: 974, LEG: 975, AUD: 976, ICT: 977, PLN: 978, COM: 979, 'GOV-039': 975, 'GOV-040': 978 };
const ADM_JSON: Record<string, number[]> = {
  'ADM-HR-002': [1133, 1134, ...range(1136, 1143)], 'ADM-PAY-012': [1147, 1148, ...range(1150, 1158)], 'ADM-PRC-018': [1162, 1163, ...range(1165, 1173)],
  'ADM-ICT-029': [1177, 1178, ...range(1180, 1189)], 'ADM-ICT-030': [1193, 1194, ...range(1196, 1204)], 'ADM-AUD-036': [1208, 1209, ...range(1211, 1219)],
  'ADM-GOV-039': [1223, 1224, ...range(1226, 1233)],
};
const admFunction = (id: string) => ADM_FUNCTION[id.slice(4)] ?? ADM_FUNCTION[id.split('-')[1]!]!;

// Every batch-7 form: Part 12's rules for independent institutions, their findings and protected identities (the archetypes'
// standing, the non-negotiable principle, findings never overwritten, record ownership, investigations and findings, the
// privacy safeguards, AI governance, CFG-DEM-012 and legal activation, the oversight and privacy gates).
const OVERSIGHT: Partial<Record<Src, number[]>> = { E: [64, 66, 161, 193, 196, 197, 199, 401, 403, 405, 451, 478, 486, 488, 489, 500, 518, 529, 590, 591] };
// Batch 7: each form's archetype line, register and the specification's operating specification for its body (Part 4 §A, §C).
const EXTRA_7: Record<string, Partial<Record<Src, number[]>>> = {
  'DEM-CON-012': { E: [57], D: [2798, 2800, ...range(3025, 3033), 3037, 3039] },
  'DEM-CON-013': { E: [58], D: [2810, 2812, 3105, ...range(3109, 3112)] },
  'DEM-CON-014': { E: [56, 441], D: [2794, ...range(2985, 2991), 3005] },
  'DEM-CON-018': { E: [62, 521], D: [2806, ...range(3064, 3073), 3086] },
  'DEM-CON-019': { E: [59], D: [2816, 2818, 3134, ...range(3138, 3145), 3147] },
  'DEM-CON-020': { E: [441], D: [2989, 2990, 3005] },
  'DEM-PUB-009': { E: [59, 176], D: [3134, 3147] },
};

// Batch 6: every tax-services form answers Part 2 §2.6's opening rules, the retention and configuration records of §2.8, the §2.9 gates and
// the specification's tax authority and decision controls (the shared items of group tax6); and the lines of its own department below:
// the department's fields, country decisions and safeguards, the §2.7 internal fields and universal control for officers' records, the
// configuration record of §2.8 and the specification's services (§5.2, §5.3, §5.5).
const TAX6: Partial<Record<Src, number[]>> = {
  B: [2517, 2519, 3225, 3226, 3231, 3236, 3251, 3256, 3261, 3266, 3271],
  D: [376, 378, 380, 509, 510, 511],
};
const TAX6_FORM: Record<string, Partial<Record<Src, number[]>>> = {
  'tax.appeal.response': { B: [3063, 3074, 3076, 3191, 3205, 3223] },
  'tax.appeal.submit': { B: [3062, 3063, 3064, 3065, 3066, 3067, 3068, 3069, 3070, 3074, 3076, 3078, 3223], D: [392, 410, 508] },
  'tax.appeal.transmit': { B: [3074, 3076, 3191, 3202, 3203, 3205, 3223] },
  'tax.assessment.amendment': { B: [3063, 3066, 3076, 3223], D: [406, 509] },
  'tax.assessment.notice': { B: [3191, 3205], D: [407, 414, 505] },
  'tax.assessment.review_request': { B: [3062, 3063, 3064, 3065, 3066, 3067, 3068, 3069, 3070, 3076, 3078, 3223], D: [392, 410, 508, 509] },
  'tax.assistance.enquiry': { B: [3123, 3124, 3125, 3139], D: [386] },
  'tax.assistance.guidance_request': { B: [3123, 3124, 3125, 3139], D: [386] },
  'tax.compliance.assessment_decision': { B: [2896, 3191, 3193, 3198, 3199, 3200, 3201, 3205, 3222, 3251], D: [397, 411, 506, 507] },
  'tax.compliance.case.open': { B: [2896, 3191, 3205, 3222, 3236], D: [397, 411] },
  'tax.compliance.case_closure': { B: [2896, 3191, 3204, 3205, 3222], D: [397, 411] },
  'tax.compliance.complaint': { B: [2896, 3222], D: [397] },
  'tax.compliance.evidence_register': { B: [2896, 3043, 3191, 3194, 3205, 3222], D: [397, 411] },
  'tax.compliance.extension_decision': { B: [2896, 3191, 3193, 3198, 3199, 3200, 3205, 3222], D: [397] },
  'tax.compliance.extension_request': { B: [2896, 3222], D: [397] },
  'tax.compliance.findings_draft': { B: [2896, 3043, 3191, 3193, 3195, 3205, 3222], D: [397, 411] },
  'tax.compliance.findings_review': { B: [2896, 3191, 3193, 3194, 3205, 3222], D: [397, 411] },
  'tax.compliance.information_request': { B: [2896, 3191, 3196, 3197, 3205, 3222], D: [397, 411] },
  'tax.compliance.information_response': { B: [2896, 3222], D: [397, 411] },
  'tax.compliance.inspection_plan': { B: [2896, 3191, 3205, 3222], D: [397, 411] },
  'tax.compliance.interview_record': { B: [2896, 3043, 3191, 3195, 3205, 3222], D: [397, 411] },
  'tax.compliance.referral': { B: [2896, 3191, 3202, 3203, 3205, 3222], D: [397] },
  'tax.compliance.scope.approve': { B: [2896, 3191, 3193, 3198, 3199, 3200, 3201, 3205, 3222, 3251], D: [397, 411, 507] },
  'tax.compliance.taxpayer_response': { B: [2896, 3222], D: [397, 411] },
  'tax.credit.adjustment': { B: [2880, 2883, 2894, 3221, 3241] },
  'tax.debt.disclosure.assessment': { B: [3141, 3165, 3173, 3191, 3193, 3194, 3205, 3224], D: [397] },
  'tax.debt.payment_plan.cancel_request': { B: [3141, 3159, 3163, 3164, 3173, 3224], D: [412] },
  'tax.debt.payment_plan.change_request': { B: [3141, 3159, 3162, 3163, 3164, 3173, 3224], D: [412] },
  'tax.debt.payment_plan.decision': { B: [3141, 3160, 3162, 3173, 3191, 3193, 3198, 3199, 3200, 3201, 3205, 3224, 3251], D: [412, 507] },
  'tax.debt.payment_plan.default_review': { B: [3141, 3161, 3173, 3191, 3193, 3194, 3205, 3224], D: [397, 412] },
  'tax.debt.payment_plan.evidence': { B: [3141, 3164, 3173, 3224] },
  'tax.debt.payment_plan.request': { B: [3141, 3159, 3160, 3161, 3162, 3163, 3164, 3173, 3224], D: [393, 412] },
  'tax.debt.recovery.authorize': { B: [3141, 3159, 3160, 3161, 3168, 3169, 3170, 3173, 3191, 3193, 3198, 3199, 3200, 3201, 3205, 3224, 3251], D: [507] },
  'tax.debt.recovery.close': { B: [3141, 3172, 3173, 3191, 3204, 3205, 3224] },
  'tax.debt.recovery.dispute': { B: [3062, 3063, 3064, 3065, 3066, 3067, 3068, 3069, 3070, 3076, 3078, 3141, 3159, 3173, 3223, 3224], D: [392, 410, 508] },
  'tax.debt.recovery.notice': { B: [3141, 3159, 3160, 3161, 3168, 3169, 3170, 3173, 3224] },
  'tax.debt.recovery.response': { B: [3141, 3159, 3170, 3173, 3224] },
  'tax.debt.recovery.suspend_request': { B: [3141, 3159, 3170, 3171, 3173, 3224] },
  'tax.debt.statement.request': { B: [3141, 3159, 3161, 3173, 3224, 3241] },
  'tax.debt.voluntary_disclosure': { B: [3141, 3159, 3165, 3166, 3167, 3173, 3224] },
  'tax.dispute.closure': { B: [3075, 3076, 3191, 3204, 3205, 3223] },
  'tax.dispute.settlement_proposal': { B: [3062, 3063, 3066, 3068, 3076, 3223] },
  'tax.dispute.settlement_review': { B: [3076, 3191, 3193, 3194, 3205, 3223], D: [397] },
  'tax.dispute.withdraw': { B: [3062, 3063, 3068, 3076, 3223] },
  'tax.incentive.amendment': { B: [3132, 3133, 3136, 3139] },
  'tax.incentive.application': { B: [3132, 3133, 3134, 3135, 3136, 3139] },
  'tax.incentive.compliance_report': { B: [3132, 3136, 3137, 3139] },
  'tax.incentive.decision': { B: [3132, 3136, 3139, 3191, 3193, 3198, 3199, 3200, 3201, 3205, 3251], D: [507] },
  'tax.incentive.renewal': { B: [3132, 3133, 3134, 3136, 3139] },
  'tax.incentive.review_request': { B: [3132, 3136, 3139] },
  'tax.incentive.surrender': { B: [3132, 3136, 3138, 3139] },
  'tax.incentive.withdrawal': { B: [3132, 3139] },
  'tax.objection.assessment': { B: [3063, 3070, 3078, 3191, 3193, 3194, 3205, 3223], D: [397, 410, 508] },
  'tax.objection.decision': { B: [3072, 3073, 3074, 3076, 3191, 3193, 3198, 3199, 3200, 3201, 3205, 3223, 3251], D: [410, 507, 508] },
  'tax.objection.extension_request': { B: [3063, 3070, 3071, 3076, 3078, 3223] },
  'tax.objection.submit': { B: [3062, 3063, 3064, 3065, 3066, 3067, 3068, 3069, 3070, 3076, 3078, 3223], D: [392, 410, 508] },
  'tax.objection.supplement': { B: [3067, 3068, 3076] },
  'tax.payment.allocation_request': { B: [2880, 2881, 2885, 2886, 2894, 3221, 3241], D: [408, 414] },
  'tax.payment.dispute': { B: [2880, 2894, 3062, 3063, 3064, 3065, 3066, 3067, 3068, 3069, 3070, 3076, 3078, 3221, 3223, 3241], D: [392, 410, 508] },
  'tax.payment.external_reference': { B: [2880, 2881, 2882, 2883, 2885, 2894, 3221, 3241], D: [408, 414] },
  'tax.payment.initiate': { B: [2880, 2881, 2882, 2883, 2884, 2885, 2894, 3221, 3241], D: [408, 414] },
  'tax.payment.reversal_request': { B: [2880, 2885, 2894, 3221, 3241], D: [408, 414] },
  'tax.payment.transfer_request': { B: [2880, 2882, 2883, 2894, 3221, 3241], D: [408, 414] },
  'tax.refund.application': { B: [2880, 2887, 2888, 2889, 2890, 2891, 2894, 3221, 3241], D: [409] },
  'tax.refund.assessment': { B: [2888, 2891, 2894, 3191, 3193, 3194, 3205, 3221, 3241], D: [397, 409] },
  'tax.refund.decision': { B: [2892, 2894, 3191, 3193, 3198, 3199, 3200, 3201, 3205, 3221, 3241, 3251], D: [409, 507] },
  'tax.refund.payment_instruction': { B: [2890, 2893, 2894, 3191, 3205, 3221, 3241, 3256] },
  'tax.refund.reconciliation': { B: [2893, 2894, 3191, 3205, 3221, 3241], D: [408] },
  'tax.refund.supporting_evidence': { B: [2891, 2894, 3221, 3241] },
  'tax.return.periodic.amend': { B: [2732, 2747, 2842, 2843, 2844, 2845, 2846, 2851, 3220, 3246], D: [406, 509] },
  'tax.return.periodic.appeal': { B: [2732, 3062, 3063, 3064, 3065, 3066, 3067, 3068, 3069, 3070, 3074, 3076, 3078, 3220, 3223, 3246], D: [392, 410, 508] },
  'tax.return.periodic.correction': { B: [2732, 3191, 3205, 3220, 3246], D: [406, 509] },
  'tax.return.periodic.decision': { B: [2732, 3191, 3193, 3198, 3199, 3200, 3201, 3205, 3220, 3246, 3251], D: [407, 505, 506, 507] },
  'tax.return.periodic.further_information': { B: [2732, 3220, 3246] },
  'tax.return.periodic.late_submission': { B: [2732, 2747, 2842, 2843, 2844, 2845, 2846, 2851, 3220, 3246], D: [405] },
  'tax.return.periodic.nil': { B: [2732, 2747, 2842, 2843, 2844, 2845, 2846, 2851, 3220, 3246], D: [405] },
  'tax.return.periodic.notice': { B: [2732, 3191, 3205, 3220, 3246], D: [407, 414] },
  'tax.return.periodic.objection': { B: [2732, 3062, 3063, 3064, 3065, 3066, 3067, 3068, 3069, 3070, 3076, 3078, 3220, 3223, 3246], D: [392, 410, 508] },
  'tax.return.periodic.officer_assessment': { B: [2732, 3191, 3193, 3194, 3205, 3220, 3246], D: [397, 407, 506] },
  'tax.return.periodic.withdraw_request': { B: [2732, 3220, 3246], D: [509] },
  'tax.ruling.decision': { B: [3139, 3191, 3193, 3198, 3199, 3200, 3201, 3205, 3251], D: [394, 507] },
  'tax.ruling.further_information': { B: [3129, 3131, 3139] },
  'tax.ruling.reconsideration': { B: [3126, 3127, 3128, 3129, 3130, 3131, 3139], D: [508] },
  'tax.ruling.request': { B: [3126, 3127, 3128, 3129, 3130, 3131, 3139], D: [394] },
  'tax.ruling.withdraw': { B: [3126, 3139] },
  'tax.withholding.certificate.issue': { B: [3080, 3093, 3095, 3104] },
  'tax.withholding.details.amend': { B: [3080, 3093, 3103, 3104], D: [404] },
  'tax.withholding.discrepancy.decision': { B: [3080, 3104, 3191, 3193, 3198, 3199, 3200, 3201, 3205, 3251], D: [507] },
  'tax.withholding.discrepancy.response': { B: [3080, 3093, 3103, 3104] },
  'tax.withholding.payment': { B: [3080, 3093, 3095, 3101, 3104] },
  'tax.withholding.registration': { B: [3080, 3093, 3094, 3103, 3104], D: [404] },
  'tax.withholding.return.amend': { B: [3080, 3093, 3095, 3096, 3097, 3098, 3099, 3100, 3102, 3103, 3104], D: [406, 509] },
  'tax.withholding.return.submit': { B: [3080, 3093, 3094, 3095, 3096, 3097, 3098, 3099, 3100, 3103, 3104], D: [405] },
  'tax.withholding.statement.correct': { B: [3080, 3093, 3095, 3096, 3097, 3098, 3102, 3103, 3104] },
  'tax.withholding.statement.submit': { B: [3080, 3093, 3095, 3096, 3097, 3098, 3103, 3104] },
};

// Batch 8: every form answers Part 2's implementation rules (the shared items of group econ8); and the lines of its own department
// below: the submission or specific fields, the evidence, channel and control lines and the country decisions.
const ECON8: Partial<Record<Src, number[]>> = { B: range(1838, 1843) };
const ECON8_FORM: Record<string, Partial<Record<Src, number[]>>> = {
  'budget.allocation.approve': { B: [2452, 2453, 2454, 2455, 2460] },
  'budget.allocation.notify': { B: [2452, 2453, 2454, 2455, 2460] },
  'budget.allocation.propose': { B: [2452, 2453, 2454, 2455, 2460] },
  'budget.bid.justification': { B: [2452, 2453, 2454, 2455, 2460] },
  'budget.bid.revise': { B: [2452, 2453, 2454, 2455, 2460] },
  'budget.bid.withdraw': { B: [2452, 2453, 2454, 2455, 2460] },
  'budget.ceiling.approve': { B: [2452, 2453, 2454, 2455, 2460] },
  'budget.ceiling.propose': { B: [2452, 2453, 2454, 2455, 2460] },
  'budget.circular.issue': { B: [2452, 2453, 2454, 2455, 2460] },
  'budget.execution.commitment': { B: [2475, 2476, 2477, 2478, 2480, 2481, 2482, 2483, 2484, 2485, 2486, 2487] },
  'budget.execution.commitment.approve': { B: [2486, 2487] },
  'budget.execution.correction': { B: [2475, 2476, 2477, 2478, 2480, 2481, 2482, 2483, 2484, 2485, 2486, 2487] },
  'budget.execution.overrun.report': { B: [2475, 2476, 2477, 2478, 2480, 2481, 2482, 2483, 2484, 2485, 2486, 2487] },
  'budget.execution.reallocation.approve': { B: [2486, 2487] },
  'budget.execution.reallocation.request': { B: [2475, 2476, 2477, 2478, 2479, 2480, 2481, 2482, 2483, 2484, 2485, 2486, 2487] },
  'budget.execution.supplementary.request': { B: [2475, 2476, 2477, 2478, 2479, 2480, 2481, 2482, 2483, 2484, 2485, 2486, 2487] },
  'budget.execution.underspend.report': { B: [2475, 2476, 2477, 2478, 2480, 2481, 2482, 2483, 2484, 2485, 2486, 2487] },
  'budget.execution.variance.report': { B: [2475, 2476, 2477, 2478, 2480, 2481, 2482, 2483, 2484, 2485, 2486, 2487] },
  'budget.execution.virement': { B: [2475, 2476, 2477, 2478, 2479, 2480, 2481, 2482, 2483, 2484, 2485, 2486, 2487] },
  'budget.execution.year_end': { B: [2475, 2476, 2477, 2478, 2480, 2481, 2482, 2483, 2484, 2485, 2486, 2487] },
  'budget.negotiation.record': { B: [2452, 2453, 2454, 2455, 2460] },
  'budget.programme.costing': { B: [2452, 2453, 2454, 2455, 2460] },
  'exec.cabinet.action.close': { B: [1897, 2027] },
  'exec.cabinet.action.update': { B: [1897, 2027] },
  'exec.cabinet.agenda.approve': { B: [1897, 2027] },
  'exec.cabinet.agenda.propose': { B: [1897, 2027] },
  'exec.cabinet.decision.action_assign': { B: [1897, 2027] },
  'exec.cabinet.decision.correct': { B: [1897, 2027] },
  'exec.cabinet.decision.distribution': { B: [1897, 2027] },
  'exec.cabinet.decision.record': { B: [1897, 2027] },
  'exec.cabinet.paper.fiscal_review': { B: [1897, 2027] },
  'exec.cabinet.paper.legal_review': { B: [1897, 2027] },
  'exec.cabinet.paper.revise': { B: [1897, 2027] },
  'exec.presidency.correspondence.complaint': { B: [1863, 1865, 1867, 1869] },
  'exec.presidency.correspondence.decision': { B: [1865, 1867, 1869] },
  'exec.presidency.correspondence.notice': { B: [1865, 1867, 1869] },
  'exec.presidency.correspondence.referral': { B: [1865, 1867, 1869] },
  'exec.presidency.correspondence.submit': { B: [1857, 1858, 1859, 1860, 1861, 1862, 1863, 1864, 1865, 1867, 1869] },
  'exec.presidency.correspondence.supplement': { B: [1862, 1864, 1865, 1867, 1869] },
  'exec.presidency.correspondence.withdraw': { B: [1864, 1865, 1867, 1869] },
  'treasury.cash_forecast.close': { B: [2283] },
  'treasury.cash_forecast.review': { B: [2281, 2283] },
  'treasury.cash_forecast.revise': { B: [2273, 2274, 2275, 2276, 2277, 2278, 2279, 2280, 2281, 2282, 2283] },
  'treasury.cash_forecast.submit': { B: [2273, 2274, 2275, 2276, 2277, 2278, 2279, 2280, 2281, 2282, 2283] },
  'treasury.cash_position.report': { B: [2283] },
  'treasury.liquidity.response': { B: [2283] },
  'treasury.liquidity.shortfall': { B: [2283] },
  'treasury.payment.approve': { B: [2254, 2255, 2256, 2257, 2262] },
  'treasury.payment.cancel_request': { B: [2254, 2255, 2256, 2257, 2262] },
  'treasury.payment.correction': { B: [2254, 2255, 2256, 2257, 2262] },
  'treasury.payment.dispute': { B: [2254, 2255, 2256, 2257, 2262] },
  'treasury.payment.execute': { B: [2254, 2255, 2256, 2257, 2262] },
  'treasury.payment.reconcile': { B: [2254, 2255, 2256, 2257, 2262] },
  'treasury.payment.refund': { B: [2254, 2255, 2256, 2257, 2262] },
  'treasury.payment.reject': { B: [2254, 2255, 2256, 2257, 2262] },
  'treasury.payment.supporting_evidence': { B: [2254, 2255, 2256, 2257, 2262] },
  'treasury.payment.verify': { B: [2254, 2255, 2256, 2257, 2262] },
};

const EXTRA: Record<string, Partial<Record<Src, number[]>>> = {
  'HLT-FAC-001': { D: [1334, 1335, ...range(1350, 1356), ...range(1359, 1362)], C: range(1559, 1564) },
  'HLT-FAC-002': { D: [...range(1334, 1341), ...range(1350, 1356), ...range(1359, 1362)], C: range(1559, 1564) },
  'HLT-FAC-003': { D: [1325, 1336, 1337], C: range(1570, 1574) },
  'HLT-FAC-004': { D: [1325], C: [1574] },
  'HLT-FAC-005': { D: [1338] },
  'HLT-FAC-006': { C: [1563] },
  'HLT-FAC-007': { D: [1341] },
  'HLT-FAC-008': { D: [1339, 1340], A: [800] },
  'HLT-FAC-009': { A: [508], D: [1841] },
  'HLT-FAC-010': { D: [1341], A: [807, 884] },
  'HLT-LIC-001': { D: [1809, ...range(1825, 1830), ...range(1833, 1836)] },
  'HLT-LIC-002': { D: [1810, 1811, 1834] },
  'HLT-LIC-003': { D: [1812, 1813, 1814], A: [800] },
  'HLT-LIC-004': { D: [1816] },
  'HLT-LIC-007': { D: [1841] },
  'HLT-LIC-008': { A: [508], D: [1836, 1841] },
  'HLT-LIC-009': { D: [1836] },
  'HLT-LIC-010': { D: [1836], A: [800] },
  'HLT-LIC-011': { D: [1813, 1836], A: [800] },
  'HLT-LIC-012': { D: [1816], A: [800] },
  'HLT-LIC-013': { D: [1816] },
  'HLT-LIC-014': { D: [1815, 1841], A: [807, 884] },
  // Batch 2: Part 6 §5.2 (the regulated product record), §5.3 (safety and recall), HX-005, the exchange rule and gate; the supplement's
  // Stage B HLT-MED-004 (a different, excluded form); the specification's supply-item register and sector-regulator workflow, records and appeals.
  'HLT-MED-001': { A: range(677, 682) },
  'HLT-MED-002': { A: [682] },
  'HLT-MED-003': { A: [683], D: [3231] },
  'HLT-MED-004': { C: [1494] },
  'HLT-MED-006': { A: [684, 686, 687], D: [3233, 3234] },
  'HLT-MED-007': { A: [684] },
  'HLT-MED-008': { A: [685] },
  'HLT-MED-009': { A: [685, 686], D: range(3228, 3235) },
  'HLT-MED-010': { A: [681] },
  'HLT-MED-011': { A: [681], D: [3231] },
  'HLT-MED-012': { D: [3235] },
  'HLT-MED-013': { D: [1326] },
  'HLT-MED-014': { D: [1326] },
  'HLT-MED-015': { A: [690, 692] },
  'HLT-MED-017': { A: [685, 690, 692, 801, 807, 884], D: [1326] },
  'HLT-MED-018': { A: [690], D: [1326, 3235] },
  'HLT-MED-019': { A: range(677, 681) },
  'HLT-MED-020': { A: [690, 692] },
  'HLT-MED-023': { D: [2830, 3211, 3224, 3234] },
  'HLT-MED-024': { A: [684, 687, 807, 884] },
};

/** The pieces of a line a contract must quote: table cells, list items and sentences. */
function pieces(line: string): string[] {
  let s = line.trim().replace(/^(- \[ \] |- |\d+\. )/, '');
  const parts = s.startsWith('|') ? s.replace(/^\||\|$/g, '').split('|').map(x => x.trim()) : s.split('\t');
  const out: string[] = [];
  for (const p of parts) for (const q of p.split(/(?<=[.!?])\s+(?=[A-Z"(])/)) { s = q.trim().replace(/,$/, '').trim(); if (s.length >= 2) out.push(s); }
  return out;
}

// Batch 10: the lines every form of a family answers (land: catalogue Part 8 §3 and the specification's land rules; hpc: the supplement's Part 20
// controls; lrg: Part 19's scope rule and the specification's local-government boundary; trn: Part 9's authority, evidence and history rules).
const GROUP_10: Record<string, Partial<Record<Src, number[]>>> = {
  land: { D: [2424, 2449], F: [24, 30, 31, 91, 118, 132, 134, 135, 136, 137, 138, 139, 140, 141, 142, 144, 461, 472, 479] },
  hpc: { C: [1082] },
  lrg: { C: [974], D: [2522] },
  trn: { F: [525, 685, 729, 766, 767, 846, 1003] },
};
// Batch 10: each form's own lines (its JSON contract where the supplement gives one, its register and the specification's records and controls).
const FORM_10: Record<string, Partial<Record<Src, number[]>>> = {
  'LND-REG-007': { D: [2432, 2440, 2441, 2442, 2443, 2444, 2445, 2446, 2447, 2728], F: [100, 123, 127, 130] },
  'LND-REG-012': { F: [105, 123, 127] },
  'LND-REG-008': { F: [101, 123, 126] },
  'LND-REG-009': { D: [2433], F: [102, 126] },
  'LND-REG-011': { F: [104, 126] },
  'LND-REG-020': { F: [113, 126] },
  'LND-REG-010': { D: [2433], F: [103, 126] },
  'LND-REG-021': { F: [114, 126] },
  'LND-REG-016': { F: [109, 129, 130] },
  'LND-REG-005': { D: [2435], F: [98, 125, 128] },
  'LND-REG-017': { D: [2435], F: [110, 128] },
  'LND-REG-022': { D: [2435], F: [115, 128] },
  'HPC-HOU-001': { C: [979], D: [2635] },
  'HPC-HOU-002': { C: [980, 1008, 1009, 1010, 1011, 1012, 1013, 1014, 1015, 1016, 1017, 1018, 1019] },
  'HPC-HOU-003': { C: [981] },
  'HPC-HOU-004': { C: [982] },
  'HPC-PLN-009': { C: [987, 1023, 1024, 1025, 1026, 1027, 1028, 1029, 1030, 1031, 1032, 1033, 1034], D: [2641] },
  'HPC-PLN-012': { C: [990] },
  'HPC-PLN-013': { C: [991] },
  'HPC-BLD-014': { C: [992, 1038, 1039, 1040, 1041, 1042, 1043, 1044, 1045, 1046, 1047, 1048, 1049], D: [2645, 2646, 2647, 2648, 2649, 2650, 2651, 2652, 2654] },
  'HPC-BLD-015': { C: [993] },
  'HPC-BLD-016': { C: [994] },
  'HPC-BLD-017': { C: [995] },
  'HPC-BLD-018': { C: [996, 1053, 1054, 1055, 1056, 1057, 1058, 1059, 1060, 1061, 1062, 1063] },
  'HPC-BLD-019': { C: [997] },
  'HPC-BLD-020': { C: [998, 1067, 1068, 1069, 1070, 1071, 1072, 1073, 1074, 1075], D: [2652, 2733] },
  'LRG-ORG-005': { C: [869, 903, 904, 905, 906, 907, 908, 909, 910, 911, 912, 913] },
  'LRG-ORG-004': { C: [868] },
  'LRG-FIN-008': { C: [872, 917, 918, 919, 920, 921, 922, 923, 924, 925, 926, 927] },
  'LRG-SVC-013': { C: [877, 931, 932, 933, 934, 935, 936, 937, 938, 939, 940] },
  'LRG-SVC-014': { C: [878] },
  'TRN-DRV-001': { F: [541, 691, 694, 697, 700, 703, 706, 709, 752] },
  'TRN-VEH-001': { F: [549, 694, 706, 753] },
  'TRN-VEH-002': { F: [550, 753] },
  'TRN-ROAD-002': { D: [2551], F: [576] },
  'TRN-OPS-001': { F: [561, 723, 724, 725, 726, 727, 728, 754] },
};
// Every batch-9 form: the specification's separate records and lawful authority (Part 1), the field series' rule that a submission is not
// a decision, that a failed check is no ground for refusal and that no plausible default is activated (Part 4).
const HUMAN: Partial<Record<Src, number[]>> = { D: [1106, 1197], G: [1406, 1771, 1817] };
// Each family's lines (the specification's archetype and operating rules; the field series' and supplement's domain rules) and, per form,
// its own: the JSON contract the supplement gives, line by line (§14.2, §15.2), the envelope line, or a specific rule.
const HUMAN_FAMILY: Record<string, Partial<Record<Src, number[]>>> = {
  IDN: { D: [1128], G: [1498, 1536, 1543, 1545, 1555] },
  PAS: { D: [1491], G: [1636, 1665, 1667, 1669] },
  NAT: { G: [1671, 1686, 1688] },
  LAB: { D: [1152, 1593] },
  SOC: { C: [500], D: [1158, 1652, 1656, 1657, 1658, 1659, 1660, 1661, 1662] },
};
const HUMAN_FORM: Record<string, Partial<Record<Src, number[]>>> = {
  'IDN-REG-004': { G: [1489] },
  'PAS-APP-018': { G: [1662] },
  'LAB-EMP-001': { C: [184, 189, 190, 192, 193, 194, 195, 196, 197, 198, 199, 200, 201] },
  'LAB-EMP-002': { C: [340] },
  'LAB-EMP-003': { C: [184, 205, 206, 208, 209, 210, 211, 212, 213, 214, 215, 216] },
  'LAB-EMP-004': { C: [184, 220, 221, 223, 224, 225, 226, 227, 228, 229, 230, 231, 232] },
  'LAB-EMP-005': { C: [184, 236, 237, 239, 240, 241, 242, 243, 244, 245, 246, 247] },
  'LAB-EMP-006': { C: [340] },
  'LAB-EMP-007': { C: [340] },
  'LAB-EMP-008': { C: [184, 251, 252, 254, 255, 256, 257, 258, 259, 260, 261, 262, 263] },
  'LAB-EMP-009': { C: [184, 267, 268, 270, 271, 272, 273, 274, 275, 276, 277], D: [1560, 1561] },
  'LAB-EMP-010': { C: [184, 281, 282, 284, 285, 286, 287, 288, 289, 290, 291, 292] },
  'LAB-EMP-011': { C: [184, 296, 297, 299, 300, 301, 302, 303, 304, 305, 306] },
  'LAB-EMP-012': { C: [340] },
  'LAB-EMP-013': { C: [340] },
  'LAB-EMP-014': { C: [340] },
  'LAB-EMP-015': { C: [340] },
  'LAB-EMP-016': { C: [184, 310, 311, 313, 314, 315, 316, 317, 318, 319, 320, 321] },
  'LAB-EMP-017': { C: [340] },
  'LAB-EMP-018': { C: [340] },
  'LAB-EMP-019': { C: [340] },
  'LAB-EMP-020': { C: [184, 325, 326, 328, 329, 330, 331, 332, 333] },
  'SOC-BEN-001': { C: [374, 375, 377, 378, 379, 380, 381, 382, 383] },
  'SOC-BEN-002': { C: [387, 388, 390, 391, 392, 393, 394, 395, 396, 397, 398] },
  'SOC-BEN-003': { C: [402, 403, 405, 406, 407, 408, 409, 410] },
  'SOC-BEN-004': { C: [414, 415, 417, 418, 419, 420, 421, 422, 423, 424], D: [1622] },
  'SOC-BEN-010': { C: [428, 429, 431, 432, 433, 434, 435, 436, 437] },
  'SOC-BEN-015': { C: [441, 442, 444, 445, 446, 447, 448, 449, 450, 451] },
  'SOC-BEN-018': { C: [455, 456, 458, 459, 460, 461, 462, 463, 464, 465, 466] },
  'SOC-BEN-019': { C: [470, 471, 473, 474, 475, 476, 477, 478, 479, 480] },
  'SOC-BEN-020': { C: [484, 485, 487, 488, 489, 490, 491, 492, 493] },
};

/** The register row's line: the first line naming the catalogue ID in its document or, for an ID the catalogue repeats, the line the row records. */
const ROW_LINE: Record<string, number> = { 'taxpayer.registration.further_information@P2': 2714 };
const catalogueIdOf = (id: string) => id.split('@')[0]!;
function rowLine(id: string): number {
  if (ROW_LINE[id]) return ROW_LINE[id]!;
  const cid = catalogueIdOf(id);
  return DOC[sourceOf(id)].findIndex(l => l.startsWith(`${cid}\t`) || l.startsWith(`- ${cid} — `)) + 1;
}

function linesFor(id: string): [Src, number][] {
  const sets = batchOf(id) === 10
    ? [COMMON, GROUP_10[({ LND: 'land', HPC: 'hpc', LRG: 'lrg', TRN: 'trn' } as Record<string, string>)[id.slice(0, 3)]!]!, FORM_10[id] ?? {}, { [sourceOf(id)]: [rowLine(id)] }]
    : batchOf(id) === 9
    ? [COMMON, HUMAN, HUMAN_FAMILY[id.slice(0, 3)]!, HUMAN_FORM[id] ?? {}, { [sourceOf(id)]: [rowLine(id)] }]
    : batchOf(id) === 5
    ? [COMMON, ADM, { D: [admFunction(id)] }, { C: ADM_JSON[id] ?? [] }, { C: [rowLine(id)] }]
    : batchOf(id) === 7
    ? [COMMON, OVERSIGHT, EXTRA_7[id] ?? {}, { E: [rowLine(id)] }]
    : batchOf(id) === 6 ? [COMMON, TAX6, TAX6_FORM[id] ?? {}, { B: [rowLine(id)] }]
    : batchOf(id) === 8 ? [COMMON, ECON8, ECON8_FORM[id] ?? {}, { B: [rowLine(id)] }]
    : batchOf(id) === 3
    ? [COMMON, TAX, ...(TAX_FAMILY[id] ?? []), TAX_OFFICER.includes(id) ? { B: [3205] } : {}, TAX_INTERNAL.includes(id) ? { B: [2710] } : {}, { B: [rowLine(id)] }]
    : [COMMON, COMMON_HEALTH, id.startsWith('HLT-FAC') ? FAMILY.FAC : id.startsWith('HLT-LIC') ? FAMILY.LIC : id.startsWith('HLT-MED') ? FAMILY.MED : FAMILY.PH, EXTRA[id] ?? {}, { A: [rowLine(id)] }];
  const out: [Src, number][] = [];
  for (const set of sets) for (const [k, ns] of Object.entries(set)) for (const n of ns ?? []) if (!out.some(([a, b]) => a === k && b === n)) out.push([k as Src, n]);
  return out;
}

const flat = (fs: ContractField[]): ContractField[] => fs.flatMap(f => [f, ...(f.items ? flat(f.items as ContractField[]) : [])]);
const PROCEDURES = [...FINANCE_PROCEDURES, ...CABINET_PROCEDURES, ...PROCUREMENT_PROCEDURES, ...HEALTH_PROCEDURES, ...PROFESSION_PROCEDURES, ...TAX_PROCEDURES, ...PRODUCT_PROCEDURES, ...PROGRAMME_PROCEDURES, ...COMPLAINT_PROCEDURES, ...ADMINISTRATION_PROCEDURES, ...INDEPENDENT_OVERSIGHT_PROCEDURES, ...LAND_PROCEDURES, ...BUILDING_PROCEDURES, ...HOUSING_PROCEDURES, ...LOCAL_GOVERNMENT_TEMPLATES, ...TRANSPORT_PROCEDURES, ...IDENTITY_PROCEDURES, ...PASSPORT_PROCEDURES, ...CITIZENSHIP_PROCEDURES, ...LABOUR_PROCEDURES, ...SOCIAL_PROCEDURES];
const SERVICES = serviceDirectory().map(s => s.id);
const applicantKeys = (f: CatalogueLibraryForm) => f.fields.filter(x => (x.audience ?? 'applicant') === 'applicant').map(x => x.key);
/** No patient, clinical, treatment, diagnosis or individual health field: by key and by label. */
const CLINICAL = /patient|clinical|clinician|diagnos|prescri|dispens|treatment|medication|symptom|medical record|health condition|care plan/i;

describe('catalogue contracts, batches 1 (health regulation), 2 (medicines and medical devices regulation), 3 (taxpayer registration and account), 4 (public-health programme forms), 5 (internal administration), 6 (tax services), 7 (independent oversight), 8 (executive office, Cabinet, treasury and budget), 9 (human services) and 10 (territory and infrastructure)', () => {
  it('holds exactly the 25 + 21 + 29 + 2 + 40 + 95 + 7 + 57 + 96 + 36 approved forms, one contract each, matched to the catalogue row it names', () => {
    expect(IDS_1.length).toBe(25);
    expect(IDS_2.length).toBe(21);
    expect(IDS_3.length).toBe(29);
    expect(IDS_4.length).toBe(2);
    expect(IDS_5.length).toBe(40);
    expect(IDS_6.length).toBe(95);
    expect(IDS_7.length).toBe(7);
    expect(IDS_10.length).toBe(36);
    expect(IDS_8.length).toBe(57);
    expect(IDS_9.length).toBe(96);
    expect(CATALOGUE_CONTRACTS.map(f => f.specId).sort()).toEqual([...IDS].sort());
    const files = readdirSync(join(process.cwd(), 'src/lib/forms/library/catalogue-contracts')).filter(f => f.endsWith('.json'));
    expect(files.sort()).toEqual(IDS.map(i => `${i}.json`).sort());
    for (const f of CATALOGUE_CONTRACTS) {
      expect(f.catalogue.source).toBe(SRC[sourceOf(f.specId)]);
      expect(f.catalogue.id).toBe(catalogueIdOf(f.specId));
      expect(f.catalogue.line, f.specId).toBe(rowLine(f.specId));
      const row = DOC[sourceOf(f.specId)][f.catalogue.line - 1]!;
      expect(row.startsWith(`${f.catalogue.id}\t`) || row.startsWith(`- ${f.catalogue.id} — `), f.specId).toBe(true);
      expect(f.batch).toBe(batchOf(f.specId));
      expect(f.catalogue.batch).toBe(f.batch);
    }
    expect([...COMMON_ITEMS.applies_to].sort()).toEqual([...IDS].sort());
  });

  it('carries no status anywhere: the register status is derived, never written', () => {
    for (const c of [...BATCH_1, ...BATCH_2, ...BATCH_3, ...BATCH_4, ...BATCH_5, ...BATCH_6, ...BATCH_7, ...BATCH_8, ...BATCH_9, ...BATCH_10]) {
      expect('status' in c, c.form_id).toBe(false);
      expect(JSON.stringify(c)).not.toMatch(/"(status|state|approved|approved_by|production)"\s*:/);
    }
    for (const f of CATALOGUE_CONTRACTS) expect(f.form.status).toBeUndefined();
  });

  for (const id of IDS) {
    describe(id, () => {
      const f = CATALOGUE_CONTRACTS.find(x => x.specId === id)!;
      const keys = flat(f.fields).map(x => x.key);
      const top = f.fields.map(x => x.key);

      it('answers every piece of its catalogue text: quoted verbatim, met by the contract or a named deviation', () => {
        const missing: string[] = [];
        for (const [src, n] of linesFor(id)) {
          const line = DOC[src][n - 1]!;
          const items = f.items.filter(i => i.source === SRC[src] && i.line === n);
          for (const p of pieces(line)) if (!items.some(i => i.quotes.some(q => q.includes(p)))) missing.push(`${src}${n}: ${p.slice(0, 80)}`);
          for (const i of items) for (const q of i.quotes) expect(line, `${src}${n}`).toContain(q);
        }
        expect(missing).toEqual([]);
        const procs = f.procedure ? [f.procedure.key, ...(f.procedure.also ?? [])].map(k => PROCEDURES.find(p => p.key === k)!) : [];
        for (const i of f.items) {
          const m = i.met_by;
          const where = `${i.source.split('/').pop()} ${i.line}`;
          expect(Object.keys(m).length, where).toBeGreaterThan(0);
          for (const k of m.fields ?? []) expect(top, `${where}: field ${k}`).toContain(k);
          if (m.deviation) expect(f.deviations.map(d => d.id), `${where}: deviation`).toContain(m.deviation);
          if (m.platform) expect(existsSync(join(ROOT, m.platform.file)), `${where}: ${m.platform.file}`).toBe(true);
          if (m.country_decision) expect((f.form.countryDecisions ?? []).some(c => c.includes(m.country_decision!)), `${where}: ${m.country_decision}`).toBe(true);
          if (m.procedure) expect(procs.some(p => p.actions.some(a => a.key === m.procedure)), `${where}: step ${m.procedure}`).toBe(true);
          if (m.exchange) expect(SERVICES, `${where}: ${m.exchange}`).toContain(m.exchange);
          if (m.policy) expect(f.form.policies?.[m.policy], `${where}: ${m.policy}`).toBeDefined();
        }
        // Every deviation names the binding rule that requires it.
        for (const d of f.deviations) expect(d.rule.length, d.id).toBeGreaterThan(10);
      });

      it('types and classes every field, with registered rules only, and fits the contract', () => {
        const classes = DATA_CLASSES.map(c => c.key) as string[];
        const docClasses = f.documents.map(d => d.class);
        for (const x of flat(f.fields)) {
          expect(FIELD_TYPES as string[], x.key).toContain(x.type);
          expect(classes, x.key).toContain(x.personalDataClass);
          for (const r of x.rules ?? []) if (r.rule === 'registered') expect(isRegisteredRule(r.name), `${x.key} ${r.name}`).toBe(true);
        }
        for (const x of f.fields) expect(fieldProblem(x, top, docClasses), x.key).toBeNull();
        expect(formProblem(f.form, f.fields, f.documents, 'restricted')).toBeNull();
        expect(f.notes.filter(n => n.kind === 'problem' || n.kind === 'not-expressed')).toEqual([]);
        expect(new Set(top).size).toBe(top.length);
      });

      it('stays inside the approved scope: no patient, clinical or individual health field', () => {
        expect(formScope(f.key, f.form, f.fields).status).toBe('allowed');
        for (const x of flat(f.fields)) {
          expect(x.key, x.key).not.toMatch(CLINICAL);
          expect(x.label, x.key).not.toMatch(CLINICAL);
        }
        // A free-text field that may describe a concern about care is restricted.
        for (const x of f.fields) if (x.type === 'longtext' && /concern|complaint|grounds|allegation|matters|description/.test(x.key)) expect(x.personalDataClass, x.key).toBe('restricted');
      });

      it('sets nothing a law decides: fees from an approved rule, day counts, periods and thresholds named and unset', () => {
        for (const v of f.nationValues) {
          expect(Object.keys(v).sort(), v.key).toEqual(['decision', 'key', 'kind', 'source']);
          if (v.source === 'rule') expect(ruleInForce(v.key), v.key).toBeUndefined();
        }
        // Money is only ever calculated by an approved rule; nobody types a fee. Batch 6: an amount a person states (a claim, a proposed
        // schedule, the deciding officials' adjusted figure) is named in the form's amounts.stated policy and checked below; never a charge.
        const stated = [6, 8].includes(batchOf(id)) ? String(f.form.policies?.['amounts.stated'] ?? '').split(':')[0]! : '';
        for (const x of flat(f.fields).filter(y => y.type === 'money' && !(stated && stated.includes(y.key)))) {
          expect(x.audience, x.key).toBe('system');
          expect((x.rules ?? []).some(r => r.rule === 'registered' && r.name === 'derived_from_approved_rule'), x.key).toBe(true);
        }
        if (![6, 8].includes(batchOf(id)) && flat(f.fields).some(y => y.type === 'money')) expect(f.nationValues.some(v => v.kind === 'fee'), 'a fee is named as the nation\'s').toBe(true);
        // No number in the contract outside a validation rule's own bounds and the contract's bookkeeping.
        const c = f.json as unknown as Record<string, unknown>;
        const numbers: string[] = [];
        const walk = (v: unknown, at: string) => {
          // Allowed: a validation rule's own bounds (a length, a whole number from 0, coordinates), a field group's version, and the contract's versions, catalogue line and batch.
          if (typeof v === 'number') { if (!/\.validation\.\d+\.params\b|^fields\.\d+\.version$|^form_version$|^procedure_package_version$|^catalogue\.(part|line|batch)$/.test(at)) numbers.push(`${at}=${v}`); return; }
          if (Array.isArray(v)) v.forEach((x, i) => walk(x, `${at}.${i}`));
          else if (v && typeof v === 'object') for (const [k, x] of Object.entries(v)) if (!(at === 'library' && k === 'catalogue_items')) walk(x, at ? `${at}.${k}` : k);
        };
        walk(c, '');
        expect(numbers).toEqual([]);
        // The linked procedures ship their day counts unset.
        for (const k of f.procedure ? [f.procedure.key, ...(f.procedure.also ?? [])] : []) {
          const p = PROCEDURES.find(x => x.key === k)!;
          for (const d of p.deadlines) expect(d.days, `${k} ${d.key}`).toBeUndefined();
          expect(p.appeal?.days, `${k} appeal`).toBeUndefined();
        }
        // Rules the nation must configure are binding: recorded as not performed until then, and a publication blocker.
        for (const x of flat(f.fields)) for (const r of x.rules ?? []) if (r.rule === 'registered' && /_from_rule$|_from_policy$|_from_programme$|^configured_profile$/.test(r.name)) expect(RULE_REGISTRY[r.name]!.scope, r.name).toBe('binding');
      });

      it('renders the same questions in all three channels', () => {
        const view = formView({ ...f, version: 1, state: 'draft', library: true });
        const want = applicantKeys(f);
        expect(want.length).toBeGreaterThan(0);
        const selfService = pagesOf(view.fields.filter(x => (x.audience ?? 'applicant') === 'applicant')).flatMap(p => p.fields.map(x => x.key));
        expect([...selfService].sort()).toEqual([...want].sort());
        const assisted = renderToStaticMarkup(React.createElement(FormRenderer, { view, channel: 'assisted', preview: true }));
        const paper = renderToStaticMarkup(React.createElement(FormRenderer, { view, channel: 'paper', preview: true }));
        const printed = renderToStaticMarkup(React.createElement(PrintForm, { view }));
        for (const k of want) {
          const x = view.fields.find(y => y.key === k)!;
          expect(printed, `print ${k}`).toContain(`id="field-${k}"`);
          if (!x.showWhen) {
            expect(assisted, `assisted ${k}`).toContain(`field-${k}`);
            expect(paper, `paper ${k}`).toContain(`field-${k}`);
            continue;
          }
          // A conditional question is asked once its condition holds, in every channel.
          const other = view.fields.find(y => y.key === x.showWhen!.field)!;
          const eq = x.showWhen.equals!;
          const v = other.type === 'boolean' ? eq === 'true' : other.multiple ? [eq] : eq;
          for (const channel of ['assisted', 'paper'] as const) {
            const html = renderToStaticMarkup(React.createElement(FormRenderer, { view, channel, preview: true, initial: { [other.key]: v } }));
            expect(html, `${channel} ${k} when ${other.key} is ${eq}`).toContain(`field-${k}`);
          }
        }
        // Officials' and the platform's own fields are never asked of whoever completes the form, in any channel.
        for (const x of f.fields.filter(y => y.audience === 'officer' || y.audience === 'system')) {
          expect(printed, x.key).not.toContain(`id="field-${x.key}"`);
          expect(assisted, x.key).not.toContain(`id="field-${x.key}"`);
        }
      });

      it('reads as a contract draft in the publication gates, never approved', () => {
        // Found by its identity (catalogue + form ID + version), which is its library key.
        const lib = findLibraryForm(f.identity)!;
        expect(lib.def.key).toBe(f.key);
        expect(f.key).toBe(f.identity);
        const pub = libraryPublication(f, lib.waitsFor);
        expect(['contract_draft', 'blocked']).toContain(pub.status);
        expect(pub.status).toBe('contract_draft');
        expect(pub.human.filter(g => g.applies && g.passed)).toEqual([]);
        expect(pub.automatic.find(g => g.id === 'schema')!.passed).toBe(false);
        expect(pub.blockers.length).toBeGreaterThan(0);
      });

      it('belongs to its reference procedure where one exists, else names the stage it waits for', () => {
        if (f.procedure) {
          const p = PROCEDURES.find(x => x.key === f.procedure!.key);
          expect(p, f.procedure.key).toBeDefined();
          expect(p!.stages.map(s => s.key)).toContain(f.procedure.stage);
          if (f.procedure.action) expect(p!.actions.map(a => a.key)).toContain(f.procedure.action);
          if (f.procedure.document) expect(p!.documents.map(d => d.class)).toContain(f.procedure.document);
          for (const k of f.procedure.also ?? []) expect(PROCEDURES.some(x => x.key === k), k).toBe(true);
          expect(p!.owner).toBe(f.owner);
          expect(f.json.procedure_package_id).toBe(f.procedure.key);
        } else {
          expect(f.awaits ?? '', 'the stage it is intended for').toMatch(/not built|no case is opened/);
          if (f.exchange) expect(SERVICES).toContain(f.exchange);
        }
        // Authority from the deployment profile, never a ministry by name.
        expect(batchOf(id) === 10 ? TERRITORY_OWNERS : batchOf(id) === 8 ? ['finance', 'cabinetOffice'] : batchOf(id) === 5 ? ['institution'] : [3, 6].includes(batchOf(id)) ? ['tax'] : batchOf(id) === 7 ? OVERSIGHT_SLOTS : batchOf(id) === 9 ? HUMAN_SLOTS : ['healthRegulation', 'professionalRegulation', 'medicinesRegulation', 'controlledSubstances', 'publicHealth']).toContain(f.owner);
        expect(JSON.stringify(f.json)).not.toMatch(/Ministry of/);
      });
    });
  }

  it('keeps a complainant\'s identity and the complaint restricted, and conduct records to the regulator', () => {
    for (const id of ['HLT-FAC-009', 'HLT-LIC-008']) {
      const f = CATALOGUE_CONTRACTS.find(x => x.specId === id)!;
      const person = f.fields.filter(x => /^(raised_by|complainant)\./.test(x.key));
      expect(person.length).toBeGreaterThanOrEqual(4);
      for (const x of person) expect(x.personalDataClass, x.key).toBe('restricted');
      for (const x of f.fields.filter(y => /^(concern|complaint)\.(description|category|when|risk_now|evidence)$/.test(y.key))) expect(x.personalDataClass, x.key).toBe('restricted');
    }
    for (const id of ['HLT-LIC-009', 'HLT-LIC-010', 'HLT-LIC-011', 'HLT-LIC-012', 'HLT-FAC-008']) {
      const f = CATALOGUE_CONTRACTS.find(x => x.specId === id)!;
      for (const x of f.fields.filter(y => ['longtext', 'group', 'document'].includes(y.type))) expect(x.personalDataClass, `${id} ${x.key}`).toBe('restricted');
    }
    // The public register shows only what the profession's disclosure profile allows: a person reference is never public.
    const reg = CATALOGUE_CONTRACTS.find(x => x.specId === 'HLT-LIC-001')!;
    expect(reg.fields.find(x => x.key === 'applicant.person')!.personalDataClass).toBe('personal');
    expect(reg.fields.find(x => x.key === 'registration.matters_details')!.personalDataClass).toBe('restricted');
  });

  it('keeps the public-health return to counts: no person, by area and period, small cells protected by the nation\'s threshold', () => {
    const f = CATALOGUE_CONTRACTS.find(x => x.specId === 'HLT-PH-015')!;
    const counts = f.fields.find(x => x.key === 'return.counts')!;
    expect(counts.type).toBe('group');
    expect(counts.items!.map(i => i.key)).toEqual(['indicator', 'breakdown', 'basis', 'count', 'status']);
    expect(flat(f.fields).filter(x => ['party', 'person', 'contact'].includes(x.type)).map(x => x.key)).toEqual([]);
    expect(f.fields.find(x => x.key === 'return.area')!.valuesSourceId).toBe('civicos.nation.regions');
    expect(f.fields.find(x => x.key === 'return.period')!.type).toBe('dateRange');
    expect((f.fields.find(x => x.key === 'return.suppression')!.rules ?? []).some(r => r.rule === 'registered' && r.name === 'small_cell_suppression_from_policy')).toBe(true);
    expect(f.nationValues.find(v => v.kind === 'threshold')).toMatchObject({ source: 'setting' });
  });

  // ── Batch 2: medicines and medical devices regulation ──
  const med = (id: string) => CATALOGUE_CONTRACTS.find(x => x.specId === id)!;
  const words = (k: string) => k.replace(/([a-z0-9])([A-Z])/g, '$1 $2').toLowerCase().split(/[^a-z0-9]+/);

  it('writes no contract for the excluded forms, and keeps the two HLT-MED-004s apart', () => {
    for (const id of ['HLT-MED-016', 'HLT-MED-021', 'HLT-MED-022']) {
      expect(CATALOGUE_CONTRACTS.find(x => x.specId === id), id).toBeUndefined();
      expect(scopeOf([id], []).status, id).toBe('excluded');
    }
    // The supplement's Stage B HLT-MED-004 (a dispensing record) stays excluded by its bare ID; the field series' HLT-MED-004 is read against Part 6.
    expect(scopeOf(['HLT-MED-004'], []).status).toBe('excluded');
    const f = med('HLT-MED-004');
    expect(f.form.catalogueSource).toBe(SRC.A);
    expect(formScope(f.key, f.form, f.fields).status).toBe('allowed');
    expect(f.deviations.map(d => d.id)).toContain('stage-b-id');
    // A form that names the supplement as its source is excluded under that ID.
    expect(formScope(f.key, { ...f.form, catalogueSource: SRC.C }, f.fields).status).toBe('excluded');
  });

  it('keeps the safety and incident reports to the product: no person reported on, no structured clinical field, the concern restricted with a hint', () => {
    for (const id of ['HLT-MED-015', 'HLT-MED-020']) {
      const f = med(id);
      expect(formScope(f.key, f.form, f.fields).status, id).toBe('allowed');
      // The only person is the reporter (optional, restricted): no party or person question, no field about anyone else.
      expect(flat(f.fields).filter(x => ['party', 'person'].includes(x.type)).map(x => x.key), id).toEqual([]);
      for (const x of flat(f.fields)) {
        expect(words(x.key).filter(w => ['reaction', 'outcome', 'harm', 'injury', 'death', 'age', 'sex', 'gender', 'birth', 'weight', 'dose', 'hospital', 'condition', 'history'].includes(w)), `${id} ${x.key}`).toEqual([]);
        if (/^reporter\.(name|contact|anonymous)$/.test(x.key)) expect(x.personalDataClass, x.key).toBe('restricted');
      }
      const text = f.fields.find(x => x.key === (id === 'HLT-MED-015' ? 'report.concern' : 'incident.description'))!;
      expect(text.type).toBe('longtext');
      expect(text.personalDataClass).toBe('restricted');
      expect(text.hint).toMatch(/Do not give anyone's name, identity or medical details/);
      expect(f.fields.find(x => /\.(category)$/.test(x.key))!.personalDataClass).toBe('restricted');
      const dev = f.deviations.find(d => d.id === 'product-level-only')!;
      expect(dev.rule).toMatch(/no patient or clinical field anywhere/);
      expect(dev.rule).toMatch(/HLT-MED-016/);
      expect(f.deviations.map(d => d.id)).toContain('no-ai-finding');
    }
  });

  it('authorises controlled medicines for an organisation, a product and a quantity, never a named patient', () => {
    const f = med('HLT-MED-014');
    expect(f.fields.find(x => x.key === 'controlled.organisation')!.type).toBe('registryReference');
    const lines = f.fields.find(x => x.key === 'controlled.lines')!;
    expect(lines.items!.map(i => i.key)).toEqual(['product', 'substance', 'strengthForm', 'quantity']);
    expect((lines.rules ?? []).some(r => r.rule === 'registered' && r.name === 'controlled_quantity_limit_from_rule')).toBe(true);
    // No person is named but whoever acts for the organisation (core.representation).
    expect(flat(f.fields).filter(x => ['party', 'person'].includes(x.type)).map(x => x.key)).toEqual(['representation.actor']);
    // The one person reference is the responsible professional, on the professional register.
    expect(flat(f.fields).filter(x => x.personalDataClass === 'personal' && !x.group).map(x => [x.key, x.register])).toEqual([['controlled.responsible_professional', 'professional']]);
    expect(f.deviations.map(d => d.id)).toContain('no-named-person');
    expect(f.nationValues.find(v => v.kind === 'threshold')).toMatchObject({ key: 'medicines.controlled.quantity-limits', source: 'setting' });
  });

  it('ships no classification, power or period: each list the law decides is the nation\'s, named, with its standard', () => {
    // Lists that are a classification or a power never ship values; each such field names the decision (and, for a classification, the standard).
    const NATION_LISTS = ['medicines.country.application_kinds', 'medicines.country.product_categories', 'medicines.country.dosage_forms', 'medicines.country.routes', 'medicines.country.atc_codes',
      'medicines.country.supply_categories', 'medicines.country.dossier_formats', 'medicines.country.authorisation_outcomes', 'medicines.country.public_product_fields', 'medicines.country.variation_categories',
      'medicines.country.enforcement_measures', 'medicines.country.good_practice_standards', 'medicines.country.deficiency_grades', 'medicines.country.entry_points', 'medicines.country.controlled_schedules',
      'medicines.country.recall_classes', 'medicines.country.device_risk_classes', 'medicines.country.device_nomenclature', 'medicines.country.review_routes'];
    const STANDARDS: Record<string, RegExp> = {
      'medicines.country.dosage_forms': /EDQM Standard Terms/, 'medicines.country.routes': /EDQM Standard Terms/, 'medicines.country.atc_codes': /WHO ATC/,
      'medicines.country.device_risk_classes': /IMDRF/, 'medicines.country.device_nomenclature': /GMDN/, 'medicines.country.good_practice_standards': /WHO|PIC\/S/,
      'medicines.country.controlled_schedules': /Single Convention/, 'medicines.country.dossier_formats': /Common Technical Document/,
    };
    const seen = new Set<string>();
    for (const id of IDS_2) {
      const f = med(id);
      for (const name of NATION_LISTS) expect(f.form.lists?.[name], `${id} ships ${name}`).toBeUndefined();
      for (const x of flat(f.fields)) {
        if (!x.valuesSourceId || !NATION_LISTS.includes(x.valuesSourceId)) continue;
        seen.add(x.valuesSourceId);
        expect(x.countryDecision ?? '', `${id} ${x.key}`).toMatch(/none ship|CFG-|law/i);
        if (STANDARDS[x.valuesSourceId]) expect(x.countryDecision ?? '', `${id} ${x.key}`).toMatch(STANDARDS[x.valuesSourceId]!);
        if ((x.rules ?? []).some(r => r.rule === 'registered' && r.name === 'classification_value_from_configured_standard')) expect(x.countryDecision ?? '', x.key).toMatch(/Expected source:/);
      }
      // Fees, periods, timelines and deadlines are named as the nation's and none is set.
      for (const v of f.nationValues) expect(['fee', 'days', 'period', 'threshold'], `${id} ${v.key}`).toContain(v.kind);
    }
    expect([...seen].sort()).toEqual([...NATION_LISTS].sort());
    // The recall class is set by the regulator from the nation's classes; the recall's deadlines are a binding rule.
    const recall = med('HLT-MED-017');
    expect(recall.fields.find(x => x.key === 'recall.class_set')!.audience).toBe('officer');
    expect(recall.fields.find(x => x.key === 'recall.deadlines')!.rules!.some(r => r.rule === 'registered' && r.name === 'recall_timeline_from_rule')).toBe(true);
    expect(med('HLT-MED-006').fields.find(x => x.key === 'decision.expiry')!.rules!.some(r => r.rule === 'registered' && r.name === 'authorisation_validity_from_rule')).toBe(true);
  });

  /** The batch-2 contracts the product procedures carry (lib/health/products/procedures.ts), by the procedure each names. */
  const LINKED_2: Record<string, string> = {
    'HLT-MED-001': 'medicines.authorisation', 'HLT-MED-002': 'medicines.authorisation', 'HLT-MED-003': 'medicines.authorisation', 'HLT-MED-004': 'medicines.authorisation',
    'HLT-MED-005': 'medicines.authorisation', 'HLT-MED-006': 'medicines.authorisation', 'HLT-MED-007': 'medicines.renewal', 'HLT-MED-008': 'medicines.variation',
    'HLT-MED-009': 'medicines.suspension', 'HLT-MED-010': 'medicines.manufacturer', 'HLT-MED-011': 'medicines.manufacturer', 'HLT-MED-017': 'medicines.recall',
    'HLT-MED-018': 'medicines.recall', 'HLT-MED-019': 'medicines.device-registration',
    // Health I4, second step: corrective action, import and controlled-medicine authorisation, safety and incident intake, reconsideration.
    'HLT-MED-012': 'medicines.corrective-action', 'HLT-MED-013': 'medicines.import-authorisation', 'HLT-MED-014': 'medicines.controlled', 'HLT-MED-015': 'medicines.safety-report',
    'HLT-MED-020': 'medicines.device-incident', 'HLT-MED-023': 'medicines.reconsideration',
  };
  it('takes authority from the deployment profile: the medicines slot, stood in for provisionally by the health regulator until the nation names it', () => {
    // The slots ship empty, like every slot (owner's direction 2026-10-21, health integration §3).
    for (const k of ['medicinesRegulation', 'controlledSubstances', 'publicHealth']) expect(AUTHORITIES.find(a => a.key === k), k).toMatchObject({ optional: true });
    for (const id of IDS_2) {
      const f = med(id);
      expect(f.owner, id).toBe(id === 'HLT-MED-014' ? 'controlledSubstances' : 'medicinesRegulation');
      expect(f.authorityNote ?? '', id).toMatch(/ships empty.*provisional owner.*never proof of legal competence/);
      expect(f.deviations.map(d => d.id), id).toContain('medicines-authority-slot');
      // Adopted into the product procedures by identity (Health I4); the rest wait with the reason no procedure fits.
      if (LINKED_2[id]) expect(f.procedure, id).toMatchObject({ key: LINKED_2[id] });
      else { expect(f.procedure, id).toBeNull(); expect(f.awaits ?? '', id).toMatch(/not built|no case is opened/); }
    }
    expect(Object.keys(LINKED_2)).toHaveLength(20);
  });

  it('keeps dossier content with the regulator and the public product check to what may be published', () => {
    for (const [id, key] of [['HLT-MED-001', 'application.dossier'], ['HLT-MED-002', 'dossier.files'], ['HLT-MED-002', 'dossier.parts'], ['HLT-MED-001', 'product.composition'], ['HLT-MED-003', 'assessment.findings'], ['HLT-MED-010', 'site.master_file'], ['HLT-MED-019', 'device.technical_documentation']] as const) {
      expect(med(id).fields.find(x => x.key === key)!.personalDataClass, `${id} ${key}`).toBe('restricted');
    }
    // Only names are public in the applications; everything else is published only as the product's public information classification allows.
    for (const id of ['HLT-MED-001', 'HLT-MED-019']) expect(flat(med(id).fields).filter(x => x.personalDataClass === 'public').map(x => x.key), id).toEqual([id === 'HLT-MED-001' ? 'product.name' : 'device.name']);
    const check = med('HLT-MED-024');
    for (const x of flat(check.fields)) expect(['public', 'administrative'], x.key).toContain(x.personalDataClass);
    expect(check.fields.find(x => x.key === 'check.answer')!).toMatchObject({ personalDataClass: 'public', audience: 'officer' });
    expect(check.form.policies?.['answer.public_fields']).toMatch(/public information classification/);
    expect(med('HLT-MED-006').fields.find(x => x.key === 'decision.public_disclosure')!.valuesSourceId).toBe('medicines.country.public_product_fields');
  });

  // ── Batch 4: public-health programme forms ──
  const ph = (id: string) => CATALOGUE_CONTRACTS.find(x => x.specId === id)!;
  it('keeps the vaccination programme record to aggregates: no person vaccinated, the four classes kept apart, supply as programme counts', () => {
    const f = ph('HLT-PH-011');
    expect(flat(f.fields).filter(x => ['party', 'person', 'contact'].includes(x.type) || x.personalDataClass === 'personal').map(x => x.key)).toEqual([]);
    for (const x of flat(f.fields)) expect(words(x.key).filter(w => ['vaccinee', 'name', 'birth', 'age', 'sex', 'identity', 'reaction', 'adverse'].includes(w)), x.key).toEqual([]);
    expect(f.fields.find(x => x.key === 'activity.doses')!.items!.map(i => i.key)).toEqual(['breakdown', 'basis', 'count', 'status']);
    expect(f.form.lists?.['civicos.public_health.count_basis']?.values.map(v => v.value)).toEqual(['reported', 'suspected', 'confirmed', 'modelled']);
    expect(f.fields.find(x => x.key === 'activity.supply')!.items!.map(i => i.key)).toEqual(['supplyItem', 'received', 'used', 'status']);
    expect(f.fields.find(x => x.key === 'activity.programme')).toMatchObject({ type: 'registryReference', register: 'programme' });
    expect((f.fields.find(x => x.key === 'activity.suppression')!.rules ?? []).some(r => r.rule === 'registered' && r.name === 'small_cell_suppression_from_policy')).toBe(true);
    expect(f.deviations.map(d => d.id)).toEqual(expect.arrayContaining(['aggregate-only', 'no-vaccinee', 'supply-not-stock']));
    // The return carries the same four classes (HLT-PH-015, linked to the same procedure).
    expect(ph('HLT-PH-015').fields.find(x => x.key === 'return.counts')!.items!.find(i => i.key === 'basis')!.valuesSourceId).toBe('civicos.public_health.count_basis');
  });

  it('approves a risk communication by two officials, and links each public-health form to its procedure by identity', () => {
    const f = ph('HLT-PH-014');
    expect(f.fields.map(x => x.key)).toEqual(expect.arrayContaining(['message.text', 'message.audience', 'message.channels', 'message.evidence_basis']));
    expect(f.fields.find(x => x.key === 'message.approval')!.audience).not.toBe('applicant');
    expect(f.deviations.map(d => d.id)).toEqual(expect.arrayContaining(['two-official-approval', 'aggregate-only']));
    const pkg = PROGRAMME_PROCEDURES.find(p => p.key === 'public-health.risk-communication')!;
    expect(pkg.actions.find(a => a.key === 'approve')).toMatchObject({ decision: 'approve-message', needs: { role: 'signatory', fourEyes: true } });
    expect(ph('HLT-PH-011').procedure).toMatchObject({ key: 'public-health.programme-return', stage: 'submitted', action: 'register', document: 'return-form' });
    expect(ph('HLT-PH-015').procedure).toMatchObject({ key: 'public-health.programme-return', stage: 'submitted', action: 'register', document: 'return-form' });
    expect(f.procedure).toMatchObject({ key: 'public-health.risk-communication', stage: 'drafted', action: 'register', document: 'draft-message' });
    for (const id of ['HLT-PH-011', 'HLT-PH-014', 'HLT-PH-015']) expect(ph(id).owner, id).toBe('publicHealth');
  });

  // ── Batch 5: internal administration ──
  const adm = (id: string) => CATALOGUE_CONTRACTS.find(x => x.specId === id)!;
  /** The batch-5 contracts the internal-administration procedures carry (lib/administration/procedures.ts), by template. */
  const LINKED_5: Record<string, string> = {
    'ADM-HR-001': 'adm.establishment', 'ADM-PAY-011': 'adm.payroll-input', 'ADM-PAY-012': 'adm.payroll-review', 'ADM-PAY-013': 'adm.payroll-correction',
    'ADM-ICT-030': 'adm.privileged-access', 'ADM-GOV-040': 'adm.policy', 'ADM-GOV-039': 'adm.delegation', 'ADM-HR-010': 'adm.disciplinary', 'ADM-LEG-027': 'adm.legal-advice',
    // Plan step I5: the institution's own procurement procedures (proc.<template>.<institution>).
    'ADM-PRC-018': 'proc.plan', 'ADM-PRC-019': 'proc.tender', 'ADM-PRC-020': 'proc.tender',
  };
  const TEMPLATES_5 = [...ADMINISTRATION_PROCEDURES, ...PROCUREMENT_PROCEDURES];

  it('links payroll input, review and correction, the establishment, privileged access, internal policy and delegation (and the disciplinary and legal-advice forms, and since I5 the procurement requisition, evaluation and order) to their procedures; the rest wait with the reason', () => {
    for (const id of IDS_5) {
      const f = adm(id);
      expect(f.owner, id).toBe('institution');
      expect(f.authorityNote ?? '', id).toMatch(/adopts .* as its own/);
      expect(f.deviations.map(d => d.id), id).toContain('institution-owned');
      if (LINKED_5[id]) {
        expect(f.procedure, id).toMatchObject({ key: LINKED_5[id] });
        expect(TEMPLATES_5.find(p => p.key === LINKED_5[id])!.forms, id).toContain(id);
      } else {
        expect(f.procedure, id).toBeNull();
        expect(f.awaits ?? '', id).toMatch(/not built/);
        expect(f.deviations.map(d => d.id), id).toContain('procedure-not-built');
      }
    }
    expect(Object.keys(LINKED_5)).toHaveLength(12);
    // Every template carries exactly the forms linked to it.
    for (const p of TEMPLATES_5) expect(p.forms.every(id => LINKED_5[id] === p.key), p.key).toBe(true);
  });

  it('keeps separation of duties: the payroll approver is neither the preparer nor the reviewer, through the form rule and the procedure step', () => {
    const f = adm('ADM-PAY-012');
    const approver = f.fields.find(x => x.key === 'payroll.approved_by')!;
    expect(approver.audience).toBe('officer');
    expect(approver.rules).toEqual(expect.arrayContaining([{ rule: 'registered', name: 'SEPARATION-OF-DUTIES', params: { fields: ['payroll.prepared_by', 'payroll.reviewed_by'] } }]));
    const review = ADMINISTRATION_PROCEDURES.find(p => p.key === 'adm.payroll-review')!;
    expect(review.actions.find(a => a.key === 'approve')!.needs).toMatchObject({ role: 'signatory', fourEyes: true, distinctFrom: ['review'] });
    // Every approving decision of a linked procedure needs a second official; the comparison of persons is dualControlRefusal()'s.
    for (const key of new Set(Object.values(LINKED_5))) {
      const p = TEMPLATES_5.find(x => x.key === key)!;
      for (const a of p.actions.filter(x => x.decision && /^(approve|correct|disciplinary|grant|record|award)-?/.test(x.decision))) expect(a.needs.fourEyes, `${key} ${a.key}`).toBe(true);
    }
    expect(dualControlRefusal({ by: 'A', byId: 'local:a' }, { by: 'A', byId: 'local:a' })).toBeTruthy();
    // The other approvals ask for an approver other than the maker.
    for (const id of ['ADM-FIN-015', 'ADM-FIN-017', 'ADM-PRC-020', 'ADM-AST-024', 'ADM-REC-026', 'ADM-ICT-031', 'ADM-COM-033', 'ADM-COM-034', 'ADM-PLN-037', 'ADM-HR-007']) {
      expect(flat(adm(id).fields).some(x => x.audience === 'officer' && (x.rules ?? []).some(r => r.rule === 'registered' && r.name === 'APPROVER-DIFFERS-FROM-MAKER')), id).toBe(true);
    }
  });

  it('restricts personnel, disciplinary and legal-advice data, every read logged', () => {
    for (const id of ['ADM-HR-003', 'ADM-HR-004', 'ADM-HR-005', 'ADM-HR-006', 'ADM-HR-007', 'ADM-HR-009', 'ADM-HR-010', 'ADM-PAY-011', 'ADM-PAY-012', 'ADM-PAY-013', 'ADM-LEG-027', 'ADM-LEG-028']) {
      const f = adm(id);
      expect(f.form.policies?.['access.read_rule'], id).toMatch(/restricted to its assignee and supervisors; every read in the access log/);
      expect(f.deviations.map(d => d.id), id).toEqual(expect.arrayContaining([id.startsWith('ADM-LEG') ? 'legal-privilege' : 'personnel-restricted']));
      // Anything about a person, the allegation, the question and the advice: restricted (a department or a payroll batch is not personal).
      for (const x of f.fields.filter(y => ['party', 'registryReference', 'longtext', 'document', 'group'].includes(y.type) && !/(department|requesting_unit|batch)$/.test(y.key))) expect(x.personalDataClass, `${id} ${x.key}`).toBe('restricted');
    }
    for (const key of ['adm.payroll-input', 'adm.payroll-review', 'adm.payroll-correction', 'adm.disciplinary', 'adm.legal-advice', 'adm.privileged-access']) expect(ADMINISTRATION_PROCEDURES.find(p => p.key === key)!.sensitivity, key).toBe('restricted');
    // No pay, bank or payslip field: those stay in the payroll system.
    for (const id of IDS_5) expect(flat(adm(id).fields).map(x => x.key).filter(k => /bank|account_number|payslip|salary/.test(k)), id).toEqual([]);
  });

  it('types in no grade, entitlement, rate, limit, schedule or scale: each is the nation\'s, named, and none ships', () => {
    for (const id of IDS_5) {
      const f = adm(id);
      for (const name of Object.keys(f.form.lists ?? {})) expect(name, `${id} ships ${name}`).not.toMatch(/^(administration|procurement)\.(country|institution)\./);
      for (const x of flat(f.fields)) if (/^(administration|procurement)\.(country|institution)\./.test(x.valuesSourceId ?? '')) expect(x.countryDecision ?? '', `${id} ${x.key}`).toMatch(/none ship/);
      // Amounts the official enters are numbers in the nation's currency; no money field is typed.
      expect(flat(f.fields).filter(x => x.type === 'money').map(x => x.key), id).toEqual([]);
    }
    for (const [id, key] of [['ADM-HR-006', 'administration.leave.entitlements'], ['ADM-PAY-012', 'adm.payroll.deductions'], ['ADM-FIN-016', 'administration.finance.expense-rates'], ['ADM-REC-025', 'administration.records.retention']] as const) {
      expect(adm(id).nationValues.find(v => v.key === key), `${id} ${key}`).toMatchObject({ source: 'rule' });
    }
    expect(adm('ADM-ICT-030').fields.find(x => x.key === 'access.period')!.rules!.some(r => r.rule === 'registered' && r.name === 'privileged_access_period_from_policy')).toBe(true);
  });

  it('records delegation between accounts, never offices, with its legal basis and period', () => {
    const f = adm('ADM-GOV-039');
    expect(f.fields.find(x => x.key === 'delegation.delegator')).toMatchObject({ type: 'registryReference', register: 'civicos.registry.officials' });
    expect(f.fields.find(x => x.key === 'delegation.delegate')).toMatchObject({ type: 'registryReference', register: 'civicos.registry.officials' });
    expect(f.fields.find(x => x.key === 'delegation.delegator_office')!.required).toBeFalsy();
    expect(f.fields.find(x => x.key === 'delegation.legal_basis')!.rules!.some(r => r.rule === 'registered' && r.name === 'legal_references_resolve')).toBe(true);
    expect(f.deviations.map(d => d.id)).toContain('accounts-not-offices');
  });

  // ── Batch 3: taxpayer registration and account ──
  const tax = (id: string) => CATALOGUE_CONTRACTS.find(x => x.specId === id)!;
  const REG3 = ['individual', 'public_entity', 'nonresident', 'branch'].map(x => `taxpayer.registration.${x}`);
  const ownFields = (f: CatalogueLibraryForm) => flat(f.fields).filter(x => !x.group);

  it('keeps the two taxpayer.registration.further_information rows apart: two contracts, two lines, two form IDs', () => {
    const a = tax('taxpayer.registration.further_information'), b = tax('taxpayer.registration.further_information@P2');
    expect(a.catalogue.id).toBe(b.catalogue.id);
    expect([a.catalogue.line, b.catalogue.line]).toEqual([2543, 2714]);
    expect(a.key).not.toBe(b.key);
    expect(findLibraryForm('taxpayer.registration.further_information@P2')!.def.key).toBe(b.key);
    for (const f of [a, b]) expect(f.deviations.map(d => d.id)).toContain('two-rows');
    // The service-table request is what the applicant receives; the internal one records why and links the request it issued.
    expect(a.fields.map(x => x.key)).toEqual(expect.arrayContaining(['request.respond_by', 'request.law', 'request.clock_stops']));
    expect(b.fields.map(x => x.key)).toEqual(expect.arrayContaining(['request.basis', 'request.missing_items', 'request.notice_ref']));
    expect(b.fields.find(x => x.key === 'request.items')!.items!.map(i => i.key)).toEqual(['itemRef', 'reason', 'responseDueRuleRef']);
  });

  it('holds every taxpayer field under tax secrecy: restricted, confidentiality tax, read only under canReadTax()', () => {
    for (const id of IDS_3) {
      const f = tax(id);
      for (const x of ownFields(f)) {
        expect(x.personalDataClass, `${id} ${x.key}`).toBe('restricted');
        expect(x.confidentiality, `${id} ${x.key}`).toBe('tax');
      }
      // Only the declaration and the fee are field groups: they record the act of declaring and the fee, never taxpayer data.
      expect([...new Set(flat(f.fields).filter(x => x.group).map(x => x.group!.id))].every(g => ['core.declaration_signature', 'core.payment'].includes(g)), id).toBe(true);
      expect(f.form.policies?.['access.read_rule'], id).toMatch(/canReadTax\(\)/);
      expect(f.form.policies?.['access.others'], id).toMatch(/taxpayer\.status/);
      expect(f.deviations.map(d => d.id), id).toEqual(expect.arrayContaining(['tax-secrecy-class', 'no-tax-values']));
    }
    // Never weaker than the specification's taxpayer registration form.
    const strictest = Math.max(...SPEC_TAXPAYER.fields.map(x => CLASS_RANK[SPEC_CLASSES[x.personal_data_class]!.cls]));
    expect(CLASS_RANK.restricted).toBeGreaterThanOrEqual(strictest);
  });

  it('types in no rate, threshold, trigger, deadline or fee: each is a binding rule and a named nation value; tax lists ship empty with their standard', () => {
    const NATION_LISTS: Record<string, RegExp | null> = {
      'tax.country.approved_taxpayer_types': null, 'tax.country.approved.tax_obligations': /IMF GFSM 2014/, 'tax.country.approved.business_activity_codes': /ISIC/,
      'tax.country.approved.establishment_kinds': /OECD or UN Model Tax Convention/, 'tax.country.approved.public_entity_registration_bases': null,
      'tax.country.approved.nonresident_registration_bases': null, 'tax.country.approved.cancellation_grounds': null, 'tax.country.approved.suspension_grounds': null,
      'tax.country.tax_offices': null, 'tax.country.approved.dispute_remedies': null, 'tax.country.approved.dispute_routes': null, 'tax.country.specialist_units': null,
      'tax.country.approved.lookup_purposes': null, 'tax.registration.required_items': null,
    };
    const seen = new Set<string>();
    for (const id of IDS_3) {
      const f = tax(id);
      for (const name of Object.keys(NATION_LISTS)) expect(f.form.lists?.[name], `${id} ships ${name}`).toBeUndefined();
      for (const x of flat(f.fields)) {
        if (!x.valuesSourceId || !(x.valuesSourceId in NATION_LISTS)) continue;
        seen.add(x.valuesSourceId);
        expect(x.countryDecision ?? '', `${id} ${x.key}`).toMatch(/country\.tax\.|none ship/);
        const std = NATION_LISTS[x.valuesSourceId];
        if (std) expect(x.countryDecision ?? '', `${id} ${x.key}`).toMatch(std);
      }
      for (const v of f.nationValues) {
        expect(['fee', 'days', 'period', 'threshold'], `${id} ${v.key}`).toContain(v.kind);
        expect(v.key, id).toMatch(/^tax\./);
      }
      // A requested obligation is checked against the nation's threshold and trigger rule, unset.
      for (const k of ['taxpayer.obligations_requested', 'obligation.requested']) {
        const x = f.fields.find(y => y.key === k);
        if (x) expect((x.rules ?? []).some(r => r.rule === 'registered' && r.name === 'registration_obligation_from_rule'), `${id} ${k}`).toBe(true);
      }
      if (f.fields.some(x => x.key === 'taxpayer.obligations_requested' || x.key === 'obligation.requested')) expect(f.nationValues.some(v => v.key === 'tax.registration.threshold' && v.source === 'rule'), id).toBe(true);
    }
    expect([...seen].sort()).toEqual(Object.keys(NATION_LISTS).sort());
    // Fees only through core.payment, for certificates.
    for (const id of IDS_3) expect(flat(tax(id).fields).filter(x => x.type === 'money').map(x => x.key), id).toEqual(['taxpayer.certificate.request', 'taxpayer.registration.duplicate'].includes(id) ? ['payment.calculated_amount'] : []);
    // Dispute periods are counted by the approved rule from the event date, never a number of days.
    for (const id of ['taxpayer.registration.objection', 'taxpayer.registration.appeal', 'taxpayer.registration.appeal_assessment']) {
      const f = tax(id);
      expect(flat(f.fields).some(x => (x.rules ?? []).some(r => r.rule === 'registered' && r.name === 'dispute_period_from_rule')), id).toBe(true);
      expect(f.nationValues.some(v => /^tax\.disputes\./.test(v.key) && v.source === 'rule'), id).toBe(true);
    }
  });

  it('identifies taxpayers only through the registers: an organisation, an institution or a person, and the TIN only from the tax register', () => {
    const reg = (id: string, key: string) => tax(id).fields.find(x => x.key === key)!;
    expect(reg('taxpayer.registration.branch', 'taxpayer.organisation')).toMatchObject({ type: 'registryReference', register: 'organisation' });
    expect(reg('taxpayer.registration.nonresident', 'taxpayer.organisation')).toMatchObject({ type: 'registryReference', register: 'organisation' });
    expect(reg('taxpayer.registration.public_entity', 'taxpayer.public_entity')).toMatchObject({ type: 'registryReference', register: 'institution' });
    expect(reg('taxpayer.registration.individual', 'taxpayer.person')).toMatchObject({ type: 'registryReference', register: 'person' });
    // The applicant is never asked to type a taxpayer identification number: the register gives it when the registration is decided.
    for (const id of [...REG3, 'taxpayer.registration.decision']) {
      const t = flat(tax(id).fields).find(x => /\.tin$/.test(x.key))!;
      expect(t.audience, id).toBe('officer');
      expect(tax(id).deviations.map(d => d.id), id).toContain('tin-assigned');
    }
    // Later forms point to the taxpayer's account in the tax register.
    for (const id of IDS_3) for (const x of tax(id).fields.filter(y => y.key.endsWith('.taxpayer'))) expect(x, `${id} ${x.key}`).toMatchObject({ type: 'registryReference', register: 'taxpayer' });
    // No organisation or person is entered as a second identity: names come from the register, except a person or non-resident's legal name.
    for (const id of IDS_3) expect(flat(tax(id).fields).filter(x => x.type === 'party').map(x => x.key).every(k => /representative|responsible_official/.test(k)), id).toBe(true);
  });

  it('stays consistent with the catalogue\'s business registration contract and the specification\'s form', () => {
    const business = CANONICAL_LIBRARY.find(x => x.specId === 'taxpayer.registration.business')!;
    for (const id of REG3) {
      const f = tax(id);
      const keys = flat(f.fields).map(x => x.key);
      const notAsked = (f.deviations.find(d => d.id === 'business-fields')?.field ?? '').split(', ').filter(Boolean);
      for (const b of business.fields) {
        if (b.key === 'taxpayer.declaration') { expect(keys, id).toContain('declaration.confirmed'); continue; }
        expect(keys.includes(b.key) || notAsked.includes(b.key), `${id}: ${b.key}`).toBe(true);
        const mine = f.fields.find(x => x.key === b.key);
        if (mine && b.valuesSourceId && b.type === mine.type) expect(mine.valuesSourceId, `${id}: ${b.key}`).toBe(b.valuesSourceId);
      }
      for (const k of notAsked) expect(keys, `${id}: ${k} is said not to be asked`).not.toContain(k);
      // Every field of the specification's form is mapped to a field here, or said not to be asked.
      const map = f.deviations.find(d => d.id === 'spec-form')!.what;
      for (const s of SPEC_TAXPAYER.fields) expect(map, `${id}: ${s.id}`).toContain(s.id);
      for (const [, to] of map.matchAll(/→ ([a-z_]+(?:\.[a-z_]+)*)/g)) expect(keys, `${id}: → ${to}`).toContain(to!);
    }
  });

  it('links each form to the reference tax procedure where it exists, else names the stage it waits for', () => {
    const linked: Record<string, [string, string, string?]> = {
      'taxpayer.registration.individual': ['tax.registration', 'submitted'], 'taxpayer.registration.public_entity': ['tax.registration', 'submitted'],
      'taxpayer.registration.nonresident': ['tax.registration', 'submitted'], 'taxpayer.registration.branch': ['tax.registration', 'submitted'],
      'taxpayer.registration.inspection': ['tax.registration', 'verification', 'verify'], 'taxpayer.registration.inspection_checklist': ['tax.registration', 'verification', 'verify'],
      'taxpayer.registration.verification_record': ['tax.registration', 'verification', 'verify'], 'taxpayer.registration.assessment': ['tax.registration', 'verification', 'propose'],
      'taxpayer.registration.decision': ['tax.registration', 'pending-approval', 'register'], 'taxpayer.registration.decision_record': ['tax.registration', 'pending-approval', 'register'],
      // Since forms batch 6 (plan step I5): the registration change forms belong to the registration amendment procedure.
      ...Object.fromEntries(['taxpayer.registration.amend', 'taxpayer.details.change', 'taxpayer.obligation.add', 'taxpayer.obligation.cancel', 'taxpayer.registration.transfer',
        'taxpayer.registration.suspend_request', 'taxpayer.registration.reactivate_request'].map(x => [x, ['tax.registration-amendment', 'submitted'] as [string, string]])),
    };
    for (const id of IDS_3) {
      const f = tax(id);
      if (linked[id]) {
        const [key, stage, action] = linked[id]!;
        expect(f.procedure, id).toMatchObject({ key, stage, ...(action ? { action } : {}) });
      } else {
        expect(f.procedure, id).toBeNull();
        expect(f.awaits ?? '', id).toMatch(/not built/);
      }
      expect(f.authorityNote ?? '', id).toMatch(/authorityFor\('tax'\)/);
    }
    // The tax procedures: the three references, then the tax services of plan step I5 (forms batch 6), none approved.
    expect(TAX_PROCEDURES.map(p => p.key)).toEqual(['tax.registration', 'tax.return', 'tax.objection', 'tax.registration-amendment', 'tax.amendment', 'tax.refund', 'tax.payment-plan', 'tax.payment-plan-review', 'tax.disclosure', 'tax.ruling', 'tax.compliance']);
    expect(AUTHORITIES.some(a => a.key === 'tax')).toBe(true);
  });

  it('keeps certificates and statements to what the register and the exchange answer', () => {
    for (const id of ['taxpayer.certificate.request', 'taxpayer.registration.duplicate']) {
      const f = tax(id);
      expect(f.exchange, id).toBe('taxpayer.status');
      expect(f.form.policies?.['certificate.content'], id).toMatch(/Only what the taxpayer\.status exchange service returns/);
      expect(f.deviations.map(d => d.id), id).toContain('status-only');
      expect(flat(f.fields).filter(x => !x.group).map(x => x.key).filter(k => /balance|amount|arrears|return|assessment|compliance/.test(k)), id).toEqual([]);
    }
    const st = tax('taxpayer.account.statement');
    expect(st.deviations.map(d => d.id)).toContain('statement-from-ledger');
    expect(flat(st.fields).filter(x => ['money', 'number'].includes(x.type)).map(x => x.key)).toEqual([]);
  });

  it('records an officer\'s findings with reasons, never a score; disputes reviewed by an official not disqualified', () => {
    for (const id of ['taxpayer.registration.inspection', 'taxpayer.registration.inspection_checklist', 'taxpayer.registration.assessment']) {
      const f = tax(id);
      expect(flat(f.fields).map(x => x.key).filter(k => /score|risk|rating|probability/i.test(k)), id).toEqual([]);
      expect(f.deviations.map(d => d.id), id).toContain('no-score');
    }
    for (const id of ['taxpayer.registration.inspection', 'taxpayer.registration.inspection_checklist']) {
      const obs = tax(id).fields.find(x => x.key === 'inspection.observations')!;
      expect(obs).toMatchObject({ type: 'longtext', required: true });
      expect(tax(id).deviations.map(d => d.id), id).toContain('observations-only');
    }
    for (const id of ['taxpayer.registration.objection', 'taxpayer.registration.appeal']) {
      const g = tax(id).fields.find(x => x.key.endsWith('.grounds'))!;
      const len = (g.rules ?? []).find(r => r.rule === 'registered' && r.name === 'length');
      expect(len && 'params' in len ? len.params : undefined, id).toEqual({ min: 20, max: 10000 });
    }
    expect(tax('taxpayer.registration.appeal_assessment').fields.find(x => x.key === 'appeal_assessment.not_disqualified')!.rules!.some(r => r.rule === 'registered' && r.name === 'must_be_true')).toBe(true);
  });

  // ── Batch 6: tax services ──
  const tax6 = (id: string) => CATALOGUE_CONTRACTS.find(x => x.specId === id)!;
  const own6 = (f: CatalogueLibraryForm) => flat(f.fields).filter(x => !x.group);

  it('holds every tax-services field under tax secrecy: restricted, confidentiality tax, read only under canReadTax()', () => {
    for (const id of IDS_6) {
      const f = tax6(id);
      for (const x of own6(f)) {
        expect(x.personalDataClass, `${id} ${x.key}`).toBe('restricted');
        expect(x.confidentiality, `${id} ${x.key}`).toBe('tax');
      }
      // Field groups only record the act of declaring, or (a refund) the payout account the catalogue names; never other taxpayer data.
      expect([...new Set(flat(f.fields).filter(x => x.group).map(x => x.group!.id))].every(g => ['core.declaration_signature', 'core.payout_account'].includes(g)), id).toBe(true);
      if (flat(f.fields).some(x => x.group?.id === 'core.payout_account')) expect(id).toBe('tax.refund.application');
      expect(f.form.policies?.['access.read_rule'], id).toMatch(/canReadTax\(\)/);
      expect(f.form.policies?.['access.others'], id).toMatch(/taxpayer\.status/);
      expect(f.deviations.map(d => d.id), id).toEqual(expect.arrayContaining(['tax-secrecy-class', 'no-tax-values']));
      expect(f.batch, id).toBe(6);
      expect(f.identity, id).toBe(`FIELD-SERIES-PARTS-01-02:${id}@1`);
    }
  });

  it('types in no rate, period, penalty, interest or fee: lists the law decides ship empty, charges come only from an approved rule, stated amounts are named', () => {
    const NATION = (src: string) => /^tax\.country\./.test(src) || ['tax.payment.approved_allocation_bases', 'tax.refund.approved_claim_bases', 'tax.compliance.approved_inspection_checklists'].includes(src);
    for (const id of IDS_6) {
      const f = tax6(id);
      for (const name of Object.keys(f.form.lists ?? {})) expect(NATION(name), `${id} ships ${name}`).toBe(false);
      // Lists a form ships are the procedure's own steps, proposed for the nation to review.
      for (const [name, l] of Object.entries(f.form.lists ?? {})) expect(l.proposed, `${id} ${name}`).toBe(true);
      for (const x of flat(f.fields)) if (x.valuesSourceId && NATION(x.valuesSourceId)) expect(x.countryDecision ?? '', `${id} ${x.key}`).toMatch(/country\.tax\.|Department [FG] country decisions/);
      for (const v of f.nationValues) {
        expect(['fee', 'days', 'period', 'threshold'], `${id} ${v.key}`).toContain(v.kind);
        expect(v.key, id).toMatch(/^tax\./);
      }
      const stated = String(f.form.policies?.['amounts.stated'] ?? '');
      for (const x of flat(f.fields).filter(y => y.type === 'money')) {
        const derived = (x.rules ?? []).some(r => r.rule === 'registered' && r.name === 'derived_from_approved_rule');
        if (derived) {
          // A charge: the platform's, calculated by the approved rule; the nation's rule for it is named, unset; a production installation refuses without it.
          expect(x.audience, `${id} ${x.key}`).toBe('system');
          expect(f.nationValues.some(v => v.source === 'rule'), `${id} names the rule for ${x.key}`).toBe(true);
          expect(f.deviations.map(d => d.id), id).toContain('charge-by-rule');
        } else {
          // A stated amount: named in the policy, never interest or a penalty.
          expect(stated.split(':')[0], `${id} ${x.key}`).toContain(x.key);
          expect(x.key, id).not.toMatch(/interest|penalt|fee/i);
          expect(f.deviations.map(d => d.id), id).toContain('stated-amount');
        }
      }
    }
    // The rules the nation must configure are binding (recorded as not performed until then, and a publication blocker).
    for (const name of ['nil_return_required_by_rule', 'late_filing_treatment_from_rule', 'payment_due_date_from_rule', 'refund_interest_from_rule', 'payment_arrangement_terms_from_rule', 'recovery_power_from_rule', 'voluntary_disclosure_treatment_from_rule', 'withholding_rule_active_for_period'])
      expect(RULE_REGISTRY[name]?.scope, name).toBe('binding');
  });

  it('counts every dispute period by the approved rule from the event date, never a number of days; grounds of 20–10,000 characters', () => {
    const DISPUTES = ['tax.return.periodic.objection', 'tax.return.periodic.appeal', 'tax.objection.submit', 'tax.assessment.review_request', 'tax.appeal.submit', 'tax.payment.dispute', 'tax.debt.recovery.dispute'];
    for (const id of DISPUTES) {
      const f = tax6(id);
      const g = f.fields.find(x => x.key === 'dispute.grounds')!;
      const len = (g.rules ?? []).find(r => r.rule === 'registered' && r.name === 'length');
      expect(len && 'params' in len ? len.params : undefined, id).toEqual({ min: 20, max: 10000 });
      expect(f.fields.find(x => x.key === 'dispute.timeliness_rule_ref')!.rules!.some(r => r.rule === 'registered' && r.name === 'dispute_period_from_rule'), id).toBe(true);
      expect(f.fields.find(x => x.key === 'dispute.timeliness_rule_ref')!.audience, id).toBe('officer');
      expect(f.nationValues.some(v => /^tax\.disputes\./.test(v.key) && v.source === 'rule'), id).toBe(true);
    }
    // An appeal goes to the body the law names: the tax authority never decides it, and a court's case is the judiciary's.
    for (const id of ['tax.return.periodic.appeal', 'tax.appeal.submit', 'tax.appeal.transmit', 'tax.appeal.response']) {
      expect(tax6(id).procedure, id).toBeNull();
      expect(tax6(id).deviations.map(d => d.id), id).toEqual(expect.arrayContaining(['court-appeal', 'appeal-not-built']));
    }
  });

  it('records an officer\'s findings with reasons, never a score; inspection records hold observations only; a referral names no suspect', () => {
    for (const id of IDS_6) expect(flat(tax6(id).fields).map(x => x.key).filter(k => /score|rating|probab|risk/i.test(k)), id).toEqual([]);
    const ASSESS = ['tax.return.periodic.officer_assessment', 'tax.refund.assessment', 'tax.objection.assessment', 'tax.compliance.findings_review', 'tax.debt.payment_plan.default_review', 'tax.debt.disclosure.assessment', 'tax.dispute.settlement_review'];
    for (const id of ASSESS) {
      const f = tax6(id);
      expect(f.deviations.map(d => d.id), id).toContain('no-score');
      expect(f.fields.find(x => x.key === 'assessment.findings')!.items!.map(i => i.key), id).toEqual(['matter', 'found', 'reasons']);
      expect(f.fields.find(x => x.key === 'assessment.recommendation')!.hint, id).toMatch(/not a finding of liability/);
      expect(f.fields.find(x => x.key === 'assessment.recorded_by')!.audience, id).toBe('officer');
    }
    for (const id of ['tax.compliance.evidence_register', 'tax.compliance.interview_record', 'tax.compliance.findings_draft']) expect(tax6(id).deviations.map(d => d.id), id).toContain('observations-only');
    expect(tax6('tax.compliance.case.open').fields.find(x => x.key === 'compliance.grounds')!.hint).toMatch(/never as the reason/);
    const referral = tax6('tax.compliance.referral');
    expect(referral.deviations.map(d => d.id)).toEqual(expect.arrayContaining(['no-suspect', 'referral-case']));
    expect(formScope(referral.key, referral.form, referral.fields).status).toBe('allowed');
    // The objection's completeness check is by an official who did not take the decision objected to.
    expect(tax6('tax.objection.assessment').fields.find(x => x.key === 'assessment.not_disqualified')!.rules!.some(r => r.rule === 'registered' && r.name === 'must_be_true')).toBe(true);
  });

  it('links each form to the tax procedure that carries it by identity, else names why it waits; payments open no case', () => {
    const linked: Record<string, [string, string, string?]> = {
      'tax.assessment.amendment': ['tax.amendment', 'lodged'],
      'tax.assessment.notice': ['tax.return', 'assessed', 'issue'],
      'tax.assessment.review_request': ['tax.amendment', 'lodged'],
      'tax.compliance.assessment_decision': ['tax.compliance', 'pending-approval', 'assess'],
      'tax.compliance.case.open': ['tax.compliance', 'opened', 'propose-scope'],
      'tax.compliance.case_closure': ['tax.compliance', 'findings-review', 'close'],
      'tax.compliance.evidence_register': ['tax.compliance', 'authorised'],
      'tax.compliance.findings_draft': ['tax.compliance', 'authorised', 'draft-findings'],
      'tax.compliance.findings_review': ['tax.compliance', 'findings-review', 'propose-assessment'],
      'tax.compliance.information_request': ['tax.compliance', 'authorised', 'request-information'],
      'tax.compliance.information_response': ['tax.compliance', 'awaiting-information', 'information-received'],
      'tax.compliance.inspection_plan': ['tax.compliance', 'authorised'],
      'tax.compliance.interview_record': ['tax.compliance', 'authorised'],
      'tax.compliance.scope.approve': ['tax.compliance', 'scope-review', 'authorise'],
      'tax.compliance.taxpayer_response': ['tax.compliance', 'awaiting-response', 'response-received'],
      'tax.debt.disclosure.assessment': ['tax.disclosure', 'assessment', 'propose'],
      'tax.debt.payment_plan.cancel_request': ['tax.payment-plan-review', 'received'],
      'tax.debt.payment_plan.change_request': ['tax.payment-plan-review', 'received'],
      'tax.debt.payment_plan.decision': ['tax.payment-plan', 'pending-approval', 'approve'],
      'tax.debt.payment_plan.default_review': ['tax.payment-plan-review', 'review', 'propose'],
      'tax.debt.payment_plan.evidence': ['tax.payment-plan', 'awaiting-evidence', 'evidence-received'],
      'tax.debt.payment_plan.request': ['tax.payment-plan', 'requested'],
      'tax.debt.voluntary_disclosure': ['tax.disclosure', 'received'],
      'tax.dispute.closure': ['tax.objection', 'pending-approval'],
      'tax.dispute.withdraw': ['tax.objection', 'review', 'withdraw'],
      'tax.objection.assessment': ['tax.objection', 'review', 'propose'],
      'tax.objection.decision': ['tax.objection', 'pending-approval', 'vary'],
      'tax.objection.extension_request': ['tax.objection', 'lodged'],
      'tax.objection.submit': ['tax.objection', 'lodged'],
      'tax.objection.supplement': ['tax.objection', 'awaiting-information', 'information-received'],
      'tax.refund.application': ['tax.refund', 'claimed'],
      'tax.refund.assessment': ['tax.refund', 'assessment', 'propose'],
      'tax.refund.decision': ['tax.refund', 'pending-approval', 'approve'],
      'tax.refund.payment_instruction': ['tax.refund', 'approved', 'instruct'],
      'tax.refund.reconciliation': ['tax.refund', 'instructed', 'reconcile'],
      'tax.refund.supporting_evidence': ['tax.refund', 'awaiting-evidence', 'evidence-received'],
      'tax.return.periodic.amend': ['tax.amendment', 'lodged'],
      'tax.return.periodic.correction': ['tax.amendment', 'lodged'],
      'tax.return.periodic.decision': ['tax.return', 'pending-approval', 'assess'],
      'tax.return.periodic.further_information': ['tax.return', 'returned', 'resubmit'],
      'tax.return.periodic.late_submission': ['tax.return', 'filed'],
      'tax.return.periodic.nil': ['tax.return', 'filed'],
      'tax.return.periodic.notice': ['tax.return', 'assessed', 'issue'],
      'tax.return.periodic.objection': ['tax.objection', 'lodged'],
      'tax.return.periodic.officer_assessment': ['tax.return', 'checking', 'propose'],
      'tax.ruling.decision': ['tax.ruling', 'pending-approval', 'issue'],
      'tax.ruling.further_information': ['tax.ruling', 'awaiting-information', 'information-received'],
      'tax.ruling.reconsideration': ['tax.ruling', 'requested'],
      'tax.ruling.request': ['tax.ruling', 'requested'],
      'tax.ruling.withdraw': ['tax.ruling', 'review', 'withdraw'],
      'tax.withholding.details.amend': ['tax.registration-amendment', 'submitted'],
      'tax.withholding.discrepancy.decision': ['tax.compliance', 'findings-review', 'close'],
      'tax.withholding.discrepancy.response': ['tax.compliance', 'awaiting-information', 'information-received'],
      'tax.withholding.registration': ['tax.registration-amendment', 'submitted'],
      'tax.withholding.return.amend': ['tax.amendment', 'lodged'],
      'tax.withholding.return.submit': ['tax.return', 'filed'],
    };
    for (const id of IDS_6) {
      const f = tax6(id);
      if (linked[id]) {
        const [key, stage, action] = linked[id]!;
        expect(f.procedure, id).toMatchObject({ key, stage, ...(action ? { action } : {}) });
        expect(f.json.procedure_package_id, id).toBe(key);
        expect(TAX_PROCEDURES.some(p => p.key === key), id).toBe(true);
      } else {
        expect(f.procedure, id).toBeNull();
        expect(f.awaits ?? '', id).toMatch(/not built|no case is opened/);
      }
      expect(f.authorityNote ?? '', id).toMatch(/authorityFor\('tax'\)/);
    }
    expect(Object.keys(linked)).toHaveLength(56);
    // Payments are bills and receipts, reconciled once each: no case is opened, and nothing is marked paid by a click.
    for (const id of ['tax.payment.initiate', 'tax.payment.external_reference', 'tax.withholding.payment']) {
      expect(tax6(id).awaits, id).toMatch(/no case is opened/);
      expect(tax6(id).deviations.map(d => d.id), id).toContain('bill-payment');
    }
    // Every procedure a batch-6 form names ships as a draft reference with no day count set.
    for (const key of new Set(Object.values(linked).map(([k]) => k))) {
      const p = TAX_PROCEDURES.find(x => x.key === key)!;
      expect(p.reference, key).toBe(true);
      for (const d of p.deadlines) expect(d.days, `${key} ${d.key}`).toBeUndefined();
    }
  });

  // ── Batch 7: independent oversight (plan I8) ──
  const ov = (id: string) => CATALOGUE_CONTRACTS.find(x => x.specId === id)!;
  it('links each oversight form to its body\'s procedure by identity; each body a slot that ships empty', () => {
    const linked: Record<string, [string, string, string?]> = {
      'DEM-CON-012': ['ombudsman.complaint', 'received', 'register'], 'DEM-CON-013': ['human-rights.complaint', 'received', 'register'],
      'DEM-CON-014': ['audit.engagement', 'fieldwork', 'record-finding'], 'DEM-CON-018': ['data-protection.rights-request', 'received', 'register'],
      'DEM-CON-019': ['integrity.disclosure', 'received', 'register'], 'DEM-CON-020': ['audit.engagement', 'response'], 'DEM-PUB-009': ['integrity.disclosure', 'received', 'register'],
    };
    for (const id of IDS_7) {
      const [key, stage, action] = linked[id]!;
      expect(ov(id).procedure, id).toMatchObject({ key, stage, ...(action ? { action } : {}) });
      expect(ov(id).batch).toBe(7);
      // A slot of the deployment profile (optional for every body but data protection, which every installation names); none ships set.
      expect(AUTHORITIES.find(a => a.key === ov(id).owner), id).toBeDefined();
      if (ov(id).owner !== 'dataProtection') expect(AUTHORITIES.find(a => a.key === ov(id).owner), id).toMatchObject({ optional: true });
      expect(ov(id).deviations.map(d => d.id), id).toEqual(expect.arrayContaining(['oversight-slot', 'recommendation-not-order']));
    }
    // The response answers every body's finding, never as a step of the body's case.
    expect(ov('DEM-CON-020').procedure!.also).toEqual(['ombudsman.complaint', 'human-rights.complaint', 'integrity.disclosure', 'data-protection.rights-request']);
    expect(ov('DEM-CON-020').procedure!.action).toBeUndefined();
  });

  it('keeps the person who raised a matter restricted and apart from the case, names no suspect, and writes no voter registration form', () => {
    for (const id of ['DEM-CON-012', 'DEM-CON-013', 'DEM-CON-018', 'DEM-CON-019', 'DEM-PUB-009']) {
      const f = ov(id);
      const person = f.fields.filter(x => /^(complainant|discloser|requester)\./.test(x.key));
      expect(person.length, id).toBeGreaterThanOrEqual(2);
      for (const x of person) expect(x.personalDataClass, `${id} ${x.key}`).toBe('restricted');
      expect(f.deviations.map(d => d.id), id).toContain('identity-kept-apart');
      // The procedure the form feeds keeps no field about that person: it goes to the protected-identity record.
      const p = INDEPENDENT_OVERSIGHT_PROCEDURES.find(x => x.key === f.procedure!.key)!;
      expect(p.fields.map(x => x.key).filter(k => /name|contact|complainant|discloser|requester|raisedBy/i.test(k)), id).toEqual([]);
    }
    for (const id of IDS_7) for (const x of flat(ov(id).fields)) expect(x.key, `${id} ${x.key}`).not.toMatch(/suspect|accused|offender|voter|score|risk_rating/);
    // Anonymity is the nation's decision; referrals carry the case reference only.
    for (const id of ['DEM-CON-012', 'DEM-CON-019', 'DEM-PUB-009']) expect((ov(id).fields.find(x => /\.anonymous$/.test(x.key))!.rules ?? []).some(r => r.rule === 'registered' && r.name === 'configured_profile'), id).toBe(true);
    for (const id of ['DEM-CON-019', 'DEM-PUB-009']) expect(ov(id).deviations.map(d => d.id), id).toEqual(expect.arrayContaining(['reference-only-referral', 'no-suspect']));
    // Voter registration and the forms the scope holds for legal review stay unwritten.
    for (const id of ['DEM-ELC-003', 'DEM-ELC-004', 'DEM-ELC-005', 'DEM-ELC-006']) {
      expect(CATALOGUE_CONTRACTS.find(x => x.specId === id), id).toBeUndefined();
      expect(scopeOf([id], []).status, id).toBe('legal_review');
    }
  });

  it('records an audit finding by criteria, condition, cause, effect, evidence and recommendation; the response sits beside it', () => {
    const f = ov('DEM-CON-014');
    expect(f.fields.map(x => x.key)).toEqual(expect.arrayContaining(['finding.criteria', 'finding.condition', 'finding.cause', 'finding.effect', 'finding.evidence_items', 'finding.recommendation']));
    for (const k of ['finding.criteria', 'finding.condition', 'finding.recommendation']) expect(f.fields.find(x => x.key === k)!.required, k).toBe(true);
    expect(f.deviations.map(d => d.id)).toEqual(expect.arrayContaining(['response-beside', 'report-approval']));
    const r = ov('DEM-CON-020');
    expect(r.fields.find(x => x.key === 'response.institution')!.rules!.some(x => x.rule === 'registered' && x.name === 'actor_authorized_for_institution')).toBe(true);
    expect(r.form.lists?.['civicos.oversight.response_positions']?.values.map(v => v.value)).toEqual(['accepted', 'partly-accepted', 'disputed']);
    // The data-protection request: the authority never reads the records itself.
    expect(ov('DEM-CON-018').deviations.map(d => d.id)).toContain('no-direct-read');
  });

  // ── Batch 8: executive office, Cabinet, treasury and budget (plan I5) ──
  const e8 = (id: string) => CATALOGUE_CONTRACTS.find(x => x.specId === id)!;
  it('links batch 8 to the I5 procedures by identity, else names why it waits; owners are slots, never a ministry', () => {
    const linked = IDS_8.filter(id => e8(id).procedure);
    expect(linked.length).toBe(43);
    for (const id of IDS_8) {
      const f = e8(id);
      expect(['finance', 'cabinetOffice'], id).toContain(f.owner);
      expect(f.authorityNote ?? '', id).toMatch(/authorityFor\('(finance|cabinetOffice)'\)/);
      if (f.procedure) expect([...FINANCE_PROCEDURES, ...CABINET_PROCEDURES].some(p => p.key === f.procedure!.key), id).toBe(true);
      else expect(f.deviations.some(d => /-not-built$/.test(d.id)), id).toBe(true);
    }
  });

  it('separates every payment stage by person and approves every payment by two officials', () => {
    const pay = FINANCE_PROCEDURES.find(p => p.key === 'treasury.payment')!;
    const step = (k: string) => pay.actions.find(a => a.key === k)!;
    expect(step('verify').needs.distinctFrom).toEqual(['instruct']);
    expect(step('approve').needs.fourEyes).toBe(true);
    expect(step('approve').needs.distinctFrom).toEqual(expect.arrayContaining(['instruct', 'verify']));
    expect(step('execute').needs.distinctFrom).toEqual(expect.arrayContaining(['instruct', 'approve']));
    expect(step('reconcile').needs.distinctFrom).toEqual(expect.arrayContaining(['instruct', 'approve', 'execute']));
    for (const id of ['treasury.payment.verify', 'treasury.payment.approve', 'treasury.payment.execute', 'treasury.payment.reconcile']) {
      expect(e8(id).procedure?.key, id).toBe('treasury.payment');
      expect(e8(id).items.some(i => i.met_by.deviation === 'separation-by-person'), id).toBe(true);
    }
    expect(e8('treasury.payment.approve').nationValues.map(v => v.key)).toContain('treasury.payment.approval-tiers');
    expect(dualControlRefusal).toBeTypeOf('function');
  });

  it('types in no threshold, tier, limit or calendar: stated amounts named, balances computed, the lists the law decides empty', () => {
    for (const id of IDS_8) {
      const f = e8(id);
      const stated = String(f.form.policies?.['amounts.stated'] ?? '').split(':')[0]!;
      for (const x of flat(f.fields).filter(y => y.type === 'money')) expect(stated, `${id} ${x.key}`).toContain(x.key);
      expect(f.deviations.map(d => d.id), id).toContain('no-amounts-typed');
      for (const v of f.nationValues) expect(ruleInForce(v.key), v.key).toBeUndefined();
    }
    for (const id of IDS_8.filter(i => i.startsWith('budget.execution.') && !i.endsWith('.approve'))) {
      expect(flat(e8(id).fields).map(x => x.key), id).not.toContain('execution.current_amount');
      expect(e8(id).items.some(i => i.met_by.deviation === 'balance-computed'), id).toBe(true);
    }
    expect(e8('exec.cabinet.decision.record').form.lists?.['exec.cabinet.legal_categories']?.values ?? []).toEqual([]);
  });

  it('keeps Cabinet actions within each institution\'s powers and petitions restricted, asking no identity proof', () => {
    expect(e8('exec.cabinet.decision.action_assign').deviations.map(d => d.id)).toContain('request-not-instruction');
    expect(e8('exec.cabinet.decision.record').deviations.map(d => d.id)).toContain('cabinet-rules');
    const sub = e8('exec.presidency.correspondence.submit');
    expect(sub.fields.find(x => x.key === 'correspondence.message')!.personalDataClass).toBe('restricted');
    expect(sub.deviations.map(d => d.id)).toContain('no-identity-demand');
    expect(flat(sub.fields).map(x => x.key).some(k => /identity|national_id|passport/.test(k))).toBe(false);
  });

  // ── Batch 9: human services (plan I6) ──
  const hs = (id: string) => CATALOGUE_CONTRACTS.find(x => x.specId === id)!;
  it('keeps human services free of biometrics, scores and clinical fields; medical evidence only as a sealed document', () => {
    for (const id of IDS_9) {
      const f = hs(id);
      expect(f.batch).toBe(9);
      expect(AUTHORITIES.find(a => a.key === f.owner), id).toBeDefined();
      for (const x of flat(f.fields)) expect(x.key, `${id} ${x.key}`).not.toMatch(/biometric|fingerprint|iris|face|template|score|risk|propensity/i);
      expect(f.deviations.map(d => d.id), id).toContain('no-score');
      if (/^(IDN|PAS)-/.test(id)) expect(f.deviations.map(d => d.id), id).toContain('no-biometric');
    }
    // An occupational injury: what happened at work, its category; the medical evidence a sealed document, nothing clinical.
    const injury = hs('LAB-EMP-010');
    expect(injury.fields.find(x => x.key === 'lab.medical_evidence_reference')!.type).toBe('document');
    expect(injury.deviations.map(d => d.id)).toContain('medical-sealed');
  });

  it('links the human services forms to their procedures, the verification exchanges and the approved rules', () => {
    const linked = IDS_9.filter(id => hs(id).procedure);
    expect(linked.length).toBe(74);
    for (const id of IDS_9.filter(id => !hs(id).procedure)) expect(hs(id).awaits, id).toMatch(/not built|no case is opened/);
    expect(hs('IDN-VER-001').exchange).toBe('identity.verify');
    expect(hs('PAS-APP-015').exchange).toBe('travel-document.status');
    // A passport fee is the approved schedule's, a benefit the programme's rule; the version is recorded, never typed.
    const fee = hs('PAS-APP-001').fields.find(x => x.key === 'application.fee')!;
    expect(fee.type).toBe('money');
    expect(fee.audience).toBe('system');
    expect(hs('PAS-APP-001').nationValues.find(v => v.kind === 'fee')).toMatchObject({ key: 'passports.fees', source: 'rule' });
    expect(hs('SOC-BEN-004').fields.find(x => x.key === 'soc.calculation_rule_version')!.audience).toBe('officer');
    // A payment instruction: maker and approver are the officials on the steps, a different person approving.
    expect(hs('SOC-BEN-018').deviations.map(d => d.id)).toContain('maker-checker');
    expect(SOCIAL_PROCEDURES.find(p => p.key === 'social.payment')!.actions.find(a => a.key === 'approve')!.needs?.distinctFrom).toEqual(['prepare']);
  });
});
