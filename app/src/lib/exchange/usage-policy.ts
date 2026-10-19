// Usage policies on federation grants (review R10, the IDSA / ODRL idea):
// a grant says for which purposes the partner may use the data, how many
// days it may keep it, and whether it may pass it on. The policy is shown on
// the grant, published as an ODRL 2.2 agreement, and enforced at every
// exchange (/api/federation/exchange): a request outside the purposes,
// asking to keep data longer, or to share it onward when that is not
// allowed, is refused with the reason, and the refusal is audited.

import type { FederationGrant, UsagePolicy } from '@/lib/api/types';

export const MAX_RETENTION_DAYS = 3650;

const slug = (s: string) => s.trim().toLowerCase().replace(/\s+/g, '-');

/** Check and normalise a usage policy from a request; an error names what is wrong. */
export function parseUsagePolicy(raw: unknown): UsagePolicy | { error: string } {
  if (!raw || typeof raw !== 'object') return { error: 'State the usage policy: purposes, retention in days and whether onward sharing is allowed' };
  const r = raw as Record<string, unknown>;
  const list = Array.isArray(r.purposes) ? r.purposes : typeof r.purposes === 'string' ? r.purposes.split(',') : [];
  const purposes = Array.from(new Set(list.filter((p): p is string => typeof p === 'string').map(slug).filter(Boolean)));
  if (!purposes.length) return { error: 'Name at least one purpose the data may be used for' };
  if (purposes.length > 10 || purposes.some(p => !/^[a-z0-9][a-z0-9-]{0,59}$/.test(p))) return { error: 'Purposes are up to 10 short words (letters, digits, hyphens)' };
  const days = Number(r.retentionDays);
  if (!Number.isInteger(days) || days < 1 || days > MAX_RETENTION_DAYS) return { error: `Retention is a whole number of days from 1 to ${MAX_RETENTION_DAYS}` };
  if (typeof r.onwardSharing !== 'boolean') return { error: 'Say whether the partner may share the data onward (true or false)' };
  return { purposes, retentionDays: days, onwardSharing: r.onwardSharing };
}

export interface UsageRequest { purpose?: unknown; retainDays?: unknown; onward?: unknown }

/** Null when the request fits the policy; otherwise the reason it is refused. */
export function usageRefusal(policy: UsagePolicy | undefined, req: UsageRequest): string | null {
  if (!policy) return 'this grant has no usage policy; propose it again with purposes, retention and onward sharing';
  const purpose = typeof req.purpose === 'string' ? slug(req.purpose) : '';
  if (!purpose) return `state the purpose (one of: ${policy.purposes.join(', ')})`;
  if (!policy.purposes.includes(purpose)) return `purpose '${purpose}' is outside the grant (allowed: ${policy.purposes.join(', ')})`;
  if (req.retainDays !== undefined) {
    const d = Number(req.retainDays);
    if (!Number.isFinite(d) || d < 0) return 'retainDays must be a number of days';
    if (d > policy.retentionDays) return `keeping the data ${d} days exceeds the grant's retention of ${policy.retentionDays} days`;
  }
  if (req.onward === true && !policy.onwardSharing) return 'onward sharing is not allowed by this grant';
  return null;
}

/** What the partner must do with data it receives under the policy. */
export function obligations(policy: UsagePolicy, now = Date.now()): { purposes: string[]; retentionDays: number; deleteBy: string; onwardSharing: boolean } {
  return { purposes: policy.purposes, retentionDays: policy.retentionDays, deleteBy: new Date(now + policy.retentionDays * 86_400_000).toISOString(), onwardSharing: policy.onwardSharing };
}

/** The grant's policy as an ODRL 2.2 Agreement (JSON-LD). */
export function grantAsOdrl(g: FederationGrant): Record<string, unknown> {
  const p = g.policy;
  const permission = g.scopes.map(scope => ({
    target: `urn:civicos:scope:${scope}`,
    assigner: `urn:civicos:tenant:${g.fromTenant}`,
    assignee: `urn:civicos:tenant:${g.toTenant}`,
    action: 'use',
    constraint: [
      ...(p ? [{ leftOperand: 'purpose', operator: 'isAnyOf', rightOperand: p.purposes }] : []),
      ...(g.expiresAt ? [{ leftOperand: 'dateTime', operator: 'lt', rightOperand: { '@value': g.expiresAt, '@type': 'xsd:dateTime' } }] : []),
    ],
    ...(p ? { duty: [{ action: 'delete', constraint: [{ leftOperand: 'elapsedTime', operator: 'lteq', rightOperand: { '@value': `P${p.retentionDays}D`, '@type': 'xsd:duration' } }] }] } : {}),
  }));
  return {
    '@context': 'http://www.w3.org/ns/odrl.jsonld',
    '@type': 'Agreement',
    uid: `urn:civicos:grant:${g.id}`,
    permission,
    prohibition: p && !p.onwardSharing ? g.scopes.map(scope => ({ target: `urn:civicos:scope:${scope}`, assignee: `urn:civicos:tenant:${g.toTenant}`, action: 'distribute' })) : [],
  };
}
