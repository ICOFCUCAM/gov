// CivicOS — Update Center support desk and service levels, server-side.
//
// Each nation opens tickets (P1–P4) about a release or a fallback incident;
// the publisher answers them from its support queue. Targets for first
// response and resolution come from the nation's contract tier
// (SUPPORT_TIERS) as it stood when the ticket was opened. The resolution
// clock pauses while the publisher is waiting on the nation. A fallback
// incident opens a P2 ticket automatically, so no fallback goes unanswered.
//
// Service incidents are the publisher's own statements about the services it
// runs (registry, update feed, support desk, and the hosted platform for
// SaaS nations), including planned maintenance. They feed each nation's
// status page and monthly SLA report (lib/data/status.ts). The nation's own
// operations incidents stay in /api/ops; this is the publisher's side.
//
// Every opening and every state change is written to the audit chain.
// Tier figures and service credits are placeholders until contracts set
// them (docs/INTEGRATION_REGISTER.md §12).

import type {
  FallbackIncident, ServiceIncident, SlaClock, SupportTicket, SupportTier, SupportTierPolicy,
  TicketPriority, TicketState, TicketView,
} from '@/lib/api/types';
import { recordAudit } from './store';
import { isShared, transmit } from './sovereignty';

export const PRIORITIES: TicketPriority[] = ['P1', 'P2', 'P3', 'P4'];
export const PRIORITY_MEANING: Record<TicketPriority, string> = {
  P1: 'Service down or a security incident: citizens cannot be served',
  P2: 'Major function impaired, no workaround (every fallback incident)',
  P3: 'Function impaired with a workaround',
  P4: 'Question, request or cosmetic issue',
};

const h = (n: number) => n;
/** Contract tiers: response in minutes, resolution in hours. Placeholder figures until contracts set them. */
export const SUPPORT_TIERS: Record<SupportTier, SupportTierPolicy> = {
  standard: {
    tier: 'standard', label: 'Standard', coverage: 'Business hours, P1 around the clock', uptimeTarget: 99.5, creditPct: 5,
    targets: { P1: { responseMinutes: 60, resolutionHours: h(24) }, P2: { responseMinutes: 240, resolutionHours: h(72) }, P3: { responseMinutes: 1440, resolutionHours: h(240) }, P4: { responseMinutes: 4320, resolutionHours: h(720) } },
  },
  enterprise: {
    tier: 'enterprise', label: 'Enterprise', coverage: '24×7 for P1–P2, extended hours for P3–P4', uptimeTarget: 99.9, creditPct: 10,
    targets: { P1: { responseMinutes: 30, resolutionHours: h(8) }, P2: { responseMinutes: 120, resolutionHours: h(48) }, P3: { responseMinutes: 480, resolutionHours: h(120) }, P4: { responseMinutes: 2880, resolutionHours: h(480) } },
  },
  sovereign: {
    tier: 'sovereign', label: 'Sovereign', coverage: '24×7, named engineers, in-country on request', uptimeTarget: 99.95, creditPct: 15,
    targets: { P1: { responseMinutes: 15, resolutionHours: h(4) }, P2: { responseMinutes: 60, resolutionHours: h(24) }, P3: { responseMinutes: 240, resolutionHours: h(72) }, P4: { responseMinutes: 1440, resolutionHours: h(240) } },
  },
};
export const TIERS = Object.keys(SUPPORT_TIERS) as SupportTier[];

export const SUPPORT_SYSTEM = 'system (support desk)';
const MIN = 60_000;
const DAY = 86_400_000;

interface SupportDb { tickets: SupportTicket[]; seq: number; tiers: Record<string, SupportTier>; service: ServiceIncident[]; serviceSeq: number }

