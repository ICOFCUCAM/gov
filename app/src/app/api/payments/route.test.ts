import { describe, it, expect, vi, beforeEach } from 'vitest';

const listBills = vi.fn();
const listReceipts = vi.fn();
const payBill = vi.fn();
vi.mock('@/lib/data/store', () => ({
  listBills: () => listBills(),
  listReceipts: () => listReceipts(),
  payBill: (id: string, rail: string) => payBill(id, rail),
}));

import { GET, POST } from './route';

beforeEach(() => {
  listBills.mockReset();
  listReceipts.mockReset();
  payBill.mockReset();
});

describe('GET /api/payments', () => {
  it('returns bills and receipts', async () => {
    listBills.mockReturnValue([{ id: 'b-1' }]);
    listReceipts.mockReturnValue([{ id: 'r-1' }]);
    const res = GET();
    const json = await res.json();
    expect(json.bills).toHaveLength(1);
    expect(json.receipts).toHaveLength(1);
  });
});

describe('POST /api/payments', () => {
  it('rejects invalid JSON', async () => {
    const res = await POST(new Request('http://x', { method: 'POST', body: 'no' }) as never);
    expect(res.status).toBe(400);
  });

  it('rejects missing billId', async () => {
    const res = await POST(new Request('http://x', {
      method: 'POST', body: JSON.stringify({}),
      headers: { 'content-type': 'application/json' },
    }) as never);
    expect(res.status).toBe(422);
  });

  it('returns 409 when the payment errors', async () => {
    payBill.mockReturnValue({ error: 'already paid' });
    const res = await POST(new Request('http://x', {
      method: 'POST', body: JSON.stringify({ billId: 'b-1' }),
      headers: { 'content-type': 'application/json' },
    }) as never);
    expect(res.status).toBe(409);
  });

  it('returns 201 with the receipt and defaults rail to M-Pesa', async () => {
    payBill.mockReturnValue({ id: 'r-new', billId: 'b-1' });
    const res = await POST(new Request('http://x', {
      method: 'POST', body: JSON.stringify({ billId: 'b-1' }),
      headers: { 'content-type': 'application/json' },
    }) as never);
    expect(res.status).toBe(201);
    expect(payBill).toHaveBeenCalledWith('b-1', 'M-Pesa');
  });

  it('honours an explicit rail', async () => {
    payBill.mockReturnValue({ id: 'r-new' });
    await POST(new Request('http://x', {
      method: 'POST', body: JSON.stringify({ billId: 'b-1', rail: 'bank-transfer' }),
      headers: { 'content-type': 'application/json' },
    }) as never);
    expect(payBill).toHaveBeenCalledWith('b-1', 'bank-transfer');
  });
});
