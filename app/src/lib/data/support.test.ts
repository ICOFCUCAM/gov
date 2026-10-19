import { describe, it, expect, beforeEach } from 'vitest';
import { resetReadiness } from '@/lib/data/readiness';
import { stagingOff, cosign } from '@/lib/data/testkit';
import { resetUpdates, getChamber, decide, reportHealth, updateSettings, HEALTH_CHECKS, HOME_NATION } from './updates';
import { resetSecurity } from './security-store';
import { resetChangeControl } from './change-control';
import { listAudit } from './store';
import {
  resetSupport, openTicket, ticketAction, listTickets, allTickets, getTicket, slaClocks, setSupportTier, supportTier,
  declareServiceIncident, updateServiceIncident, SUPPORT_TIERS,
} from './support';
import { statusPage, slaReport, downtime } from './status';
import { GET as supportGET, POST as supportPOST } from '@/app/api/releases/support/route';
import { POST as ticketPOST, GET as ticketGET } from '@/app/api/releases/support/[ticketId]/route';
import { GET as statusGET } from '@/app/api/releases/status/route';
import { GET as reportGET } from '@/app/api/releases/sla-report/route';
import { GET as queueGET } from '@/app/api/releases/publisher/support/route';
import type { HealthCheck, SupportTicket } from '@/lib/api/types';

const MIN = 60_000, HOUR = 60 * MIN;
const ok = <T,>(r: T): Exclude<T, { error: string }> => { if (r && typeof r === 'object' && 'error' in r) throw new Error((r as { error: string }).error); return r as Exclude<T, { error: string }>; };
const auditSince = (mark: number) => listAudit().filter(a => a.seq > mark);
const mark = () => listAudit()[0]?.seq ?? 0;
const T0 = Date.parse('2026-09-01T08:00:00Z');
const ticket = (o: Partial<SupportTicket> = {}): SupportTicket => ({
  id: 'SUP-X', nationId: 'home', priority: 'P2', title: 't', description: 'd', source: 'nation', state: 'open', tier: 'enterprise',
  openedAt: new Date(T0).toISOString(), openedBy: 'x', pausedMinutes: 0, thread: [], ...o,
});
const sandboxKey = () => { const c = getChamber('sandbox'); if ('error' in c) throw new Error(c.error); return c.nation.channelKey; };
const json = (url: string, body: unknown) => new Request(url, { method: 'POST', body: JSON.stringify(body), headers: { 'content-type': 'application/json' } }) as never;

beforeEach(() => { resetUpdates(); resetReadiness(); stagingOff(); resetSecurity(); resetSupport(); resetChangeControl(); });

describe('SLA clocks', () => {
  it('response and resolution are measured against the tier the ticket was opened under', () => {
    const t = SUPPORT_TIERS.enterprise.targets.P2; // 120 min / 48 h
    expect(slaClocks(ticket(), T0 + 60 * MIN)).toMatchObject({ response: { state: 'running', minutesLeft: 60 }, resolution: { state: 'running' } });
    expect(slaClocks(ticket(), T0 + (t.responseMinutes + 1) * MIN).response.state).toBe('breached');
    expect(slaClocks(ticket({ firstResponseAt: new Date(T0 + 90 * MIN).toISOString() }), T0 + 10 * HOUR).response.state).toBe('met');
    expect(slaClocks(ticket({ resolvedAt: new Date(T0 + 47 * HOUR).toISOString() })).resolution.state).toBe('met');
    expect(slaClocks(ticket({ resolvedAt: new Date(T0 + 49 * HOUR).toISOString() })).resolution.state).toBe('breached');
    expect(slaClocks(ticket({ tier: 'sovereign', resolvedAt: new Date(T0 + 30 * HOUR).toISOString() })).resolution.state).toBe('breached'); // 24 h
  });

  it('the resolution clock pauses while the publisher waits on the nation', () => {
    const id = ok(openTicket('home', { priority: 'P2', title: 'Exports fail', description: 'Ledger export fails at month end.', by: 'Treasury' }, T0)).id;
    ok(ticketAction('publisher', null, id, { action: 'wait', by: 'Support', text: 'Please send the export log' }, T0 + HOUR));
    const paused = getTicket('home', id, T0 + 40 * HOUR)!;
    expect(paused.sla.resolution.state).toBe('paused');
    ok(ticketAction('nation', 'home', id, { action: 'reply', by: 'Treasury', text: 'Log attached' }, T0 + 31 * HOUR)); // 30 h waiting
    const after = getTicket('home', id, T0 + 60 * HOUR)!;
    expect(after.state).toBe('in-progress');
    expect(after.pausedMinutes).toBe(30 * 60);
    expect(after.sla.resolution).toMatchObject({ state: 'running', dueAt: new Date(T0 + 78 * HOUR).toISOString() });
    ok(ticketAction('publisher', null, id, { action: 'resolve', by: 'Support', text: 'Fixed the export mapping' }, T0 + 70 * HOUR));
    expect(getTicket('home', id)!.sla.resolution.state).toBe('met'); // 70 h, but 30 h were paused
  });
});

