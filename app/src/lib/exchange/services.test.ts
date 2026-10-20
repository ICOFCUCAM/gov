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
    expect(serviceDirectory().map(s => [s.id, s.kind, s.scope])).toEqual([['person.verify', 'query', 'service:person.verify'], ['organisation.standing', 'query', 'service:organisation.standing'], ['immigration.status', 'query', 'service:immigration.status'], ['civil.birth.registered', 'event', 'events:civil']]);
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
