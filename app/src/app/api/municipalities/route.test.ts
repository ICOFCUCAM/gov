import { describe, it, expect, vi, beforeEach } from 'vitest';

const onboardMock = vi.fn();
vi.mock('@/lib/data/store', () => ({
  onboardMunicipality: (input: unknown) => onboardMock(input),
}));

import { POST } from './route';

beforeEach(() => {
  onboardMock.mockReset();
});

describe('POST /api/municipalities', () => {
  it('rejects invalid JSON with 400', async () => {
    const res = await POST(new Request('http://x', { method: 'POST', body: 'nope' }) as never);
    expect(res.status).toBe(400);
  });

  it('rejects missing required fields with 422', async () => {
    const res = await POST(new Request('http://x', {
      method: 'POST', body: JSON.stringify({ name: 'Anytown' }),
      headers: { 'content-type': 'application/json' },
    }) as never);
    expect(res.status).toBe(422);
  });

  it('never answers 201: the check stores nothing (plan I0.2)', async () => {
    onboardMock.mockReturnValue({ status: 'checked', recorded: false });
    const res = await POST(new Request('http://x', {
      method: 'POST',
      body: JSON.stringify({ name: 'Anytown', country: 'CO', adminContact: 'a@b' }),
      headers: { 'content-type': 'application/json' },
    }) as never);
    expect(res.status).toBe(200);
  });

  it('says plainly what was not done: nothing stored, nothing provisioned, no go-live date (real store)', async () => {
    const real = await vi.importActual<typeof import('@/lib/data/store')>('@/lib/data/store');
    const r = real.onboardMunicipality({ name: 'Anytown', country: 'CO', adminContact: 'admin@anytown.example', population: 1, officialLanguages: ['es'],
      inclusionFloor: { ussd: true, ivr: true, agentNetwork: true, walkIn: true }, modules: ['business-licence'], constitutionalOfficerSignoff: true });
    expect(r.status).toBe('checked');
    expect(r.status).not.toBe('provisioned');
    expect(r.recorded).toBe(false);
    expect(r.goLiveEstimateDays).toBeNull();
    expect(r.notDone.join(' ')).toMatch(/No institution record was created/);
    expect(r.next.map(n => n.href)).toContain('/ministries');
    expect(real.listMinistries().some(m => m.name === 'Anytown')).toBe(false);
  });

  it('returns 200 when onboarding is held (not provisioned)', async () => {
    onboardMock.mockReturnValue({ status: 'pending', municipalityId: 'm-1' });
    const res = await POST(new Request('http://x', {
      method: 'POST',
      body: JSON.stringify({ name: 'Anytown', country: 'CO', adminContact: 'a@b' }),
      headers: { 'content-type': 'application/json' },
    }) as never);
    expect(res.status).toBe(200);
  });

  it('fills defaults for optional fields', async () => {
    onboardMock.mockReturnValue({ status: 'provisioned' });
    await POST(new Request('http://x', {
      method: 'POST',
      body: JSON.stringify({ name: 'Anytown', country: 'CO', adminContact: 'a@b' }),
      headers: { 'content-type': 'application/json' },
    }) as never);
    expect(onboardMock).toHaveBeenCalledWith(expect.objectContaining({
      population: 0,
      officialLanguages: [],
      modules: [],
      constitutionalOfficerSignoff: false,
      inclusionFloor: { ussd: false, ivr: false, agentNetwork: false, walkIn: false },
    }));
  });
});
