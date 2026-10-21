// The data-sharing services at a glance (/gov/exchange): every exchange
// service (lib/exchange/services.ts) joined with who is legally responsible
// for it (the deployment profile, authorityFor(); never a ministry by name),
// the register it answers from (lib/data/register-owners.ts), the
// integrations approved for it and for which purposes (two officials, on
// /integrations), webhook subscriptions for event services, and aggregate
// call counts from the exchange log. Read only: nothing here changes an
// approval. Counts only: never a request's input, a caller's stated purpose
// text or an answer, so no personal data leaves through it.

import { SERVICES, type ServiceDef } from './services';
import { exchangeEntries, listUnauthenticated, type ExchangeEntry, type UnauthenticatedCount } from './log';
import { AUTHORITIES, type AuthorityKey } from '@/lib/nation/deployment';
import { REGISTER_OWNERS, legalOwnerOf } from '@/lib/data/register-owners';
import { topicMatches } from '@/lib/events/outbox';
import type { IntegrationClient, WebhookSubscription } from '@/lib/api/types';
import { listIntegrations, listWebhooks, authorityFor, getMinistry } from '@/lib/data/store';

export interface ServiceCalls {
  total: number;
  answered: number;
  refused: number;
  /** Not answered for another reason: input missing, no such service. */
  failed: number;
  firstAt?: string;
  lastAt?: string;
  /** Refusals and failures by reason, most frequent first (reason text without the caller's purpose). */
  reasons: { reason: string; count: number }[];
  /** Calls per caller (an integration or a module inside the installation). */
  byCaller: { caller: string; kind: 'integration' | 'module' | 'other'; name: string; total: number; refused: number }[];
  /** Calls without a recognised key, or refused by a rate limit (counted, not logged one by one). */
  unauthenticated: number;
}

export interface ServiceOverview {
  id: string;
  version: number;
  kind: 'query' | 'event';
  title: string;
  scope: string;
  returns: Record<string, string>;
  dataClass: ServiceDef['dataClass'];
  legalBasis?: string;
  eventType?: string;
  owner: { key: AuthorityKey; label: string; institution?: { id: string; name: string }; named: boolean };
  register?: { id: string; name: string };
  integrations: {
    id: string; name: string; ownerOrg: string; status: IntegrationClient['status'];
    /** Purposes approved for this service (two officials). */
    purposes: string[];
    /** Approved before purposes were recorded: refused in production until two officials approve them. */
    legacy: boolean;
    /** A proposal waiting for a second official that names this service. */
    waiting?: { purposes: string[]; at: string; by: string };
  }[];
  /** Event services: the webhook subscriptions whose topic receives it. */
  webhooks?: { id: string; topic: string; status: WebhookSubscription['status'] }[];
  calls: ServiceCalls;
}

export interface OverviewSources {
  services?: ServiceDef[];
  integrations: IntegrationClient[];
  webhooks: WebhookSubscription[];
  entries: ExchangeEntry[];
  unauthenticated: UnauthenticatedCount[];
  authorityFor: (key: AuthorityKey) => string | undefined;
  institutionName: (id: string) => string | undefined;
}

/** "purpose not approved (approved: a, b) · purpose: …" → "purpose not approved". */
export function refusalReason(result: string): string {
  return result.split(' · purpose:')[0]!.replace(/\s*\(approved:[^)]*\)/, '').replace(/ · purposes not yet approved$/, '').trim().slice(0, 120) || 'unknown';
}

