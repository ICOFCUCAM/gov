// The demonstration set (demo and training installations only, lib/ops/mode.ts):
// sample acts (civil registration; business registration, licensing and
// accreditation; immigration, police, courts; tax, education, health
// professions and facilities, customs; land, building control, housing and
// transport), recorded and confirmed, and the reference procedures cited
// to them and approved, so cases can be run end to end
// without a nation's real law. Everything goes through the same registers and
// four-eyes rules as real work, under named demonstration officials, and the
// act is marked as a sample (source kind 'sample'). A production installation
// refuses it.
import { samplesAllowed } from '@/lib/ops/mode';
import { authorityFor, getSovereign } from '@/lib/data/store';
import { recordAudit } from '@/lib/data/store/audit';
import { recordVersion, confirmVersion, listInstruments } from '@/lib/law/register';
import { LAND_PROCEDURES } from '@/lib/land/procedures';
import { BUILDING_PROCEDURES } from '@/lib/building/procedures';
import { HOUSING_PROCEDURES } from '@/lib/housing/procedures';
import { TRANSPORT_PROCEDURES } from '@/lib/transport/procedures';
import { REFERENCE_PROCEDURES, ORGANISATION_PROCEDURES, IMMIGRATION_PROCEDURES, POLICE_PROCEDURES, COURT_PROCEDURES, TAX_PROCEDURES, EDUCATION_PROCEDURES, PROFESSION_PROCEDURES, HEALTH_PROCEDURES, CUSTOMS_PROCEDURES, PRODUCT_PROCEDURES, PROGRAMME_PROCEDURES, COMPLAINT_PROCEDURES, FINANCE_PROCEDURES, CABINET_PROCEDURES, REFERENCE_PROCUREMENT_COMPLAINT, IDENTITY_PROCEDURES, PASSPORT_PROCEDURES, CITIZENSHIP_PROCEDURES, LABOUR_PROCEDURES, SOCIAL_PROCEDURES, SECURITY_PROCEDURES, installReferenceProcedures } from '@/lib/casework/modules';
import type { AuthorityKey } from '@/lib/nation/deployment';
import { activePackage, approvePackage, draftPackage, listPackages, withSampleDeadlines } from '@/lib/casework/packages';
import { registeredEffects } from '@/lib/casework/engine';

export const DEMO_ACT_TITLE = 'Civil Registration Act (sample for demonstration)';
export const DEMO_ORG_ACT_TITLE = 'Business Registration, Licensing and Accreditation Act (sample for demonstration)';

/** The provisions of the sample organisations act each organisation procedure cites. */
const ORG_PROVISION: Record<string, { eId: string; num: string; text: string }> = {
  'org.registration': { eId: 'sec_5', num: '5', text: 'A company or organisation is registered by the Registrar on its constitution and the identity of its representative.' },
  'org.licence': { eId: 'sec_20', num: '20', text: 'The licensing authority may grant a licence, with conditions, for the period the regulations set.' },
  'org.licence-renewal': { eId: 'sec_22', num: '22', text: 'A licence may be renewed on evidence that its conditions are still met.' },
  'org.licence-suspension': { eId: 'sec_24', num: '24', text: 'After notice and representations, a licence may be suspended and later reinstated.' },
  'org.licence-revocation': { eId: 'sec_25', num: '25', text: 'After notice and representations, a licence may be revoked.' },
  'org.accreditation': { eId: 'sec_40', num: '40', text: 'The accreditation authority may accredit an institution after inspection, expert review and the committee\'s recommendation.' },
  'org.accreditation-renewal': { eId: 'sec_42', num: '42', text: 'An accreditation may be renewed on evidence that its conditions are still met.' },
  'org.accreditation-suspension': { eId: 'sec_44', num: '44', text: 'After notice and representations, an accreditation may be suspended and later reinstated.' },
  'org.accreditation-revocation': { eId: 'sec_45', num: '45', text: 'After notice and representations, an accreditation may be revoked.' },
};

