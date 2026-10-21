// The seal key register (owner's concern, 21 October 2026): replacing the
// seal key never invalidates earlier certificates; each key is a batch with
// its own validity; adopting a key is approved by the authority the nation's
// law names (at least two officials), never one person; a compromise flags
// only what was sealed after it; nothing ships approved.
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { generateKeyPairSync, createPrivateKey, createPublicKey } from 'node:crypto';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import {
  proposeSealKey, approveSealKey, withdrawSealKey, reportCompromise, confirmCompromise, withdrawCompromise, reviewCompromise,
  proposeSealKeyRules, confirmSealKeyRules, sealKeyRules, listSealKeys, getSealKey, resetSealKeys, trustList, waitingSealKeys,
  sealKeyRefusal, DEFAULT_SEAL_KEY_RULES, type SealActor,
} from './seal-register';
import { recordDecision, verifyDecision, sealReport, getDecision, resetDecisions, type DecisionContent } from '@/lib/records/decisions';
import { issueCertificate, checkCode, resetCertificates } from '@/lib/records/certificates';
import { recordVersion, confirmVersion, resetLaw } from '@/lib/law/register';
import { setSovereign, listMinistries, getSovereign } from '@/lib/data/store';
import { AUTHORITIES } from '@/lib/nation/deployment';
import { REGISTER_OWNERS } from '@/lib/data/register-owners';
import { KEPT_ON_RESTORE } from '@/lib/backup/state';
import { currentParts } from '@/lib/constitution/parts';

const pemPair = () => {
  const priv = generateKeyPairSync('ed25519').privateKey.export({ type: 'pkcs8', format: 'pem' }).toString();
  return { priv, pub: createPublicKey(createPrivateKey(priv)).export({ type: 'spki', format: 'pem' }).toString() };
};
const A = pemPair(), B = pemPair(), C = pemPair();

let TS = '', OTHER = '', LAW = '', ACT = '', ENACTED = '';
const signatory = (id: string, institution = TS): SealActor => ({ by: `Signer ${id}`, byId: `local:${id}`, scope: { role: 'signatory', institution } });
const admin = (id: string): SealActor => ({ by: `Admin ${id}`, byId: `local:${id}`, scope: { role: 'administrator' } });
const content = (x: Partial<DecisionContent> = {}): DecisionContent => ({
  subject: { kind: 'case', id: 'c1', ref: 'CIV-1' }, institution: { id: 'civil', name: 'Civil Registry' },
  decision: 'register', reasons: 'All evidence present.', citations: [], officials: [{ role: 'decided', name: 'B. Registrar' }], at: new Date().toISOString(), ...x,
});
const sealed = async (x: Partial<DecisionContent> = {}) => { const d = await recordDecision(content(x)); if ('error' in d) throw new Error(d.error); return d; };
const law = (title: string, source?: 'legislature') => {
  const v = recordVersion({ instrument: { title, type: 'act', jurisdiction: 'X', year: 2020, number: title.slice(0, 3), issuingAuthority: 'Parliament' }, dates: { inForce: '2020-01-01' }, provisions: [{ eId: 'sec_1', num: '1', text: `${title}: the seal keys authority approves the state's seal keys.` }],
    ...(source ? { source: { kind: 'legislature', legislature: 'parl', bill: 'b1', billNumber: 'Bill 1', billVersion: 1, textDigest: 'a'.repeat(64), votes: [], publication: { date: '2020-01-01', reference: 'Gazette 1' }, certification: { digest: 'b'.repeat(64), by: 'Clerk', at: '2020-01-01T00:00:00Z' }, procedureVersion: 1 } } : {}) }, 'L1', 'l1');
  if ('error' in v) throw new Error(v.error);
  confirmVersion(v.instrument.id, v.version.id, 'L2', 'l2');
  return v.instrument.id;
};
const basis = () => [{ instrument: LAW, eId: 'sec_1' }];
/** Propose the key and approve it with two signatories of the authority; `present` is the key the provider presents now. */
const adopt = (pub: string, present = true) => {
  const k = proposeSealKey({ publicKeyPem: pub, legalBasis: basis() }, admin('p'));
  if ('error' in k) throw new Error(k.error);
  approveSealKey(k.id, {}, signatory('s1'), present ? pub : undefined);
  const r = approveSealKey(k.id, {}, signatory('s2'), present ? pub : undefined);
  if ('error' in r) throw new Error(r.error);
  return r;
};

