// CivicOS — Update Center licence and contract management, server-side.
//
// One contract per nation, consistent with the systems that already hold
// the facts:
//   • the hosting path from lib/data/hosting.ts (accepted assessment, or the
//     delivery mode) decides the kind — hosted subscription, self-run
//     subscription, or perpetual licence with support and updates — and the
//     fee comes from the same parameterised cost model (HOSTING_MODEL);
//   • prices use the nation's currency and contract rate from the security
//     store's pricing(), and the security store's own invoices appear beside
//     the platform's in one billing view (read, never duplicated);
//   • the support tier is the one in lib/data/support.ts (changing it there
//     changes the contract; there is one source).
// Modules entitled, seats, term and renewal are held here. Renewal is never
// automatic: the publisher proposes, a named official of the nation accepts.
// Every change is audited. Figures are placeholders (§13.7).

import type { Contract, ContractInvoice, ContractKind, ContractModule, HostingPath, SubscribedNation, SupportTier } from '@/lib/api/types';
import { recordAudit } from '@/lib/data/store/audit';
import { currentPath } from './hosting';
import { listOrders, pricing, catalogue } from './security-store';
import { supportTier, setSupportTier } from './support';
import { HOSTING_MODEL } from '@/lib/updates/hosting-model';

const DAY = 86_400_000;
export const MODULES: { key: string; label: string }[] = [
  { key: 'portal', label: 'Citizen portal and wallet' },
  { key: 'identity', label: 'Identity and sign-in' },
  { key: 'permits', label: 'Permits and licensing' },
  { key: 'payments', label: 'Payments and receipts' },
  { key: 'registry', label: 'Civil registry' },
  { key: 'treasury', label: 'Treasury ledger' },
  { key: 'land', label: 'Land registry' },
  { key: 'interop', label: 'Interoperability and federation' },
  { key: 'ops', label: 'Operations centre' },
  { key: 'assembly', label: 'Legislature and assembly' },
];
/** Support tier uplift on the annual fee (placeholder figures). */
export const TIER_UPLIFT: Record<SupportTier, number> = { standard: 0, enterprise: 0.15, sovereign: 0.3 };
export const RENEWAL_NOTICE_DAYS = 90;

interface Stored {
  id: string; nationId: string; plan?: string; population: number; modules: string[]; seats: { licensed: number; used: number };
  term: { start: string; years: number }; renewal: Contract['renewal'] | null; paid: Record<string, { at: string; reference: string }>;
  history: Contract['history'];
}
const g = globalThis as unknown as { __civicosContracts?: Record<string, Stored> };
function cdb(): Record<string, Stored> { return (g.__civicosContracts ??= {}); }
export function resetContracts(): void { g.__civicosContracts = undefined; }

const iso = (t: number) => new Date(t).toISOString();
const addYears = (s: string, y: number) => { const d = new Date(s); d.setUTCFullYear(d.getUTCFullYear() + y); return d.toISOString(); };
const round = (v: number) => Math.round(v);

function stored(n: SubscribedNation, now: number): Stored {
  const db = cdb();
  if (db[n.id]) return db[n.id]!;
  const home = !!n.home;
  const start = home ? iso(now - 300 * DAY) : n.enrolledAt;
  const s: Stored = {
    id: `CT-${n.id.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 8)}`, nationId: n.id,
    plan: n.deliveryMode === 'saas' ? (home ? 'enterprise' : 'standard') : undefined,
    population: home ? 8_000_000 : 1_000_000,
    modules: home ? MODULES.map(m => m.key).filter(k => k !== 'assembly') : ['portal', 'identity', 'permits', 'payments'],
    seats: home ? { licensed: 1500, used: 1250 } : { licensed: 50, used: 40 },
    term: { start, years: home ? 1 : 1 },
    renewal: null, paid: {},
    history: [{ at: start, by: 'Contracts office', action: 'signed' }],
  };
  // The first year of the home contract is paid.
  if (home) s.paid[`${s.id}-Y1`] = { at: iso(Date.parse(start) + 20 * DAY), reference: 'TRF-0001' };
  db[n.id] = s;
  return s;
}

function kindOf(path: HostingPath): ContractKind {
  return path === 'hosted' ? 'hosted-subscription' : path === 'perpetual' ? 'perpetual-licence' : 'self-run-subscription';
}

