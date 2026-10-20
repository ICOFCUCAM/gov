import { describe, it, expect, beforeEach, vi } from 'vitest';
import { NextRequest } from 'next/server';

let scope: { id: string; name: string; label: string; role: string; institution?: string } | null = null;
vi.mock('@/lib/auth/official', () => ({ caseScope: async () => scope }));

const { GET } = await import('./route');
const { setSovereign, listMinistries } = await import('@/lib/data/store');
const { resetAccessLog, listAccess } = await import('@/lib/records/access-log');
const { resetCustoms, lodgeDeclaration } = await import('@/lib/customs/register');

let CUS = '', OTHER = '', NUM = '';
const get = (qs: string) => GET(new NextRequest(`http://x/api/customs${qs}`));

describe('/api/customs', () => {
  beforeEach(() => {
    resetAccessLog(); resetCustoms();
    [CUS, OTHER] = listMinistries().slice(0, 2).map(m => m.id) as [string, string];
    setSovereign({ deployment: { authorities: { customs: CUS } } }, 'Administrator');
    NUM = (lodgeDeclaration({ direction: 'import', declarant: { kind: 'organisation', ref: 'ORG-9', name: 'Importer' }, shipment: { mode: 'air', transportRef: 'AWB-1', from: 'AE', to: 'KE' }, currency: 'KES', goods: '3004 | Medicines | IN | 10 kg | 90000' }, 'c', 'Officer') as { number: string }).number;
  });

  it('is read by the customs authority and auditors with a purpose, refused to others, every read logged', async () => {
    scope = { id: 'x', name: 'X', label: 'Other', role: 'signatory', institution: OTHER };
    expect((await get(`?number=${NUM}`)).status).toBe(403);
    scope = { id: 'a', name: 'A', label: 'Auditor', role: 'auditor', institution: OTHER };
    expect((await get('?declarant=ORG-9')).status).toBe(403);
    expect((await (await get('?declarant=ORG-9&purpose=Revenue%20audit')).json()).declarations).toHaveLength(1);
    scope = { id: 'o', name: 'O', label: 'Officer', role: 'officer', institution: CUS };
    expect((await (await get(`?number=${NUM}`)).json()).declarations[0].number).toBe(NUM);
    const log = listAccess({}).filter(e => e.record.register === 'customs').sort((a, b) => a.seq - b.seq);
    expect(log.map(e => e.result)).toEqual(['refused', 'refused', 'allowed', 'allowed']);
  });
});