function seed(): SupportDb {
  const now = Date.now();
  const at = (d: number, m = 0) => new Date(now + d * DAY + m * MIN).toISOString();
  const msg = (t: string, by: string, side: 'nation' | 'publisher' | 'system', text: string) => ({ at: t, by, side, text });
  const tickets: SupportTicket[] = [
    {
      id: 'SUP-3001', nationId: 'home', priority: 'P1', title: 'Permit decisions failing for one institution after a configuration change',
      description: 'Officers of one institution receive an error when deciding permits; citizens are waiting at the counter.',
      link: { kind: 'release', id: 'DR-140' }, source: 'nation', state: 'closed', tier: 'enterprise',
      openedAt: at(-38), openedBy: 'Platform operations', firstResponseAt: at(-38, 45), resolvedAt: at(-38, 330), closedAt: at(-37), pausedMinutes: 0,
      thread: [
        msg(at(-38), 'Platform operations', 'nation', 'Officers of one institution get “decision rejected” on every permit since this morning.'),
        msg(at(-38, 45), 'Support engineering', 'publisher', 'On it. Please send the institution id; we suspect the role mapping imported yesterday.'),
        msg(at(-38, 330), 'Support engineering', 'publisher', 'The imported role mapping dropped the decide permission. Corrected mapping attached; decisions work again.'),
        msg(at(-37), 'Platform operations', 'nation', 'Confirmed working. Closing.'),
      ],
    },
    {
      id: 'SUP-3002', nationId: 'home', priority: 'P3', title: 'Certificate wording editor shows the previous template',
      description: 'After 1.4.0 the certificate wording editor opens the 1.3 template until the page is reloaded.',
      link: { kind: 'release', id: 'DR-140' }, source: 'nation', state: 'resolved', tier: 'enterprise',
      openedAt: at(-20), openedBy: 'Registrar General', firstResponseAt: at(-20, 180), resolvedAt: at(-17), pausedMinutes: 0,
      thread: [
        msg(at(-20), 'Registrar General', 'nation', 'The editor shows the old template until we reload.'),
        msg(at(-20, 180), 'Support engineering', 'publisher', 'Reproduced: the editor caches the template list. A fix is scheduled for 1.4.1.'),
        msg(at(-17), 'Support engineering', 'publisher', 'Fixed in 1.4.1 (cache keyed by version). Workaround until you install it: reload once after login.'),
      ],
    },
    {
      id: 'SUP-3003', nationId: 'home', priority: 'P2', title: 'Duplicate permit applications from the offline pilot office',
      description: 'The pilot field office running offline intake produced duplicate applications after a link outage.',
      link: { kind: 'release', id: 'DR-140' }, source: 'nation', state: 'in-progress', tier: 'enterprise',
      openedAt: at(-1.5), openedBy: 'Director of Licensing', firstResponseAt: at(-1.5, 40), pausedMinutes: 0,
      thread: [
        msg(at(-1.5), 'Director of Licensing', 'nation', 'Twelve applications appear twice after yesterday’s link outage.'),
        msg(at(-1.5, 40), 'Support engineering', 'publisher', 'Acknowledged. We are checking the idempotency keys the offline client sends on retry.'),
      ],
    },
    {
      id: 'SUP-3004', nationId: 'home', priority: 'P4', title: 'How long are staging restore points kept?',
      description: 'We want to align restore-point retention with our records policy.',
      source: 'nation', state: 'waiting-on-nation', tier: 'enterprise',
      openedAt: at(-3), openedBy: 'Chief Information Officer', firstResponseAt: at(-2.8), waitingSince: at(-2), pausedMinutes: 0,
      thread: [
        msg(at(-3), 'Chief Information Officer', 'nation', 'What is the default retention for restore points, and can we change it?'),
        msg(at(-2.8), 'Support engineering', 'publisher', 'Default is the last three per environment. Which retention does your records policy require?'),
        msg(at(-2), 'Support engineering', 'publisher', 'Waiting for your records policy reference before we propose a setting.'),
      ],
    },
    {
      id: 'SUP-3101', nationId: 'sandbox', priority: 'P2', title: 'Fallback: 1.4.1+sov.1 → 1.4.1 (payments smoke test)',
      description: 'Opened automatically for fallback incident INC-U-2001: probation failed on payments and the software switched back to 1.4.1.',
      link: { kind: 'incident', id: 'INC-U-2001' }, source: 'fallback-incident', state: 'resolved', tier: 'standard',
      openedAt: at(-1.99), openedBy: SUPPORT_SYSTEM, firstResponseAt: at(-1.99, 25), resolvedAt: at(-1.5), pausedMinutes: 0,
      thread: [
        msg(at(-1.99), SUPPORT_SYSTEM, 'system', 'Opened automatically as P2 for fallback incident INC-U-2001.'),
        msg(at(-1.99, 25), 'Support engineering', 'publisher', 'Investigating the receipt issue path in the nation build.'),
        msg(at(-1.5), 'Support engineering', 'publisher', 'Root cause: the build’s receipt template referenced a removed field. Corrected build will follow as 1.4.1+sov.2.'),
      ],
    },
  ];
  const service: ServiceIncident[] = [
    { id: 'SI-0101', title: 'Slow artifact downloads from the distribution registry', impact: 'degraded', components: ['registry'], nations: 'all', startedAt: at(-45), resolvedAt: at(-45, 180),
      updates: [{ at: at(-45), state: 'investigating', text: 'Downloads are slower than usual.', by: 'Publisher operations' }, { at: at(-45, 180), state: 'resolved', text: 'A storage node was replaced; speeds are normal.', by: 'Publisher operations' }] },
    { id: 'SI-0102', title: 'Hosted portal and sign-in unavailable in one region', impact: 'major-outage', components: ['portal', 'identity'], nations: ['sandbox'], startedAt: at(-40), resolvedAt: at(-40, 52),
      updates: [{ at: at(-40), state: 'investigating', text: 'Citizen portal and sign-in are not reachable.', by: 'Publisher operations' }, { at: at(-40, 20), state: 'identified', text: 'A load-balancer certificate expired.', by: 'Publisher operations' }, { at: at(-40, 52), state: 'resolved', text: 'Certificate renewed; renewal monitoring added.', by: 'Publisher operations' }] },
    { id: 'SI-0103', title: 'Update feed partially unavailable', impact: 'partial-outage', components: ['feed'], nations: 'all', startedAt: at(-10), resolvedAt: at(-10, 35),
      updates: [{ at: at(-10), state: 'investigating', text: 'Some feed requests time out.', by: 'Publisher operations' }, { at: at(-10, 35), state: 'resolved', text: 'Feed cache rebuilt.', by: 'Publisher operations' }] },
    { id: 'SI-0104', title: 'Registry storage migration', impact: 'maintenance', components: ['registry'], nations: 'all', startedAt: at(5), scheduled: { start: at(5), end: at(5, 120) },
      updates: [{ at: at(-1), state: 'scheduled', text: 'Downloads may pause for up to two hours. Installed systems are unaffected.', by: 'Publisher operations' }] },
  ];
  return { tickets, seq: 3005, tiers: { home: 'enterprise', sandbox: 'standard' }, service, serviceSeq: 105 };
}

