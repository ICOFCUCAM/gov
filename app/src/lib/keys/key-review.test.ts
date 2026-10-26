// Independent review of key-management and privileged operations (plan I9;
// acceptance P5-12, P6-07): the key operations the platform already records
// (trusting another installation's federation key, trusting a publisher key,
// key custody's own registrations and rotations …) are read afterwards by a
// reviewer outside the operators, an auditor or an official of the
// data-protection authority, never by an administrator by role and never by
// a person who took one of the operations; the review covers each entry by
// its sequence and hash with a digest, says whether the chain verified,
// records an outcome (concerns in words, a prompt and never a conclusion),
// is itself in the audit chain and its reading in the access log.
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { generateKeyPairSync } from 'node:crypto';
import { listMinistries, recordAudit, listAudit, setSovereign } from '@/lib/data/store';
import { proposePeerKey, confirmPeerKey, resetFederationEvents } from '@/lib/federation/events';
import { resetUpdates, enrolNation } from '@/lib/data/updates';
import { resetReleaseTrust, proposePublisherKey, confirmPublisherKey } from '@/lib/data/release-trust';
import { listAccess, resetAccessLog } from '@/lib/records/access-log';
import { apiPermission, mutationRule, type Scope } from '@/lib/auth/roles';
import { resetKeyReviews, recordKeyReview, keyOperations, keyReviewStatus, keyReviews, reviewerRefusal, KEY_OPERATION, REVIEW_ACTION } from './key-review';
import { KEPT_ON_RESTORE } from '@/lib/backup/state';

const pem = () => generateKeyPairSync('ed25519').publicKey.export({ type: 'spki', format: 'pem' }).toString();
let DPA = '', OTHER = '';
const reviewer = (id: string, role: Scope['role'], institution?: string) => ({ by: `Official ${id}`, byId: id, scope: { role, ...(institution ? { institution } : {}) } as Scope, dataProtection: DPA });

/** Two key operations by two administrators: trusting another installation's federation key, and a publisher key for software. */
function operations() {
  const p = proposePeerKey({ institution: OTHER, publicKeyPem: pem() }, { by: 'Official a1', byId: 'a1' });
  if ('error' in p) throw new Error(p.error);
  confirmPeerKey(p.id, { by: 'Official a2', byId: 'a2' });
  const n = enrolNation({ name: 'Island registry', iso3: 'XAA', deliveryMode: 'air-gapped', installedVersion: '1.4.0', by: 'Publisher' });
  if ('error' in n) throw new Error(n.error);
  const k = proposePublisherKey(n.id, { publicKeyPem: pem(), checkedWith: 'Fingerprint read back on a call' }, { by: 'Official a1', byId: 'a1' });
  if ('error' in k) throw new Error(k.error);
  confirmPublisherKey(n.id, k.id, { by: 'Official a2', byId: 'a2' });
}