describe('tickets', () => {
  it('are validated, audited, and worked through allowed states only', () => {
    expect(openTicket('home', { priority: 'P9', title: 'x', description: 'x', by: 'a' })).toMatchObject({ status: 422 });
    expect(openTicket('home', { priority: 'P1', title: 'Portal down', description: 'short', by: 'a' })).toMatchObject({ status: 422 });
    const m = mark();
    const t = ok(openTicket('home', { priority: 'P1', title: 'Portal down', description: 'Citizens cannot sign in anywhere.', by: 'Duty officer', link: { kind: 'release', id: 'DR-141' } }));
    expect(t).toMatchObject({ state: 'open', tier: 'enterprise', link: { kind: 'release', id: 'DR-141' } });
    expect(ticketAction('nation', 'home', t.id, { action: 'close', by: 'Duty officer' })).toMatchObject({ status: 409 });
    expect(ticketAction('nation', 'home', t.id, { action: 'resolve', by: 'Duty officer', text: 'fixed it myself' })).toMatchObject({ status: 422 });
    const r = ok(ticketAction('publisher', null, t.id, { action: 'reply', by: 'Support', text: 'Looking now' }));
    expect(r.state).toBe('acknowledged');
    expect(r.firstResponseAt).toBeTruthy();
    expect(ticketAction('publisher', null, t.id, { action: 'reprioritise', by: 'Support', priority: 'P2', text: 'short' })).toMatchObject({ status: 422 });
    ok(ticketAction('publisher', null, t.id, { action: 'reprioritise', by: 'Support', priority: 'P2', text: 'Sign-in works on the backup path' }));
    ok(ticketAction('publisher', null, t.id, { action: 'resolve', by: 'Support', text: 'Certificate renewed' }));
    ok(ticketAction('nation', 'home', t.id, { action: 'reopen', by: 'Duty officer', text: 'Still failing in one region' }));
    ok(ticketAction('publisher', null, t.id, { action: 'resolve', by: 'Support', text: 'Region fixed' }));
    expect(ok(ticketAction('nation', 'home', t.id, { action: 'close', by: 'Duty officer' })).state).toBe('closed');
    const acts = auditSince(m).map(a => a.action);
    expect(acts).toEqual(expect.arrayContaining(['support.ticket.open', 'support.ticket.reply', 'support.ticket.reprioritise', 'support.ticket.resolve', 'support.ticket.reopen', 'support.ticket.close']));
  });

  it('a nation can reach only its own tickets', () => {
    const own = listTickets('sandbox');
    expect(own.every(t => t.nationId === 'sandbox')).toBe(true);
    expect(getTicket('sandbox', 'SUP-3003')).toBeUndefined(); // home's ticket
    expect(ticketAction('nation', 'sandbox', 'SUP-3003', { action: 'reply', by: 'x', text: 'hello' })).toMatchObject({ status: 404 });
  });

  it('the tier applies to tickets opened after a change, not before', () => {
    const before = ok(openTicket('sandbox', { priority: 'P1', title: 'Sign-in down', description: 'No one can sign in to the portal.', by: 'Owner' }));
    expect(setSupportTier('sandbox', 'gold', 'Sales')).toMatchObject({ status: 422 });
    ok(setSupportTier('sandbox', 'sovereign', 'Account manager'));
    expect(supportTier('sandbox')).toBe('sovereign');
    const after = ok(openTicket('sandbox', { priority: 'P1', title: 'Sign-in down again', description: 'No one can sign in to the portal.', by: 'Owner' }));
    expect(getTicket('sandbox', before.id)!.tier).toBe('standard');
    expect(after.tier).toBe('sovereign');
  });

  it('the publisher queue puts breached and nearly due tickets first', () => {
    const q = allTickets();
    const firstDone = q.findIndex(t => t.state === 'resolved' || t.state === 'closed');
    expect(q.slice(firstDone).every(t => t.state === 'resolved' || t.state === 'closed')).toBe(true);
    expect(q[0]!.id).toBe('SUP-3003'); // P2 with the least time left
  });
});

