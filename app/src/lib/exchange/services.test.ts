import { describe, it, expect, beforeEach } from 'vitest';
import { callService, serviceDirectory } from './services';
import { verifyReceipt, listExchanges, resetExchangeLog } from './log';
import { registerEvent, resetCivil } from '@/lib/civil/register';

const caller = { kind: 'integration' as const, id: 'IC-1', name: 'Identity authority' };

describe('exchange services', () => {
  beforeEach(() => { resetCivil(); resetExchangeLog(); });

  it('answers whether facts match a birth registration, never the record, with a signed receipt', async () => {
    registerEvent({ kind: 'birth', date: '2026-09-01', place: { region: 'North' }, case: 'c1', child: { given: 'Amara', family: 'Okafor', sex: 'female' } }, 'R');
    const yes = await callService(caller, 'person.verify', { registration: 'BR-2026-000001', family: 'OKAFOR', birthDate: '2026-09-01' }, 'Issuing a national identity card');
    expect(yes).toMatchObject({ status: 200, data: { match: 'yes', status: 'alive' } });
    expect(JSON.stringify(yes.data)).not.toContain('Amara');
    expect(verifyReceipt(yes.receipt)).toBe(true);
    expect((await callService(caller, 'person.verify', { registration: 'BR-2026-000001', family: 'Bello' }, 'x')).data).toEqual({ match: 'no', status: 'unknown' });
    expect((await callService(caller, 'person.verify', { registration: 'BR-2026-000001' }, 'x')).data).toEqual({ match: 'unknown', status: 'unknown' });
    expect(await callService(caller, 'person.verify', { registration: 'BR-2026-000001', family: 'Okafor' }, ' ')).toMatchObject({ status: 400 });
    expect(listExchanges({ channel: 'service' })).toHaveLength(4);
  });

  it('lists every service with its owner, scope and the fields it returns', () => {
    expect(serviceDirectory().map(s => [s.id, s.kind, s.scope])).toEqual([['person.verify', 'query', 'service:person.verify'], ['organisation.standing', 'query', 'service:organisation.standing'], ['taxpayer.status', 'query', 'service:taxpayer.status'], ['qualification.verify', 'query', 'service:qualification.verify'], ['professional.standing', 'query', 'service:professional.standing'], ['customs.release', 'query', 'service:customs.release'], ['immigration.status', 'query', 'service:immigration.status'], ['civil.birth.registered', 'event', 'events:civil']]);
  });
});

describe('immigration.status', () => {
  it('answers validity without naming the holder, with a receipt', async () => {
    const { resetImmigration, recordGrant } = await import('@/lib/immigration/register');
    resetImmigration();
    recordGrant({ kind: 'residence-permit', category: 'work', holder: { name: 'Private Holder', nationality: 'KEN', documentNumber: 'AK998877' }, validFrom: '2026-01-01', validUntil: '2028-01-01', conditions: ['Work for the sponsoring employer only'] }, 'issued', 'case-x', 'ok', 'Officer');
    const caller = { kind: 'integration' as const, id: 'employer-check', name: 'Labour inspectorate' };
    const r = await callService(caller, 'immigration.status', { nationality: 'ken', documentNumber: 'AK 998877', on: '2027-03-01' }, 'Right-to-work check');
    expect(r.data).toEqual({ valid: 'yes', kind: 'residence-permit', category: 'work', validUntil: '2028-01-01', conditions: ['Work for the sponsoring employer only'] });
    expect(JSON.stringify(r)).not.toContain('Private Holder');
    expect(r.receipt).toBeTruthy();
    expect((await callService(caller, 'immigration.status', { nationality: 'KEN', documentNumber: 'NOPE' }, 'Check')).data).toEqual({ valid: 'no' });
  });
});

describe('organisation.standing', () => {
  it('answers the standing in one register, without representatives', async () => {
    const { resetOrganisations, createOrganisation, setStanding } = await import('@/lib/organisations/register');
    resetOrganisations();
    const o = createOrganisation({ name: 'Riverside Pharmacy', kind: 'pharmacy', representative: { name: 'Private Owner', role: 'Owner' } }, 'c', 'R') as { id: string; number: string };
    setStanding(o.id, { register: 'business-licences', state: 'granted', reason: 'ok', validUntil: '2027-01-01' }, 'R');
    const r = await callService({ kind: 'integration', id: 'health', name: 'Health insurer' }, 'organisation.standing', { number: o.number, register: 'business-licences' }, 'Paying a claim');
    expect(r.data).toEqual({ name: 'Riverside Pharmacy', standing: 'granted', validUntil: '2027-01-01' });
    expect(JSON.stringify(r)).not.toContain('Private Owner');
  });
});

