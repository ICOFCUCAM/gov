// CivicOS — Update Center security store, server-side.
//
// Owner's decisions (held as configuration in STORE_POLICY):
//   • Baseline security is included free for every nation and always on:
//     platform security releases and patches, signed releases with checksum
//     and signature verification, and baseline host/image vulnerability
//     scanning. No nation is left unprotected for non-payment.
//   • Paid tiers are advanced server-side tools from certified third-party
//     vendors: host EDR, container/image scanning, WAF, SIEM connector,
//     managed detection and response, ransomware-resilient backup. The
//     platform sells no antivirus of its own.
// Two purchase routes: instant payment on the nation's rail, and government
// procurement (quote → purchase order → invoice → bank transfer reference →
// licence). Signed downloads unlock while the licence is active.
//
// Bring your own: a nation may register its own security tooling and attest
// to its last scan instead of buying; nation-supplied software may rely on it.
//
// Security never blocks an update: platform security releases and patches
// are always installable, whatever the licence or BYO status. The coverage
// rule (securityGate) is advisory and feeds the posture panel only.
//
// Definitions (scanner rules, signatures) are data, not software: applied
// automatically by default, per nation setting. Security software upgrades
// are never automatic. Vendors and products are fictional placeholders; no
// money moves (docs/INTEGRATION_REGISTER.md §8).

import type {
  ByoSecurityTool, NationSoftware, OrderStage, SecurityCategory, SecurityCenter, SecurityDefinitions,
  SecurityGate, SecurityOrder, SecurityPosture, SecurityProduct, StorePolicy, SubscribedNation,
} from '@/lib/api/types';
import { recordAudit } from './store';
import { nationPaymentRail } from '@/lib/nation/registry';

export const REFERENCE_CURRENCY = 'USD';
const DAY = 86_400_000;
const DEFINITIONS_CYCLE_MS = 6 * 3600_000;
export const BYO_SCAN_MAX_DAYS = 30;

/** The owner's decisions, held as configuration. Change here, not in code paths. */
export const STORE_POLICY: StorePolicy = {
  includedTier: 'free',
  certifiedVendorsOnly: true,
  paths: ['procurement', 'instant'],
  decision: 'Baseline included free for every nation; catalogue lists certified third-party vendors only; instant payment and government procurement both offered.',
};
let policy: StorePolicy = { ...STORE_POLICY };
/** Test and configuration hook. */
export function setStorePolicy(p: Partial<StorePolicy>): StorePolicy { policy = { ...policy, ...p }; return policy; }
export function storePolicy(): StorePolicy { return policy; }

const PARTNER = (name: string) => `${name} — certified partner (placeholder)`;
const CERT = (tested: string[], notes: string) => ({ tested, platformVersions: '1.4.0 – 1.5.0', certifiedAt: '2026-09-01T00:00:00.000Z', notes });

