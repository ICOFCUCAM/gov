import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { loadOrganisations, confirmLoad, withdrawLoad, listLoads } from './import';
import { resetOrganisations, listOrganisations, setStanding } from './register';
import { resetPermitAuthorities, draftMapping, approveMapping, suspendMapping } from '@/lib/permits/authority';
import { recordVersion, confirmVersion, resetLaw } from '@/lib/law/register';
import { resetDualControl } from '@/lib/casework/dual-control-policy';

const CSV = `name,kind,number,standing,since,valid_until,conditions,region
Riverside Pharmacy,pharmacy,PH-0042,granted,2024-02-01,2027-02-01,Pharmacist on duty; No veterinary sales,North
Hilltop Pharmacy,pharmacy,PH-0043,suspended,2025-06-01,,,
Bad Row,castle,X,granted,,,,
Riverside Pharmacy,pharmacy,PH-9999,granted,,,,
Lakeside Pharmacy,pharmacy,PH-0044,maybe,,,,
Old Pharmacy,pharmacy,PH-0045,granted,01/02/2024,,,`;

const propose = (now = new Date()) => {
  const l = loadOrganisations({ register: 'business-licences', csv: CSV }, 'Registrar', now, 'sub-registrar');
  if ('error' in l) throw new Error(l.error);
  return l;
};

