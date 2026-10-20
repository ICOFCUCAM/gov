// The end-to-end proof of the first real service (docs/GOVERNMENT_OPERATING_DIRECTIONS.md
// 17.2, design §12): a birth registration through every layer, in the nine
// steps the directions name. Each step uses the platform's own APIs and
// stores, nothing simulated.
import { describe, it, expect, beforeAll, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { createHash } from 'node:crypto';
import { setSovereign, listMinistries, listAudit, verifyAuditChain, registerIntegration } from '@/lib/data/store';
import { approveIntegration } from '@/lib/data/integration-approval.fixture';
import { recordVersion, confirmVersion, resetLaw } from '@/lib/law/register';
import { installReferenceProcedures, REFERENCE_BIRTH } from '@/lib/civil/procedures';
import { draftPackage, approvePackage, resetPackages } from '@/lib/casework/packages';
import { act, assign, attach, getCase, registeredEffects, resetCases, type Actor } from '@/lib/casework/engine';
import { addDocument, resetDocuments } from '@/lib/records/documents';
import { getDecision, verifyDecision, resetDecisions } from '@/lib/records/decisions';
import { certificatesFor, checkCode, resetCertificates } from '@/lib/records/certificates';
import { getEvent, resetCivil } from '@/lib/civil/register';
import { callService } from '@/lib/exchange/services';
import { verifyReceipt } from '@/lib/exchange/log';
import { recentEvents } from '@/lib/events/outbox';
import { publishCivilCounts } from '@/lib/civil/twin';
import { resetTwin, syncRegister, regionEntities, stateAsOf, nationalTotal } from '@/lib/twin/register';
import { liveKeys } from '@/lib/data/persist';
import { POST as citizenApply } from '@/app/api/citizen/applications/route';

let CIVIL = '';
const registrar = (id: string, role: 'officer' | 'signatory' = 'officer'): Actor => ({ id, name: `Registrar ${id}`, scope: { id, role, institution: CIVIL } });

describe('proof: a birth registration through every layer', () => {
  let law = { instrument: '', version: '', digest: '' };
  let caseId = '';

  beforeAll(async () => {
    for (const r of [resetLaw, resetPackages, resetCases, resetDocuments, resetDecisions, resetCertificates, resetCivil, resetTwin]) r();
    vi.stubEnv('CIVICOS_DATA_KEK', Buffer.alloc(32, 7).toString('base64'));
    CIVIL = listMinistries()[0]!.id;
    setSovereign({ regions: ['North', 'South'], deployment: { authorities: { civilRegistration: CIVIL, lawRegister: CIVIL } } }, 'Administrator');
    await syncRegister();
    // The nation's law, recorded by one official and confirmed by another.
    const v = recordVersion({ instrument: { title: 'Civil Registration Act', type: 'act', jurisdiction: 'MDA', year: 2020, number: '7', issuingAuthority: 'National Assembly' }, dates: { inForce: '2020-06-01' }, provisions: [{ eId: 'sec_12', num: '12', text: 'Every birth shall be registered by the Registrar.' }] }, 'Legal officer A', 'la');
    if ('error' in v) throw new Error(v.error);
    confirmVersion(v.instrument.id, v.version.id, 'Legal officer B', 'lb');
    law = { instrument: v.instrument.id, version: v.version.id, digest: v.version.digest };
    // The reference procedure, cited to the nation's law in its version 2 and approved by the authority.
    installReferenceProcedures('Administrator');
    const v2 = draftPackage({ ...REFERENCE_BIRTH, version: 2, reference: false, citations: [{ instrument: law.instrument, eId: 'sec_12', version: law.version, digest: law.digest, on: '2026-01-01' }] }, 'Registrar general', 'rg', registeredEffects());
    if ('error' in v2) throw new Error(v2.error);
    const ok = approvePackage('civil.birth', 2, 'Deputy registrar general', 'drg', '2026-01-01', registeredEffects(), new Date('2026-01-01'));
    if ('error' in ok) throw new Error(ok.error);
  });

  it('1. a citizen notifies a birth', async () => {
    const r = await citizenApply(new NextRequest('http://x/', { method: 'POST', body: JSON.stringify({ procedure: 'civil.birth', fields: { childGiven: 'Amara', childFamily: 'Okafor', sex: 'female', birthDate: '2026-09-01', region: 'North', motherGiven: 'Ngozi', motherFamily: 'Okafor' } }) }));
    expect(r.status).toBe(201);
    caseId = (await r.json()).application.id;
    expect(getCase(caseId)).toMatchObject({ source: 'citizen', stage: 'submitted', package: { key: 'civil.birth', version: 2 } });
  });

  it('2. a traceable application, with the required evidence checked', async () => {
    // A restricted case: a supervisor assigns it before an officer can work it.
    expect(await act(caseId, { action: 'check' }, registrar('clerk'))).toMatchObject({ error: expect.stringMatching(/restricted/) });
    expect(assign(caseId, { id: 'clerk', name: 'Registrar clerk' }, registrar('chief', 'signatory'))).toMatchObject({ assignee: { id: 'clerk' } });
    await act(caseId, { action: 'check' }, registrar('clerk'));
    expect(await act(caseId, { action: 'complete' }, registrar('clerk'))).toMatchObject({ error: expect.stringMatching(/Birth notification/) });
    const d = addDocument({ class: 'birth-notification', title: 'Notification from North District Hospital', institution: CIVIL, belongsTo: { kind: 'case', id: caseId }, bytes: new Uint8Array(Buffer.from('%PDF-1.7\nnotification\n%%EOF')) }, 'Registrar clerk') as { id: string };
    attach(caseId, d.id, registrar('clerk'));
    expect(await act(caseId, { action: 'complete' }, registrar('clerk'))).toMatchObject({ case: { stage: 'verification' } });
    expect(await act(caseId, { action: 'verify' }, registrar('clerk'))).toMatchObject({ case: { stage: 'pending-approval' } });
  });

  it('3-4. one official proposes, a second approves, citing the exact law in force', async () => {
    expect(await act(caseId, { action: 'register', reason: 'Notification verified against the facility.' }, registrar('r1', 'signatory'))).toMatchObject({ pending: true });
    const done = await act(caseId, { action: 'register' }, registrar('r2', 'signatory'));
    if ('error' in done) throw new Error(done.error);
    const decision = getDecision(done.decision!.id)!;
    expect(decision.content.citations).toEqual([expect.objectContaining({ instrument: law.instrument, eId: 'sec_12', version: law.version, digest: law.digest })]);
    expect(decision.content.officials.map(o => [o.role, o.name])).toEqual([['decided', 'Registrar r1'], ['confirmed', 'Registrar r2']]);
  });

  it('5. the registry issues a signed certificate and records the decision', async () => {
    const issued = await act(caseId, { action: 'issue' }, registrar('clerk'));
    if ('error' in issued) throw new Error(issued.error);
    const decision = getDecision(getCase(caseId)!.decisions[0]!)!;
    expect(verifyDecision(decision)).toEqual({ ok: true });
    expect(getEvent('BR-2026-000001')).toMatchObject({ decision: decision.id });
    const code = certificatesFor([decision.id])[0]!.code;
    expect(checkCode(code)).toMatchObject({ status: 'valid', sealOk: true });
  });

  it('6. a permitted identity service receives only what it needs', async () => {
    // Approved by two officials for this service and this purpose only.
    const reg = registerIntegration({ kind: 'integration', name: `National identity authority ${Date.now()}`, ownerOrg: 'National identity authority', contact: 'ops@example.gov', scopes: ['service:person.verify'] });
    if ('error' in reg) throw new Error(reg.error);
    const ok = approveIntegration(reg.id, { purposes: { 'person.verify': ['enrolment-for-a-national-identity-card'] } });
    if ('error' in ok) throw new Error(ok.error);
    const r = await callService({ kind: 'integration', id: reg.id, name: 'National identity authority' }, 'person.verify', { registration: 'BR-2026-000001', family: 'Okafor', birthDate: '2026-09-01' }, 'Enrolment for a national identity card');
    expect(r.data).toEqual({ match: 'yes', status: 'alive' });
    expect(verifyReceipt(r.receipt)).toBe(true);
  });

  it('7. the event reaches the oversight layer, without names', () => {
    const e = recentEvents(500).find(x => x.type === 'org.civicos.civil.birth.register');
    expect(e).toBeTruthy();
    expect(JSON.stringify(e)).not.toMatch(/Amara|Okafor|Ngozi/);
  });

  it('8. the dashboard count is a timestamped record that reconciles with the register', async () => {
    expect(await publishCivilCounts('Registrar general')).toMatchObject({ published: true });
    const north = regionEntities().find(r => r.name === 'North')!;
    const o = stateAsOf({ metric: 'births.registered', entityId: north.id })[0]!;
    expect(o).toMatchObject({ value: 1, method: 'administrative-count', validFrom: '2026-09-01' });
    expect(o.records?.sha256).toBe(createHash('sha256').update(getEvent('BR-2026-000001')!.id, 'utf8').digest('hex'));
    expect(nationalTotal('births.registered')?.value ?? null).toBeNull(); // South has not reported: never a national figure from part of the nation
  });

  it('9. an auditor reconstructs the whole sequence, and every new store is kept by backups', () => {
    const ref = getCase(caseId)!.ref;
    const steps = listAudit().filter(e => e.resource === `Case:${ref}`).map(e => e.action);
    expect(steps).toEqual(expect.arrayContaining(['case.open', 'case.assign', 'case.stage', 'case.attach', 'case.propose', 'case.decide']));
    expect(verifyAuditChain().ok).toBe(true);
    for (const k of ['__civicosLaw', '__civicosCasePackages', '__civicosCases', '__civicosDocuments', '__civicosDecisions', '__civicosCertificates', '__civicosCivil']) expect(liveKeys(), k).toContain(k);
  });
});
