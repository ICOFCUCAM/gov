import { asNationSets, setNationDays } from '@/lib/casework/testkit';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { openCase, act, attach, refer, resetCases, registeredEffects, type Actor } from './engine';
import { approvePackage, draftPackage, resetPackages } from './packages';
import { addDocument, resetDocuments } from '@/lib/records/documents';
import { resetDecisions } from '@/lib/records/decisions';
import { resetCertificates } from '@/lib/records/certificates';
import { setSovereign, listMinistries } from '@/lib/data/store';
import { installReferenceProcedures } from '@/lib/civil/procedures';
import { resetCivil, getEvent, getPerson } from '@/lib/civil/register';
import { ORGANISATION_PROCEDURES } from '@/lib/organisations/procedures';
import { resetOrganisations, getOrganisation, publicOrganisation } from '@/lib/organisations/register';

// Step I0.1 (docs/reviews/2026-10-institutional-baseline-audit.md §3.2): a sample case
// never opens or moves in production, and what a sample case writes to a register
// in a demo or training run is marked as a sample.

let CIVIL = '', REG = '';
const civil = (id: string, role: 'officer' | 'signatory' = 'officer'): Actor => ({ id, name: `Registrar ${id}`, scope: { id, role, institution: CIVIL } });
const reg = (id: string, role: 'officer' | 'signatory' = 'officer'): Actor => ({ id, name: `Official ${id}`, scope: { id, role, institution: REG } });
const pdf = new Uint8Array(Buffer.from('%PDF-1.7\nx\n%%EOF'));
const birth = { childGiven: 'Amara', childFamily: 'Okafor', sex: 'female', birthDate: '2026-09-01', birthPlace: 'District hospital', region: 'North', motherGiven: 'Ngozi', motherFamily: 'Okafor' };

async function step(id: string, action: string, who: Actor, extra: Record<string, unknown> = {}) {
  const r = await act(id, { action, ...extra }, who);
  if ('error' in r) throw new Error(`${action}: ${r.error}`);
  return r;
}

beforeEach(() => {
  vi.stubEnv('CIVICOS_MODE', 'demo');
  for (const r of [resetCivil, resetPackages, resetCases, resetDocuments, resetDecisions, resetCertificates, resetOrganisations]) r();
  vi.stubEnv('CIVICOS_DATA_KEK', Buffer.alloc(32, 4).toString('base64'));
  [CIVIL, REG] = listMinistries().slice(0, 2).map(m => m.id) as [string, string];
  setSovereign({ deployment: { authorities: { civilRegistration: CIVIL, businessRegister: REG } } }, 'test');
  installReferenceProcedures('Administrator');
  setNationDays();
  approvePackage('civil.birth', 1, 'Chief Registrar', 'chief', '2026-01-01', registeredEffects(), new Date('2026-01-01'));
  for (const p of ORGANISATION_PROCEDURES) {
    const d = draftPackage(asNationSets(p), 'Author', 'author', registeredEffects());
    if ('error' in d) throw new Error(`${p.key}: ${d.error}`);
    approvePackage(p.key, 1, 'Approver', 'approver', '2026-01-01', registeredEffects(), new Date('2026-01-01'));
  }
});
afterEach(() => vi.unstubAllEnvs());

async function sampleBirthToApproval() {
  const c = openCase({ procedure: 'civil.birth', fields: birth, source: 'sample' }, civil('clerk')) as { id: string; ref: string; source: string };
  expect(c.source).toBe('sample');
  await step(c.id, 'check', civil('clerk'));
  const d = addDocument({ class: 'birth-notification', title: 'Notification', institution: CIVIL, belongsTo: { kind: 'case', id: c.id }, bytes: pdf }, 'clerk') as { id: string };
  attach(c.id, d.id, civil('clerk'));
  await step(c.id, 'complete', civil('clerk'));
  await step(c.id, 'verify', civil('clerk'));
  return c;
}

describe('sample cases in production', () => {
  it('openCase refuses source: sample in a production installation', () => {
    vi.stubEnv('CIVICOS_MODE', 'production');
    const r = openCase({ procedure: 'civil.birth', fields: birth, source: 'sample' }, civil('clerk'));
    expect(r).toEqual({ error: expect.stringMatching(/no sample case/) });
    // A real case still opens.
    expect(openCase({ procedure: 'civil.birth', fields: birth }, civil('clerk'))).not.toHaveProperty('error');
  });

  it('refuses every step and decision on a sample case carried into production', async () => {
    const c = await sampleBirthToApproval();
    vi.stubEnv('CIVICOS_MODE', 'production');
    const r = await act(c.id, { action: 'register', reason: 'Notification verified' }, civil('r1', 'signatory'));
    expect(r).toEqual({ error: expect.stringMatching(/sample case/) });
    expect(getEvent('BR-2026-000001')).toBeUndefined();
    // A referral from it would be a sample too, and is refused.
    expect(refer(c.id, { procedure: 'civil.birth', reason: 'x' }, civil('clerk'))).toHaveProperty('error');
  });
});

describe('register entries written by sample cases are marked', () => {
  it('civil register: the vital event and the child\'s person record carry sample: true', async () => {
    const c = await sampleBirthToApproval();
    await step(c.id, 'register', civil('r1', 'signatory'), { reason: 'Notification verified' });
    await step(c.id, 'register', civil('r2', 'signatory'));
    const e = getEvent('BR-2026-000001')!;
    expect(e).toMatchObject({ case: c.id, sample: true });
    expect(getPerson('BR-2026-000001')).toMatchObject({ sample: true });
  });

  it('civil register: a real case writes no marker', async () => {
    const c = openCase({ procedure: 'civil.birth', fields: birth }, civil('clerk')) as { id: string };
    await step(c.id, 'check', civil('clerk'));
    const d = addDocument({ class: 'birth-notification', title: 'Notification', institution: CIVIL, belongsTo: { kind: 'case', id: c.id }, bytes: pdf }, 'clerk') as { id: string };
    attach(c.id, d.id, civil('clerk'));
    await step(c.id, 'complete', civil('clerk'));
    await step(c.id, 'verify', civil('clerk'));
    await step(c.id, 'register', civil('r1', 'signatory'), { reason: 'ok' });
    await step(c.id, 'register', civil('r2', 'signatory'));
    expect(getEvent('BR-2026-000001')).not.toHaveProperty('sample');
  });

  it('organisations register: the record, its standing step and the public view carry the marker', async () => {
    const c = openCase({ procedure: 'org.registration', fields: { orgName: 'Sample Traders Ltd', orgKind: 'company', representativeName: 'A. Owner' }, source: 'sample' }, reg('clerk')) as { id: string };
    for (const cls of ['constitution', 'representative-identity']) {
      const d = addDocument({ class: cls, title: cls, institution: REG, belongsTo: { kind: 'case', id: c.id }, bytes: pdf }, 'Clerk') as { id: string };
      attach(c.id, d.id, reg('clerk'));
    }
    await step(c.id, 'check', reg('clerk'));
    await step(c.id, 'verify', reg('clerk'));
    await step(c.id, 'register', reg('s1', 'signatory'), { reason: 'Documents in order' });
    const done = await step(c.id, 'register', reg('s2', 'signatory'));
    const number = String(done.decision!.content.facts!.organisation);
    const o = getOrganisation(number)!;
    expect(o.sample).toBe(true);
    expect(o.standings[0]!.history[0]).toMatchObject({ sample: true });
    expect(publicOrganisation(o)).toMatchObject({ sample: true });
  });
});
