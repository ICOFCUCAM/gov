import { describe, it, expect, beforeEach } from 'vitest';
import * as React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { PublicSite, presetFor } from './PublicSite';
import { PRESETS, DEFAULT_PRESET, SITE_SECTOR, presetsFor } from './design/presets';
import { siteProps } from './site-props';
import { contrast, AA } from './design/contrast';
import { SITE_IDS } from '@/lib/public-sites';
import { applyNation } from '@/lib/nation/registry';
import { resetSiteSettings, updateSiteSettings, syncSiteFeed } from '@/lib/data/site-settings';
import HealthPage from '@/app/(public)/health/page';
import TreasuryPage from '@/app/(public)/treasury/page';

const LIVE = { totalSites: '295', healthAlert: 'No national health emergency is in effect. Follow the advisories from your regional health authority.' };
const theme = { ink: '#0b1a2c', inkSoft: '#13294b', primary: '#1e63b8', accent: '#3a82d0', surface: '#f4f6f9', surfaceMute: '#e8eef6', line: '#dde3ec', emergencyA: '#c1252f', emergencyB: '#a01c25' };
const render = (id: string, preset?: string) =>
  renderToStaticMarkup(React.createElement(PublicSite, { id, theme, illustration: null, live: LIVE, preset }));
const hrefs = (html: string) => new Set([...html.matchAll(/href="([^"]+)"/g)].map(m => m[1]!.replace(/&amp;/g, '&')));
const decode = (html: string) => html.replace(/&amp;/g, '&').replace(/&#x27;/g, "'").replace(/&quot;/g, '"').replace(/&lt;/g, '<').replace(/&gt;/g, '>');

const expected = (id: string) => {
  const s = siteProps(id, { theme, illustration: null, live: LIVE });
  return [        ...s.nav.map(n => n.label), ...s.quickServices.map(q => q.title), ...s.featured.map(f => f.title),
        ...s.statistics.map(x => x.label), ...s.news.map(n => n.title), ...s.initiatives.map(i => i.title),
        ...s.shortcuts.map(x => x.title), ...s.footerSections.flatMap(f => f.items.map(i => (typeof i === 'string' ? i : i.label))),
        s.newsletter.heading, s.legalLine, s.hero.subhead, s.hero.primaryCta.label, s.hero.secondaryCta.label,
        ...(s.alert ? [s.alert.text] : []), ...(s.hero.sideNote ? [s.hero.sideNote.title] : []), ...(s.locator ? [s.locator.title] : []),
  ];
};

describe('public-site design presets', () => {
  beforeEach(() => applyNation({ configured: false }));

  it('give every institution a sector and a design of its own', () => {
    for (const id of SITE_IDS) {
      expect(SITE_SECTOR[id], id).toBeTruthy();
      expect(PRESETS[DEFAULT_PRESET[id]!]?.sector, id).toBe(SITE_SECTOR[id]);
    }
    const defaults = SITE_IDS.map(id => DEFAULT_PRESET[id]);
    expect(new Set(defaults).size).toBe(SITE_IDS.length);
  });

  it('place every block exactly once in every preset', () => {
    const all = ['hero', 'alert', 'services', 'featured', 'figures', 'news', 'programmes', 'contact', 'shortcuts'];
    for (const p of Object.values(PRESETS)) {
      if (p.id === 'civic-standard' || p.bespoke) continue;
      const blocks = p.layout.flat().map(r => r.block);
      for (const b of all) {
        // The chamber hero carries the alert (the sitting notice) itself.
        const expected = b === 'alert' && blocks.includes('hero') && p.layout.flat().some(r => r.block === 'hero' && r.variant === 'chamber') ? 0 : 1;
        expect(blocks.filter(x => x === b).length, `${p.id}: ${b}`).toBe(expected);
      }
    }
  });

  it("keep every link, item and section anchor of the site's content in every preset it may use", () => {
    for (const id of SITE_IDS) {
      const expectedText = expected(id);
      const standard = hrefs(render(id, 'civic-standard'));
      for (const p of presetsFor(id).filter(x => !x.bespoke)) {
        const html = render(id, p.id);
        const text = decode(html);
        for (const t of expectedText) expect(text, `${id} / ${p.id}: "${t}"`).toContain(t);
        const links = hrefs(html);
        for (const h of standard) expect(links.has(h), `${id} / ${p.id}: link ${h}`).toBe(true);
        for (const anchor of ['services', 'statistics', 'news', 'programmes', 'contact', 'about']) {
          expect(html.match(new RegExp(`id="${anchor}"`, 'g'))?.length ?? 0, `${id} / ${p.id}: #${anchor}`).toBe(1);
        }
      }
    }
  });

  it('fall back to the site default for a preset from another sector', () => {
    expect(presetFor('police', 'chamber-hansard').id).toBe(DEFAULT_PRESET.police);
    expect(presetFor('police', 'civic-standard').id).toBe('civic-standard');
    expect(presetFor('police', 'response-community').id).toBe('response-community');
  });

  it('keep every item, link and anchor of the record in the bespoke Health and Treasury designs', () => {
    for (const [id, Page] of [['health', HealthPage], ['treasury', TreasuryPage]] as const) {
      const html = renderToStaticMarkup(React.createElement(Page, {}));
      const text = decode(html);
      // The Health alert is live (health-operations engine), so its text is not fixed.
      for (const t of expected(id).filter(t => t !== LIVE.healthAlert)) expect(text, `${id}: "${t}"`).toContain(t);
      const links = hrefs(html);
      const standard = hrefs(render(id, 'civic-standard'));
      for (const h of standard) {
        if (h === `/${id}/services`) continue;
        // Treasury's header has a search field (a form to /search) in place of the search link.
        if (h === `/search?site=${id}` && id === 'treasury') { expect(html).toContain('action="/search"'); continue; }
        expect(links.has(h), `${id}: link ${h}`).toBe(true);
      }
      for (const anchor of ['services', 'statistics', 'news', 'programmes', 'contact', 'about']) {
        expect(html.match(new RegExp(`id="${anchor}"`, 'g'))?.length ?? 0, `${id}: #${anchor}`).toBe(1);
      }
    }
  });

  it("show a Link-mode ministry's existing website: gateway, its news with source, schema.org, and its chosen design", async () => {
    resetSiteSettings();
    const site = 'https://www.police.example.gov';
    const rss = `<rss><channel><item><title>Station hours change</title><link>${site}/news/7</link><description>From Monday.</description><pubDate>Mon, 12 Oct 2026 08:00:00 GMT</pubDate></item></channel></rss>`;
    updateSiteSettings('police', { website: site, feedUrl: `${site}/feed.xml`, preset: 'response-community' }, 'CIO');
    await syncSiteFeed('police', 'test', { fetch: (async () => new Response(rss, { headers: { 'content-type': 'application/rss+xml' } })) as unknown as typeof fetch, resolve: async () => ['203.0.113.5'] });
    for (const html of [render('police'), render('police', 'civic-standard')]) {
      const text = decode(html);
      expect(text).toContain('Its main website is police.example.gov.');
      expect(html).toContain(`href="${site}"`);
      expect(html).toContain(`href="${site}/news/7"`);
      expect(text).toContain('From police.example.gov');
      expect(text).toContain('12 Oct 2026');
      expect(text).not.toContain('Sample announcements');
      expect(html).toContain('"@type":"GovernmentOrganization"');
      expect(html).toContain(`"sameAs":["${site}"]`);
    }
    expect(presetFor('police').id).toBe('response-community');
    updateSiteSettings('health', { website: 'https://health.example.gov' }, 'CIO');
    const health = decode(renderToStaticMarkup(React.createElement(HealthPage, {})));
    expect(health).toContain('Its main website is health.example.gov.');
    resetSiteSettings();
  });
});

describe('public-site accessibility foundations (WCAG 2.2 AA)', () => {
  beforeEach(() => applyNation({ configured: false }));

  const pages = () => [
    ...SITE_IDS.flatMap(id => presetsFor(id).filter(p => !p.bespoke).map(p => [`${id} / ${p.id}`, render(id, p.id)] as const)),
    ['health', renderToStaticMarkup(React.createElement(HealthPage, {}))] as const,
    ['treasury', renderToStaticMarkup(React.createElement(TreasuryPage, {}))] as const,
  ];

  it('give every design a skip link, one main region, banner, footer, one h1 and a language', () => {
    for (const [name, html] of pages()) {
      expect(html, `${name}: skip link`).toMatch(/<a href="#main"[^>]*>/);
      expect(html.match(/<main[\s>]/g)?.length, `${name}: one <main>`).toBe(1);
      expect(html, `${name}: main is the skip target`).toMatch(/<main id="main"/);
      expect(html, `${name}: header`).toContain('<header');
      expect(html, `${name}: footer`).toContain('<footer');
      expect(html.match(/<h1[\s>]/g)?.length, `${name}: one h1`).toBe(1);
      expect(html, `${name}: lang`).toMatch(/data-site-root=""|lang="[a-z]{2}"/);
      expect(html, `${name}: official banner is a named region`).toMatch(/<section aria-label="Official website of /i);
    }
  });

  it('name every control and image', () => {
    for (const [name, html] of pages()) {
      for (const b of html.match(/<button\b[^>]*>[\s\S]*?<\/button>/g) ?? []) {
        const named = /aria-label="[^"]+"/.test(b) || /\p{L}/u.test(b.replace(/<[^>]+>/g, ''));
        expect(named, `${name}: unnamed button ${b.slice(0, 80)}`).toBe(true);
      }
      for (const img of html.match(/<img\b[^>]*>/g) ?? []) expect(img, `${name}: image without alt`).toMatch(/\balt="/);
      for (const input of (html.match(/<input\b[^>]*>/g) ?? []).filter(i => !/type="hidden"/.test(i))) expect(input, `${name}: input without a label`).toMatch(/aria-label="[^"]+"|id="/);
      for (const svg of html.match(/<svg\b[^>]*>/g) ?? []) expect(svg, `${name}: svg neither hidden nor named`).toMatch(/aria-hidden="true"|role="img"|aria-label=/);
    }
  });

  it('use theme colours that read at 4.5:1 on the light surfaces', () => {
    for (const id of SITE_IDS) {
      const th = siteProps(id, { theme, illustration: null, live: LIVE }).theme;
      for (const k of ['ink', 'inkSoft', 'primary', 'accent', 'emergencyA'] as const) {
        for (const bg of ['#ffffff', th.surface, th.surfaceMute]) expect(contrast(th[k], bg), `${id}: ${k} on ${bg}`).toBeGreaterThanOrEqual(AA);
      }
    }
  });
});