/** Annual fee in the reference currency, from the hosting cost model, then the tier uplift. */
function feeFor(kind: ContractKind, s: Stored, tier: SupportTier): { annual: number; basis: string } {
  const H = HOSTING_MODEL;
  let annual: number; let basis: string;
  if (kind === 'hosted-subscription') {
    const p = H.hosted.plans[(s.plan ?? 'standard') as keyof typeof H.hosted.plans] ?? H.hosted.plans.standard;
    annual = p.base + p.perCitizen * s.population;
    basis = `${p.label.split(' — ')[0]} plan: ${p.base.toLocaleString('en-US')} + ${p.perCitizen} × ${s.population.toLocaleString('en-US')} citizens`;
  } else {
    const licence = H.perpetual.base + H.perpetual.perCitizen * s.population;
    annual = licence * (H.perpetual.supportPct + H.perpetual.updatesPct);
    basis = kind === 'perpetual-licence'
      ? `Support ${H.perpetual.supportPct * 100}% + updates ${H.perpetual.updatesPct * 100}% of the licence value`
      : `Platform subscription (support and updates) at ${(H.perpetual.supportPct + H.perpetual.updatesPct) * 100}% of the licence value`;
  }
  const up = TIER_UPLIFT[tier];
  return { annual: round(annual * (1 + up)), basis: `${basis}${up ? ` · ${tier} support +${up * 100}%` : ''}` };
}

export function contractFor(n: SubscribedNation, nationName: string, now = Date.now()): Contract {
  const s = stored(n, now);
  const path = currentPath(n) ?? (n.deliveryMode === 'saas' ? 'hosted' : 'sovereign-dc');
  const kind = kindOf(path);
  const tier = supportTier(n.id);
  const pr = pricing(n);
  const fee = feeFor(kind, s, tier);
  const annual = round(fee.annual * pr.rate);
  const end = addYears(s.term.start, s.term.years);
  const noticeFrom = iso(Date.parse(end) - RENEWAL_NOTICE_DAYS * DAY);
  const renewal: Contract['renewal'] = s.renewal ?? {
    noticeDays: RENEWAL_NOTICE_DAYS, noticeFrom,
    status: now >= Date.parse(end) ? 'lapsed' : now >= Date.parse(noticeFrom) ? 'notice-period' : 'not-due',
  };
  if (s.renewal) renewal.noticeFrom = noticeFrom;
  // Platform invoices: one per contract year, issued at the start of the year, due in 30 days.
  const invoices: ContractInvoice[] = [];
  for (let y = 0; y < s.term.years; y++) {
    const issued = Date.parse(addYears(s.term.start, y));
    if (issued > now + 30 * DAY) {
      invoices.push({ id: `${s.id}-Y${y + 1}`, source: 'platform', description: `Year ${y + 1} — ${kind === 'hosted-subscription' ? 'hosted subscription' : kind === 'perpetual-licence' ? 'support and updates' : 'platform subscription'}`, period: { from: iso(issued), to: addYears(iso(issued), 1) }, issuedAt: iso(issued), dueAt: iso(issued + 30 * DAY), amount: annual, currency: pr.currency, status: 'upcoming' });
      continue;
    }
    const id = `${s.id}-Y${y + 1}`;
    const paid = s.paid[id];
    const due = issued + 30 * DAY;
    invoices.push({ id, source: 'platform', description: `Year ${y + 1} — ${kind === 'hosted-subscription' ? 'hosted subscription' : kind === 'perpetual-licence' ? 'support and updates' : 'platform subscription'}`, period: { from: iso(issued), to: addYears(iso(issued), 1) }, issuedAt: iso(issued), dueAt: iso(due), amount: annual, currency: pr.currency, status: paid ? 'paid' : now > due ? 'overdue' : 'due', paidAt: paid?.at, reference: paid?.reference });
  }
  // Security-store invoices, as the security store records them.
  const names = Object.fromEntries(catalogue().map(p => [p.id, p.name]));
  for (const o of listOrders(n.id, now)) {
    if (!o.invoice && !o.payment) continue;
    const issuedAt = o.invoice?.issuedAt ?? o.payment!.paidAt;
    const dueAt = o.invoice?.dueAt ?? o.payment!.paidAt;
    const amount = o.invoice?.amount ?? o.total;
    if (!amount) continue;
    invoices.push({ id: o.invoice?.id ?? o.id, source: 'security-store', description: `Security store — ${names[o.productId] ?? o.productId} (${o.edition}, ${o.seats} × ${o.years} y)`, issuedAt, dueAt, amount, currency: o.currency, status: o.payment ? 'paid' : now > Date.parse(dueAt) ? 'overdue' : 'due', paidAt: o.payment?.paidAt, reference: o.payment?.reference ?? o.poNumber });
  }
  invoices.sort((a, b) => b.issuedAt.localeCompare(a.issuedAt));
  const outstanding = invoices.filter(i => (i.status === 'due' || i.status === 'overdue') && i.currency === pr.currency).reduce((t, i) => t + i.amount, 0);
  return {
    id: s.id, nationId: n.id, nationName, kind, hostingPath: path, plan: kind === 'hosted-subscription' ? s.plan : undefined,
    modules: MODULES.map(m => ({ ...m, entitled: s.modules.includes(m.key) })) as ContractModule[],
    seats: { ...s.seats }, term: { start: s.term.start, end, years: s.term.years }, renewal, supportTier: tier,
    currency: pr.currency, localPricing: pr.local, annualFee: annual, feeBasis: fee.basis, invoices, outstanding, history: [...s.history],
  };
}