describe('fallback incidents open a P2 ticket automatically', () => {
  const healthy = (): HealthCheck[] => HEALTH_CHECKS.map(c => ({ key: c.key, ok: true, value: c.key === 'latency' ? 200 : c.key === 'error-rate' ? 0.2 : undefined }));
  it('when probation fails', () => {
    ok(updateSettings(HOME_NATION, { healthSource: 'agent' }, 'CIO'));
    ok(cosign(HOME_NATION, 'DR-141', { action: 'approve', by: 'CIO' }));
    ok(decide(HOME_NATION, 'DR-141', { action: 'prepare', by: 'Ops' }));
    ok(cosign(HOME_NATION, 'DR-141', { action: 'install', by: 'Ops', mode: 'self-hosted', verified: true }));
    const bad = healthy().map(c => (c.key === 'smoke-sign-in' || c.key === 'smoke-payments' ? { ...c, ok: false } : c));
    ok(reportHealth(HOME_NATION, { checks: bad }));
    const c = getChamber(HOME_NATION); if ('error' in c) throw new Error(c.error);
    const inc = c.incidents[0]!;
    const t = listTickets(HOME_NATION).find(x => x.link?.kind === 'incident' && x.link.id === inc.id)!;
    expect(t).toMatchObject({ priority: 'P2', source: 'fallback-incident', state: 'open', tier: 'enterprise' });
    expect(inc.timeline.some(e => e.text.includes(t.id))).toBe(true);
    expect(listAudit().some(a => a.action === 'support.ticket.open' && a.detail?.includes(inc.id))).toBe(true);
  });
});

describe('status page and monthly SLA report', () => {
  it('shows publisher services to every nation and the hosted platform only to SaaS nations', () => {
    const home = ok(statusPage('home'));
    expect(home.components.some(c => c.group === 'hosted')).toBe(false);
    expect(home.components.some(c => c.group === 'installation')).toBe(true); // live health of this installation
    expect(home.maintenance.upcoming.some(m => m.title === 'Registry storage migration')).toBe(true);
    const sb = ok(statusPage('sandbox'));
    expect(sb.components.find(c => c.key === 'portal')!.uptime90).toBeLessThan(100);
    expect(sb.components.some(c => c.group === 'installation')).toBe(false);
    expect(home.recent.some(i => i.id === 'SI-0102')).toBe(false); // the regional outage affected the sandbox only
  });

  it('counts unplanned impact only: full for major outages, half for partial, none for maintenance', () => {
    const now = Date.now();
    const d = ok(declareServiceIncident({ title: 'Payments API outage', impact: 'major-outage', components: ['payments'], nations: ['sandbox'], by: 'Ops' }, now - 2 * HOUR));
    ok(updateServiceIncident(d.id, { state: 'resolved', text: 'Recovered', by: 'Ops' }, now - HOUR));
    expect(downtime('sandbox', 'payments', now - 3 * HOUR, now, now)).toBe(60);
    expect(downtime('home', 'payments', now - 3 * HOUR, now, now)).toBe(0);
    const p = ok(declareServiceIncident({ title: 'Feed slow', impact: 'partial-outage', components: ['feed'], nations: 'all', by: 'Ops' }, now - 40 * MIN));
    ok(updateServiceIncident(p.id, { state: 'resolved', text: 'Recovered', by: 'Ops' }, now - 20 * MIN));
    expect(downtime('home', 'feed', now - HOUR, now, now)).toBe(10);
    expect(declareServiceIncident({ title: 'Window', impact: 'maintenance', components: ['registry'], by: 'Ops', start: new Date(now - HOUR).toISOString(), end: new Date(now).toISOString() }, now)).toMatchObject({ status: 422 });
  });

  it('reports availability against the tier target, incidents and ticket SLA performance', () => {
    const now = Date.now();
    const back = new Date(now - 40 * 86_400_000).toISOString().slice(0, 7);
    const r = ok(slaReport('sandbox', back));
    expect(r.tier.tier).toBe('standard');
    expect(r.incidents.some(i => i.id === 'SI-0102')).toBe(true);
    expect(r.serviceUptime).toBeLessThanOrEqual(100);
    const cur = ok(slaReport('home', new Date(now).toISOString().slice(0, 7)));
    expect(cur.tickets.opened).toBeGreaterThanOrEqual(0);
    expect(slaReport('home', '2026-13')).toMatchObject({ status: 422 });
    const h = ok(slaReport('home', new Date(now - 38 * 86_400_000).toISOString().slice(0, 7)));
    expect(h.tickets.byPriority.P1.responseBreached).toBe(1); // SUP-3001 answered in 45 min against 30
    expect(h.tickets.byPriority.P1.resolutionMet).toBe(1);
  });
});