export const CATALOGUE: SecurityProduct[] = [
  {
    id: 'SEC-BASE', category: 'vulnerability', name: 'Baseline Host & Image Scanning', vendor: PARTNER('Vendor Alder'), certified: true, tier: 'included', unit: 'server',
    summary: 'Weekly host and container-image vulnerability scanning, findings mapped to platform security advisories. Included and always on for every nation.',
    platforms: ['Linux', 'Windows Server', 'Container images'], latestVersion: '1.8.0', placeholder: true,
    certification: CERT(['Scans every platform image at release', 'Findings mapped to platform advisories', 'Runs offline from the air-gapped bundle'], 'Ships inside every release; no licence or payment.'),
    editions: [{ key: 'baseline', name: 'Baseline', unitPriceRef: 12, features: ['Weekly host scan', 'Image scan of every release', 'CIS configuration checks', 'Findings mapped to platform advisories'] }],
  },
  {
    id: 'SEC-EDR', category: 'edr', name: 'Host EDR & Threat Detection', vendor: PARTNER('Vendor Birch'), certified: true, tier: 'paid', unit: 'server',
    summary: 'Behavioural detection on the servers and nodes that run the platform, with host isolation and investigation.',
    platforms: ['Linux', 'Windows Server', 'Kubernetes nodes'], latestVersion: '5.4.1', placeholder: true,
    certification: CERT(['Agent overhead under 3% CPU on platform nodes', 'No interference with probation health probes', 'Isolation tested against A/B slot switch'], 'Kernel module and eBPF modes both certified.'),
    editions: [
      { key: 'standard', name: 'Standard', unitPriceRef: 120, features: ['Behavioural detection', 'Host isolation', '30-day telemetry'] },
      { key: 'advanced', name: 'Advanced', unitPriceRef: 190, features: ['Everything in Standard', 'Threat-hunting queries', '180-day telemetry'] },
    ],
  },
  {
    id: 'SEC-IMG', category: 'container', name: 'Container & Image Security', vendor: PARTNER('Vendor Alder'), certified: true, tier: 'paid', unit: 'server',
    summary: 'Admission control and runtime protection for the platform’s containers, beyond the included image scan.',
    platforms: ['Kubernetes', 'Container registries'], latestVersion: '3.9.0', placeholder: true,
    certification: CERT(['Admission policy allows only cosign-verified platform images', 'Runtime rules tested on all platform services'], 'Uses the publisher key to verify signatures.'),
    editions: [
      { key: 'standard', name: 'Standard', unitPriceRef: 60, features: ['Signature-enforcing admission control', 'Daily registry scans'] },
      { key: 'advanced', name: 'Advanced', unitPriceRef: 95, features: ['Everything in Standard', 'Runtime drift detection', 'SBOM matching against advisories'] },
    ],
  },
  {
    id: 'SEC-WAF', category: 'waf', name: 'Web Application Firewall', vendor: PARTNER('Vendor Cedar'), certified: true, tier: 'paid', unit: 'server',
    summary: 'Filters attacks on citizen-facing portals and APIs before they reach the platform.',
    platforms: ['Reverse proxy', 'Kubernetes ingress'], latestVersion: '4.2.0', placeholder: true,
    certification: CERT(['Zero false positives on platform smoke tests', 'Rule set covers OWASP Top 10 for the platform APIs'], 'Certified in detection-only and blocking modes.'),
    editions: [
      { key: 'standard', name: 'Standard', unitPriceRef: 80, features: ['Managed rule set', 'Rate limiting'] },
      { key: 'advanced', name: 'Advanced', unitPriceRef: 130, features: ['Everything in Standard', 'Bot management', 'API schema enforcement'] },
    ],
  },
  {
    id: 'SEC-SIEM', category: 'siem', name: 'SIEM Connector & Security Monitoring', vendor: PARTNER('Vendor Dogwood'), certified: true, tier: 'paid', unit: 'server',
    summary: 'Ships platform, audit-chain and host logs to the nation’s security operations centre, with detection rules.',
    platforms: ['Linux', 'Windows Server', 'Containers'], latestVersion: '2.6.3', placeholder: true,
    certification: CERT(['Parses the platform audit chain without loss', 'Forwards over syslog and OTLP'], 'Audit-chain hashes preserved end to end.'),
    editions: [
      { key: 'standard', name: 'Standard', unitPriceRef: 45, features: ['Log forwarding (syslog, OTLP)', 'Audit-chain export'] },
      { key: 'advanced', name: 'Advanced', unitPriceRef: 80, features: ['Everything in Standard', 'Detection rules pack', 'One-year retention'] },
    ],
  },
  {
    id: 'SEC-MDR', category: 'mdr', name: 'Managed Detection & Response', vendor: PARTNER('Vendor Elm'), certified: true, tier: 'paid', unit: 'server',
    summary: 'A 24/7 analyst team watches the platform’s EDR and SIEM signals and responds with the nation’s approval.',
    platforms: ['Any (service)'], latestVersion: '1.2.0', placeholder: true,
    certification: CERT(['Response playbooks never change platform versions', 'Escalation reaches the nation within 15 minutes'], 'Response actions require the nation’s consent.'),
    editions: [{ key: 'standard', name: 'Standard', unitPriceRef: 260, features: ['24/7 monitoring', 'Guided response', 'Monthly threat report'] }],
  },
  {
    id: 'SEC-BKP', category: 'backup', name: 'Ransomware-Resilient Backup', vendor: PARTNER('Vendor Fir'), certified: true, tier: 'paid', unit: 'server',
    summary: 'Encrypted, immutable backups with recovery drills, so a ransomware attack cannot take the records.',
    platforms: ['Linux', 'Windows Server', 'Databases', 'Object storage'], latestVersion: '6.1.0', placeholder: true,
    certification: CERT(['Restores a full platform database within the tested window', 'Immutable copies survive admin-credential compromise'], 'Complements, does not replace, update restore points.'),
    editions: [
      { key: 'standard', name: 'Standard', unitPriceRef: 150, features: ['Daily encrypted backups', 'Immutable copies (30 days)'] },
      { key: 'advanced', name: 'Advanced', unitPriceRef: 240, features: ['Everything in Standard', 'Hourly snapshots', 'Off-site copy', 'Quarterly recovery drill'] },
    ],
  },
];

interface SecurityDb {
  orders: SecurityOrder[];
  byo: ByoSecurityTool[];
  software: NationSoftware[];
  defs: Record<string, { installedCycle: number; installedAt: string }>;
  seq: number;
}

function digest(seed: string, len = 16): string {
  let out = '';
  let h = 2166136261;
  for (let i = 0; out.length < len; i++) {
    for (const ch of `${seed}#${i}`) { h ^= ch.charCodeAt(0); h = Math.imul(h, 16777619) >>> 0; }
    out += h.toString(16).padStart(8, '0');
  }
  return out.slice(0, len);
}
const licenceKey = (seed: string) => digest(seed, 16).toUpperCase().replace(/(.{4})(?!$)/g, '$1-');
const cycleAt = (t: number) => Math.floor(t / DEFINITIONS_CYCLE_MS);
const cycleVersion = (c: number) => {
  const d = new Date(c * DEFINITIONS_CYCLE_MS);
  return `defs-${d.toISOString().slice(0, 10).replace(/-/g, '.')}.${(c % 4) + 1}`;
};
const product = (id: string) => CATALOGUE.find(p => p.id === id);