const g = globalThis as unknown as { __civicosSupport?: SupportDb };
function sdb(): SupportDb { return (g.__civicosSupport ??= seed()); }
export function resetSupport(): void { g.__civicosSupport = seed(); }

// ── Tiers ─────────────────────────────────────────────────────────────
export function supportTier(nationId: string): SupportTier { return sdb().tiers[nationId] ?? 'standard'; }
export function tierPolicy(nationId: string): SupportTierPolicy { return SUPPORT_TIERS[supportTier(nationId)]; }
export function setSupportTier(nationId: string, tier: string, by: string): SupportTierPolicy | { error: string; status: number } {
  if (!TIERS.includes(tier as SupportTier)) return { error: `Tier must be one of ${TIERS.join(', ')}`, status: 422 };
  if (!by.trim()) return { error: 'Name who is changing the tier', status: 422 };
  const from = supportTier(nationId);
  sdb().tiers[nationId] = tier as SupportTier;
  recordAudit(by.trim(), 'support.tier', `SupportDesk:${nationId}`, 'ok', `${from} → ${tier} (applies to tickets opened from now)`);
  return SUPPORT_TIERS[tier as SupportTier];
}

// ── SLA clocks ────────────────────────────────────────────────────────
const iso = (t: number) => new Date(t).toISOString();
const ms = (s: string) => new Date(s).getTime();

