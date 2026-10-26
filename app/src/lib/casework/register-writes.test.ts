// No route, screen or library changes a case-governed register outside the
// case engine (acceptance hardening, independent-review item "decision guard
// coverage").
//
// The registers below change only through the effects their procedure module
// registers with the engine, so every change is a decision under an approved
// procedure, checked by the decision guards. This test reads the source and
// fails when:
//   - a register module gains an export nobody has classified as a read or a
//     change;
//   - any file other than the register's procedure module imports one of its
//     changing functions, unless it is a listed exception with its reason;
//   - a register's store key is used outside its own module;
//   - a register module is imported whole (`* as`) or re-exported;
//   - an effect is registered anywhere but a procedure module or the engine;
//   - a procedure module (lib/<domain>/procedures.ts or lib/<domain>/<register>/procedures.ts) exports a function other than its installer (an
//     effect reachable without `act()`).
import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative, dirname, resolve } from 'node:path';

const SRC = resolve(__dirname, '../..');
const rel = (p: string) => relative(SRC, p).replace(/\\/g, '/');

type Register = {
  module: string;
  store: string;
  procedures: string;
  /** Exports that change the register. */
  changes: string[];
  /** Exports that only read it, or return a value without changing it. */
  reads: string[];
  /** Files besides the module that name its store key: the persistence port and the backup system, which carry it whole (never a change of their own). */
  storeAlso?: string[];
};