function seedSecurity(): SecurityDb {
  const now = Date.now();
  const at = (d: number) => new Date(now + d * DAY).toISOString();
  const order = (o: Omit<SecurityOrder, 'history' | 'currency' | 'quotedAt' | 'validUntil'> & { paidDaysAgo: number }): SecurityOrder => {
    const { paidDaysAgo, ...rest } = o;
    const paid = at(-paidDaysAgo);
    return {
      ...rest, currency: REFERENCE_CURRENCY, quotedAt: at(-paidDaysAgo - 12), validUntil: at(-paidDaysAgo + 18),
      payment: { receiptId: `PR-${digest(o.id, 4).toUpperCase()}`, rail: 'Bank transfer', method: 'transfer', reference: `TRF-${digest(`${o.id}ref`, 6).toUpperCase()}`, paidAt: paid, hash: digest(`${o.id}:pay`, 12) },
      licence: { key: licenceKey(o.id), issuedAt: paid, expiresAt: new Date(Date.parse(paid) + o.years * 365 * DAY).toISOString(), seats: o.seats },
      history: [
        { at: at(-paidDaysAgo - 12), by: 'Chief Information Officer', from: null, to: 'quote' },
        { at: at(-paidDaysAgo - 8), by: 'Chief Information Officer', from: 'quote', to: 'ordered', note: o.poNumber },
        { at: at(-paidDaysAgo - 8), by: 'Billing', from: 'ordered', to: 'invoiced' },
        { at: paid, by: 'Accountant General', from: 'invoiced', to: 'active', note: 'Bank transfer received; licence issued' },
      ],
    };
  };
  return {
    orders: [
      // The installed nation pays for backup; it has no EDR yet (baseline scanning is always on).
      order({ id: 'SO-1001', nationId: 'home', productId: 'SEC-BKP', edition: 'standard', seats: 48, years: 1, unitPrice: 150, total: 7200, stage: 'active', poNumber: 'PO-2025-0418', invoice: { id: 'INV-1001', issuedAt: at(-353), dueAt: at(-323), amount: 7200 }, installedVersion: '6.0.2', paidDaysAgo: 345 }),
      order({ id: 'SO-2001', nationId: 'sandbox', productId: 'SEC-SIEM', edition: 'standard', seats: 6, years: 1, unitPrice: 45, total: 270, stage: 'active', poNumber: 'PO-SBX-07', invoice: { id: 'INV-2001', issuedAt: at(-68), dueAt: at(-38), amount: 270 }, installedVersion: '2.6.3', paidDaysAgo: 60 }),
      order({ id: 'SO-2002', nationId: 'sandbox', productId: 'SEC-EDR', edition: 'standard', seats: 6, years: 1, unitPrice: 120, total: 720, stage: 'active', poNumber: 'PO-SBX-08', invoice: { id: 'INV-2002', issuedAt: at(-68), dueAt: at(-38), amount: 720 }, installedVersion: '5.4.1', paidDaysAgo: 60 }),
    ],
    byo: [
      {
        id: 'BYO-1001', nationId: 'home', product: 'Source code scanner (own tooling)', vendor: 'National IT agency', version: '2.3',
        category: 'vulnerability', coverage: { servers: 4, endpoints: 0 }, lastScanAt: at(-3),
        attestation: 'Static and dependency scans run on every build of the nation’s own modules; no high findings open.',
        attestedBy: 'Head of Cyber Security', scope: 'nation-software', registeredAt: at(-50),
      },
    ],
    software: [
      { id: 'NS-1001', nationId: 'home', name: 'Land registry connector', version: '1.2.0', kind: 'integration', registeredAt: at(-48), registeredBy: 'National IT agency', securedBy: 'byo', securedByRef: 'BYO-1001' },
      { id: 'NS-1002', nationId: 'home', name: 'Revenue rules module', version: '0.9.4', kind: 'module', registeredAt: at(-20), registeredBy: 'Revenue authority IT', securedBy: 'byo', securedByRef: 'BYO-1001' },
    ],
    defs: { home: { installedCycle: cycleAt(now) - 36, installedAt: at(-9) } },
    seq: 3000,
  };
}

const g = globalThis as unknown as { __civicosSecurity?: SecurityDb };
function sdb(): SecurityDb { return (g.__civicosSecurity ??= seedSecurity()); }
export function resetSecurity(): void { g.__civicosSecurity = seedSecurity(); policy = { ...STORE_POLICY }; }

// ── Pricing ──────────────────────────────────────────────────────────
/** A nation pays in its own currency once a contract rate exists; until then quotes stay in the reference currency. */
export function pricing(n: SubscribedNation): { currency: string; rate: number; local: boolean } {
  const cur = n.currency ?? REFERENCE_CURRENCY;
  if (cur === REFERENCE_CURRENCY) return { currency: cur, rate: 1, local: true };
  if (n.contractRate && n.contractRate > 0) return { currency: cur, rate: n.contractRate, local: true };
  return { currency: REFERENCE_CURRENCY, rate: 1, local: false };
}
const round2 = (v: number) => Math.round(v * 100) / 100;
/** Three-year terms carry a 10% discount, two-year 5%. */
const termFactor = (years: number) => (years >= 3 ? 0.9 : years === 2 ? 0.95 : 1);

