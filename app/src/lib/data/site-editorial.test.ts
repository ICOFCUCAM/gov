import { describe, it, expect, beforeEach } from 'vitest';
import { proposeSiteChange, decideProposal, proposeRestore, siteEditorial, resetSiteEditorial, contentProblems } from './site-editorial';
import { resetSiteSettings, getSiteSettings, updateSiteSettings } from './site-settings';
import { listAudit } from './store';
import { effectiveContent } from '@/lib/public-sites/effective';

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
});
