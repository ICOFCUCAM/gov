import { describe, it, expect } from 'vitest';
import { TREASURY_WORKFLOWS, DISBURSEMENT_AUTHORISATION, RESERVE_DRAWDOWN } from './treasury-workflows';

describe('treasury workflows', () => {
  it('declares at least two executable workflows', () => {
    expect(TREASURY_WORKFLOWS.length).toBeGreaterThanOrEqual(2);
  });

  it('every step carries a treasury.* audit tag', () => {
    for (const w of TREASURY_WORKFLOWS) {
      for (const s of w.steps) {
        expect(s.auditTag.startsWith('treasury.')).toBe(true);
      }
    }
  });

  it('disbursement requires accounting-officer authorisation and treasurer release', () => {
    const auth = DISBURSEMENT_AUTHORISATION.steps.find(s => s.kind === 'authorisation');
    const release = DISBURSEMENT_AUTHORISATION.steps.find(s => s.kind === 'release');
    expect(auth?.role).toBe('accounting-officer');
    expect(auth?.requiresSignature).toBe(true);
    expect(release?.role).toBe('treasurer');
    expect(release?.requiresSignature).toBe(true);
  });

  it('reserve drawdown requires central-bank counter-signature', () => {
    const cb = RESERVE_DRAWDOWN.steps.find(s => s.id === 'central-bank-signoff');
    expect(cb?.role).toBe('central-bank');
    expect(cb?.requiresSignature).toBe(true);
  });

  it('every workflow emits to at least one downstream ministry', () => {
    for (const w of TREASURY_WORKFLOWS) {
      expect(w.emits.length).toBeGreaterThan(0);
      expect(w.blueprintCitation.length).toBeGreaterThan(0);
    }
  });
});
