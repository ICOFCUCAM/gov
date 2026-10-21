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
// Batch 6 (owner's assignment, 21 October 2026): tax services, the field
// series Part 2 §2.6 Departments B–H: the 95 tax.* rows that had no contract
// (returns, assessments, objections, appeals and disputes, payments, refunds
// and credits, compliance, withholding, assistance, rulings and incentives,
// debt, arrangements and recovery). Every field restricted under tax secrecy,
// read only under canReadTax(). An amount a person states (a claim, a proposed
// schedule) is money with its currency, named in the form's amounts.stated
// policy; every charge (interest, a penalty) is the platform's, calculated by
// an approved rule. 56 are linked by identity to the tax procedures
// (lib/tax/procedures.ts), the rest wait with the reason no procedure fits.
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
import t6AppealResponse from './catalogue-contracts/tax.appeal.response.json';
import t6AppealSubmit from './catalogue-contracts/tax.appeal.submit.json';
import t6AppealTransmit from './catalogue-contracts/tax.appeal.transmit.json';
import t6AssessmentAmendment from './catalogue-contracts/tax.assessment.amendment.json';
import t6AssessmentNotice from './catalogue-contracts/tax.assessment.notice.json';
import t6AssessmentReviewRequest from './catalogue-contracts/tax.assessment.review_request.json';
import t6AssistanceEnquiry from './catalogue-contracts/tax.assistance.enquiry.json';
import t6AssistanceGuidanceRequest from './catalogue-contracts/tax.assistance.guidance_request.json';
import t6ComplianceAssessmentDecision from './catalogue-contracts/tax.compliance.assessment_decision.json';
import t6ComplianceCaseOpen from './catalogue-contracts/tax.compliance.case.open.json';
import t6ComplianceCaseClosure from './catalogue-contracts/tax.compliance.case_closure.json';
import t6ComplianceComplaint from './catalogue-contracts/tax.compliance.complaint.json';
import t6ComplianceEvidenceRegister from './catalogue-contracts/tax.compliance.evidence_register.json';
import t6ComplianceExtensionDecision from './catalogue-contracts/tax.compliance.extension_decision.json';
import t6ComplianceExtensionRequest from './catalogue-contracts/tax.compliance.extension_request.json';
import t6ComplianceFindingsDraft from './catalogue-contracts/tax.compliance.findings_draft.json';
import t6ComplianceFindingsReview from './catalogue-contracts/tax.compliance.findings_review.json';
import t6ComplianceInformationRequest from './catalogue-contracts/tax.compliance.information_request.json';
import t6ComplianceInformationResponse from './catalogue-contracts/tax.compliance.information_response.json';
import t6ComplianceInspectionPlan from './catalogue-contracts/tax.compliance.inspection_plan.json';
import t6ComplianceInterviewRecord from './catalogue-contracts/tax.compliance.interview_record.json';
import t6ComplianceReferral from './catalogue-contracts/tax.compliance.referral.json';
import t6ComplianceScopeApprove from './catalogue-contracts/tax.compliance.scope.approve.json';
import t6ComplianceTaxpayerResponse from './catalogue-contracts/tax.compliance.taxpayer_response.json';
import t6CreditAdjustment from './catalogue-contracts/tax.credit.adjustment.json';
import t6DebtDisclosureAssessment from './catalogue-contracts/tax.debt.disclosure.assessment.json';
import t6DebtPaymentPlanCancelRequest from './catalogue-contracts/tax.debt.payment_plan.cancel_request.json';
import t6DebtPaymentPlanChangeRequest from './catalogue-contracts/tax.debt.payment_plan.change_request.json';
import t6DebtPaymentPlanDecision from './catalogue-contracts/tax.debt.payment_plan.decision.json';
import t6DebtPaymentPlanDefaultReview from './catalogue-contracts/tax.debt.payment_plan.default_review.json';
import t6DebtPaymentPlanEvidence from './catalogue-contracts/tax.debt.payment_plan.evidence.json';
import t6DebtPaymentPlanRequest from './catalogue-contracts/tax.debt.payment_plan.request.json';
import t6DebtRecoveryAuthorize from './catalogue-contracts/tax.debt.recovery.authorize.json';
import t6DebtRecoveryClose from './catalogue-contracts/tax.debt.recovery.close.json';
import t6DebtRecoveryDispute from './catalogue-contracts/tax.debt.recovery.dispute.json';
import t6DebtRecoveryNotice from './catalogue-contracts/tax.debt.recovery.notice.json';
import t6DebtRecoveryResponse from './catalogue-contracts/tax.debt.recovery.response.json';
import t6DebtRecoverySuspendRequest from './catalogue-contracts/tax.debt.recovery.suspend_request.json';
import t6DebtStatementRequest from './catalogue-contracts/tax.debt.statement.request.json';
import t6DebtVoluntaryDisclosure from './catalogue-contracts/tax.debt.voluntary_disclosure.json';
import t6DisputeClosure from './catalogue-contracts/tax.dispute.closure.json';
import t6DisputeSettlementProposal from './catalogue-contracts/tax.dispute.settlement_proposal.json';
import t6DisputeSettlementReview from './catalogue-contracts/tax.dispute.settlement_review.json';
import t6DisputeWithdraw from './catalogue-contracts/tax.dispute.withdraw.json';
import t6IncentiveAmendment from './catalogue-contracts/tax.incentive.amendment.json';
import t6IncentiveApplication from './catalogue-contracts/tax.incentive.application.json';
import t6IncentiveComplianceReport from './catalogue-contracts/tax.incentive.compliance_report.json';
import t6IncentiveDecision from './catalogue-contracts/tax.incentive.decision.json';
import t6IncentiveRenewal from './catalogue-contracts/tax.incentive.renewal.json';
import t6IncentiveReviewRequest from './catalogue-contracts/tax.incentive.review_request.json';
import t6IncentiveSurrender from './catalogue-contracts/tax.incentive.surrender.json';
import t6IncentiveWithdrawal from './catalogue-contracts/tax.incentive.withdrawal.json';
import t6ObjectionAssessment from './catalogue-contracts/tax.objection.assessment.json';
import t6ObjectionDecision from './catalogue-contracts/tax.objection.decision.json';
import t6ObjectionExtensionRequest from './catalogue-contracts/tax.objection.extension_request.json';
import t6ObjectionSubmit from './catalogue-contracts/tax.objection.submit.json';
import t6ObjectionSupplement from './catalogue-contracts/tax.objection.supplement.json';
import t6PaymentAllocationRequest from './catalogue-contracts/tax.payment.allocation_request.json';
import t6PaymentDispute from './catalogue-contracts/tax.payment.dispute.json';
import t6PaymentExternalReference from './catalogue-contracts/tax.payment.external_reference.json';
import t6PaymentInitiate from './catalogue-contracts/tax.payment.initiate.json';
import t6PaymentReversalRequest from './catalogue-contracts/tax.payment.reversal_request.json';
import t6PaymentTransferRequest from './catalogue-contracts/tax.payment.transfer_request.json';
import t6RefundApplication from './catalogue-contracts/tax.refund.application.json';
import t6RefundAssessment from './catalogue-contracts/tax.refund.assessment.json';
import t6RefundDecision from './catalogue-contracts/tax.refund.decision.json';
import t6RefundPaymentInstruction from './catalogue-contracts/tax.refund.payment_instruction.json';
import t6RefundReconciliation from './catalogue-contracts/tax.refund.reconciliation.json';
import t6RefundSupportingEvidence from './catalogue-contracts/tax.refund.supporting_evidence.json';
import t6ReturnPeriodicAmend from './catalogue-contracts/tax.return.periodic.amend.json';
import t6ReturnPeriodicAppeal from './catalogue-contracts/tax.return.periodic.appeal.json';
import t6ReturnPeriodicCorrection from './catalogue-contracts/tax.return.periodic.correction.json';
import t6ReturnPeriodicDecision from './catalogue-contracts/tax.return.periodic.decision.json';
import t6ReturnPeriodicFurtherInformation from './catalogue-contracts/tax.return.periodic.further_information.json';
import t6ReturnPeriodicLateSubmission from './catalogue-contracts/tax.return.periodic.late_submission.json';
import t6ReturnPeriodicNil from './catalogue-contracts/tax.return.periodic.nil.json';
import t6ReturnPeriodicNotice from './catalogue-contracts/tax.return.periodic.notice.json';
import t6ReturnPeriodicObjection from './catalogue-contracts/tax.return.periodic.objection.json';
import t6ReturnPeriodicOfficerAssessment from './catalogue-contracts/tax.return.periodic.officer_assessment.json';
import t6ReturnPeriodicWithdrawRequest from './catalogue-contracts/tax.return.periodic.withdraw_request.json';
import t6RulingDecision from './catalogue-contracts/tax.ruling.decision.json';
import t6RulingFurtherInformation from './catalogue-contracts/tax.ruling.further_information.json';
import t6RulingReconsideration from './catalogue-contracts/tax.ruling.reconsideration.json';
import t6RulingRequest from './catalogue-contracts/tax.ruling.request.json';
import t6RulingWithdraw from './catalogue-contracts/tax.ruling.withdraw.json';
import t6WithholdingCertificateIssue from './catalogue-contracts/tax.withholding.certificate.issue.json';
import t6WithholdingDetailsAmend from './catalogue-contracts/tax.withholding.details.amend.json';
import t6WithholdingDiscrepancyDecision from './catalogue-contracts/tax.withholding.discrepancy.decision.json';
import t6WithholdingDiscrepancyResponse from './catalogue-contracts/tax.withholding.discrepancy.response.json';
import t6WithholdingPayment from './catalogue-contracts/tax.withholding.payment.json';
import t6WithholdingRegistration from './catalogue-contracts/tax.withholding.registration.json';
import t6WithholdingReturnAmend from './catalogue-contracts/tax.withholding.return.amend.json';
import t6WithholdingReturnSubmit from './catalogue-contracts/tax.withholding.return.submit.json';
import t6WithholdingStatementCorrect from './catalogue-contracts/tax.withholding.statement.correct.json';
import t6WithholdingStatementSubmit from './catalogue-contracts/tax.withholding.statement.submit.json';

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
export interface NationValue { key: string; kind: 'fee' | 'days' | 'period' | 'threshold' | 'hours'; source: 'rule' | 'setting' | 'procedure'; decision: string }
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
/** Batch 6: tax services, the field series Part 2 §2.6 Departments B–H (owner's assignment, 21 October 2026). */
export const BATCH_6 = [
  t6AppealResponse, t6AppealSubmit, t6AppealTransmit, t6AssessmentAmendment, t6AssessmentNotice, t6AssessmentReviewRequest,
  t6AssistanceEnquiry, t6AssistanceGuidanceRequest, t6ComplianceAssessmentDecision, t6ComplianceCaseOpen, t6ComplianceCaseClosure, t6ComplianceComplaint,
  t6ComplianceEvidenceRegister, t6ComplianceExtensionDecision, t6ComplianceExtensionRequest, t6ComplianceFindingsDraft, t6ComplianceFindingsReview, t6ComplianceInformationRequest,
  t6ComplianceInformationResponse, t6ComplianceInspectionPlan, t6ComplianceInterviewRecord, t6ComplianceReferral, t6ComplianceScopeApprove, t6ComplianceTaxpayerResponse,
  t6CreditAdjustment, t6DebtDisclosureAssessment, t6DebtPaymentPlanCancelRequest, t6DebtPaymentPlanChangeRequest, t6DebtPaymentPlanDecision, t6DebtPaymentPlanDefaultReview,
  t6DebtPaymentPlanEvidence, t6DebtPaymentPlanRequest, t6DebtRecoveryAuthorize, t6DebtRecoveryClose, t6DebtRecoveryDispute, t6DebtRecoveryNotice,
  t6DebtRecoveryResponse, t6DebtRecoverySuspendRequest, t6DebtStatementRequest, t6DebtVoluntaryDisclosure, t6DisputeClosure, t6DisputeSettlementProposal,
  t6DisputeSettlementReview, t6DisputeWithdraw, t6IncentiveAmendment, t6IncentiveApplication, t6IncentiveComplianceReport, t6IncentiveDecision,
  t6IncentiveRenewal, t6IncentiveReviewRequest, t6IncentiveSurrender, t6IncentiveWithdrawal, t6ObjectionAssessment, t6ObjectionDecision,
  t6ObjectionExtensionRequest, t6ObjectionSubmit, t6ObjectionSupplement, t6PaymentAllocationRequest, t6PaymentDispute, t6PaymentExternalReference,
  t6PaymentInitiate, t6PaymentReversalRequest, t6PaymentTransferRequest, t6RefundApplication, t6RefundAssessment, t6RefundDecision,
  t6RefundPaymentInstruction, t6RefundReconciliation, t6RefundSupportingEvidence, t6ReturnPeriodicAmend, t6ReturnPeriodicAppeal, t6ReturnPeriodicCorrection,
  t6ReturnPeriodicDecision, t6ReturnPeriodicFurtherInformation, t6ReturnPeriodicLateSubmission, t6ReturnPeriodicNil, t6ReturnPeriodicNotice, t6ReturnPeriodicObjection,
  t6ReturnPeriodicOfficerAssessment, t6ReturnPeriodicWithdrawRequest, t6RulingDecision, t6RulingFurtherInformation, t6RulingReconsideration, t6RulingRequest,
  t6RulingWithdraw, t6WithholdingCertificateIssue, t6WithholdingDetailsAmend, t6WithholdingDiscrepancyDecision, t6WithholdingDiscrepancyResponse, t6WithholdingPayment,
  t6WithholdingRegistration, t6WithholdingReturnAmend, t6WithholdingReturnSubmit, t6WithholdingStatementCorrect, t6WithholdingStatementSubmit,
] as unknown as CatalogueContractJson[];
/** The passages contracts answer the same way: every item applies to the forms in applies_to, an item with `for` only to that group (health: batches 1 and 2; tax: batch 3). */
export const COMMON_ITEMS = (common as unknown as { applies_to: string[]; groups: Record<string, string[]>; items: (CatalogueItem & { for?: string })[] });
/** The shared items that apply to one contract. */
export const commonItemsFor = (formId: string): CatalogueItem[] => (COMMON_ITEMS.applies_to.includes(formId) ? COMMON_ITEMS.items.filter(i => !i.for || COMMON_ITEMS.groups[i.for]?.includes(formId)).map(({ for: _for, ...i }) => i) : []);
/** Who the standard notices name, by the deployment-profile slot that owns the form. */
const INSTITUTION: Record<string, string> = { professionalRegulation: 'The professional regulator', tax: 'The tax authority', publicHealth: 'The public-health authority' };

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
export const CATALOGUE_CONTRACTS: CatalogueLibraryForm[] = [...BATCH_1.map(c => load(c, 1)), ...BATCH_2.map(c => load(c, 2)), ...BATCH_3.map(c => load(c, 3)), ...BATCH_4.map(c => load(c, 4)), ...BATCH_6.map(c => load(c, 6))];

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