const str = (v: unknown, max: number) => (typeof v === 'string' ? v.trim().slice(0, max) : '');

/** Publisher side: seats, modules, support tier, renewal proposal, payment received. */
export function publisherContractAction(n: SubscribedNation, input: { action?: string; by?: string; licensed?: number; modules?: string[]; tier?: string; years?: number; invoiceId?: string; reference?: string }, now = Date.now()): { ok: true } | { error: string; status: number } {
  const s = stored(n, now);
  const by = str(input.by, 120);
  if (!by) return { error: 'Name who is making the change', status: 422 };
  const at = iso(now);
  const log = (action: string, note: string) => { s.history.push({ at, by, action, note }); recordAudit(by, `contract.${action}`, `Contract:${n.id}`, 'ok', note); };
  switch (input.action) {
    case 'set-seats': {
      const v = Number(input.licensed);
      if (!Number.isInteger(v) || v < s.seats.used || v > 1_000_000) return { error: `Seats must be a whole number, at least the ${s.seats.used} in use`, status: 422 };
      log('seats', `${s.seats.licensed} → ${v}`); s.seats.licensed = v; return { ok: true };
    }
    case 'set-modules': {
      const keys = (input.modules ?? []).filter(k => MODULES.some(m => m.key === k));
      if (!keys.length) return { error: 'A contract needs at least one module', status: 422 };
      log('modules', keys.join(', ')); s.modules = keys; return { ok: true };
    }
    case 'set-tier': {
      const out = setSupportTier(n.id, String(input.tier ?? ''), by);
      if ('error' in out) return out;
      s.history.push({ at, by, action: 'tier', note: String(input.tier) });
      return { ok: true };
    }
    case 'propose-renewal': {
      const years = Number(input.years);
      if (![1, 3, 5].includes(years)) return { error: 'Renewal terms are 1, 3 or 5 years', status: 422 };
      const c = contractFor(n, n.name, now);
      const annualFee = round(c.annualFee * (years === 5 ? 1 - HOSTING_MODEL.hosted.fiveYearDiscountPct / 100 : 1));
      s.renewal = { noticeDays: RENEWAL_NOTICE_DAYS, noticeFrom: c.renewal.noticeFrom, status: 'proposed', proposal: { years, annualFee, by, at } };
      log('renewal.propose', `${years} years at ${annualFee.toLocaleString('en-US')} ${c.currency} a year`); return { ok: true };
    }
    case 'mark-paid': {
      const id = str(input.invoiceId, 60), ref = str(input.reference, 80);
      const c = contractFor(n, n.name, now);
      const inv = c.invoices.find(i => i.id === id && i.source === 'platform');
      if (!inv) return { error: 'Platform invoice not found (security-store invoices are settled in the security store)', status: 404 };
      if (inv.status === 'paid' || inv.status === 'upcoming') return { error: `Invoice is ${inv.status}`, status: 409 };
      if (!ref) return { error: 'Record the payment reference', status: 422 };
      s.paid[id] = { at, reference: ref }; log('payment', `${id} · ${ref}`); return { ok: true };
    }
    default: return { error: 'action must be set-seats, set-modules, set-tier, propose-renewal or mark-paid', status: 422 };
  }
}

/** Nation side: accept a proposed renewal (never automatic) or ask for a change. */
export function nationContractAction(n: SubscribedNation, input: { action?: string; by?: string; note?: string }, now = Date.now()): { ok: true } | { error: string; status: number } {
  const s = stored(n, now);
  const by = str(input.by, 120), note = str(input.note, 1000);
  if (!by) return { error: 'Name the official acting for the nation', status: 422 };
  const at = iso(now);
  if (input.action === 'accept-renewal') {
    if (s.renewal?.status !== 'proposed' || !s.renewal.proposal) return { error: 'There is no renewal proposal to accept', status: 409 };
    const p = s.renewal.proposal;
    s.term = { start: s.term.start, years: s.term.years + p.years };
    s.renewal = { ...s.renewal, status: 'renewed', acceptedBy: by, acceptedAt: at };
    s.history.push({ at, by, action: 'renewal.accept', note: `${p.years} years` });
    recordAudit(by, 'contract.renewal.accept', `Contract:${n.id}`, 'ok', `${p.years} years at ${p.annualFee.toLocaleString('en-US')} a year`);
    return { ok: true };
  }
  if (input.action === 'request-change') {
    if (note.length < 10) return { error: 'Describe the change you need — at least 10 characters', status: 422 };
    s.history.push({ at, by, action: 'change-request', note });
    recordAudit(by, 'contract.change-request', `Contract:${n.id}`, 'ok', note);
    return { ok: true };
  }
  return { error: 'action must be accept-renewal or request-change', status: 422 };
}
