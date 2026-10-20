import { describe, it, expect } from 'vitest';
import { caseActRefusal, caseReadRefusal, STEP_UP_MINUTES, type CaseFacts, type CaseScope } from './roles';

const C = (x: Partial<CaseFacts> = {}): CaseFacts => ({ owner: 'civil', sensitivity: 'normal', ...x });
const S = (x: Partial<CaseScope>): CaseScope => ({ role: 'officer', institution: 'civil', id: 'u1', ...x });

describe('case rules (design §4)', () => {
  it('lets officials of the owning institution work a case, and nobody else', () => {
    expect(caseActRefusal(S({}), C())).toBeNull();
    expect(caseActRefusal(S({ institution: 'health' }), C())).toMatch(/institution responsible/);
    expect(caseActRefusal(S({ role: 'auditor' }), C())).toMatch(/Auditors/);
  });

  it('gives administrators no domain authority: whole-government and institutional administrators cannot decide', () => {
    expect(caseActRefusal(S({ role: 'administrator', institution: undefined }), C())).toMatch(/administering the installation/);
    expect(caseActRefusal(S({ role: 'administrator' }), C({ decision: true }))).toMatch(/can sign/);
    expect(caseActRefusal(S({ role: 'signatory' }), C({ decision: true }))).toBeNull();
    expect(caseActRefusal(S({}), C({ decision: true }))).toMatch(/can sign/);
  });

  it('keeps restricted and secret cases to the assigned, signatories and supervisors', () => {
    expect(caseActRefusal(S({}), C({ sensitivity: 'restricted' }))).toMatch(/restricted/);
    expect(caseActRefusal(S({}), C({ sensitivity: 'restricted', assigned: ['u1'] }))).toBeNull();
    expect(caseActRefusal(S({ role: 'signatory' }), C({ sensitivity: 'secret' }))).toMatch(/assigned/);
    expect(caseActRefusal(S({ role: 'signatory' }), C({ sensitivity: 'secret', supervisors: ['u1'] }))).toBeNull();
  });

  it('closes a court\'s cases to every other institution, the whole government included', () => {
    const j = C({ owner: 'court', judicial: true });
    expect(caseReadRefusal(S({ institution: undefined, role: 'administrator' }), j)).toMatch(/court/);
    expect(caseReadRefusal(S({ institution: undefined, role: 'auditor' }), j, 'audit')).toMatch(/court/);
    expect(caseActRefusal(S({ institution: undefined, role: 'administrator' }), j)).toMatch(/court/);
    expect(caseReadRefusal(S({ institution: 'court' }), j)).toBeNull();
  });

  it('asks auditors why they read a restricted or secret case', () => {
    const r = C({ sensitivity: 'restricted' });
    expect(caseReadRefusal(S({ role: 'auditor', institution: undefined }), r)).toMatch(/Say why/);
    expect(caseReadRefusal(S({ role: 'auditor', institution: undefined }), r, 'Quarterly audit')).toBeNull();
    expect(caseReadRefusal(S({ institution: 'health' }), C())).toMatch(/read by officials/);
    expect(caseReadRefusal(S({ institution: undefined }), C())).toBeNull();
  });

  it('needs a recent second sign-in step where the procedure asks for it', () => {
    const now = Date.parse('2026-10-20T10:00:00Z');
    const c = C({ decision: true, stepUp: true });
    expect(caseActRefusal(S({ role: 'signatory' }), c, now)).toMatch(/second sign-in step/);
    expect(caseActRefusal(S({ role: 'signatory', twoStepAt: now - (STEP_UP_MINUTES + 1) * 60_000 }), c, now)).toMatch(/second sign-in step/);
    expect(caseActRefusal(S({ role: 'signatory', twoStepAt: now - 60_000 }), c, now)).toBeNull();
  });
});
