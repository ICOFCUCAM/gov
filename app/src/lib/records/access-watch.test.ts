import { describe, it, expect, beforeEach } from 'vitest';
import { recordAccess, resetAccessLog } from './access-log';
import { watchAccess, resetAccessWatch, raisedFindings } from './access-watch';
import { recordAudit } from '@/lib/data/store/audit';
import { listAudit } from '@/lib/data/store';

describe('access watch', () => {
  beforeEach(() => { resetAccessLog(); resetAccessWatch(); });

  it('raises a finding once per official, reason and day', () => {
    for (let i = 0; i < 6; i++) recordAccess({ by: { id: 'o-7', name: 'Officer Seven' }, record: { register: 'civil', id: `BR-${i}` }, action: 'refused', result: 'refused', rule: 'not theirs' }, new Date('2026-10-20T10:00:00Z'));
    expect(watchAccess(new Date('2026-10-20T11:00:00Z'))).toEqual({ raised: 1 });
    expect(watchAccess(new Date('2026-10-20T11:15:00Z'))).toEqual({ raised: 0 });
    const e = listAudit().find(x => x.action === 'access.unusual')!;
    expect(e).toMatchObject({ resource: 'Official:o-7', detail: expect.stringMatching(/repeatedly refused \(6\)/) });
    expect(e.detail).not.toContain('BR-');
  });

  it('lists the findings raised on the audit chain, newest first, without other entries', () => {
    for (let i = 0; i < 6; i++) recordAccess({ by: { id: 'o-8', name: 'Officer Eight' }, record: { register: 'civil', id: `BR-${i}` }, action: 'refused', result: 'refused', rule: 'not theirs' });
    watchAccess();
    recordAudit('Someone', 'permit.decide', 'Permit:P-1', 'ok', 'not a finding');
    recordAudit('System (register watch)', 'register.harvest.suspected', 'Caller:abc', 'ok', '70 checks and 30 misses in an hour on the professional register');
    const f = raisedFindings();
    expect(f[0]).toMatchObject({ kind: expect.stringMatching(/harvesting/), subject: 'Caller:abc' });
    expect(f.some(x => x.subject === 'Official:o-8' && /refused/.test(x.detail))).toBe(true);
    expect(f.every(x => x.kind)).toBe(true);
    expect(f.some(x => x.subject === 'Permit:P-1')).toBe(false);
    expect(f.every(x => !x.detail.includes('BR-'))).toBe(true);
    expect(raisedFindings(new Date(Date.now() + 60_000).toISOString())).toEqual([]);
  });
});