/** Does this nation get an included product free under the current policy? */
function includedFree(nationId: string, now: number): boolean {
  if (policy.includedTier === 'free') return true;
  if (policy.includedTier === 'paid') return false;
  return activeLicences(nationId, now).some(o => product(o.productId)?.tier === 'paid' && o.edition === 'advanced');
}

/** Products the catalogue shows under the current policy. */
export function catalogue(): SecurityProduct[] {
  return CATALOGUE.filter(p => !policy.certifiedVendorsOnly || p.certified);
}

// ── Orders ───────────────────────────────────────────────────────────
function refreshExpiry(o: SecurityOrder, now: number) {
  if (o.stage === 'active' && o.licence && Date.parse(o.licence.expiresAt) < now) {
    o.history.push({ at: o.licence.expiresAt, by: 'Licence server', from: 'active', to: 'expired' });
    o.stage = 'expired';
  }
  if (o.stage === 'quote' && Date.parse(o.validUntil) < now) {
    o.history.push({ at: o.validUntil, by: 'Billing', from: 'quote', to: 'cancelled', note: 'Quote expired' });
    o.stage = 'cancelled';
  }
}

export function listOrders(nationId: string, now = Date.now()): SecurityOrder[] {
  return sdb().orders.filter(o => o.nationId === nationId).map(o => { refreshExpiry(o, now); return o; })
    .sort((a, b) => b.quotedAt.localeCompare(a.quotedAt));
}

function activeLicences(nationId: string, now = Date.now()): SecurityOrder[] {
  return sdb().orders.filter(o => o.nationId === nationId).map(o => { refreshExpiry(o, now); return o; })
    .filter(o => o.stage === 'active' && o.licence && Date.parse(o.licence.issuedAt) <= now);
}

function issueLicence(o: SecurityOrder, now: number) {
  const prev = o.renewalOf ? sdb().orders.find(x => x.id === o.renewalOf) : undefined;
  // A renewal starts when the licence it renews ends.
  const start = Math.max(now, prev?.licence ? Date.parse(prev.licence.expiresAt) : now);
  o.licence = { key: licenceKey(`${o.id}:${now}`), issuedAt: new Date(start).toISOString(), expiresAt: new Date(start + o.years * 365 * DAY).toISOString(), seats: o.seats };
}

export function createQuote(n: SubscribedNation, input: { productId?: string; edition?: string; seats?: number; years?: number; by?: string; renewalOf?: string }, now = Date.now()): SecurityOrder | { error: string } {
  const p = catalogue().find(x => x.id === input.productId);
  if (!p) return { error: 'Choose a product from the catalogue' };
  const ed = p.editions.find(e => e.key === input.edition);
  if (!ed) return { error: `Edition must be one of: ${p.editions.map(e => e.key).join(', ')}` };
  const seats = Number(input.seats);
  if (!Number.isInteger(seats) || seats < 1 || seats > 1_000_000) return { error: 'Seats must be a whole number from 1' };
  const years = Number(input.years ?? 1);
  if (![1, 2, 3].includes(years)) return { error: 'Term must be 1, 2 or 3 years' };
  const by = (input.by ?? '').trim();
  if (!by || by.length > 80) return { error: 'Name the person requesting the quote' };
  const { currency, rate } = pricing(n);
  const free = p.tier === 'included' && includedFree(n.id, now);
  if (free && policy.includedTier === 'free') return { error: `${p.name} is included and always on for every nation; there is nothing to buy` };
  const unitPrice = free ? 0 : round2(ed.unitPriceRef * rate);
  const db = sdb();
  const iso = new Date(now).toISOString();
  const o: SecurityOrder = {
    id: `SO-${++db.seq}`, nationId: n.id, productId: p.id, edition: ed.key, seats, years, currency, unitPrice,
    total: round2(unitPrice * seats * years * termFactor(years)), stage: 'quote',
    quotedAt: iso, validUntil: new Date(now + 30 * DAY).toISOString(),
    renewalOf: input.renewalOf,
    history: [],
  };
  const a = recordAudit(by, 'security.quote', `SecurityOrder:${o.id}@${n.id}`, 'ok', `${p.name} ${ed.name} × ${seats} × ${years}y = ${currency} ${o.total}`);
  o.history.push({ at: iso, by, from: null, to: 'quote', auditSeq: a.seq });
  db.orders.push(o);
  if (free) {
    // Included with the platform: no charge, the licence is issued at once.
    o.payment = { receiptId: `PR-${digest(`${o.id}:incl`, 6).toUpperCase()}`, rail: 'Included', method: 'included', paidAt: iso, hash: digest(`${o.id}:incl`, 12) };
    issueLicence(o, now);
    const b = recordAudit(by, 'security.licence.issue', `SecurityOrder:${o.id}@${n.id}`, 'ok', `${p.name} included with the platform`);
    o.history.push({ at: iso, by, from: 'quote', to: 'active', note: 'Included with the platform; licence issued', auditSeq: b.seq });
    o.stage = 'active';
  }
  return o;
}

