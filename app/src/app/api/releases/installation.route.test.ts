// Installation-level Update Center decisions (review H-4) and dual control by
// two sign-ins (review H-5), through the routes with real signed sessions:
// only this nation's government-wide administrators take installation-level
// decisions; an officer, a signatory or an administrator of one institution
// is refused. Break-glass and preflight waivers need a second, different
// signed-in official confirming in their own request; a typed second name
// and the proposer confirming themselves are refused.
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { resetOfficials, createAccount, sessionSecret } from '@/lib/auth/officials';
import { signClaims } from '@/lib/auth/session-token';
import { resetUpdates, releaseFor, nationRecord, updateSettings, HOME_NATION, getChamber } from '@/lib/data/updates';
import { resetReadiness, latestPreflight, runPreflight } from '@/lib/data/readiness';
import { resetSovereignty, sharing } from '@/lib/data/sovereignty';
import { resetSecurity } from '@/lib/data/security-store';
import { listAudit } from '@/lib/data/store';
// The first account needs the one-time setup code (lib/auth/setup-token.ts, review C-1).
const SETUP_TOKEN = 'test-setup-token-0123456789abcdef';
process.env.CIVICOS_SETUP_TOKEN = SETUP_TOKEN;

process.env.CIVICOS_SCRYPT_N = '16384';
let cookie: string | undefined;
vi.mock('next/headers', () => ({ cookies: () => ({ get: () => (cookie ? { value: cookie } : undefined) }) }));
const sovereignty = await import('./sovereignty/route');
const credential = await import('./settings/agent-credential/route');
const settings = await import('./settings/route');
const breakGlass = await import('./break-glass/route');
const restore = await import('./[id]/restore-data/route');
const readiness = await import('./[id]/readiness/route');
const decision = await import('./[id]/decision/route');
const requests = await import('./requests/route');
const support = await import('./support/route');

const PW = 'correct horse battery';
const sessions: Record<string, string> = {};
async function account(key: string, name: string, role?: string, institution?: string) {
  const a = await createAccount({ email: `${key}@gov.test`, name, office: 'Digital Office', password: PW, role, institution, setupToken: SETUP_TOKEN }, role ? 'Admin' : null);
  if ('error' in a) throw new Error(a.error);
  const now = Math.floor(Date.now() / 1000);
  // The name in the token is not what counts: the account as it stands now is read (currentOfficial()).
  sessions[key] = await signClaims({ sub: `local:${a.id}`, name: 'typed', method: 'local', iat: now, exp: now + 600 }, sessionSecret());
}
const as = (key: string | undefined) => { cookie = key ? sessions[key] : undefined; };
const req = (path: string, body: unknown, method = 'POST') => new NextRequest(`http://localhost${path}`, { method, body: JSON.stringify(body), headers: { 'content-type': 'application/json' } });
const params = <T,>(p: T) => ({ params: Promise.resolve(p) });

beforeEach(async () => {
  resetOfficials(); resetUpdates(); resetReadiness(); resetSovereignty(); resetSecurity(); cookie = undefined;
  await account('admin', 'Grace Admin');                                   // the first account: a government-wide administrator
  await account('admin2', 'Second Admin', 'administrator');               // another government-wide administrator
  await account('officer', 'Otto Officer', 'officer', 'min-agriculture');  // an ordinary institutional officer
  await account('signatory', 'Sam Signatory', 'signatory');               // can sign, whole government
  await account('instadmin', 'Ida Admin', 'administrator', 'min-health'); // an administrator of one institution
});

describe('installation-level decisions are for this nation\'s government-wide administrators (H-4)', () => {
  it('refuses an institutional officer what the review reproduced, and lets an administrator do it', async () => {
    for (const who of ['officer', 'signatory', 'instadmin']) {
      as(who);
      const s = await sovereignty.POST(req('/api/releases/sovereignty', { category: 'crash-reports', enabled: true, reason: 'Help the publisher fix crashes' }));
      expect(s.status, who).toBe(403);
      expect((await s.json()).error).toMatch(/administrator serving the whole government/);
      expect((await credential.POST(req('/api/releases/settings/agent-credential', {}))).status, who).toBe(403);
      expect((await settings.PUT(req('/api/releases/settings', { probationMinutes: 60 }, 'PUT'))).status, who).toBe(403);
      expect((await breakGlass.POST(req('/api/releases/break-glass', { reason: 'Services down after the upgrade; probation long over' }))).status, who).toBe(403);
      expect((await restore.POST(req('/api/releases/DR-140/restore-data', { acknowledgeLoss: true }), params({ id: 'DR-140' }))).status, who).toBe(403);
      expect((await readiness.POST(req('/api/releases/DR-150/readiness', { action: 'waive', findingKey: 'x', reason: 'Module owner confirmed it is fine' }), params({ id: 'DR-150' }))).status, who).toBe(403);
      expect((await decision.POST(req('/api/releases/DR-141/decision', { action: 'approve' }), params({ id: 'DR-141' }))).status, who).toBe(403);
    }
    expect(sharing(HOME_NATION).find(c => c.category === 'crash-reports')!.enabled).toBe(false);
    as('admin');
    expect((await sovereignty.POST(req('/api/releases/sovereignty', { category: 'crash-reports', enabled: true, reason: 'Help the publisher fix crashes' }))).status).toBe(200);
    expect((await credential.POST(req('/api/releases/settings/agent-credential', {}))).status).toBe(201);
    expect((await settings.PUT(req('/api/releases/settings', { probationMinutes: 60 }, 'PUT'))).status).toBe(200);
  });

  it('keeps feature requests and support tickets open to every official', async () => {
    as('officer');
    expect((await requests.POST(req('/api/releases/requests', { title: 'Bulk export of permits', description: 'We need to export permits for our annual report to parliament.', priority: 'medium' }))).status).not.toBe(403);
    expect((await support.POST(req('/api/releases/support', { priority: 'P4', subject: 'Question about release notes', description: 'Where are the release notes in our language?' }))).status).not.toBe(403);
  });
});

