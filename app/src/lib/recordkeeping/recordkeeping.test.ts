// Records management (plan step I13; forms catalogue Part 13 §7): record
// classes with retention schedules the law sets (nothing ships, nothing is
// disposed of without one), legal holds that block disposal and the
// platform's retention sweep, disposal of exactly the listed records by two
// officials other than the lister (the document record and its hash kept,
// never deleted; a demonstration never disposes of a real record), transfer to
// the archive with its own receipt, and migrations reconciled with counts and
// hashes computed from the platform's own records.
import { asNationSets } from '@/lib/casework/testkit';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

const { openCase, act, attach, resetCases, registeredEffects, getCase } = await import('@/lib/casework/engine');
const { draftPackage, approvePackage, resetPackages } = await import('@/lib/casework/packages');
const { addDocument, getDocument, documentBytes, resetDocuments } = await import('@/lib/records/documents');
const { resetDecisions } = await import('@/lib/records/decisions');
const { setSovereign, listMinistries } = await import('@/lib/data/store');
const { recordVersion, confirmVersion, resetLaw } = await import('@/lib/law/register');
const { proposeRetention, decideRetention, runRetention, resetRetention } = await import('@/lib/data/retention');
await import('@/lib/casework/modules');
const { RECORDKEEPING_PROCEDURES, recordkeepingKey } = await import('./procedures');
const { resetRecordkeeping, getClass, holdsOf, disposalOfCase, transfersOf, acknowledgeTransfer, migrationOfCase, incomingOf, listDigest, holdCovering } = await import('./register');
type Actor = import('@/lib/casework/engine').Actor;

let X = '', ARCH = '', lawId = '';
const off = (id: string, role: 'officer' | 'signatory' = 'officer', inst = () => X): Actor => ({ id, name: `Official ${id}`, scope: { id, role, institution: inst() } });
const pdf = (s: string) => new Uint8Array(Buffer.from(`%PDF-1.7\n${s}\n%%EOF`));
const DAY = 86_400_000;
const later = (days: number) => new Date(Date.now() + days * DAY);
async function step(id: string, action: string, who: Actor, extra: Record<string, unknown> = {}, now = new Date()) { const r = await act(id, { action, ...extra }, who, now); if ('error' in r) throw new Error(`${action}: ${r.error}`); return r; }
const key = (t: string) => recordkeepingKey(t, X);
function adopt() {
  for (const t of RECORDKEEPING_PROCEDURES) {
    const { forms: _f, ...pkg } = t;
    const d = draftPackage({ ...asNationSets(pkg), key: key(t.key), owner: X }, 'Author', 'author', registeredEffects()); if ('error' in d) throw new Error(d.error);
    const a = approvePackage(key(t.key), 1, 'Approver', 'approver', '2026-01-01', registeredEffects(), new Date('2026-01-01')); if ('error' in a) throw new Error(a.error);
  }
  // A small procedure of X whose case documents carry the retention class "market-permits".
  const d = draftPackage({ key: 'mk.permit', version: 1, owner: X, title: 'Market permit', refPrefix: 'MKP', citations: [], fields: [{ key: 'stall', label: 'Stall', type: 'text', personalDataClass: 'administrative' }], documents: [{ class: 'application', label: 'Application', required: true }],
    stages: [{ key: 'open', label: 'Open' }, { key: 'closed', label: 'Closed', terminal: true }], actions: [{ key: 'close', label: 'Close', from: ['open'], to: 'closed', needs: { role: 'officer' } }],
    deadlines: [], notifications: [], retention: 'market-permits', sensitivity: 'normal', tests: [{ name: 'closed', steps: [{ action: 'close', expect: 'closed' }] }] }, 'Author', 'author', registeredEffects()) as { key: string };
  approvePackage(d.key, 1, 'Approver', 'approver', '2026-01-01', registeredEffects(), new Date('2026-01-01'));
}
/** A case of the market procedure with one document carrying the class. */
function permitWithDocument(source: 'entered' | 'sample' = 'entered'): { caseId: string; doc: string } {
  const c = openCase({ procedure: 'mk.permit', fields: { stall: 'A1' }, source }, off('o1'));
  if ('error' in c) throw new Error(c.error);
  const d = addDocument({ class: 'application', title: 'Application', institution: X, belongsTo: { kind: 'case', id: c.id }, retention: 'market-permits', bytes: pdf(c.id) }, 'Clerk') as { id: string };
  attach(c.id, d.id, off('o1'));
  return { caseId: c.id, doc: d.id };
}
async function schedule(disposition: 'destroy' | 'archive' | 'permanent', periodDays = 30) {
  const c = openCase({ procedure: key('rec.schedule'), fields: {} }, off('o1')) as { id: string };
  const d = addDocument({ class: 'schedule', title: 'Schedule', institution: X, belongsTo: { kind: 'case', id: c.id }, bytes: pdf('schedule') }, 'Clerk') as { id: string };
  attach(c.id, d.id, off('o1'));
  await step(c.id, 'review', off('o1'), { fields: { classKey: 'market-permits', classTitle: 'Market permit files', classDescription: 'Applications and their evidence', access: 'normal', trigger: 'created', ...(disposition !== 'permanent' ? { periodDays } : {}), disposition } });
  await step(c.id, 'approve', off('s1', 'signatory'), { reason: 'As the Archives Act sets', citations: [{ instrument: lawId, eId: 'sec_9' }] });
  return step(c.id, 'approve', off('s2', 'signatory'));
}

