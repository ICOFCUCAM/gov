// How officials sign in, as /sign-in reads it (GET /api/auth/official, methods.local): the
// platform-account form shows when accounts exist or the first may be made. With the substrate
// connected the first is not made here, unless the operator allows platform accounts
// (CIVICOS_LOCAL_ACCOUNTS=allow) — then the form must offer it, not hide it.
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

process.env.CIVICOS_SCRYPT_N = '16384';
const SETUP_TOKEN = 'test-setup-token-0123456789abcdef';
process.env.CIVICOS_SETUP_TOKEN = SETUP_TOKEN;

let substrate = false;
vi.mock('next/headers', () => ({ cookies: () => ({ get: () => undefined }), headers: () => new Headers() }));
vi.mock('@/lib/db/client', async orig => ({ ...(await orig<typeof import('@/lib/db/client')>()), serverClient: () => (substrate ? ({}) : null) }));
const { resetOfficials, createAccount } = await import('./officials');
const { GET } = await import('@/app/api/auth/official/route');

const methods = async () => ((await (await GET()).json()) as { accounts: boolean; methods: { local: boolean; substrate: boolean } });

describe('platform-account sign-in on /sign-in (methods.local)', () => {
  beforeEach(() => { resetOfficials(); substrate = false; delete process.env.CIVICOS_LOCAL_ACCOUNTS; });
  afterEach(() => { delete process.env.CIVICOS_LOCAL_ACCOUNTS; });

  it('is offered without the substrate, so the first account can be made', async () => {
    expect(await methods()).toMatchObject({ accounts: false, methods: { local: true, substrate: false } });
  });

  it('is not offered for a first account while the substrate is the sign-in method', async () => {
    substrate = true;
    expect(await methods()).toMatchObject({ accounts: false, methods: { local: false, substrate: true } });
  });

  it('is offered with the substrate when the operator allows platform accounts', async () => {
    substrate = true;
    process.env.CIVICOS_LOCAL_ACCOUNTS = 'allow';
    expect(await methods()).toMatchObject({ accounts: false, methods: { local: true, substrate: true } });
  });

  it('stays offered once accounts exist', async () => {
    const a = await createAccount({ email: 'a@g.gov', name: 'A', office: 'O', password: 'correct horse battery', setupToken: SETUP_TOKEN }, null);
    if ('error' in a) throw new Error(a.error);
    substrate = true;
    expect(await methods()).toMatchObject({ accounts: true, methods: { local: true } });
  });
});
