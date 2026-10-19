import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { createHash } from 'node:crypto';
import { NextRequest } from 'next/server';

// The full N=2^17 cost is covered by password-hash.test.ts; these tests check behaviour, not cost.
process.env.CIVICOS_SCRYPT_N = '16384';

let substrate: object | null = null;
vi.mock('@/lib/db/client', () => ({ serverClient: () => substrate, tokenScopedClient: () => null }));
vi.mock('next/headers', () => ({ cookies: () => ({ get: () => undefined }), headers: () => new Headers() }));

const { resetOfficials, createAccount, hasAccounts, listAccounts } = await import('./officials');
const { ensureSetupCode, checkSetupCode, resetSetupCode, SETUP_CODE_HOURS } = await import('./setup-token');
const { POST } = await import('@/app/api/auth/officials/route');

const PW = 'correct horse battery';
const first = (extra: Record<string, unknown> = {}) => ({ email: 'ps@gov.test', name: 'J. Otieno', office: 'Permanent Secretary', password: PW, ...extra });
/** Start the server's way: a code written to its output, captured here. */
function startServer(now?: number): string {
  let text = '';
  ensureSetupCode({ now, out: s => { text += s; } });
  const m = /\n {4}([A-Z0-9-]+)\n/.exec(text);
  if (!m) throw new Error('no code written');
  return m[1]!;
}

describe('the first administrator needs the one-time setup code (review C-1)', () => {
  beforeEach(() => { resetOfficials(); resetSetupCode(); substrate = null; delete process.env.CIVICOS_SETUP_TOKEN; delete process.env.CIVICOS_SETUP_TOKEN_EXPIRES; delete process.env.CIVICOS_LOCAL_ACCOUNTS; });
  afterEach(() => { vi.restoreAllMocks(); });

  it('refuses to create the first account without the code, or with a wrong one', async () => {
    const code = startServer();
    vi.spyOn(process.stdout, 'write').mockImplementation(() => true);
    expect(await createAccount(first(), null)).toEqual({ error: expect.stringMatching(/setup code/) });
    expect(await createAccount(first({ setupToken: 'AAAA-BBBB-CCCC-DDDD-EEEE' }), null)).toEqual({ error: 'That setup code is not right' });
    expect(hasAccounts()).toBe(false);
    // The code the server wrote works, however it is typed, and only once.
    expect(await createAccount(first({ setupToken: ` ${code.toLowerCase()} ` }), null)).toMatchObject({ role: 'administrator', createdBy: 'installation' });
    resetOfficials(); // even if the store were emptied again, the used code is gone
    expect(await createAccount(first({ setupToken: code }), null)).toEqual({ error: expect.stringMatching(/not right|expired|Enter/) });
  });

  it('refuses the anonymous request the review reproduced, through the route', async () => {
    startServer();
    const post = (body: unknown) => POST(new NextRequest('http://localhost/api/auth/officials', { method: 'POST', body: JSON.stringify(body) }));
    const r = await post(first());
    expect(r.status).toBe(422);
    expect((await r.json()).error).toMatch(/setup code/);
    expect(listAccounts()).toEqual([]);
  });

  it('writes the code to the server\'s output once, and a new one only after it expires', () => {
    const now = Date.now();
    const a = startServer(now);
    expect(a.replace(/-/g, '')).toMatch(/^[A-Z2-9]{20}$/);
    let again = '';
    ensureSetupCode({ now: now + 60_000, out: s => { again += s; } });
    expect(again).toBe('');
    const later = now + (SETUP_CODE_HOURS + 1) * 3_600_000;
    vi.spyOn(process.stdout, 'write').mockImplementation(() => true);
    expect(checkSetupCode(a, [], later)).toMatch(/expired/);
    expect(process.stdout.write).toHaveBeenCalledWith(expect.stringContaining('CIVICOS SETUP CODE'));
  });

  it('takes the operator\'s CIVICOS_SETUP_TOKEN instead, never a short one, and never one already used', async () => {
    process.env.CIVICOS_SETUP_TOKEN = 'short';
    expect(await createAccount(first({ setupToken: 'short' }), null)).toEqual({ error: expect.stringMatching(/shorter than 24/) });
    const token = 'operator-chosen-setup-token-0123456789';
    process.env.CIVICOS_SETUP_TOKEN = token;
    let out = '';
    ensureSetupCode({ out: s => { out += s; } });
    expect(out).toBe(''); // nothing written when the operator set one
    expect(await createAccount(first({ setupToken: token.slice(0, -1) }), null)).toEqual({ error: 'That setup code is not right' });
    expect(await createAccount(first({ setupToken: token }), null)).toMatchObject({ role: 'administrator' });
    const usedHash = createHash('sha256').update(token).digest('hex');
    expect(checkSetupCode(token, [usedHash])).toMatch(/already been used/);
    process.env.CIVICOS_SETUP_TOKEN_EXPIRES = new Date(Date.now() - 1000).toISOString();
    expect(checkSetupCode(token, [])).toMatch(/expired/);
  });

  it('limits wrong codes', () => {
    startServer();
    for (let i = 0; i < 10; i++) expect(checkSetupCode('WRONG-CODE', [])).toBe('That setup code is not right');
    expect(checkSetupCode('WRONG-CODE', [])).toMatch(/Too many/);
  });

  it('creates no platform account while the substrate is the sign-in method, unless the operator allows it', async () => {
    substrate = {};
    const code = startServer();
    expect(await createAccount(first({ setupToken: code }), null)).toEqual({ error: expect.stringMatching(/sign in through the substrate/) });
    const r = await POST(new NextRequest('http://localhost/api/auth/officials', { method: 'POST', body: JSON.stringify(first({ setupToken: code })) }));
    expect(r.status).toBe(409);
    process.env.CIVICOS_LOCAL_ACCOUNTS = 'allow';
    expect(await createAccount(first({ setupToken: code }), null)).toMatchObject({ role: 'administrator' });
  });
});
