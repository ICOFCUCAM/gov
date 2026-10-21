// Tests only: bring a key into the seal key register as approved, for tests
// about something else that seal decisions in a production installation. It
// runs the register's own path (proposed citing a law, approved by two other
// officials) with declared names, as an installation without enforced
// sign-in would; the rules themselves (who may approve, in production) are
// tested in seal-register.test.ts. Never imported by application code
// (seal-register.test.ts checks).
import { createPrivateKey, createPublicKey } from 'node:crypto';
import { approveSealKey, proposeSealKey, listSealKeys, fingerprintOf } from './seal-register';
import { recordVersion, confirmVersion } from '@/lib/law/register';

/** Register `privateKeyPem`'s public half for decisions, approved. */
export function approvedSealKeyFixture(privateKeyPem: string): void {
  const pub = createPublicKey(createPrivateKey(privateKeyPem)).export({ type: 'spki', format: 'pem' }).toString();
  const fp = fingerprintOf(pub)?.fingerprint;
  if (listSealKeys('decision').some(k => k.fingerprint === fp && (k.status === 'approved' || k.status === 'active'))) return;
  const mode = process.env.CIVICOS_MODE;
  process.env.CIVICOS_MODE = 'demo';
  try {
    const v = recordVersion({ instrument: { title: 'Seal Keys Fixture Act', type: 'act', jurisdiction: 'X', year: 2001, number: 'SK', issuingAuthority: 'Parliament' }, dates: { inForce: '2001-01-01' }, provisions: [{ eId: 'sec_1', num: '1', text: 'The seal keys authority approves the seal keys.' }] }, 'Fixture L1', 'fx-l1');
    if ('error' in v) throw new Error(v.error);
    confirmVersion(v.instrument.id, v.version.id, 'Fixture L2', 'fx-l2');
    const k = proposeSealKey({ purpose: 'decision', publicKeyPem: pub, legalBasis: [{ instrument: v.instrument.id, eId: 'sec_1' }] }, { by: 'Fixture proposer' });
    if ('error' in k) throw new Error(k.error);
    for (const by of ['Fixture approver A', 'Fixture approver B']) {
      const a = approveSealKey(k.id, {}, { by });
      if ('error' in a) throw new Error(a.error);
    }
  } finally {
    if (mode === undefined) delete process.env.CIVICOS_MODE; else process.env.CIVICOS_MODE = mode;
  }
}