describe('routes', () => {
  it('nation routes resolve the nation on the server; links must be the nation’s own', async () => {
    const mine = await (await supportGET(new Request('http://x/api/releases/support') as never)).json();
    expect(mine.tickets.every((t: { nationId: string }) => t.nationId === 'home')).toBe(true);
    expect(mine.policy.tier).toBe('enterprise');
    const theirs = await (await supportGET(new Request(`http://x/api/releases/support?link=${sandboxKey()}`) as never)).json();
    expect(theirs.tickets.every((t: { nationId: string }) => t.nationId === 'sandbox')).toBe(true);
    // Home cannot link the sandbox's fallback incident.
    const bad = await supportPOST(json('http://x/api/releases/support', { priority: 'P3', title: 'About that fallback', description: 'Please explain the incident.', by: 'CIO', about: { kind: 'incident', id: 'INC-U-2001' } }));
    expect(bad.status).toBe(422);
    const good = await supportPOST(json('http://x/api/releases/support', { priority: 'P3', title: 'About 1.4.1', description: 'Is 1.4.1 safe to install mid-month?', by: 'CIO', about: { kind: 'release', id: 'DR-141' } }));
    expect(good.status).toBe(201);
    // Home cannot read or reply to the sandbox's ticket.
    expect((await ticketGET(new Request('http://x') as never, { params: Promise.resolve({ ticketId: 'SUP-3101' }) })).status).toBe(404);
    expect((await ticketPOST(json('http://x', { action: 'reply', by: 'CIO', text: 'hi there' }), { params: Promise.resolve({ ticketId: 'SUP-3101' }) })).status).toBe(404);
    const sbReply = await ticketPOST(json(`http://x?link=${sandboxKey()}`, { action: 'close', by: 'Owner' }), { params: Promise.resolve({ ticketId: 'SUP-3101' }) });
    expect(sbReply.status).toBe(200);
  });

  it('status page, monthly report download and the publisher queue', async () => {
    const s = await (await statusGET(new Request('http://x/api/releases/status') as never)).json();
    expect(s.status.nation.id).toBe('home');
    const r = await reportGET(new Request('http://x/api/releases/sla-report?download=1') as never);
    expect(r.headers.get('content-disposition')).toMatch(/sla-report-\d{4}-\d{2}\.json/);
    const q = await (await queueGET(new Request('http://x') as never)).json();
    expect(new Set(q.tickets.map((t: { nationId: string }) => t.nationId))).toEqual(new Set(['home', 'sandbox']));
    expect(q.nations.find((n: { id: string }) => n.id === 'home').tier).toBe('enterprise');
  });
});