export type OrderAction = 'order' | 'pay' | 'pay-now' | 'cancel' | 'renew' | 'install-software';
export const ORDER_ACTIONS: OrderAction[] = ['order', 'pay', 'pay-now', 'cancel', 'renew', 'install-software'];

export function orderAction(n: SubscribedNation, orderId: string, input: { action?: string; by?: string; poNumber?: string; paymentReference?: string }, now = Date.now()): SecurityOrder | { error: string; status: number } {
  const o = sdb().orders.find(x => x.id === orderId && x.nationId === n.id);
  if (!o) return { error: 'Order not found', status: 404 };
  refreshExpiry(o, now);
  const by = (input.by ?? '').trim();
  if (!by || by.length > 80) return { error: 'Name the person taking this step', status: 422 };
  const p = product(o.productId)!;
  const at = new Date(now).toISOString();
  const step = (to: OrderStage, action: string, detail?: string, note?: string) => {
    const a = recordAudit(by, `security.${action}`, `SecurityOrder:${o.id}@${n.id}`, 'ok', detail);
    o.history.push({ at, by, from: o.stage, to, note, auditSeq: a.seq });
    o.stage = to;
  };
  switch (input.action) {
    // Government procurement: purchase order → invoice → bank transfer.
    case 'order': {
      if (!policy.paths.includes('procurement')) return { error: 'Procurement is not offered', status: 422 };
      if (o.stage !== 'quote') return { error: `Only a quote can be ordered; this one is ${o.stage}`, status: 409 };
      const po = (input.poNumber ?? '').trim();
      if (po.length < 3 || po.length > 40) return { error: 'Enter the purchase order number (3–40 characters)', status: 422 };
      o.poNumber = po;
      step('ordered', 'order', po, po);
      // The billing system issues the invoice against the purchase order.
      o.invoice = { id: `INV-${o.id.slice(3)}`, issuedAt: at, dueAt: new Date(now + 30 * DAY).toISOString(), amount: o.total };
      const a = recordAudit('Billing', 'security.invoice', `SecurityOrder:${o.id}@${n.id}`, 'ok', `${o.invoice.id} ${o.currency} ${o.total}`);
      o.history.push({ at, by: 'Billing', from: 'ordered', to: 'invoiced', note: o.invoice.id, auditSeq: a.seq });
      o.stage = 'invoiced';
      return o;
    }
    case 'pay': {
      if (o.stage !== 'invoiced' || !o.invoice) return { error: `Only an invoiced order can be paid by transfer; this one is ${o.stage}`, status: 409 };
      const ref = (input.paymentReference ?? '').trim();
      if (ref.length < 4 || ref.length > 60) return { error: 'Enter the bank transfer’s payment reference (4–60 characters)', status: 422 };
      o.payment = { receiptId: `PR-${digest(`${o.id}:${now}`, 6).toUpperCase()}`, rail: 'Bank transfer', method: 'transfer', reference: ref, paidAt: at, hash: digest(`${o.id}:${o.total}:${now}`, 12) };
      issueLicence(o, now);
      recordAudit(by, 'security.payment', `SecurityOrder:${o.id}@${n.id}`, 'ok', `${o.payment.receiptId} transfer ${ref} ${o.currency} ${o.total}`);
      step('active', 'licence.issue', `${p.name} × ${o.seats} until ${o.licence!.expiresAt.slice(0, 10)}`, `Transfer ${ref} received; licence issued`);
      return o;
    }
    // Instant payment on the nation's rail, straight from the quote.
    case 'pay-now': {
      if (!policy.paths.includes('instant')) return { error: 'Instant payment is not offered', status: 422 };
      if (o.stage !== 'quote') return { error: `Only a quote can be paid at once; this one is ${o.stage}`, status: 409 };
      const rail = nationPaymentRail();
      o.payment = { receiptId: `PR-${digest(`${o.id}:${now}`, 6).toUpperCase()}`, rail, method: 'instant', paidAt: at, hash: digest(`${o.id}:${o.total}:${now}`, 12) };
      o.invoice = { id: `INV-${o.id.slice(3)}`, issuedAt: at, dueAt: at, amount: o.total };
      issueLicence(o, now);
      recordAudit(by, 'security.payment', `SecurityOrder:${o.id}@${n.id}`, 'ok', `${o.payment.receiptId} instant ${rail} ${o.currency} ${o.total}`);
      step('active', 'licence.issue', `${p.name} × ${o.seats} until ${o.licence!.expiresAt.slice(0, 10)}`, `Paid at once by ${rail}; licence issued`);
      return o;
    }
    case 'cancel':
      if (!['quote', 'ordered', 'invoiced'].includes(o.stage)) return { error: `A ${o.stage} order cannot be cancelled`, status: 409 };
      step('cancelled', 'cancel');
      return o;
    case 'renew': {
      if (o.stage !== 'active' && o.stage !== 'expired') return { error: 'Only an active or expired licence can be renewed', status: 409 };
      const q = createQuote(n, { productId: o.productId, edition: o.edition, seats: o.seats, years: o.years, by, renewalOf: o.id }, now);
      if ('error' in q) return { ...q, status: 422 };
      return q;
    }
    case 'install-software': {
      // Security software upgrades follow the platform rule: never automatic.
      if (o.stage !== 'active') return { error: 'The licence must be active', status: 409 };
      if (o.installedVersion === p.latestVersion) return { error: `Already running ${p.latestVersion}`, status: 409 };
      const from = o.installedVersion ?? 'not installed';
      o.installedVersion = p.latestVersion;
      const a = recordAudit(by, 'security.software.install', `SecurityOrder:${o.id}@${n.id}`, 'ok', `${p.name} ${from} → ${p.latestVersion}`);
      o.history.push({ at, by, from: 'active', to: 'active', note: `Installed ${p.name} ${p.latestVersion}`, auditSeq: a.seq });
      return o;
    }
    default:
      return { error: `Action must be one of: ${ORDER_ACTIONS.join(', ')}`, status: 422 };
  }
}

