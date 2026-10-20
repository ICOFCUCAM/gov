import { describe, it, expect, beforeEach, vi } from 'vitest';
import { NextRequest } from 'next/server';

let scope: { id: string; name: string; label: string; role: string; institution?: string } | null = null;
vi.mock('@/lib/auth/official', () => ({ caseScope: async () => scope }));

const { GET } = await import('./route');
const { setSovereign, listMinistries } = await import('@/lib/data/store');
const { resetAccessLog, listAccess } = await import('@/lib/records/access-log');
const { resetProfessions, registerProfessional, defineProfession } = await import('@/lib/professions/register');

let NURSING = '', PHARMACY = '', OTHER = '';
const get = (qs: string) => GET(new NextRequest(`http://x/api/professions${qs}`));

describe('/api/professions', () => {
  beforeEach(() => {
    resetAccessLog(); resetProfessions();
    [NURSING, PHARMACY, OTHER] = listMinistries().slice(0, 3).map(m => m.id) as [string, string, string];
    setSovereign({ deployment: { authorities: { professionalRegulation: NURSING } } }, 'Administrator');
    // Pharmacists are kept by a separate council.
    defineProfession({ key: 'pharmacist', title: 'Pharmacists', authority: PHARMACY }, 'Administrator');
  });

  it('shows each regulator only the professions it keeps, refuses others, and logs every read', async () => {
    const n = registerProfessional({ profession: 'nurse', personRef: 'BR-1', name: 'Nurse One' }, 'c', 'R') as { number: string };
    const p = registerProfessional({ profession: 'pharmacist', personRef: 'BR-2', name: 'Pharmacist Two' }, 'c', 'R') as { number: string };
    scope = { id: 'n', name: 'N', label: 'Nursing officer', role: 'officer', institution: NURSING };
    expect((await (await get(`?number=${n.number}`)).json()).professionals[0].personRef).toBe('BR-1');
    expect((await get(`?number=${p.number}`)).status).toBe(404);
    expect(Object.keys((await (await get('')).json()).counts)).toEqual(['nurse']);
    scope = { id: 'x', name: 'X', label: 'Other', role: 'signatory', institution: OTHER };
    expect((await get(`?number=${n.number}`)).status).toBe(403);
    scope = { id: 'a', name: 'A', label: 'Auditor', role: 'auditor', institution: OTHER };
    expect((await get(`?number=${p.number}`)).status).toBe(403);
    expect((await get(`?number=${p.number}&purpose=Audit`)).status).toBe(200);
    const log = listAccess({}).filter(e => e.record.register === 'professions').sort((a, b) => a.seq - b.seq);
    expect(log.map(e => e.result)).toEqual(['allowed', 'allowed', 'refused', 'refused', 'allowed']);
  });
});
