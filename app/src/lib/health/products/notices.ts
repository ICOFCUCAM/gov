// Recall notices and safety alerts to authorised health institutions (field
// series Part 6 §9.2, exchange HX-005: "Medicines regulator → Authorized
// health institution: Safety alert or recall notice"; Health I4 dependency
// exchange-hx-005).
//
// When the public notice of a recall or a safety alert is published (which
// the register allows only once its decision is sealed: publishProductNotice()
// in lib/health/products/register.ts), the product procedures' effect issues
// one notice here. It carries only:
//
//   - the product as publicProductView() lets it out (number, kind, the
//     attributes the nation's approved classification lists, published
//     notices, the source record and version);
//   - the kind (recall or safety alert), the recall class the decision set
//     (from the nation's recall classes, shipped empty), the reference of the
//     regulator's case, and the dates it was decided and published;
//   - whether the holder's supply-chain notification is recorded on the
//     recall case (the recall procedure's supply-chain-notice document stays
//     the holder's notice to its customers; this one is the regulator's).
//
// Never the grounds, the risk assessment, a recall's completion, the report
// that raised it or who made it, an official's name, or any person.
//
// Who receives it: integrations (other institutions, facilities, pharmacies)
// two officials approved for the service `product.safety-notice` with at
// least one purpose (proposeIntegrationApproval() / confirmIntegrationApproval()
// in lib/data/store/federation.ts). None ships approved. Each notice is queued
// for each subscriber approved when it is issued (a delivery record), and the
// subscriber collects it through callService() (lib/exchange/services.ts) for
// an approved purpose, which receipts the call in the exchange log and records
// the delivery as collected, with when and for which purpose. A subscriber
// whose approval ends receives nothing more. Held in platform state.

import { recordAudit } from '@/lib/data/store/audit';
import { touch } from '@/lib/data/repo/track';
import { uuid7 } from '@/lib/data/uuid7';
import { withDefaults } from '@/lib/data/defaults';
import { listIntegrations } from '@/lib/data/store/federation';
import type { PublicProductEntry } from './register';

/** The exchange service id (HX-005). */
export const SAFETY_NOTICE_SERVICE = 'product.safety-notice';

/** What a subscriber receives: nothing else exists in this type. */
export interface SafetyNoticePayload {
  /** The notice's own number (SN-…). */
  notice: string;
  kind: 'recall' | 'safety_notice';
  /** The product as publicProductView() lets it out. */
  product: Omit<PublicProductEntry, 'sample'>;
  /** The recall class the decision set (the nation's classes); absent when none was set or for a safety alert. */
  recallClass?: string;
  /** The regulator's case reference (no personal data). */
  reference: string;
  decidedOn: string;
  publishedOn: string;
  /** Whether the holder's supply-chain notification (the recall case's supply-chain-notice document) is recorded yet. */
  supplyChainNotice: 'recorded' | 'not yet recorded' | 'not applicable';
  /** Issued from a sample case of a demonstration. */
  sample?: true;
}

interface Notice { id: string; payload: SafetyNoticePayload; case: string; at: string }
export interface NoticeDelivery {
  id: string;
  notice: string;
  /** The integration (subscriber) it is for. */
  subscriber: string;
  queuedAt: string;
  collectedAt?: string;
  /** The approved purpose stated when it was collected. */
  purpose?: string;
  /** The exchange receipt of the collecting call. */
  receipt?: string;
}
type Db = { notices: Notice[]; deliveries: NoticeDelivery[]; seq: number };
const seed = (): Db => ({ notices: [], deliveries: [], seq: 0 });
const g = globalThis as unknown as { __civicosSafetyNotices?: Db };
const db = (): Db => touch('__civicosSafetyNotices', g.__civicosSafetyNotices = withDefaults(g.__civicosSafetyNotices ??= seed(), seed()));
export function resetNotices(): void { g.__civicosSafetyNotices = undefined; }
const clone = <T,>(x: T): T => structuredClone(x);

/** The integrations two officials approved for HX-005, each with its purposes (none ships). */
export function noticeSubscribers(): { id: string; name: string; ownerOrg: string; purposes: string[]; approvedAt?: string }[] {
  return listIntegrations()
    .filter(i => i.status === 'approved' && i.approval && i.scopes.includes(`service:${SAFETY_NOTICE_SERVICE}`) && (i.purposes?.[SAFETY_NOTICE_SERVICE]?.length ?? 0) > 0)
    .map(i => ({ id: i.id, name: i.name, ownerOrg: i.ownerOrg, purposes: [...i.purposes![SAFETY_NOTICE_SERVICE]!], ...(i.approval?.at ? { approvedAt: i.approval.at } : {}) }));
}