/** Signed download of licensed security software: only while the licence is active. */
export function securityDownload(n: SubscribedNation, orderId: string, now = Date.now()): Record<string, unknown> | { error: string; status: number } {
  const o = listOrders(n.id, now).find(x => x.id === orderId);
  if (!o) return { error: 'Order not found', status: 404 };
  if (o.stage !== 'active' || !o.licence) return { error: 'Downloads unlock when the licence is active', status: 403 };
  const p = product(o.productId)!;
  recordAudit('download link', 'security.download', `SecurityOrder:${o.id}@${n.id}`, 'ok', `${p.name} ${p.latestVersion}`);
  const file = `${p.id.toLowerCase()}-${p.latestVersion}-agent.tar.gz`;
  return {
    placeholder: true,
    notice: 'Placeholder manifest. No security vendor is connected; in production this serves the vendor’s signed agent installer.',
    product: { id: p.id, name: p.name, vendor: p.vendor, version: p.latestVersion, edition: o.edition },
    licence: { key: o.licence.key, seats: o.licence.seats, expiresAt: o.licence.expiresAt },
    artifact: { filename: file, sha256: digest(`${o.id}:${file}`, 64), signature: `${file}.asc` },
  };
}

// ── Bring your own ───────────────────────────────────────────────────
const CATEGORIES: SecurityCategory[] = ['endpoint', 'edr', 'mdr', 'vulnerability', 'container', 'waf', 'siem', 'backup'];

export function registerByo(n: SubscribedNation, input: Partial<{ product: string; vendor: string; version: string; category: string; servers: number; endpoints: number; lastScanAt: string; attestation: string; scope: string; by: string }>, now = Date.now()): ByoSecurityTool | { error: string } {
  const s = (v: unknown, max: number) => (typeof v === 'string' ? v.trim().slice(0, max) : '');
  const name = s(input.product, 120), vendor = s(input.vendor, 120), version = s(input.version, 40);
  const attestation = s(input.attestation, 1000), by = s(input.by, 80);
  if (name.length < 2 || vendor.length < 2 || !version) return { error: 'Name the product, its vendor and version' };
  if (!CATEGORIES.includes(input.category as SecurityCategory)) return { error: `Category must be one of: ${CATEGORIES.join(', ')}` };
  if (input.scope !== 'estate' && input.scope !== 'nation-software') return { error: 'Scope must be estate or nation-software' };
  const servers = Number(input.servers ?? 0), endpoints = Number(input.endpoints ?? 0);
  if (![servers, endpoints].every(v => Number.isInteger(v) && v >= 0 && v <= 1_000_000)) return { error: 'Coverage must be whole numbers' };
  const scan = Date.parse(input.lastScanAt ?? '');
  if (!Number.isFinite(scan) || scan > now + 60_000) return { error: 'Give the date of the last scan (not in the future)' };
  if (attestation.length < 20) return { error: 'The attestation must say what was scanned and the result (at least 20 characters)' };
  if (!by) return { error: 'Name the person attesting' };
  const db = sdb();
  const t: ByoSecurityTool = {
    id: `BYO-${++db.seq}`, nationId: n.id, product: name, vendor, version, category: input.category as SecurityCategory,
    coverage: { servers, endpoints }, lastScanAt: new Date(scan).toISOString(), attestation, attestedBy: by,
    scope: input.scope, registeredAt: new Date(now).toISOString(),
  };
  db.byo.push(t);
  recordAudit(by, 'security.byo.register', `ByoSecurity:${t.id}@${n.id}`, 'ok', `${name} ${version} (${vendor}) · ${t.scope}`);
  return t;
}

export function listByo(nationId: string): ByoSecurityTool[] {
  return sdb().byo.filter(b => b.nationId === nationId).sort((a, b) => b.registeredAt.localeCompare(a.registeredAt));
}

export function listSoftware(nationId: string): NationSoftware[] {
  return sdb().software.filter(x => x.nationId === nationId).sort((a, b) => b.registeredAt.localeCompare(a.registeredAt));
}

