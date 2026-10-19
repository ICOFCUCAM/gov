import { describe, it, expect, vi, beforeEach } from 'vitest';

const publicClientMock = vi.fn();
vi.mock('@/lib/db/client', () => ({
  publicClient: () => publicClientMock(),
}));

import { GET } from './route';

beforeEach(() => {
  publicClientMock.mockReset();
});

describe('GET /api/health', () => {
  it('returns ok:false and not-configured when substrate is unavailable', async () => {
    publicClientMock.mockReturnValue(null);
    const res = await GET(new Request('http://localhost/api/health'));
    const json = await res.json();
    expect(json.ok).toBe(false);
    expect(json.substrate.configured).toBe(false);
    expect(json.substrate.reachable).toBe(false);
    expect(json.substrate.latency_ms).toBeNull();
  });

  it('returns ok:true when the substrate responds without error', async () => {
    const fromMock = vi.fn(() => ({
      select: () => ({
        limit: () => Promise.resolve({ error: null }),
      }),
    }));
    publicClientMock.mockReturnValue({ from: fromMock });
    const res = await GET(new Request('http://localhost/api/health'));
    const json = await res.json();
    expect(json.ok).toBe(true);
    expect(json.substrate.configured).toBe(true);
    expect(json.substrate.reachable).toBe(true);
    expect(typeof json.substrate.latency_ms).toBe('number');
  });

  it('returns ok:false when the substrate query errors', async () => {
    const fromMock = vi.fn(() => ({
      select: () => ({
        limit: () => Promise.resolve({ error: { message: 'denied' } }),
      }),
    }));
    publicClientMock.mockReturnValue({ from: fromMock });
    const res = await GET(new Request('http://localhost/api/health'));
    const json = await res.json();
    expect(json.ok).toBe(false);
    expect(json.substrate.configured).toBe(true);
    expect(json.substrate.reachable).toBe(false);
  });

  it('returns ok:false when the substrate call throws', async () => {
    const fromMock = vi.fn(() => ({
      select: () => ({
        limit: () => Promise.reject(new Error('network')),
      }),
    }));
    publicClientMock.mockReturnValue({ from: fromMock });
    const res = await GET(new Request('http://localhost/api/health'));
    const json = await res.json();
    expect(json.ok).toBe(false);
    expect(json.substrate.reachable).toBe(false);
  });

  it('emits an ISO timestamp', async () => {
    publicClientMock.mockReturnValue(null);
    const res = await GET(new Request('http://localhost/api/health'));
    const json = await res.json();
    expect(json.at).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });

  it('reports where the state is kept and who holds the writer\'s lease', async () => {
    publicClientMock.mockReturnValue(null);
    const json = await (await GET(new Request('http://localhost/api/health'))).json();
    expect(json.persistence).toMatchObject({ mode: 'memory', writable: true, lastSaved: null, leaseHolder: null });
  });

  it('answers the readiness probe with 503 on a standby, and the liveness probe without the substrate', async () => {
    const { NextRequest } = await import('next/server');
    const g = globalThis as { __persistStatus?: unknown };
    const before = g.__persistStatus;
    try {
      g.__persistStatus = { adapter: 'file', restored: [], saves: 0, startedAt: new Date().toISOString(), role: 'standby', fencing: 'lease+version', lease: { holder: 'other', expiresAt: new Date().toISOString() } };
      const ready = await GET(new NextRequest('http://localhost/api/health?ready'));
      expect(ready.status).toBe(503);
      expect((await ready.json()).persistence).toMatchObject({ role: 'standby', writable: false, leaseHolder: 'other' });
      publicClientMock.mockReset();
      const live = await GET(new NextRequest('http://localhost/api/health?live'));
      expect(live.status).toBe(200);
      expect(publicClientMock).not.toHaveBeenCalled();
    } finally {
      g.__persistStatus = before;
    }
  });
});
