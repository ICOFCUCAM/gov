import { describe, it, expect, vi, beforeEach } from 'vitest';

const verifyMock = vi.fn();
vi.mock('@/lib/data/store', () => ({
  verifyDocument: (code: string) => verifyMock(code),
}));

import { POST } from './route';

beforeEach(() => verifyMock.mockReset());

describe('POST /api/documents/verify', () => {
  it('rejects invalid JSON', async () => {
    const res = await POST(new Request('http://x', { method: 'POST', body: 'no' }) as never);
    expect(res.status).toBe(400);
  });

  it('rejects missing code', async () => {
    const res = await POST(new Request('http://x', {
      method: 'POST', body: JSON.stringify({}),
      headers: { 'content-type': 'application/json' },
    }) as never);
    expect(res.status).toBe(422);
  });

  it('passes the code to verifyDocument and returns the result', async () => {
    verifyMock.mockReturnValue({ ok: true, documentId: 'd-1' });
    const res = await POST(new Request('http://x', {
      method: 'POST', body: JSON.stringify({ code: 'ABC-123' }),
      headers: { 'content-type': 'application/json' },
    }) as never);
    const json = await res.json();
    expect(verifyMock).toHaveBeenCalledWith('ABC-123');
    expect(json.ok).toBe(true);
  });
});