/** Register software the nation supplies itself. Its own tooling (BYO) covers it; no purchase is required. */
export function registerSoftware(n: SubscribedNation, input: Partial<{ name: string; version: string; kind: string; by: string }>, now = Date.now()): NationSoftware | { error: string } {
  const name = (input.name ?? '').trim(), version = (input.version ?? '').trim(), by = (input.by ?? '').trim();
  if (name.length < 2 || name.length > 120 || !version || version.length > 40) return { error: 'Name the software and its version' };
  if (!['module', 'integration', 'build'].includes(input.kind ?? '')) return { error: 'Kind must be module, integration or build' };
  if (!by || by.length > 80) return { error: 'Name the person registering it' };
  const gate = securityGate(n, now);
  if (!gate.nationSoftwareCovered) return { error: 'Register your own security tooling (BYO) or hold a platform security licence first' };
  const byo = listByo(n.id)[0];
  const lic = activeLicences(n.id, now)[0];
  const db = sdb();
  const s: NationSoftware = {
    id: `NS-${++db.seq}`, nationId: n.id, name, version, kind: input.kind as NationSoftware['kind'],
    registeredAt: new Date(now).toISOString(), registeredBy: by,
    securedBy: byo ? 'byo' : 'subscription', securedByRef: byo?.id ?? lic!.id,
  };
  db.software.push(s);
  recordAudit(by, 'security.software.register', `NationSoftware:${s.id}@${n.id}`, 'ok', `${name} ${version} · secured by ${s.securedBy}`);
  return s;
}

// ── The coverage rule (advisory) ─────────────────────────────────────
/**
 * Advisory only — never blocks an update. Baseline scanning is always on.
 * The platform estate counts as fully covered with an active host EDR or
 * managed detection licence, or own tooling attested
 * for the whole estate with a scan in the last 30 days. The nation's own
 * software counts as covered by any BYO tool or platform licence.
 */
export function securityGate(n: SubscribedNation, now = Date.now()): SecurityGate {
  const lic = activeLicences(n.id, now);
  if (lic.some(o => { const c = product(o.productId)?.category; return c === 'edr' || c === 'mdr'; })) {
    return { mode: 'subscription', platformCovered: true, nationSoftwareCovered: true, reason: 'Active host EDR or managed detection licence' };
  }
  const byo = listByo(n.id);
  const fresh = (b: ByoSecurityTool) => now - Date.parse(b.lastScanAt) <= BYO_SCAN_MAX_DAYS * DAY;
  if (byo.some(b => b.scope === 'estate' && fresh(b))) {
    return { mode: 'byo', platformCovered: true, nationSoftwareCovered: true, reason: `Own security tooling attested for the whole estate (scan within ${BYO_SCAN_MAX_DAYS} days)` };
  }
  if (byo.length || lic.length) {
    return {
      mode: byo.length ? 'byo' : 'subscription', platformCovered: false, nationSoftwareCovered: true,
      reason: byo.some(b => b.scope === 'estate')
        ? `The estate attestation is older than ${BYO_SCAN_MAX_DAYS} days: attest a fresh scan or add host EDR or managed detection`
        : 'Your tooling covers your own software only; the platform servers have no host EDR or managed detection',
    };
  }
  return { mode: 'none', platformCovered: false, nationSoftwareCovered: false, reason: 'No security coverage recorded: add host EDR or managed detection or register your own tooling' };
}

// ── Definitions (data, not software) ─────────────────────────────────
export function definitions(n: SubscribedNation, now = Date.now()): SecurityDefinitions {
  const db = sdb();
  const latest = cycleAt(now);
  // The included baseline scanner is always on, so automatic definitions always have something to update.
  const automaticActive = n.settings.definitionsPolicy === 'automatic' && baselineActive(n.id, now);
  const cur = (db.defs[n.id] ??= { installedCycle: latest - 1, installedAt: new Date(now - DEFINITIONS_CYCLE_MS).toISOString() });
  if (automaticActive && cur.installedCycle < latest) {
    cur.installedCycle = latest;
    cur.installedAt = new Date(latest * DEFINITIONS_CYCLE_MS).toISOString();
  }
  return {
    installed: cycleVersion(cur.installedCycle), installedAt: cur.installedAt,
    latest: cycleVersion(latest), latestAt: new Date(latest * DEFINITIONS_CYCLE_MS).toISOString(),
    policy: n.settings.definitionsPolicy, automaticActive,
  };
}

/** Apply the latest definitions now (manual policy, or no active protection). */
export function applyDefinitions(n: SubscribedNation, by: string, now = Date.now()): SecurityDefinitions | { error: string } {
  if (!by.trim()) return { error: 'Name the person applying the definitions' };
  const db = sdb();
  const latest = cycleAt(now);
  db.defs[n.id] = { installedCycle: latest, installedAt: new Date(now).toISOString() };
  recordAudit(by.trim(), 'security.definitions.apply', `SecurityDefinitions@${n.id}`, 'ok', cycleVersion(latest));
  return definitions(n, now);
}

