import { describe, it, expect, vi, beforeEach } from 'vitest';

const signMock = vi.fn();
vi.mock('@/lib/data/store', () => ({
  signDocument: (input: unknown) => signMock(input),
}));

import { POST } from './route';

beforeEach(() => {
  signMock.mockReset();
});

describe('POST /api/signatures', () => {
  it('rejects invalid JSON with 400', async () => {
    const res = await POST(new Request('http://x', { method: 'POST', body: 'no' }) as never);
    expect(res.status).toBe(400);
  });

  it('rejects missing required fields with 422', async () => {
    const res = await POST(new Request('http://x', {
      method: 'POST', body: JSON.stringify({ documentId: 'd-1' }),
      headers: { 'content-type': 'application/json' },
    }) as never);
    expect(res.status).toBe(422);
  });

  it('returns 201 with the signature result on success', async () => {
    signMock.mockReturnValue({ signatureId: 's-1', hash: 'abc' });
    const res = await POST(new Request('http://x', {
      method: 'POST',
      body: JSON.stringify({ documentId: 'd-1', documentTitle: 'Order', signerName: 'Amina' }),
      headers: { 'content-type': 'application/json' },
    }) as never);
    expect(res.status).toBe(201);
    const json = await res.json();
    expect(json.result.signatureId).toBe('s-1');
    expect(signMock).toHaveBeenCalledWith({
      documentId: 'd-1', documentTitle: 'Order', signerName: 'Amina',
    });
  });
});