const REGISTERS: Register[] = [
  { module: 'lib/civil/register.ts', store: '__civicosCivil', procedures: 'lib/civil/procedures.ts',
    changes: ['resetCivil', 'registerEvent', 'attachDecision', 'amendPerson', 'adjudicate'],
    reads: ['findMatches', 'searchPersons', 'eventCounts', 'eventFacts', 'current', 'fold', 'getPerson', 'getEvent', 'eventOfCase', 'registerSize'] },
  { module: 'lib/organisations/register.ts', store: '__civicosOrganisations', procedures: 'lib/organisations/procedures.ts',
    changes: ['resetOrganisations', 'defineRegisterType', 'createOrganisation', 'amendOrganisation', 'setStanding', 'attachStandingDecision', 'attachCertificate', 'linkFacilities', 'expireStandings', 'organisationsDb', 'nextOrganisationNumber'],
    reads: ['organisationRecords', 'registerTypes', 'getOrganisation', 'listOrganisations', 'checkNewOrganisation', 'publicOrganisation', 'checkStanding', 'ORG_KINDS', 'REFERENCE_TYPES', 'registerType', 'current'] },
  { module: 'lib/professions/register.ts', store: '__civicosProfessions', procedures: 'lib/professions/procedures.ts',
    changes: ['resetProfessions', 'defineProfession', 'registerProfessional', 'setProfessionalState', 'attachProfessionalDecision', 'attachProfessionalCertificate', 'lapseRegistrations', 'proposeDisclosure', 'confirmDisclosure', 'withdrawDisclosure', 'restoreProfessionals'],
    reads: ['professionalRecords', 'professions', 'checkQualifications', 'listProfessionals', 'publicProfessional', 'checkProfessional', 'professionCounts', 'PUBLIC_FIELDS', 'DEFAULT_PUBLIC_FIELDS', 'REFERENCE_PROFESSIONS', 'profession', 'getProfessional', 'professionalOfCase', 'disclosureChanges', 'workforceTally'] },
  { module: 'lib/tax/register.ts', store: '__civicosTax', procedures: 'lib/tax/procedures.ts',
    changes: ['resetTax', 'registerTaxpayer', 'fileReturn', 'recordAssessment', 'attachAssessmentDecision', 'varyAssessment', 'reconcileTaxPayments',
      'amendRegistration', 'decideRefund', 'instructRefund', 'reconcileRefundPayout', 'recordPaymentPlan', 'attachInstalmentBill', 'changePlan', 'recordDisclosure', 'recordRuling', 'attachServiceDecision'],
    reads: ['account', 'taxCounts', 'getTaxpayer', 'findTaxpayers', 'getReturn', 'returnsOf', 'returnFor', 'getAssessment', 'assessmentsOf', 'assessmentOfCase',
      'getRefund', 'refundOfCase', 'refundsOf', 'getPaymentPlan', 'planOfCase', 'plansOf', 'disclosureOfCase', 'rulingOfCase'] },
  { module: 'lib/education/register.ts', store: '__civicosEducation', procedures: 'lib/education/procedures.ts',
    changes: ['resetEducation', 'recordInspection', 'recordAward', 'correctAward', 'revokeAward', 'attachAwardCertificate', 'recordReturn'],
    reads: ['verifyAward', 'educationCounts', 'INSPECTION_OUTCOMES', 'RETURN_METRICS', 'sameName', 'inspectionsOf', 'getAward', 'awardsOf', 'awardOfCase', 'returnsOf', 'allReturns', 'lineage'] },
  { module: 'lib/immigration/register.ts', store: '__civicosImmigration', procedures: 'lib/immigration/procedures.ts',
    changes: ['resetImmigration', 'recordGrant', 'changeGrant', 'attachGrantDecision', 'attachGrantCertificate', 'expireGrants'],
    reads: ['checkGrant', 'findGrants', 'statusOn', 'grantCounts', 'VISA_CATEGORIES', 'PERMIT_CATEGORIES', 'documentKeyOf', 'getGrant', 'grantOfCase'] },
  { module: 'lib/customs/register.ts', store: '__civicosCustoms', procedures: 'lib/customs/procedures.ts',
    changes: ['resetCustoms', 'lodgeDeclaration', 'amendGoods', 'chooseChannel', 'recordCustomsInspection', 'recordDuty', 'attachDutyDecision', 'releaseGoods', 'refuseRelease', 'attachReleaseDecision', 'reconcileCustomsPayments'],
    reads: ['parseGoods', 'releaseBlocker', 'customsCounts', 'CHANNELS', 'linesOf', 'getDeclaration', 'declarationOfCase', 'declarationsOf'] },
  { module: 'lib/health/register.ts', store: '__civicosHealth', procedures: 'lib/health/procedures.ts',
    changes: ['resetHealth', 'recordCapacity', 'restoreCapacity'],
    reads: ['CAPACITY_METRICS', 'capacityOf', 'allCapacity', 'healthCounts'] },
  { module: 'lib/health/products/register.ts', store: '__civicosProducts', procedures: 'lib/health/products/procedures.ts',
    changes: ['resetProducts', 'applyForProduct', 'recordDossier', 'recordAssessment', 'decideProduct', 'varyProduct', 'renewProduct', 'changeProductState', 'orderRecall',
      'publishProductNotice', 'completeRecall', 'issueSafetyAlert', 'attachProductDecision', 'expireProducts', 'proposeProductDisclosure', 'confirmProductDisclosure', 'withdrawProductDisclosure', 'restoreProducts'],
    reads: ['productRecords', 'PRODUCT_STATES', 'STATE_LABEL', 'ATTRIBUTE_CLASS', 'APPLICATION_KEYS', 'VARIABLE_KEYS', 'PUBLISHABLE_ATTRIBUTES', 'publicClassification', 'productDisclosureChanges',
      'getProduct', 'productByReference', 'productOfCase', 'productRecord', 'publicProduct', 'listPublicProducts', 'productCounts', 'findProducts', 'publishedNoticeOf'] },
  { module: 'lib/health/products/imports.ts', store: '__civicosMedicineImports', procedures: 'lib/health/products/procedures.ts',
    changes: ['resetImports', 'authoriseImport', 'attachImportDecision', 'restoreImports'],
    reads: ['importRecords', 'importOfCase', 'getImportAuthorisation', 'importAuthorisationValid', 'importCounts'] },
  { module: 'lib/health/products/controlled.ts', store: '__civicosControlledMedicines', procedures: 'lib/health/products/procedures.ts',
    changes: ['resetControlled', 'authoriseControlled', 'attachControlledDecision', 'proposeControlledLimits', 'confirmControlledLimits', 'withdrawControlledLimits', 'restoreControlled'],
    reads: ['controlledRecords', 'limitFor', 'controlledLimits', 'controlledLimitChanges', 'controlledOfCase', 'getControlledAuthorisation', 'controlledCounts'] },
  { module: 'lib/health/programmes/register.ts', store: '__civicosHealthProgrammes', procedures: 'lib/health/programmes/procedures.ts',
    changes: ['resetProgrammes', 'establishProgramme', 'amendProgramme', 'setProgrammeState', 'attachProgrammeDecision', 'recordIntervention', 'reviewIntervention', 'endIntervention',
      'proposeInterventionRules', 'confirmInterventionRules', 'withdrawInterventionRules', 'recordProgrammeReturn'],
    reads: ['PROGRAMME_STATE_LABEL', 'REPORTING_PERIODS', 'COUNT_BASES', 'BASIS_LABEL', 'COUNT_QUALITY', 'checkTerms', 'interventionRule', 'checkEntries', 'getProgramme', 'listProgrammes',
      'programmeOfCase', 'termsOf', 'listInterventions', 'interventionOfCase', 'interventionRules', 'interventionRuleChanges', 'getReturn', 'returnOfCase', 'publishedReturn',
      'listPublishedReturns', 'programmeCounts'] },
  { module: 'lib/oversight/register.ts', store: '__civicosOversight', procedures: 'lib/oversight/procedures.ts',
    changes: ['resetOversight', 'recordFinding', 'correctFinding', 'advanceFindings', 'recordFollowUp', 'requestEvidence', 'closeEvidenceRequest', 'recordReferral', 'askController',
      'respondToFinding', 'submitEvidence', 'answerControllerRequest'],
    reads: ['OVERSIGHT_SLOTS', 'FINDING_STAGE_LABEL', 'POSITIONS', 'FOLLOW_UP_STATES', 'REFERRAL_KINDS', 'REQUEST_KINDS', 'ANSWER_OUTCOMES', 'checkFinding', 'getFinding', 'findingsOfCase',
      'evidenceOfCase', 'referralsOfCase', 'controllerRequestsOfCase', 'getEvidenceRequest', 'getControllerRequest', 'oversightView', 'oversightCounts'] },
  { module: 'lib/administration/register.ts', store: '__civicosAdministration', procedures: 'lib/administration/procedures.ts',
    changes: ['resetAdministration', 'approvePosition', 'submitPayroll', 'reviewPayroll', 'returnPayroll', 'approvePayroll', 'correctPayroll', 'grantAccess', 'revokeAccess', 'approvePolicy'],
    reads: ['payrollBatch', 'accessOfCase', 'accessInForce', 'administrationOf', 'administrationCounts'] },
  { module: 'lib/records/delegations.ts', store: '__civicosDelegations', procedures: 'lib/administration/procedures.ts',
    changes: ['resetDelegations', 'grantDelegation', 'revokeDelegation', 'recordAuthorityDelegation', 'revokeAuthorityDelegation'],
    reads: ['delegationFor', 'delegationsOf', 'authorityDelegationOfCase', 'authorityDelegationsOf', 'authorityGrantsFor',
      // I13: the representations a person granted, and one by its id.
      'delegationsGrantedBy', 'getDelegation'] },
  // The economic group (plan step I5).
  { module: 'lib/finance/register.ts', store: '__civicosFinance', procedures: 'lib/finance/procedures.ts',
    changes: ['resetFinance', 'issueCall', 'setCeiling', 'recordBid', 'reviseBid', 'negotiateBid', 'allocateBid', 'closeBid', 'enactAppropriation', 'validateAppropriation', 'releaseAppropriation', 'refuseRelease',
      'attachAppropriationDecision', 'reviseAppropriations', 'recordCommitment', 'endCommitment', 'attachCommitmentDecision', 'requestPayeeAccount', 'verifyPayeeAccount', 'approvePayeeAccount', 'refusePayeeAccount',
      'attachPayeeDecision', 'instructPayment', 'verifyPayment', 'approvePayment', 'attachPaymentDecision', 'executePayment', 'reconcilePayment', 'endPayment', 'retryPayment', 'submitForecast', 'reviewForecast'],
    reads: ['samePerson', 'callFor', 'ceilingFor', 'getBid', 'getAppropriation', 'balanceOf', 'REVISION_KINDS', 'checkRevision', 'listAppropriations', 'getCommitment', 'commitmentRemaining', 'payeeAccountInForce',
      'listPayeeAccounts', 'getPayment', 'getForecast', 'financeRecords', 'financeCounts'] },
  { module: 'lib/procurement/register.ts', store: '__civicosProcurement', procedures: 'lib/procurement/procedures.ts',
    changes: ['resetProcurement', 'recordPlanItem', 'confirmPlanBudget', 'setPlanMethodRule', 'setPlanState', 'prepareTender', 'publishTender', 'attachTenderDecision', 'addAddendum', 'receiveBid', 'withdrawBid',
      'closeSubmissions', 'appointCommittee', 'declareInterest', 'manageInterest', 'openBids', 'recordEvaluation', 'awardTender', 'cancelTender', 'lodgeChallenge', 'interimMeasure', 'decideChallenge',
      'signContract', 'varyContract', 'attachContractDecision', 'submitDeliverable', 'decideDeliverable', 'certifyPayment'],
    reads: ['samePerson', 'parseCriteria', 'getPlanItem', 'getTender', 'latestVersion', 'mayEvaluate', 'parseResults', 'getContract', 'contractValue', 'contractForPayment', 'bidView', 'bidsOf',
      'procurementRecords', 'ocdsRelease', 'procurementCounts'] },
  { module: 'lib/cabinet/register.ts', store: '__civicosCabinet', procedures: 'lib/cabinet/procedures.ts',
    changes: ['resetCabinet', 'proposeCabinetRules', 'confirmCabinetRules', 'withdrawCabinetRules', 'registerSubmission', 'reviewSubmission', 'setSubmissionState', 'recordCabinetDecision', 'attachCabinetDecision',
      'correctCabinetDecision', 'distribute', 'setDisclosure', 'assignAction', 'reportAction', 'proposeActionClosure', 'decideActionClosure'],
    reads: ['samePerson', 'CLASSIFICATIONS', 'cabinetRules', 'cabinetRuleChanges', 'checkVote', 'getSubmission', 'getCabinetDecision', 'getAction', 'actionsOf', 'cabinetRecords', 'cabinetIndicators', 'cabinetCounts'] },
  // I12: security governance and resilience (lib/security): written only by the security procedures' effects.
  { module: 'lib/security/register.ts', store: '__civicosSecurityRecords', procedures: 'lib/security/procedures.ts',
    changes: ['resetSecurityRecords', 'openSecurityRecord', 'updateSecurityRecord', 'shareSecurityRecord', 'needToKnowGrant'],
    reads: ['KIND_LABEL', 'KIND_REGISTER', 'SECURITY_REGISTER', 'effectiveStatus', 'listingOf', 'securityRecordRaw', 'securityRecordOfCase', 'securityRecordsRaw', 'clearanceOf', 'securityCounts'] },
  { module: 'lib/courts/hearings.ts', store: '__civicosHearings', procedures: 'lib/courts/procedures.ts',
    changes: ['resetHearings', 'scheduleHearing', 'concludeHearing'],
    reads: ['causeList', 'hearingsOf'] },
  // Plan step I7: the rights on a published parcel change only through the land registry's procedures (applyRightsChange,
  // freezeInterest, releaseInterest); the parcel's own spatial record is recorded and published four-eyes through /api/parcels
  // (the exceptions below), as before.
  { module: 'lib/data/parcels.ts', store: '__civicosParcels', procedures: 'lib/land/procedures.ts', storeAlso: ['lib/data/repo/postgres.ts', 'lib/backup/state.ts'],
    changes: ['resetParcels', 'proposeParcelPolicyChange', 'decideParcelPolicyChange', 'recordParcel', 'actOnParcel', 'importParcels', 'withdrawParcelImport', 'applyRightsChange', 'freezeInterest', 'releaseInterest'],
    reads: ['LAND_USES', 'isLandUse', 'SURVEY_METHODS', 'isSurveyMethod', 'RIGHT_TYPES', 'HOLDER_KINDS', 'SOURCE_KINDS', 'DEFAULT_ID_PATTERN', 'parcelGeneration', 'publishedInBox', 'parcelPolicy',
      'parcelPolicyChanges', 'cadastreAuthority', 'idFormat', 'readRights', 'overlapsOf', 'checkParcel', 'checkParcelId', 'rightsKeepers', 'rightRefs', 'freezeOn', 'TRANSFERABLE', 'ADDABLE',
      'publicParcel', 'viewParcel', 'getParcel', 'PARCEL_PAGE_MAX', 'pageParcels', 'parcelCounts', 'PARCEL_COLUMNS', 'MAX_PARCEL_ROWS', 'MAX_PARCEL_FILE_BYTES', 'listParcelImports'] },
  { module: 'lib/land/register.ts', store: '__civicosLand', procedures: 'lib/land/procedures.ts',
    changes: ['resetLand', 'recordTransaction', 'openDispute', 'referDispute', 'decideDispute'],
    reads: ['TRANSACTION_KINDS', 'DISPUTE_KINDS', 'DISPUTE_OUTCOMES', 'transactionsOf', 'disputesOf', 'transactionOfCase', 'disputeOfCase', 'openDisputes', 'viewTransaction', 'viewDispute', 'landCounts', 'recentLand'] },
  { module: 'lib/building/register.ts', store: '__civicosBuilding', procedures: 'lib/building/procedures.ts',
    changes: ['resetBuilding', 'proposeBuildingRules', 'confirmBuildingRules', 'withdrawBuildingRules', 'recordPlanningDecision', 'openPermit', 'submitDesign', 'decidePermit', 'decideVariation', 'setConstruction',
      'recordInspection', 'issueStopWork', 'liftStopWork', 'decideOccupancy'],
    reads: ['RESULTS', 'PERMIT_STATE_LABEL', 'CONSTRUCTION_STATE_LABEL', 'OCCUPANCY_STATE_LABEL', 'buildingRules', 'buildingRuleChanges', 'rulesRef', 'permitOfCase', 'getPermit', 'planningOfCase', 'getPlanning',
      'inspectionsOf', 'stopOrdersOf', 'planningOnParcel', 'permitsOnParcel', 'buildingRegister', 'buildingCounts'] },
  { module: 'lib/housing/register.ts', store: '__civicosHousing', procedures: 'lib/housing/procedures.ts',
    changes: ['resetHousing', 'registerProgramme', 'receiveApplication', 'recordAssessment', 'allocate', 'closeApplication'],
    reads: ['termsDigest', 'readTerms', 'readUnits', 'getProgramme', 'termsInForce', 'applicationOfCase', 'applicationsOf', 'waitingList', 'listProgrammes', 'housingCounts'] },
  { module: 'lib/localgov/register.ts', store: '__civicosLocalGov', procedures: 'lib/localgov/procedures.ts',
    changes: ['resetLocalGov', 'proposeCouncilRules', 'confirmCouncilRules', 'withdrawCouncilRules', 'recordResolution', 'adoptBudget', 'openRequest', 'closeRequest'],
    reads: ['MAJORITIES', 'councilRules', 'councilRuleChanges', 'checkVote', 'getResolution', 'resolutionOfCase', 'budgetOfCase', 'requestOfCase', 'localRecords', 'requestPlaces', 'localCounts'] },
  { module: 'lib/transport/register.ts', store: '__civicosTransport', procedures: 'lib/transport/procedures.ts',
    changes: ['resetTransport', 'registerVehicle', 'transferVehicle', 'issueLicence', 'grantRoadWorks', 'licenseOperator'],
    reads: ['VIN', 'vehicleByVin', 'vehicleByMark', 'licenceOfCase', 'roadWorksOfCase', 'operatorOfCase', 'transportRegister', 'transportCounts'] },
  // Human services (plan step I6).
  { module: 'lib/identity/register.ts', store: '__civicosIdentity', procedures: 'lib/identity/procedures.ts',
    changes: ['resetIdentity', 'enrolIdentity', 'attachIdentityDecision', 'requestCredential', 'recordProduction', 'recordDelivery', 'changeCredential', 'markReview', 'recordDetermination', 'attachDeterminationDecision', 'expireCredentials'],
    reads: ['CREDENTIAL_STATE_LABEL', 'DETERMINATIONS', 'CREDENTIAL_MOVES', 'VERIFY_RESULTS', 'VERIFY_MEANING', 'maskNumber', 'checkEnrolment', 'findCandidates', 'credentialMoveRefusal',
      'getIdentity', 'identityOfCase', 'credentialHolder', 'getCredential', 'findIdentities', 'listedIdentity', 'verifyIdentity', 'identityCounts'] },
  { module: 'lib/passports/register.ts', store: '__civicosPassports', procedures: 'lib/passports/procedures.ts',
    changes: ['resetPassports', 'approveDocument', 'attachDocumentDecision', 'recordProduction', 'recordQuality', 'recordCollection', 'changeDocument', 'recordReview', 'attachReviewDecision', 'expireDocuments'],
    reads: ['DOCUMENT_STATE_LABEL', 'APPLICATION_KINDS', 'FEE_RULE', 'ICAO_ELEMENTS', 'DOCUMENT_MOVES', 'feeCodes', 'checkApproval', 'documentMoveRefusal', 'getTravelDocument', 'documentOfCase', 'reviewsOf',
      'findTravelDocuments', 'documentStatus', 'productionReconciliation', 'passportCounts'] },
  { module: 'lib/labour/register.ts', store: '__civicosLabour', procedures: 'lib/labour/procedures.ts',
    changes: ['resetLabour', 'registerEmployer', 'attachLabourDecision', 'registerEmployment', 'publishVacancy', 'closeVacancy', 'registerJobseeker', 'referJobseeker', 'placeJobseeker',
      'openInspection', 'recordVisit', 'recordFinding', 'issueOrders', 'recordResponse', 'verifyOrder', 'closeInspection', 'recordInjury', 'closeInjury', 'openMediation', 'recordSession',
      'recordMediationOutcome', 'acknowledgeNotice'],
    reads: ['getEmployer', 'employerOfCase', 'employmentOfCase', 'jobseekerOfCase', 'vacancyOfCase', 'inspectionOfCase', 'injuryOfCase', 'mediationOfCase', 'employerStanding', 'findLabour', 'labourCounts'] },
  { module: 'lib/social/register.ts', store: '__civicosSocial', procedures: 'lib/social/procedures.ts',
    changes: ['resetSocial', 'registerClaimant', 'declareHousehold', 'recordAssessment', 'decideClaim', 'attachClaimDecision', 'recordClaimReview', 'preparePayment', 'settlePayment',
      'attachPaymentDecision', 'recordOverpayment', 'decideOverpayment', 'attachOverpaymentDecision'],
    reads: ['CLAIM_STATE_LABEL', 'meansOf', 'ruleInputOf', 'checkInputs', 'getClaimant', 'getHousehold', 'claimOfCase', 'getClaim', 'latestAssessment', 'claimMoveRefusal', 'reproduceAssessment',
      'paymentOfCase', 'paidFor', 'overpaymentOfCase', 'findSocial', 'socialCounts'] },
  // I13 (plan step I13): records management and the front door's own records.
  { module: 'lib/recordkeeping/register.ts', store: '__civicosRecordkeeping', procedures: 'lib/recordkeeping/procedures.ts',
    changes: ['resetRecordkeeping', 'approveSchedule', 'placeHold', 'attachHoldDecision', 'releaseHold', 'registerIncoming', 'listForDisposal', 'recordDisposal', 'transferToArchive', 'acknowledgeTransfer',
      'planMigration', 'reconcileMigration', 'closeMigration', 'approveMigration',
      // leftovers (plan I9): the confirmed import of an institution's own export.
      'restoreRecordkeeping'],
    reads: ['TRIGGER_LABEL', 'DISPOSITION_LABEL', 'listDigest', 'classesOf', 'getClass', 'scheduleOf', 'holdsOf', 'holdOfCase', 'incomingOf', 'incomingOfCase', 'disposalsOf', 'disposalOfCase',
      'transfersOf', 'transfersTo', 'getTransfer', 'migrationsOf', 'migrationOfCase', 'holdCovering', 'recordkeepingCounts',
      // leftovers (plan I9, acceptance P5-06): per-record migration manifests and the portable export.
      'VERIFICATION_LABEL', 'provenanceOf', 'sourceDigestOf', 'targetDigestOf', 'manifestDigestOf', 'recordkeepingOf', 'recordkeepingConflicts'] },
  { module: 'lib/frontdoor/register.ts', store: '__civicosFrontdoor', procedures: 'lib/frontdoor/procedures.ts',
    changes: ['resetFrontdoor', 'recordRouting', 'setAppointment', 'recordComplaintOutcome', 'admitReconsideration', 'decideReconsideration'],
    reads: ['routingOf', 'routingsFor', 'appointmentOf', 'appointmentsOf', 'complaintOutcomeOf', 'complaintsOf', 'reconsiderationOf', 'reconsiderationsOfOriginal', 'reconsiderationsOf', 'frontdoorCounts'] },
];

