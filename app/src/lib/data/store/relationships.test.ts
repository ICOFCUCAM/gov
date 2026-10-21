// The relationship register (plan phase 3; guidance §3.3; audit E): proposed
// by one official citing the law, confirmed by a different one, by each
// independent institution at either end when it has officials who can sign;
// lapse, withdrawal, suspension and ending kept as versions; only approved
// relationships in force reach the rules (institutionBounds()). Nothing is
// shipped or approved by the platform. Mechanism tests: the relationships
// below are illustrative, recorded as a nation would record them.
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { recordVersion as recordLaw, confirmVersion as confirmLaw, resetLaw } from '@/lib/law/register';
import { createMinistry, deactivateMinistry } from './ministries';
import { setSovereign } from './sovereign';
import { db } from './state';
import { recordTermsDuringSetup, institutionBounds } from './institutions';
import {
  proposeRelationship, confirmRelationship, withdrawRelationshipProposal, listRelationships, getRelationship, relationshipGrants,
  resetRelationships, waitingRelationships,
} from './relationships';

const mk = (name: string, slug: string) => {
  const m = createMinistry({ archetype: 'GENERIC', name, slug: `${slug}-${Math.random().toString(36).slice(2, 7)}` });
  if ('error' in m) throw new Error(m.error);
  return m.id;
};
let basis: { instrument: string; eId: string }[];
const A = { by: 'Admin A', byId: 'local:a' };
const B = { by: 'Admin B', byId: 'local:b', role: 'administrator' };
const none = () => false;
const ok = <T,>(r: T | { error: string }): T => { if (r && typeof r === 'object' && 'error' in r) throw new Error((r as { error: string }).error); return r as T; };

beforeEach(() => {
  resetLaw();
  resetRelationships();
  const law = recordLaw({ instrument: { title: 'Public Audit Act', type: 'act', jurisdiction: 'X', year: 2020, number: '1', issuingAuthority: 'Parliament' }, dates: { inForce: '2020-01-01' }, provisions: [{ eId: 'sec_18', num: '18', text: 'The auditor may require information.' }] }, 'L1', 'l1');
  if ('error' in law) throw new Error(law.error);
  confirmLaw(law.instrument.id, law.version.id, 'L2', 'l2');
  basis = [{ instrument: law.instrument.id, eId: 'sec_18' }];
});
afterEach(() => { db.setup = null; setSovereign({ deployment: { authorities: {} } }, 'test'); });

const readScope = { recordTypes: ['cases'], purposes: ['Statutory financial audit'] };

