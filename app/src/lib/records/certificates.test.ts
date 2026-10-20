import { describe, it, expect, beforeEach } from 'vitest';
import { issueCertificate, revokeCertificate, checkCode, resetCertificates, normaliseCode, printableCode, CODE_LENGTH } from './certificates';
import { recordDecision, resetDecisions } from './decisions';

async function decision() {
  const d = await recordDecision({ subject: { kind: 'case', id: 'c1' }, institution: { id: 'civil', name: 'Civil Registry' }, decision: 'register', reasons: 'Verified.', citations: [], officials: [{ role: 'decided', name: 'B' }], at: '2026-10-20T10:00:00Z' });
  if ('error' in d) throw new Error(d.error);
  return d.id;
}

describe('certificates', () => {
  beforeEach(() => { resetCertificates(); resetDecisions(); });

  it('issues from a sealed decision and shows only its own statements to anyone with the code', async () => {
    const c = issueCertificate({ kind: 'birth-registration', title: 'Certificate of birth registration', decision: await decision(), publicFacts: { 'Registration number': 'BR-2026-000001' } }, 'B');
    if ('error' in c) throw new Error(c.error);
    expect(c.code).toHaveLength(CODE_LENGTH);
    expect(checkCode(printableCode(c.code).toLowerCase())).toEqual({ kind: 'birth-registration', title: 'Certificate of birth registration', institution: 'Civil Registry', issuedAt: c.issuedAt, status: 'valid', sealOk: true, publicFacts: { 'Registration number': 'BR-2026-000001' } });
    expect(checkCode('AAAA-BBBB-CCCC')).toBeNull();
    expect(issueCertificate({ kind: 'x', title: 't', decision: 'none', publicFacts: {} }, 'B')).toHaveProperty('error');
  });

  it('marks a reissued certificate superseded and a revoked one revoked', async () => {
    const d = await decision();
    const a = issueCertificate({ kind: 'licence', title: 'Licence', decision: d, publicFacts: {} }, 'B') as { id: string; code: string };
    const b = issueCertificate({ kind: 'licence', title: 'Licence', decision: d, publicFacts: {}, reissueOf: a.id }, 'B') as { id: string; code: string };
    expect(checkCode(a.code)?.status).toBe('superseded');
    expect(revokeCertificate(b.id, '', 'B')).toHaveProperty('error');
    revokeCertificate(b.id, 'Obtained with false documents', 'B');
    expect(checkCode(b.code)?.status).toBe('revoked');
    expect(normaliseCode(' ab12-cd34 ')).toBe('AB12CD34');
  });
});
