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
// and legal advice); since plan step I5 the procurement requisition,
// evaluation and order (ADM-PRC-018, 019, 020) are linked to the
// institution's own procurement procedures (proc.plan, proc.tender,
// lib/procurement/procedures.ts); the others name the procedure they wait for. The seven
// forms whose own JSON contract the supplement gives (§21.2: ADM-HR-002,
// ADM-PAY-012, ADM-PRC-018, ADM-ICT-029, ADM-ICT-030, ADM-AUD-036,
// ADM-GOV-039) answer every line of it, field by field. Separation of duties
// is the procedure's distinctFrom step through dualControlRefusal() and the
// registered SEPARATION-OF-DUTIES and APPROVER-DIFFERS-FROM-MAKER rules;
// personnel, disciplinary and legal-advice data are restricted and every read
// logged; grades, entitlements, rates, limits, schedules and scales are the
// nation's (binding rules, named nation values), none shipped.
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
// Batch 7 (owner approved; plan step I8, independent oversight): the
// catalogue Part 12 accountability forms the oversight procedures carry
// (lib/oversight/procedures.ts): DEM-CON-012 ombudsman complaint, DEM-CON-013
// human rights complaint, DEM-CON-014 public audit finding, DEM-CON-018
// personal data rights request, DEM-CON-019 protected disclosure, DEM-CON-020
// the institution's oversight response and DEM-PUB-009 public integrity
// complaint (docs/forms-catalogue/PARTS-12-13.md). The answers about the
// person who raised a matter go to the protected-identity record, never the
// case (lib/oversight/protected-identity.ts); a finding is a recommendation
// with reasons; a referral carries the case reference only; no field names a
// suspect. Each body is the institution the nation names for its slot,
// shipped empty. Voter registration (DEM-ELC-003 … 006) and the other forms
// the scope holds for legal review are not written.
//
// Batch 8 (owner's assignment; plan step I5, the economic group and the
// executive centre): the field series Part 2 forms the I5 procedures carry or
// wait for: official correspondence and petitions (§2.1 Department A, the
// exec.correspondence procedure), Cabinet agenda and decisions (§2.2
// Department A, cabinet.decision), payments and cash forecasting (§2.4
// Departments A and B, treasury.payment and treasury.cash-forecast) and budget
// preparation and execution (§2.5 Departments A and B, budget.circular,
// budget.ceiling, budget.bid, finance.commitment and budget.revision): 57
// forms, 43 linked by identity, the rest naming the procedure they wait for.
// Owners are the slots finance and cabinetOffice; the spending institution is
// named on each record. No threshold, tier, limit, calendar or quorum is
// typed: each is the nation's approved rule or country rule set. Payments are
// separated by person at every stage. Capital projects, fiscal policy,
// transfers, public debt and the Part 3 procurement forms are not written yet.
// Batch 9 (owner's assignment; plan step I6, human services): the field
// series Part 4 identity (IDN-*), passport and travel document (PAS-APP-*)
// and citizenship (NAT-APP-*) forms (docs/forms-catalogue/
// FIELD-SERIES-PARTS-03-04.md) and the supplement's Part 14 labour (LAB-EMP-*)
// and Part 15 social protection (SOC-BEN-*) forms, 96 in all. Each owner is
// the institution the nation names for its slot (identity, travelDocuments,
// citizenship, labour, socialProtection), shipped empty. The forms whose own
// JSON contract the supplement gives (§14.2, §15.2) answer every line of it,
// field by field. No biometric field or template, no score of any kind, no
// clinical field (an injury's medical evidence is a sealed document only); a
// passport fee is calculated only by the approved schedule passports.fees and
// a benefit only by the programme's approved rule, its version recorded. 74
// are linked to the procedures of lib/identity, lib/passports,
// lib/citizenship, lib/labour and lib/social; the others name what they wait
// for.
// Batch 13 (plan step I12, security governance and resilience): the catalogue
// Part 11 forms the security procedures carry or wait for
// (docs/forms-catalogue/PARTS-08-11.md §2.2–§2.4; lib/security/procedures.ts):
// fourteen cybersecurity forms (SEC-CYB-001 … 004, 008 … 017), twelve critical
// infrastructure forms (SEC-INF-001 … 007, 009, 013 … 016), the clearance
// application and review as metadata (SEC-INT-007, 008) and the supplement's
// three critical infrastructure contracts (CIP-REG-008, CIP-RSK-009,
// CIP-INC-010), answered field by field. Owners are the slots cyberAuthority,
// criticalInfrastructure and securityAccreditation, shipped empty. Metadata
// only: a form's marking is checked against the installation's accreditation;
// no field records a source, a target, an attacker or an attribution, nothing
// computes a score, vetting stays with the competent authority (its reference
// only). Every intelligence form (SEC-INT-001 … 006, 009 … 016, SEC-OVS-007)
// and the defence forms are not written: the first wait for the nation's legal
// review, the second are plan I11.
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
import con012 from './catalogue-contracts/DEM-CON-012.json';
import con013 from './catalogue-contracts/DEM-CON-013.json';
import con014 from './catalogue-contracts/DEM-CON-014.json';
import con018 from './catalogue-contracts/DEM-CON-018.json';
import con019 from './catalogue-contracts/DEM-CON-019.json';
import con020 from './catalogue-contracts/DEM-CON-020.json';
import pub009 from './catalogue-contracts/DEM-PUB-009.json';
// Batch 10: territory and infrastructure (plan I7).
import b10LndReg005 from './catalogue-contracts/LND-REG-005.json';
import b10LndReg007 from './catalogue-contracts/LND-REG-007.json';
import b10LndReg008 from './catalogue-contracts/LND-REG-008.json';
import b10LndReg009 from './catalogue-contracts/LND-REG-009.json';
import b10LndReg010 from './catalogue-contracts/LND-REG-010.json';
import b10LndReg011 from './catalogue-contracts/LND-REG-011.json';
import b10LndReg012 from './catalogue-contracts/LND-REG-012.json';
import b10LndReg016 from './catalogue-contracts/LND-REG-016.json';
import b10LndReg017 from './catalogue-contracts/LND-REG-017.json';
import b10LndReg020 from './catalogue-contracts/LND-REG-020.json';
import b10LndReg021 from './catalogue-contracts/LND-REG-021.json';
import b10LndReg022 from './catalogue-contracts/LND-REG-022.json';
import b10HpcHou001 from './catalogue-contracts/HPC-HOU-001.json';
import b10HpcHou002 from './catalogue-contracts/HPC-HOU-002.json';
import b10HpcHou003 from './catalogue-contracts/HPC-HOU-003.json';
import b10HpcHou004 from './catalogue-contracts/HPC-HOU-004.json';
import b10HpcPln009 from './catalogue-contracts/HPC-PLN-009.json';
import b10HpcPln012 from './catalogue-contracts/HPC-PLN-012.json';
import b10HpcPln013 from './catalogue-contracts/HPC-PLN-013.json';
import b10HpcBld014 from './catalogue-contracts/HPC-BLD-014.json';
import b10HpcBld015 from './catalogue-contracts/HPC-BLD-015.json';
import b10HpcBld016 from './catalogue-contracts/HPC-BLD-016.json';
import b10HpcBld017 from './catalogue-contracts/HPC-BLD-017.json';
import b10HpcBld018 from './catalogue-contracts/HPC-BLD-018.json';
import b10HpcBld019 from './catalogue-contracts/HPC-BLD-019.json';
import b10HpcBld020 from './catalogue-contracts/HPC-BLD-020.json';
import b10LrgOrg004 from './catalogue-contracts/LRG-ORG-004.json';
import b10LrgOrg005 from './catalogue-contracts/LRG-ORG-005.json';
import b10LrgFin008 from './catalogue-contracts/LRG-FIN-008.json';
import b10LrgSvc013 from './catalogue-contracts/LRG-SVC-013.json';
import b10LrgSvc014 from './catalogue-contracts/LRG-SVC-014.json';
import b10TrnVeh001 from './catalogue-contracts/TRN-VEH-001.json';
import b10TrnVeh002 from './catalogue-contracts/TRN-VEH-002.json';
import b10TrnDrv001 from './catalogue-contracts/TRN-DRV-001.json';
import b10TrnRoad002 from './catalogue-contracts/TRN-ROAD-002.json';
import b10TrnOps001 from './catalogue-contracts/TRN-OPS-001.json';
import e8BudgetAllocationApprove from './catalogue-contracts/budget.allocation.approve.json';
import e8BudgetAllocationNotify from './catalogue-contracts/budget.allocation.notify.json';
import e8BudgetAllocationPropose from './catalogue-contracts/budget.allocation.propose.json';
import e8BudgetBidJustification from './catalogue-contracts/budget.bid.justification.json';
import e8BudgetBidRevise from './catalogue-contracts/budget.bid.revise.json';
import e8BudgetBidWithdraw from './catalogue-contracts/budget.bid.withdraw.json';
import e8BudgetCeilingApprove from './catalogue-contracts/budget.ceiling.approve.json';
import e8BudgetCeilingPropose from './catalogue-contracts/budget.ceiling.propose.json';
import e8BudgetCircularIssue from './catalogue-contracts/budget.circular.issue.json';
import e8BudgetExecutionCommitment from './catalogue-contracts/budget.execution.commitment.json';
import e8BudgetExecutionCommitmentApprove from './catalogue-contracts/budget.execution.commitment.approve.json';
import e8BudgetExecutionCorrection from './catalogue-contracts/budget.execution.correction.json';
import e8BudgetExecutionOverrunReport from './catalogue-contracts/budget.execution.overrun.report.json';
import e8BudgetExecutionReallocationApprove from './catalogue-contracts/budget.execution.reallocation.approve.json';
import e8BudgetExecutionReallocationRequest from './catalogue-contracts/budget.execution.reallocation.request.json';
import e8BudgetExecutionSupplementaryRequest from './catalogue-contracts/budget.execution.supplementary.request.json';
import e8BudgetExecutionUnderspendReport from './catalogue-contracts/budget.execution.underspend.report.json';
import e8BudgetExecutionVarianceReport from './catalogue-contracts/budget.execution.variance.report.json';
import e8BudgetExecutionVirement from './catalogue-contracts/budget.execution.virement.json';
import e8BudgetExecutionYearEnd from './catalogue-contracts/budget.execution.year_end.json';
import e8BudgetNegotiationRecord from './catalogue-contracts/budget.negotiation.record.json';
import e8BudgetProgrammeCosting from './catalogue-contracts/budget.programme.costing.json';
import e8ExecCabinetActionClose from './catalogue-contracts/exec.cabinet.action.close.json';
import e8ExecCabinetActionUpdate from './catalogue-contracts/exec.cabinet.action.update.json';
import e8ExecCabinetAgendaApprove from './catalogue-contracts/exec.cabinet.agenda.approve.json';
import e8ExecCabinetAgendaPropose from './catalogue-contracts/exec.cabinet.agenda.propose.json';
import e8ExecCabinetDecisionActionAssign from './catalogue-contracts/exec.cabinet.decision.action_assign.json';
import e8ExecCabinetDecisionCorrect from './catalogue-contracts/exec.cabinet.decision.correct.json';
import e8ExecCabinetDecisionDistribution from './catalogue-contracts/exec.cabinet.decision.distribution.json';
import e8ExecCabinetDecisionRecord from './catalogue-contracts/exec.cabinet.decision.record.json';
import e8ExecCabinetPaperFiscalReview from './catalogue-contracts/exec.cabinet.paper.fiscal_review.json';
import e8ExecCabinetPaperLegalReview from './catalogue-contracts/exec.cabinet.paper.legal_review.json';
import e8ExecCabinetPaperRevise from './catalogue-contracts/exec.cabinet.paper.revise.json';
import e8ExecPresidencyCorrespondenceComplaint from './catalogue-contracts/exec.presidency.correspondence.complaint.json';
import e8ExecPresidencyCorrespondenceDecision from './catalogue-contracts/exec.presidency.correspondence.decision.json';
import e8ExecPresidencyCorrespondenceNotice from './catalogue-contracts/exec.presidency.correspondence.notice.json';
import e8ExecPresidencyCorrespondenceReferral from './catalogue-contracts/exec.presidency.correspondence.referral.json';
import e8ExecPresidencyCorrespondenceSubmit from './catalogue-contracts/exec.presidency.correspondence.submit.json';
import e8ExecPresidencyCorrespondenceSupplement from './catalogue-contracts/exec.presidency.correspondence.supplement.json';
import e8ExecPresidencyCorrespondenceWithdraw from './catalogue-contracts/exec.presidency.correspondence.withdraw.json';
import e8TreasuryCashForecastClose from './catalogue-contracts/treasury.cash_forecast.close.json';
import e8TreasuryCashForecastReview from './catalogue-contracts/treasury.cash_forecast.review.json';
import e8TreasuryCashForecastRevise from './catalogue-contracts/treasury.cash_forecast.revise.json';
import e8TreasuryCashForecastSubmit from './catalogue-contracts/treasury.cash_forecast.submit.json';
import e8TreasuryCashPositionReport from './catalogue-contracts/treasury.cash_position.report.json';
import e8TreasuryLiquidityResponse from './catalogue-contracts/treasury.liquidity.response.json';
import e8TreasuryLiquidityShortfall from './catalogue-contracts/treasury.liquidity.shortfall.json';
import e8TreasuryPaymentApprove from './catalogue-contracts/treasury.payment.approve.json';
import e8TreasuryPaymentCancelRequest from './catalogue-contracts/treasury.payment.cancel_request.json';
import e8TreasuryPaymentCorrection from './catalogue-contracts/treasury.payment.correction.json';
import e8TreasuryPaymentDispute from './catalogue-contracts/treasury.payment.dispute.json';
import e8TreasuryPaymentExecute from './catalogue-contracts/treasury.payment.execute.json';
import e8TreasuryPaymentReconcile from './catalogue-contracts/treasury.payment.reconcile.json';
import e8TreasuryPaymentRefund from './catalogue-contracts/treasury.payment.refund.json';
import e8TreasuryPaymentReject from './catalogue-contracts/treasury.payment.reject.json';
import e8TreasuryPaymentSupportingEvidence from './catalogue-contracts/treasury.payment.supporting_evidence.json';
import e8TreasuryPaymentVerify from './catalogue-contracts/treasury.payment.verify.json';
import b9IDNREG001 from './catalogue-contracts/IDN-REG-001.json';
import b9IDNREG002 from './catalogue-contracts/IDN-REG-002.json';
import b9IDNREG003 from './catalogue-contracts/IDN-REG-003.json';
import b9IDNREG004 from './catalogue-contracts/IDN-REG-004.json';
import b9IDNREG005 from './catalogue-contracts/IDN-REG-005.json';
import b9IDNCARD001 from './catalogue-contracts/IDN-CARD-001.json';
import b9IDNCARD002 from './catalogue-contracts/IDN-CARD-002.json';
import b9IDNCARD003 from './catalogue-contracts/IDN-CARD-003.json';
import b9IDNCARD004 from './catalogue-contracts/IDN-CARD-004.json';
import b9IDNCARD005 from './catalogue-contracts/IDN-CARD-005.json';
import b9IDNCARD006 from './catalogue-contracts/IDN-CARD-006.json';
import b9IDNCARD007 from './catalogue-contracts/IDN-CARD-007.json';
import b9IDNVER001 from './catalogue-contracts/IDN-VER-001.json';
import b9IDNVER002 from './catalogue-contracts/IDN-VER-002.json';
import b9IDNVER003 from './catalogue-contracts/IDN-VER-003.json';
import b9IDNACC001 from './catalogue-contracts/IDN-ACC-001.json';
import b9IDNACC002 from './catalogue-contracts/IDN-ACC-002.json';
import b9IDNACC003 from './catalogue-contracts/IDN-ACC-003.json';
import b9IDNACC004 from './catalogue-contracts/IDN-ACC-004.json';
import b9IDNSEC001 from './catalogue-contracts/IDN-SEC-001.json';
import b9IDNSEC002 from './catalogue-contracts/IDN-SEC-002.json';
import b9IDNSEC003 from './catalogue-contracts/IDN-SEC-003.json';
import b9PASAPP001 from './catalogue-contracts/PAS-APP-001.json';
import b9PASAPP002 from './catalogue-contracts/PAS-APP-002.json';
import b9PASAPP003 from './catalogue-contracts/PAS-APP-003.json';
import b9PASAPP004 from './catalogue-contracts/PAS-APP-004.json';
import b9PASAPP005 from './catalogue-contracts/PAS-APP-005.json';
import b9PASAPP008 from './catalogue-contracts/PAS-APP-008.json';
import b9PASAPP009 from './catalogue-contracts/PAS-APP-009.json';
import b9PASAPP010 from './catalogue-contracts/PAS-APP-010.json';
import b9PASAPP006 from './catalogue-contracts/PAS-APP-006.json';
import b9PASAPP007 from './catalogue-contracts/PAS-APP-007.json';
import b9PASAPP011 from './catalogue-contracts/PAS-APP-011.json';
import b9PASAPP012 from './catalogue-contracts/PAS-APP-012.json';
import b9PASAPP013 from './catalogue-contracts/PAS-APP-013.json';
import b9PASAPP014 from './catalogue-contracts/PAS-APP-014.json';
import b9PASAPP015 from './catalogue-contracts/PAS-APP-015.json';
import b9PASAPP016 from './catalogue-contracts/PAS-APP-016.json';
import b9PASAPP017 from './catalogue-contracts/PAS-APP-017.json';
import b9PASAPP018 from './catalogue-contracts/PAS-APP-018.json';
import b9NATAPP001 from './catalogue-contracts/NAT-APP-001.json';
import b9NATAPP002 from './catalogue-contracts/NAT-APP-002.json';
import b9NATAPP003 from './catalogue-contracts/NAT-APP-003.json';
import b9NATAPP004 from './catalogue-contracts/NAT-APP-004.json';
import b9NATAPP005 from './catalogue-contracts/NAT-APP-005.json';
import b9NATAPP006 from './catalogue-contracts/NAT-APP-006.json';
import b9NATAPP007 from './catalogue-contracts/NAT-APP-007.json';
import b9NATAPP010 from './catalogue-contracts/NAT-APP-010.json';
import b9NATAPP012 from './catalogue-contracts/NAT-APP-012.json';
import b9NATAPP008 from './catalogue-contracts/NAT-APP-008.json';
import b9NATAPP009 from './catalogue-contracts/NAT-APP-009.json';
import b9NATAPP011 from './catalogue-contracts/NAT-APP-011.json';
import b9LABEMP001 from './catalogue-contracts/LAB-EMP-001.json';
import b9LABEMP002 from './catalogue-contracts/LAB-EMP-002.json';
import b9LABEMP003 from './catalogue-contracts/LAB-EMP-003.json';
import b9LABEMP004 from './catalogue-contracts/LAB-EMP-004.json';
import b9LABEMP005 from './catalogue-contracts/LAB-EMP-005.json';
import b9LABEMP006 from './catalogue-contracts/LAB-EMP-006.json';
import b9LABEMP007 from './catalogue-contracts/LAB-EMP-007.json';
import b9LABEMP008 from './catalogue-contracts/LAB-EMP-008.json';
import b9LABEMP009 from './catalogue-contracts/LAB-EMP-009.json';
import b9LABEMP010 from './catalogue-contracts/LAB-EMP-010.json';
import b9LABEMP011 from './catalogue-contracts/LAB-EMP-011.json';
import b9LABEMP012 from './catalogue-contracts/LAB-EMP-012.json';
import b9LABEMP013 from './catalogue-contracts/LAB-EMP-013.json';
import b9LABEMP014 from './catalogue-contracts/LAB-EMP-014.json';
import b9LABEMP015 from './catalogue-contracts/LAB-EMP-015.json';
import b9LABEMP016 from './catalogue-contracts/LAB-EMP-016.json';
import b9LABEMP017 from './catalogue-contracts/LAB-EMP-017.json';
import b9LABEMP018 from './catalogue-contracts/LAB-EMP-018.json';
import b9LABEMP019 from './catalogue-contracts/LAB-EMP-019.json';
import b9LABEMP020 from './catalogue-contracts/LAB-EMP-020.json';
import b9SOCBEN001 from './catalogue-contracts/SOC-BEN-001.json';
import b9SOCBEN002 from './catalogue-contracts/SOC-BEN-002.json';
import b9SOCBEN003 from './catalogue-contracts/SOC-BEN-003.json';
import b9SOCBEN004 from './catalogue-contracts/SOC-BEN-004.json';
import b9SOCBEN005 from './catalogue-contracts/SOC-BEN-005.json';
import b9SOCBEN006 from './catalogue-contracts/SOC-BEN-006.json';
import b9SOCBEN017 from './catalogue-contracts/SOC-BEN-017.json';
import b9SOCBEN007 from './catalogue-contracts/SOC-BEN-007.json';
import b9SOCBEN009 from './catalogue-contracts/SOC-BEN-009.json';
import b9SOCBEN011 from './catalogue-contracts/SOC-BEN-011.json';
import b9SOCBEN012 from './catalogue-contracts/SOC-BEN-012.json';
import b9SOCBEN014 from './catalogue-contracts/SOC-BEN-014.json';
import b9SOCBEN010 from './catalogue-contracts/SOC-BEN-010.json';
import b9SOCBEN008 from './catalogue-contracts/SOC-BEN-008.json';
import b9SOCBEN013 from './catalogue-contracts/SOC-BEN-013.json';
import b9SOCBEN016 from './catalogue-contracts/SOC-BEN-016.json';
import b9SOCBEN021 from './catalogue-contracts/SOC-BEN-021.json';
import b9SOCBEN022 from './catalogue-contracts/SOC-BEN-022.json';
import b9SOCBEN023 from './catalogue-contracts/SOC-BEN-023.json';
import b9SOCBEN024 from './catalogue-contracts/SOC-BEN-024.json';
import b9SOCBEN015 from './catalogue-contracts/SOC-BEN-015.json';
import b9SOCBEN018 from './catalogue-contracts/SOC-BEN-018.json';
import b9SOCBEN019 from './catalogue-contracts/SOC-BEN-019.json';
import b9SOCBEN020 from './catalogue-contracts/SOC-BEN-020.json';

