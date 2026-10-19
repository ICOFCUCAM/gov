import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
// @ts-expect-error plain ES module shared with next.config.mjs
import { CSP, pageHeaders, embedHeaders } from '../security-headers.mjs';

type H = { key: string; value: string };
const directives = (csp: string) => Object.fromEntries(csp.split(';').map(d => d.trim()).filter(Boolean).map(d => { const [k, ...v] = d.split(/\s+/); return [k, v.join(' ')]; }));

describe('security headers', () => {
  it('every page carries a CSP that allows nothing from outside the platform, HSTS and the rest', () => {
    const keys = (pageHeaders({}) as H[]).map(h => h.key);
    expect(keys).toEqual(expect.arrayContaining(['Content-Security-Policy', 'Strict-Transport-Security', 'X-Frame-Options', 'X-Content-Type-Options', 'Referrer-Policy', 'Permissions-Policy']));
    const d = directives(CSP);
    expect(d['default-src']).toBe("'self'");
    expect(d['object-src']).toBe("'none'");
    expect(d['frame-ancestors']).toBe("'none'");
    for (const k of ['script-src', 'style-src', 'img-src', 'font-src']) expect(d[k]).not.toMatch(/https?:\/\/|\*/);
    expect((pageHeaders({ CIVICOS_HSTS: 'off' }) as H[]).some(h => h.key === 'Strict-Transport-Security')).toBe(false);
  });

  it('embeddable widgets keep their own frame policy', () => {
    expect((embedHeaders({}) as H[]).some(h => h.key === 'Content-Security-Policy' || h.key === 'X-Frame-Options')).toBe(false);
  });

  it('vercel.json mirrors the same headers (only the substrate origin differs)', () => {
    const v = JSON.parse(readFileSync(join(__dirname, '..', 'vercel.json'), 'utf8')) as { headers: { source: string; headers: H[] }[] };
    const page = v.headers.find(h => h.source === '/((?!embed/).*)')!.headers;
    const ours = pageHeaders({}) as H[];
    expect(page.map(h => h.key)).toEqual(ours.map(h => h.key));
    for (const h of page) {
      const o = ours.find(x => x.key === h.key)!;
      if (h.key !== 'Content-Security-Policy') { expect(h.value).toBe(o.value); continue; }
      const a = directives(h.value), b = directives(o.value);
      for (const k of Object.keys(b)) if (k !== 'connect-src' && k !== 'script-src') expect(a[k], k).toBe(b[k]);
      expect(a['script-src']).not.toMatch(/unsafe-eval/);
    }
    expect(v.headers.find(h => h.source === '/embed/(.*)')!.headers.map(h => h.key)).toEqual((embedHeaders({}) as H[]).map(h => h.key));
  });
});
