// Go-live review L-3: only administrators see the full account list (email,
// last sign-in, whether the second step is on); other officials see a
// directory of name, office and institution.
import { describe, it, expect, vi, beforeEach } from 'vitest';

const official = vi.fn();
vi.mock('@/lib/auth/official', () => ({
  currentOfficial: async () => official(),
  actorLabel: (o: { name: string }) => o.name,
}));

import { GET } from './route';
import { resetOfficials, createAccount } from '@/lib/auth/officials';

const SETUP_TOKEN = 'test-setup-token-0123456789abcdef';
process.env.CIVICOS_SETUP_TOKEN = SETUP_TOKEN;

beforeEach(async () => {
  resetOfficials();
  official.mockReset();
  await createAccount({ email: 'admin@gov.example', password: 'correct horse battery', name: 'A. Admin', office: 'Registrar', setupToken: SETUP_TOKEN }, null);
  await createAccount({ email: 'officer@gov.example', password: 'correct horse battery', name: 'B. Officer', office: 'Clerk', role: 'officer', institution: 'min-health' }, 'A. Admin');
});

const list = async () => (await (await GET()).json()) as { accounts: Record<string, unknown>[]; full: boolean };

describe('GET /api/auth/officials', () => {
  it('refuses without a signed-in official', async () => {
    official.mockReturnValue(null);
    expect((await GET()).status).toBe(401);
  });

  it('gives administrators every account in full', async () => {
    official.mockReturnValue({ sub: 'local:x', name: 'A. Admin', role: 'administrator' });
    const d = await list();
    expect(d.full).toBe(true);
    expect(d.accounts.map(a => a.email)).toEqual(['admin@gov.example', 'officer@gov.example']);
    expect(d.accounts[0]).toHaveProperty('twoStepRequired');
  });

  it('gives any other official name, office and institution only', async () => {
    for (const role of ['officer', 'signatory', 'auditor']) {
      official.mockReturnValue({ sub: 'local:y', name: 'B. Officer', role });
      const d = await list();
      expect(d.full, role).toBe(false);
      for (const a of d.accounts) expect(Object.keys(a).sort(), role).toEqual(Object.keys(a).filter(k => ['id', 'name', 'office', 'institution'].includes(k)).sort());
      expect(d.accounts.map(a => a.name)).toEqual(['A. Admin', 'B. Officer']);
      expect(d.accounts[1]).toMatchObject({ office: 'Clerk', institution: 'min-health' });
      const text = JSON.stringify(d);
      for (const hidden of ['@gov.example', 'lastSignIn', 'twoStep', 'secondStepOn', 'passkeys', 'createdBy', 'role']) expect(text, `${role} ${hidden}`).not.toContain(hidden);
    }
  });
});
