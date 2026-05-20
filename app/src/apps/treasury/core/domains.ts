// apps/treasury/core — Treasury domain catalog.
//
// Single source of truth for the Ministry of Finance / Treasury
// operating system. Implements CivicOS Master §9 (Treasury & Payment
// Infrastructure) and §22 (Taxation & Revenue Collection). Pure data.

import type { TreasuryArchetype } from '@/apps/treasury/design-system/treasury-ds';

// Reorganised into the six sovereign-finance pillars. Each pillar owns
// its own submenu in the operational shell and the public site. The
// citizen portal sits below the pillars as a separate top-level menu.
export type TreasuryGroupKey =
  | 'treasury-command'   // Pillar I  — National Treasury Command
  | 'central-bank'       // Pillar II — Central Bank Operations
  | 'tax-revenue'        // Pillar III — Tax & Revenue Intelligence
  | 'procurement-grid'   // Pillar IV — National Procurement Grid
  | 'expenditure-control'// Pillar V  — Public Expenditure Control
  | 'economic-intel'     // Pillar VI — Economic Intelligence Center
  | 'portal';            // Citizen Fiscal Portal (separate)

export interface TreasuryGroup {
  key: TreasuryGroupKey;
  label: string;
  purpose: string;
  pillar?: 'I' | 'II' | 'III' | 'IV' | 'V' | 'VI';
}