export function slaClocks(t: SupportTicket, now = Date.now()): { response: SlaClock; resolution: SlaClock } {
  const target = SUPPORT_TIERS[t.tier].targets[t.priority];
  const opened = ms(t.openedAt);
  const respDue = opened + target.responseMinutes * MIN;
  const response: SlaClock = t.firstResponseAt
    ? { dueAt: iso(respDue), state: ms(t.firstResponseAt) <= respDue ? 'met' : 'breached' }
    : now > respDue ? { dueAt: iso(respDue), state: 'breached' } : { dueAt: iso(respDue), state: 'running', minutesLeft: Math.round((respDue - now) / MIN) };
  const pausedNow = t.waitingSince ? Math.max(0, now - ms(t.waitingSince)) : 0;
  const resDue = opened + target.resolutionHours * 60 * MIN + t.pausedMinutes * MIN + pausedNow;
  let resolution: SlaClock;
  if (t.resolvedAt) resolution = { dueAt: iso(resDue), state: ms(t.resolvedAt) <= resDue ? 'met' : 'breached' };
  else if (t.waitingSince) resolution = { dueAt: iso(resDue), state: 'paused', minutesLeft: Math.round((resDue - now) / MIN) };
  else if (now > resDue) resolution = { dueAt: iso(resDue), state: 'breached' };
  else resolution = { dueAt: iso(resDue), state: 'running', minutesLeft: Math.round((resDue - now) / MIN) };
  return { response, resolution };
}

const view = (t: SupportTicket, now: number): TicketView => ({ ...t, thread: [...t.thread], sla: slaClocks(t, now) });

/** Open first, most urgent first: breached, then least time left, then priority. */
function urgency(a: TicketView, b: TicketView): number {
  const done = (v: TicketView) => (v.state === 'resolved' || v.state === 'closed' ? 1 : 0);
  if (done(a) !== done(b)) return done(a) - done(b);
  if (done(a)) return b.openedAt.localeCompare(a.openedAt);
  const left = (v: TicketView) => Math.min(
    v.sla.response.state === 'running' ? v.sla.response.minutesLeft! : v.sla.response.state === 'breached' && !v.firstResponseAt ? -1e9 : 1e9,
    v.sla.resolution.state === 'running' ? v.sla.resolution.minutesLeft! : v.sla.resolution.state === 'breached' ? -1e9 : 1e9,
  );
  return left(a) - left(b) || a.priority.localeCompare(b.priority);
}

export function listTickets(nationId: string, now = Date.now()): TicketView[] {
  return sdb().tickets.filter(t => t.nationId === nationId).map(t => view(t, now)).sort(urgency);
}
export function allTickets(now = Date.now()): TicketView[] {
  return sdb().tickets.map(t => view(t, now)).sort(urgency);
}
export function getTicket(nationId: string | null, id: string, now = Date.now()): TicketView | undefined {
  const t = sdb().tickets.find(x => x.id === id && (nationId === null || x.nationId === nationId));
  return t ? view(t, now) : undefined;
}
export function ticketsInRange(nationId: string, from: number, to: number, now = Date.now()): TicketView[] {
  return sdb().tickets.filter(t => t.nationId === nationId && ms(t.openedAt) >= from && ms(t.openedAt) < to).map(t => view(t, now));
}

// ── Opening and working tickets ───────────────────────────────────────
const str = (v: unknown, max: number) => (typeof v === 'string' ? v.trim().slice(0, max) : '');

export interface TicketInput { priority?: string; title?: string; description?: string; by?: string; link?: { kind?: string; id?: string } }