/**
 * Changes made outside a procedure, each for a stated reason. None of them
 * decides a person's or an organisation's standing: they define the
 * structure an authority keeps, apply an end date already decided, settle
 * receipts against bills, or record aggregate returns.
 */
const EXCEPTIONS: { file: string; fn: string; why: string }[] = [
  { file: 'app/api/organisations/types/route.ts', fn: 'defineRegisterType', why: 'defines a register type (administrators, audited); records no organisation' },
  { file: 'app/api/professions/types/route.ts', fn: 'defineProfession', why: 'defines a profession and its regulator (administrators, audited); records no person' },
  { file: 'app/api/professions/types/route.ts', fn: 'proposeDisclosure', why: 'what the public check shows: proposed citing the law, confirmed by a different official; records no person' },
  { file: 'app/api/professions/types/route.ts', fn: 'confirmDisclosure', why: 'what the public check shows: proposed citing the law, confirmed by a different official; records no person' },
  { file: 'app/api/professions/types/route.ts', fn: 'withdrawDisclosure', why: 'withdraws a waiting disclosure proposal' },
  { file: 'app/api/cron/case-deadlines/route.ts', fn: 'expireStandings', why: 'applies the validity end date a decision already set' },
  { file: 'app/api/cron/case-deadlines/route.ts', fn: 'lapseRegistrations', why: 'applies the validity end date a decision already set' },
  { file: 'app/api/cron/case-deadlines/route.ts', fn: 'expireGrants', why: 'applies the validity end date a decision already set' },
  { file: 'app/api/cron/case-deadlines/route.ts', fn: 'reconcileTaxPayments', why: 'settles receipts against bills once each; changes no assessment' },
  { file: 'app/api/cron/case-deadlines/route.ts', fn: 'reconcileCustomsPayments', why: 'settles receipts against bills once each; changes no duty or release' },
  { file: 'app/api/education/route.ts', fn: 'recordReturn', why: 'an institution\'s aggregate return (counts only); no record of a person' },
  { file: 'app/api/health-regulation/route.ts', fn: 'recordCapacity', why: 'a facility\'s aggregate capacity return (counts only); no record of a person' },
  { file: 'app/api/cron/case-deadlines/route.ts', fn: 'expireProducts', why: 'applies the validity end date a decision already set' },
  { file: 'app/api/cron/case-deadlines/route.ts', fn: 'expireCredentials', why: 'applies the validity end date a decision already set (identity credentials, plan I6)' },
  { file: 'app/api/cron/case-deadlines/route.ts', fn: 'expireDocuments', why: 'applies the validity end date a decision already set (travel documents, plan I6)' },
  { file: 'app/api/health-regulation/products/route.ts', fn: 'proposeProductDisclosure', why: 'what the public product check shows: proposed citing the law, confirmed by a different official; records no product' },
  { file: 'app/api/health-regulation/products/route.ts', fn: 'confirmProductDisclosure', why: 'what the public product check shows: proposed citing the law, confirmed by a different official; records no product' },
  { file: 'app/api/health-regulation/products/route.ts', fn: 'withdrawProductDisclosure', why: 'withdraws a waiting classification proposal' },
  { file: 'app/api/health-regulation/products/route.ts', fn: 'proposeControlledLimits', why: 'the controlled-medicine quantity limits, a country rule set: proposed citing the law, confirmed by a different official; records no authorisation' },
  { file: 'app/api/health-regulation/products/route.ts', fn: 'confirmControlledLimits', why: 'the controlled-medicine quantity limits, a country rule set: proposed citing the law, confirmed by a different official; records no authorisation' },
  { file: 'app/api/health-regulation/products/route.ts', fn: 'withdrawControlledLimits', why: 'withdraws a waiting limits proposal' },
  { file: 'app/api/health-regulation/programmes/route.ts', fn: 'proposeInterventionRules', why: 'the intervention authority rules, a country rule set (CFG-PH-003): proposed citing the law, confirmed by a different official; records no intervention' },
  { file: 'app/api/health-regulation/programmes/route.ts', fn: 'confirmInterventionRules', why: 'the intervention authority rules, a country rule set (CFG-PH-003): proposed citing the law, confirmed by a different official; records no intervention' },
  { file: 'app/api/health-regulation/programmes/route.ts', fn: 'withdrawInterventionRules', why: 'withdraws a waiting rules proposal' },
  // Independent oversight (plan I8): what the institution a record concerns adds beside the body's record, checked against it; the finding,
  // the request and the body's case are never changed by it.
  { file: 'app/api/oversight/route.ts', fn: 'respondToFinding', why: 'the management response of the institution a finding concerns, appended beside the finding; the finding, its versions and stage are untouched (P4-04)' },
  { file: 'app/api/oversight/route.ts', fn: 'submitEvidence', why: 'evidence the institution asked submits to the body\'s request under an approved relationship; the request is the body\'s' },
  { file: 'app/api/oversight/route.ts', fn: 'answerControllerRequest', why: 'the controller\'s answer to the data-protection authority: what it did with a person\'s request about its records; the authority never reads them' },
  // The land parcel register (docs/PARCEL_REGISTER.md): the spatial unit, its survey and land use, recorded by one official of the
  // cadastre authority and published (or a change confirmed) by a different one; the policy four-eyes by administrators; loads checked
  // row by row and withdrawable. None of them changes a right of a published parcel (actOnParcel refuses rights once published).
  { file: 'app/api/parcels/route.ts', fn: 'recordParcel', why: 'a parcel\'s first record, published only by a different official; its rights are its first registration' },
  { file: 'app/api/parcels/[pid]/route.ts', fn: 'actOnParcel', why: 'publication, a change of outline, land use or survey confirmed by a different official, or withdrawal with a reason; never a right of a published parcel' },
  { file: 'app/api/parcels/import/route.ts', fn: 'importParcels', why: 'a checked load of proposed parcels (published only by a different official), audited with the file\'s SHA-256' },
  { file: 'app/api/parcels/import/[iid]/route.ts', fn: 'withdrawParcelImport', why: 'withdraws a load as a whole, with the reason' },
  { file: 'app/api/parcels/policy/route.ts', fn: 'proposeParcelPolicyChange', why: 'the nation\'s parcel policy (cadastre authority, id format, overlap rule): proposed by one administrator' },
  { file: 'app/api/parcels/policy/[cid]/route.ts', fn: 'decideParcelPolicyChange', why: 'the parcel policy confirmed by a different administrator' },
  { file: 'app/api/building/route.ts', fn: 'proposeBuildingRules', why: 'the nation\'s building control rules (categories, uses, checklists, severities), a country rule set: proposed citing the law, confirmed by a different official; records no permit or inspection' },
  { file: 'app/api/building/route.ts', fn: 'confirmBuildingRules', why: 'the building control rules confirmed by a different official who can sign at the authority; earlier decisions keep the version they applied' },
  { file: 'app/api/building/route.ts', fn: 'withdrawBuildingRules', why: 'withdraws a waiting rules proposal' },
  { file: 'app/api/local-government/route.ts', fn: 'proposeCouncilRules', why: 'a council\'s standing rules (seats, quorum, majority), the local government\'s own rule set: proposed by its own official citing the law; records no resolution' },
  { file: 'app/api/local-government/route.ts', fn: 'confirmCouncilRules', why: 'the council\'s rules confirmed by a different official who can sign at that local government; earlier resolutions keep the version they were checked against' },
  { file: 'app/api/local-government/route.ts', fn: 'withdrawCouncilRules', why: 'withdraws a waiting rules proposal' },
  // Plan step I5. Procurement: what a case cannot carry without breaking a seal or putting a person's statement about themselves in the
  // procuring institution's case: a sealed bid received (its content never in a case) or withdrawn before the deadline, a committee
  // member's own declaration of interests and its management by an independent official. The Cabinet: the assigned institution's own
  // progress report and proposed closure of an action (a different cabinet office official confirms or returns it), and the Cabinet
  // rules, a country rule set (proposed citing the law, confirmed by a different official).
  { file: 'app/api/procurement/route.ts', fn: 'receiveBid', why: 'a sealed bid received by an official of the procuring institution: the receipt and its time, content sealed until the opening step decides nothing' },
  { file: 'app/api/procurement/route.ts', fn: 'withdrawBid', why: 'a supplier\'s withdrawal of its sealed bid before the deadline, recorded with its reason' },
  { file: 'app/api/procurement/route.ts', fn: 'declareInterest', why: 'a committee member\'s own declaration of interests (about themselves); decides nothing' },
  { file: 'app/api/procurement/route.ts', fn: 'manageInterest', why: 'how a declared interest is managed, by an official who can sign there and is neither the member nor on the committee' },
  { file: 'app/api/cabinet-office/route.ts', fn: 'reportAction', why: 'the assigned institution\'s own progress report on a Cabinet action; the decision is untouched' },
  { file: 'app/api/cabinet-office/route.ts', fn: 'proposeActionClosure', why: 'the assigned institution proposes closing its action with evidence; a different official of the cabinet office confirms or returns it' },
  { file: 'app/api/cabinet-office/route.ts', fn: 'decideActionClosure', why: 'a cabinet office official, a different person, confirms or returns a proposed closure' },
  { file: 'app/api/cabinet-office/route.ts', fn: 'proposeCabinetRules', why: 'the Cabinet rules, a country rule set: proposed citing the law, confirmed by a different official; records no decision' },
  { file: 'app/api/cabinet-office/route.ts', fn: 'confirmCabinetRules', why: 'the Cabinet rules, a country rule set: proposed citing the law, confirmed by a different official; records no decision' },
  { file: 'app/api/cabinet-office/route.ts', fn: 'withdrawCabinetRules', why: 'withdraws a waiting rules proposal' },
  // I12: one who can sign at the keeping institution names an official who needs to know a security record (or withdraws that),
  // with the reason, written to the access log as a change of who may see what; the record's terms are never changed by it.
  { file: 'app/api/security/route.ts', fn: 'needToKnowGrant', why: 'names (or withdraws) an official who needs to know a security record: a signatory of the keeping institution, logged in the access log; the record itself is unchanged' },
  { file: 'lib/organisations/import.ts', fn: 'organisationsDb', why: 'the checked load of an existing register: proposed by one official of the keeping authority, confirmed by a different one, under the approved mapping in production' },
  { file: 'lib/organisations/import.ts', fn: 'nextOrganisationNumber', why: 'numbers the organisations a confirmed load enters' },
  // An institution's own records coming back from its portable export (Health I4 standalone-and-pilot): nothing is decided;
  // each record stands as its sealed decisions left it, with the same id and number.
  { file: 'lib/portability/import.ts', fn: 'organisationsDb', why: "the confirmed import of an institution's own export (two officials, the export verified, none of its records already here), keeping record identity: the organisation's identity and its standings in the importing institution's own registers" },
  { file: 'lib/portability/import.ts', fn: 'restoreProfessionals', why: "the confirmed import of an institution's own export (two officials, the export verified, none of its records already here), keeping record identity" },
  { file: 'lib/portability/import.ts', fn: 'restoreProducts', why: "the confirmed import of an institution's own export (two officials, the export verified, none of its records already here), keeping record identity" },
  { file: 'lib/portability/import.ts', fn: 'restoreImports', why: "the confirmed import of an institution's own export (two officials, the export verified, none of its records already here), keeping record identity" },
  { file: 'lib/portability/import.ts', fn: 'restoreControlled', why: "the confirmed import of an institution's own export (two officials, the export verified, none of its records already here), keeping record identity" },
  { file: 'lib/portability/import.ts', fn: 'restoreCapacity', why: "the confirmed import of an institution's own export (two officials, the export verified, none of its records already here), keeping record identity" },
  // leftovers (plan I9): records management travels with an institution's export.
  { file: 'lib/portability/import.ts', fn: 'restoreRecordkeeping', why: "the confirmed import of an institution's own export (two officials, the export verified, none of its records already here), keeping record identity and each migrated record's verification history" },
  // I13 (plan step I13): what the represented person does themselves, and what the front door and the archive record as their own.
  { file: 'lib/frontdoor/representation.ts', fn: 'grantDelegation', why: 'a representation granted by the represented person themselves (signed in), for named services and acts, until a date or revoked; decides no one\'s standing' },
  { file: 'lib/frontdoor/representation.ts', fn: 'revokeDelegation', why: 'the represented person revokes a representation they granted; kept, never deleted' },
  { file: 'lib/frontdoor/journey.ts', fn: 'recordRouting', why: 'the front door\'s receipt of where an application went (service, procedure, competent institution, channel), written once at submission; changes no case or decision' },
  { file: 'app/api/records-management/route.ts', fn: 'acknowledgeTransfer', why: 'the archive\'s own receipt of a transfer, by one of its officials, naming the manifest it received; the transfer itself was decided by two officials of the sending institution' },
];

