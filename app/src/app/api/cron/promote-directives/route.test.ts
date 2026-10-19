import { describe, it, expect, vi, beforeEach } from 'vitest';

const serverClientMock = vi.fn();
vi.mock('@/lib/db/client', () => ({ serverClient: () => serverClientMock() }));

import { POST } from './route';
import { resetDirectives, draftDirective, signDirective, directive } from '@/lib/data/directives';
import { resetMirror, mirrorStatus } from '@/lib/db/mirror';

const substrate = (rpc: (fn: string, args?: unknown) => Promise<{ data: unknown; error: { message: string } | null }>, held: unknown[] = []) => ({
  rpc: vi.fn(rpc),
  from: () => ({ select: () => ({ order: () => ({ limit: async () => ({ data: held, error: null }) }) }) }),
});

beforeEach(() => {
  serverClientMock.mockReset();
  resetDirectives();
  resetMirror();
  delete process.env.CIVICOS_CRON_SECRET;
});

const due = () => {
  draftDirective({ ref: 'DIR-DUE', title: 'Due now', by: 'Signer' });
  signDirective('DIR-DUE', 'Signer', new Date(Date.now() + 60_000).toISOString());
  // The effective time passes.
  const r = directive('DIR-DUE')!;
  expect(r.status).toBe('signed');
};

describe('POST /api/cron/promote-directives', () => {
  it('returns 401 when CIVICOS_CRON_SECRET is unset', async () => {
    const res = await POST(new Request('http://x/api/cron/promote-directives?token=anything'));
    expect(res.status).toBe(401);
  });

  it('returns 401 when the token does not match', async () => {
    process.env.CIVICOS_CRON_SECRET = 'correct';
    const res = await POST(new Request('http://x/api/cron/promote-directives?token=wrong'));
    expect(res.status).toBe(401);
  });

  it('promotes the platform\'s due directives without the substrate', async () => {
    process.env.CIVICOS_CRON_SECRET = 'correct';
    serverClientMock.mockReturnValue(null);
    due();
    vi.useFakeTimers({ now: Date.now() + 120_000, toFake: ['Date'] });
    try {
      const res = await POST(new Request('http://x/api/cron/promote-directives?token=correct'));
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json).toMatchObject({ ok: true, promoted: 1, refs: ['DIR-DUE'], substrate: 'not configured' });
      expect(directive('DIR-DUE')!.status).toBe('effective');
    } finally { vi.useRealTimers(); }
  });

  it('promotes on the platform and copies to the substrate mirror, never through its own promotion', async () => {
    process.env.CIVICOS_CRON_SECRET = 'correct';
    const sb = substrate(async () => ({ data: null, error: null }));
    serverClientMock.mockReturnValue(sb);
    due();
    vi.useFakeTimers({ now: Date.now() + 120_000, toFake: ['Date'] });
    try {
      const res = await POST(new Request('http://x/api/cron/promote-directives', { headers: { authorization: 'Bearer correct' } }));
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.promoted).toBe(1);
      expect(json.mirror.pending).toBe(0);
    } finally { vi.useRealTimers(); }
    const calls = sb.rpc.mock.calls.map(c => c[0]);
    expect(calls).not.toContain('civicos_promote_due_directives');
    const copied = sb.rpc.mock.calls.find(c => c[0] === 'civicos_mirror_directive')?.[1] as { p_row: { ref: string; status: string } };
    expect(copied.p_row).toMatchObject({ ref: 'DIR-DUE', status: 'effective' });
    expect(calls).toContain('civicos_mirror_institution');
  });

  it('keeps records the substrate refused queued, names them and answers 502', async () => {
    process.env.CIVICOS_CRON_SECRET = 'correct';
    serverClientMock.mockReturnValue(substrate(async fn => (fn === 'civicos_mirror_directive' ? { data: null, error: { message: 'boom' } } : { data: null, error: null })));
    draftDirective({ ref: 'DIR-X', title: 'X', by: 'Officer' });
    const res = await POST(new Request('http://x/api/cron/promote-directives?token=correct'));
    expect(res.status).toBe(502);
    expect((await res.json()).error).toMatch(/directive:DIR-X: boom/);
    expect(mirrorStatus().items.map(i => i.id)).toEqual(['directive:DIR-X']);
    expect(directive('DIR-X')!.status).toBe('drafting');
  });
});