/** The caller (route) has already checked that a linked release or incident belongs to this nation. */
export function openTicket(nationId: string, input: TicketInput, now = Date.now()): TicketView | { error: string; status: number } {
  const priority = input.priority as TicketPriority;
  if (!PRIORITIES.includes(priority)) return { error: 'Choose a priority, P1 to P4', status: 422 };
  const title = str(input.title, 160), description = str(input.description, 4000), by = str(input.by, 120);
  if (title.length < 5) return { error: 'Give the ticket a title', status: 422 };
  if (description.length < 15) return { error: 'Describe the problem — at least 15 characters', status: 422 };
  if (!by) return { error: 'Name who is opening the ticket', status: 422 };
  const link = input.link?.id && (input.link.kind === 'release' || input.link.kind === 'incident') ? { kind: input.link.kind, id: String(input.link.id) } as const : undefined;
  const db = sdb();
  const t: SupportTicket = {
    id: `SUP-${db.seq++}`, nationId, priority, title, description, link, source: 'nation', state: 'open', tier: supportTier(nationId),
    openedAt: iso(now), openedBy: by, pausedMinutes: 0, thread: [{ at: iso(now), by, side: 'nation', text: description }],
  };
  db.tickets.push(t);
  recordAudit(by, 'support.ticket.open', `SupportTicket:${nationId}/${t.id}`, 'ok', `${priority} · ${t.tier} · ${title}${link ? ` · ${link.kind} ${link.id}` : ''}`);
  return view(t, now);
}

/** A fallback incident opens a P2 ticket automatically (once per incident). */
export function openTicketForIncident(inc: FallbackIncident, now = Date.now()): SupportTicket {
  const db = sdb();
  const existing = db.tickets.find(t => t.link?.kind === 'incident' && t.link.id === inc.id);
  if (existing) return existing;
  const why = inc.trigger === 'break-glass' ? 'break-glass switch-back by two officials' : `probation failed: ${inc.failedChecks.join(', ') || 'health checks'}`;
  const text = `Opened automatically as P2 for fallback incident ${inc.id}: ${why}. Software ${inc.fromVersion} → ${inc.toVersion}; data untouched.`;
  const t: SupportTicket = {
    id: `SUP-${db.seq++}`, nationId: inc.nationId, priority: 'P2', title: `Fallback: ${inc.fromVersion} → ${inc.toVersion}`,
    description: text, link: { kind: 'incident', id: inc.id }, source: 'fallback-incident', state: 'open', tier: supportTier(inc.nationId),
    openedAt: iso(now), openedBy: SUPPORT_SYSTEM, pausedMinutes: 0, thread: [{ at: iso(now), by: SUPPORT_SYSTEM, side: 'system', text }],
  };
  db.tickets.push(t);
  recordAudit(SUPPORT_SYSTEM, 'support.ticket.open', `SupportTicket:${inc.nationId}/${t.id}`, 'ok', `P2 · ${t.tier} · automatic for ${inc.id}`);
  return t;
}

export const NATION_ACTIONS = ['reply', 'close', 'reopen', 'attach'] as const;
export const PUBLISHER_ACTIONS = ['reply', 'acknowledge', 'progress', 'wait', 'resolve', 'reprioritise'] as const;
type Side = 'nation' | 'publisher';

const ALLOWED: Record<string, { from: TicketState[]; to: TicketState | 'same' }> = {
  'nation:reply': { from: ['open', 'acknowledged', 'in-progress', 'waiting-on-nation', 'resolved'], to: 'same' },
  'nation:close': { from: ['resolved'], to: 'closed' },
  'nation:reopen': { from: ['resolved'], to: 'in-progress' },
  'nation:attach': { from: ['open', 'acknowledged', 'in-progress', 'waiting-on-nation'], to: 'same' },
  'publisher:reply': { from: ['open', 'acknowledged', 'in-progress', 'waiting-on-nation', 'resolved'], to: 'same' },
  'publisher:acknowledge': { from: ['open'], to: 'acknowledged' },
  'publisher:progress': { from: ['open', 'acknowledged', 'waiting-on-nation'], to: 'in-progress' },
  'publisher:wait': { from: ['open', 'acknowledged', 'in-progress'], to: 'waiting-on-nation' },
  'publisher:resolve': { from: ['open', 'acknowledged', 'in-progress', 'waiting-on-nation'], to: 'resolved' },
  'publisher:reprioritise': { from: ['open', 'acknowledged', 'in-progress', 'waiting-on-nation'], to: 'same' },
};

