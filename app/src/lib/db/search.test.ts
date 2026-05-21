import { describe, it, expect, vi, beforeEach } from 'vitest';

const substrateAvailableMock = vi.fn(() => true);
const fromMock = vi.fn();

vi.mock('@/lib/db/client', () => ({
  substrateAvailable: () => substrateAvailableMock(),
  publicClient: () => ({ from: (...args: unknown[]) => fromMock(...args) }),
}));

import { substrateSearch } from './search';

function makeBuilder(rows: unknown[]) {
  const builder = {
    select: () => builder,
    or: () => builder,
    limit: () => Promise.resolve({ data: rows, error: null }),
  };
  return builder;
}

beforeEach(() => {
  substrateAvailableMock.mockReset();
  substrateAvailableMock.mockReturnValue(true);
  fromMock.mockReset();
});

describe('substrateSearch', () => {
  it('returns empty when substrate is unavailable', async () => {
    substrateAvailableMock.mockReturnValue(false);
    expect(await substrateSearch('anything')).toEqual([]);
    expect(fromMock).not.toHaveBeenCalled();
  });

  it('returns empty for whitespace-only queries', async () => {
    expect(await substrateSearch('   ')).toEqual([]);
    expect(fromMock).not.toHaveBeenCalled();
  });

  it('queries every documented view', async () => {
    fromMock.mockImplementation(() => makeBuilder([]));
    await substrateSearch('amina');
    const called = fromMock.mock.calls.map(c => c[0]);
    expect(called).toEqual(expect.arrayContaining([
      'civicos_work_items', 'civicos_directives', 'civicos_dispatches',
      'civicos_escalations', 'civicos_service_requests', 'civicos_appeals',
      'civicos_institutions', 'civicos_officers',
    ]));
  });

  it('merges per-view rows into unified hits sorted newest-first', async () => {
    const now = Date.now();
    fromMock.mockImplementation((view: string) => {
      if (view === 'civicos_work_items') {
        return makeBuilder([{ id: 'wi-1', ref: 'WI-1', title: 'work', scope: 'MIN-X', current_stage: 'review', created_at: new Date(now - 1000).toISOString() }]);
      }
      if (view === 'civicos_directives') {
        return makeBuilder([{ id: 'dr-1', ref: 'DIR-1', title: 'directive', status: 'signed', issued_by_charter_id: 'MIN-X', updated_at: new Date(now).toISOString() }]);
      }
      return makeBuilder([]);
    });
    const hits = await substrateSearch('x');
    expect(hits.length).toBe(2);
    expect(hits[0]!.kind).toBe('directive'); // newer
    expect(hits[1]!.kind).toBe('work-item');
    expect(hits[0]!.href.startsWith('/gov/directives/')).toBe(true);
    expect(hits[1]!.href.startsWith('/gov/items/')).toBe(true);
  });

  it('survives a view returning an error', async () => {
    fromMock.mockImplementation((view: string) => ({
      select: () => ({
        or: () => ({
          limit: () => Promise.resolve(view === 'civicos_work_items'
            ? { data: null, error: { message: 'boom' } }
            : { data: [], error: null }),
        }),
      }),
    }));
    expect(await substrateSearch('x')).toEqual([]);
  });
});