/** Files that may register an effect with the engine. */
const EFFECT_REGISTRARS = /^lib\/([a-z]+(\/[a-z]+)?\/procedures\.ts|casework\/(engine|referral|types)\.ts)$/;

function walk(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) { if (name !== 'node_modules') walk(p, out); }
    else if (/\.(ts|tsx|mts)$/.test(name) && !/\.(test|spec)\.tsx?$/.test(name) && !name.endsWith('.d.ts')) out.push(p);
  }
  return out;
}
const FILES = walk(SRC).map(p => ({ path: rel(p), text: readFileSync(p, 'utf8') }));

/** The module a specifier names, as a path under src (null when it is a package). */
function target(from: string, spec: string): string | null {
  let p: string;
  if (spec.startsWith('@/')) p = spec.slice(2);
  else if (spec.startsWith('.')) p = rel(resolve(SRC, dirname(from), spec));
  else return null;
  return p.replace(/\.(ts|tsx)$/, '');
}
type Import = { from: string; names: string[]; whole: boolean };
function importsOf(file: { path: string; text: string }): Import[] {
  const out: Import[] = [];
  const named = /(?:import|export)\s+(?:type\s+)?\{([^}]*)\}\s*from\s*['"]([^'"]+)['"]/g;
  for (const m of file.text.matchAll(named)) {
    const t = target(file.path, m[2]!);
    if (t) out.push({ from: t, names: m[1]!.split(',').map(s => s.trim().replace(/^type\s+/, '').split(/\s+as\s+/)[0]!.trim()).filter(Boolean), whole: false });
  }
  // A dynamic import taken apart at once (`const { getParcel } = await import(...)`) names what it uses, like a static one.
  const destructured = /const\s*\{([^}]*)\}\s*=\s*await\s+import\(\s*['"]([^'"]+)['"]\s*\)/g;
  for (const m of file.text.matchAll(destructured)) {
    const t = target(file.path, m[2]!);
    if (t) out.push({ from: t, names: m[1]!.split(',').map(s => s.trim().split(/\s*:\s*/)[0]!.trim()).filter(Boolean), whole: false });
  }
  const whole = /(?:import|export)\s+\*\s*(?:as\s+\w+\s*)?from\s*['"]([^'"]+)['"]|import\(\s*['"]([^'"]+)['"]\s*\)/g;
  for (const m of file.text.replace(destructured, '').matchAll(whole)) {
    const t = target(file.path, (m[1] ?? m[2])!);
    if (t) out.push({ from: t, names: [], whole: true });
  }
  return out;
}