describe('records management', () => {
  beforeEach(() => {
    for (const r of [resetCases, resetPackages, resetDocuments, resetDecisions, resetLaw, resetRecordkeeping, resetRetention]) r();
    vi.stubEnv('CIVICOS_DATA_KEK', Buffer.alloc(32, 7).toString('base64'));
    [X, ARCH] = listMinistries().slice(0, 2).map(m => m.id) as [string, string];
    setSovereign({ deployment: { authorities: {} } }, 'Administrator');
    const law = recordVersion({ instrument: { title: 'Public Archives Act', type: 'act', jurisdiction: 'X', year: 2010, number: '4', issuingAuthority: 'Parliament' }, dates: { inForce: '2010-01-01' }, provisions: [{ eId: 'sec_9', num: '9', text: 'Public records are kept, transferred or destroyed under schedules approved by the archives.' }, { eId: 'sec_12', num: '12', text: 'No record subject to a legal proceeding shall be destroyed.' }] }, 'L1', 'l1') as { instrument: { id: string }; version: { id: string } };
    confirmVersion(law.instrument.id, law.version.id, 'L2', 'l2');
    lawId = law.instrument.id;
    adopt();
  });
  afterEach(() => { vi.unstubAllEnvs(); });

  it('ships no class, period or schedule; a schedule is the nation\'s law, approved by two officials citing it, every version kept', async () => {
    for (const p of RECORDKEEPING_PROCEDURES) {
      expect(p).toMatchObject({ reference: true, owner: 'institution' });
      for (const d of p.deadlines) expect(d.days).toBeUndefined();
    }
    expect(getClass(X, 'market-permits')).toBeUndefined();
    // Nothing is disposed of without a schedule.
    const none = openCase({ procedure: key('rec.disposal'), fields: { recordClass: 'market-permits' } }, off('o1')) as { id: string };
    expect(await act(none.id, { action: 'list' }, off('o1'))).toMatchObject({ error: expect.stringMatching(/approve its retention schedule first/) });
    const d = await schedule('destroy', 30);
    expect(d.decision!.content.citations[0]).toMatchObject({ instrument: lawId, eId: 'sec_9' });
    await schedule('destroy', 60);
    expect(getClass(X, 'market-permits')!.schedules.map(s => [s.n, s.periodDays, s.approvedBy.map(x => x.name)])).toEqual([[1, 30, ['Official s1', 'Official s2']], [2, 60, ['Official s1', 'Official s2']]]);
  });

  it('disposes only of what the schedule makes due, by two officials other than the lister; held records are kept; the record and its hash stay; a demonstration never disposes of a real record', async () => {
    await schedule('destroy', 30);
    const real = permitWithDocument('entered');
    const s1 = permitWithDocument('sample'), s2 = permitWithDocument('sample');
    // A demonstration installation: the real record is left out; only samples are listed.
    const c = openCase({ procedure: key('rec.disposal'), fields: { recordClass: 'market-permits' } }, off('o1')) as { id: string };
    expect(await act(c.id, { action: 'list' }, off('o1'), later(10))).toMatchObject({ error: expect.stringMatching(/No record of this class is due/) });
    await step(c.id, 'list', off('o1'), {}, later(40));
    const listed = disposalOfCase(getCase(c.id)!.ref)!;
    expect(listed.items.map(i => i.id).sort()).toEqual([s1.doc, s2.doc].sort());
    expect(listed.listDigest).toBe(listDigest(listed.items));
    // A legal hold on one case placed after the listing: that record is skipped at disposal.
    const h = openCase({ procedure: key('rec.hold'), fields: { scopeKind: 'case', scopeRef: getCase(s2.caseId)!.ref, holdReason: 'Pending court action' } }, off('o1')) as { id: string };
    await step(h.id, 'place', off('s1', 'signatory'), { reason: 'Court action filed', citations: [{ instrument: lawId, eId: 'sec_12' }] });
    expect(holdsOf(X)[0]).toMatchObject({ scope: { kind: 'case' }, reason: 'Pending court action', citations: [expect.objectContaining({ eId: 'sec_12' })], placedBy: [{ name: 'Official s1', id: 's1' }] });
    // The lister cannot authorise; two other officials do.
    expect(await act(c.id, { action: 'authorise', reason: 'Due' }, off('o1', 'signatory'), later(40))).toMatchObject({ error: expect.stringMatching(/Separation of duties/) });
    await step(c.id, 'authorise', off('s1', 'signatory'), { reason: 'Due under schedule 1' }, later(40));
    const done = await step(c.id, 'authorise', off('s2', 'signatory'), {}, later(40));
    const x = disposalOfCase(getCase(c.id)!.ref)!;
    expect(x.executed).toMatchObject({ destroyed: [expect.objectContaining({ id: s1.doc })], skipped: [expect.objectContaining({ id: s2.doc, why: 'No longer due or now held' })], certificate: expect.stringMatching(/^[0-9a-f]{64}$/) });
    expect(done.decision!.content.facts).toMatchObject({ destroyed: 1, skipped: 1, certificate: x.executed!.certificate });
    // The destroyed document keeps its record and hash; the content is gone. The held one and the real one are untouched.
    expect(getDocument(s1.doc)).toMatchObject({ disposed: { rule: expect.stringMatching(/Disposal DSP-/) }, versions: [expect.objectContaining({ sha256: x.executed!.destroyed[0]!.sha256 })] });
    expect(documentBytes(s1.doc)).toHaveProperty('error');
    expect(getDocument(s2.doc)!.disposed).toBeUndefined();
    expect(getDocument(real.doc)!.disposed).toBeUndefined();
    // Releasing the hold needs two officials.
    const rel = await act(h.id, { action: 'release', reason: 'Proceedings ended' }, off('s1', 'signatory'));
    expect(rel).toMatchObject({ pending: true });
    await step(h.id, 'release', off('s3', 'signatory'));
    expect(holdsOf(X)[0]!.released).toMatchObject({ reason: 'Proceedings ended', by: [{ name: 'Official s1', id: 's1' }, { name: 'Official s3', id: 's3' }] });
  });

  it('in production lists real records under the schedule, and a hold stops the platform\'s retention sweep too', async () => {
    await schedule('destroy', 30);
    const a = permitWithDocument('entered'), b = permitWithDocument('entered');
    // A hold on one document stops the platform's own retention sweep (lib/data/retention.ts) as well.
    const h = openCase({ procedure: key('rec.hold'), fields: { scopeKind: 'document', scopeRef: b.doc, holdReason: 'Audit' } }, off('o1')) as { id: string };
    await step(h.id, 'place', off('s1', 'signatory'), { reason: 'Audit', citations: [{ instrument: lawId, eId: 'sec_12' }] });
    expect(holdCovering({ institution: X, class: 'market-permits', document: b.doc })).toBeDefined();
    vi.stubEnv('CIVICOS_MODE', 'production');
    // A production installation lists its real records that are due (the decision to destroy them is sealed with the nation's approved key).
    const c = openCase({ procedure: key('rec.disposal'), fields: { recordClass: 'market-permits' } }, off('o1')) as { id: string };
    await step(c.id, 'list', off('o1'), {}, later(40));
    expect(disposalOfCase(getCase(c.id)!.ref)!.items.map(i => i.id)).toEqual([a.doc]);
    const p = proposeRetention({ category: 'documents', action: 'delete', days: 30, basis: 'Archives Act s 9', reason: 'Schedule' }, 'Admin A', Date.now(), 'admin-a') as { id: string };
    decideRetention(p.id, 'confirm', 'Admin B', Date.now(), 'admin-b');
    const run = runRetention(later(40).getTime());
    expect(run.documents).toMatchObject({ held: 1 });
    expect(getDocument(b.doc)!.disposed).toBeUndefined();
    expect(getDocument(a.doc)!.disposed).toBeDefined();
  });

  it('transfers to the archive the nation names, which records its own receipt of the exact manifest; a permanent class is never disposed of', async () => {
    await schedule('archive', 30);
    const s = permitWithDocument('sample');
    const t = openCase({ procedure: key('rec.transfer'), fields: { recordClass: 'market-permits' } }, off('o1')) as { id: string };
    expect(await act(t.id, { action: 'send', reason: 'Due' }, off('s1', 'signatory'), later(40))).toMatchObject({ pending: true });
    expect(await act(t.id, { action: 'send' }, off('s2', 'signatory'), later(40))).toMatchObject({ error: expect.stringMatching(/No archive is named/) });
    setSovereign({ deployment: { authorities: { archives: ARCH } } }, 'Administrator');
    await step(t.id, 'send', off('s2', 'signatory'), {}, later(40));
    const tr = transfersOf(X)[0]!;
    expect(tr).toMatchObject({ archive: ARCH, items: [expect.objectContaining({ id: s.doc })], manifest: listDigest(tr.items) });
    // Nothing is deleted by a transfer.
    expect(getDocument(s.doc)!.disposed).toBeUndefined();
    expect(acknowledgeTransfer(tr.id, { manifest: '0'.repeat(64), receipt: 'ARC-1', by: { name: 'Archivist' }, at: new Date().toISOString() })).toMatchObject({ error: expect.stringMatching(/does not match/) });
    expect(acknowledgeTransfer(tr.id, { manifest: tr.manifest, receipt: 'ARC-1', by: { name: 'Archivist' }, at: new Date().toISOString() })).toMatchObject({ received: { receipt: 'ARC-1' } });
    // A class to be transferred is never destroyed; a permanent class is neither.
    const dsp = openCase({ procedure: key('rec.disposal'), fields: { recordClass: 'market-permits' } }, off('o1')) as { id: string };
    expect(await act(dsp.id, { action: 'list' }, off('o1'), later(40))).toMatchObject({ error: expect.stringMatching(/transferred to the archive, never destroyed/) });
    await schedule('permanent');
    expect(await act(dsp.id, { action: 'list' }, off('o1'), later(4000))).toMatchObject({ error: expect.stringMatching(/kept permanently/) });
  });

  it('registers incoming correspondence, and reconciles a migration with counts and hashes computed from the platform\'s own records', async () => {
    const inc = openCase({ procedure: key('rec.incoming'), fields: { subject: 'Request for a stall', senderKind: 'person', channel: 'post', receivedOn: '2026-10-20', recordClass: 'correspondence' } }, off('o1')) as { id: string };
    await step(inc.id, 'register', off('o1'));
    expect(incomingOf(X)).toEqual([expect.objectContaining({ number: expect.stringMatching(/^INC-2026-/), class: 'correspondence', channel: 'post', receivedOn: '2026-10-20' })]);
    // Two documents land in the class; the source extract says three: a discrepancy must be recorded with its corrective action.
    const a = permitWithDocument(), b = permitWithDocument();
    const items = [a, b].map(x => ({ kind: 'document' as const, id: x.doc, sha256: getDocument(x.doc)!.versions[0]!.sha256 }));
    const plan = (count: number, manifest: string) => {
      const m = openCase({ procedure: key('rec.migration'), fields: { sourceSystem: 'Old registry', targetSystem: 'CivicOS', targetKind: 'documents', targetRef: 'market-permits', sourceCount: count, sourceManifest: manifest, description: 'Scanned permit files' } }, off('o1')) as { id: string };
      const d = addDocument({ class: 'migration-plan', title: 'Plan', institution: X, belongsTo: { kind: 'case', id: m.id }, bytes: pdf('plan') }, 'Clerk') as { id: string };
      attach(m.id, d.id, off('o1'));
      return m.id;
    };
    const bad = plan(3, 'a'.repeat(64));
    await step(bad, 'record-plan', off('o1'));
    expect(await act(bad, { action: 'approve', reason: 'Plan sound' }, off('o1', 'signatory'))).toMatchObject({ error: expect.stringMatching(/Separation of duties/) });
    await step(bad, 'approve', off('s1', 'signatory'), { reason: 'Plan sound' });
    await step(bad, 'approve', off('s2', 'signatory'));
    expect(await act(bad, { action: 'reconcile' }, off('o2'))).toMatchObject({ error: expect.stringMatching(/does not match the source \(2 of 3 records, manifest differs\)/) });
    await step(bad, 'reconcile', off('o2'), { fields: { discrepancies: 'One file unreadable in the source', correctiveActions: 'Rescan and load it as a correction' } });
    await step(bad, 'close', off('s3', 'signatory'), { reason: 'Accepted with the correction' });
    await step(bad, 'close', off('s4', 'signatory'));
    expect(migrationOfCase(getCase(bad)!.ref)).toMatchObject({ reconciliation: [expect.objectContaining({ count: 2, computed: true, matched: false })], closed: { outcome: 'accepted-with-corrections' } });
    // The exact source manifest: reconciled.
    const good = plan(2, listDigest(items));
    await step(good, 'record-plan', off('o1'));
    await step(good, 'approve', off('s1', 'signatory'), { reason: 'Plan sound' });
    await step(good, 'approve', off('s2', 'signatory'));
    await step(good, 'reconcile', off('o2'));
    await step(good, 'close', off('s3', 'signatory'), { reason: 'Reconciled' });
    await step(good, 'close', off('s4', 'signatory'));
    expect(migrationOfCase(getCase(good)!.ref)).toMatchObject({ source: { count: 2 }, reconciliation: [expect.objectContaining({ count: 2, manifest: listDigest(items), matched: true })], closed: { outcome: 'reconciled' } });
  });
});