/** Aggregate calls of one service from exchange-log entries (channel 'service'). */
export function countCalls(serviceId: string, entries: ExchangeEntry[], unauthenticated: UnauthenticatedCount[], nameOf: (feedId: string) => string): ServiceCalls {
  const path = `service:${serviceId}`;
  const calls: ServiceCalls = { total: 0, answered: 0, refused: 0, failed: 0, reasons: [], byCaller: [], unauthenticated: 0 };
  const reasons = new Map<string, number>();
  const callers = new Map<string, ServiceCalls['byCaller'][number]>();
  for (const e of entries) {
    if (e.channel !== 'service' || e.path !== path) continue;
    calls.total++;
    if (!calls.firstAt || e.at < calls.firstAt) calls.firstAt = e.at;
    if (!calls.lastAt || e.at > calls.lastAt) calls.lastAt = e.at;
    const refused = e.status === 401 || e.status === 403;
    if (e.status < 400) calls.answered++;
    else {
      if (refused) calls.refused++; else calls.failed++;
      const r = refusalReason(e.result);
      reasons.set(r, (reasons.get(r) ?? 0) + 1);
    }
    const kind = e.feedId.startsWith('integration:') ? 'integration' : e.feedId.startsWith('module:') ? 'module' : 'other';
    const c = callers.get(e.feedId) ?? { caller: e.feedId, kind, name: nameOf(e.feedId), total: 0, refused: 0 };
    c.total++;
    if (e.status >= 400) c.refused++;
    callers.set(e.feedId, c);
  }
  calls.reasons = [...reasons].map(([reason, count]) => ({ reason, count })).sort((a, b) => b.count - a.count || a.reason.localeCompare(b.reason));
  calls.byCaller = [...callers.values()].sort((a, b) => b.total - a.total || a.caller.localeCompare(b.caller));
  calls.unauthenticated = unauthenticated.filter(u => u.channel === 'service' && u.feedId === serviceId).reduce((s, u) => s + u.count, 0);
  return calls;
}

/** Every service with its responsible authority, register, approved integrations and call counts. */
export function buildOverview(src: OverviewSources): ServiceOverview[] {
  const services = src.services ?? SERVICES;
  const byId = new Map(src.integrations.map(i => [i.id, i]));
  const nameOf = (feedId: string) => {
    if (feedId.startsWith('integration:')) return byId.get(feedId.slice('integration:'.length))?.name ?? 'An integration no longer registered';
    if (feedId.startsWith('module:')) return `Inside the platform (${feedId.slice('module:'.length)})`;
    return feedId === '?' ? 'Not recognised' : feedId;
  };
  return services.map(s => {
    const label = AUTHORITIES.find(a => a.key === s.owner)?.label ?? s.owner;
    const instId = src.authorityFor(s.owner);
    const register = REGISTER_OWNERS.find(r => { const l = legalOwnerOf(r); return l.kind === 'authority' && l.key === s.owner; });
    const integrations: ServiceOverview['integrations'] = [];
    for (const i of src.integrations) {
      const scoped = i.scopes.includes(s.scope);
      const p = i.pendingApproval;
      const waitingFor = p && (p.scopes.includes(s.scope) || p.purposes[s.id]) ? { purposes: [...(p.purposes[s.id] ?? [])], at: p.at, by: p.by } : undefined;
      if (!scoped && !waitingFor) continue;
      integrations.push({
        id: i.id, name: i.name, ownerOrg: i.ownerOrg, status: i.status,
        purposes: scoped ? [...(i.purposes?.[s.id] ?? [])] : [],
        legacy: scoped && i.status === 'approved' && !i.approval,
        ...(waitingFor ? { waiting: waitingFor } : {}),
      });
    }
    return {
      id: s.id, version: s.version, kind: s.kind, title: s.title, scope: s.scope, returns: { ...s.returns }, dataClass: s.dataClass,
      ...(s.legalBasis ? { legalBasis: s.legalBasis } : {}), ...(s.eventType ? { eventType: s.eventType } : {}),
      owner: { key: s.owner, label, named: !!instId, ...(instId ? { institution: { id: instId, name: src.institutionName(instId) ?? instId } } : {}) },
      ...(register ? { register: { id: register.id, name: register.name } } : {}),
      integrations,
      ...(s.kind === 'event' && s.eventType ? { webhooks: src.webhooks.filter(w => topicMatches(w.topic, s.eventType!)).map(w => ({ id: w.id, topic: w.topic, status: w.status })) } : {}),
      calls: countCalls(s.id, src.entries, src.unauthenticated, nameOf),
    };
  });
}

/** The overview as the installation stands now. */
export function serviceOverview(): ServiceOverview[] {
  return buildOverview({
    integrations: listIntegrations(),
    webhooks: listWebhooks(),
    entries: exchangeEntries('service'),
    unauthenticated: listUnauthenticated(500),
    authorityFor,
    institutionName: id => getMinistry(id)?.name,
  });
}
