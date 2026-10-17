import { describe, it, expect, beforeEach } from 'vitest';
import { proposeSiteChange, decideProposal, proposeRestore, siteEditorial, resetSiteEditorial, contentProblems } from './site-editorial';
import { resetSiteSettings, getSiteSettings, updateSiteSettings } from './site-settings';
import { listAudit } from './store';
import { effectiveContent } from '@/lib/public-sites/effective';
import { applyNation } from '@/lib/nation/registry';
import { siteContent } from '@/lib/public-sites';
import { translatableStrings } from '@/lib/public-sites/translation';

const ok = <T,>(r: T | { error: string }): T => { if (r && typeof r === 'object' && 'error' in r) throw new Error((r as { error: string }).error); return r as T; };
const NEWS = { news: [{ title: 'Clinics open on Saturdays', summary: 'From November.', date: '2 Nov 2026' }] };

describe('site editorial workflow', () => {
  beforeEach(() => { resetSiteEditorial(); resetSiteSettings(); });

  it('publishes a proposal only when a second, different official approves it', () => {
    const p = ok(proposeSiteChange('health', { content: NEWS }, 'Director of Communications', 'Weekend hours'));
    expect(p.summary).toEqual(['news']);
    expect(decideProposal('health', p.id, 'publish', ' director of communications ')).toEqual({ error: expect.stringMatching(/second official/) });
    expect(effectiveContent('health').content.newsSource).toBe('sample');
    const e = ok(decideProposal('health', p.id, 'publish', 'Permanent Secretary'));
    expect(e.version).toBe(1);
    expect(e.published).toMatchObject({ proposedBy: 'Director of Communications', publishedBy: 'Permanent Secretary' });
    const c = effectiveContent('health').content;
    expect(c.newsSource).toBe('nation');
    expect(c.news[0]).toMatchObject({ title: 'Clinics open on Saturdays', date: '2 Nov 2026' });
    expect(c.statisticsSource).toBe('sample');
    const actions = listAudit().map(a => a.action);
    expect(actions).toContain('site.content.propose');
    expect(actions).toContain('site.content.publish');
  });

  it('never publishes over a version the proposer did not see', () => {
    const a = ok(proposeSiteChange('police', { content: NEWS }, 'Officer A'));
    const b = ok(proposeSiteChange('police', { content: { alert: { label: 'NOTICE', text: 'New stations open.' } } }, 'Officer B'));
    ok(decideProposal('police', a.id, 'publish', 'Commissioner'));
    expect(decideProposal('police', b.id, 'publish', 'Commissioner')).toEqual({ error: expect.stringMatching(/Version 1 was published after/) });
  });

  it('requires a reason to reject, lets only the proposer withdraw, and closes decided proposals', () => {
    const p = ok(proposeSiteChange('trade', { content: NEWS }, 'Analyst'));
    expect(decideProposal('trade', p.id, 'reject', 'Director')).toEqual({ error: expect.stringMatching(/reason/) });
    expect(decideProposal('trade', p.id, 'withdraw', 'Director')).toEqual({ error: expect.stringMatching(/Only the official who proposed/) });
    ok(decideProposal('trade', p.id, 'reject', 'Director', 'Not yet announced'));
    expect(decideProposal('trade', p.id, 'publish', 'Minister')).toEqual({ error: expect.stringMatching(/already rejected/) });
    const q = ok(proposeSiteChange('trade', { content: NEWS }, 'Analyst'));
    expect(ok(decideProposal('trade', q.id, 'withdraw', 'analyst')).proposals[0]!.status).toBe('withdrawn');
  });

  it('changes the design through the same review, within the site\'s sector', () => {
    expect(proposeSiteChange('police', { preset: 'chamber-hansard' }, 'Officer A')).toEqual({ error: expect.stringMatching(/not one this site may use/) });
    const p = ok(proposeSiteChange('police', { preset: 'response-community' }, 'Officer A'));
    expect(getSiteSettings('police').preset).toBeUndefined();
    ok(decideProposal('police', p.id, 'publish', 'Commissioner'));
    expect(getSiteSettings('police').preset).toBe('response-community');
  });

  it('restores an earlier version, back to the reference content, through review', () => {
    ok(decideProposal('health', ok(proposeSiteChange('health', { content: NEWS }, 'A')).id, 'publish', 'B'));
    ok(decideProposal('health', ok(proposeSiteChange('health', { content: { alert: { label: 'X', text: 'Y' } } }, 'A')).id, 'publish', 'B'));
    expect(effectiveContent('health').content.alert).toEqual({ label: 'X', text: 'Y' });
    const r = ok(proposeRestore('health', 0, 'A'));
    expect(r.change.replace).toBe(true);
    ok(decideProposal('health', r.id, 'publish', 'B'));
    const c = effectiveContent('health').content;
    expect(c.newsSource).toBe('sample');
    expect(c.alert?.label).toBe('HEALTH ALERT');
    expect(siteEditorial('health').versions.map(v => v.version)).toEqual([3, 2, 1]);
  });

  it('previews a pending proposal without publishing it', () => {
    const p = ok(proposeSiteChange('health', { content: NEWS }, 'A'));
    expect(effectiveContent('health', p.id)).toMatchObject({ previewing: true, content: { newsSource: 'nation' } });
    expect(effectiveContent('health', 'SC-NOPE').previewing).toBe(false);
    expect(effectiveContent('health').content.newsSource).toBe('sample');
  });

  it('keeps the existing website as the owner of the news in Link mode', () => {
    ok(decideProposal('health', ok(proposeSiteChange('health', { content: NEWS }, 'A')).id, 'publish', 'B'));
    updateSiteSettings('health', { website: 'https://www.health.example.gov' }, 'CIO');
    expect(effectiveContent('health').content.newsSource).toBe('nation');
  });

  it('refuses unsafe or malformed content', () => {
    expect(contentProblems({ news: [{ title: '', summary: '' }] })).toMatch(/needs a title/);
    expect(contentProblems({ hero: { headline: ['One'] } } as never)).toMatch(/two headline lines/);
    expect(contentProblems({ quickServices: [{ title: 'Pay', subtitle: '', color: 'primary', icon: '!', to: '/nowhere' }] })).toMatch(/not a section/);
    expect(contentProblems({ news: [{ title: 'A', summary: '', url: 'http://10.0.0.1/x' }] })).toMatch(/public web address/);
    expect(contentProblems({ evil: 1 } as never)).toMatch(/Unknown field/);
    expect(contentProblems({ legalLine: 'x'.repeat(700) })).toMatch(/longer than 600/);
    expect(proposeSiteChange('health', {}, 'A')).toEqual({ error: 'The proposal changes nothing' });
    expect(proposeSiteChange('health', { content: NEWS }, ' ')).toEqual({ error: expect.stringMatching(/Name the official/) });
  });

  describe('translations', () => {
    beforeEach(() => applyNation({ configured: true, stateName: 'Republic of Meridia', locale: 'sw' }));

    it('show the published translation of the nation\'s language, string by string', () => {
      const t = ok(proposeSiteChange('police', { translation: { locale: 'sw', entries: { 'hero.headline.0': { source: 'Safe Citizens,', target: 'Raia Salama,' } } } }, 'Translator'));
      expect(t.summary).toEqual(['translation (sw, 1 strings)']);
      expect(effectiveContent('police').content.hero.headline[0]).toBe('Safe Citizens,');
      expect(effectiveContent('police', t.id).content.hero.headline[0]).toBe('Raia Salama,');
      ok(decideProposal('police', t.id, 'publish', 'Director'));
      const e = effectiveContent('police');
      expect(e.content.hero.headline[0]).toBe('Raia Salama,');
      expect(e.language).toMatchObject({ locale: 'sw', lang: 'en', dir: 'ltr' });
      expect(e.language.coverage.translated).toBe(1);
    });

    it('turn right to left only when every string is translated into a right-to-left language', () => {
      applyNation({ configured: true, stateName: 'Republic of Meridia', locale: 'ar' });
      const texts = translatableStrings(siteContent('police'));
      const half = Object.fromEntries(texts.slice(0, 10).map(({ path, text }) => [path, { source: text, target: `ع ${text}` }]));
      ok(decideProposal('police', ok(proposeSiteChange('police', { translation: { locale: 'ar', entries: half } }, 'T')).id, 'publish', 'D'));
      expect(effectiveContent('police').language.dir).toBe('ltr');
      const rest = Object.fromEntries(texts.slice(10).map(({ path, text }) => [path, { source: text, target: `ع ${text}` }]));
      ok(decideProposal('police', ok(proposeSiteChange('police', { translation: { locale: 'ar', entries: rest } }, 'T')).id, 'publish', 'D'));
      expect(effectiveContent('police').language).toMatchObject({ lang: 'ar', dir: 'rtl', coverage: { complete: true } });
      // A later English change makes that string out of date: back to left to right until it is translated.
      ok(decideProposal('police', ok(proposeSiteChange('police', { content: { alert: { label: 'NOTICE', text: 'New text' } } }, 'T')).id, 'publish', 'D'));
      expect(effectiveContent('police').language.dir).toBe('ltr');
      // Restoring version 2 brings back its content and its translations.
      ok(decideProposal('police', ok(proposeRestore('police', 2, 'T')).id, 'publish', 'D'));
      expect(effectiveContent('police').language.dir).toBe('rtl');
    });

    it('refuse translations of text the site no longer has, or that break placeholders', () => {
      expect(proposeSiteChange('police', { translation: { locale: 'sw', entries: { 'hero.headline.0': { source: 'Old words', target: 'Maneno' } } } }, 'T')).toEqual({ error: expect.stringMatching(/has changed/) });
      expect(proposeSiteChange('police', { translation: { locale: 'sw', entries: { 'institution.emergencyButton.label': { source: 'Emergency {emergency.police:999}', target: 'Dharura 999' } } } }, 'T')).toEqual({ error: expect.stringMatching(/placeholders/) });
      expect(proposeSiteChange('police', { translation: { locale: 'xx', entries: {} } }, 'T')).toEqual({ error: expect.stringMatching(/not a language/) });
      expect(proposeSiteChange('police', { translation: { locale: 'sw', entries: { 'nope.path': { source: 'a', target: 'b' } } } }, 'T')).toEqual({ error: expect.stringMatching(/not text on this site/) });
    });
  });
});
