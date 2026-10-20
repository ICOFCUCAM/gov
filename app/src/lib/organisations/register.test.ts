import { describe, it, expect, beforeEach } from 'vitest';
import { resetOrganisations, createOrganisation, setStanding, getOrganisation, checkStanding, expireStandings, defineRegisterType, registerTypes, publicOrganisation, amendOrganisation, linkFacilities } from './register';

describe('organisations register', () => {
  beforeEach(() => resetOrganisations());

  it('numbers a new organisation and refuses the same name and kind twice', () => {
    const o = createOrganisation({ name: 'Northern University', kind: 'university', region: 'North', representative: { name: 'Prof. A. Example', role: 'Vice-chancellor' } }, 'case-1', 'Registrar', new Date('2026-03-01'));
    if ('error' in o) throw new Error(o.error);
    expect(o.number).toBe('ORG-2026-000001');
    expect(createOrganisation({ name: 'northern university', kind: 'university' }, 'case-2', 'Registrar')).toMatchObject({ error: expect.stringMatching(/already registered/) });
    expect(createOrganisation({ name: 'X', kind: 'castle' }, 'c', 'R')).toMatchObject({ error: expect.stringMatching(/name|Kind/) });
  });

  it('moves a standing only along the allowed path, with validity from the register type', () => {
    const o = createOrganisation({ name: 'Northern University', kind: 'university' }, 'c1', 'R') as { id: string };
    expect(setStanding(o.id, { register: 'higher-education', state: 'suspended', reason: 'x' }, 'R')).toMatchObject({ error: expect.stringMatching(/no standing/) });
    expect(setStanding(o.id, { register: 'higher-education', state: 'applied', reason: 'Applied' }, 'R')).toMatchObject({ state: 'applied' });
    const g = setStanding(o.id, { register: 'higher-education', state: 'granted', reason: 'Accredited', conditions: ['Report annually'] }, 'R', new Date('2026-03-01T00:00:00Z'));
    expect(g).toMatchObject({ state: 'granted', validUntil: '2031-03-01', conditions: ['Report annually'] });
    expect(setStanding(o.id, { register: 'higher-education', state: 'revoked', reason: 'Fraud' }, 'R')).toMatchObject({ state: 'revoked' });
    expect(setStanding(o.id, { register: 'higher-education', state: 'granted', reason: 'Again' }, 'R')).toMatchObject({ error: expect.stringMatching(/revoked cannot/) });
    // A register holds only its kinds.
    const shop = createOrganisation({ name: 'Corner Shop', kind: 'company' }, 'c2', 'R') as { id: string };
    expect(setStanding(shop.id, { register: 'higher-education', state: 'applied', reason: 'x' }, 'R')).toMatchObject({ error: expect.stringMatching(/does not hold/) });
  });

  it('expires grants past their validity and answers the public check without representatives', () => {
    const o = createOrganisation({ name: 'Riverside Pharmacy', kind: 'pharmacy', representative: { name: 'Private Person', role: 'Owner' } }, 'c1', 'R') as { id: string; number: string };
    setStanding(o.id, { register: 'business-licences', state: 'granted', reason: 'Licensed' }, 'R', new Date('2025-01-10T00:00:00Z'));
    expect(expireStandings(new Date('2026-02-01T00:00:00Z'))).toEqual([{ organisation: o.number, register: 'business-licences' }]);
    const hits = checkStanding('business-licences', 'riverside') as ReturnType<typeof publicOrganisation>[];
    expect(hits[0]).toMatchObject({ number: o.number, standings: [{ state: 'expired' }] });
    expect(JSON.stringify(hits)).not.toContain('Private Person');
    expect(checkStanding('business-licences', 'ri')).toMatchObject({ error: expect.any(String) });
  });

  it('keeps every version, links sites and lets an administrator add a register type', () => {
    const o = createOrganisation({ name: 'Old Name Ltd', kind: 'company' }, 'c1', 'R') as { id: string };
    amendOrganisation(o.id, { name: 'New Name Ltd' }, 'Change of name', 'c2', 'R');
    linkFacilities(o.id, ['fac-1', 'fac-1', 'fac-2'], 'c3', 'R');
    const now = getOrganisation(o.id)!;
    expect(now.versions.map(v => v.name)).toEqual(['Old Name Ltd', 'New Name Ltd']);
    expect(now.facilities).toEqual(['fac-1', 'fac-2']);
    expect(defineRegisterType({ key: 'licensed-pharmacies', title: 'Licensed pharmacies', kind: 'licence', authority: 'ministry-health', orgKinds: ['pharmacy'], validityMonths: 24 }, 'Administrator')).toMatchObject({ key: 'licensed-pharmacies', reference: false });
    expect(registerTypes().map(t => t.key)).toContain('licensed-pharmacies');
    expect(defineRegisterType({ key: 'Bad Key', title: 'x', kind: 'licence', authority: 'a', orgKinds: ['pharmacy'] }, 'A')).toHaveProperty('error');
  });
});
