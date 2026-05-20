// lib/gov/fiscal-execution.ts
//
// Treasury sovereign fiscal-execution engine. Adds the four missing
// executable systems on top of the existing Treasury engines:
//   • Funding chains — request → review → approval → release →
//     disbursement → reconciliation (stateful per request).
//   • Sovereign reserve workflows — FX draw-down with governor
//     authorization, release window, repatriation reconciliation.
//   • Budget propagation — annual envelope cascading Treasury → ministry
//     → department → encumbrance → spent, with variance.
//   • Inter-ministry fiscal execution — Treasury-originated transfers
//     down the chain Treasury → Ministry → Facility → Vendor with hop
//     SLAs.
// Pure & deterministic; SSR-stable per operational epoch.

import { seed, wave } from '@/lib/telemetry';
import { fiscalCommand, budgetOps, bankingRails } from '@/lib/gov/treasury-systems';

const MINISTRIES = ['Interior', 'Health', 'Education', 'Transport', 'Energy', 'Justice', 'Environment', 'Labour', 'Trade', 'Agriculture'];
const STAGES = ['request', 'review', 'approval', 'release', 'disbursement', 'reconciliation'] as const;
export type FundingStage = typeof STAGES[number];

export type FundingStatus = 'in-flight' | 'held' | 'rejected' | 'released' | 'reconciled';

export interface FundingChain {
  id: string;
  ministry: string;
  category: 'capital' | 'recurrent' | 'emergency' | 'transfer';
  amountM: number;          // millions of sovereign units
  ageHrs: number;
  slaHrs: number;
  stage: FundingStage;
  status: FundingStatus;
  approverChain: string[];  // ordered chain that has signed/will sign
  blocked: boolean;
  rationale: string;
}

const CHAIN_KEYS: Record<FundingChain['category'], string[]> = {
  capital: ['Treasury Officer', 'Budget Division', 'Minister of Finance', 'Cabinet Approval'],
  recurrent: ['Treasury Officer', 'Budget Division', 'Finance Director'],
  emergency: ['Treasury Officer', 'Minister of Finance', 'Cabinet Emergency Cell'],
  transfer: ['Treasury Officer', 'Inter-Ministry Liaison'],
};

export function fundingChains(now: number, count = 14): FundingChain[] {
  const epoch = Math.max(0, Math.floor(now / 4000));
  const out: FundingChain[] = [];
  for (let i = 0; i < count; i++) {
    const k = `fc:${i}`;
    const ministry = MINISTRIES[Math.floor(seed(`${k}:m`) * MINISTRIES.length)]!;
    const cat = (['capital', 'recurrent', 'emergency', 'transfer'] as const)[Math.floor(seed(`${k}:c`) * 4)]!;
    const slaHrs = cat === 'emergency' ? 24 : cat === 'transfer' ? 48 : 96;
    const ageHrs = Math.round(wave(`${k}:age`, epoch / (5 + seed(`${k}:p`) * 6), 2, slaHrs * 1.8));
    const progress = Math.min(STAGES.length - 1, Math.floor((ageHrs / Math.max(1, slaHrs)) * (STAGES.length - 1) * 0.9));
    const rejected = seed(`${k}:rej`) > 0.92;
    const held = !rejected && seed(`${k}:hold`) > 0.84;
    const stage: FundingStage = rejected ? 'review' : STAGES[progress]!;
    const status: FundingStatus =
      rejected ? 'rejected'
        : held ? 'held'
          : stage === 'reconciliation' ? 'reconciled'
            : stage === 'release' || stage === 'disbursement' ? 'released' : 'in-flight';
    const fullChain = CHAIN_KEYS[cat];
    const signedCount = Math.min(fullChain.length, progress);
    out.push({
      id: `FND-${(20000 + Math.floor(seed(`${k}:id`) * 60000)).toString()}`,
      ministry, category: cat,
      amountM: Math.round(0.4 + seed(`${k}:amt`) * (cat === 'capital' ? 240 : cat === 'emergency' ? 80 : 36)) + 0.5,
      ageHrs, slaHrs, stage, status,
      approverChain: fullChain.slice(0, signedCount),
      blocked: held,
      rationale: rejected ? 'Rejected — insufficient budget coverage'
        : held ? 'Held — supplementary documentation requested'
          : 'Within approval chain',
    });
  }
  return out.sort((a, b) => b.ageHrs - a.ageHrs);
}