describe('taxpayer.status', () => {
  it('says whether a party is registered and for which taxes, nothing more', async () => {
    const { resetTax, registerTaxpayer } = await import('@/lib/tax/register');
    resetTax();
    registerTaxpayer({ party: { kind: 'organisation', id: 'ORG-1', name: 'Hill Traders' }, taxTypes: ['income'] }, 'c', 'Officer');
    const r = await callService({ kind: 'integration', id: 'procurement', name: 'Public procurement' }, 'taxpayer.status', { party: 'ORG-1' }, 'Tender eligibility');
    expect(r.data).toEqual({ registered: 'yes', active: 'yes', taxTypes: ['income'] });
    expect((await callService({ kind: 'integration', id: 'p', name: 'P' }, 'taxpayer.status', { party: 'ORG-9' }, 'Check')).data).toEqual({ registered: 'no', active: 'no' });
  });
});

describe('qualification.verify', () => {
  it('confirms a qualification only with its number and the holder\'s name, and never returns the holder\'s reference', async () => {
    const { resetEducation, recordAward } = await import('@/lib/education/register');
    const { resetOrganisations, createOrganisation, setStanding } = await import('@/lib/organisations/register');
    resetEducation(); resetOrganisations();
    const o = createOrganisation({ name: 'Northern Polytechnic', kind: 'college' }, 'c1', 'Registrar') as { id: string; number: string };
    setStanding(o.id, { register: 'schools', state: 'granted', reason: 'Registered', case: 'c2' }, 'Registrar');
    const a = recordAward({ holderRef: 'BR-2001-000007', holderName: 'Kofi Mensah', title: 'Diploma in Surveying', awardingBody: o.number, awardedOn: '2025-06-30' }, 'c3', 'Officer') as { number: string };
    const who = { kind: 'integration' as const, id: 'employer-portal', name: 'Public service commission' };
    const r = await callService(who, 'qualification.verify', { number: a.number, holderName: 'kofi mensah' }, 'Recruitment check');
    expect(r.data).toMatchObject({ valid: 'yes', title: 'Diploma in Surveying', awardingBody: 'Northern Polytechnic', awardedOn: '2025-06-30' });
    expect(JSON.stringify(r)).not.toContain('BR-2001');
    expect((await callService(who, 'qualification.verify', { number: a.number, holderName: 'Someone Else' }, 'Check')).data).toEqual({ valid: 'no' });
    expect((await callService(who, 'qualification.verify', { number: 'QUA-0000-000000', holderName: 'Kofi Mensah' }, 'Check')).data).toEqual({ valid: 'no' });
  });
});

describe('professional.standing', () => {
  it('answers from the public register only', async () => {
    const { resetProfessions, registerProfessional } = await import('@/lib/professions/register');
    resetProfessions();
    const e = registerProfessional({ profession: 'pharmacist', personRef: 'BR-1985-000002', name: 'Ama Owusu' }, 'c', 'Registrar') as { number: string };
    const r = await callService({ kind: 'integration', id: 'hospital-hr', name: 'Teaching hospital' }, 'professional.standing', { number: e.number }, 'Employment check');
    expect(r.data).toEqual({ registered: 'yes', profession: 'Pharmacists', state: 'registered', conditions: [] });
    expect(JSON.stringify(r)).not.toContain('BR-1985');
  });
});

describe('customs.release', () => {
  it('says whether goods were released, never what or whose', async () => {
    const { resetCustoms, lodgeDeclaration } = await import('@/lib/customs/register');
    resetCustoms();
    const d = lodgeDeclaration({ direction: 'import', declarant: { kind: 'organisation', ref: 'ORG-5', name: 'Secret Importer' }, shipment: { mode: 'sea', transportRef: 'BL-9', from: 'CN', to: 'KE' }, currency: 'KES', goods: '8703 | Cars | JP | 2 u | 4000000' }, 'c', 'Officer') as { number: string };
    const r = await callService({ kind: 'integration', id: 'vehicle-registry', name: 'Vehicle registry' }, 'customs.release', { number: d.number }, 'First registration of an imported vehicle');
    expect(r.data).toEqual({ released: 'no', state: 'lodged' });
    expect(JSON.stringify(r)).not.toMatch(/Secret|ORG-5|Cars|4000000/);
  });
});
