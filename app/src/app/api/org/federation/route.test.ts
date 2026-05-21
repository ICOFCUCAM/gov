import { describe, it, expect, vi, beforeEach } from 'vitest';

const listMinistriesMock = vi.fn();
const manifestMock = vi.fn();

vi.mock('@/lib/data/store', () => ({
  listMinistries: () => listMinistriesMock(),
}));

vi.mock('@/apps/manifests', () => ({
  ministryAppManifest: (m: { id: string; name: string }) => manifestMock(m),
  STANDING_APPS: [
    { id: 'standing-1', name: 'Standing One', nav: [{ key: 'home' }] },
    { id: 'standing-2', name: 'Standing Two', nav: [{ key: 'home' }, { key: 'logs' }] },
  ],
}));

const STANDING_COUNT = 2;

import { GET } from './route';

beforeEach(() => {
  listMinistriesMock.mockReset();
  manifestMock.mockReset();
});

describe('GET /api/org/federation', () => {
  it('lists every standing app and registered ministry app', async () => {
    listMinistriesMock.mockReturnValue([
      { id: 'min-a', name: 'A', archetype: 'GENERIC', status: 'active' },
      { id: 'min-b', name: 'B', archetype: 'GENERIC', status: 'pending' },
    ]);
    manifestMock.mockImplementation((m: { id: string; name: string }) => ({
      id: m.id, name: m.name, nav: [{ key: 'home' }],
    }));
    const res = GET();
    const json = await res.json();
    expect(json.apps).toHaveLength(STANDING_COUNT + 2);
    expect(json.stats.registered).toBe(STANDING_COUNT + 2);
  });

  it('filters out merged ministries', async () => {
    listMinistriesMock.mockReturnValue([
      { id: 'min-a', name: 'A', archetype: 'GENERIC', status: 'merged' },
      { id: 'min-b', name: 'B', archetype: 'GENERIC', status: 'active' },
    ]);
    manifestMock.mockImplementation((m: { id: string; name: string }) => ({
      id: m.id, name: m.name, nav: [],
    }));
    const res = GET();
    const json = await res.json();
    expect(json.apps).toHaveLength(STANDING_COUNT + 1);
    expect(json.apps.some((a: { id: string }) => a.id === 'min-a')).toBe(false);
  });

  it('marks ministries as activated only when status is active', async () => {
    listMinistriesMock.mockReturnValue([
      { id: 'min-a', name: 'A', archetype: 'GENERIC', status: 'active' },
      { id: 'min-b', name: 'B', archetype: 'GENERIC', status: 'pending' },
    ]);
    manifestMock.mockImplementation((m: { id: string; name: string }) => ({
      id: m.id, name: m.name, nav: [],
    }));
    const res = GET();
    const json = await res.json();
    const ministryActivated = json.apps.filter(
      (a: { id: string; activated: boolean }) => a.id.startsWith('min-') && a.activated,
    ).length;
    expect(ministryActivated).toBe(1);
    expect(json.stats.activated).toBe(STANDING_COUNT + 1);
  });

  it('exposes navCount alongside the nav array', async () => {
    listMinistriesMock.mockReturnValue([]);
    const res = GET();
    const json = await res.json();
    expect(json.apps[0].navCount).toBe(1);
    expect(json.apps[1].navCount).toBe(2);
  });
});
