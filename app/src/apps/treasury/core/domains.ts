// apps/treasury/core — Treasury domain catalog.
//
// Single source of truth for the Ministry of Finance / Treasury
// operating system. Implements CivicOS Master §9 (Treasury & Payment
// Infrastructure) and §22 (Taxation & Revenue Collection). Pure data.

import type { TreasuryArchetype } from '@/apps/treasury/design-system/treasury-ds';

export type TreasuryGroupKey =
  | 'command'      // fiscal command & posture
  | 'ledger'       // public ledger / TSA / appropriation
  | 'revenue'      // taxation / collection
  | 'expenditure'  // budget execution / disbursement
  | 'procurement'  // contracting / vendors
  | 'rails'        // banking / settlement
  | 'reserves'     // sovereign reserves / debt
  | 'assurance'    // audit / anti-fraud
  | 'portal';      // citizen-facing

export interface TreasuryGroup {
  key: TreasuryGroupKey;
  label: string;
  purpose: string;
}

export const TREASURY_GROUPS: TreasuryGroup[] = [
  { key: 'command',     label: 'Fiscal Command',          purpose: 'Macro stability · posture · single account oversight' },
  { key: 'ledger',      label: 'Public Ledger',           purpose: 'TSA · sub-ledgers · appropriation register · daily reconciliation' },
  { key: 'revenue',     label: 'Revenue Collection',      purpose: 'Tax · customs · e-invoicing · withholding' },
  { key: 'expenditure', label: 'Budget Execution',        purpose: 'Appropriation drawdown · disbursement vouchers · expenditure control' },
  { key: 'procurement', label: 'Procurement & Contracts', purpose: 'Tenders · awards · contract registry · vendor management' },
  { key: 'rails',       label: 'Banking & Payments Rail', purpose: 'GovPay · GovCollect · CBDC · settlement & reconciliation' },
  { key: 'reserves',    label: 'Reserves & Debt',         purpose: 'FX reserves · public debt · sovereign instruments' },
  { key: 'assurance',   label: 'Fiscal Assurance',        purpose: 'Audit trail · anti-fraud · sanctions · compliance' },
  { key: 'portal',      label: 'Citizen Fiscal Portal',   purpose: 'Taxpayer portal · refunds · receipts · CBDC wallet' },
];

export type SurfaceId =
  // command
  | 'fiscal-command'           // ⌘ I — sovereign fiscal posture
  | 'single-account-overview'  // ⌘ II — Treasury Single Account live position
  | 'macro-stability'          // ⌘ III — macro indicators feeding fiscal policy
  | 'fiscal-forecasting'       // ⌘ IV — 25-year fiscal trajectory
  // ledger
  | 'appropriation-ledger'     // ⎯ I — budget vs spend by ministry
  | 'sub-ledger-reconciliation'// ⎯ II — three-way reconciliation
  | 'daily-statement'          // ⎯ III — daily fiscal statement
  | 'expenditure-control'      // ⎯ IV — encumbrance & release control
  // revenue
  | 'tax-revenue'              // ▤ I — tax collection live
  | 'customs-revenue'          // ▤ II — customs duty collection
  | 'taxpayer-registry'        // ▤ III — taxpayer registration
  | 'e-invoicing'              // ▤ IV — e-invoicing real-time validation
  | 'risk-based-audit'         // ▤ V — AI-driven audit selection
  // expenditure
  | 'disbursement-vouchers'    // ⊡ I — disbursement voucher register
  | 'funding-chains'           // ⊡ II — request → approval → disbursement workflow
  | 'budget-propagation'       // ⊡ III — envelope → encumbrance → spend
  | 'inter-ministry-fiscal'    // ⊡ IV — cross-ministry allocation
  // procurement
  | 'procurement-boards'       // ⊟ I — open tenders
  | 'contract-registry'        // ⊟ II — awarded contracts
  | 'vendor-registry'          // ⊟ III — supplier registration
  | 'milestone-escrow'         // ⊟ IV — milestone disbursement escrow
  // rails
  | 'payments-rail'            // ◴ I — GovPay throughput
  | 'cbdc-operations'          // ◴ II — CBDC issuance & circulation
  | 'reserve-workflows'        // ◴ III — FX / gold drawdown
  | 'settlement-reconciliation'// ◴ IV — bank settlement reconciliation
  // reserves
  | 'sovereign-reserves'       // ◴ V — FX reserves position
  | 'public-debt'              // ⊟ V — sovereign debt portfolio
  // assurance
  | 'fiscal-audit'             // ✓ I — audit trail with hash-chain
  | 'anti-fraud'               // ✓ II — anti-fraud intelligence
  // portal
  | 'taxpayer-portal'          // ◇ I — citizen tax filing
  | 'public-budget-dashboard'; // ◇ II — public budget execution view