describe('the relationship register', () => {
  it('ships nothing: no relationship, approved or draft, and no grant, in any installation mode', () => {
    for (const mode of ['production', 'training', 'demo']) {
      process.env.CIVICOS_MODE = mode;
      resetRelationships();
      expect(listRelationships()).toEqual([]);
      expect(relationshipGrants()).toEqual([]);
      expect(institutionBounds().relationships).toBeUndefined();
    }
    delete process.env.CIVICOS_MODE;
  });

  it('is proposed citing the law and approved only by a different official; every version kept', () => {
    const audit = mk('Audit Office', 'audit'), finance = mk('Ministry of Finance', 'fin');
    expect(proposeRelationship({ from: audit, to: finance, type: 'request_information', scope: readScope, legalBasis: [] }, A)).toMatchObject({ error: expect.stringMatching(/Cite the legal basis/) });
    expect(proposeRelationship({ from: audit, to: finance, type: 'request_information', scope: { recordTypes: ['cases'] }, legalBasis: basis }, A)).toMatchObject({ error: expect.stringMatching(/never means reading every record/) });
    expect(proposeRelationship({ from: audit, to: audit, type: 'audit', scope: readScope, legalBasis: basis }, A)).toMatchObject({ error: expect.stringMatching(/two different institutions/) });
    const { relationship: r } = ok(proposeRelationship({ from: audit, to: finance, type: 'request_information', scope: readScope, conditions: ['Authorised audit'], legalBasis: basis }, A));
    expect(r.status).toBe('draft');
    expect(relationshipGrants()).toEqual([]);
    expect(waitingRelationships().map(w => w.id)).toEqual([r.id]);
    // The proposer cannot confirm their own proposal.
    expect(confirmRelationship(r.id, { ...A, role: 'administrator' }, none)).toMatchObject({ error: expect.stringMatching(/different official/) });
    // An officer does not confirm.
    expect(confirmRelationship(r.id, { by: 'Officer', byId: 'local:o', role: 'officer' }, none)).toMatchObject({ error: expect.stringMatching(/administrator or an official who can sign/) });
    const done = ok(confirmRelationship(r.id, B, none)).relationship;
    expect(done).toMatchObject({ status: 'approved', inForce: true, version: 1 });
    expect(done.basis[0]).toMatchObject({ instrument: basis[0]!.instrument, eId: 'sec_18' });
    expect(relationshipGrants()).toEqual([{ id: r.id, version: 1, from: audit, to: finance, type: 'request_information', recordTypes: ['cases'], purposes: ['statutory financial audit'] }]);
    expect(institutionBounds().relationships?.[0]?.id).toBe(r.id);
    expect(done.history[0]).toMatchObject({ outcome: 'adopted', version: 1, by: 'Admin A', confirmed: { by: 'Admin B' } });
    // The two ends and the kind never change: a different relationship is a new record.
    expect(proposeRelationship({ id: r.id, to: audit, legalBasis: basis }, A)).toMatchObject({ error: expect.stringMatching(/stay as recorded/) });
  });

  it('suspending, ending or expiring stops the grant; earlier versions are superseded and kept', () => {
    const audit = mk('Audit Office', 'audit'), finance = mk('Ministry of Finance', 'fin');
    const { relationship: r } = ok(proposeRelationship({ from: audit, to: finance, type: 'audit', scope: readScope, legalBasis: basis }, A));
    ok(confirmRelationship(r.id, B, none));
    ok(proposeRelationship({ id: r.id, status: 'suspended', legalBasis: basis }, A));
    expect(relationshipGrants()).toHaveLength(1); // still in force until confirmed
    const s = ok(confirmRelationship(r.id, B, none)).relationship;
    expect(s).toMatchObject({ status: 'suspended', inForce: false, version: 2 });
    expect(relationshipGrants()).toEqual([]);
    expect(s.history.find(h => h.version === 1)?.superseded).toBe(true);
    ok(proposeRelationship({ id: r.id, legalBasis: basis }, A));
    expect(ok(confirmRelationship(r.id, B, none)).relationship).toMatchObject({ status: 'approved', inForce: true, version: 3 });
    // Ended (withdrawn).
    ok(proposeRelationship({ id: r.id, status: 'withdrawn', legalBasis: basis }, A));
    expect(ok(confirmRelationship(r.id, B, none)).relationship).toMatchObject({ status: 'withdrawn', inForce: false, version: 4 });
    expect(relationshipGrants()).toEqual([]);
    expect(getRelationship(r.id)!.history.filter(h => h.outcome === 'adopted')).toHaveLength(4);
    // Expired: approved, but its end date has passed.
    const { relationship: x } = ok(proposeRelationship({ from: audit, to: finance, type: 'audit', scope: readScope, effectiveFrom: '2024-01-01', effectiveTo: '2025-12-31', legalBasis: basis }, A));
    expect(ok(confirmRelationship(x.id, B, none)).relationship).toMatchObject({ status: 'approved', inForce: false });
    expect(relationshipGrants()).toEqual([]);
    // Scheduled: not before its date.
    const { relationship: y } = ok(proposeRelationship({ from: audit, to: finance, type: 'audit', scope: readScope, effectiveFrom: '2999-01-01', legalBasis: basis }, A));
    expect(ok(confirmRelationship(y.id, B, none)).relationship).toMatchObject({ status: 'approved', inForce: false });
    expect(relationshipGrants()).toEqual([]);
    expect(relationshipGrants(new Date('2999-01-02T00:00:00Z')).map(g => g.id)).toEqual([y.id]);
  });

  it('grants nothing once an end is no longer active', () => {
    const audit = mk('Audit Office', 'audit'), finance = mk('Ministry of Finance', 'fin');
    const { relationship: r } = ok(proposeRelationship({ from: audit, to: finance, type: 'audit', scope: readScope, legalBasis: basis }, A));
    ok(confirmRelationship(r.id, B, none));
    expect(relationshipGrants()).toHaveLength(1);
    deactivateMinistry(finance);
    expect(relationshipGrants()).toEqual([]);
  });

  it('lapses when not confirmed in time, and a withdrawn proposal is kept', () => {
    const audit = mk('Audit Office', 'audit'), finance = mk('Ministry of Finance', 'fin');
    const t0 = new Date();
    const { relationship: r } = ok(proposeRelationship({ from: audit, to: finance, type: 'audit', scope: readScope, legalBasis: basis }, A, t0));
    const later = new Date(t0.getTime() + 1000 * 3_600_000);
    expect(confirmRelationship(r.id, B, none, later)).toMatchObject({ error: expect.stringMatching(/No change is waiting/) });
    const lapsed = getRelationship(r.id)!;
    expect(lapsed.status).toBe('draft');
    expect(lapsed.history[0]).toMatchObject({ outcome: 'lapsed' });
    const { relationship: w } = ok(proposeRelationship({ from: finance, to: audit, type: 'receive_reports', legalBasis: basis }, A));
    ok(withdrawRelationshipProposal(w.id, 'Admin A', 'Drafted in error'));
    expect(getRelationship(w.id)).toMatchObject({ status: 'withdrawn', pending: null, history: [expect.objectContaining({ outcome: 'withdrawn' })] });
  });

  it('an independent end with officials who can sign confirms it itself; with two such ends, each confirms', () => {
    db.setup = null;
    const court = mk('High Court', 'court'), assembly = mk('National Assembly', 'assembly'), finance = mk('Ministry of Finance', 'fin');
    recordTermsDuringSetup(court, { standing: 'judiciary' }, 'Setup');
    recordTermsDuringSetup(assembly, { standing: 'legislature' }, 'Setup');
    const signers = (id: string) => id === court || id === assembly;
    const { relationship: r } = ok(proposeRelationship({ from: assembly, to: finance, type: 'receive_reports', legalBasis: basis }, A));
    expect(getRelationship(r.id, signers)!.confirmFrom.map(c => c.id)).toEqual([assembly]);
    expect(confirmRelationship(r.id, B, signers)).toMatchObject({ error: expect.stringMatching(/independent: an official who can sign there/) });
    expect(confirmRelationship(r.id, { by: 'Judge', byId: 'local:j', role: 'signatory', institution: court }, signers)).toMatchObject({ error: expect.stringMatching(/National Assembly/) });
    expect(ok(confirmRelationship(r.id, { by: 'Clerk', byId: 'local:c', role: 'signatory', institution: assembly }, signers)).relationship.status).toBe('approved');
    // Both ends independent: one official of each; the first is recorded and the proposal waits for the other.
    const { relationship: t } = ok(proposeRelationship({ from: assembly, to: court, type: 'fund', legalBasis: basis }, A));
    const first = ok(confirmRelationship(t.id, { by: 'Clerk', byId: 'local:c', role: 'signatory', institution: assembly }, signers));
    expect(first.waitingFor).toEqual([court]);
    expect(first.relationship.status).toBe('draft');
    expect(first.relationship.endorsed).toEqual([assembly]);
    expect(confirmRelationship(t.id, { by: 'Clerk 2', byId: 'local:c2', role: 'signatory', institution: assembly }, signers)).toMatchObject({ error: expect.stringMatching(/High Court/) });
    expect(ok(confirmRelationship(t.id, { by: 'Judge', byId: 'local:j', role: 'signatory', institution: court }, signers)).relationship.status).toBe('approved');
    // Without its own officials who can sign, an independent end falls back to a different official (as for standing) —
    // except an instruction to it, which only it confirms.
    const { relationship: i } = ok(proposeRelationship({ from: 'executive-office', to: court, type: 'instruct', legalBasis: basis }, A));
    expect(confirmRelationship(i.id, B, none)).toMatchObject({ error: expect.stringMatching(/instruction to it is confirmed by an official who can sign there/) });
    expect(proposeRelationship({ from: 'executive-office', to: court, type: 'audit', scope: readScope, legalBasis: basis }, A)).toMatchObject({ error: expect.stringMatching(/executive office/) });
  });
});
