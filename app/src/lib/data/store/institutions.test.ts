// The institution register's constitutional terms (plan phase 1; audit B, I):
// defaults for records from before, recorded directly only during first-run
// setup, afterwards proposed citing the law and confirmed by a different
// official (by the institution itself when it is independent), every version
// kept, effective dates honoured; who is independent read from the terms and
// the slots that make one so.
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { recordVersion as recordLaw, confirmVersion as confirmLaw, resetLaw } from '@/lib/law/register';
import { createMinistry, getMinistry, listMinistries } from './ministries';
import { setSovereign, completeSetup } from './sovereign';
import { db } from './state';
import {
  termsOf, independentTerms, institutionBounds, isIndependentInstitution, recordTermsDuringSetup, proposeInstitutionTerms,
  confirmInstitutionTerms, withdrawInstitutionTerms, structuralRefusal, independentTargets, scheduledTerms,
} from './institutions';

const mk = (name: string, slug: string) => {
  const m = createMinistry({ archetype: 'GENERIC', name, slug: `${slug}-${Math.random().toString(36).slice(2, 7)}` });
  if ('error' in m) throw new Error(m.error);
  return m.id;
};
let basis: { instrument: string; eId: string }[];
const A = { by: 'Admin A', byId: 'local:a' };
const B = { by: 'Admin B', byId: 'local:b', role: 'administrator' };

beforeEach(() => {
  resetLaw();
  const law = recordLaw({ instrument: { title: 'Courts Act', type: 'act', jurisdiction: 'X', year: 2020, number: '1', issuingAuthority: 'Parliament' }, dates: { inForce: '2020-01-01' }, provisions: [{ eId: 'sec_1', num: '1', text: 'The courts are independent.' }] }, 'L1', 'l1');
  if ('error' in law) throw new Error(law.error);
  confirmLaw(law.instrument.id, law.version.id, 'L2', 'l2');
  basis = [{ instrument: law.instrument.id, eId: 'sec_1' }];
});
afterEach(() => { db.setup = null; setSovereign({ deployment: { authorities: {} } }, 'test'); });

