import { describe, it, expect, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { GET } from './route';
import { GET as listRegisters } from '../route';
import { resetOrganisations, createOrganisation, setStanding } from '@/lib/organisations/register';

describe('public register check', () => {
  beforeEach(() => resetOrganisations());

  it('lists the public registers and answers a check without representatives', async () => {
    expect((await (await listRegisters()).json()).registers.map((r: { key: string }) => r.key)).toContain('higher-education');
    const o = createOrganisation({ name: 'Northern University', kind: 'university', representative: { name: 'Private Person', role: 'Rector' } }, 'c', 'R') as { id: string; number: string };
    setStanding(o.id, { register: 'higher-education', state: 'applied', reason: 'a' }, 'R');
    // An application is not a standing anyone can rely on: not found until decided.
    expect((await (await GET(new NextRequest('http://x/api/registers/check?register=higher-education&q=northern'))).json()).results).toEqual([]);
    setStanding(o.id, { register: 'higher-education', state: 'granted', reason: 'g' }, 'R');
    const r = await (await GET(new NextRequest(`http://x/api/registers/check?register=higher-education&q=${o.number}`))).json();
    expect(r.results).toEqual([expect.objectContaining({ number: o.number, name: 'Northern University', standings: [expect.objectContaining({ state: 'granted' })] })]);
    expect(JSON.stringify(r)).not.toContain('Private Person');
    expect((await GET(new NextRequest('http://x/api/registers/check?register=nope&q=northern'))).status).toBe(422);
  });
});