/**
 * Work a ticket. The nation side passes its own nation id (resolved by the
 * server), so it can only reach its own tickets; the publisher passes null.
 */
export function ticketAction(side: Side, nationId: string | null, id: string, input: { action?: string; by?: string; text?: string; priority?: string; filename?: string; sizeBytes?: number }, now = Date.now()): TicketView | { error: string; status: number } {
  const t = sdb().tickets.find(x => x.id === id && (nationId === null || x.nationId === nationId));
  if (!t) return { error: 'Ticket not found', status: 404 };
  const action = String(input.action ?? '');
  const rule = ALLOWED[`${side}:${action}`];
  if (!rule) return { error: `Unknown action for the ${side}`, status: 422 };
  const by = str(input.by, 120), text = str(input.text, 4000);
  if (!by) return { error: 'Name who is acting', status: 422 };
  if (!rule.from.includes(t.state)) return { error: `Cannot ${action} a ticket that is ${t.state}`, status: 409 };
  if ((action === 'reply' || action === 'wait' || action === 'resolve' || action === 'reopen') && text.length < 3) return { error: 'Write a message', status: 422 };
  if (action === 'reprioritise' && (!PRIORITIES.includes(input.priority as TicketPriority) || input.priority === t.priority)) return { error: 'Choose a different priority', status: 422 };
  if (action === 'reprioritise' && text.length < 10) return { error: 'Give the reason for the new priority — at least 10 characters', status: 422 };

  const at = iso(now);
  if (action === 'attach') {
    // Attachments leave the country: only when the nation shares support attachments.
    if (!isShared(t.nationId, 'support-attachments')) return { error: 'Support attachments are not shared under your data-sovereignty settings; describe the problem in text, or have an official enable them', status: 403 };
    const filename = str(input.filename, 160), size = Number(input.sizeBytes);
    if (!filename || !Number.isFinite(size) || size <= 0) return { error: 'Choose a file to attach', status: 422 };
    transmit(t.nationId, 'support-attachments', `${t.id} · ${filename}`, { ticket: t.id, filename, sizeBytes: size }, now);
    t.thread.push({ at, by, side, text: `Attached ${filename} (${Math.round(size / 1024)} KB)${text ? ` — ${text}` : ''}` });
    recordAudit(by, 'support.ticket.attach', `SupportTicket:${t.nationId}/${t.id}`, 'ok', filename);
    return view(t, now);
  }
  const endPause = () => { if (t.waitingSince) { t.pausedMinutes += Math.max(0, Math.round((now - ms(t.waitingSince)) / MIN)); t.waitingSince = undefined; } };
  const from = t.state;
  if (side === 'publisher' && !t.firstResponseAt && action !== 'reprioritise') t.firstResponseAt = at;

  if (action === 'reply') {
    if (side === 'publisher' && t.state === 'open') t.state = 'acknowledged';
    if (side === 'nation' && t.state === 'waiting-on-nation') { endPause(); t.state = 'in-progress'; }
  } else if (action === 'reprioritise') {
    t.priority = input.priority as TicketPriority;
  } else {
    if (rule.to === 'waiting-on-nation') t.waitingSince = at;
    if (from === 'waiting-on-nation' && rule.to !== 'waiting-on-nation') endPause();
    if (rule.to === 'resolved') t.resolvedAt = at;
    if (action === 'reopen') t.resolvedAt = undefined;
    if (rule.to === 'closed') t.closedAt = at;
    t.state = rule.to as TicketState;
  }
  const note = action === 'reprioritise' ? `Priority changed to ${t.priority}: ${text}`
    : text || ({ acknowledge: 'Acknowledged', progress: 'Work in progress', close: 'Closed: the nation confirms it is resolved' } as Record<string, string>)[action] || action;
  t.thread.push({ at, by, side, text: note });
  recordAudit(by, `support.ticket.${action}`, `SupportTicket:${t.nationId}/${t.id}`, 'ok', `${from} → ${t.state} · ${t.priority}`);
  return view(t, now);
}

