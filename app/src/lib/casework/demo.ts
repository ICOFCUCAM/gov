// The demonstration set (demo and training installations only, lib/ops/mode.ts):
// sample acts (civil registration; business registration, licensing and
// accreditation; immigration, police, courts; tax, education, health
// professions and facilities, customs), recorded and confirmed, and the reference procedures cited
// to them and approved, so cases can be run end to end
// without a nation's real law. Everything goes through the same registers and
// four-eyes rules as real work, under named demonstration officials, and the
// act is marked as a sample (source kind 'sample'). A production installation
// refuses it.
import { samplesAllowed } from '@/lib/ops/mode';
import { authorityFor, getSovereign } from '@/lib/data/store';
import { recordAudit } from '@/lib/data/store/audit';
import { recordVersion, confirmVersion, listInstruments } from '@/lib/law/register';
import { REFERENCE_PROCEDURES, ORGANISATION_PROCEDURES, IMMIGRATION_PROCEDURES, POLICE_PROCEDURES, COURT_PROCEDURES, TAX_PROCEDURES, EDUCATION_PROCEDURES, PROFESSION_PROCEDURES, HEALTH_PROCEDURES, CUSTOMS_PROCEDURES, PRODUCT_PROCEDURES, installReferenceProcedures } from '@/lib/casework/modules';
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
  { title: 'Health Professions Act (sample for demonstration)', number: 'sample-8', authority: 'professionalRegulation', procedures: PROFESSION_PROCEDURES, provisions: {
    'prof.registration': P('sec_6', '6', 'A person holding a recognised qualification may be registered to practise a regulated profession.'),
    'prof.renewal': P('sec_9', '9', 'A registration may be renewed on evidence of continuing professional development.'),
    'prof.fitness': P('sec_15', '15', 'After notice and representations, a registration may be suspended, reinstated with conditions or revoked.'),
  } },
  { title: 'Health Facilities and Pharmacy Act (sample for demonstration)', number: 'sample-9', authority: 'healthRegulation', procedures: HEALTH_PROCEDURES, provisions: {
    'health.facility': P('sec_10', '10', 'No health facility shall operate unless licensed after inspection of its premises.'),
    'health.facility-renewal': P('sec_11', '11', 'A facility licence may be renewed on evidence that its conditions are still met.'),
    'health.facility-suspension': P('sec_12', '12', 'After notice and representations, a facility licence may be suspended and later reinstated.'),
    'health.facility-revocation': P('sec_13', '13', 'After notice and representations, a facility licence may be revoked.'),
    'health.pharmacy': P('sec_20', '20', 'No pharmacy shall operate unless licensed after inspection of its premises.'),
    'health.pharmacy-renewal': P('sec_21', '21', 'A pharmacy licence may be renewed on evidence that its conditions are still met.'),
    'health.pharmacy-suspension': P('sec_22', '22', 'After notice and representations, a pharmacy licence may be suspended and later reinstated.'),
    'health.pharmacy-revocation': P('sec_23', '23', 'After notice and representations, a pharmacy licence may be revoked.'),
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
  { title: 'Customs Act (sample for demonstration)', number: 'sample-10', authority: 'customs', procedures: CUSTOMS_PROCEDURES, provisions: {
    'customs.declaration': P('sec_30', '30', 'Goods shall be declared to customs, may be examined, and are released once the duty assessed on them is paid.'),
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
