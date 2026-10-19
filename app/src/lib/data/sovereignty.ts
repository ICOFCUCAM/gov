// CivicOS — Update Center data-sovereignty controls, server-side.
//
// Every category of operational data that could leave the country — crash
// reports, usage metrics, health reports to the publisher, support
// attachments, and requests to the AI model service — is OFF unless the
// nation turns it on. Turning one on needs
// a named approver and a reason, and is written to the audit chain (as is
// turning it off). Each category shows exactly what would be shared with a
// sample payload.
//
// Enforcement is at the point of sending: transmit() is the only way data
// reaches the publisher's side (the received log the publisher reads).
// When a category is off, nothing is recorded there — only a local count of
// what was held back. Health reports still drive probation locally
// (evaluation, fallback), so safety is unchanged; the publisher simply sees
// less. Support attachments are refused at the ticket when off.

import type { DataCategory, DataCategoryInfo, DataSharingState, DataTransmission } from '@/lib/api/types';
import { createHash } from 'node:crypto';
import { recordAudit } from '@/lib/data/store/audit';
import { touch } from '@/lib/data/repo/track';

export const DATA_CATEGORIES: DataCategoryInfo[] = [
  { key: 'crash-reports', label: 'Crash reports', purpose: 'Help the publisher fix crashes faster.', contains: ['Release version and component', 'Error type and code location (hashed stack frames)', 'Time of the crash'], never: ['Citizen or officer data', 'Request bodies, file contents or form fields', 'IP addresses or user identifiers'], destination: 'Publisher engineering', whenOff: 'Crashes are still logged locally; the publisher learns of them only through your support tickets.' },
  { key: 'usage-metrics', label: 'Usage metrics', purpose: 'Show the publisher which modules are used, to plan releases.', contains: ['Release version', 'Counts of service calls per module per day', 'Number of active officer seats (bucketed)'], never: ['Who did what', 'Citizen counts or records', 'Search terms or content'], destination: 'Publisher product team', whenOff: 'Nothing changes for you; seat counts for your contract come from your own declaration.' },
  { key: 'health-reports', label: 'Health reports during probation', purpose: 'Let the publisher see how a new release behaves in your country and halt a bad release for everyone.', contains: ['Release version under probation', 'Pass/fail of each health check (sign-in, payments, error rate, latency…)', 'Error-rate and latency figures'], never: ['Citizen or officer data', 'Transaction contents or amounts', 'Host names or addresses'], destination: 'Publisher release safety', whenOff: 'Probation, automatic fallback and incidents still work entirely inside your country; the publisher sees only that an install happened, not how it went.' },
  { key: 'ai-advisory', label: 'AI advisory requests', purpose: 'Send a dashboard panel\'s figures to the AI model service chosen in setup, to draft an advisory for officials.', contains: ['The institution\'s name and posture', 'Four operational figures, each marked observed, reported, modelled or sample', 'The instruction text sent to the model'], never: ['Citizen or officer records', 'Who asked (kept only in your own audit chain)', 'Free text other than the institution\'s name'], destination: 'The AI model service set in setup: the default provider, or your own sovereign or on-premises model', whenOff: 'Panels show their rule-based advisories; nothing is sent to any model.' },
  { key: 'support-attachments', label: 'Support attachments', purpose: 'Send diagnostic bundles with support tickets.', contains: ['Files you attach to a ticket (logs, screenshots, configuration extracts)', 'Their checksums and sizes'], never: ['Anything you did not attach yourself'], destination: 'Publisher support desk', whenOff: 'Tickets still work in text; attaching files is refused.' },
];
export const CATEGORY_KEYS = DATA_CATEGORIES.map(c => c.key);

/** Categories whose data goes to the publisher (its received log). The others go elsewhere (the AI model service) and are only logged locally. */
const TO_PUBLISHER = new Set<DataCategory>(['crash-reports', 'usage-metrics', 'health-reports', 'support-attachments']);

/** What left the country for a destination other than the publisher: a digest of the payload, never the payload. */
export interface Egress { at: string; nationId: string; category: DataCategory; summary: string; sha256: string }

interface SovDb { state: Record<string, Record<DataCategory, DataSharingState>>; received: DataTransmission[]; seq: number; egress: Egress[] }
const g = globalThis as unknown as { __civicosSovereignty?: SovDb };
function sdb(): SovDb {
  const d = touch('__civicosSovereignty', g.__civicosSovereignty ??= { state: {}, received: [], seq: 1, egress: [] });
  d.egress ??= [];
  return d;
}
export function resetSovereignty(): void { g.__civicosSovereignty = undefined; }

function stateOf(nationId: string): Record<DataCategory, DataSharingState> {
  const s = (sdb().state[nationId] ??= {} as Record<DataCategory, DataSharingState>);
  // Categories added since a snapshot was saved start off.
  for (const k of CATEGORY_KEYS) s[k] ??= { category: k, enabled: false, history: [], heldBack: 0, sent: 0 };
  return s;
}
export function sharing(nationId: string): DataSharingState[] { return CATEGORY_KEYS.map(k => structuredClone(stateOf(nationId)[k])); }
export function isShared(nationId: string, category: DataCategory): boolean { return stateOf(nationId)[category].enabled; }