// ── Service incidents and maintenance (the publisher's statements) ────
export const SERVICE_COMPONENTS: { key: string; label: string; group: 'publisher' | 'hosted' }[] = [
  { key: 'registry', label: 'Distribution registry', group: 'publisher' },
  { key: 'feed', label: 'Update feed and advisories', group: 'publisher' },
  { key: 'support', label: 'Support desk', group: 'publisher' },
  { key: 'portal', label: 'Citizen portal', group: 'hosted' },
  { key: 'identity', label: 'Identity and sign-in', group: 'hosted' },
  { key: 'payments', label: 'Payments', group: 'hosted' },
  { key: 'records', label: 'Records and registries', group: 'hosted' },
  { key: 'api', label: 'Integrations API', group: 'hosted' },
];
const IMPACTS = ['degraded', 'partial-outage', 'major-outage', 'maintenance'] as const;

export function listServiceIncidents(): ServiceIncident[] {
  return [...sdb().service].sort((a, b) => b.startedAt.localeCompare(a.startedAt));
}
export const affects = (i: ServiceIncident, nationId: string) => i.nations === 'all' || i.nations.includes(nationId);

export function declareServiceIncident(input: { title?: string; impact?: string; components?: string[]; nations?: 'all' | string[]; text?: string; by?: string; start?: string; end?: string }, now = Date.now()): ServiceIncident | { error: string; status: number } {
  const title = str(input.title, 160), by = str(input.by, 120), text = str(input.text, 2000);
  if (title.length < 5) return { error: 'Give the incident a title', status: 422 };
  if (!by) return { error: 'Name who is declaring it', status: 422 };
  if (!IMPACTS.includes(input.impact as typeof IMPACTS[number])) return { error: `Impact must be one of ${IMPACTS.join(', ')}`, status: 422 };
  const components = (input.components ?? []).filter(c => SERVICE_COMPONENTS.some(s => s.key === c));
  if (!components.length) return { error: 'Choose the affected services', status: 422 };
  const nations = input.nations === 'all' || !Array.isArray(input.nations) || !input.nations.length ? 'all' : input.nations.map(String);
  let scheduled: ServiceIncident['scheduled'];
  if (input.impact === 'maintenance') {
    const s = Date.parse(input.start ?? ''), e = Date.parse(input.end ?? '');
    if (!(s > now) || !(e > s)) return { error: 'Planned maintenance needs a future start and an end after it', status: 422 };
    scheduled = { start: iso(s), end: iso(e) };
  }
  const db = sdb();
  const inc: ServiceIncident = {
    id: `SI-0${db.serviceSeq++}`, title, impact: input.impact as ServiceIncident['impact'], components, nations,
    startedAt: scheduled?.start ?? iso(now), scheduled,
    updates: [{ at: iso(now), state: scheduled ? 'scheduled' : 'investigating', text: text || title, by }],
  };
  db.service.push(inc);
  recordAudit(by, 'support.service.declare', `ServiceIncident:${inc.id}`, 'ok', `${inc.impact} · ${components.join(',')} · ${nations === 'all' ? 'all nations' : nations.join(',')}`);
  return inc;
}

export function updateServiceIncident(id: string, input: { state?: string; text?: string; by?: string }, now = Date.now()): ServiceIncident | { error: string; status: number } {
  const inc = sdb().service.find(i => i.id === id);
  if (!inc) return { error: 'Service incident not found', status: 404 };
  if (inc.resolvedAt) return { error: 'Already resolved', status: 409 };
  const by = str(input.by, 120), text = str(input.text, 2000);
  const states = inc.scheduled ? ['in-progress', 'completed'] : ['identified', 'monitoring', 'resolved'];
  if (!states.includes(String(input.state))) return { error: `State must be one of ${states.join(', ')}`, status: 422 };
  if (!by || text.length < 3) return { error: 'Name who is updating and write the update', status: 422 };
  inc.updates.push({ at: iso(now), state: input.state as ServiceIncident['updates'][number]['state'], text, by });
  if (input.state === 'resolved' || input.state === 'completed') inc.resolvedAt = iso(now);
  recordAudit(by, 'support.service.update', `ServiceIncident:${inc.id}`, 'ok', String(input.state));
  return inc;
}
