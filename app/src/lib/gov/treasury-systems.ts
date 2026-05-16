// Treasury Systems — deep operational engine.
//
// The FINANCE archetype is a sovereign fiscal sub-platform: revenue,
// budget execution, procurement, banking rails, citizen finance and
// fiscal assurance each run as live operational environments. Pure &
// deterministic; no React/DOM. Drives treasury cross-system propagation.

import { seed, wave } from '@/lib/telemetry';

const REGIONS = ['Capital District', 'Northern', 'Eastern', 'Western', 'Coastal', 'Highland'];

export interface FiscalCommand {
  liquidityDays: number;
  debtToGdp: number;
  primaryBalancePct: number;
  fxReservesBn: number;
  macroStability: number;   // 0-100
  tone: 'ok' | 'warn' | 'alert';
}
export function fiscalCommand(id: string, t: number): FiscalCommand {
  const liquidityDays = Math.round(wave(`fc:liq:${id}`, t, 8, 60));
  const debtToGdp = Math.round(wave(`fc:dgp:${id}`, t, 34, 78));
  const macro = Math.round(Math.max(0, Math.min(100, 100 - (60 - liquidityDays) * 0.6 - (debtToGdp - 40) * 0.7)));
  return {
    liquidityDays,
    debtToGdp,
    primaryBalancePct: Math.round(wave(`fc:pbl:${id}`, t, -4, 3) * 10) / 10,
    fxReservesBn: Math.round(wave(`fc:fx:${id}`, t, 18, 64) * 10) / 10,
    macroStability: macro,
    tone: macro >= 70 ? 'ok' : macro >= 50 ? 'warn' : 'alert',
  };
}

export interface RevenueOps {
  collectionRatePct: number;
  customsThroughputPct: number;
  taxpayersM: number;
  arrearsBn: number;
  byStream: { stream: string; pct: number; tone: 'ok' | 'warn' | 'alert' }[];
}
const STREAMS = ['Income tax', 'VAT', 'Customs & duties', 'Excise', 'Corporate', 'Non-tax'];
export function revenueOps(id: string, t: number): RevenueOps {
  return {
    collectionRatePct: Math.round(wave(`rv:cr:${id}`, t, 68, 99)),
    customsThroughputPct: Math.round(wave(`rv:ct:${id}`, t, 60, 98)),
    taxpayersM: Math.round(wave(`rv:tp:${id}`, t, 6, 24) * 10) / 10,
    arrearsBn: Math.round(wave(`rv:ar:${id}`, t, 2, 38) * 10) / 10,
    byStream: STREAMS.map((stream, i) => {
      const pct = Math.round(wave(`rv:s:${id}:${i}`, t, 55, 99));
      return { stream, pct, tone: pct >= 85 ? 'ok' : pct >= 70 ? 'warn' : 'alert' };
    }),
  };
}

export interface BudgetOps {
  executionPct: number;
  virements: number;
  blockedAllocations: number;
  byMinistry: { ministry: string; execPct: number; tone: 'ok' | 'warn' | 'alert' }[];
}
const VOTE_HEADS = ['Health', 'Education', 'Transport', 'Energy', 'Interior', 'Agriculture'];
export function budgetOps(id: string, t: number): BudgetOps {
  return {
    executionPct: Math.round(wave(`bg:ex:${id}`, t, 52, 97)),
    virements: Math.round(wave(`bg:vr:${id}`, t, 4, 60)),
    blockedAllocations: Math.round(seed(`bg:bk:${id}:${Math.floor(t / 10)}`) * 7),
    byMinistry: VOTE_HEADS.map((ministry, i) => {
      const execPct = Math.round(wave(`bg:m:${id}:${i}`, t, 45, 98));
      return { ministry, execPct, tone: execPct >= 80 ? 'ok' : execPct >= 60 ? 'warn' : 'alert' };
    }),
  };
}

