import { describe, it, expect, beforeEach } from 'vitest';
import { searchSites, words } from './search';
import { applyNation } from '@/lib/nation/registry';
import { resetSiteEditorial, proposeSiteChange, decideProposal } from '@/lib/data/site-editorial';
import { resetSiteSettings } from '@/lib/data/site-settings';

const ok = <T,>(r: T | { error: string }): T => { if (r && typeof r === 'object' && 'error' in r) throw new Error((r as { error: string }).error); return r as T; };

describe('public site search', () => {
  beforeEach(() => { applyNation({ configured: false }); resetSiteEditorial(); resetSiteSettings(); });

  it('ignores case and accents, and splits words in any script', () => {
    expect(words('Ẹ̀KỌ́ àti Ìlera!')).toEqual(['eko', 'ati', 'ilera']);
    expect(words('شرطة المرور')).toEqual(['شرطة', 'المرور']);
  });

  it('finds a service on one site, leading where the site itself links', () => {
    const hits = searchSites('clearance', { site: 'police' });
    expect(hits[0]).toMatchObject({ siteId: 'police', kind: 'service', title: 'Police Clearance' });
    expect(hits.every(h => h.siteId === 'police')).toBe(true);
    expect(hits[0]!.href.startsWith('/')).toBe(true);
  });

  it('needs every word, and matches word beginnings', () => {
    expect(searchSites('missing person', { site: 'police' }).map(h => h.title)).toContain('Missing Person');
    expect(searchSites('missing unicorn', { site: 'police' })).toEqual([]);
    expect(searchSites('fraud', { site: 'police' }).some(h => h.title === 'New Anti-Fraud Unit Launched')).toBe(true);
  });

  it('searches every site when none is named, and never returns the same place twice', () => {
    const hits = searchSites('news');
    expect(new Set(hits.map(h => h.siteId)).size).toBeGreaterThan(5);
    const keys = hits.map(h => `${h.siteId}|${h.title}|${h.href}`);
    expect(new Set(keys).size).toBe(keys.length);
    expect(searchSites('')).toEqual([]);
    expect(searchSites('a')).toEqual([]);
  });

  it('finds what the nation publishes, with its facts filled in', () => {
    ok(decideProposal('police', ok(proposeSiteChange('police', { content: { news: [{ title: 'Stations open on Sundays', summary: 'From November.' }] } }, 'A')).id, 'publish', 'B'));
    expect(searchSites('sundays', { site: 'police' })[0]).toMatchObject({ kind: 'news', href: '/police#news' });
    expect(searchSites('fraud', { site: 'police' }).some(h => h.kind === 'news')).toBe(false);
    applyNation({ configured: true, stateName: 'Republic of Meridia' });
    expect(JSON.stringify(searchSites('police'))).not.toMatch(/\{[a-z.]+(:[^}]*)?\}/i);
  });
});
