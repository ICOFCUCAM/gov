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

  it('returns 201 when the municipality is provisioned', async () => {
    onboardMock.mockReturnValue({ status: 'provisioned', municipalityId: 'm-1' });
    const res = await POST(new Request('http://x', {
      method: 'POST',
      body: JSON.stringify({ name: 'Anytown', country: 'CO', adminContact: 'a@b' }),
      headers: { 'content-type': 'application/json' },
    }) as never);
    expect(res.status).toBe(201);
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