const P = (eId: string, num: string, text: string) => ({ eId, num, text });
/** Sample acts for immigration, police intake and courts, by the procedure each provision serves. */
const MORE_ACTS: { title: string; number: string; authority: AuthorityKey; provisions: Record<string, { eId: string; num: string; text: string }>; procedures: typeof REFERENCE_PROCEDURES }[] = [
  { title: 'Immigration Act (sample for demonstration)', number: 'sample-3', authority: 'immigration', procedures: IMMIGRATION_PROCEDURES, provisions: {
    'immigration.visa': P('sec_10', '10', 'A visa may be granted for a category, a period and a number of entries, with conditions, and refused with reasons subject to appeal.'),
    'immigration.residence-permit': P('sec_20', '20', 'A residence permit may be granted on a ground the Act names, for a period, with conditions.'),
    'immigration.extension': P('sec_25', '25', 'A visa or permit may be extended on evidence that its ground continues.'),
    'immigration.revocation': P('sec_30', '30', 'After notice and representations, a visa or permit may be revoked; an appeal suspends the revocation.'),
  } },
  { title: 'Police and Criminal Procedure Act (sample for demonstration)', number: 'sample-4', authority: 'police', procedures: POLICE_PROCEDURES, provisions: {
    'police.incident': P('sec_5', '5', 'The police shall record every report of an incident, assess it and refer, investigate or close it with reasons.'),
  } },
  { title: 'Rules of Court (sample for demonstration)', number: 'sample-5', authority: 'judiciary', procedures: COURT_PROCEDURES, provisions: {
    'court.case': P('rule_3', '3', 'A case is begun by filing, reviewed by the registry, served on the parties, heard and decided by judgment with reasons, subject to appeal.'),
  } },
  // Cycle 3 domains. Sample acts name powers only: no rate, tariff, penalty or deadline is sampled (amounts are entered with reasons until a nation approves its own rules), and the permit authority mappings stay drafts.
  { title: 'Tax Administration Act (sample for demonstration)', number: 'sample-6', authority: 'tax', procedures: TAX_PROCEDURES, provisions: {
    'tax.registration': P('sec_8', '8', 'The tax authority shall register every person liable to tax and give a taxpayer identification number.'),
    'tax.return': P('sec_20', '20', 'The tax authority shall assess the tax due on a return, and give notice of the assessment and the date payment is due.'),
    'tax.objection': P('sec_40', '40', 'A taxpayer may object to an assessment; the tax authority shall decide the objection with reasons and may vary the assessment.'),
    'tax.registration-amendment': P('sec_9', '9', 'A registered taxpayer shall notify changes; the tax authority may amend, suspend or reactivate a registration with reasons.'),
    'tax.amendment': P('sec_22', '22', 'A return or an assessment may be amended on application or to correct an error; the original is kept.'),
    'tax.refund': P('sec_30', '30', 'The tax authority shall decide a claim for a refund of tax overpaid or refundable with reasons, and pay what it approves.'),
    'tax.payment-plan': P('sec_50', '50', 'The tax authority may agree that tax due be paid by instalments.'),
    'tax.payment-plan-review': P('sec_51', '51', 'An instalment arrangement may be varied or cancelled, and is in default when an instalment is unpaid after notice.'),
    'tax.disclosure': P('sec_45', '45', 'A person who discloses an omission before a compliance review begins shall be assessed on the disclosure.'),
    'tax.ruling': P('sec_60', '60', 'The tax authority may give a ruling on the application of this Act to a stated arrangement.'),
    'tax.compliance': P('sec_35', '35', 'An authorised officer may review a taxpayer\'s compliance within an authorised scope and request records; findings are put to the taxpayer before assessment.'),
  } },
  { title: 'Education Act (sample for demonstration)', number: 'sample-7', authority: 'education', procedures: EDUCATION_PROCEDURES, provisions: {
    'edu.school': P('sec_10', '10', 'No school shall operate unless registered by the education authority, which may attach conditions.'),
    'edu.school-renewal': P('sec_11', '11', 'A registration may be renewed on evidence that its conditions are still met.'),
    'edu.school-suspension': P('sec_12', '12', 'After notice and representations, a registration may be suspended and later reinstated.'),
    'edu.school-revocation': P('sec_13', '13', 'After notice and representations, a registration may be revoked.'),
    'edu.inspection': P('sec_20', '20', 'The education authority may inspect any registered school and shall record its findings.'),
    'edu.qualification': P('sec_30', '30', 'The education authority shall keep a record of qualifications awarded by accredited or registered institutions.'),
    'edu.qualification-correction': P('sec_31', '31', 'An entry in the record of qualifications may be corrected on evidence of the error.'),
    'edu.qualification-revocation': P('sec_32', '32', 'After notice and representations, a qualification obtained by fraud or malpractice may be revoked.'),
  } },
  { title: 'Health Professions Act (sample for demonstration)', number: 'sample-8', authority: 'professionalRegulation', procedures: [...PROFESSION_PROCEDURES, ...COMPLAINT_PROCEDURES], provisions: {
    'prof.registration': P('sec_6', '6', 'A person holding a recognised qualification may be registered to practise a regulated profession.'),
    'prof.renewal': P('sec_9', '9', 'A registration may be renewed on evidence of continuing professional development.'),
    'prof.fitness': P('sec_15', '15', 'After notice and representations, a registration may be suspended, reinstated with conditions or revoked.'),
    'prof.complaint': P('sec_14', '14', 'Any person may complain to the regulator about a registered professional\'s conduct; the regulator shall assess each complaint and may open fitness-to-practise proceedings.'),
  } },
  { title: 'Health Facilities and Pharmacy Act (sample for demonstration)', number: 'sample-9', authority: 'healthRegulation', procedures: [...HEALTH_PROCEDURES, ...COMPLAINT_PROCEDURES], provisions: {
    'health.facility': P('sec_10', '10', 'No health facility shall operate unless licensed after inspection of its premises.'),
    'health.facility-renewal': P('sec_11', '11', 'A facility licence may be renewed on evidence that its conditions are still met.'),
    'health.facility-suspension': P('sec_12', '12', 'After notice and representations, a facility licence may be suspended and later reinstated.'),
    'health.facility-revocation': P('sec_13', '13', 'After notice and representations, a facility licence may be revoked.'),
    'health.pharmacy': P('sec_20', '20', 'No pharmacy shall operate unless licensed after inspection of its premises.'),
    'health.pharmacy-renewal': P('sec_21', '21', 'A pharmacy licence may be renewed on evidence that its conditions are still met.'),
    'health.pharmacy-suspension': P('sec_22', '22', 'After notice and representations, a pharmacy licence may be suspended and later reinstated.'),
    'health.pharmacy-revocation': P('sec_23', '23', 'After notice and representations, a pharmacy licence may be revoked.'),
    'health.complaint': P('sec_30', '30', 'Any person may raise a complaint or safety concern about a licensed facility or pharmacy; the regulator shall assess it and may act on the licence.'),
  } },
  // Public-health programme administration: only once the nation names its public-health authority. Programme-level and area-level only.
  { title: 'Public Health Act (sample for demonstration)', number: 'sample-13', authority: 'publicHealth', procedures: PROGRAMME_PROCEDURES, provisions: {
    'public-health.programme': P('sec_5', '5', 'The public-health authority may establish programmes, stating who is eligible, how coverage is measured and how they report.'),
    'public-health.programme-change': P('sec_6', '6', 'The public-health authority may amend, suspend or close a programme it established.'),
    'public-health.programme-return': P('sec_8', '8', 'Facilities taking part in a programme shall report aggregate counts for each reporting period.'),
    'public-health.risk-communication': P('sec_10', '10', 'The public-health authority may issue communications about risks to the public, approved by two of its officials.'),
    // Interventions (public-health.intervention) are not approved here: who may decide each kind is the nation's law (CFG-PH-003).
  } },
  // Medicines and medical devices: only once the nation names its medicines authority (provisional owners never run cases). Powers only: no period, fee or outcome list.
  { title: 'Medicines and Medical Devices Act (sample for demonstration)', number: 'sample-11', authority: 'medicinesRegulation', procedures: PRODUCT_PROCEDURES, provisions: {
    'medicines.authorisation': P('sec_10', '10', 'No medicine shall be placed on the market unless the medicines authority has authorised it after assessing its quality, safety and efficacy.'),
    'medicines.variation': P('sec_12', '12', 'A change to an authorised medicine takes effect once the medicines authority approves the variation.'),
    'medicines.renewal': P('sec_13', '13', 'An authorisation may be renewed on a review of the product\'s benefits and risks.'),
    'medicines.suspension': P('sec_15', '15', 'After notice and representations, an authorisation may be suspended, reinstated or withdrawn.'),
    'medicines.recall': P('sec_18', '18', 'The medicines authority may order the recall of a medicine or medical device that presents a risk.'),
    'medicines.device-registration': P('sec_20', '20', 'No medical device shall be placed on the market unless the medicines authority has registered it.'),
    'medicines.import-authorisation': P('sec_24', '24', 'No consignment of medicines or medical devices shall be imported except by a licensed importer under an import authorisation of the medicines authority.'),
    'medicines.safety-report': P('sec_30', '30', 'The medicines authority shall receive and assess reports of safety concerns about medicines and may issue safety alerts.'),
    'medicines.device-incident': P('sec_31', '31', 'The medicines authority shall receive and assess reports of incidents involving medical devices.'),
    'medicines.reconsideration': P('sec_40', '40', 'A person affected by a decision of the medicines authority may ask the authority to reconsider it; the reconsideration is made by officials who did not take the decision.'),
    // Corrective action (medicines.corrective-action) is not approved here: its period is the nation's law, and no sample period ships.
  } },
  { title: 'Controlled Substances Act (sample for demonstration)', number: 'sample-12', authority: 'controlledSubstances', procedures: PRODUCT_PROCEDURES, provisions: {
    'medicines.controlled': P('sec_8', '8', 'No person shall import, export, manufacture or distribute a controlled substance except under an authorisation, within the quantities the regulations set.'),
  } },
  // The economic group (plan step I5): powers only. No ceiling, threshold, approval tier, quorum or period is sampled: payments are
  // approved without tiers and Cabinet decisions recorded without adopted rules only in a demonstration, marked as such.
  { title: 'Public Finance Management Act (sample for demonstration)', number: 'sample-14', authority: 'finance', procedures: FINANCE_PROCEDURES, provisions: {
    'budget.circular': P('sec_10', '10', 'The finance authority shall issue a budget call circular for each budget period, stating the calendar and what bids must contain.'),
    'budget.ceiling': P('sec_11', '11', 'The finance authority shall set each institution\'s budget ceiling within the fiscal framework.'),
    'budget.bid': P('sec_12', '12', 'Each institution shall submit its budget bid within its ceiling; the finance authority shall review, negotiate and allocate.'),
    'budget.appropriation': P('sec_20', '20', 'Money appropriated by the legislature shall be released for commitment by the finance authority once its authority is validated.'),
    'budget.revision': P('sec_25', '25', 'The finance authority may transfer between appropriations, release further sums or reduce an appropriation as the law permits; supplementary sums need a supplementary appropriation.'),
    'finance.commitment': P('sec_30', '30', 'No commitment shall be made unless a released appropriation covers it.'),
    'treasury.payee-account': P('sec_34', '34', 'A payee\'s bank account shall be verified independently and approved by two officers before any payment is made to it.'),
    'treasury.payment': P('sec_35', '35', 'No payment shall be made unless instructed against a commitment, verified, approved by two officers, executed by the bank and reconciled, each step by a different officer.'),
    'treasury.cash-forecast': P('sec_40', '40', 'Each institution shall report a cash forecast for each period; the finance authority shall review it.'),
  } },
  { title: 'Cabinet Procedure Order (sample for demonstration)', number: 'sample-15', authority: 'cabinetOffice', procedures: CABINET_PROCEDURES, provisions: {
    'cabinet.decision': P('art_4', '4', 'The cabinet office shall register Cabinet papers, have them reviewed, circulate them, record and authenticate Cabinet\'s decisions and follow up the actions they assign.'),
    'exec.correspondence': P('art_9', '9', 'The cabinet office shall receive petitions and correspondence to the executive, acknowledge them and respond or refer them to the responsible institution.'),
  } },
  { title: 'Public Procurement Review Act (sample for demonstration)', number: 'sample-16', authority: 'procurementReview', procedures: [REFERENCE_PROCUREMENT_COMPLAINT], provisions: {
    'procurement-review.complaint': P('sec_50', '50', 'A bidder may complain to the review body about a procurement decision; the review body may suspend the award and shall decide with reasons.'),
  } },
  // Human services (plan I6): powers only. No fee, validity period, benefit rate or means limit is sampled: the passport fee
  // schedule and each programme's rule stay for the nation to approve (Rates and tariffs), and the mappings stay drafts.
  { title: 'National Identity Act (sample for demonstration)', number: 'sample-i6-1', authority: 'identity', procedures: IDENTITY_PROCEDURES, provisions: {
    'identity.enrolment': P('sec_4', '4', 'An eligible person may be enrolled in the national identity register on verified evidence of identity; a possible duplicate is determined by an authorised officer.'),
    'identity.credential': P('sec_8', '8', 'The authority issues, renews and replaces identity credentials for the period the regulations set.'),
    'identity.credential-status': P('sec_10', '10', 'After notice and representations, a credential may be suspended or revoked; a lost or stolen credential may be cancelled.'),
    'identity.resolution': P('sec_12', '12', 'The authority determines suspected duplicate, misused or compromised identity records.'),
  } },
  { title: 'Passports Act (sample for demonstration)', number: 'sample-i6-2', authority: 'travelDocuments', procedures: PASSPORT_PROCEDURES, provisions: {
    'passport.application': P('sec_5', '5', 'A citizen may be issued a passport or other travel document on application and the fee the Schedule sets.'),
    'passport.status': P('sec_9', '9', 'A travel document reported lost or stolen may be cancelled; after notice and representations, one may be revoked.'),
    'passport.review': P('sec_11', '11', 'A person refused a passport may ask for the refusal to be reviewed by officers who did not take it.'),
  } },
  { title: 'Citizenship Act (sample for demonstration)', number: 'sample-i6-3', authority: 'citizenship', procedures: CITIZENSHIP_PROCEDURES, provisions: {
    'citizenship.application': P('sec_5', '5', 'The competent authority determines applications for citizenship on the grounds this Act sets.'),
  } },
  { title: 'Employment and Labour Relations Act (sample for demonstration)', number: 'sample-i6-4', authority: 'labour', procedures: LABOUR_PROCEDURES, provisions: {
    'labour.employer-registration': P('sec_4', '4', 'Every employer shall register with the labour authority.'),
    'labour.employment-registration': P('sec_6', '6', 'An employer shall register each employment relationship.'),
    'labour.vacancy': P('sec_20', '20', 'The labour authority may publish vacancies employers notify.'),
    'labour.jobseeker': P('sec_21', '21', 'The labour authority may register jobseekers and refer them to vacancies.'),
    'labour.inspection': P('sec_30', '30', 'A labour inspector may inspect any workplace, record findings and issue corrective orders.'),
    'labour.complaint': P('sec_40', '40', 'Any worker may complain to the labour authority, which shall assess and decide the complaint with reasons.'),
    'labour.injury': P('sec_50', '50', 'An employer shall notify the labour authority of every occupational injury or dangerous occurrence.'),
    'labour.mediation': P('sec_60', '60', 'The labour authority may mediate a dispute at the request of a party.'),
    'labour.notice': P('sec_70', '70', 'Notice of a strike or of redundancies shall be given to the labour authority.'),
  } },
  { title: 'Social Assistance Act (sample for demonstration)', number: 'sample-i6-5', authority: 'socialProtection', procedures: SOCIAL_PROCEDURES, provisions: {
    'social.registration': P('sec_4', '4', 'A person may register with the social protection authority.'),
    'social.household': P('sec_5', '5', 'A registered person shall declare their household and any change to it.'),
    'social.benefit': P('sec_10', '10', 'A benefit is paid as the programme\'s regulations calculate, on a decision with reasons.'),
    'social.reassessment': P('sec_12', '12', 'A benefit may be reassessed on a change of circumstances.'),
    'social.suspension': P('sec_14', '14', 'After notice and representations, a benefit may be suspended or terminated.'),
    'social.payment': P('sec_16', '16', 'Payments are made on instructions approved by an officer other than the one who prepared them.'),
    'social.overpayment': P('sec_18', '18', 'An overpayment may be recovered or waived.'),
    'social.appeal': P('sec_20', '20', 'A person may appeal a decision to officers who did not take it.'),
  } },
  { title: 'Customs Act (sample for demonstration)', number: 'sample-10', authority: 'customs', procedures: CUSTOMS_PROCEDURES, provisions: {
    'customs.declaration': P('sec_30', '30', 'Goods shall be declared to customs, may be examined, and are released once the duty assessed on them is paid.'),
  } },
  // Plan I7: territory and infrastructure. Powers only: no fee, period, category or rate is sampled; building control rules, programme terms and
  // council rules stay unset until officials adopt them, and the permit authority mappings stay drafts.
  { title: 'Land Registration Act (sample for demonstration)', number: 'sample-i7-1', authority: 'landRegistry', procedures: LAND_PROCEDURES, provisions: {
    'land.transfer': P('sec_30', '30', 'A transfer of a registered interest is registered by the Registrar on a verified instrument; the earlier entry is kept.'),
    'land.encumbrance': P('sec_40', '40', 'A lease, charge, easement or caveat is registered against the parcel in the order lodged.'),
    'land.discharge': P('sec_45', '45', 'A charge or caveat is discharged on the release of the person entitled to it.'),
    'land.correction': P('sec_50', '50', 'The Registrar may correct an entry on evidence of the error; the earlier entry is kept.'),
    'land.dispute': P('sec_60', '60', 'A dispute concerning a registered interest is registered and determined by the Registrar or referred to the court; the interest is not dealt with meanwhile.'),
  } },
  { title: 'Physical Planning and Building Control Act (sample for demonstration)', number: 'sample-i7-2', authority: 'buildingControl', procedures: BUILDING_PROCEDURES, provisions: {
    'building.planning': P('sec_20', '20', 'No development shall be carried out without planning permission granted on an application after consultation.'),
    'building.permit': P('sec_40', '40', 'No building shall be erected without a building permit; works are inspected, may be stopped, and are occupied only on a certificate of occupancy.'),
  } },
  { title: 'Housing Act (sample for demonstration)', number: 'sample-i7-3', authority: 'housing', procedures: HOUSING_PROCEDURES, provisions: {
    'housing.programme': P('sec_10', '10', 'The housing authority may establish a housing programme with eligibility criteria and priority rules approved under this Act.'),
    'housing.application': P('sec_20', '20', 'Homes under a programme are allocated to eligible applicants according to its priority rules, with reasons.'),
  } },
  { title: 'Traffic Act (sample for demonstration)', number: 'sample-i7-4', authority: 'vehicleRegistration', procedures: TRANSPORT_PROCEDURES.filter(p => /vehicle|driving/.test(p.key)), provisions: {
    'transport.vehicle-registration': P('sec_5', '5', 'Every motor vehicle shall be registered and assigned a registration mark.'),
    'transport.vehicle-transfer': P('sec_9', '9', 'A change of the keeper of a registered vehicle shall be registered.'),
    'transport.driving-licence': P('sec_30', '30', 'No person shall drive without a driving licence for the category of vehicle, issued after a test.'),
  } },
  { title: 'Roads Act (sample for demonstration)', number: 'sample-i7-5', authority: 'roadAuthority', procedures: TRANSPORT_PROCEDURES.filter(p => p.key === 'transport.road-works'), provisions: {
    'transport.road-works': P('sec_12', '12', 'No person shall excavate or obstruct a public road except under a permit of the road authority.'),
  } },
  // I12: security governance and resilience. Powers only: no severity scale, threshold, period or classification level is sampled
  // (the scheme and the accreditation stay for the nation to adopt), and the mappings stay drafts.
  { title: 'Cybersecurity Act (sample for demonstration)', number: 'sample-i12-1', authority: 'cyberAuthority', procedures: SECURITY_PROCEDURES.filter(p => p.key.startsWith('cyber.')), provisions: {
    'cyber.incident': P('sec_10', '10', 'An operator of an essential service shall report a cyber incident to the national cybersecurity authority, which shall coordinate the response.'),
    'cyber.vulnerability': P('sec_14', '14', 'The authority may receive vulnerability reports in confidence and coordinate their remediation and disclosure with those affected.'),
    'cyber.supplier': P('sec_18', '18', 'The authority may assess the security of a supplier to a public institution or an essential service.'),
    'cyber.exception': P('sec_20', '20', 'The authority may approve a time-limited exception to a security requirement where compensating controls are in place.'),
    'cyber.exercise': P('sec_22', '22', 'The authority may plan and hold national cyber exercises.'),
  } },
  { title: 'Critical Infrastructure Protection Act (sample for demonstration)', number: 'sample-i12-2', authority: 'criticalInfrastructure', procedures: SECURITY_PROCEDURES.filter(p => p.key.startsWith('ci.')), provisions: {
    'ci.designation': P('sec_5', '5', 'The designating authority may designate an asset or service as critical infrastructure against the criteria the regulations set.'),
    'ci.dependency': P('sec_8', '8', 'The authority shall keep a record of the dependencies of designated infrastructure.'),
    'ci.risk': P('sec_10', '10', 'The operator of designated infrastructure shall assess its risks; a residual risk is accepted only by the authority.'),
    'ci.resilience-plan': P('sec_12', '12', 'The operator of designated infrastructure shall keep a resilience plan approved by the authority and exercise it.'),
  } },
  { title: 'Security Vetting Act (sample for demonstration)', number: 'sample-i12-3', authority: 'securityAccreditation', procedures: SECURITY_PROCEDURES.filter(p => p.key === 'security.clearance'), provisions: {
    'security.clearance': P('sec_6', '6', 'The security authority decides security clearances, their level, scope and validity, and may renew, vary, suspend or withdraw them.'),
  } },
  { title: 'Transport Licensing Act (sample for demonstration)', number: 'sample-i7-6', authority: 'transportRegulator', procedures: TRANSPORT_PROCEDURES.filter(p => p.key === 'transport.operator-licence'), provisions: {
    'transport.operator-licence': P('sec_8', '8', 'No person shall operate a public service vehicle except under an operator licence.'),
  } },
];

