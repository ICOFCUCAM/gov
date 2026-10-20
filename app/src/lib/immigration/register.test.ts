import { describe, it, expect, beforeEach } from 'vitest';
import { recordGrant, changeGrant, statusOn, expireGrants, findGrants, resetImmigration, grantCounts } from './register';

const visa = { kind: 'visa' as const, category: 'business', holder: { name: 'Ada Traveller', nationality: 'gha', documentNumber: 'G 1234-567', birthDate: '1990-04-02' }, validFrom: '2026-11-01', validUntil: '2027-01-31', entries: 'multiple' };

describe('immigration register', () => {
  beforeEach(() => resetImmigration());

  it('numbers a grant and answers a status check by travel document, without the holder', () => {
    const v = recordGrant(visa, 'issued', 'case-1', 'Business visit verified', 'Officer', new Date('2026-10-20'));
    if ('error' in v) throw new Error(v.error);
    expect(v.number).toBe('VIS-2026-000001');
    const ok = statusOn({ nationality: 'GHA', documentNumber: 'g1234567', kind: 'visa', on: '2026-12-01' });
    expect(ok).toEqual({ valid: true, kind: 'visa', category: 'business', number: v.number, validUntil: '2027-01-31', entries: 'multiple', conditions: [] });
    expect(JSON.stringify(ok)).not.toContain('Ada');
    expect(statusOn({ nationality: 'GHA', documentNumber: 'G1234567', on: '2026-10-25' })).toEqual({ valid: false });
    expect(statusOn({ nationality: 'GHA', documentNumber: 'G1234567', kind: 'residence-permit', on: '2026-12-01' })).toEqual({ valid: false });
    expect(findGrants({ nationality: 'gha', documentNumber: 'G1234567' })).toHaveLength(1);
  });

  it('checks a grant before numbering it and keeps refusals as records', () => {
    expect(recordGrant({ ...visa, category: 'tourism-plus' }, 'issued', 'c', 'x', 'O')).toMatchObject({ error: expect.stringMatching(/Category/) });
    expect(recordGrant({ ...visa, validUntil: '2026-10-01' }, 'issued', 'c', 'x', 'O')).toMatchObject({ error: expect.stringMatching(/end after/) });
    const r = recordGrant(visa, 'refused', 'case-2', 'Purpose not shown', 'Officer');
    expect(r).toMatchObject({ state: 'refused', number: expect.stringMatching(/REFUSED/) });
    expect(statusOn({ nationality: 'GHA', documentNumber: 'G1234567', on: '2026-12-01' })).toEqual({ valid: false });
  });

  it('revokes, extends and expires only along the allowed path', () => {
    const v = recordGrant(visa, 'issued', 'c1', 'ok', 'O') as { number: string };
    expect(changeGrant(v.number, { state: 'issued', reason: 'Extended', validUntil: '2027-03-31', case: 'c2' }, 'O')).toMatchObject({ validUntil: '2027-03-31' });
    expect(changeGrant(v.number, { state: 'issued', reason: 'Shorter', validUntil: '2027-01-01' }, 'O')).toHaveProperty('error');
    expect(expireGrants(new Date('2027-04-01'))).toEqual([v.number]);
    expect(changeGrant(v.number, { state: 'revoked', reason: 'x' }, 'O')).toMatchObject({ error: expect.stringMatching(/expired cannot/) });
    expect(grantCounts()).toEqual([{ kind: 'visa', category: 'business', state: 'expired', count: 1 }]);
  });
});