export const TREASURY_GROUPS: TreasuryGroup[] = [
  { key: 'treasury-command',    pillar: 'I',   label: 'National Treasury Command',     purpose: 'Sovereign fiscal posture · TSA · daily statement · macro coordination' },
  { key: 'central-bank',        pillar: 'II',  label: 'Central Bank Operations',       purpose: 'GovPay · CBDC · settlement · FX reserves · public-debt instruments' },
  { key: 'tax-revenue',         pillar: 'III', label: 'Tax & Revenue Intelligence',    purpose: 'Tax · customs · taxpayer registry · e-invoicing · risk-based audit' },
  { key: 'procurement-grid',    pillar: 'IV',  label: 'National Procurement Grid',     purpose: 'Tenders · contracts · vendor registry · milestone escrow' },
  { key: 'expenditure-control', pillar: 'V',   label: 'Public Expenditure Control',    purpose: 'Appropriation ledger · disbursement vouchers · expenditure control · funding chains' },
  { key: 'economic-intel',      pillar: 'VI',  label: 'Economic Intelligence Center',  purpose: 'Macro stability · 25y fiscal forecast · audit trail · anti-fraud intelligence' },
  { key: 'portal',              label: 'Citizen Fiscal Portal',         purpose: 'Taxpayer portal · refunds · receipts · public-budget dashboard' },
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
  // ── Pillar I  — National Treasury Command ───────────────────────────
  { surface: 'fiscal-command',          group: 'treasury-command',    ref: 'TC-CMD-01', label: 'Fiscal Command',              purpose: 'Sovereign fiscal posture & directives',           archetype: 'command',   blueprintSection: '9' },
  { surface: 'single-account-overview', group: 'treasury-command',    ref: 'TC-TSA-02', label: 'Treasury Single Account',     purpose: 'TSA position & sub-ledgers',                       archetype: 'command',   blueprintSection: '9.1' },
  { surface: 'daily-statement',         group: 'treasury-command',    ref: 'TC-DST-03', label: 'Daily Fiscal Statement',      purpose: 'End-of-day fiscal position',                       archetype: 'statement', blueprintSection: '9.5' },
  // ── Pillar II — Central Bank Operations ─────────────────────────────
  { surface: 'payments-rail',           group: 'central-bank',        ref: 'CB-PAY-01', label: 'GovPay Rail',                 purpose: 'Instant credit transfer & batch disbursement',     archetype: 'gauge',     blueprintSection: '9.2' },
  { surface: 'cbdc-operations',         group: 'central-bank',        ref: 'CB-CBD-02', label: 'CBDC Operations',             purpose: 'Retail & wholesale CBDC issuance',                 archetype: 'gauge',     blueprintSection: '9.3' },
  { surface: 'settlement-reconciliation', group: 'central-bank',      ref: 'CB-SET-03', label: 'Settlement Reconciliation',   purpose: 'Bank settlement reconciliation',                   archetype: 'audit',     blueprintSection: '9.5' },
  { surface: 'sovereign-reserves',      group: 'central-bank',        ref: 'CB-FXR-04', label: 'Sovereign Reserves',          purpose: 'FX & gold reserves position',                       archetype: 'statement', blueprintSection: '9' },
  { surface: 'public-debt',             group: 'central-bank',        ref: 'CB-DBT-05', label: 'Public Debt Portfolio',       purpose: 'Sovereign debt instruments & maturity',            archetype: 'statement', blueprintSection: '9' },
  { surface: 'reserve-workflows',       group: 'central-bank',        ref: 'CB-WKF-06', label: 'Reserve Workflows',           purpose: 'FX / gold drawdown with multi-authority release',  archetype: 'voucher',   blueprintSection: '9' },
  // ── Pillar III — Tax & Revenue Intelligence ─────────────────────────
  { surface: 'tax-revenue',             group: 'tax-revenue',         ref: 'TR-TAX-01', label: 'Tax Revenue Collection',      purpose: 'Live tax collection by stream',                    archetype: 'statement', blueprintSection: '22.1' },
  { surface: 'customs-revenue',         group: 'tax-revenue',         ref: 'TR-CUS-02', label: 'Customs Revenue',             purpose: 'Customs duty collection',                          archetype: 'statement', blueprintSection: '22.1' },
  { surface: 'taxpayer-registry',       group: 'tax-revenue',         ref: 'TR-REG-03', label: 'Taxpayer Registry',           purpose: 'Citizen + entity tax registry',                    archetype: 'register',  blueprintSection: '22.1' },
  { surface: 'e-invoicing',             group: 'tax-revenue',         ref: 'TR-EIN-04', label: 'e-Invoicing',                 purpose: 'Real-time invoice validation',                     archetype: 'register',  blueprintSection: '22.1' },
  { surface: 'risk-based-audit',        group: 'tax-revenue',         ref: 'TR-AUD-05', label: 'Risk-Based Audit',            purpose: 'AI-driven audit selection with transparent criteria', archetype: 'audit',  blueprintSection: '22.1' },
  // ── Pillar IV — National Procurement Grid ──────────────────────────
  { surface: 'procurement-boards',      group: 'procurement-grid',    ref: 'PG-BRD-01', label: 'Procurement Boards',          purpose: 'Open tenders & evaluation',                        archetype: 'register',  blueprintSection: '11' },
  { surface: 'contract-registry',       group: 'procurement-grid',    ref: 'PG-CTR-02', label: 'Contract Registry',           purpose: 'Awarded contracts',                                 archetype: 'register',  blueprintSection: '11' },
  { surface: 'vendor-registry',         group: 'procurement-grid',    ref: 'PG-VND-03', label: 'Vendor Registry',             purpose: 'Supplier registration & status',                   archetype: 'register',  blueprintSection: '11' },
  { surface: 'milestone-escrow',        group: 'procurement-grid',    ref: 'PG-ESC-04', label: 'Milestone Escrow',            purpose: 'Procurement milestone disbursement escrow',        archetype: 'voucher',   blueprintSection: '9.2' },
  // ── Pillar V  — Public Expenditure Control ─────────────────────────
  { surface: 'appropriation-ledger',    group: 'expenditure-control', ref: 'EC-APP-01', label: 'Appropriation Ledger',        purpose: 'Budget vs spend by ministry',                       archetype: 'ledger',    blueprintSection: '9.5' },
  { surface: 'sub-ledger-reconciliation', group: 'expenditure-control', ref: 'EC-REC-02', label: 'Sub-Ledger Reconciliation', purpose: 'Three-way TSA ↔ rail ↔ ministry',                 archetype: 'audit',     blueprintSection: '9.5' },
  { surface: 'expenditure-control',     group: 'expenditure-control', ref: 'EC-EXC-03', label: 'Expenditure Control',         purpose: 'Encumbrance & release control',                    archetype: 'ledger',    blueprintSection: '9.5' },
  { surface: 'disbursement-vouchers',   group: 'expenditure-control', ref: 'EC-DSB-04', label: 'Disbursement Vouchers',       purpose: 'Live disbursement voucher register',               archetype: 'voucher',   blueprintSection: '9.2' },
  { surface: 'funding-chains',          group: 'expenditure-control', ref: 'EC-FCH-05', label: 'Executable Funding Chains',   purpose: 'Request → review → approval → release',           archetype: 'voucher',   blueprintSection: '9.2' },
  { surface: 'budget-propagation',      group: 'expenditure-control', ref: 'EC-BPR-06', label: 'Budget Propagation',          purpose: 'Envelope → department → encumbrance → spend',     archetype: 'ledger',    blueprintSection: '9.5' },
  { surface: 'inter-ministry-fiscal',   group: 'expenditure-control', ref: 'EC-IMF-07', label: 'Inter-Ministry Allocation',   purpose: 'Cross-ministry fiscal flows',                       archetype: 'ledger',    blueprintSection: '9.5' },
  // ── Pillar VI — Economic Intelligence Center ───────────────────────
  { surface: 'macro-stability',         group: 'economic-intel',      ref: 'EI-MAC-01', label: 'Macro Stability Monitor',     purpose: 'Macro indicators feeding fiscal policy',           archetype: 'gauge',     blueprintSection: '9' },
  { surface: 'fiscal-forecasting',      group: 'economic-intel',      ref: 'EI-FOR-02', label: 'Fiscal Forecasting',          purpose: '25-year fiscal trajectory',                         archetype: 'gauge',     blueprintSection: '9' },
  { surface: 'fiscal-audit',            group: 'economic-intel',      ref: 'EI-AUD-03', label: 'Fiscal Audit Trail',          purpose: 'Hash-chained audit trail',                          archetype: 'audit',     blueprintSection: '9.5' },
  { surface: 'anti-fraud',              group: 'economic-intel',      ref: 'EI-FRD-04', label: 'Anti-Fraud Intelligence',     purpose: 'AI-driven fraud detection with explainability',    archetype: 'audit',     blueprintSection: '44' },
  // ── Citizen Fiscal Portal ──────────────────────────────────────────
  { surface: 'taxpayer-portal',         group: 'portal',              ref: 'CP-TXP-01', label: 'Taxpayer Portal',             purpose: 'Citizen tax filing & refunds',                     archetype: 'portal',    blueprintSection: '22.2' },
  { surface: 'public-budget-dashboard', group: 'portal',              ref: 'CP-PUB-02', label: 'Public Budget Dashboard',     purpose: 'Public budget execution view',                     archetype: 'portal',    blueprintSection: '9.5' },
];

// Helper — domains grouped by pillar in display order. Useful for the
// operational shell sub-menu and the public-site pillar overview.
export function treasuryByPillar(): { group: TreasuryGroup; domains: TreasuryDomain[] }[] {
  return TREASURY_GROUPS.map(g => ({ group: g, domains: TREASURY_DOMAINS.filter(d => d.group === g.key) }));
}

export function domainBySurface(surface: SurfaceId): TreasuryDomain | undefined {
  return TREASURY_DOMAINS.find(d => d.surface === surface);
}
