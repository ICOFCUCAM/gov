import { describe, it, expect, beforeEach } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { REFERENCE_SITES, SITE_IDS, siteContent } from './index';
import { fillDeep, fillTokens, siteTokens } from './tokens';
import type { SiteLink } from './types';
import { applyNation } from '@/lib/nation/registry';
import { siteProps, siteHref } from '@/apps/_shared/public/site-props';

const APP = path.join(__dirname, '..', '..', 'app');
const routes: string[] = JSON.parse(fs.readFileSync(path.join(APP, 'route-lock.json'), 'utf8'));
const SECTIONS = new Set(['home', 'services', 'statistics', 'news', 'programmes', 'contact', 'about']);

/** Every `to` in a record, with where it was found. */
function links(v: unknown, at = ''): [string, SiteLink][] {
  if (Array.isArray(v)) return v.flatMap((x, i) => links(x, `${at}[${i}]`));
  if (v && typeof v === 'object') {
    return Object.entries(v).flatMap(([k, x]) => (k === 'to' ? [[at, x as SiteLink] as [string, SiteLink]] : links(x, `${at}.${k}`)));
  }
  return [];
}
const theme = { ink: '#000', inkSoft: '#111', primary: '#123456', accent: '#654321', surface: '#fff', surfaceMute: '#eee', line: '#ddd', emergencyA: '#f00', emergencyB: '#a00' };

describe('public-site content records', () => {
  beforeEach(() => applyNation({ configured: false }));

  it('cover every public site page built on PublicSiteShell, and each page reads its record', () => {
    for (const id of SITE_IDS) {
      const page = fs.readFileSync(path.join(APP, '(public)', id, 'page.tsx'), 'utf8');
      expect(page, id).toContain(`siteProps('${id}'`);
      expect(routes, id).toContain(`/${id}`);
    }
    expect(SITE_IDS.length).toBe(19);
  });

  it('only link to real places: a section of the site or a locked platform route', () => {
    for (const [id, site] of Object.entries(REFERENCE_SITES)) {
      for (const [at, to] of links(site)) {
        if (to.startsWith('/')) expect(routes, `${id}${at} → ${to}`).toContain(to.split('#')[0]);
        else expect(SECTIONS.has(to), `${id}${at} → ${to}`).toBe(true);
      }
    }
  });

  it('carry no fixed dates; news and figures are marked as samples', () => {
    for (const site of Object.values(REFERENCE_SITES)) {
      expect(JSON.stringify(site), site.id).not.toMatch(/\b20[12]\d\b/);
      expect(site.news.every(n => !n.date), site.id).toBe(true);
      expect(site.newsSource).toBe('sample');
      expect(site.statisticsSource).toBe('sample');
    }
  });

  it('leave no placeholder unfilled', () => {
    const tokens = siteTokens(2031);
    for (const site of Object.values(REFERENCE_SITES)) {
      const filled = JSON.stringify(fillDeep(site, tokens)).replace(/\{live\.\w+\}/g, '');
      expect(filled, site.id).not.toMatch(/\{[a-zA-Z.]+(:[^}]*)?\}/);
    }
  });
});

describe('placeholders', () => {
  it("follow the nation's offices, emergency numbers and AI choice", () => {
    applyNation({ configured: true, stateName: 'Kingdom of Kivara', stateForm: 'monarchy', executiveTitle: 'Prime Minister',
      constitution: { chambers: [{ name: 'House of Representatives', seats: 200 }, { name: 'House of Lords', seats: 90 }] },
      emergency: { police: '911' }, aiAssistant: false });
    const t = siteTokens(2031);
    expect(fillTokens('© {year} {upperChamber} · {primaryChamber}', t)).toBe('© 2031 House of Lords · House of Representatives');
    expect(fillTokens('Emergency {emergency.police:999}', t)).toBe('Emergency 911');
    expect(fillTokens('{ai:AI Tutor|Tutor}', t)).toBe('Tutor');
    expect(fillTokens('{executiveBody}', t)).toBe('The Office of the Prime Minister');
    applyNation({ configured: false });
    expect(fillTokens('Emergency {emergency.police:999} · {upperChamber}', siteTokens(2031))).toBe('Emergency 999 · Senate');
  });
});

describe('nation content over the reference record', () => {
  it("replaces fields whole and stops marking the nation's own news and figures as samples", () => {
    const c = siteContent('police', { news: [{ title: 'Real', summary: 'Published by the institution', date: '3 March' }], institution: { name: 'National Police Service' } as never });
    expect(c.news).toHaveLength(1);
    expect(c.newsSource).toBe('nation');
    expect(c.statisticsSource).toBe('sample');
    expect(c.institution.name).toBe('National Police Service');
    expect(c.institution.crest).toBe(REFERENCE_SITES.police!.institution.crest);
  });
});

describe('shell props', () => {
  beforeEach(() => applyNation({ configured: false }));

  it('turn sections into anchors on the site and keep platform routes', () => {
    expect(siteHref('police', 'home')).toBe('/police');
    expect(siteHref('police', 'news')).toBe('/police#news');
    expect(siteHref('police', '/wallet/payments')).toBe('/wallet/payments');
  });

  it('mark live figures as live and the rest as samples', () => {
    const p = siteProps('education', { theme, illustration: null, live: { totalSites: '1,234' }, year: 2031 });
    expect(p.statistics[0]).toMatchObject({ value: '1,234', live: true });
    expect(p.statistics.slice(1).every(s => !s.live)).toBe(true);
    expect(p.statisticsSample).toBe(true);
    expect(p.newsSample).toBe(true);
    expect(p.legalLine).toContain('2031');
  });

  it("wear the nation's insignia once setup is complete", () => {
    expect(siteProps('police', { theme, illustration: null }).institution.crest).toBe('🛡');
    applyNation({ configured: true, stateName: 'Republic of Meridia', seal: 'RM' });
    const crest = siteProps('police', { theme, illustration: null }).institution.crest as { props: { children: string } };
    expect(crest.props.children).toBe('RM');
  });
});