export interface ReserveWorkflow {
  id: string;
  purpose: string;
  requestedBn: number;
  fxBucket: 'USD' | 'EUR' | 'GBP' | 'CNY' | 'GOLD';
  ageHrs: number;
  authorisations: { authority: string; held: boolean; required: true }[];
  releaseWindowHrs: number;
  repatriationDays: number;
  status: 'pending-authorisation' | 'released' | 'repatriating' | 'reconciled' | 'blocked';
}

export function reserveWorkflows(now: number, count = 6): ReserveWorkflow[] {
  const epoch = Math.max(0, Math.floor(now / 4000));
  const purposes = ['Liquidity defence', 'Sanctions buffer', 'Sovereign debt service', 'Strategic-import facility', 'Currency intervention', 'Emergency continuity'];
  const buckets: ReserveWorkflow['fxBucket'][] = ['USD', 'EUR', 'GBP', 'CNY', 'GOLD'];
  return Array.from({ length: count }, (_, i) => {
    const k = `rw:${i}:${Math.floor(epoch / 6)}`;
    const authHeld = (a: string) => ({ authority: a, held: seed(`${k}:a:${a}`) > 0.45, required: true as const });
    const auths = [authHeld('Reserve Governor'), authHeld('Treasury Minister'), authHeld('Cabinet Fiscal Authority')];
    const allSigned = auths.every(a => a.held);
    const ageHrs = Math.round(wave(`${k}:age`, epoch / 7, 2, 96));
    const status: ReserveWorkflow['status'] =
      !allSigned ? (ageHrs > 48 ? 'blocked' : 'pending-authorisation')
        : ageHrs < 12 ? 'released'
          : ageHrs < 60 ? 'repatriating' : 'reconciled';
    return {
      id: `RES-${1000 + i}`,
      purpose: purposes[i % purposes.length]!,
      requestedBn: Math.round(0.5 + seed(`${k}:bn`) * 18) + 0.5,
      fxBucket: buckets[Math.floor(seed(`${k}:b`) * buckets.length)]!,
      ageHrs,
      authorisations: auths,
      releaseWindowHrs: 24 + Math.floor(seed(`${k}:rw`) * 96),
      repatriationDays: 30 + Math.floor(seed(`${k}:rp`) * 90),
      status,
    };
  });
}

export interface BudgetCascade {
  ministry: string;
  envelopeBn: number;
  cascade: { level: 'ministry' | 'department' | 'encumbrance' | 'spent'; pct: number; amountBn: number }[];
  variancePct: number;   // signed: positive = under-spent, negative = over
  burndownPct: number;   // % of envelope spent
}

