import { describe, it, expect, vi, beforeEach } from 'vitest';

const sovereign = vi.fn();
vi.mock('@/lib/data/store', () => ({ getSovereign: () => sovereign() }));
vi.mock('@anthropic-ai/sdk', () => ({
  default: class { messages = { create: vi.fn().mockRejectedValue(new Error('offline')) }; },
}));

import { POST } from './route';

const body = { label: 'Health', posture: 'NOMINAL', escalationTier: 0, readiness: 80, incidents: 0, budgetPressure: 20, slaCompliance: 95, constitutional: 'compliant' };
const call = () => POST(new Request('http://x', { method: 'POST', body: JSON.stringify(body) }) as never);

beforeEach(() => sovereign.mockReset());

describe('POST /api/ai/advisory — national opt-in', () => {
  it('refuses when the nation declined the AI assistant', async () => {
    sovereign.mockReturnValue({ aiAssistant: false });
    const res = await call();
    expect(res.status).toBe(403);
  });

  it('serves an advisory when the nation opted in', async () => {
    sovereign.mockReturnValue({ aiAssistant: true });
    const res = await call();
    expect(res.status).toBe(200);
    expect((await res.json()).headline).toContain('Health');
  });

  it('marks a rule-based answer as rules, so callers never call it AI', async () => {
    sovereign.mockReturnValue({ aiAssistant: true });
    const res = await call();
    expect((await res.json()).source).toBe('rules');
  });
});