// Batch 13: security governance and resilience (plan I12).
import b13SECCYB001 from './catalogue-contracts/SEC-CYB-001.json';
import b13SECCYB002 from './catalogue-contracts/SEC-CYB-002.json';
import b13SECCYB003 from './catalogue-contracts/SEC-CYB-003.json';
import b13SECCYB004 from './catalogue-contracts/SEC-CYB-004.json';
import b13SECCYB008 from './catalogue-contracts/SEC-CYB-008.json';
import b13SECCYB009 from './catalogue-contracts/SEC-CYB-009.json';
import b13SECCYB010 from './catalogue-contracts/SEC-CYB-010.json';
import b13SECCYB011 from './catalogue-contracts/SEC-CYB-011.json';
import b13SECCYB012 from './catalogue-contracts/SEC-CYB-012.json';
import b13SECCYB013 from './catalogue-contracts/SEC-CYB-013.json';
import b13SECCYB014 from './catalogue-contracts/SEC-CYB-014.json';
import b13SECCYB015 from './catalogue-contracts/SEC-CYB-015.json';
import b13SECCYB016 from './catalogue-contracts/SEC-CYB-016.json';
import b13SECCYB017 from './catalogue-contracts/SEC-CYB-017.json';
import b13SECINF001 from './catalogue-contracts/SEC-INF-001.json';
import b13SECINF002 from './catalogue-contracts/SEC-INF-002.json';
import b13SECINF003 from './catalogue-contracts/SEC-INF-003.json';
import b13SECINF004 from './catalogue-contracts/SEC-INF-004.json';
import b13SECINF005 from './catalogue-contracts/SEC-INF-005.json';
import b13SECINF006 from './catalogue-contracts/SEC-INF-006.json';
import b13SECINF007 from './catalogue-contracts/SEC-INF-007.json';
import b13SECINF009 from './catalogue-contracts/SEC-INF-009.json';
import b13SECINF013 from './catalogue-contracts/SEC-INF-013.json';
import b13SECINF014 from './catalogue-contracts/SEC-INF-014.json';
import b13SECINF015 from './catalogue-contracts/SEC-INF-015.json';
import b13SECINF016 from './catalogue-contracts/SEC-INF-016.json';
import b13SECINT007 from './catalogue-contracts/SEC-INT-007.json';
import b13SECINT008 from './catalogue-contracts/SEC-INT-008.json';
import b13CIPREG008 from './catalogue-contracts/CIP-REG-008.json';
import b13CIPRSK009 from './catalogue-contracts/CIP-RSK-009.json';
import b13CIPINC010 from './catalogue-contracts/CIP-INC-010.json';
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
/** Batch 7: independent oversight and accountability forms, catalogue Part 12 (owner approved, 21 October 2026; plan I8). */
export const BATCH_7 = [con012, con013, con014, con018, con019, con020, pub009] as unknown as CatalogueContractJson[];
/** Batch 10: territory and infrastructure: land dealings and disputes, housing, planning and building control, local and regional government, transport (catalogue Parts 8, 9 and the supplement's Parts 19 and 20; plan I7). */
export const BATCH_10 = [
  b10LndReg005, b10LndReg007, b10LndReg008, b10LndReg009, b10LndReg010, b10LndReg011, b10LndReg012, b10LndReg016, b10LndReg017, b10LndReg020, b10LndReg021, b10LndReg022, b10HpcHou001, b10HpcHou002, b10HpcHou003, b10HpcHou004, b10HpcPln009, b10HpcPln012, b10HpcPln013, b10HpcBld014, b10HpcBld015, b10HpcBld016, b10HpcBld017, b10HpcBld018, b10HpcBld019, b10HpcBld020, b10LrgOrg004, b10LrgOrg005, b10LrgFin008, b10LrgSvc013, b10LrgSvc014, b10TrnVeh001, b10TrnVeh002, b10TrnDrv001, b10TrnRoad002, b10TrnOps001,
] as unknown as CatalogueContractJson[];
/** Batch 8: executive office, Cabinet, treasury and budget, the field series Part 2 §2.1, §2.2, §2.4 and §2.5 (owner's assignment, plan step I5). */
export const BATCH_8 = [
  e8BudgetAllocationApprove, e8BudgetAllocationNotify, e8BudgetAllocationPropose, e8BudgetBidJustification, e8BudgetBidRevise, e8BudgetBidWithdraw,
  e8BudgetCeilingApprove, e8BudgetCeilingPropose, e8BudgetCircularIssue, e8BudgetExecutionCommitment, e8BudgetExecutionCommitmentApprove, e8BudgetExecutionCorrection,
  e8BudgetExecutionOverrunReport, e8BudgetExecutionReallocationApprove, e8BudgetExecutionReallocationRequest, e8BudgetExecutionSupplementaryRequest, e8BudgetExecutionUnderspendReport, e8BudgetExecutionVarianceReport,
  e8BudgetExecutionVirement, e8BudgetExecutionYearEnd, e8BudgetNegotiationRecord, e8BudgetProgrammeCosting, e8ExecCabinetActionClose, e8ExecCabinetActionUpdate,
  e8ExecCabinetAgendaApprove, e8ExecCabinetAgendaPropose, e8ExecCabinetDecisionActionAssign, e8ExecCabinetDecisionCorrect, e8ExecCabinetDecisionDistribution, e8ExecCabinetDecisionRecord,
  e8ExecCabinetPaperFiscalReview, e8ExecCabinetPaperLegalReview, e8ExecCabinetPaperRevise, e8ExecPresidencyCorrespondenceComplaint, e8ExecPresidencyCorrespondenceDecision, e8ExecPresidencyCorrespondenceNotice,
  e8ExecPresidencyCorrespondenceReferral, e8ExecPresidencyCorrespondenceSubmit, e8ExecPresidencyCorrespondenceSupplement, e8ExecPresidencyCorrespondenceWithdraw, e8TreasuryCashForecastClose, e8TreasuryCashForecastReview,
  e8TreasuryCashForecastRevise, e8TreasuryCashForecastSubmit, e8TreasuryCashPositionReport, e8TreasuryLiquidityResponse, e8TreasuryLiquidityShortfall, e8TreasuryPaymentApprove,
  e8TreasuryPaymentCancelRequest, e8TreasuryPaymentCorrection, e8TreasuryPaymentDispute, e8TreasuryPaymentExecute, e8TreasuryPaymentReconcile, e8TreasuryPaymentRefund,
  e8TreasuryPaymentReject, e8TreasuryPaymentSupportingEvidence, e8TreasuryPaymentVerify,
] as unknown as CatalogueContractJson[];
/** Batch 9: human services, field series Part 4 (identity, passports, citizenship) and supplement Parts 14 (labour) and 15 (social protection) (owner's assignment; plan I6). */
export const BATCH_9 = [
  b9IDNREG001, b9IDNREG002, b9IDNREG003, b9IDNREG004, b9IDNREG005, b9IDNCARD001, b9IDNCARD002, b9IDNCARD003,
  b9IDNCARD004, b9IDNCARD005, b9IDNCARD006, b9IDNCARD007, b9IDNVER001, b9IDNVER002, b9IDNVER003, b9IDNACC001,
  b9IDNACC002, b9IDNACC003, b9IDNACC004, b9IDNSEC001, b9IDNSEC002, b9IDNSEC003, b9PASAPP001, b9PASAPP002,
  b9PASAPP003, b9PASAPP004, b9PASAPP005, b9PASAPP008, b9PASAPP009, b9PASAPP010, b9PASAPP006, b9PASAPP007,
  b9PASAPP011, b9PASAPP012, b9PASAPP013, b9PASAPP014, b9PASAPP015, b9PASAPP016, b9PASAPP017, b9PASAPP018,
  b9NATAPP001, b9NATAPP002, b9NATAPP003, b9NATAPP004, b9NATAPP005, b9NATAPP006, b9NATAPP007, b9NATAPP010,
  b9NATAPP012, b9NATAPP008, b9NATAPP009, b9NATAPP011, b9LABEMP001, b9LABEMP002, b9LABEMP003, b9LABEMP004,
  b9LABEMP005, b9LABEMP006, b9LABEMP007, b9LABEMP008, b9LABEMP009, b9LABEMP010, b9LABEMP011, b9LABEMP012,
  b9LABEMP013, b9LABEMP014, b9LABEMP015, b9LABEMP016, b9LABEMP017, b9LABEMP018, b9LABEMP019, b9LABEMP020,
  b9SOCBEN001, b9SOCBEN002, b9SOCBEN003, b9SOCBEN004, b9SOCBEN005, b9SOCBEN006, b9SOCBEN017, b9SOCBEN007,
  b9SOCBEN009, b9SOCBEN011, b9SOCBEN012, b9SOCBEN014, b9SOCBEN010, b9SOCBEN008, b9SOCBEN013, b9SOCBEN016,
  b9SOCBEN021, b9SOCBEN022, b9SOCBEN023, b9SOCBEN024, b9SOCBEN015, b9SOCBEN018, b9SOCBEN019, b9SOCBEN020,
] as unknown as CatalogueContractJson[];
/** Batch 13: security governance and resilience, catalogue Part 11 §2.2–§2.4 and the supplement's Part 11 contracts (plan I12). */
export const BATCH_13 = [
  b13SECCYB001, b13SECCYB002, b13SECCYB003, b13SECCYB004, b13SECCYB008, b13SECCYB009, b13SECCYB010, b13SECCYB011, b13SECCYB012, b13SECCYB013, b13SECCYB014, b13SECCYB015, b13SECCYB016, b13SECCYB017, b13SECINF001, b13SECINF002, b13SECINF003, b13SECINF004, b13SECINF005, b13SECINF006, b13SECINF007, b13SECINF009, b13SECINF013, b13SECINF014, b13SECINF015, b13SECINF016, b13SECINT007, b13SECINT008, b13CIPREG008, b13CIPRSK009, b13CIPINC010,
] as unknown as CatalogueContractJson[];
/** The passages contracts answer the same way: every item applies to the forms in applies_to, an item with `for` only to that group (health: batches 1 and 2; tax: batch 3; adm: batch 5; oversight: batch 7; land, hpc, lrg, trn: batch 10; sec, cyb, inf, clr: batch 13). */
export const COMMON_ITEMS = (common as unknown as { applies_to: string[]; groups: Record<string, string[]>; items: (CatalogueItem & { for?: string })[] });
/** The shared items that apply to one contract. */
export const commonItemsFor = (formId: string): CatalogueItem[] => (COMMON_ITEMS.applies_to.includes(formId) ? COMMON_ITEMS.items.filter(i => !i.for || COMMON_ITEMS.groups[i.for]?.includes(formId)).map(({ for: _for, ...i }) => i) : []);
/** Who the standard notices name, by the deployment-profile slot that owns the form. */
const INSTITUTION: Record<string, string> = {
  professionalRegulation: 'The professional regulator', tax: 'The tax authority', publicHealth: 'The public-health authority', institution: 'This institution',
  identity: 'The identity authority', travelDocuments: 'The travel document authority', citizenship: 'The citizenship authority', labour: 'The labour authority', socialProtection: 'The social protection authority',
  ombudsman: 'The ombudsman', humanRights: 'The human rights institution', anticorruption: 'The anti-corruption commission', supremeAudit: 'The public audit office', dataProtection: 'The data-protection authority',
  landRegistry: 'The land registry', buildingControl: 'The planning and building control authority', housing: 'The housing authority',
  vehicleRegistration: 'The vehicle and driver licensing authority', roadAuthority: 'The road authority', transportRegulator: 'The transport regulator',
  finance: 'The finance authority', cabinetOffice: 'The executive office',
  // I12
  cyberAuthority: 'The national cybersecurity authority', criticalInfrastructure: 'The critical infrastructure authority', securityAccreditation: 'The security authority',
};

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
export const CATALOGUE_CONTRACTS: CatalogueLibraryForm[] = [...BATCH_1.map(c => load(c, 1)), ...BATCH_2.map(c => load(c, 2)), ...BATCH_3.map(c => load(c, 3)), ...BATCH_4.map(c => load(c, 4)), ...BATCH_5.map(c => load(c, 5)), ...BATCH_6.map(c => load(c, 6)), ...BATCH_7.map(c => load(c, 7)), ...BATCH_8.map(c => load(c, 8)), ...BATCH_9.map(c => load(c, 9)), ...BATCH_10.map(c => load(c, 10)),
  // I12
  ...BATCH_13.map(c => load(c, 13))];

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
