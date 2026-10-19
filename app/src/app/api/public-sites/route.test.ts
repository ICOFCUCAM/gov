import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { NextRequest } from 'next/server';
import { GET as content } from './[id]/content/route';
import { PUT as update } from './[id]/route';
import { GET as widget } from '@/app/embed/[site]/services/route';
import { GET as forward } from '@/app/r/[site]/[...path]/route';
import { middleware } from '@/middleware';
import { resetSiteSettings, updateSiteSettings } from '@/lib/data/site-settings';

const SITE = 'https://www.health.example.gov';
const req = (url: string, init?: RequestInit) => new NextRequest(`http://platform.test${url}`, init as never);

describe('public-site integration endpoints', () => {
  beforeEach(() => resetSiteSettings());

  it('serve the services widget framable only by the ministry\'s registered website in Embed mode', async () => {
    let res = widget(req('/embed/health/services'), { params: { site: 'health' } });
    expect(res.headers.get('content-security-policy')).toMatch(/frame-ancestors 'self';/);
    updateSiteSettings('health', { website: SITE, mode: 'embed' }, 'CIO');
    res = widget(req('/embed/health/services'), { params: { site: 'health' } });
    expect(res.headers.get('content-security-policy')).toMatch(/frame-ancestors 'self' https:\/\/www\.health\.example\.gov;/);
    const html = await res.text();
    expect(html).toContain('Book Appointment');
    expect(html).toContain('target="_top" href="http://platform.test/wallet/permits/new"');
    expect(html).not.toMatch(/<script/i);
    expect(widget(req('/embed/nowhere/services'), { params: { site: 'nowhere' } }).status).toBe(404);
  });

  it('share content cross-site only with an Embed-mode ministry\'s website', async () => {
    let res = content(req('/api/public-sites/health/content'), { params: { id: 'health' } });
    expect(res.headers.get('access-control-allow-origin')).toBeNull();
    const body = await res.json();
    expect(body.services[0]).toMatchObject({ title: 'Book Appointment', url: 'http://platform.test/wallet/permits/new' });
    expect(body.figures[0].sample).toBe(true);
    updateSiteSettings('health', { website: SITE, mode: 'embed' }, 'CIO');
    res = content(req('/api/public-sites/health/content'), { params: { id: 'health' } });
    expect(res.headers.get('access-control-allow-origin')).toBe(SITE);
  });

  it('forward a migrating ministry\'s old addresses', () => {
    updateSiteSettings('health', { website: SITE, mode: 'migrate', redirects: [{ from: '/services/vaccines', to: '/health#services' }] }, 'CIO');
    let res = forward(req('/r/health/services/vaccines'), { params: { site: 'health', path: ['services', 'vaccines'] } });
    expect(res.status).toBe(301);
    expect(res.headers.get('location')).toBe('http://platform.test/health#services');
    res = forward(req('/r/health/old/page'), { params: { site: 'health', path: ['old', 'page'] } });
    expect(res.status).toBe(302);
    expect(res.headers.get('location')).toBe('http://platform.test/health');
  });

  it('change settings only with a named official, and report problems', async () => {
    const bad = await update(req('/api/public-sites/health', { method: 'PUT', body: JSON.stringify({ website: 'http://127.0.0.1' }) }), { params: { id: 'health' } });
    expect(bad.status).toBe(422);
    const ok = await update(req('/api/public-sites/health', { method: 'PUT', body: JSON.stringify({ website: SITE, by: 'Chief Information Officer' }) }), { params: { id: 'health' } });
    expect((await ok.json()).site.mode).toBe('link');
  });
});

describe('access gate for integration endpoints (CIVICOS_AUTH=enforce)', () => {
  const before = process.env.CIVICOS_AUTH;
  beforeEach(() => { process.env.CIVICOS_AUTH = 'enforce'; });
  afterEach(() => { process.env.CIVICOS_AUTH = before; });
  const gate = async (path: string, method = 'GET') => middleware(new NextRequest(`http://platform.test${path}`, { method }));

  it('leave the widget, the content feed and forwarding public, and the settings protected', async () => {
    expect((await gate('/embed/health/services')).headers.get('location')).toBeNull();
    expect((await gate('/embed/health/services')).headers.get('x-frame-options')).toBeNull();
    expect((await gate('/r/health/old/page')).headers.get('location')).toBeNull();
    expect((await gate('/api/public-sites/health/content')).headers.get('location')).toBeNull();
    expect((await gate('/api/public-sites/health', 'PUT')).status).toBe(401);
    expect((await gate('/api/public-sites')).status).toBe(401);
    expect((await gate('/receipts')).headers.get('location')).toMatch(/\/sign-in/);
    expect((await gate('/police')).headers.get('x-frame-options')).toBe('SAMEORIGIN');
  });
});
