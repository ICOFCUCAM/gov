import { describe, it, expect, vi } from 'vitest';

const pinned = vi.fn(async (_href: string, _init: unknown, _address: string) => new Response('ok', { headers: { 'content-type': 'text/csv' } }));
vi.mock('./pinned-fetch', () => ({ pinnedFetch: (href: string, init: unknown, address: string) => pinned(href, init, address) }));

import { safeFetchText } from './safe-fetch';

describe('DNS rebinding', () => {
  it('connects to the address that was checked, even when DNS would now answer a private one', async () => {
    // A rebinding resolver: public at the check, private afterwards.
    const answers = [['203.0.113.9'], ['127.0.0.1']];
    const resolve = vi.fn(async () => answers.shift() ?? ['127.0.0.1']);
    const r = await safeFetchText('https://feed.example.gov/data.csv', { allow: () => true, resolve });
    expect(r.text).toBe('ok');
    expect(resolve).toHaveBeenCalledTimes(1);
    expect(pinned).toHaveBeenCalledWith('https://feed.example.gov/data.csv', expect.objectContaining({ method: 'GET' }), '203.0.113.9');
  });

  it('refuses when any answer is private', async () => {
    pinned.mockClear();
    await expect(safeFetchText('https://feed.example.gov/x', { allow: () => true, resolve: async () => ['203.0.113.9', '192.168.1.4'] })).rejects.toThrow(/private network/);
    expect(pinned).not.toHaveBeenCalled();
  });
});