describe('seal key register', () => {
  beforeEach(() => {
    for (const r of [resetSealKeys, resetDecisions, resetCertificates, resetLaw]) r();
    [TS, OTHER] = listMinistries().slice(0, 2).map(m => m.id) as [string, string];
    setSovereign({ deployment: { ...getSovereign().deployment, authorities: { ...getSovereign().deployment?.authorities, trustServices: TS } } }, 'Administrator');
    LAW = law('Trust Services Act');
    ACT = law('Ordinary Act');
    ENACTED = law('Seal Keys Resolution', 'legislature');
  });
  afterEach(() => vi.unstubAllEnvs());

  it('ships nothing approved: an empty register, the platform defaults not adopted, the authority slot optional and empty', () => {
    resetSealKeys();
    expect(listSealKeys()).toEqual([]);
    expect(sealKeyRules()).toMatchObject({ ...DEFAULT_SEAL_KEY_RULES, adopted: false, legislatureResolution: false });
    expect(trustList().keys).toEqual([]);
    expect(AUTHORITIES.find(a => a.key === 'trustServices')).toMatchObject({ optional: true });
    // The register has an owner and a legal authority slot, and a restore never brings back trust in a revoked key.
    expect(REGISTER_OWNERS.find(r => r.owner.where === 'platform' && r.owner.keys.includes('__civicosSealKeys'))?.legal).toEqual({ kind: 'authority', key: 'trustServices' });
    expect(KEPT_ON_RESTORE).toContain('__civicosSealKeys');
  });

  it('in production refuses to seal with a key not in the register, then seals once two officials of the named authority approve it', async () => {
    vi.stubEnv('CIVICOS_MODE', 'production');
    vi.stubEnv('CIVICOS_DECISION_KEY', A.priv);
    expect(await recordDecision(content())).toMatchObject({ error: expect.stringMatching(/not in the seal key register.*\/gov\/configuration\/seal-keys/) });
    const k = proposeSealKey({ legalBasis: basis() }, admin('p'), A.pub);
    if ('error' in k) throw new Error(k.error);
    expect(k).toMatchObject({ status: 'proposed', purpose: 'decision', fingerprint: expect.stringMatching(/^[0-9a-f]{64}$/) });
    expect(await recordDecision(content())).toMatchObject({ error: expect.stringMatching(/waiting for approval \(0 of 2\)/) });
    // The proposer cannot approve; an officer, another institution and a whole-government administrator cannot either.
    expect(approveSealKey(k.id, {}, { ...signatory('p'), by: 'Admin p' }, A.pub)).toMatchObject({ error: expect.stringMatching(/proposer cannot approve/) });
    expect(approveSealKey(k.id, {}, { by: 'O', byId: 'local:o', scope: { role: 'officer', institution: TS } })).toMatchObject({ error: expect.stringMatching(/Only an official who can sign at the seal keys authority/) });
    expect(approveSealKey(k.id, {}, signatory('x', OTHER))).toMatchObject({ error: expect.stringMatching(/Only an official who can sign/) });
    expect(approveSealKey(k.id, {}, admin('z'))).toMatchObject({ error: expect.stringMatching(/Only an official who can sign/) });
    expect(approveSealKey(k.id, {}, { by: 'Declared' })).toMatchObject({ error: expect.stringMatching(/Sign in/) });
    expect(approveSealKey(k.id, {}, signatory('s1'), A.pub)).toMatchObject({ status: 'proposed', approvals: [expect.objectContaining({ by: 'Signer s1' })] });
    // The same person twice is one approval.
    expect(approveSealKey(k.id, {}, signatory('s1'), A.pub)).toMatchObject({ error: expect.stringMatching(/different person/) });
    const done = approveSealKey(k.id, {}, signatory('s2'), A.pub);
    expect(done).toMatchObject({ status: 'active', validFrom: expect.any(String), rules: { institution: TS, approvers: 2, legislatureResolution: false } });
    const d = await sealed();
    expect(verifyDecision(d)).toEqual({ ok: true });
    expect(sealReport(d).key).toMatchObject({ state: 'trusted', trusted: true, note: expect.stringMatching(/approved under Trust Services Act 1, valid from/) });
  });

  it('refuses approval while the nation names no seal keys authority (never assumed)', () => {
    vi.stubEnv('CIVICOS_MODE', 'production');
    setSovereign({ deployment: { ...getSovereign().deployment, authorities: { ...getSovereign().deployment?.authorities, trustServices: '' } } }, 'Administrator');
    const k = proposeSealKey({ publicKeyPem: A.pub, legalBasis: basis() }, admin('p'));
    if ('error' in k) throw new Error(k.error);
    expect(approveSealKey(k.id, {}, signatory('s1'))).toMatchObject({ error: expect.stringMatching(/Name the seal keys authority first/) });
  });

  it('rotation never invalidates earlier certificates: the old key retires (validity ends at activation) and verifies forever', async () => {
    vi.stubEnv('CIVICOS_MODE', 'production');
    vi.stubEnv('CIVICOS_DECISION_KEY', A.priv);
    adopt(A.pub);
    const old = await sealed();
    const cert = issueCertificate({ kind: 'birth-registration', title: 'Birth', decision: old.id, publicFacts: {} }, 'Registrar') as { code: string };
    // B is approved before it is presented; it becomes active at its first seal, retiring A.
    const b = adopt(B.pub, false);
    expect(b.status).toBe('approved');
    vi.stubEnv('CIVICOS_DECISION_KEY', B.priv);
    const fresh = await sealed();
    const a = listSealKeys().find(k => k.keyId === old.seal.keyId)!;
    expect(a).toMatchObject({ status: 'retired', validUntil: expect.any(String), retired: { reason: expect.stringMatching(/Replaced by/) } });
    expect(getSealKey(b.id)).toMatchObject({ status: 'active', validFrom: a.validUntil });
    expect(verifyDecision(getDecision(old.id)!)).toEqual({ ok: true });
    expect(verifyDecision(fresh)).toEqual({ ok: true });
    expect(checkCode(cert.code)).toMatchObject({ status: 'valid', sealOk: true, seal: { state: 'trusted', keyId: old.seal.keyId, validUntil: a.validUntil } });
    // A retired key seals nothing.
    vi.stubEnv('CIVICOS_DECISION_KEY', A.priv);
    expect(await recordDecision(content())).toMatchObject({ error: expect.stringMatching(/retired.*seals nothing/) });
  });

  it('the legislature option (shipped off) requires an enacted instrument of the legislature, cited from the laws register', () => {
    // The rules change through policy-change.ts: an administrator proposes citing the law, a different official confirms.
    const p = proposeSealKeyRules({ legislatureResolution: true, approvers: 3, legalBasis: basis() }, admin('r1'));
    expect(p).not.toHaveProperty('error');
    expect(confirmSealKeyRules(admin('r1'))).toMatchObject({ error: expect.stringMatching(/second, different official/) });
    expect(confirmSealKeyRules(signatory('s9'))).toMatchObject({ confirmed: { by: 'Signer s9' } });
    expect(proposeSealKeyRules({ approvers: 1, legalBasis: basis() }, admin('r1'))).toMatchObject({ error: expect.stringMatching(/from 2/) });
    expect(sealKeyRules()).toMatchObject({ adopted: true, approvers: 3, legislatureResolution: true });
    // Once adopted the rules are a part of the constitutional profile.
    expect(currentParts().map(x => x.key)).toContain('sealKeys');
    const k = proposeSealKey({ publicKeyPem: A.pub, legalBasis: basis() }, admin('p'));
    if ('error' in k) throw new Error(k.error);
    approveSealKey(k.id, {}, signatory('s1'));
    approveSealKey(k.id, {}, signatory('s2'));
    expect(approveSealKey(k.id, {}, signatory('s3'))).toMatchObject({ error: expect.stringMatching(/enacted instrument of the legislature/) });
    expect(approveSealKey(k.id, { resolution: { instrument: ACT, eId: 'sec_1' } }, signatory('s3'))).toMatchObject({ error: expect.stringMatching(/enacted by the legislature/) });
    expect(approveSealKey(k.id, { resolution: { instrument: ENACTED, eId: 'sec_1' } }, signatory('s3'))).toMatchObject({ status: 'approved', resolution: { instrument: ENACTED }, rules: { approvers: 3, legislatureResolution: true } });
  });

  it('a constitutional part only once adopted: existing profile digests are unchanged until then', () => {
    expect(currentParts().map(x => x.key)).not.toContain('sealKeys');
  });

  it('compromise: fast revocation by two officials flags only decisions sealed after the compromise time; nothing is changed or deleted', async () => {
    vi.stubEnv('CIVICOS_MODE', 'production');
    vi.stubEnv('CIVICOS_DECISION_KEY', A.priv);
    const a = adopt(A.pub);
    const before = await sealed();
    const from = new Date(Date.now() + 5).toISOString();
    await new Promise(r => setTimeout(r, 20));
    const after = await sealed();
    expect(reportCompromise(a.id, { compromisedFrom: from }, admin('r'))).toMatchObject({ error: expect.stringMatching(/Say what happened/) });
    expect(reportCompromise(a.id, { compromisedFrom: from, reason: 'Key file found on a shared drive' }, admin('r'))).toMatchObject({ compromise: { compromisedFrom: from } });
    // The key stops sealing at once; one person's report does not discredit anything yet.
    expect(await recordDecision(content())).toMatchObject({ error: expect.stringMatching(/reported compromised/) });
    expect(verifyDecision(getDecision(after.id)!)).toEqual({ ok: true });
    expect(waitingSealKeys().some(w => /reported compromised/.test(w.what))).toBe(true);
    expect(confirmCompromise(a.id, admin('r'))).toMatchObject({ error: expect.stringMatching(/second, different official/) });
    const r = confirmCompromise(a.id, signatory('s5'));
    expect(r).toMatchObject({ status: 'revoked', compromise: { confirmed: { by: 'Signer s5' }, review: { dueBy: expect.any(String) } } });
    expect(withdrawCompromise(a.id, 'mistake', admin('r'))).toMatchObject({ error: expect.stringMatching(/never withdrawn/) });
    expect(verifyDecision(getDecision(before.id)!)).toEqual({ ok: true });
    expect(verifyDecision(getDecision(after.id)!)).toMatchObject({ ok: false, problem: expect.stringMatching(/Sealed after the key was reported compromised.*not trusted/) });
    expect(getDecision(after.id)!.sha256).toBe(after.sha256);
    // The later review by the named authority can only move the compromise earlier.
    expect(reviewCompromise(a.id, { outcome: 'earlier', compromisedFrom: new Date(Date.now() + 60_000).toISOString(), note: 'x' }, signatory('s6'))).toMatchObject({ error: expect.stringMatching(/only earlier/) });
    expect(reviewCompromise(a.id, { outcome: 'upheld', note: 'Confirmed by forensic review' }, admin('z'))).toMatchObject({ error: expect.stringMatching(/Only an official who can sign/) });
    expect(reviewCompromise(a.id, { outcome: 'upheld', note: 'Confirmed by forensic review' }, signatory('s6'))).toMatchObject({ compromise: { review: { outcome: 'upheld', by: 'Signer s6' } } });
    // A revoked key can never be proposed again.
    expect(proposeSealKey({ publicKeyPem: A.pub, legalBasis: basis() }, admin('p'))).toMatchObject({ error: expect.stringMatching(/never be approved again/) });
    expect(trustList().keys[0]).toMatchObject({ status: 'revoked', compromisedFrom: from });
  });

  it('decisions sealed before the register verify as before and say so; historic keys are registered by the same two-person approval', async () => {
    // Sealed before the register existed (an installation upgraded to this version).
    vi.stubEnv('CIVICOS_DECISION_KEY', C.priv);
    const other = await sealed();
    vi.stubEnv('CIVICOS_DECISION_KEY', '');
    const old = await sealed({ at: '2026-01-01T00:00:00.000Z' });
    resetSealKeys();
    expect(sealReport(old)).toMatchObject({ ok: true, key: { state: 'before-registration', note: 'Key not in the register (sealed before key registration)' } });
    const h = proposeSealKey({ publicKeyPem: old.seal.publicKeyPem, historic: true, legalBasis: basis() }, admin('p'));
    if ('error' in h) throw new Error(h.error);
    expect(h).toMatchObject({ historic: true, validFrom: old.seal.at, validUntil: old.seal.at });
    approveSealKey(h.id, {}, signatory('s1'));
    expect(approveSealKey(h.id, {}, signatory('s2'))).toMatchObject({ status: 'retired', historic: true });
    expect(sealReport(old).key).toMatchObject({ state: 'trusted', key: { historic: true } });
    // Once the register has started, a seal made later with a key it does not hold is not trusted.
    vi.stubEnv('CIVICOS_MODE', 'production');
    vi.stubEnv('CIVICOS_DECISION_KEY', B.priv);
    adopt(B.pub);
    expect(sealReport(other).key.state).toBe('before-registration');
    expect(sealReport({ ...other, seal: { ...other.seal, at: new Date(Date.now() + 1000).toISOString() } })).toMatchObject({ ok: false, key: { state: 'unregistered', trusted: false } });
  });

  it('an existing installation registers the key it already uses: approving it covers what it sealed before', async () => {
    vi.stubEnv('CIVICOS_DECISION_KEY', A.priv);
    const earlier = await sealed();
    resetSealKeys();
    vi.stubEnv('CIVICOS_MODE', 'production');
    const k = proposeSealKey({ legalBasis: basis() }, admin('p'), A.pub);
    if ('error' in k) throw new Error(k.error);
    expect(k.coversFrom).toBe(earlier.seal.at);
    approveSealKey(k.id, {}, signatory('s1'), A.pub);
    expect(approveSealKey(k.id, {}, signatory('s2'), A.pub)).toMatchObject({ status: 'active', validFrom: earlier.seal.at });
    expect(sealReport(earlier).key.state).toBe('trusted');
  });

  it('demonstration and training trust a new key automatically, marked as a sample; production never does', async () => {
    vi.stubEnv('CIVICOS_DECISION_KEY', C.priv);
    const d = await sealed();
    expect(listSealKeys()).toEqual([expect.objectContaining({ status: 'active', sample: true, approvals: [] })]);
    expect(sealReport(d).key).toMatchObject({ state: 'trusted', key: { sample: true }, note: expect.stringMatching(/sample key/) });
    resetSealKeys();
    vi.stubEnv('CIVICOS_MODE', 'production');
    expect(sealKeyRefusal('decision', C.pub)).toMatch(/not in the seal key register/);
    expect(listSealKeys()).toEqual([]);
  });

  it('a proposal is withdrawn and kept; every step is in the history', () => {
    const k = proposeSealKey({ publicKeyPem: A.pub, legalBasis: basis() }, admin('p'));
    if ('error' in k) throw new Error(k.error);
    expect(proposeSealKey({ publicKeyPem: A.pub, legalBasis: basis() }, admin('p'))).toMatchObject({ error: expect.stringMatching(/already in the register/) });
    expect(proposeSealKey({ publicKeyPem: B.pub, legalBasis: [] }, admin('p'))).toMatchObject({ error: expect.stringMatching(/Cite the legal basis/) });
    expect(withdrawSealKey(k.id, 'Wrong key', admin('p'))).toMatchObject({ status: 'withdrawn' });
    expect(getSealKey(k.id)!.history.map(h => h.step)).toEqual(['propose', 'withdraw']);
    expect(trustList().keys).toEqual([]);
  });

  it('the public trust list carries every key with fingerprint, purpose, status and validity, and no officials\' names', async () => {
    vi.stubEnv('CIVICOS_MODE', 'production');
    vi.stubEnv('CIVICOS_DECISION_KEY', A.priv);
    adopt(A.pub);
    adopt(B.pub, false);
    const list = trustList();
    expect(list).toMatchObject({ format: 'civicos.trust-list', version: 1 });
    expect(list.keys).toHaveLength(2);
    expect(list.keys[0]).toMatchObject({ purpose: 'decision', status: 'active', fingerprint: expect.stringMatching(/^[0-9a-f]{64}$/), validFrom: expect.any(String), validUntil: null, legalBasis: [expect.objectContaining({ instrument: LAW })] });
    expect(JSON.stringify(list)).not.toMatch(/Signer|Admin/);
    const { GET } = await import('@/app/api/trust/keys/route');
    const body = await (await GET()).json();
    expect(body.keys).toHaveLength(2);
  });

  it('the test fixture is never imported by application code', () => {
    const walk = (dir: string): string[] => readdirSync(dir).flatMap(f => { const p = join(dir, f); return statSync(p).isDirectory() ? walk(p) : [p]; });
    const users = walk(join(__dirname, '..', '..')).filter(f => /\.(ts|tsx)$/.test(f) && !/\.test\.ts$/.test(f) && !f.endsWith('seal-register.fixture.ts'))
      .filter(f => readFileSync(f, 'utf8').includes('seal-register.fixture'));
    expect(users).toEqual([]);
  });
});
