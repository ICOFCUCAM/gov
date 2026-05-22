import { describe, it, expect, vi, beforeEach } from 'vitest';

const publicClientMock = vi.fn();
vi.mock('@/lib/db/client', () => ({
  publicClient: () => publicClientMock(),
  substrateAvailable: () => publicClientMock() != null,
}));

import { listServiceRequestsRows, listAppealsRows } from './citizen';

// A chainable query-builder spy: every method returns the same object, and
// the builder is awaitable (thenable) resolving to { data, error }.
function builder(rows: unknown[]) {
  const calls: { is: [string, unknown][]; eq: [string, unknown][] } = { is: [], eq: [] };
  const b: Record<string, unknown> = {};
  for (const m of ['select', 'order', 'limit']) b[m] = vi.fn(() => b);
  b.eq = vi.fn((c: string, v: unknown) => { calls.eq.push([c, v]); return b; });
  b.is = vi.fn((c: string, v: unknown) => { calls.is.push([c, v]); return b; });
  b.then = (resolve: (r: { data: unknown[]; error: null }) => unknown) => resolve({ data: rows, error: null });
  return { from: vi.fn(() => b), calls, b };
}

beforeEach(() => publicClientMock.mockReset());

describe('listServiceRequestsRows openOnly', () => {
  it('excludes resolved AND cancelled when openOnly', async () => {
    const { from, calls } = builder([{ id: 's1' }]);
    publicClientMock.mockReturnValue({ from });
    await listServiceRequestsRows({ target: 'MIN-H', openOnly: true });
    expect(from).toHaveBeenCalledWith('civicos_service_requests');
    expect(calls.is).toEqual([['resolved_at', null], ['cancelled_at', null]]);
    expect(calls.eq).toEqual([['target_charter_id', 'MIN-H']]);
  });

  it('applies no is() filters when openOnly is false', async () => {
    const { from, calls } = builder([]);
    publicClientMock.mockReturnValue({ from });
    await listServiceRequestsRows({});
    expect(calls.is).toEqual([]);
  });
});

describe('listAppealsRows openOnly', () => {
  it('excludes decided AND withdrawn when openOnly', async () => {
    const { from, calls } = builder([{ id: 'a1' }]);
    publicClientMock.mockReturnValue({ from });
    await listAppealsRows({ originating: 'MIN-H', openOnly: true });
    expect(from).toHaveBeenCalledWith('civicos_appeals');
    expect(calls.is).toEqual([['decided_at', null], ['withdrawn_at', null]]);
    expect(calls.eq).toEqual([['originating_charter_id', 'MIN-H']]);
  });

  it('applies no is() filters when openOnly is false', async () => {
    const { from, calls } = builder([]);
    publicClientMock.mockReturnValue({ from });
    await listAppealsRows({});
    expect(calls.is).toEqual([]);
  });
});
