import { describe, it, expect } from 'vitest';
import { GET, POST } from './route';

describe('/api/setup', () => {
  it('reports no setup, then records completion against the sovereign', async () => {
    expect((await GET().json()).setup).toBeNull();
    const res = await POST(new Request('http://x', { method: 'POST', body: JSON.stringify({ by: 'officer-1' }) }) as never);
    const { setup } = await res.json();
    expect(setup.by).toBe('officer-1');
    expect(typeof setup.stateName).toBe('string');
    expect((await GET().json()).setup.completedAt).toBe(setup.completedAt);
  });

  it('tolerates an empty body', async () => {
    const res = await POST(new Request('http://x', { method: 'POST', body: 'nope' }) as never);
    expect((await res.json()).setup.by).toBe('cabinet-office');
  });
});