const str = (v: unknown, max: number) => (typeof v === 'string' ? v.trim().slice(0, max) : '');

/** Turn a category on (named approver and reason) or off (named official). Audited either way. */
export function setSharing(nationId: string, category: string, input: { enabled?: boolean; by?: string; reason?: string }, now = Date.now()): DataSharingState | { error: string; status: number } {
  if (!CATEGORY_KEYS.includes(category as DataCategory)) return { error: 'Unknown data category', status: 422 };
  const s = stateOf(nationId)[category as DataCategory];
  const by = str(input.by, 120), reason = str(input.reason, 500);
  if (!by) return { error: 'Name the official approving this', status: 422 };
  const on = input.enabled === true;
  if (on && reason.length < 15) return { error: 'Give the reason for sharing — at least 15 characters', status: 422 };
  if (on === s.enabled) return { error: on ? 'Already shared' : 'Already off', status: 409 };
  const at = new Date(now).toISOString();
  const a = recordAudit(by, on ? 'sovereignty.share.enable' : 'sovereignty.share.disable', `DataSovereignty:${nationId}/${category}`, 'ok', reason || (on ? '' : 'switched off'));
  s.enabled = on;
  s.approvedBy = on ? by : undefined;
  s.reason = on ? reason : undefined;
  s.at = at;
  s.history.push({ at, by, enabled: on, reason: reason || undefined, auditSeq: a.seq });
  return structuredClone(s);
}

/**
 * The only way operational data leaves the country. Off: nothing is sent or
 * kept on the publisher's side — only a local count. On: recorded in the
 * publisher's received log.
 */
export function transmit(nationId: string, category: DataCategory, summary: string, payload: Record<string, unknown>, now = Date.now()): { sent: boolean } {
  const s = stateOf(nationId)[category];
  if (!s.enabled) { s.heldBack++; return { sent: false }; }
  const db = sdb();
  const at = new Date(now).toISOString();
  if (TO_PUBLISHER.has(category)) {
    db.received.push({ id: `TX-${db.seq++}`, at, nationId, category, summary, payload: structuredClone(payload) });
    if (db.received.length > 2000) db.received.splice(0, db.received.length - 2000);
  } else {
    db.egress.push({ at, nationId, category, summary, sha256: createHash('sha256').update(JSON.stringify(payload), 'utf8').digest('hex') });
    if (db.egress.length > 2000) db.egress.splice(0, db.egress.length - 2000);
  }
  s.sent++;
  s.lastSentAt = at;
  return { sent: true };
}

/** What left for destinations other than the publisher (the nation's side; digests only). */
export function egress(filter: { nationId?: string; category?: DataCategory } = {}): Egress[] {
  return sdb().egress.filter(t => (!filter.nationId || t.nationId === filter.nationId) && (!filter.category || t.category === filter.category)).slice().reverse();
}

/** What the publisher has received (publisher side). */
export function received(filter: { nationId?: string; category?: DataCategory } = {}): DataTransmission[] {
  return sdb().received.filter(t => (!filter.nationId || t.nationId === filter.nationId) && (!filter.category || t.category === filter.category)).slice().reverse();
}

/** Exactly what one transmission of each category would contain, for the nation to inspect. */
export function samplePayload(category: DataCategory, ctx: { version: string; releaseId?: string }): Record<string, unknown> {
  switch (category) {
    case 'crash-reports': return { category, release: ctx.version, component: 'permits-service', error: 'TypeError', frames: ['a3f19c2e', '77be0d41', '0c9d2a88'], at: '2026-01-01T10:15:00Z' };
    case 'usage-metrics': return { category, release: ctx.version, day: '2026-01-01', calls: { permits: 18240, payments: 9310, registry: 4402 }, activeOfficerSeats: '1000–1499' };
    case 'health-reports': return { category, release: ctx.version, releaseId: ctx.releaseId, at: '2026-01-01T10:15:00Z', ok: true, checks: [{ key: 'smoke-sign-in', ok: true }, { key: 'smoke-payments', ok: true }, { key: 'error-rate', ok: true, value: 0.3 }, { key: 'latency', ok: true, value: 230 }] };
    case 'ai-advisory': return { category, model: 'the model set in setup', institution: 'Ministry of Health', posture: 'ELEVATED', escalationTier: 1, figures: { readiness: { value: 62, kind: 'modelled' }, incidents: { value: 3, kind: 'sample' }, budgetPressure: { value: 48, kind: 'sample' }, slaCompliance: { value: 88, kind: 'sample' } }, note: 'Plus the instruction text; no personal data and not who asked' };
    case 'support-attachments': return { category, ticket: 'SUP-0000', filename: 'diagnostics.tar.gz', sizeBytes: 482113, sha256: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855', note: 'Only files an official attaches' };
  }
}