describe('case-governed registers change only through the case engine', () => {
  it('classifies every export of every register module as a read or a change', () => {
    for (const r of REGISTERS) {
      const text = readFileSync(join(SRC, r.module), 'utf8');
      const exported = [
        ...[...text.matchAll(/^export\s+(?:async\s+)?(?:function\s*\*?|const|let)\s+([A-Za-z_$][\w$]*)/gm)].map(m => m[1]!),
        ...[...text.matchAll(/^export\s*\{([^}]*)\}\s*;?\s*$/gm)].flatMap(m => m[1]!.split(',').map(x => x.trim().split(/\s+as\s+/).at(-1)!.trim()).filter(Boolean)),
      ];
      const known = new Set([...r.changes, ...r.reads]);
      expect(exported.filter(e => !known.has(e)), `${r.module}: classify each new export as a read or a change in register-writes.test.ts`).toEqual([]);
      expect([...known].filter(k => !exported.includes(k)), `${r.module}: listed but no longer exported`).toEqual([]);
    }
  });

  it('lets only the procedure module (and the listed exceptions) import a changing function', () => {
    const bad: string[] = [];
    for (const f of FILES) {
      for (const imp of importsOf(f)) {
        const r = REGISTERS.find(x => x.module.replace(/\.ts$/, '') === imp.from);
        if (!r || f.path === r.module) continue;
        if (imp.whole) { bad.push(`${f.path}: imports ${r.module} whole; import named reads instead`); continue; }
        for (const n of imp.names) {
          if (!r.changes.includes(n)) continue;
          if (f.path === r.procedures) continue;
          if (EXCEPTIONS.some(e => e.file === f.path && e.fn === n)) continue;
          bad.push(`${f.path}: imports ${n} from ${r.module}; change the register through a procedure (act()), not directly`);
        }
      }
    }
    expect(bad).toEqual([]);
  });

  it('keeps each register store inside its own module', () => {
    const bad: string[] = [];
    for (const r of REGISTERS) {
      const re = new RegExp(`\\b${r.store}\\b`);
      for (const f of FILES) if (re.test(f.text) && f.path !== r.module && f.path !== 'lib/data/register-owners.ts' && !(r.storeAlso ?? []).includes(f.path)) bad.push(`${f.path} uses ${r.store}`);
    }
    expect(bad).toEqual([]);
  });

  it('registers effects only from procedure modules and the engine, and procedure modules export no effect', () => {
    const registrars = FILES.filter(f => /\bregisterEffect\s*\(/.test(f.text)).map(f => f.path);
    expect(registrars.filter(p => !EFFECT_REGISTRARS.test(p))).toEqual([]);
    for (const f of FILES.filter(x => /^lib\/[a-z]+(\/[a-z]+)?\/procedures\.ts$/.test(x.path))) {
      const fns = [...f.text.matchAll(/^export\s+(?:async\s+)?function\s+([A-Za-z_$][\w$]*)/gm)].map(m => m[1]!);
      // An installer drafts the reference packages; registerOfCase only reads which register a case concerns.
      expect(fns.filter(n => !/^install[A-Z]\w*Procedures$/.test(n) && n !== 'registerOfCase' && n !== 'sectorProcedures'), f.path).toEqual([]);
    }
  });

  it('keeps every exception still in use, so the list does not outlive the code', () => {
    for (const e of EXCEPTIONS) {
      const f = FILES.find(x => x.path === e.file);
      expect(f, e.file).toBeTruthy();
      expect(new RegExp(`\\b${e.fn}\\b`).test(f!.text), `${e.file} no longer uses ${e.fn}`).toBe(true);
    }
  });

  it('catches a route that imports a changing function', () => {
    const route = { path: 'app/api/example/route.ts', text: "import { setStanding, getOrganisation } from '@/lib/organisations/register';" };
    const imp = importsOf(route)[0]!;
    expect(imp).toMatchObject({ from: 'lib/organisations/register', names: ['setStanding', 'getOrganisation'] });
    const r = REGISTERS.find(x => x.module === 'lib/organisations/register.ts')!;
    expect(imp.names.filter(n => r.changes.includes(n))).toEqual(['setStanding']);
    expect(importsOf({ path: 'lib/x/y.ts', text: "const m = await import('../civil/register');" })[0]).toMatchObject({ from: 'lib/civil/register', whole: true });
    // Taken apart at once, a dynamic import names what it uses (a changing function is still caught).
    expect(importsOf({ path: 'lib/x/y.ts', text: "const { getParcel, applyRightsChange: apply } = await import('@/lib/data/parcels');" })).toEqual([{ from: 'lib/data/parcels', names: ['getParcel', 'applyRightsChange'], whole: false }]);
  });
});
