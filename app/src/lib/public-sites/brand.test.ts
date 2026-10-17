import { describe, it, expect, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { brandProblem, sniffImage, type SiteBrand } from './brand';
import { proposeSiteChange, decideProposal, proposeRestore, resetSiteEditorial } from '@/lib/data/site-editorial';
import { getSiteSettings, resetSiteSettings, updateSiteSettings } from '@/lib/data/site-settings';
import { siteProps } from '@/apps/_shared/public/site-props';
import { GET as logoRoute } from '@/app/api/public-sites/[id]/logo/route';

// A 1×1 PNG.
const PNG = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';
const ok = <T,>(r: T | { error: string }): T => { if (r && typeof r === 'object' && 'error' in r) throw new Error((r as { error: string }).error); return r as T; };
const theme = { ink: '#0b1a2c', inkSoft: '#13294b', primary: '#1e63b8', accent: '#3a82d0', surface: '#f4f6f9', surfaceMute: '#e8eef6', line: '#dde3ec', emergencyA: '#c1252f', emergencyB: '#a01c25' };
const BRAND: SiteBrand = { primary: '#e8b400', accent: '#006b3f', logo: { type: 'image/png', data: PNG, alt: 'Police Command badge' } };

describe('a ministry\'s own colours and logo', () => {
  beforeEach(() => { resetSiteEditorial(); resetSiteSettings(); });

  it('accept only real PNG, JPEG or WebP images, checked by their bytes, and hex colours', () => {
    expect(brandProblem(BRAND)).toBeNull();
    expect(sniffImage(new Uint8Array(Buffer.from(PNG, 'base64')))).toBe('image/png');
    const svg = Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>').toString('base64');
    expect(brandProblem({ logo: { type: 'image/png', data: svg, alt: 'x' } })).toMatch(/PNG, JPEG or WebP/);
    expect(brandProblem({ logo: { type: 'image/jpeg', data: PNG, alt: 'x' } })).toMatch(/is a PNG file/);
    expect(brandProblem({ logo: { type: 'image/png', data: PNG, alt: ' ' } })).toMatch(/Describe the logo/);
    expect(brandProblem({ logo: { type: 'image/png', data: Buffer.alloc(200 * 1024, 1).toString('base64'), alt: 'x' } })).toMatch(/larger than 150 KB/);
    expect(brandProblem({ primary: 'red' })).toMatch(/hex colour/);
    expect(brandProblem({ primary: '#123456', script: 1 } as never)).toMatch(/Unknown brand field/);
  });

  it('are published by a second official, previewed before, and restorable', () => {
    const p = ok(proposeSiteChange('police', { brand: BRAND }, 'Director of Communications'));
    expect(p.summary).toEqual(['colours and logo']);
    expect(getSiteSettings('police').brand).toBeUndefined();
    const preview = siteProps('police', { theme, illustration: null, preview: p.id });
    expect(preview.institution.logo?.src).toMatch(/^data:image\/png;base64,/);
    expect(decideProposal('police', p.id, 'publish', 'director of communications')).toEqual({ error: expect.stringMatching(/second official/) });
    ok(decideProposal('police', p.id, 'publish', 'Commissioner'));
    const s = siteProps('police', { theme, illustration: null });
    expect(s.institution.logo).toMatchObject({ src: expect.stringMatching(/^\/api\/public-sites\/police\/logo\?v=/), alt: 'Police Command badge' });
    // Gold is too light for text on white: kept in hue, darkened to 4.5:1.
    expect(s.theme.primary).not.toBe('#e8b400');
    expect(s.theme.accent).toBe('#006b3f');
    ok(decideProposal('police', ok(proposeRestore('police', 0, 'A')).id, 'publish', 'B'));
    expect(getSiteSettings('police').brand).toBeUndefined();
  });

  it('cannot be set through the integration settings, and the logo is served from the platform', async () => {
    updateSiteSettings('police', { brand: BRAND } as never, 'CIO');
    expect(getSiteSettings('police').brand).toBeUndefined();
    expect((await logoRoute(new NextRequest('http://x/api/public-sites/police/logo'), { params: { id: 'police' } })).status).toBe(404);
    ok(decideProposal('police', ok(proposeSiteChange('police', { brand: BRAND }, 'A')).id, 'publish', 'B'));
    const r = await logoRoute(new NextRequest('http://x/api/public-sites/police/logo'), { params: { id: 'police' } });
    expect(r.headers.get('content-type')).toBe('image/png');
    expect(r.headers.get('x-content-type-options')).toBe('nosniff');
    expect(new Uint8Array(await r.arrayBuffer())[1]).toBe(0x50);
  });
});