/** The provision of the sample act each reference procedure cites. */
const PROVISION: Record<string, { eId: string; num: string; text: string }> = {
  'civil.birth': { eId: 'sec_12', num: '12', text: 'Every birth shall be notified and registered by the Registrar within the period the regulations set.' },
  'civil.late-birth': { eId: 'sec_14', num: '14', text: 'A birth not registered in time may be registered on a sworn statement and supporting evidence.' },
  'civil.death': { eId: 'sec_20', num: '20', text: 'Every death shall be registered on a medical certificate of the cause of death.' },
  'civil.marriage': { eId: 'sec_30', num: '30', text: 'Every marriage shall be registered on the record of the officiant and two witnesses.' },
  'civil.correction': { eId: 'sec_40', num: '40', text: 'The Registrar may correct an entry in the register on evidence of the error.' },
};

const RECORDER = { name: 'Demonstration legal officer', id: 'demo-legal-a' };
const CONFIRMER = { name: 'Demonstration legal reviewer', id: 'demo-legal-b' };
const DRAFTER = { name: 'Demonstration registrar', id: 'demo-registrar' };
const APPROVER = { name: 'Demonstration registrar general', id: 'demo-registrar-general' };

export type DemoResult = { act: string; approved: string[]; present: string[] } | { error: string };

