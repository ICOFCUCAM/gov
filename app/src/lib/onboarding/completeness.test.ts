// Completeness per item (plan I2): each item read from its record with state,
// evidence, owner, date and next action, never a percentage; the activation
// gate in production is the critical items, not the composite score. And the
// capability manifest, computed from records, never from the archetype.
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { createMinistry, deactivateMinistry, activateMinistry, getMinistry, setSovereign } from '@/lib/data/store';
import { db } from '@/lib/data/store/state';
import { recordTermsDuringSetup } from '@/lib/data/store/institutions';
import { resetOfficials, createAccount } from '@/lib/auth/officials';
import { recordVersion, confirmVersion, resetLaw } from '@/lib/law/register';
import { resetPackages, draftPackage, approvePackage } from '@/lib/casework/packages';
import { registeredEffects } from '@/lib/casework/engine';
import '@/lib/casework/modules';
import { REFERENCE_PROCEDURES } from '@/lib/civil/procedures';
import { asNationSets } from '@/lib/casework/testkit';
const CIVIL_PROCEDURES_FOR_TEST = () => REFERENCE_PROCEDURES.map(p => asNationSets(p));
import { institutionCompleteness, activationRefusal } from './completeness';
import { onboardingStatus } from './status';
import { capabilityManifest } from '@/lib/institution/capabilities';
import { recordDepartmentDuringSetup } from '@/lib/institution/departments';

const SETUP_TOKEN = 'test-setup-token-completeness-0123456789';
process.env.CIVICOS_SETUP_TOKEN = SETUP_TOKEN;
process.env.CIVICOS_SCRYPT_N = '16384';
let inst = '';
let basis: { instrument: string; eId: string }[] = [];

beforeEach(async () => {
  resetOfficials(); resetLaw(); resetPackages(); db.setup = null;
  await createAccount({ email: 'first@gov.test', name: 'First', office: 'Administrator', password: 'correct horse battery', setupToken: SETUP_TOKEN }, null);
  const m = createMinistry({ archetype: 'GENERIC', name: 'Civil Registry', slug: `civil-${Math.random().toString(36).slice(2, 7)}` });
  if ('error' in m) throw new Error(m.error);
  inst = m.id;
  const law = recordVersion({ instrument: { title: 'Civil Registration Act', type: 'act', jurisdiction: 'X', year: 2020, number: '2', issuingAuthority: 'Parliament' }, dates: { inForce: '2020-01-01' }, provisions: [{ eId: 'sec_1', num: '1', text: 'There is a civil registry.' }] }, 'L1', 'l1');
  if ('error' in law) throw new Error(law.error);
  confirmVersion(law.instrument.id, law.version.id, 'L2', 'l2');
  basis = [{ instrument: law.instrument.id, eId: 'sec_1' }];
});
afterEach(() => { vi.unstubAllEnvs(); db.setup = null; setSovereign({ deployment: { authorities: {} } }, 'test'); });