// ── Baseline (included, always on) ───────────────────────────────────
export function baselineActive(nationId: string, now = Date.now()): boolean {
  return CATALOGUE.some(p => p.tier === 'included') && includedFree(nationId, now);
}
/** The included scanner runs weekly; its last run is the most recent weekly boundary. */
function baselineLastScan(now: number): number {
  const WEEK = 7 * DAY;
  return Math.floor(now / WEEK) * WEEK;
}
export const BASELINE_COVERS = [
  'Platform security releases and patches — always installable, whatever the licence status',
  'Signed releases with checksum and signature verification',
  'Weekly host and container-image vulnerability scanning',
];

// ── Posture ──────────────────────────────────────────────────────────
export function posture(n: SubscribedNation, advisories: SecurityPosture['advisories'], now = Date.now()): SecurityPosture {
  const lic = activeLicences(n.id, now);
  const byo = listByo(n.id);
  const seatsIn = (cat: SecurityCategory) => lic.filter(o => product(o.productId)?.category === cat).reduce((s, o) => s + o.seats, 0);
  const estateByo = byo.filter(b => b.scope === 'estate');
  const total = n.estate;
  const servers = Math.min(total.servers, Math.max(seatsIn('edr'), seatsIn('mdr')) + estateByo.reduce((s, b) => s + b.coverage.servers, 0));
  const endpoints = Math.min(total.endpoints, seatsIn('endpoint') + estateByo.reduce((s, b) => s + b.coverage.endpoints, 0));
  const defs = definitions(n, now);
  const defsAge = (now - Date.parse(defs.installedAt)) / 3600_000;
  const scans = byo.map(b => Date.parse(b.lastScanAt));
  if (baselineActive(n.id, now)) scans.push(baselineLastScan(now));
  if (lic.some(o => product(o.productId)?.category === 'container')) scans.push(cycleAt(now) * DEFINITIONS_CYCLE_MS);
  const lastScan = scans.length ? Math.max(...scans) : undefined;
  const scanAgeDays = lastScan ? (now - lastScan) / DAY : Infinity;
  const gate = securityGate(n, now);

  const cov = ((total.servers ? servers / total.servers : 1) + (total.endpoints ? endpoints / total.endpoints : 1)) / 2;
  let score = cov * 40;
  score += defsAge <= 24 ? 20 : defsAge <= 72 ? 10 : 0;
  score += scanAgeDays <= 7 ? 15 : scanAgeDays <= 30 ? 8 : 0;
  score += advisories.length === 0 ? 15 : advisories.length === 1 ? 7 : 0;
  score += gate.platformCovered ? 10 : 0;
  score = Math.round(score);
  const grade = score >= 90 ? 'A' : score >= 75 ? 'B' : score >= 60 ? 'C' : score >= 40 ? 'D' : 'E';

  const findings: string[] = [];
  if (servers < total.servers) findings.push(`${total.servers - servers} of ${total.servers} servers have baseline scanning only (no host EDR)`);
  if (endpoints < total.endpoints) findings.push(`${total.endpoints - endpoints} of ${total.endpoints} officer endpoints have no protection recorded: register your own endpoint tooling (BYO)`);
  if (defsAge > 24) findings.push(`Security definitions are ${Math.round(defsAge / 24)} days old`);
  if (scanAgeDays > 30) findings.push(lastScan ? 'No vulnerability scan in the last 30 days' : 'No vulnerability scan on record');
  for (const a of advisories) findings.push(`Security release ${a.version} is not installed`);
  for (const o of lic) {
    const left = (Date.parse(o.licence!.expiresAt) - now) / DAY;
    if (left <= 30) findings.push(`${product(o.productId)?.name} licence expires in ${Math.max(0, Math.ceil(left))} days`);
  }
  if (!gate.platformCovered) findings.push(`Advisory: ${gate.reason}`);
  return {
    grade, score,
    coverage: { servers: { covered: servers, total: total.servers }, endpoints: { covered: endpoints, total: total.endpoints } },
    definitionsAgeHours: Math.round(defsAge), lastScanAt: lastScan ? new Date(lastScan).toISOString() : undefined,
    advisories, gate, findings,
  };
}

export function securityCenter(n: SubscribedNation, advisories: SecurityPosture['advisories'], now = Date.now()): SecurityCenter {
  const pr = pricing(n);
  return {
    nation: n,
    policy,
    baseline: {
      products: CATALOGUE.filter(p => p.tier === 'included').map(p => p.name),
      covers: BASELINE_COVERS,
      active: baselineActive(n.id, now),
      lastScanAt: baselineActive(n.id, now) ? new Date(baselineLastScan(now)).toISOString() : undefined,
    },
    currency: pr.currency,
    localPricing: pr.local,
    referenceCurrency: REFERENCE_CURRENCY,
    catalogue: catalogue().map(p => ({
      ...p,
      prices: Object.fromEntries(p.editions.map(e => [e.key, p.tier === 'included' && includedFree(n.id, now) ? 0 : round2(e.unitPriceRef * pr.rate)])),
    })),
    orders: listOrders(n.id, now),
    byo: listByo(n.id),
    software: listSoftware(n.id),
    definitions: definitions(n, now),
    posture: posture(n, advisories, now),
  };
}
