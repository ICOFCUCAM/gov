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

  it('queries every substrate-owned view, and never the mirrors of platform registers', async () => {
    fromMock.mockImplementation(() => makeBuilder([]));
    await substrateSearch('amina');
    const called = fromMock.mock.calls.map(c => c[0]);
    expect(called).toEqual(expect.arrayContaining([
      'civicos_work_items', 'civicos_dispatches',
      'civicos_escalations', 'civicos_service_requests', 'civicos_appeals',
      'civicos_officers',
    ]));
    // Directives and institutions are the platform's (review D8): read from it, not the mirror.
    expect(called).not.toContain('civicos_directives');
    expect(called).not.toContain('civicos_institutions');
  });

  it('merges substrate rows with the platform directives and charters, newest first', async () => {
    const now = Date.now();
    fromMock.mockImplementation((view: string) => {
      if (view === 'civicos_work_items') {
        return makeBuilder([{ id: 'wi-1', ref: 'WI-1', title: 'work', scope: 'MIN-X', current_stage: 'review', created_at: new Date(now - 1000).toISOString() }]);
      }
      return makeBuilder([]);
    });
    const urls: string[] = [];
    vi.stubGlobal('window', {});
    vi.stubGlobal('fetch', vi.fn(async (url: string) => {
      urls.push(url);
      const body = url.startsWith('/api/directives')
        ? { directives: [{ id: 'dr-1', ref: 'DIR-1', title: 'directive', status: 'signed', issued_by_charter_id: 'MIN-X', updated_at: new Date(now).toISOString() }] }
        : { charters: [{ charter_id: 'senate', label: 'Senate', kind: 'branch', domain: 'senate', archetype_or_branch: 'legislature', activated: true, activated_at: null, registered_at: new Date(now - 5000).toISOString() }] };
      return new Response(JSON.stringify(body), { status: 200 });
    }));
    try {
      const hits = await substrateSearch('x');
      expect(hits.map(h => h.kind)).toEqual(['directive', 'work-item', 'institution']);
      expect(hits[0]!.href.startsWith('/gov/directives/')).toBe(true);
      expect(hits[1]!.href.startsWith('/gov/items/')).toBe(true);
      expect(hits[2]!.href).toBe('/gov/charter/senate');
      expect(urls.some(u => u.startsWith('/api/directives?q=x'))).toBe(true);
      expect(urls.some(u => u.startsWith('/api/public/charters?') && u.includes('q=x'))).toBe(true);
    } finally {
      vi.unstubAllGlobals();
    }
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
