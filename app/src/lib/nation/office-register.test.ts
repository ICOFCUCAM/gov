// Offices of state as records (plan phase 4; audit F): the head of government
// derived from the executive title until the nation records one; recorded
// directly only during first-run setup; afterwards proposed citing the law and
// confirmed by a different official (by the institution itself when it is
// independent), every version kept, dates honoured; head of state and head of
// government separate offices; holding an office linked by one official and
// confirmed by another, ended with a reason and kept; and holding an office
// grants no permission (lib/auth/roles.ts is unchanged by it).
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { recordVersion as recordLaw, confirmVersion as confirmLaw, resetLaw } from '@/lib/law/register';
import { createMinistry } from '@/lib/data/store/ministries';
import { setSovereign, completeSetup } from '@/lib/data/store/sovereign';
import { recordTermsDuringSetup } from '@/lib/data/store/institutions';
import { db } from '@/lib/data/store/state';
import { resetOfficials, createAccount } from '@/lib/auth/officials';
import { apiPermission, caseActRefusal, caseReadRefusal, ministryPermission, adminOnly, type Scope } from '@/lib/auth/roles';
import { currentOffices } from '@/lib/nation/registry';
import {
  resetOffices, listOffices, getOffice, recordOfficeDuringSetup, proposeOffice, confirmOffice, withdrawOffice, officeHistory,
  proposeHolding, confirmHolding, endHolding, listHoldings, officesHeldBy, headOfficeTitles, DERIVED_HEAD_OF_GOVERNMENT, officesRecorded,
} from './office-register';

const mk = (name: string) => {
  const m = createMinistry({ archetype: 'GENERIC', name, slug: `${name.toLowerCase().replace(/\W+/g, '-')}-${Math.random().toString(36).slice(2, 7)}` });
  if ('error' in m) throw new Error(m.error);
  return m.id;
};
const A = { by: 'Admin A', byId: 'local:a', role: 'administrator' as const };
const B = { by: 'Admin B', byId: 'local:b', role: 'administrator' as const };
let basis: { instrument: string; eId: string }[];
const SETUP_TOKEN = 'test-setup-token-offices-0123456789';
process.env.CIVICOS_SETUP_TOKEN = SETUP_TOKEN;

beforeEach(async () => {
  resetOffices();
  resetOfficials();
  // The installation's first account (the setup code): every later account takes the role and institution it is given.
  await createAccount({ email: 'first@gov.test', name: 'First Admin', office: 'Administrator', password: 'correct horse battery', setupToken: SETUP_TOKEN }, null);
  resetLaw();
  db.setup = null;
  const law = recordLaw({ instrument: { title: 'Constitution', type: 'act', jurisdiction: 'X', year: 2020, number: '1', issuingAuthority: 'Assembly' }, dates: { inForce: '2020-01-01' }, provisions: [{ eId: 'art_1', num: '1', text: 'There is a Speaker.' }] }, 'L1', 'l1');
  if ('error' in law) throw new Error(law.error);
  confirmLaw(law.instrument.id, law.version.id, 'L2', 'l2');
  basis = [{ instrument: law.instrument.id, eId: 'art_1' }];
  setSovereign({ executiveTitle: 'Prime Minister' }, 'test');
});
afterEach(() => { db.setup = null; setSovereign({ executiveTitle: 'Head of Government', deployment: { authorities: {} } }, 'test'); });

