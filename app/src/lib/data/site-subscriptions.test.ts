import { describe, it, expect, beforeEach } from 'vitest';
import { subscribe, confirmSubscription, unsubscribe, lookupToken, subscriberCounts, siteOutbox, queueUpdate, resetSiteSubscriptions, CONFIRM_DAYS } from './site-subscriptions';
import { resetSiteEditorial, proposeSiteChange, decideProposal } from './site-editorial';
import { listAudit } from './store';

const tokenOf = (link: string) => new URL(link, 'http://x').searchParams.get('token')!;
const ok = <T,>(r: T | { error: string }): T => { if (r && typeof r === 'object' && 'error' in r) throw new Error((r as { error: string }).error); return r as T; };

describe('email updates from public sites', () => {
  beforeEach(() => { resetSiteSubscriptions(); resetSiteEditorial(); });

  it('sends nothing but a confirmation until the person confirms', () => {
    expect(subscribe('police', ' Amina@Example.org ', { sender: '1' })).toEqual({ ok: true });
    expect(subscriberCounts('police')).toMatchObject({ pending: 1, confirmed: 0 });
    const [m] = siteOutbox('police');
    expect(m).toMatchObject({ kind: 'confirm', to: 'amina@example.org' });
    expect(queueUpdate('police', 'News', 'Body')).toBe(0);
    const token = tokenOf(m!.link);
    expect(lookupToken(token)).toEqual({ siteId: 'police', status: 'pending' });
    expect(confirmSubscription(token)).toEqual({ siteId: 'police' });
    expect(subscriberCounts('police')).toMatchObject({ pending: 0, confirmed: 1 });
    expect(queueUpdate('police', 'News', 'Body')).toBe(1);
  });

  it('answers the same whether or not an address already subscribes, and refuses bad addresses', () => {
    subscribe('police', 'a@example.org', { sender: '1' });
    confirmSubscription(tokenOf(siteOutbox('police')[0]!.link));
    const queued = siteOutbox('police').length;
    expect(subscribe('police', 'a@example.org', { sender: '2' })).toEqual({ ok: true });
    expect(siteOutbox('police').length).toBe(queued);
    expect(subscribe('police', 'not-an-address', { sender: '3' })).toEqual({ error: 'invalid' });
    expect(subscribe('police', 'a@b', { sender: '3' })).toEqual({ error: 'invalid' });
  });

  it('limits attempts per sender and per address', () => {
    for (let i = 0; i < 5; i++) expect(subscribe('police', `p${i}@example.org`, { sender: '9', now: 1000 + i })).toEqual({ ok: true });
    expect(subscribe('police', 'p6@example.org', { sender: '9', now: 2000 })).toEqual({ error: 'busy' });
    expect(subscribe('police', 'p6@example.org', { sender: '9', now: 2000 + 11 * 60_000 })).toEqual({ ok: true });
    for (let i = 0; i < 3; i++) subscribe('health', 'same@example.org', { sender: `s${i}`, now: 5000 });
    expect(subscribe('health', 'same@example.org', { sender: 'other', now: 5001 })).toEqual({ error: 'busy' });
  });

  it('expires confirmation links, and deletes the address on unsubscribe', () => {
    const t0 = Date.UTC(2026, 9, 1);
    subscribe('trade', 'late@example.org', { sender: '1', now: t0 });
    const late = tokenOf(siteOutbox('trade')[0]!.link);
    expect(confirmSubscription(late, t0 + (CONFIRM_DAYS + 1) * 86_400_000)).toEqual({ error: expect.stringMatching(/not valid/) });

    subscribe('trade', 'b@example.org', { sender: '2' });
    confirmSubscription(tokenOf(siteOutbox('trade')[0]!.link));
    queueUpdate('trade', 'First', 'x');
    queueUpdate('trade', 'Second', 'y');
    const [second, first] = siteOutbox('trade').filter(m => m.kind === 'update');
    expect(second!.subject).toBe('Second');
    // The link in an older email still works.
    expect(unsubscribe(tokenOf(first!.link))).toEqual({ siteId: 'trade' });
    expect(unsubscribe(tokenOf(second!.link))).toEqual({ error: expect.any(String) });
    expect(subscriberCounts('trade')).toMatchObject({ confirmed: 0, unsubscribed: 1 });
    expect(queueUpdate('trade', 'Third', 'z')).toBe(0);
    expect(JSON.stringify(listAudit())).not.toContain('b@example.org');
  });

  it('emails confirmed subscribers when a version with new announcements is published', () => {
    subscribe('health', 'c@example.org', { sender: '1' });
    confirmSubscription(tokenOf(siteOutbox('health')[0]!.link));
    const p = ok(proposeSiteChange('health', { content: { news: [{ title: 'Clinics open on Saturdays', summary: 'From November.' }] } }, 'A'));
    ok(decideProposal('health', p.id, 'publish', 'B'));
    const update = siteOutbox('health').find(m => m.kind === 'update')!;
    expect(update).toMatchObject({ to: 'c@example.org', subject: expect.stringContaining('Clinics open on Saturdays') });
    expect(update.link).toMatch(/action=unsubscribe/);
    // Publishing the same news again sends nothing new.
    ok(decideProposal('health', ok(proposeSiteChange('health', { content: { alert: { label: 'NOTICE', text: 'x' } } }, 'A')).id, 'publish', 'B'));
    expect(siteOutbox('health').filter(m => m.kind === 'update')).toHaveLength(1);
  });
});
