import { describe, it, expect, beforeEach, vi } from 'vitest';

vi.mock('@supabase/supabase-js', () => ({
  createClient: (url: string, key: string, opts: unknown) => ({ url, key, opts }),
}));

import {
  publicClient, serverClient, substrateAvailable, __resetClients,
} from './client';

beforeEach(() => {
  __resetClients();
  delete process.env.NEXT_PUBLIC_SUPABASE_URL;
  delete process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  delete process.env.SUPABASE_SERVICE_ROLE_KEY;
});

describe('publicClient', () => {
  it('returns null when env vars are missing', () => {
    expect(publicClient()).toBeNull();
    expect(substrateAvailable()).toBe(false);
  });

  it('returns a client when both public env vars are set', () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://example.supabase.co';
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = 'pub';
    const c = publicClient();
    expect(c).not.toBeNull();
    expect(substrateAvailable()).toBe(true);
  });

  it('memoises the client across calls', () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://example.supabase.co';
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = 'pub';
    expect(publicClient()).toBe(publicClient());
  });
});

describe('serverClient', () => {
  it('returns null when env vars are missing', () => {
    expect(serverClient()).toBeNull();
  });

  it('returns a service-role client when both server env vars are set', () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://example.supabase.co';
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'svc';
    const c = serverClient();
    expect(c).not.toBeNull();
  });

  it('memoises the client across calls', () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://example.supabase.co';
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'svc';
    expect(serverClient()).toBe(serverClient());
  });
});

describe('__resetClients', () => {
  it('clears memoised clients so new env values take effect', () => {
    expect(publicClient()).toBeNull();
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://example.supabase.co';
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = 'pub';
    expect(publicClient()).toBeNull(); // still memoised as null
    __resetClients();
    expect(publicClient()).not.toBeNull();
  });
});

describe('browser bundle', () => {
  // Next.js writes NEXT_PUBLIC_ values into browser code only where they are named as literal
  // process.env.NEXT_PUBLIC_… members; a lookup by a variable name stays undefined there, which
  // left the substrate unavailable in every browser (the sign-in page's "not configured" card).
  it('names the public variables literally, so the build writes them into browser code', async () => {
    const { readFileSync } = await import('node:fs');
    const { fileURLToPath } = await import('node:url');
    const src = readFileSync(fileURLToPath(new URL('./client.ts', import.meta.url)), 'utf8').replace(/^\s*\/\/.*$/gm, '');
    expect(src).toContain('process.env.NEXT_PUBLIC_SUPABASE_URL');
    expect(src).toContain('process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY');
    expect(src).not.toMatch(/process\.env\[/);
  });
});