describe('offices of state', () => {
  it('derives the head of government from the executive title until the nation records one, so nothing changes visibly', () => {
    const list = listOffices();
    expect(list).toHaveLength(1);
    expect(list[0]).toMatchObject({ id: DERIVED_HEAD_OF_GOVERNMENT, derived: true, title: 'Prime Minister', kind: 'head-of-government', powers: [] });
    expect(headOfficeTitles()).toEqual({});
    expect(officesRecorded()).toBe(0);
  });

  it('records head of state and head of government as separate offices during setup; the titles reach the nation\'s wording', () => {
    const exec = mk('Cabinet Office');
    const hos = recordOfficeDuringSetup({ title: 'President', kind: 'head-of-state', effectiveFrom: '2020-01-01' }, A);
    const hog = recordOfficeDuringSetup({ title: 'Prime Minister', kind: 'head-of-government', institution: exec, effectiveFrom: '2020-01-01', powers: ['authority:executive-office'] }, A);
    if ('error' in hos || 'error' in hog) throw new Error('not recorded');
    expect(hos.id).not.toBe(hog.id);
    expect(listOffices().some(o => o.derived)).toBe(false); // a recorded head of government replaces the derived one
    expect(headOfficeTitles()).toEqual({ headOfState: 'President', headOfGovernment: 'Prime Minister' });
    completeSetup('Admin A');
    expect(currentOffices()).toMatchObject({ headOfState: 'President', headOfGovernment: 'Prime Minister' });
    // After setup the direct path is closed.
    expect(recordOfficeDuringSetup({ id: hos.id, title: 'Monarch' }, A)).toMatchObject({ error: expect.stringMatching(/change process/) });
  });

  it('after setup changes only by proposal citing the law, confirmed by a different official; every version kept; dates honoured', () => {
    const assembly = mk('National Assembly');
    completeSetup('Admin A');
    expect(proposeOffice({ title: 'Speaker', kind: 'presiding-officer', institution: assembly }, A)).toMatchObject({ error: expect.stringMatching(/laws register/) });
    expect(proposeOffice({ title: 'Speaker', kind: 'Not A Key!', legalBasis: basis }, A)).toMatchObject({ error: expect.stringMatching(/kind of office/) });
    expect(proposeOffice({ title: 'Speaker', kind: 'presiding-officer', legalBasis: basis }, { by: 'Officer', byId: 'local:o', role: 'officer' })).toMatchObject({ error: expect.stringMatching(/administrator/) });
    const p = proposeOffice({ title: 'Speaker of the National Assembly', kind: 'presiding-officer', institution: assembly, term: { years: 5 }, acting: 'The Deputy Speaker', legalBasis: basis }, A);
    if ('error' in p) throw new Error(p.error);
    expect(getOffice(p.office)).toMatchObject({ status: 'proposed', inForce: false }); // not an office until confirmed
    expect(confirmOffice(p.office, A)).toMatchObject({ error: expect.stringMatching(/different/) });
    expect(confirmOffice(p.office, { by: 'Officer', byId: 'local:o', role: 'officer' })).toMatchObject({ error: expect.stringMatching(/administrator or an official who can sign/) });
    expect(confirmOffice(p.office, B)).toHaveProperty('confirmed');
    expect(getOffice(p.office)).toMatchObject({ status: 'in-force', title: 'Speaker of the National Assembly', term: { years: 5 }, acting: 'The Deputy Speaker' });
    // A later change with a future date: the current terms stay until then; both versions kept.
    const q = proposeOffice({ id: p.office, title: 'President of the National Assembly', effectiveFrom: '2999-01-01', legalBasis: basis }, B);
    expect(q).toHaveProperty('pending');
    expect(confirmOffice(p.office, A)).toHaveProperty('confirmed');
    expect(getOffice(p.office)!.title).toBe('Speaker of the National Assembly');
    expect(getOffice(p.office, new Date('2999-06-01'))!.title).toBe('President of the National Assembly');
    // Withdrawn proposals are kept too.
    expect(proposeOffice({ id: p.office, acting: 'The eldest member', legalBasis: basis }, A)).toHaveProperty('pending');
    expect(withdrawOffice(p.office, A, 'mistake')).toEqual({ ok: true });
    expect(officeHistory(p.office).history?.map(h => h.outcome)).toEqual(['adopted', 'adopted', 'withdrawn']);
  });

  it('an independent institution confirms changes to its own offices, not the government', async () => {
    const court = mk('Supreme Court');
    recordTermsDuringSetup(court, { standing: 'judiciary', branch: 'judiciary' }, 'Admin A');
    await createAccount({ email: 'judge@court.test', name: 'Judge Signer', office: 'Registrar', password: 'correct horse battery', role: 'signatory', institution: court }, 'Admin A');
    completeSetup('Admin A');
    const p = proposeOffice({ title: 'Chief Justice', kind: 'chief-justice', institution: court, legalBasis: basis }, A);
    if ('error' in p) throw new Error(p.error);
    expect(confirmOffice(p.office, B)).toMatchObject({ error: expect.stringMatching(/independent: an official who can sign there/) });
    expect(confirmOffice(p.office, { by: 'Judge Signer', byId: 'local:j', role: 'signatory', institution: court })).toHaveProperty('confirmed');
  });

  it('links an official to an office with a second official, ends it with a reason, keeps the history; the office grants no permission', async () => {
    const exec = mk('Cabinet Office');
    const assembly = mk('National Assembly');
    recordTermsDuringSetup(assembly, { standing: 'legislature', branch: 'legislature' }, 'Admin A');
    const speaker = recordOfficeDuringSetup({ title: 'Speaker', kind: 'presiding-officer', institution: assembly, effectiveFrom: '2020-01-01' }, A);
    const pm = recordOfficeDuringSetup({ title: 'Prime Minister', kind: 'head-of-government', institution: exec, effectiveFrom: '2020-01-01' }, A);
    if ('error' in speaker || 'error' in pm) throw new Error('not recorded');
    const holder = await createAccount({ email: 'officer@gov.test', name: 'O. Officer', office: 'Clerk', password: 'correct horse battery', role: 'officer', institution: exec }, 'Admin A');
    if ('error' in holder) throw new Error(holder.error);
    completeSetup('Admin A');

    // The derived head of government is not a record to link to.
    expect(proposeHolding({ officeId: DERIVED_HEAD_OF_GOVERNMENT, accountId: holder.id }, A)).toMatchObject({ error: expect.stringMatching(/Record the office first|No such office/) });
    // A whole-government administrator does not link the holder of an independent institution's office.
    const wholeAdmin = { by: 'Admin A', byId: 'local:a', role: 'administrator' as const };
    expect(proposeHolding({ officeId: speaker.id, accountId: holder.id }, wholeAdmin)).toMatchObject({ error: expect.stringMatching(/own institution/) });
    // An officer does not link anyone.
    expect(proposeHolding({ officeId: pm.id, accountId: holder.id }, { by: 'O', byId: 'local:o', role: 'officer' })).toMatchObject({ error: expect.stringMatching(/administrator/) });

    const h = proposeHolding({ officeId: pm.id, accountId: holder.id, legalBasis: basis }, wholeAdmin);
    if ('error' in h) throw new Error(h.error);
    expect(h.state).toBe('waiting');
    expect(officesHeldBy(holder.id)).toEqual([]); // not until confirmed
    expect(confirmHolding(h.id, wholeAdmin)).toMatchObject({ error: expect.stringMatching(/different/) });
    expect(confirmHolding(h.id, { by: 'O. Officer', byId: `local:${holder.id}`, role: 'signatory' })).toMatchObject({ error: expect.stringMatching(/own link/) });
    const c = confirmHolding(h.id, B);
    expect(c).toMatchObject({ state: 'active', confirmedBy: 'Admin B' });
    expect(officesHeldBy(holder.id)).toEqual([expect.objectContaining({ title: 'Prime Minister', kind: 'head-of-government' })]);

    // Holding the head of government's office grants nothing: the rules read role and institution only.
    const scope: Scope = { role: 'officer', institution: exec, bounds: { independent: [assembly], judicial: [] } };
    expect(apiPermission(scope, 'PUT', '/api/sovereign')).toMatch(/administrator/);
    expect(adminOnly(scope)).toMatch(/administrator/);
    expect(ministryPermission(scope, assembly)).not.toBeNull();
    expect(caseActRefusal({ id: `local:${holder.id}`, role: 'officer', institution: exec, bounds: scope.bounds }, { owner: assembly, judicial: false, independent: true, sensitivity: 'normal' })).not.toBeNull();
    expect(caseReadRefusal({ id: `local:${holder.id}`, role: 'officer', institution: exec, bounds: scope.bounds }, { owner: assembly, judicial: false, independent: true, sensitivity: 'normal' })).not.toBeNull();
    const rules = readFileSync(join(__dirname, '..', 'auth', 'roles.ts'), 'utf8');
    expect(rules).not.toMatch(/from '[^']*office-register'|heldOffices|officesHeldBy/);

    // Ending needs a reason; the ended holding is kept with its date.
    expect(endHolding(h.id, {}, wholeAdmin)).toMatchObject({ error: expect.stringMatching(/Say why/) });
    expect(endHolding(h.id, { reason: 'Term ended' }, wholeAdmin)).toMatchObject({ state: 'ended', endReason: 'Term ended' });
    expect(officesHeldBy(holder.id, new Date(Date.now() + 2 * 86_400_000))).toEqual([]);
    expect(listHoldings(pm.id).map(x => x.state)).toEqual(['ended']);
  });
});