describe('loading an existing register', () => {
  beforeEach(() => { resetOrganisations(); resetPermitAuthorities(); resetDualControl(); resetLaw(); });
  afterEach(() => vi.unstubAllEnvs());

  it('checks the rows and holds them until a second official confirms; refused rows keep their reasons and the file its hash', () => {
    const l = propose();
    expect(l).toMatchObject({ rows: 6, loaded: 0, proposed: 2, state: 'proposed', sha256: expect.stringMatching(/^[0-9a-f]{64}$/) });
    expect(l).not.toHaveProperty('staged');
    expect(l.refused.map(r => r.row)).toEqual([4, 5, 6, 7]);
    expect(l.refused.map(r => r.reason).join(' | ')).toMatch(/Kind must be.*twice.*Standing must be.*since must be a date/);
    expect(listOrganisations()).toEqual([]);
    expect(listLoads()[0]).not.toHaveProperty('staged');

    const c = confirmLoad(l.id, 'Deputy Registrar', new Date(), 'sub-deputy');
    if ('error' in c) throw new Error(c.error);
    expect(c).toMatchObject({ loaded: 2, state: 'confirmed', confirmed: { by: 'Deputy Registrar', independence: 'accounts-only' } });
    const r = listOrganisations({ q: 'riverside' })[0]!;
    expect(r).toMatchObject({ previousNumber: 'PH-0042', standings: [{ state: 'granted', validUntil: '2027-02-01', conditions: ['Pharmacist on duty', 'No veterinary sales'] }] });
    expect(loadOrganisations({ register: 'nope', csv: CSV }, 'Registrar')).toHaveProperty('error');
  });

  it('refuses confirmation by the official who proposed it, a second confirmation, and a confirmation after the waiting period', () => {
    const l = propose(new Date('2026-10-20T08:00:00Z'));
    expect(confirmLoad(l.id, 'Registrar', new Date('2026-10-20T09:00:00Z'), 'sub-registrar')).toMatchObject({ error: expect.stringMatching(/second, different official/) });
    expect(confirmLoad(l.id, 'Someone', new Date('2026-10-20T09:00:00Z'))).toMatchObject({ error: expect.stringMatching(/must sign in to confirm/) });
    expect(confirmLoad(l.id, 'Deputy', new Date('2026-10-21T09:00:00Z'), 'sub-deputy')).toMatchObject({ error: expect.stringMatching(/lapsed unconfirmed/) });
    expect(listLoads()[0]).toMatchObject({ state: 'lapsed' });
    expect(confirmLoad(l.id, 'Deputy', new Date('2026-10-21T09:00:00Z'), 'sub-deputy')).toMatchObject({ error: expect.stringMatching(/only a proposed load/) });
    expect(listOrganisations()).toEqual([]);

    const again = propose();
    expect(confirmLoad(again.id, 'Deputy', new Date(), 'sub-deputy')).toMatchObject({ state: 'confirmed', loaded: 2 });
    expect(confirmLoad(again.id, 'Other', new Date(), 'sub-other')).toMatchObject({ error: expect.stringMatching(/only a proposed load/) });
    expect(listOrganisations()).toHaveLength(2);
  });

  it('refuses a row that entered the register while the load waited', () => {
    const first = propose();
    const second = propose();
    confirmLoad(first.id, 'Deputy', new Date(), 'sub-deputy');
    expect(confirmLoad(second.id, 'Deputy', new Date(), 'sub-deputy')).toMatchObject({ loaded: 0, refused: expect.arrayContaining([{ row: 2, reason: expect.stringMatching(/entered the register after/) }]) });
    expect(listOrganisations()).toHaveLength(2);
  });

  it('in production, refuses a load without an approved authority mapping, and in every mode while the mapping is suspended', () => {
    vi.stubEnv('CIVICOS_MODE', 'production');
    expect(loadOrganisations({ register: 'business-licences', csv: CSV }, 'Registrar', new Date(), 'sub-registrar')).toMatchObject({ error: expect.stringMatching(/No approved authority mapping governs trading-licence/) });
    vi.unstubAllEnvs();
    const l = propose();
    const v = recordVersion({ instrument: { title: 'Trading Licences Act', type: 'act', jurisdiction: 'X', year: 2001, number: '2', issuingAuthority: 'Parliament' }, dates: { inForce: '2001-01-01' }, provisions: [{ eId: 'sec_3', num: '3', text: 'Licensing.' }] }, 'L1', 'l1');
    if ('error' in v) throw new Error(v.error);
    confirmVersion(v.instrument.id, v.version.id, 'L2', 'l2');
    draftMapping({ permitType: 'trading-licence', title: 'Trading licence', lead: 'businessRegister', effectiveFrom: '2020-01-01', legalBasis: [{ instrument: v.instrument.id, eId: 'sec_3' }] }, 'Admin A', 'aa');
    expect(approveMapping('trading-licence', 1, 'Admin B', 'ab')).not.toHaveProperty('error');
    expect(suspendMapping('trading-licence', 1, { reason: 'Fraud alert on licences' }, 'Admin C', 'ac')).not.toHaveProperty('error');
    // A load proposed before the suspension does not enter while it holds.
    expect(confirmLoad(l.id, 'Deputy', new Date(), 'sub-deputy')).toMatchObject({ error: expect.stringMatching(/suspended/) });
    expect(listOrganisations()).toEqual([]);
  });

  it('withdraws a proposed load with nothing entered, and a confirmed one only for what nobody has acted on since', () => {
    const p = propose();
    expect(withdrawLoad(p.id, 'Registrar')).toMatchObject({ state: 'withdrawn', withdrawn: { removed: 0 } });
    expect(confirmLoad(p.id, 'Deputy', new Date(), 'sub-deputy')).toHaveProperty('error');

    const l = propose();
    confirmLoad(l.id, 'Deputy', new Date(), 'sub-deputy');
    const hill = listOrganisations({ q: 'hilltop' })[0]!;
    setStanding(hill.id, { register: 'business-licences', state: 'granted', reason: 'Reinstated by case' }, 'Registrar');
    expect(withdrawLoad(l.id, 'Registrar')).toMatchObject({ withdrawn: { removed: 1 } });
    expect(listOrganisations().map(o => o.versions[0]!.name)).toEqual(['Hilltop Pharmacy']);
    expect(withdrawLoad(l.id, 'Registrar')).toHaveProperty('error');
  });
});
