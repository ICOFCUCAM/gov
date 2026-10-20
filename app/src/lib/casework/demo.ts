// The demonstration set (demo and training installations only, lib/ops/mode.ts):
// sample acts (civil registration; business registration, licensing and
// accreditation), recorded and confirmed, and the reference procedures cited
// to them and approved, so cases can be run end to end
// without a nation's real law. Everything goes through the same registers and
// four-eyes rules as real work, under named demonstration officials, and the
// act is marked as a sample (source kind 'sample'). A production installation
// refuses it.
import { samplesAllowed } from '@/lib/ops/mode';
import { authorityFor, getSovereign } from '@/lib/data/store';
import { recordAudit } from '@/lib/data/store/audit';
import { recordVersion, confirmVersion, listInstruments } from '@/lib/law/register';
import { REFERENCE_PROCEDURES, ORGANISATION_PROCEDURES, IMMIGRATION_PROCEDURES, POLICE_PROCEDURES, COURT_PROCEDURES, installReferenceProcedures } from '@/lib/casework/modules';
import { activePackage, approvePackage, draftPackage, listPackages } from '@/lib/casework/packages';
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
const MORE_ACTS: { title: string; number: string; authority: 'immigration' | 'police' | 'judiciary'; provisions: Record<string, { eId: string; num: string; text: string }>; procedures: typeof REFERENCE_PROCEDURES }[] = [
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

export function loadDemonstration(by: string, now = new Date()): DemoResult {
  if (!samplesAllowed()) return { error: 'A production installation holds no sample laws or procedures' };
  if (!authorityFor('civilRegistration')) return { error: 'Name the civil registration authority under Who is responsible first' };
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
      const d = draftPackage({ ...p, version: next, reference: false, citations: [{ instrument: act.instrument, eId: cite.eId, version: act.version, digest: act.digest, on: today }] }, DRAFTER.name, DRAFTER.id, registeredEffects(), now);
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
