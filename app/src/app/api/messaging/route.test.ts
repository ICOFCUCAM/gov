// /api/messaging is for administrators only (ADMIN_ONLY and checked in the
// route), never returns a secret, an address or a message's text; the
// delivery cron needs CIVICOS_CRON_SECRET.
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { resetOfficials, createAccount, sessionSecret } from '@/lib/auth/officials';
import { signClaims } from '@/lib/auth/session-token';
import { apiPermission, mutationRule } from '@/lib/auth/roles';
import { listAudit } from '@/lib/data/store';
import { resetMessaging, enqueue } from '@/lib/messaging/outbox';
// The first account needs the one-time setup code (lib/auth/setup-token.ts, review C-1).
const SETUP_TOKEN = 'test-setup-token-0123456789abcdef';
process.env.CIVICOS_SETUP_TOKEN = SETUP_TOKEN;

process.env.CIVICOS_SCRYPT_N = '16384';
let cookie: string | undefined;
vi.mock('next/headers', () => ({ cookies: () => ({ get: () => (cookie ? { value: cookie } : undefined) }) }));
const route = await import('./route');
const cron = await import('../cron/deliver-messages/route');

const PW = 'correct horse battery';
async function signInAs(email: string, role?: string) {
  const a = await createAccount({ email, name: email.split('@')[0]!, office: 'ICT', password: PW, ...(role ? { role } : {}) }, 'Admin');
  if ('error' in a) throw new Error(a.error);
  const now = Math.floor(Date.now() / 1000);
  cookie = await signClaims({ sub: `local:${a.id}`, name: 'typed', method: 'local', iat: now, exp: now + 600 }, sessionSecret());
}
const post = (body: unknown) => new NextRequest('http://localhost/api/messaging', { method: 'POST', body: JSON.stringify(body), headers: { 'content-type': 'application/json' } });
const relay = { kind: 'smtp', name: 'Main relay', from: 'updates@gov.example', host: 'smtp.gov.example', security: 'starttls', username: 'relay', secret: 'relay-password-77' };

beforeEach(async () => {
  resetOfficials(); resetMessaging(); cookie = undefined;
  await createAccount({ email: 'admin@gov.test', name: 'Admin', office: 'Head of Service', password: PW, setupToken: SETUP_TOKEN }, null);
});
afterEach(() => vi.unstubAllEnvs());

describe('/api/messaging', () => {
  it('is an administrator\'s change in the one rule set', () => {
    expect(mutationRule('/api/messaging')).toBe('admin');
    expect(apiPermission({ role: 'signatory' }, 'POST', '/api/messaging')).toMatch(/administrator/);
    expect(apiPermission({ role: 'officer' }, 'POST', '/api/messaging')).toMatch(/administrator/);
    expect(apiPermission({ role: 'administrator' }, 'POST', '/api/messaging')).toBeNull();
  });

  it('refuses officials who are not administrators, to read or to change', async () => {
    await signInAs('officer@gov.test', 'officer');
    expect((await route.GET()).status).toBe(403);
    expect((await route.POST(post({ action: 'save-provider', provider: relay }))).status).toBe(403);
  });

  it('lets an administrator connect a provider, recorded under the verified name, without the secret anywhere', async () => {
    await signInAs('it.admin@gov.test', 'administrator');
    let s = await (await route.GET()).json();
    expect(s.channels).toEqual({ email: 'not connected', sms: 'not connected' });
    const res = await route.POST(post({ action: 'save-provider', provider: relay, by: 'Someone typed' }));
    expect(res.status).toBe(200);
    s = (await res.json()).status;
    expect(s.channels.email).toBe('connected');
    expect(s.providers[0]).toMatchObject({ name: 'Main relay', hasSecret: true, createdBy: 'it.admin, ICT' });
    expect(JSON.stringify(s)).not.toContain('relay-password-77');
    const entry = listAudit().find(e => e.action === 'messaging.provider.add')!;
    expect(entry.actor).toBe('it.admin, ICT');
    expect(JSON.stringify(listAudit())).not.toContain('relay-password-77');
    expect((await route.POST(post({ action: 'nonsense' }))).status).toBe(422);
  });

  it('shows statuses with addresses masked and no message text', async () => {
    await signInAs('it.admin@gov.test', 'administrator');
    enqueue({ key: 'x', channel: 'email', stream: 'site-updates', kind: 'site.confirm', to: 'amina@example.org', subject: 'Confirm', text: 'secret-token-link', link: '/subscriptions?token=abc' });
    const s = await (await route.GET()).json();
    expect(s.recent[0]).toMatchObject({ to: 'a***@example.org', status: 'queued' });
    expect(s.counts.byStream['site-updates'].queued).toBe(1);
    const text = JSON.stringify(s);
    expect(text).not.toContain('amina@example.org');
    expect(text).not.toContain('secret-token-link');
    expect(text).not.toContain('token=abc');
  });
});

describe('/api/cron/deliver-messages', () => {
  it('needs the cron secret', async () => {
    vi.stubEnv('CIVICOS_CRON_SECRET', 'cron-secret-1');
    expect((await cron.GET(new Request('http://localhost/api/cron/deliver-messages'))).status).toBe(401);
    expect((await cron.GET(new Request('http://localhost/api/cron/deliver-messages', { headers: { authorization: 'Bearer wrong' } }))).status).toBe(401);
    const r = await cron.GET(new Request('http://localhost/api/cron/deliver-messages', { headers: { authorization: 'Bearer cron-secret-1' } }));
    expect(r.status).toBe(200);
    expect(await r.json()).toMatchObject({ ok: true, attempted: 0 });
  });
});
