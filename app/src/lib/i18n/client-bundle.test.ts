// Go-live review L-7: browser bundles carry English only; the nation's own
// languages come with the page, any other loads on request. The server (and
// these tests' other files) keep every dictionary.
import { describe, it, expect, vi, afterAll } from 'vitest';

describe('the browser build', () => {
  it('replaces lib/i18n/bundled with the English-only module in browser bundles, not on the server', async () => {
    // @ts-expect-error -- next.config.mjs carries no type declarations
    const { default: nextConfig } = await import('../../../next.config.mjs');
    const plugins: { re: RegExp; fn: (r: { context: string; request: string }) => void }[] = [];
    class NormalModuleReplacementPlugin { constructor(re: RegExp, fn: (r: { context: string; request: string }) => void) { plugins.push({ re, fn }); } }
    const webpack = { NormalModuleReplacementPlugin };
    const server = (nextConfig as { webpack: (c: unknown, o: unknown) => { plugins: unknown[] } }).webpack({ plugins: [] }, { isServer: true, webpack });
    expect(server.plugins).toHaveLength(0);
    (nextConfig as { webpack: (c: unknown, o: unknown) => unknown }).webpack({ plugins: [] }, { isServer: false, webpack });
    expect(plugins).toHaveLength(1);
    const swap = (context: string, request: string) => {
      const r = { context, request };
      if (plugins[0]!.re.test(request)) plugins[0]!.fn(r);
      return r.request;
    };
    expect(swap('/app/src/lib/i18n', './bundled')).toBe('./bundled.client');
    expect(swap('/app/src/components', '@/lib/i18n/bundled')).toBe('@/lib/i18n/bundled.client');
    // Another module called bundled elsewhere is left alone.
    expect(swap('/app/src/lib/other', './bundled')).toBe('./bundled');
  });

  it('the English-only module has English alone', async () => {
    const { BUNDLED } = await import('./bundled.client');
    expect(Object.keys(BUNDLED)).toEqual(['en']);
    const all = await import('./bundled');
    expect(Object.keys(all.BUNDLED).sort()).toEqual(['ar', 'en', 'fr', 'sw', 'yo']);
  });
});

describe('dictionaries in the browser', () => {
  const g = globalThis as unknown as { window?: unknown };
  afterAll(() => { delete g.window; vi.doUnmock('./bundled'); vi.resetModules(); });

  it('takes the nation\'s languages from the page, falls back to English, and loads others on request', async () => {
    vi.resetModules();
    vi.doMock('./bundled', () => import('./bundled.client'));
    const pageSw = { marker: 'from the page' };
    g.window = { __CIVICOS_MESSAGES__: { sw: pageSw } };
    const i18n = await import('./index');
    const { en } = await import('./locales/en');
    const { fr } = await import('./locales/fr');
    expect(i18n.getMessages('sw')).toBe(pageSw);
    expect(i18n.getMessages('en')).toBe(en);
    expect(i18n.hasMessages('fr')).toBe(false);
    expect(i18n.getMessages('fr')).toBe(en);
    expect(await i18n.loadMessages('fr')).toEqual(fr);
    expect(i18n.getMessages('fr')).toEqual(fr);
  });
});