export interface ProcurementOps {
  activeTenders: number;
  contractsAwarded: number;
  integrityPct: number;
  disbursementLatencyDays: number;
  flaggedContracts: number;
  pipeline: { stage: string; count: number }[];
}
export function procurementOps(id: string, t: number): ProcurementOps {
  const stages = ['Solicitation', 'Evaluation', 'Award', 'Contracting', 'Disbursement'];
  return {
    activeTenders: Math.round(wave(`pc:at:${id}`, t, 30, 220)),
    contractsAwarded: Math.round(wave(`pc:ca:${id}`, t, 10, 90)),
    integrityPct: Math.round(wave(`pc:ig:${id}`, t, 74, 99)),
    disbursementLatencyDays: Math.round(wave(`pc:dl:${id}`, t, 3, 42)),
    flaggedContracts: Math.round(seed(`pc:fl:${id}:${Math.floor(t / 8)}`) * 9),
    pipeline: stages.map((stage, i) => ({ stage, count: Math.round(wave(`pc:p:${id}:${i}`, t, 8, 70)) })),
  };
}

export interface BankingRails {
  tsaBalanceBn: number;
  channelsOnline: number;
  channelsTotal: number;
  settlementLatencyMin: number;
  reconciledPct: number;
  failedSettlements: number;
}
export function bankingRails(id: string, t: number): BankingRails {
  const total = 9;
  return {
    tsaBalanceBn: Math.round(wave(`br:ts:${id}`, t, 4, 48) * 10) / 10,
    channelsOnline: Math.max(4, total - Math.round(seed(`br:co:${id}:${Math.floor(t / 9)}`) * 3)),
    channelsTotal: total,
    settlementLatencyMin: Math.round(wave(`br:sl:${id}`, t, 2, 40)),
    reconciledPct: Math.round(wave(`br:rc:${id}`, t, 88, 100)),
    failedSettlements: Math.round(seed(`br:fs:${id}:${Math.floor(t / 6)}`) * 14),
  };
}

export interface CitizenFinance {
  portalUptime: number;
  paymentsTodayM: number;
  refundsPending: number;
  satisfactionPct: number;
}
export function citizenFinance(id: string, t: number): CitizenFinance {
  return {
    portalUptime: Math.round(wave(`cf:up:${id}`, t, 96, 100) * 100) / 100,
    paymentsTodayM: Math.round(wave(`cf:pm:${id}`, t, 0.4, 6.5) * 10) / 10,
    refundsPending: Math.round(wave(`cf:rf:${id}`, t, 200, 6400)),
    satisfactionPct: Math.round(wave(`cf:st:${id}`, t, 58, 92)),
  };
}

export interface FiscalAssurance {
  chainIntactPct: number;
  openFindings: number;
  fraudSignals: number;
  regionalRisk: { region: string; risk: number; tone: 'ok' | 'warn' | 'alert' }[];
}
export function fiscalAssurance(id: string, t: number): FiscalAssurance {
  return {
    chainIntactPct: Math.round(wave(`fa:ci:${id}`, t, 98, 100) * 100) / 100,
    openFindings: Math.round(wave(`fa:of:${id}`, t, 2, 40)),
    fraudSignals: Math.round(seed(`fa:fs:${id}:${Math.floor(t / 7)}`) * 12),
    regionalRisk: REGIONS.map((region, i) => {
      const risk = Math.round(wave(`fa:rr:${id}:${i}`, t, 8, 78));
      return { region, risk, tone: risk >= 60 ? 'alert' : risk >= 38 ? 'warn' : 'ok' };
    }),
  };
}

/** 0-100 treasury instability — drives cross-system propagation. */
export function treasuryInstability(id: string, t: number): number {
  const fc = fiscalCommand(id, t);
  const rv = revenueOps(id, t);
  const bg = budgetOps(id, t);
  const pc = procurementOps(id, t);
  const br = bankingRails(id, t);
  const v =
    (100 - fc.macroStability) * 0.4 +
    Math.max(0, (85 - rv.collectionRatePct)) * 0.6 +
    Math.max(0, (80 - bg.executionPct)) * 0.4 +
    Math.max(0, (pc.disbursementLatencyDays - 14) * 1.4) +
    (br.channelsTotal - br.channelsOnline) * 5 +
    pc.flaggedContracts * 1.5;
  return Math.round(Math.max(0, Math.min(100, v)));
}
