// Negative authorization (docs/CONSTITUTIONAL_ARCHITECTURE.md §8.4 test 2; plan
// phase 2; audit C, D, L): no executive scope reaches a legislature's, a
// court's or an independent body's records, workspace, site archive or
// accounts. Officials serving the whole government (administrators, officers,
// auditors) are refused there through the real routes and rules; the
// institutions' own officials keep their work; executive institutions are
// unchanged. These are mechanism tests, not legal mappings: the standings
// below are illustrative, recorded as a nation would record them.
import { describe, it, expect, beforeAll, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { resetOfficials, createAccount, sessionSecret, accountById, listAccounts } from '@/lib/auth/officials';
import { signClaims } from '@/lib/auth/session-token';
import { createMinistry, setSovereign, recordTermsDuringSetup, institutionBounds, completeSetup } from '@/lib/data/store';
import { recordVersion, confirmVersion } from '@/lib/law/register';
import { listAccess } from '@/lib/records/access-log';
import { caseFacts } from '@/lib/casework/engine';
import type { Case } from '@/lib/casework/types';
import {
  canReadInstitution, ministryPermission, canDownloadSiteArchive, canActForSite, caseReadRefusal, caseActRefusal,
  canSeeDraft, canSignDirective, accountChangeRule, apiPermission, type Scope,
} from './roles';

const SETUP_TOKEN = 'test-setup-token-0123456789abcdef';
process.env.CIVICOS_SETUP_TOKEN = SETUP_TOKEN;
process.env.CIVICOS_SCRYPT_N = '16384';

let cookie: string | undefined;
vi.mock('next/headers', () => ({ cookies: () => ({ get: () => (cookie ? { value: cookie } : undefined) }), headers: () => new Headers() }));

const queue = await import('@/app/api/org/ministries/[id]/queue/route');
const officials = await import('@/app/api/auth/officials/route');
const official = await import('@/app/api/auth/officials/[id]/route');
const changes = await import('@/app/api/auth/account-changes/[id]/route');
const directives = await import('@/app/api/directives/route');
const standing = await import('@/app/api/org/ministries/[id]/standing/route');

const PW = 'correct horse battery';
const post = (url: string, body: unknown) => new NextRequest(`http://localhost${url}`, { method: 'POST', body: JSON.stringify(body) });
const get = (url: string) => new NextRequest(`http://localhost${url}`);
const ctx = (id: string) => ({ params: Promise.resolve({ id }) });
async function as(id: string) {
  const now = Math.floor(Date.now() / 1000);
  cookie = await signClaims({ sub: `local:${id}`, name: 'x', method: 'local', iat: now, exp: now + 600 }, sessionSecret());
}
const mk = (name: string, slug: string) => { const m = createMinistry({ archetype: 'GENERIC', name, slug }); if ('error' in m) throw new Error(m.error); return m.id; };
const account = async (email: string, role: string, institution?: string) => {
  const a = await createAccount({ email, name: email.split('@')[0], office: 'Office', password: PW, role, institution }, 'Setup');
  if ('error' in a) throw new Error(a.error);
  return a.id;
};

const HEALTH = 'min-health';
let court: string, assembly: string, commission: string, auditOffice: string;
const ids: Record<string, string> = {};

beforeAll(async () => {
  resetOfficials();
  court = mk('High Court', 'high-court');
  assembly = mk('National Assembly', 'national-assembly');
  commission = mk('Electoral Commission', 'electoral-commission');
  auditOffice = mk('Audit Office', 'audit-office');
  // The nation records the standings during first-run setup (illustrative values).
  recordTermsDuringSetup(court, { standing: 'judiciary', branch: 'judiciary' }, 'Setup');
  recordTermsDuringSetup(assembly, { standing: 'legislature', branch: 'legislature' }, 'Setup');
  recordTermsDuringSetup(commission, { standing: 'independent-statutory', independence: { decisions: { protected: true } } }, 'Setup');
  recordTermsDuringSetup(auditOffice, { standing: 'independent-constitutional', branch: 'oversight' }, 'Setup');
  setSovereign({ deployment: { authorities: { judiciary: court, supremeAudit: auditOffice } } }, 'Setup');
  ids.admin = (await createAccount({ email: 'admin@gov.test', name: 'Admin', office: 'Head of Service', password: PW, setupToken: SETUP_TOKEN }, null) as { id: string }).id;
  ids.admin2 = await account('admin2@gov.test', 'administrator');
  ids.officer = await account('officer@gov.test', 'officer');
  ids.auditor = await account('auditor@gov.test', 'auditor');
  ids.signer = await account('signer@gov.test', 'signatory');
  ids.courtSigner = await account('judge@gov.test', 'signatory', court);
  ids.courtAdmin = await account('courtadmin@gov.test', 'administrator', court);
  ids.clerk = await account('clerk@gov.test', 'signatory', assembly);
  ids.healthAdmin = await account('healthadmin@gov.test', 'administrator', HEALTH);
  ids.publicAuditor = await account('auditor@audit.test', 'auditor', auditOffice);
  completeSetup('Setup');
});

describe('whole-government scope stops at independent institutions', () => {
  it('records who is independent from the register and the slots', () => {
    const b = institutionBounds();
    expect(b.independent).toEqual(expect.arrayContaining([court, assembly, commission, auditOffice]));
    expect(b.independent).not.toContain(HEALTH);
    expect(b.judicial).toEqual([court]);
    expect(b.audit).toBe(auditOffice);
  });

  it('refuses a whole-government administrator, officer and auditor the queue of a court, the legislature and an independent body; the refusal is logged', async () => {
    for (const who of ['admin', 'officer', 'auditor'] as const) {
      await as(ids[who]!);
      for (const inst of [court, assembly, commission]) {
        const r = await queue.GET(get(`/api/org/ministries/${inst}/queue`), ctx(inst));
        expect(r.status, `${who} → ${inst}`).toBe(403);
        expect((await r.json()).error).toMatch(/independent/);
      }
      // Executive institutions are unchanged.
      expect((await queue.GET(get(`/api/org/ministries/${HEALTH}/queue`), ctx(HEALTH))).status).toBe(200);
    }
    expect(listAccess({ register: 'institution-queue' }).some(e => e.record.id === court && e.result === 'refused')).toBe(true);
    await as(ids.courtSigner!);
    expect((await queue.GET(get(`/api/org/ministries/${court}/queue`), ctx(court))).status).toBe(200);
    await as(ids.clerk!);
    expect((await queue.GET(get(`/api/org/ministries/${court}/queue`), ctx(court))).status).toBe(403);
  });

  it('refuses whole-government action in the workspace, the site archive and the website; keeps the institution\'s own', () => {
    const b = institutionBounds();
    const wg: Scope = { role: 'administrator', bounds: b };
    const own: Scope = { role: 'signatory', institution: court, bounds: b };
    for (const inst of [court, assembly, commission]) {
      expect(ministryPermission(wg, inst)).toMatch(/independent/);
      expect(canDownloadSiteArchive(wg, inst)).toMatch(/independent/);
      expect(canActForSite(wg, inst)).toMatch(/independent/);
      expect(canReadInstitution({ role: 'auditor', bounds: b }, inst)).toMatch(/independent/);
      expect(apiPermission(wg, 'POST', `/api/org/ministries/${inst}/queue`)).toMatch(/independent/);
    }
    expect(ministryPermission(own, court)).toBeNull();
    expect(canDownloadSiteArchive({ role: 'auditor', institution: court, bounds: b }, court)).toBeNull();
    expect(ministryPermission(wg, HEALTH)).toBeNull();
    expect(canDownloadSiteArchive(wg, HEALTH)).toBeNull();
    expect(canActForSite(wg, HEALTH)).toBeNull();
    expect(canReadInstitution({ role: 'auditor', bounds: b }, HEALTH)).toBeNull();
  });

  it('closes an independent institution\'s cases and documents to the whole government; the public audit office reads a body\'s case with a purpose, never a court\'s', () => {
    const b = institutionBounds();
    const courtCase = caseFacts({ owner: court, sensitivity: 'normal' } as Case);
    const bodyCase = caseFacts({ owner: commission, sensitivity: 'normal' } as Case);
    const healthCase = caseFacts({ owner: HEALTH, sensitivity: 'normal' } as Case);
    expect(courtCase).toMatchObject({ judicial: true, independent: true });
    expect(bodyCase).toMatchObject({ judicial: false, independent: true });
    for (const role of ['administrator', 'officer', 'auditor', 'signatory'] as const) {
      const s = { role, bounds: b };
      expect(caseReadRefusal(s, courtCase, 'audit')).toMatch(/court/);
      expect(caseReadRefusal(s, bodyCase, 'audit')).toMatch(/independent/);
      expect(caseActRefusal(s, bodyCase)).toBeTruthy();
    }
    expect(caseReadRefusal({ role: 'officer', bounds: b }, healthCase)).toBeNull();
    const pub = { role: 'auditor' as const, institution: auditOffice, bounds: b };
    expect(caseReadRefusal(pub, bodyCase)).toMatch(/Say why/);
    expect(caseReadRefusal(pub, bodyCase, 'Annual audit of electoral spending')).toBeNull();
    expect(caseReadRefusal(pub, courtCase, 'Annual audit')).toMatch(/court/);
    expect(caseReadRefusal({ role: 'officer', institution: commission, bounds: b }, bodyCase)).toBeNull();
  });
});

describe('independent institutions keep their own accounts', () => {
  it('a whole-government administrator\'s new court account waits for a court signatory, who receives the reset code', async () => {
    await as(ids.admin!);
    const r = await officials.POST(post('/api/auth/officials', { email: 'clerk2@court.test', name: 'Court Clerk', office: 'Registrar', password: PW, role: 'officer', institution: court }));
    expect(r.status).toBe(202);
    const { pending } = await r.json();
    expect(listAccounts().some(a => a.email === 'clerk2@court.test')).toBe(false);
    // Another whole-government administrator cannot confirm it; the clerk of the legislature cannot either.
    await as(ids.admin2!);
    expect((await changes.POST(post(`/api/auth/account-changes/${pending.id}`, { op: 'confirm' }), ctx(pending.id))).status).toBe(403);
    await as(ids.clerk!);
    expect((await changes.POST(post(`/api/auth/account-changes/${pending.id}`, { op: 'confirm' }), ctx(pending.id))).status).toBe(403);
    await as(ids.courtSigner!);
    const c = await changes.POST(post(`/api/auth/account-changes/${pending.id}`, { op: 'confirm' }), ctx(pending.id));
    expect(c.status).toBe(200);
    const done = await c.json();
    expect(done.code).toBeTruthy();
    expect(done.change.state).toBe('done');
    expect(listAccounts().find(a => a.email === 'clerk2@court.test')).toMatchObject({ institution: court, role: 'officer' });
  });

  it('re-roling, disabling or resetting a court account waits for the court; moving an account into the legislature waits for the legislature', async () => {
    await as(ids.admin!);
    for (const body of [{ role: 'administrator' }, { disabled: true }, { resetTwoStep: true }, { issueReset: true }]) {
      const r = await official.POST(post(`/api/auth/officials/${ids.courtSigner}`, body), ctx(ids.courtSigner!));
      expect(r.status, JSON.stringify(body)).toBe(202);
    }
    expect(accountById(ids.courtSigner!)?.role).toBe('signatory');
    expect(accountById(ids.courtSigner!)?.disabled).toBeFalsy();
    const move = await official.POST(post(`/api/auth/officials/${ids.officer}`, { institution: assembly }), ctx(ids.officer!));
    expect(move.status).toBe(202);
    expect((await move.json()).pending.confirmFrom).toEqual([assembly]);
  });

  it('the court\'s own administrator acts directly; another institution\'s administrator is refused; executive accounts are unchanged', async () => {
    await as(ids.courtAdmin!);
    expect((await officials.POST(post('/api/auth/officials', { email: 'usher@court.test', name: 'Usher', office: 'Usher', password: PW, role: 'officer', institution: court }))).status).toBe(201);
    await as(ids.healthAdmin!);
    expect((await officials.POST(post('/api/auth/officials', { email: 'x@court.test', name: 'X', office: 'X', password: PW, role: 'officer', institution: court }))).status).toBe(403);
    expect((await official.POST(post(`/api/auth/officials/${ids.courtSigner}`, { disabled: true }), ctx(ids.courtSigner!))).status).toBe(403);
    await as(ids.admin!);
    expect((await officials.POST(post('/api/auth/officials', { email: 'nurse@health.test', name: 'Nurse', office: 'Nurse', password: PW, role: 'officer', institution: HEALTH }))).status).toBe(201);
    expect(accountChangeRule({ role: 'administrator', bounds: institutionBounds() }, [HEALTH])).toBeNull();
  });
});

describe('directives respect independence', () => {
  it('issues as the executive office for the whole government, and addresses an independent body only with a request or communication', async () => {
    const law = recordVersion({ instrument: { title: 'Constitution', type: 'act', jurisdiction: 'X', year: 2000, number: '1', issuingAuthority: 'People' }, dates: { inForce: '2000-01-01' }, provisions: [{ eId: 'art_1', num: '1', text: 'x' }] }, 'L1', 'l1');
    if ('error' in law) throw new Error(law.error);
    confirmVersion(law.instrument.id, law.version.id, 'L2', 'l2');
    await as(ids.signer!);
    const r = await directives.POST(post('/api/directives', { ref: 'DIR-SOP-1', title: 'Budget call', kind: 'instruction', issuedByCharterId: court, targets: [HEALTH] }));
    expect(r.status).toBe(201);
    expect((await r.json()).directive.issued_by_charter_id).toBe('executive-office');
    const refused = await directives.POST(post('/api/directives', { ref: 'DIR-SOP-2', title: 'Order to the Assembly', kind: 'instruction', targets: ['National Assembly'] }));
    expect(refused.status).toBe(422);
    expect((await refused.json()).error).toMatch(/independent and cannot be instructed/);
    expect((await directives.POST(post('/api/directives', { ref: 'DIR-SOP-3', title: 'Request for a hearing date', kind: 'request', targets: [assembly] }))).status).toBe(201);
    const b = institutionBounds();
    expect(canSignDirective({ role: 'signatory', bounds: b }, court)).toMatch(/needs an account/);
    expect(canSignDirective({ role: 'signatory', institution: court, bounds: b }, court)).toBeNull();
    expect(canSeeDraft({ role: 'administrator', bounds: b }, court)).toBe(false);
  });
});

describe('an independent institution\'s standing changes with its own confirmation', () => {
  it('a whole-government administrator proposes citing the law; another whole-government administrator cannot confirm; the court can', async () => {
    const law = recordVersion({ instrument: { title: 'Judiciary Act', type: 'act', jurisdiction: 'X', year: 2010, number: '3', issuingAuthority: 'Parliament' }, dates: { inForce: '2010-01-01' }, provisions: [{ eId: 'sec_9', num: '9', text: 'x' }] }, 'L1', 'l1');
    if ('error' in law) throw new Error(law.error);
    confirmVersion(law.instrument.id, law.version.id, 'L2', 'l2');
    await as(ids.admin!);
    expect((await standing.POST(post(`/api/org/ministries/${court}/standing`, { op: 'record', standing: 'executive-agency' }), ctx(court))).status).toBe(422);
    const p = await standing.POST(post(`/api/org/ministries/${court}/standing`, { op: 'propose', standing: 'executive-agency', legalBasis: [{ instrument: law.instrument.id, eId: 'sec_9' }] }), ctx(court));
    expect(p.status).toBe(200);
    await as(ids.admin2!);
    expect((await standing.POST(post(`/api/org/ministries/${court}/standing`, { op: 'confirm' }), ctx(court))).status).toBe(403);
    expect(institutionBounds().independent).toContain(court);
    await as(ids.healthAdmin!);
    expect((await standing.POST(post(`/api/org/ministries/${court}/standing`, { op: 'propose', standing: 'judiciary', legalBasis: [] }), ctx(court))).status).toBe(403);
    await as(ids.courtSigner!);
    expect((await standing.POST(post(`/api/org/ministries/${court}/standing`, { op: 'withdraw' }), ctx(court))).status).toBe(403);
    await as(ids.admin!);
    expect((await standing.POST(post(`/api/org/ministries/${court}/standing`, { op: 'withdraw' }), ctx(court))).status).toBe(200);
  });
});
