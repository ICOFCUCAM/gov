import { describe, it, expect, beforeEach } from 'vitest';
import { recordAccess, resetAccessLog } from './access-log';
import { watchAccess, resetAccessWatch } from './access-watch';
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
});
