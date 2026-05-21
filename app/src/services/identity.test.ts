import { describe, it, expect, vi, beforeEach } from 'vitest';

const substrateAvailableMock = vi.fn(() => true);
const currentActorMock = vi.fn();
const claimCitizenMock = vi.fn();

vi.mock('@/lib/db/client', () => ({
  substrateAvailable: () => substrateAvailableMock(),
}));
vi.mock('@/lib/db/repos/identity', () => ({
  currentActor: () => currentActorMock(),
  claimCitizen: (...args: unknown[]) => claimCitizenMock(...args),
}));
vi.mock('@/lib/db/auth', () => ({
  onAuthStateChange: () => () => undefined,
  currentSession: async () => null,
}));

import {
  currentActorSnapshot, currentSessionSnapshot,
  refreshIdentity, subscribeIdentity,
} from './identity';

beforeEach(() => {
  substrateAvailableMock.mockReset();
  substrateAvailableMock.mockReturnValue(true);
  currentActorMock.mockReset();
  claimCitizenMock.mockReset();
});

describe('snapshots', () => {
  it('start null before resolve runs', () => {
    expect(currentActorSnapshot()).toBeNull();
    expect(currentSessionSnapshot()).toBeNull();
  });
});

describe('refreshIdentity', () => {
  it('returns null when the substrate is not configured', async () => {
    substrateAvailableMock.mockReturnValue(false);
    const out = await refreshIdentity();
    expect(out).toBeNull();
    expect(currentActorMock).not.toHaveBeenCalled();
  });

  it('returns the resolved actor from the substrate', async () => {
    const sample = { id: 'o-1', kind: 'officer' as const, name: 'O', role: 'noc-officer', charterId: 'MIN-X' };
    currentActorMock.mockResolvedValue(sample);
    expect(await refreshIdentity()).toEqual(sample);
    expect(currentActorSnapshot()).toEqual(sample);
  });

  it('notifies subscribers after a resolve', async () => {
    currentActorMock.mockResolvedValue({ id: 'c-1', kind: 'citizen' as const, name: 'C', role: null, charterId: null });
    const fn = vi.fn();
    const unsub = subscribeIdentity(fn);
    await refreshIdentity();
    expect(fn).toHaveBeenCalledTimes(1);
    unsub();
  });
});
