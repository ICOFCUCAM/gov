import { describe, it, expect, vi, beforeEach } from 'vitest';

const publicClientMock = vi.fn();

vi.mock('@/lib/db/client', () => ({
  publicClient: () => publicClientMock(),
}));

import {
  signInWithPassword, signUpWithPassword, signInWithOtp,
  signOut, currentSession, onAuthStateChange,
} from './auth';

beforeEach(() => {
  publicClientMock.mockReset();
});

describe('auth wrappers when the substrate is not configured', () => {
  beforeEach(() => publicClientMock.mockReturnValue(null));

  it('signInWithPassword returns the configured-error message', async () => {
    const out = await signInWithPassword('a@b', 'x');
    expect(out.session).toBeNull();
    expect(out.error).toMatch(/not configured/);
  });

  it('signUpWithPassword returns the configured-error message', async () => {
    const out = await signUpWithPassword('a@b', 'x');
    expect(out.error).toMatch(/not configured/);
  });

  it('signInWithOtp returns the configured-error message', async () => {
    const out = await signInWithOtp('a@b');
    expect(out.error).toMatch(/not configured/);
  });

  it('signOut returns null error when there is no client', async () => {
    const out = await signOut();
    expect(out.error).toBeNull();
  });

  it('currentSession returns null when there is no client', async () => {
    const s = await currentSession();
    expect(s).toBeNull();
  });

  it('onAuthStateChange returns a no-op unsubscribe when there is no client', () => {
    const unsub = onAuthStateChange(() => undefined);
    expect(() => unsub()).not.toThrow();
  });
});

describe('auth wrappers when the substrate IS configured', () => {
  it('signInWithPassword propagates the session and surfaces errors', async () => {
    publicClientMock.mockReturnValue({
      auth: {
        signInWithPassword: async () => ({
          data: { session: { user: { id: 'u-1' } } as unknown },
          error: { message: 'bad creds' },
        }),
      },
    });
    const out = await signInWithPassword('a@b', 'x');
    expect((out.session as unknown as { user: { id: string } } | null)?.user.id).toBe('u-1');
    expect(out.error).toBe('bad creds');
  });

  it('currentSession returns the substrate-reported session', async () => {
    publicClientMock.mockReturnValue({
      auth: { getSession: async () => ({ data: { session: { user: { id: 'u-2' } } } }) },
    });
    const s = await currentSession();
    expect((s as unknown as { user: { id: string } } | null)?.user.id).toBe('u-2');
  });

  it('onAuthStateChange invokes the callback whenever the substrate emits an event', () => {
    let inner: ((event: string, session: unknown) => void) | null = null;
    const unsubscribe = vi.fn();
    publicClientMock.mockReturnValue({
      auth: {
        onAuthStateChange: (cb: (event: string, session: unknown) => void) => {
          inner = cb;
          return { data: { subscription: { unsubscribe } } };
        },
      },
    });
    const cb = vi.fn();
    const unsub = onAuthStateChange(cb);
    inner!('SIGNED_IN', { user: { id: 'u-3' } });
    expect(cb).toHaveBeenCalledTimes(1);
    unsub();
    expect(unsubscribe).toHaveBeenCalledTimes(1);
  });
});
