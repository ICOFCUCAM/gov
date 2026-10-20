import { describe, it, expect, beforeEach } from 'vitest';
import { loadOrganisations, withdrawLoad } from './import';
import { resetOrganisations, listOrganisations, setStanding } from './register';

const CSV = `name,kind,number,standing,since,valid_until,conditions,region
Riverside Pharmacy,pharmacy,PH-0042,granted,2024-02-01,2027-02-01,Pharmacist on duty; No veterinary sales,North
Hilltop Pharmacy,pharmacy,PH-0043,suspended,2025-06-01,,,
Bad Row,castle,X,granted,,,,
Riverside Pharmacy,pharmacy,PH-9999,granted,,,,
Lakeside Pharmacy,pharmacy,PH-0044,maybe,,,,
Old Pharmacy,pharmacy,PH-0045,granted,01/02/2024,,,`;

describe('loading an existing register', () => {
  beforeEach(() => resetOrganisations());

  it('loads checked rows, refuses the others with reasons and keeps the file hash', () => {
    const l = loadOrganisations({ register: 'business-licences', csv: CSV }, 'Registrar');
    if ('error' in l) throw new Error(l.error);
    expect(l).toMatchObject({ rows: 6, loaded: 2, sha256: expect.stringMatching(/^[0-9a-f]{64}$/) });
    expect(l.refused.map(r => r.row)).toEqual([4, 5, 6, 7]);
    expect(l.refused.map(r => r.reason).join(' | ')).toMatch(/Kind must be.*twice.*Standing must be.*since must be a date/);
    const r = listOrganisations({ q: 'riverside' })[0]!;
    expect(r).toMatchObject({ previousNumber: 'PH-0042', standings: [{ state: 'granted', validUntil: '2027-02-01', conditions: ['Pharmacist on duty', 'No veterinary sales'] }] });
    expect(loadOrganisations({ register: 'nope', csv: CSV }, 'Registrar')).toHaveProperty('error');
  });

  it('withdraws only what nobody has acted on since', () => {
    const l = loadOrganisations({ register: 'business-licences', csv: CSV }, 'Registrar') as { id: string };
    const hill = listOrganisations({ q: 'hilltop' })[0]!;
    setStanding(hill.id, { register: 'business-licences', state: 'granted', reason: 'Reinstated by case' }, 'Registrar');
    expect(withdrawLoad(l.id, 'Registrar')).toMatchObject({ withdrawn: { removed: 1 } });
    expect(listOrganisations().map(o => o.versions[0]!.name)).toEqual(['Hilltop Pharmacy']);
    expect(withdrawLoad(l.id, 'Registrar')).toHaveProperty('error');
  });
});