describe('dual control takes two sign-ins (H-5)', () => {
  it('break-glass: proposed by one administrator, confirmed by a different one in their own request', async () => {
    as('admin');
    // A typed second name is refused.
    expect((await breakGlass.POST(req('/api/releases/break-glass', { secondBy: 'Somebody Else', reason: 'Services down after the upgrade; probation long over' }))).status).toBe(422);
    const p = await breakGlass.POST(req('/api/releases/break-glass', { by: 'Typed Name', reason: 'Services down after the upgrade; probation long over' }));
    expect(p.status).toBe(200);
    const pj = await p.json();
    expect(pj).toMatchObject({ pending: true, proposal: { by: 'Grace Admin, Digital Office' } });
    expect(pj.proposal.byId).toBeUndefined();
    expect(getChamber(HOME_NATION)).toMatchObject({ installed: '1.4.0' });
    // The proposer confirming again, under any typed name, is refused.
    const self = await breakGlass.POST(req('/api/releases/break-glass', { by: 'Another Person', action: 'confirm' }));
    expect(self.status).toBe(409);
    // Without a session the confirmation is refused too (the proposal was made signed in).
    as(undefined);
    expect((await breakGlass.POST(req('/api/releases/break-glass', { by: 'Another Person', action: 'confirm' }))).status).toBe(409);
    // An officer cannot confirm (not eligible).
    as('officer');
    expect((await breakGlass.POST(req('/api/releases/break-glass', { action: 'confirm' }))).status).toBe(403);
    as('admin2');
    const c = await breakGlass.POST(req('/api/releases/break-glass', { action: 'confirm' }));
    expect(c.status).toBe(200);
    expect((await c.json()).incident.trigger).toBe('break-glass');
    expect(getChamber(HOME_NATION)).toMatchObject({ installed: '1.3.0' });
    expect(listAudit().find(a => a.action === 'update.break-glass')).toMatchObject({ actor: 'Grace Admin, Digital Office + Second Admin, Digital Office' });
  });

  it('a proposal can be cancelled; nothing changes', async () => {
    as('admin');
    expect((await breakGlass.POST(req('/api/releases/break-glass', { reason: 'Services down after the upgrade; probation long over' }))).status).toBe(200);
    as('admin2');
    expect((await breakGlass.POST(req('/api/releases/break-glass', { action: 'cancel' }))).status).toBe(200);
    expect((await breakGlass.POST(req('/api/releases/break-glass', { action: 'confirm' }))).status).toBe(409);
    expect(getChamber(HOME_NATION)).toMatchObject({ installed: '1.4.0' });
  });

  it('a preflight waiver: proposed by one administrator, confirmed by another, never with a typed second name', async () => {
    updateSettings(HOME_NATION, { ring: 'pilot' }, 'CIO'); // 1.5.0 is offered to the pilot ring; the nation's own module blocks it
    const n = nationRecord(HOME_NATION)!;
    const r = releaseFor(HOME_NATION, 'DR-150')!;
    const blocking = runPreflight(n, r, 'CIO').findings.find(f => f.status === 'blocking');
    expect(blocking, 'a blocking finding').toBeTruthy();
    const waive = (body: object) => readiness.POST(req('/api/releases/DR-150/readiness', { action: 'waive', findingKey: blocking!.key, ...body }), params({ id: 'DR-150' }));
    as('admin');
    expect((await waive({ secondBy: 'Head of Revenue IT', reason: 'Module does not use the CSV import; tested on staging' })).status).toBe(422);
    const p = await waive({ reason: 'Module does not use the CSV import; tested on staging' });
    expect(p.status).toBe(200);
    expect(await p.json()).toMatchObject({ pending: true });
    expect((await waive({ by: 'Head of Revenue IT' })).status).toBe(409);
    as('admin2');
    const c = await waive({});
    expect(c.status).toBe(200);
    const f = latestPreflight(HOME_NATION, 'DR-150')!.findings.find(x => x.key === blocking!.key)!;
    expect(f.waiver).toMatchObject({ by: 'Grace Admin, Digital Office', secondBy: 'Second Admin, Digital Office' });
  });
});