/**
 * Issue a notice for a published recall or safety alert (the product
 * procedures' effect calls it once the notice is published) and queue it for
 * every approved subscriber. One notice per case.
 */
export function issueSafetyNotice(input: { case: string; reference: string; kind: 'recall' | 'safety_notice'; product: PublicProductEntry; recallClass?: string; decidedOn: string; publishedOn: string }, by: string, now = new Date()): SafetyNoticePayload | { error: string } {
  const d = db();
  if (d.notices.some(n => n.case === input.case)) return { error: 'This case has already issued its notice' };
  const { sample, ...product } = input.product;
  d.seq += 1;
  const payload: SafetyNoticePayload = {
    notice: `SN-${now.getUTCFullYear()}-${String(d.seq).padStart(6, '0')}`, kind: input.kind, product: clone(product),
    ...(input.kind === 'recall' && input.recallClass ? { recallClass: input.recallClass } : {}),
    reference: input.reference, decidedOn: input.decidedOn, publishedOn: input.publishedOn,
    supplyChainNotice: input.kind === 'recall' ? 'not yet recorded' : 'not applicable',
    ...(sample ? { sample: true as const } : {}),
  };
  const n: Notice = { id: uuid7(), payload, case: input.case, at: now.toISOString() };
  d.notices.push(n);
  const subs = noticeSubscribers();
  for (const s of subs) d.deliveries.push({ id: uuid7(), notice: payload.notice, subscriber: s.id, queuedAt: n.at });
  recordAudit(by, 'product.notice.issue', `SafetyNotice:${payload.notice}`, 'ok', `${input.kind === 'recall' ? 'recall' : 'safety alert'} · product ${product.productId} · case ${input.reference} · queued for ${subs.length} approved subscriber(s)${sample ? ' · sample' : ''}`);
  return clone(payload);
}

/** The recall case recorded the holder's supply-chain notification: the notice says so to whoever collects it from now. */
export function noteSupplyChainNotice(caseId: string, by: string): void {
  const n = db().notices.find(x => x.case === caseId);
  if (!n || n.payload.kind !== 'recall' || n.payload.supplyChainNotice === 'recorded') return;
  n.payload.supplyChainNotice = 'recorded';
  recordAudit(by, 'product.notice.supply-chain', `SafetyNotice:${n.payload.notice}`, 'ok', `supply-chain notification recorded on case ${n.payload.reference}`);
}

/**
 * A subscriber collects the notices queued for it (through callService(), which
 * has already checked the integration and the purpose): each delivery is
 * recorded as collected, with the purpose and the exchange receipt.
 */
export function collectNotices(subscriber: string, purpose: string, now = new Date()): SafetyNoticePayload[] {
  const d = db();
  const mine = d.deliveries.filter(x => x.subscriber === subscriber && !x.collectedAt);
  const out: SafetyNoticePayload[] = [];
  for (const x of mine) {
    const n = d.notices.find(y => y.payload.notice === x.notice);
    if (!n) continue;
    x.collectedAt = now.toISOString();
    x.purpose = purpose.slice(0, 80);
    out.push(clone(n.payload));
  }
  if (mine.length) recordAudit(`Integration:${subscriber}`, 'product.notice.collect', `Integration:${subscriber}`, 'ok', `${out.length} notice(s): ${out.map(p => p.notice).join(', ')} · purpose ${purpose.slice(0, 80)}`);
  return out;
}
/** Attach the exchange receipt of the call that collected these notices. */
export function receiptDeliveries(subscriber: string, notices: string[], receipt: string): void {
  for (const x of db().deliveries) if (x.subscriber === subscriber && notices.includes(x.notice) && x.collectedAt && !x.receipt) x.receipt = receipt;
}

// ── Reads ────────────────────────────────────────────────────────────────────

/** Every notice issued, as subscribers receive it (newest first). */
export const listNotices = (limit = 100): SafetyNoticePayload[] => db().notices.slice(-limit).reverse().map(n => clone(n.payload));
/** Every delivery record (queued and collected), newest first. */
export const noticeDeliveries = (limit = 500): NoticeDelivery[] => db().deliveries.slice(-limit).reverse().map(clone);
/** Counts (no content). */
export function noticeCounts(): { notices: number; queued: number; collected: number } {
  const d = db();
  return { notices: d.notices.length, queued: d.deliveries.filter(x => !x.collectedAt).length, collected: d.deliveries.filter(x => x.collectedAt).length };
}
