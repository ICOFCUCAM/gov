import { describe, it, expect, beforeEach } from 'vitest';
import { importDependencyFindings, listAdvisories, resetAdvisories } from './advisories';

const report = (findings: object[], accepted: object[] = []) => ({ findings, accepted, version: '1.6.0' }) as never;
const F = { id: 'GHSA-aaaa-bbbb-cccc', package: 'next', severity: 'high', title: 'Cache poisoning', vulnerable: '<14.2.40', patched: '>=15.5.1' };

beforeEach(() => resetAdvisories());

describe('dependency audit findings become advisories', () => {
  it('raises an interim advisory for each high or critical finding, with the assessment when accepted', () => {
    const r = importDependencyFindings(report([F, { ...F, id: 'GHSA-low0-0000-0000', severity: 'low' }], [{ id: F.id, reason: 'Not reachable: no image optimizer.', reviewBy: '2026-12-31' }]), 'CI');
    expect(r).toEqual({ raised: ['CSA-DEP-GHSA-aaaa-bbbb-cccc', 'CSA-DEP-GHSA-low0-0000-0000'], updated: [], resolved: [] });
    const a = listAdvisories().find(x => x.id === 'CSA-DEP-GHSA-aaaa-bbbb-cccc')!;
    expect(a).toEqual(expect.objectContaining({ severity: 'high', status: 'interim', affectedFrom: '0.0.0' }));
    expect(a.summary).toMatch(/Not reachable: no image optimizer\. Review by 2026-12-31/);
    expect(a.dependency).toEqual(expect.objectContaining({ ghsa: F.id, package: 'next', accepted: expect.objectContaining({ reviewBy: '2026-12-31' }) }));
  });

  it('is idempotent, and resolves a finding no longer reported as fixed in the reporting version', () => {
    importDependencyFindings(report([F]), 'CI');
    expect(importDependencyFindings(report([F]), 'CI')).toEqual({ raised: [], updated: [], resolved: [] });
    expect(importDependencyFindings(report([]), 'CI')).toEqual({ raised: [], updated: [], resolved: ['CSA-DEP-GHSA-aaaa-bbbb-cccc'] });
    const a = listAdvisories().find(x => x.id === 'CSA-DEP-GHSA-aaaa-bbbb-cccc')!;
    expect(a).toEqual(expect.objectContaining({ status: 'final', fixedIn: '1.6.0' }));
    // Reported again later: it reopens.
    expect((importDependencyFindings(report([F]), 'CI') as { updated: string[] }).updated).toEqual(['CSA-DEP-GHSA-aaaa-bbbb-cccc']);
  });

  it('refuses a malformed report and ignores malformed findings', () => {
    expect(importDependencyFindings({} as never, 'CI')).toEqual({ error: expect.stringMatching(/findings/) });
    expect(importDependencyFindings(report([{ id: 'nope', severity: 'high' }]), 'CI')).toEqual({ raised: [], updated: [], resolved: [] });
  });
});