/**
 * A sample act an official can cite to name who is responsible on a demonstration installation whose
 * setup is complete (that change goes through the country's change process, which cites the law). It
 * designates nothing itself: the officials still choose and confirm each institution.
 */
export const DEMO_DESIGNATION_ACT_TITLE = 'Public Administration Act (sample for demonstration)';
export function sampleDesignationAct(now = new Date()): { instrument: string; eId: string } | { error: string } {
  if (!samplesAllowed()) return { error: 'A production installation holds no sample laws' };
  const act = sampleAct(DEMO_DESIGNATION_ACT_TITLE, 'sample-0', [{ eId: 'sec_3', num: '3', text: 'The Government designates, by order, the institution responsible for each public register and power.' }], now);
  return 'error' in act ? act : { instrument: act.instrument, eId: 'sec_3' };
}

export function loadDemonstration(by: string, now = new Date()): DemoResult {
  if (!samplesAllowed()) return { error: 'A production installation holds no sample laws or procedures' };
  if (!authorityFor('civilRegistration')) {
    // Recorded so the officials can cite it when they name who is responsible; nothing is named here.
    const basis = sampleDesignationAct(now);
    return { error: `Name the civil registration authority under Who is responsible first${'error' in basis ? '' : ` (cite the sample ${DEMO_DESIGNATION_ACT_TITLE}, section 3, when proposing it)`}` };
  }
  const today = now.toISOString().slice(0, 10);
  installReferenceProcedures(by);
  const approved: string[] = [], present: string[] = [];
  const sets: { title: string; number: string; provisions: Record<string, { eId: string; num: string; text: string }>; procedures: typeof REFERENCE_PROCEDURES }[] = [
    { title: DEMO_ACT_TITLE, number: 'sample-1', provisions: PROVISION, procedures: REFERENCE_PROCEDURES },
  ];
  // The organisation procedures need their authorities named; without them the civil set loads alone.
  if (authorityFor('businessRegister') && authorityFor('higherEducationAccreditation')) sets.push({ title: DEMO_ORG_ACT_TITLE, number: 'sample-2', provisions: ORG_PROVISION, procedures: ORGANISATION_PROCEDURES });
  for (const a of MORE_ACTS) if (authorityFor(a.authority)) sets.push(a);
  let first = '';
  for (const set of sets) {
    const act = sampleAct(set.title, set.number, Object.values(set.provisions), now);
    if ('error' in act) return act;
    first ||= act.instrument;
    for (const p of set.procedures) {
      if (activePackage(p.key, today)) { present.push(p.key); continue; }
      const cite = set.provisions[p.key];
      if (!cite) continue;
      const next = Math.max(0, ...listPackages({ key: p.key }).map(x => x.version)) + 1;
      // Day counts: the reference's sample values, marked Sample (a demonstration installation only).
      const d = draftPackage(withSampleDeadlines({ ...p, version: next, reference: false, citations: [{ instrument: act.instrument, eId: cite.eId, version: act.version, digest: act.digest, on: today }] }), DRAFTER.name, DRAFTER.id, registeredEffects(), now);
      if ('error' in d) return { error: `${p.title}: ${d.error}` };
      const a = approvePackage(p.key, next, APPROVER.name, APPROVER.id, today, registeredEffects(), now);
      if ('error' in a) return { error: `${p.title}: ${a.error}` };
      approved.push(p.key);
    }
  }
  recordAudit(by, 'demo.load', 'Demonstration:procedures', 'ok', `Sample acts; approved ${approved.join(', ') || 'none'}`);
  return { act: first, approved, present };
}

/** A sample act, recorded and confirmed once (marked as a sample). */
function sampleAct(title: string, number: string, provisions: { eId: string; num: string; text: string }[], now: Date): { instrument: string; version: string; digest: string } | { error: string } {
  let inst = listInstruments({ state: 'any' }).find(i => i.title === title);
  if (!inst) {
    const r = recordVersion({
      instrument: { title, type: 'act', jurisdiction: getSovereign().iso3 ?? 'sample', year: 2000, number, issuingAuthority: 'Sample legislature' },
      dates: { inForce: '2000-01-01' }, provisions, source: { kind: 'sample' },
    }, RECORDER.name, RECORDER.id, now);
    if ('error' in r) return r;
    const c = confirmVersion(r.instrument.id, r.version.id, CONFIRMER.name, CONFIRMER.id, now);
    if ('error' in c) return c;
    inst = listInstruments({ state: 'any' }).find(i => i.title === title);
  }
  const v = inst?.versions.find(x => x.state === 'confirmed');
  return inst && v ? { instrument: inst.id, version: v.id, digest: v.digest } : { error: `${title} has no confirmed version` };
}