export function budgetPropagation(now: number): BudgetCascade[] {
  const epoch = Math.max(0, Math.floor(now / 4000));
  const fc = fiscalCommand('treasury', now / 4000);
  const totalBn = Math.max(80, Math.round(fc.fxReservesBn * 4 + 120));
  return MINISTRIES.map((ministry, i) => {
    const k = `bp:${ministry}:${Math.floor(epoch / 8)}`;
    const share = 0.05 + seed(`${k}:s`) * 0.15;
    const envelopeBn = Math.round(totalBn * share * 10) / 10;
    const ministryPct = 100;
    const departmentPct = Math.max(40, Math.min(100, Math.round(wave(`${k}:dp`, epoch / 9, 60, 96))));
    const encumbrancePct = Math.max(10, Math.min(departmentPct, Math.round(wave(`${k}:en`, epoch / 8, 35, 78))));
    const spentPct = Math.max(5, Math.min(encumbrancePct, Math.round(wave(`${k}:sp`, epoch / 7, 18, 62))));
    const burndownPct = spentPct;
    const expected = Math.min(85, 8 + (epoch % 24) * 3.4);
    return {
      ministry,
      envelopeBn,
      cascade: [
        { level: 'ministry', pct: ministryPct, amountBn: envelopeBn },
        { level: 'department', pct: departmentPct, amountBn: Math.round(envelopeBn * departmentPct) / 100 },
        { level: 'encumbrance', pct: encumbrancePct, amountBn: Math.round(envelopeBn * encumbrancePct) / 100 },
        { level: 'spent', pct: spentPct, amountBn: Math.round(envelopeBn * spentPct) / 100 },
      ],
      variancePct: Math.round(expected - spentPct),
      burndownPct,
    };
  });
}

export interface InterMinistryTransfer {
  id: string;
  amountM: number;
  hops: { from: string; to: string; status: 'pending' | 'cleared' | 'reconciled' | 'stalled'; slaHrs: number; ageHrs: number }[];
  category: string;
  endToEndHrs: number;
}

export function interMinistryTransfers(now: number, count = 10): InterMinistryTransfer[] {
  const epoch = Math.max(0, Math.floor(now / 4000));
  const br = bankingRails('treasury', now / 4000);
  void br;
  const categories = ['Capital project', 'Health programme', 'Education subvention', 'Emergency relief', 'Infrastructure grant', 'Subsidy disbursement'];
  return Array.from({ length: count }, (_, i) => {
    const k = `imt:${i}:${Math.floor(epoch / 5)}`;
    const ministry = MINISTRIES[Math.floor(seed(`${k}:m`) * MINISTRIES.length)]!;
    const facility = ['District office', 'Hospital district', 'School board', 'Transit authority', 'Regional bureau'][Math.floor(seed(`${k}:f`) * 5)]!;
    const vendor = ['Approved vendor pool', 'Local supplier', 'National contractor'][Math.floor(seed(`${k}:v`) * 3)]!;
    const hops = [
      { from: 'Treasury', to: `Ministry of ${ministry}`, slaHrs: 12 },
      { from: `Ministry of ${ministry}`, to: facility, slaHrs: 24 },
      { from: facility, to: vendor, slaHrs: 48 },
    ].map((h, hi) => {
      const ageHrs = Math.round(wave(`${k}:h${hi}`, epoch / 6, 0, h.slaHrs * 2.2));
      const status: InterMinistryTransfer['hops'][number]['status'] =
        ageHrs > h.slaHrs * 1.6 ? 'stalled'
          : ageHrs > h.slaHrs ? 'cleared'
            : ageHrs > h.slaHrs * 0.5 ? 'cleared' : 'pending';
      return { ...h, status, ageHrs };
    });
    const endToEndHrs = hops.reduce((s, h) => s + h.ageHrs, 0);
    return {
      id: `IMT-${(5000 + Math.floor(seed(`${k}:id`) * 90000)).toString()}`,
      amountM: Math.round(0.3 + seed(`${k}:amt`) * 48) + 0.5,
      hops,
      category: categories[Math.floor(seed(`${k}:c`) * categories.length)]!,
      endToEndHrs,
    };
  }).sort((a, b) => b.endToEndHrs - a.endToEndHrs);
}

// One aggregate view for shells that need the whole fiscal-execution surface.
export function fiscalExecutionBoard(now: number) {
  return {
    chains: fundingChains(now),
    reserves: reserveWorkflows(now),
    propagation: budgetPropagation(now),
    transfers: interMinistryTransfers(now),
    budget: budgetOps('treasury', now / 4000),
  };
}