describe('the institution register\'s constitutional terms', () => {
  it('reads records from before as an executive ministry with no independence claims', () => {
    const m = listMinistries()[0]!;
    expect(m.standing).toBe('executive-ministry');
    const t = termsOf(m);
    expect(t).toMatchObject({ standing: 'executive-ministry', independence: {}, prohibitions: [], records: [] });
    expect(isIndependentInstitution(m.id)).toBe(false);
  });

  it('counts independence per dimension: a statutory body is independent only when its decisions are protected', () => {
    expect(independentTerms({ standing: 'judiciary', independence: {} })).toBe(true);
    expect(independentTerms({ standing: 'legislature', independence: {} })).toBe(true);
    expect(independentTerms({ standing: 'head-of-state', independence: {} })).toBe(true);
    expect(independentTerms({ standing: 'independent-constitutional', independence: {} })).toBe(true);
    expect(independentTerms({ standing: 'independent-statutory', independence: { funding: { protected: true } } })).toBe(false);
    expect(independentTerms({ standing: 'independent-statutory', independence: { decisions: { protected: true } } })).toBe(true);
    expect(independentTerms({ standing: 'executive-agency', independence: { decisions: { protected: true } } })).toBe(false);
    expect(independentTerms({ standing: 'subnational', independence: {} })).toBe(false);
  });

  it('is recorded directly during first-run setup only', () => {
    const court = mk('Supreme Court', 'court');
    const r = recordTermsDuringSetup(court, { standing: 'judiciary', branch: 'judiciary', independence: { decisions: { protected: true, actor: 'Judges alone' }, appointment: { protected: true, actor: 'Judicial Service Commission' } }, records: ['Judgments'] }, 'Admin A');
    expect(r).toMatchObject({ standing: 'judiciary', branch: 'judiciary', records: ['Judgments'] });
    expect(isIndependentInstitution(court)).toBe(true);
    expect(institutionBounds().judicial).toContain(court);
    completeSetup('Admin A');
    expect(recordTermsDuringSetup(court, { standing: 'executive-agency' }, 'Admin A')).toMatchObject({ error: expect.stringMatching(/change process/) });
    expect(termsOf(getMinistry(court)!).standing).toBe('judiciary');
  });

  it('after setup changes only by proposal citing the law and a different official\'s confirmation, every version kept', () => {
    const body = mk('Electoral Commission', 'elec');
    completeSetup('Admin A');
    expect(proposeInstitutionTerms(body, { standing: 'independent-constitutional', legalBasis: [] }, A)).toMatchObject({ error: expect.stringMatching(/laws register/) });
    expect(proposeInstitutionTerms(body, { standing: 'nonsense', legalBasis: basis }, A)).toMatchObject({ error: expect.stringMatching(/Standing must be/) });
    expect(proposeInstitutionTerms(body, { independence: { decisions: { protected: 'yes' } }, legalBasis: basis }, A)).toMatchObject({ error: expect.stringMatching(/protected: true or false/) });
    const p = proposeInstitutionTerms(body, { standing: 'independent-constitutional', branch: 'electoral', independence: { decisions: { protected: true } }, legalBasis: basis }, A);
    expect(p).toHaveProperty('expiresAt');
    expect(isIndependentInstitution(body)).toBe(false); // not until confirmed
    expect(confirmInstitutionTerms(body, { by: 'Admin A', byId: 'local:a', role: 'administrator' }, { ownSigners: false })).toMatchObject({ error: expect.stringMatching(/different/) });
    expect(confirmInstitutionTerms(body, { by: 'Officer', byId: 'local:o', role: 'officer' }, { ownSigners: false })).toMatchObject({ error: expect.stringMatching(/administrator or an official who can sign/) });
    // The body would become independent and has its own officials who can sign: one of them confirms, not the government.
    expect(confirmInstitutionTerms(body, B, { ownSigners: true })).toMatchObject({ error: expect.stringMatching(/independent: an official who can sign there/) });
    const c = confirmInstitutionTerms(body, { by: 'Commissioner', byId: 'local:c', role: 'signatory', institution: body }, { ownSigners: true });
    expect(c).toHaveProperty('confirmed');
    expect(isIndependentInstitution(body)).toBe(true);
    const m = getMinistry(body)!;
    expect(m.standing).toBe('independent-constitutional');
    expect(m.basis?.[0]).toMatchObject({ eId: 'sec_1' });
    expect(m.terms?.history?.map(h => h.outcome)).toEqual(['adopted']);
  });

  it('confirms a change to an executive ministry by any different administrator, and keeps withdrawn proposals', () => {
    const agency = mk('Roads Agency', 'roads');
    completeSetup('Admin A');
    proposeInstitutionTerms(agency, { standing: 'executive-agency', legalBasis: basis }, A);
    expect(withdrawInstitutionTerms(agency, 'Admin A')).toEqual({ ok: true });
    proposeInstitutionTerms(agency, { standing: 'executive-agency', legalBasis: basis }, A);
    expect(confirmInstitutionTerms(agency, B, { ownSigners: true })).toHaveProperty('confirmed');
    expect(termsOf(getMinistry(agency)!).standing).toBe('executive-agency');
    expect(getMinistry(agency)!.terms?.history?.map(h => h.outcome)).toEqual(['withdrawn', 'adopted']);
  });

  it('applies an adopted change from its date, not before', () => {
    const ombud = mk('Ombudsman', 'ombud');
    completeSetup('Admin A');
    const later = new Date(Date.now() + 40 * 86_400_000).toISOString().slice(0, 10);
    proposeInstitutionTerms(ombud, { standing: 'independent-statutory', independence: { decisions: { protected: true } }, effectiveFrom: later, legalBasis: basis }, A);
    confirmInstitutionTerms(ombud, B, { ownSigners: false });
    expect(isIndependentInstitution(ombud)).toBe(false);
    expect(scheduledTerms(getMinistry(ombud)!)).toHaveLength(1);
    expect(isIndependentInstitution(ombud, new Date(Date.now() + 41 * 86_400_000))).toBe(true);
  });

  it('keeps renaming, merging and deactivating an independent institution to the change process', () => {
    const assembly = mk('National Assembly', 'assembly');
    const ministry = mk('Ministry of Works', 'works');
    recordTermsDuringSetup(assembly, { standing: 'legislature', branch: 'legislature' }, 'Admin A');
    expect(structuralRefusal(assembly)).toBeNull(); // during setup, the registry's own actions as before
    completeSetup('Admin A');
    expect(structuralRefusal(assembly)).toMatch(/independent: renaming, merging or deactivating/);
    expect(structuralRefusal(ministry, assembly)).toMatch(/National Assembly is independent/);
    expect(structuralRefusal(ministry)).toBeNull();
    // Merging into an independent institution is refused; renaming it goes through its own confirmation.
    expect(proposeInstitutionTerms(ministry, { change: { kind: 'merge', into: assembly }, legalBasis: basis }, A)).toMatchObject({ error: expect.stringMatching(/independent/) });
    proposeInstitutionTerms(assembly, { change: { kind: 'rename', name: 'House of Assembly' }, legalBasis: basis }, A);
    expect(confirmInstitutionTerms(assembly, B, { ownSigners: true })).toHaveProperty('error');
    expect(confirmInstitutionTerms(assembly, { by: 'Clerk', byId: 'local:clerk', role: 'signatory', institution: assembly }, { ownSigners: true })).toHaveProperty('confirmed');
    expect(getMinistry(assembly)!.name).toBe('House of Assembly');
  });

  it('makes the bodies named for the judiciary, data protection, legislature, head of state, a constitutional court and the oversight bodies independent; others only by standing', () => {
    const [j, dp, leg, hos, cc, audit, central] = ['Courts', 'Data Commissioner', 'Parliament', 'Royal Household', 'Constitutional Council', 'Audit Office', 'Central Bank'].map((n, i) => mk(n, `slot${i}`));
    setSovereign({ deployment: { authorities: { judiciary: j!, dataProtection: dp!, legislature: leg!, headOfState: hos!, constitutionalCourt: cc!, supremeAudit: audit!, centralBank: central! } } }, 'test');
    const b = institutionBounds();
    for (const id of [j, dp, leg, hos, cc]) expect(b.independent).toContain(id);
    expect(b.judicial).toEqual(expect.arrayContaining([j, cc]));
    expect(b.judicial).not.toContain(leg);
    // Plan step I8: the oversight bodies (public audit office, ombudsman, human rights, anti-corruption) keep their own records.
    expect(b.independent).toContain(audit);
    expect(b.independent).not.toContain(central);
    // Its power to read another independent body's case still needs its recorded standing.
    expect(b.audit).toBeUndefined(); // named, but not recorded as set up by the constitution
    recordTermsDuringSetup(audit!, { standing: 'independent-constitutional' }, 'Admin A');
    expect(institutionBounds().audit).toBe(audit);
    expect(institutionBounds().independent).toContain(audit);
    expect(independentTargets(['Parliament', 'min-health', 'unknown'])).toEqual([{ target: 'Parliament', id: leg, name: 'Parliament' }]);
  });
});