export interface TreasuryDomain {
  surface: SurfaceId;
  group: TreasuryGroupKey;
  ref: string;                  // e.g. "TR-I-A", "VR-2026-014"
  label: string;
  purpose: string;
  archetype: TreasuryArchetype;
  blueprintSection: string;     // e.g. "9.1", "22.1"
}

export const TREASURY_DOMAINS: TreasuryDomain[] = [
  // command
  { surface: 'fiscal-command', group: 'command', ref: 'TR-CMD-01', label: 'Fiscal Command', purpose: 'Sovereign fiscal posture & directives', archetype: 'command', blueprintSection: '9' },
  { surface: 'single-account-overview', group: 'command', ref: 'TR-CMD-02', label: 'Treasury Single Account', purpose: 'TSA position & sub-ledgers', archetype: 'command', blueprintSection: '9.1' },
  { surface: 'macro-stability', group: 'command', ref: 'TR-CMD-03', label: 'Macro Stability Monitor', purpose: 'Macro indicators feeding fiscal policy', archetype: 'gauge', blueprintSection: '9' },
  { surface: 'fiscal-forecasting', group: 'command', ref: 'TR-CMD-04', label: 'Fiscal Forecasting', purpose: '25-year fiscal trajectory', archetype: 'gauge', blueprintSection: '9' },
  // ledger
  { surface: 'appropriation-ledger', group: 'ledger', ref: 'LD-APP-01', label: 'Appropriation Ledger', purpose: 'Budget vs spend by ministry', archetype: 'ledger', blueprintSection: '9.5' },
  { surface: 'sub-ledger-reconciliation', group: 'ledger', ref: 'LD-REC-02', label: 'Sub-Ledger Reconciliation', purpose: 'Three-way TSA ↔ rail ↔ ministry', archetype: 'audit', blueprintSection: '9.5' },
  { surface: 'daily-statement', group: 'ledger', ref: 'LD-DST-03', label: 'Daily Fiscal Statement', purpose: 'End-of-day fiscal position', archetype: 'statement', blueprintSection: '9.5' },
  { surface: 'expenditure-control', group: 'ledger', ref: 'LD-EXC-04', label: 'Expenditure Control', purpose: 'Encumbrance & release control', archetype: 'ledger', blueprintSection: '9.5' },
  // revenue
  { surface: 'tax-revenue', group: 'revenue', ref: 'RV-TAX-01', label: 'Tax Revenue Collection', purpose: 'Live tax collection by stream', archetype: 'statement', blueprintSection: '22.1' },
  { surface: 'customs-revenue', group: 'revenue', ref: 'RV-CUS-02', label: 'Customs Revenue', purpose: 'Customs duty collection', archetype: 'statement', blueprintSection: '22.1' },
  { surface: 'taxpayer-registry', group: 'revenue', ref: 'RV-REG-03', label: 'Taxpayer Registry', purpose: 'Citizen + entity tax registry', archetype: 'register', blueprintSection: '22.1' },
  { surface: 'e-invoicing', group: 'revenue', ref: 'RV-EIN-04', label: 'e-Invoicing', purpose: 'Real-time invoice validation', archetype: 'register', blueprintSection: '22.1' },
  { surface: 'risk-based-audit', group: 'revenue', ref: 'RV-AUD-05', label: 'Risk-Based Audit', purpose: 'AI-driven audit selection with transparent criteria', archetype: 'audit', blueprintSection: '22.1' },
  // expenditure
  { surface: 'disbursement-vouchers', group: 'expenditure', ref: 'EX-DSB-01', label: 'Disbursement Vouchers', purpose: 'Live disbursement voucher register', archetype: 'voucher', blueprintSection: '9.2' },
  { surface: 'funding-chains', group: 'expenditure', ref: 'EX-FCH-02', label: 'Executable Funding Chains', purpose: 'Request → review → approval → release', archetype: 'voucher', blueprintSection: '9.2' },
  { surface: 'budget-propagation', group: 'expenditure', ref: 'EX-BPR-03', label: 'Budget Propagation', purpose: 'Envelope → department → encumbrance → spend', archetype: 'ledger', blueprintSection: '9.5' },
  { surface: 'inter-ministry-fiscal', group: 'expenditure', ref: 'EX-IMF-04', label: 'Inter-Ministry Allocation', purpose: 'Cross-ministry fiscal flows', archetype: 'ledger', blueprintSection: '9.5' },
  // procurement
  { surface: 'procurement-boards', group: 'procurement', ref: 'PR-BRD-01', label: 'Procurement Boards', purpose: 'Open tenders & evaluation', archetype: 'register', blueprintSection: '11' },
  { surface: 'contract-registry', group: 'procurement', ref: 'PR-CTR-02', label: 'Contract Registry', purpose: 'Awarded contracts', archetype: 'register', blueprintSection: '11' },
  { surface: 'vendor-registry', group: 'procurement', ref: 'PR-VND-03', label: 'Vendor Registry', purpose: 'Supplier registration & status', archetype: 'register', blueprintSection: '11' },
  { surface: 'milestone-escrow', group: 'procurement', ref: 'PR-ESC-04', label: 'Milestone Escrow', purpose: 'Procurement milestone disbursement escrow', archetype: 'voucher', blueprintSection: '9.2' },
  // rails
  { surface: 'payments-rail', group: 'rails', ref: 'RA-PAY-01', label: 'GovPay Rail', purpose: 'Instant credit transfer & batch disbursement throughput', archetype: 'gauge', blueprintSection: '9.2' },
  { surface: 'cbdc-operations', group: 'rails', ref: 'RA-CBD-02', label: 'CBDC Operations', purpose: 'Retail & wholesale CBDC issuance', archetype: 'gauge', blueprintSection: '9.3' },
  { surface: 'reserve-workflows', group: 'reserves', ref: 'RS-WKF-01', label: 'Reserve Workflows', purpose: 'FX / gold drawdown with multi-authority release', archetype: 'voucher', blueprintSection: '9' },
  { surface: 'settlement-reconciliation', group: 'rails', ref: 'RA-SET-03', label: 'Settlement Reconciliation', purpose: 'Bank settlement reconciliation', archetype: 'audit', blueprintSection: '9.5' },
  // reserves
  { surface: 'sovereign-reserves', group: 'reserves', ref: 'RS-FXR-02', label: 'Sovereign Reserves', purpose: 'FX reserves position', archetype: 'statement', blueprintSection: '9' },
  { surface: 'public-debt', group: 'reserves', ref: 'RS-DBT-03', label: 'Public Debt Portfolio', purpose: 'Sovereign debt instruments & maturity', archetype: 'statement', blueprintSection: '9' },
  // assurance
  { surface: 'fiscal-audit', group: 'assurance', ref: 'AS-AUD-01', label: 'Fiscal Audit Trail', purpose: 'Hash-chained audit trail', archetype: 'audit', blueprintSection: '9.5' },
  { surface: 'anti-fraud', group: 'assurance', ref: 'AS-FRD-02', label: 'Anti-Fraud Intelligence', purpose: 'AI-driven fraud detection with explainability', archetype: 'audit', blueprintSection: '44' },
  // portal
  { surface: 'taxpayer-portal', group: 'portal', ref: 'PT-TXP-01', label: 'Taxpayer Portal', purpose: 'Citizen tax filing & refunds', archetype: 'portal', blueprintSection: '22.2' },
  { surface: 'public-budget-dashboard', group: 'portal', ref: 'PT-PUB-02', label: 'Public Budget Dashboard', purpose: 'Public budget execution view', archetype: 'portal', blueprintSection: '9.5' },
];

export function domainBySurface(surface: SurfaceId): TreasuryDomain | undefined {
  return TREASURY_DOMAINS.find(d => d.surface === surface);
}
