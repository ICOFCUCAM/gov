import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { NextRequest } from 'next/server';
import { CSP, DIRECTIVES, contentSecurityPolicy, scriptSrc, pageHeaders, embedHeaders } from '../security-headers.mjs';
import { middleware } from './middleware';

type H = { key: string; value: string };
const directives = (csp: string) => Object.fromEntries(csp.split(';').map(d => d.trim()).filter(Boolean).map(d => { const [k, ...v] = d.split(/\s+/); return [k, v.join(' ')]; }));

describe('security headers', () => {
  it('the policy allows nothing from outside the platform and runs scripts only with the request\'s nonce', () => {
    const d = directives(contentSecurityPolicy('abc123', false));
    expect(d['default-src']).toBe("'self'");
    expect(d['object-src']).toBe("'none'");
    expect(d['frame-ancestors']).toBe("'none'");
    expect(d['script-src']).toBe("'self' 'nonce-abc123' 'strict-dynamic'");
    for (const k of ['script-src', 'style-src', 'img-src', 'font-src']) expect(d[k]).not.toMatch(/https?:\/\/|\*/);
    // No 'unsafe-inline' for scripts in production; 'unsafe-eval' only for development's hot reloading.
    expect(scriptSrc('n', false)).not.toMatch(/unsafe-inline|unsafe-eval/);
    expect(scriptSrc('n', true)).toMatch(/'unsafe-eval'/);
    expect(scriptSrc(null, false)).toBe("script-src 'self'");
    expect(directives(CSP)['script-src']).not.toMatch(/unsafe-inline/);
    // The fixed directives are the same in every policy.
    expect(contentSecurityPolicy('x', false).split('; ').filter(p => !p.startsWith('script-src'))).toEqual(DIRECTIVES);
  });

  it('every page carries HSTS and the rest; the policy itself comes from the middleware', () => {
    const keys = (pageHeaders({}) as H[]).map(h => h.key);
    expect(keys).toEqual(expect.arrayContaining(['Strict-Transport-Security', 'X-Frame-Options', 'X-Content-Type-Options', 'Referrer-Policy', 'Permissions-Policy']));
    expect(keys).not.toContain('Content-Security-Policy');
    expect((pageHeaders({ CIVICOS_HSTS: 'off' }) as H[]).some(h => h.key === 'Strict-Transport-Security')).toBe(false);
  });

  it('the middleware sends a fresh nonce to the page render and the same policy on the answer', async () => {
    const a = await middleware(new NextRequest('http://localhost/'));
    const b = await middleware(new NextRequest('http://localhost/', { headers: { 'x-nonce': 'attacker', 'content-security-policy': "script-src 'unsafe-inline'" } }));
    const policy = a.headers.get('content-security-policy')!;
    const nonce = /'nonce-([A-Za-z0-9+/=]+)'/.exec(policy)![1]!;
    expect(Buffer.from(nonce, 'base64')).toHaveLength(16);
    expect(policy).toBe(contentSecurityPolicy(nonce));
    // The render sees the same nonce (request headers forwarded by NextResponse.next).
    expect(a.headers.get('x-middleware-request-x-nonce')).toBe(nonce);
    expect(a.headers.get('x-middleware-request-content-security-policy')).toBe(policy);
    // Every request gets its own; a nonce or policy sent by the caller is replaced.
    expect(b.headers.get('x-middleware-request-x-nonce')).not.toBe(nonce);
    expect(b.headers.get('x-middleware-request-x-nonce')).not.toBe('attacker');
    expect(directives(b.headers.get('x-middleware-request-content-security-policy')!)['script-src']).not.toMatch(/unsafe-inline/);
    // API answers carry the policy too; the embeddable widgets keep their route's own.
    expect((await middleware(new NextRequest('http://localhost/api/sovereign'))).headers.get('content-security-policy')).toMatch(/^default-src 'self'; script-src/);
    const embed = await middleware(new NextRequest('http://localhost/embed/health/services'));
    expect(embed.headers.get('content-security-policy')).toBeNull();
    expect(embed.headers.get('x-middleware-request-x-nonce')).toBeNull();
  });

  it('the root layout puts the nonce on its inline script', () => {
    const layout = readFileSync(join(__dirname, 'app', 'layout.tsx'), 'utf8');
    expect(layout).toMatch(/\(await headers\(\)\)\.get\('x-nonce'\)/);
    expect(layout).toMatch(/<script nonce=\{nonce\}/);
  });

  it('embeddable widgets keep their own frame policy', () => {
    expect((embedHeaders({}) as H[]).some(h => h.key === 'Content-Security-Policy' || h.key === 'X-Frame-Options')).toBe(false);
  });

  it('vercel.json mirrors the same headers (the policy is the middleware\'s there too)', () => {
    const v = JSON.parse(readFileSync(join(__dirname, '..', 'vercel.json'), 'utf8')) as { headers: { source: string; headers: H[] }[] };
    const page = v.headers.find(h => h.source === '/((?!embed/).*)')!.headers;
    const ours = pageHeaders({}) as H[];
    expect(page).toEqual(ours);
    expect(page.some(h => h.key === 'Content-Security-Policy')).toBe(false);
    expect(v.headers.find(h => h.source === '/embed/(.*)')!.headers).toEqual(embedHeaders({}) as H[]);
  });
});
