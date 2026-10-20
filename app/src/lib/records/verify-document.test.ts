import { describe, it, expect, afterEach, vi } from 'vitest';
import { verifyDocument, signDocument } from '@/lib/data/store';
import { recordDecision, verifyDecision } from './decisions';
import { issueCertificate } from './certificates';
import { verifyBytes } from '@/lib/crypto/signing-key';
import { canonicalJson } from '@/lib/data/store/shared';

describe('document checks use the certificate register; sample codes only outside production', () => {
  afterEach(() => vi.unstubAllEnvs());

  it('answers a real certificate code from the register', async () => {
    const d = await recordDecision({ subject: { kind: 'case', id: 'c9' }, institution: { id: 'edu', name: 'Accreditation Council' }, decision: 'grant', reasons: 'Meets every standard.', citations: [], officials: [{ role: 'decided', name: 'A' }], at: '2026-10-20T10:00:00Z' });
    if ('error' in d) throw new Error(d.error);
    expect(verifyDecision(d).ok).toBe(true);
    const c = issueCertificate({ kind: 'accreditation', title: 'Accreditation', decision: d.id, publicFacts: {} }, 'A') as { code: string };
    expect(verifyDocument(c.code)).toMatchObject({ valid: true, issuer: 'Accreditation Council', credentialType: 'Accreditation', status: 'valid', sealOk: true });
  });

  it('accepts sample codes only in demonstration and training installations', () => {
    expect(verifyDocument('VC-1')).toMatchObject({ valid: true, sample: true });
    vi.stubEnv('CIVICOS_MODE', 'production');
    expect(verifyDocument('VC-1')).toMatchObject({ valid: false });
    expect(verifyDocument('REV-1')).not.toHaveProperty('revoked');
  });

  it('signs a document reference with a seal anyone can check', async () => {
    const r = await signDocument({ documentId: 'DOC-1', documentTitle: 'Inspection report', signerName: 'Inspector A' });
    expect(r.hash).toHaveLength(64);
    const material = canonicalJson({ type: 'civicos.document-signature', v: 1, id: r.id, documentId: 'DOC-1', documentTitle: 'Inspection report', signerName: 'Inspector A', signedAt: r.signedAt });
    expect(verifyBytes(r.seal!.publicKeyPem, material, r.seal!.signature)).toBe(true);
  });
});
