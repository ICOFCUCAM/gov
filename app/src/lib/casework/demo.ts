// The demonstration set (demo and training installations only, lib/ops/mode.ts):
// a sample Civil Registration Act, recorded and confirmed, and the reference
// civil procedures cited to it and approved, so cases can be run end to end
// without a nation's real law. Everything goes through the same registers and
// four-eyes rules as real work, under named demonstration officials, and the
// act is marked as a sample (source kind 'sample'). A production installation
// refuses it.
import { samplesAllowed } from '@/lib/ops/mode';
import { authorityFor, getSovereign } from '@/lib/data/store';
import { recordAudit } from '@/lib/data/store/audit';
import { recordVersion, confirmVersion, listInstruments } from '@/lib/law/register';
import { REFERENCE_PROCEDURES, installReferenceProcedures } from '@/lib/civil/procedures';
import { activePackage, approvePackage, draftPackage, listPackages } from '@/lib/casework/packages';
import { registeredEffects } from '@/lib/casework/engine';

export const DEMO_ACT_TITLE = 'Civil Registration Act (sample for demonstration)';

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

  let inst = listInstruments({ state: 'any' }).find(i => i.title === DEMO_ACT_TITLE);
  if (!inst) {
    const r = recordVersion({
      instrument: { title: DEMO_ACT_TITLE, type: 'act', jurisdiction: getSovereign().iso3 ?? 'sample', year: 2000, number: 'sample-1', issuingAuthority: 'Sample legislature' },
      dates: { inForce: '2000-01-01' },
      provisions: Object.values(PROVISION),
      source: { kind: 'sample' },
    }, RECORDER.name, RECORDER.id, now);
    if ('error' in r) return r;
    const c = confirmVersion(r.instrument.id, r.version.id, CONFIRMER.name, CONFIRMER.id, now);
    if ('error' in c) return c;
    inst = listInstruments({ state: 'any' }).find(i => i.title === DEMO_ACT_TITLE);
  }
  const version = inst?.versions.find(v => v.state === 'confirmed');
  if (!inst || !version) return { error: 'The sample act has no confirmed version' };

  installReferenceProcedures(by);
  const approved: string[] = [], present: string[] = [];
  for (const p of REFERENCE_PROCEDURES) {
    if (activePackage(p.key, today)) { present.push(p.key); continue; }
    const cite = PROVISION[p.key];
    if (!cite) continue;
    const next = Math.max(0, ...listPackages({ key: p.key }).map(x => x.version)) + 1;
    const d = draftPackage({ ...p, version: next, reference: false, citations: [{ instrument: inst.id, eId: cite.eId, version: version.id, digest: version.digest, on: today }] }, DRAFTER.name, DRAFTER.id, registeredEffects(), now);
    if ('error' in d) return { error: `${p.title}: ${d.error}` };
    const a = approvePackage(p.key, next, APPROVER.name, APPROVER.id, today, registeredEffects(), now);
    if ('error' in a) return { error: `${p.title}: ${a.error}` };
    approved.push(p.key);
  }
  recordAudit(by, 'demo.load', 'Demonstration:civil', 'ok', `Sample act ${inst.id}; approved ${approved.join(', ') || 'none'}`);
  return { act: inst.id, approved, present };
}