describe('completeness per item', () => {
  it('reads each item from its record: state, owner and, while not verified, the next action; no percentage anywhere', () => {
    const c = institutionCompleteness(inst)!;
    expect(new Set(c.items.map(i => i.dimension))).toEqual(new Set(['legal', 'configuration', 'staffing', 'data', 'integrations', 'security', 'service', 'continuity', 'governance']));
    for (const i of c.items) {
      expect(i.owner.length, i.key).toBeGreaterThan(3);
      if (!['verified', 'not_applicable', 'not_assessed'].includes(i.state)) expect(i.next, i.key).toBeTruthy();
    }
    expect(JSON.stringify(c)).not.toMatch(/percent|"total"|"score"/);
    // An item no check exists for reads "not assessed", never passed.
    expect(c.items.find(i => i.key === 'load-test')!.state).toBe('not_assessed');
    expect(c.items.find(i => i.key === 'mandate')).toMatchObject({ state: 'not_started', critical: true });
  });

  it('turns verified from the records, with the evidence and its date', async () => {
    recordTermsDuringSetup(inst, { standing: 'executive-agency', effectiveFrom: '2021-01-01', legalBasis: basis }, 'Admin');
    for (const n of ['A', 'B']) await createAccount({ email: `${n}@gov.test`, name: `Signer ${n}`, office: 'Registrar', password: 'correct horse battery', role: 'signatory', institution: inst }, 'First');
    recordDepartmentDuringSetup(inst, { kind: 'establish', terms: { name: 'ICT and operations', functions: ['ict'], staff: [] }, reason: 'Order' }, { by: 'Admin' });
    const c = institutionCompleteness(inst)!;
    expect(c.items.find(i => i.key === 'mandate')).toMatchObject({ state: 'verified', date: '2021-01-01', evidence: expect.stringMatching(/Civil Registration Act/) });
    expect(c.items.find(i => i.key === 'separation')).toMatchObject({ state: 'verified', evidence: '2 official(s) who can sign' });
    expect(c.items.find(i => i.key === 'support-owners')).toMatchObject({ state: 'not_started', next: expect.stringMatching(/who serves in it/) });
    expect(c.gate.open).toBe(true);
  });

  it('is the activation gate in production: critical items, with owner and next action; the composite score gates nothing', () => {
    deactivateMinistry(inst, 'Admin');
    vi.stubEnv('CIVICOS_MODE', 'production');
    const why = activationRefusal(inst)!;
    expect(why).toMatch(/Mandate recorded/);
    expect(why).toMatch(/next:/);
    expect(activateMinistry(inst, 'Admin')).toMatchObject({ error: expect.stringMatching(/Not activated: .*Named officials/) });
    expect(getMinistry(inst)!.status).toBe('deactivated');
    vi.unstubAllEnvs();
    // A demonstration shows the gate but does not apply it.
    expect(institutionCompleteness(inst)!.gate.applies).toBe(false);
    expect(activateMinistry(inst, 'Admin')).not.toHaveProperty('error');
  });

  it('opens the gate in production once every critical item is verified', async () => {
    recordTermsDuringSetup(inst, { standing: 'executive-agency', legalBasis: basis }, 'Admin');
    for (const n of ['A', 'B']) await createAccount({ email: `${n}@gov.test`, name: `Signer ${n}`, office: 'Registrar', password: 'correct horse battery', role: 'signatory', institution: inst }, 'First');
    deactivateMinistry(inst, 'Admin');
    vi.stubEnv('CIVICOS_MODE', 'production');
    expect(activationRefusal(inst)).toBeNull();
    expect(activateMinistry(inst, 'Admin')).not.toHaveProperty('error');
  });

  it('shows owner, date and next action on the onboarding hub\'s items, and each institution\'s critical items', () => {
    const s = onboardingStatus();
    for (const t of s.tracks) for (const c of t.checks) {
      expect(c.owner, `${t.key}: ${c.label}`).toBeTruthy();
      if (!c.done) expect(c.next, `${t.key}: ${c.label}`).toBeTruthy();
    }
    expect(s.tracks.some(t => t.key === 'administration')).toBe(true);
    expect(s.institutions.find(i => i.id === inst)?.failing.map(f => f.key)).toEqual(expect.arrayContaining(['mandate', 'officials']));
  });
});

describe('the capability manifest', () => {
  it('lists what the institution has from the records: responsibilities, registers, procedures in force and drafts, departments', () => {
    setSovereign({ deployment: { authorities: { civilRegistration: inst } } }, 'test');
    for (const p of CIVIL_PROCEDURES_FOR_TEST()) {
      const d = draftPackage(p, 'Author', 'author', registeredEffects());
      if ('error' in d) throw new Error(d.error);
    }
    const first = CIVIL_PROCEDURES_FOR_TEST()[0]!;
    expect(approvePackage(first.key, 1, 'Approver', 'approver', '2026-01-01', registeredEffects(), new Date('2026-01-01'))).not.toHaveProperty('error');
    const m = capabilityManifest(inst, new Date('2026-10-21'))!;
    expect(m.responsibilities.map(r => r.key)).toContain('civilRegistration');
    expect(m.registers.map(r => r.id)).toContain('civil');
    expect(m.procedures.inForce.map(p => p.key)).toEqual([first.key]);
    expect(m.procedures.drafts.length).toBe(CIVIL_PROCEDURES_FOR_TEST().length - 1);
    expect(m.administration.find(a => a.function === 'hr')!.procedures.every(p => p.state === 'not adopted')).toBe(true);
    // Not from the archetype's blueprint: a GENERIC institution named for civil registration has what it was given.
    expect(m.note).toMatch(/template and is not counted/);
  });
});