describe('independent review of key operations (P5-12)', () => {
  beforeEach(() => {
    resetKeyReviews(); resetFederationEvents(); resetUpdates(); resetReleaseTrust(); resetAccessLog();
    [DPA, OTHER] = listMinistries().slice(0, 2).map(m => m.id) as [string, string];
    setSovereign({ deployment: { authorities: { dataProtection: DPA } } }, 'Administrator');
  });
  afterEach(() => { vi.unstubAllEnvs(); });

  it('is recorded only by a reviewer outside the operators: an auditor or the data-protection authority, never one who took an operation', () => {
    operations();
    const ops = keyOperations();
    expect(ops.map(o => o.action)).toEqual(expect.arrayContaining(['federation.peer.propose', 'federation.peer.approve', 'update.publisher-key.propose', 'update.publisher-key.trust']));
    expect(keyReviewStatus()).toMatchObject({ unreviewed: ops.length });
    // Administrators and officers who are not the data-protection authority's: refused.
    expect(reviewerRefusal(reviewer('g1', 'administrator'))).toMatch(/never by the operators/);
    expect(recordKeyReview({ outcome: 'no-concerns' }, reviewer('o1', 'signatory', OTHER))).toMatchObject({ status: 403 });
    // An auditor who took one of the operations himself: refused, comparing people.
    expect(recordKeyReview({ outcome: 'no-concerns' }, { ...reviewer('a1', 'auditor'), by: 'Official a1', byId: 'a1' })).toMatchObject({ status: 403, error: expect.stringMatching(/took operation \d+ .* yourself/) });
    // Concerns are said in words.
    expect(recordKeyReview({ outcome: 'concerns', findings: 'odd' }, reviewer('au1', 'auditor'))).toMatchObject({ error: expect.stringMatching(/Say what the concerns are/) });
    const r = recordKeyReview({ outcome: 'concerns', findings: 'The publisher key was trusted the same day it was proposed; ask how its fingerprint was checked' }, reviewer('au1', 'auditor'));
    if ('error' in r) throw new Error(r.error);
    expect(r).toMatchObject({ reviewer: { by: 'Official au1', capacity: 'auditor' }, outcome: 'concerns', chain: { ok: true }, digest: expect.stringMatching(/^[0-9a-f]{64}$/) });
    expect(r.entries.map(e => e.seq)).toEqual(ops.map(o => o.seq));
    expect(keyOperations().every(o => o.review === r.id)).toBe(true);
    // The review is in the audit chain (not itself a key operation) and its reading in the access log.
    expect(listAudit()[0]).toMatchObject({ action: REVIEW_ACTION, actor: 'Official au1', resource: `KeyReview:${r.id}` });
    expect(KEY_OPERATION.test(REVIEW_ACTION)).toBe(false);
    expect(listAccess({ register: 'audit' })).toEqual([expect.objectContaining({ action: 'view', by: expect.objectContaining({ name: 'Official au1' }), purpose: expect.stringMatching(/Independent review/) })]);
    // Nothing more to review until the next key operation; then only that one.
    expect(recordKeyReview({ outcome: 'no-concerns' }, reviewer('au1', 'auditor'))).toMatchObject({ status: 409 });
    recordAudit('system (key custody)', 'keys.signing.rotate', 'Key:decision/ed25519:abc', 'ok', 'decision signing key rotated');
    expect(keyReviewStatus()).toMatchObject({ unreviewed: 1, lastReview: { id: r.id, outcome: 'concerns' } });
    const dpa = recordKeyReview({ outcome: 'no-concerns' }, reviewer('d1', 'officer', DPA));
    if ('error' in dpa) throw new Error(dpa.error);
    expect(dpa).toMatchObject({ reviewer: { capacity: 'data-protection', institution: DPA }, entries: [expect.objectContaining({ action: 'keys.signing.rotate' })] });
    expect(keyReviews().map(x => x.id)).toEqual([dpa.id, r.id]);
  });

  it('records that the chain did not verify, and refuses an unsigned reviewer in production', () => {
    operations();
    const chain = (globalThis as unknown as { __civicos: { audit: { detail?: string }[] } }).__civicos.audit;
    chain[0]!.detail = 'changed after the fact';
    const r = recordKeyReview({ outcome: 'concerns', findings: 'The audit chain does not verify at the operations reviewed' }, reviewer('au1', 'auditor'));
    if ('error' in r) throw new Error(r.error);
    expect(r.chain.ok).toBe(false);
    vi.stubEnv('CIVICOS_MODE', 'production');
    expect(recordKeyReview({ outcome: 'no-concerns' }, { by: 'Someone', scope: null, dataProtection: DPA })).toMatchObject({ status: 403, error: expect.stringMatching(/Sign in/) });
  });

  it('is reachable by an auditor through the API rules, and kept as it stands by a restore', () => {
    expect(mutationRule('/api/audit/key-reviews')).toBe('any-role');
    expect(apiPermission({ role: 'auditor' }, 'POST', '/api/audit/key-reviews')).toBeNull();
    expect(KEPT_ON_RESTORE).toContain('__civicosKeyReviews');
  });
});
