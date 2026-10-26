import { describe, it, expect, beforeEach } from 'vitest';
import { draftRule, approveRule, calculate, ruleInForce, applyRule, resetRules, recalculate } from './rules';
import { recordVersion, confirmVersion, resetLaw } from './register';

let act = '';
const bands = { key: 'tax.test.bands', title: 'Test bands', kind: 'rate-bands', owner: 'tax', effectiveFrom: '2026-01-01',
  bands: [{ from: 0, to: 100_000, rate: 0 }, { from: 100_000, to: 500_000, rate: 10 }, { from: 500_000, rate: 20.5 }],
  tests: [{ name: 'below the first band', input: { amountMinor: 50_000 }, expectMinor: 0 }, { name: 'across bands', input: { amountMinor: 600_000 }, expectMinor: 40_000 + 20_500 }] };

describe('operational rules', () => {
  beforeEach(() => {
    resetRules(); resetLaw();
    const v = recordVersion({ instrument: { title: 'Finance Act', type: 'act', jurisdiction: 'X', year: 2026, number: '1', issuingAuthority: 'Parliament' }, dates: { inForce: '2026-01-01' }, provisions: [{ eId: 'sch_1', num: 'Schedule 1', text: 'Rates.' }] }, 'L1', 'l1');
    if ('error' in v) throw new Error(v.error);
    confirmVersion(v.instrument.id, v.version.id, 'L2', 'l2');
    act = v.instrument.id;
  });

  it('refuses to calculate until a tested rule citing the law is approved by a second official', () => {
    expect(calculate('tax.test.bands', { amountMinor: 600_000 }, '2026-03-01')).toMatchObject({ error: expect.stringMatching(/No approved rule/) });
    expect(draftRule({ ...bands, tests: [{ name: 'wrong', input: { amountMinor: 600_000 }, expectMinor: 1 }] }, 'A', 'a')).toMatchObject({ error: expect.stringMatching(/expected 1/) });
    const d = draftRule({ ...bands }, 'A', 'a');
    if ('error' in d) throw new Error(d.error);
    expect(approveRule('tax.test.bands', 1, 'B', 'b')).toMatchObject({ error: expect.stringMatching(/cited/) });
    draftRule({ ...bands, citations: [{ instrument: act, eId: 'sch_1' }] }, 'A', 'a');
    expect(approveRule('tax.test.bands', 2, 'A', 'a')).toHaveProperty('error');
    expect(approveRule('tax.test.bands', 2, 'B', 'b')).toMatchObject({ state: 'approved' });
    expect(calculate('tax.test.bands', { amountMinor: 600_000 }, '2025-12-31')).toHaveProperty('error');
    expect(calculate('tax.test.bands', { amountMinor: 600_000 }, '2026-03-01')).toMatchObject({ amountMinor: 60_500, rule: { version: 2, digest: expect.stringMatching(/^[0-9a-f]{64}$/) } });
  });

  it('applies a tariff by the longest matching code and checks the inputs', () => {
    const t = { kind: 'tariff' as const, lines: [{ code: '0901', rate: 10 }, { code: '090121', rate: 5 }] };
    expect(applyRule(t, { amountMinor: 10_000, code: '0901.21.00' })).toMatchObject({ amountMinor: 500 });
    expect(applyRule(t, { amountMinor: 10_000, code: '0902' })).toMatchObject({ error: expect.stringMatching(/No tariff line/) });
    expect(applyRule(t, { amountMinor: -1, code: '0901' })).toHaveProperty('error');
    expect(draftRule({ key: 'customs.t', title: 'Tariff', kind: 'tariff', owner: 'customs', effectiveFrom: '2026-01-01', lines: [{ code: '09', rate: 10 }, { code: '09', rate: 5 }], tests: [] }, 'A')).toMatchObject({ error: expect.stringMatching(/appears twice/) });
    expect(ruleInForce('customs.t')).toBeUndefined();
  });

  // Plan step I6: fixed amounts by code (passport fees) and a means-tested amount (benefits).
  it('schedules fixed amounts by code and calculates a means-tested amount, both tested, cited and reproducible by version', () => {
    expect(applyRule({ kind: 'fixed-amounts', amounts: [{ code: 'ordinary', amountMinor: 400_000 }] }, { amountMinor: 0, code: 'ordinary' })).toMatchObject({ amountMinor: 400_000 });
    expect(applyRule({ kind: 'fixed-amounts', amounts: [{ code: 'ordinary', amountMinor: 400_000 }] }, { amountMinor: 0, code: 'diplomatic' })).toMatchObject({ error: expect.stringMatching(/No line/) });
    const means = { limitMinor: 800_000, baseMinor: 300_000, perMemberMinor: 100_000, taperRate: 50 };
    expect(applyRule({ kind: 'means-tested', means }, { amountMinor: 250_000, members: 3 })).toMatchObject({ amountMinor: 375_000 });
    expect(applyRule({ kind: 'means-tested', means }, { amountMinor: 800_000, members: 3 })).toMatchObject({ amountMinor: 0 });
    expect(applyRule({ kind: 'means-tested', means }, { amountMinor: 700_000, members: 1 })).toMatchObject({ amountMinor: 0 });
    expect(draftRule({ key: 'social.x', title: 'Child support', kind: 'means-tested', owner: 'socialProtection', effectiveFrom: '2026-01-01', means: { ...means, taperRate: -1 }, tests: [] }, 'A', 'a')).toHaveProperty('error');
    const d = draftRule({ key: 'social.x', title: 'Child support', kind: 'means-tested', owner: 'socialProtection', effectiveFrom: '2026-01-01', means, citations: [{ instrument: act, eId: 'sch_1' }], tests: [{ name: 't', input: { amountMinor: 250_000, members: 3 }, expectMinor: 375_000 }] }, 'A', 'a');
    if ('error' in d) throw new Error(d.error);
    expect(recalculate({ key: 'social.x', version: 1, digest: d.digest }, { amountMinor: 250_000, members: 3 })).toMatchObject({ error: expect.stringMatching(/never approved/) });
    approveRule('social.x', 1, 'B', 'b');
    const c = calculate('social.x', { amountMinor: 250_000, members: 3 }, '2026-03-01');
    if ('error' in c) throw new Error(c.error);
    expect(recalculate(c.rule, { amountMinor: 250_000, members: 3 })).toMatchObject({ amountMinor: 375_000 });
    expect(recalculate({ ...c.rule, digest: '0'.repeat(64) }, { amountMinor: 250_000, members: 3 })).toMatchObject({ error: expect.stringMatching(/digest/) });
  });
});
