import { describe, it, expect, beforeEach } from 'vitest';
import { checkPackage, runPackageTests, draftPackage, approvePackage, activePackage, resetPackages, ownerInstitution } from './packages';
import { samplePackage } from './testkit';
import type { CasePackage } from './types';

describe('procedures', () => {
  beforeEach(() => resetPackages());

  it('checks that stages, actions, fields, documents and deadlines fit together', () => {
    expect(checkPackage(samplePackage())).toBeNull();
    expect(checkPackage(samplePackage({ stages: [{ key: 'a', label: 'A' }, { key: 'b', label: 'B' }] }))).toMatch(/ends the case/);
    expect(checkPackage(samplePackage({ actions: [{ key: 'x', label: 'X', from: ['nowhere'], to: 'review', needs: { role: 'officer' } }] }))).toMatch(/do not exist/);
    expect(checkPackage(samplePackage({ actions: [{ key: 'grant', label: 'G', from: ['review'], to: 'granted', decision: 'grant', needs: { role: 'officer' } }] }))).toMatch(/can sign/);
    expect(checkPackage(samplePackage({ actions: [{ key: 'x', label: 'X', from: ['submitted'], to: 'review', needs: { role: 'officer' }, effects: ['civil.registerBirth'] }] }))).toMatch(/no module provides/);
    expect(checkPackage(samplePackage({ actions: [{ key: 'x', label: 'X', from: ['submitted'], to: 'review', needs: { role: 'officer' }, requires: { documents: ['passport'] } }] }))).toMatch(/unknown document/);
  });

  it('runs a procedure\'s own tests', () => {
    expect(runPackageTests({ ...samplePackage(), state: 'draft' } as CasePackage)).toEqual({ ok: true, failures: [] });
    const bad = { ...samplePackage({ tests: [{ name: 'no docs', steps: [{ action: 'accept', fields: { name: 'A' }, expect: 'review' }] }] }), state: 'draft' } as CasePackage;
    expect(runPackageTests(bad).failures[0]).toMatch(/missing document application-form/);
    const refused = { ...samplePackage({ tests: [{ name: 'refused', steps: [{ action: 'grant', expect: 'refused' }] }] }), state: 'draft' } as CasePackage;
    expect(runPackageTests(refused).ok).toBe(true);
  });

  it('runs only once a different official approves it, from its date; the next version supersedes', () => {
    expect(draftPackage(samplePackage(), 'A', 'a', [])).not.toHaveProperty('error');
    expect(activePackage('test.licence')).toBeUndefined();
    expect(approvePackage('test.licence', 1, 'A', 'a', undefined, [])).toHaveProperty('error');
    expect(approvePackage('test.licence', 1, 'B', 'b', '2026-01-01', [], new Date('2026-01-01'))).toMatchObject({ state: 'approved', activeFrom: '2026-01-01' });
    expect(activePackage('test.licence', '2025-12-31')).toBeUndefined();
    expect(activePackage('test.licence', '2026-06-01')?.version).toBe(1);
    expect(draftPackage(samplePackage({ version: 3 }), 'A', 'a', [])).toHaveProperty('error');
    draftPackage(samplePackage({ version: 2, title: 'Test licence (2)' }), 'A', 'a', []);
    approvePackage('test.licence', 2, 'B', 'b', '2026-07-01', [], new Date('2026-06-01'));
    expect(activePackage('test.licence', '2026-07-02')?.version).toBe(2);
  });

  it('refuses approval while its tests fail, and resolves its owner through the deployment profile', () => {
    draftPackage(samplePackage({ tests: [] }), 'A', 'a', []);
    expect(approvePackage('test.licence', 1, 'B', 'b', undefined, [])).toMatchObject({ error: expect.stringMatching(/at least one test/) });
    expect(ownerInstitution('civilRegistration', k => (k === 'civilRegistration' ? 'min-interior' : undefined))).toBe('min-interior');
    expect(ownerInstitution('min-health', () => undefined)).toBe('min-health');
  });
});
