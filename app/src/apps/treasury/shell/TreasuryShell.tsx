'use client';

// apps/treasury/shell — the sovereign Treasury layout engine.
// Replaces the generic SectorInstitutionApp dispatch for the FINANCE
// archetype. Dispatches all 30 Treasury domains through the Treasury
// design system.

import * as React from 'react';
import { RuntimeQueue } from '@/components/features/RuntimeQueue';
import { TREASURY_DS, SealFooter } from '@/apps/treasury/design-system/treasury-ds';
import { domainBySurface, type SurfaceId } from '@/apps/treasury/core/domains';
import { FederationStrip } from '@/apps/treasury/federation/federation';
import { DISBURSEMENT_AUTHORISATION } from '@/apps/treasury/workflows/treasury-workflows';

// Existing surfaces
import { TreasuryOverview } from '@/apps/treasury/TreasuryOverview';
import { FundingChains } from '@/apps/treasury/FundingChains';
import { ReserveWorkflows } from '@/apps/treasury/ReserveWorkflows';
import { BudgetPropagation } from '@/apps/treasury/BudgetPropagation';
import { InterMinistryFiscal } from '@/apps/treasury/InterMinistryFiscal';

// New command surfaces
import {
  FiscalCommandSurface, SingleAccountOverview, MacroStability, FiscalForecasting,
} from '@/apps/treasury/domains/CommandDomains';
import {
  AppropriationLedger, SubLedgerReconciliation, DailyStatement, ExpenditureControl,
} from '@/apps/treasury/domains/LedgerDomains';
import {
  TaxRevenue, CustomsRevenue, TaxpayerRegistry, EInvoicing, RiskBasedAudit,
} from '@/apps/treasury/domains/RevenueDomains';
import { DisbursementVouchers } from '@/apps/treasury/domains/ExpenditureDomains';
import {
  ProcurementBoards, ContractRegistry, VendorRegistry, MilestoneEscrow,
} from '@/apps/treasury/domains/ProcurementDomains';
import {
  PaymentsRail, CBDCOperations, SettlementReconciliation, SovereignReserves, PublicDebt,
  FiscalAudit, AntiFraud, TaxpayerPortal, PublicBudgetDashboard,
} from '@/apps/treasury/domains/RailsAndReserves';

import type { SovereignRole, Capability } from '@/shared/permissions/rbac';

const RENDER: Record<SurfaceId, (p: { id: string; now: number }) => React.ReactElement> = {
  // command
  'fiscal-command': p => <FiscalCommandSurface {...p} />,
  'single-account-overview': p => <SingleAccountOverview {...p} />,
  'macro-stability': p => <MacroStability {...p} />,
  'fiscal-forecasting': p => <FiscalForecasting {...p} />,
  // ledger
  'appropriation-ledger': p => <AppropriationLedger {...p} />,
  'sub-ledger-reconciliation': p => <SubLedgerReconciliation {...p} />,
  'daily-statement': p => <DailyStatement {...p} />,
  'expenditure-control': p => <ExpenditureControl {...p} />,
  // revenue
  'tax-revenue': p => <TaxRevenue {...p} />,
  'customs-revenue': p => <CustomsRevenue {...p} />,
  'taxpayer-registry': p => <TaxpayerRegistry {...p} />,
  'e-invoicing': p => <EInvoicing {...p} />,
  'risk-based-audit': p => <RiskBasedAudit {...p} />,
  // expenditure
  'disbursement-vouchers': p => <DisbursementVouchers {...p} />,
  'funding-chains': p => <FundingChains {...p} />,
  'budget-propagation': p => <BudgetPropagation {...p} />,
  'inter-ministry-fiscal': p => <InterMinistryFiscal {...p} />,
  // procurement
  'procurement-boards': p => <ProcurementBoards {...p} />,
  'contract-registry': p => <ContractRegistry {...p} />,
  'vendor-registry': p => <VendorRegistry {...p} />,
  'milestone-escrow': p => <MilestoneEscrow {...p} />,
  // rails & reserves
  'payments-rail': p => <PaymentsRail {...p} />,
  'cbdc-operations': p => <CBDCOperations {...p} />,
  'reserve-workflows': p => <ReserveWorkflows {...p} />,
  'settlement-reconciliation': p => <SettlementReconciliation {...p} />,
  'sovereign-reserves': p => <SovereignReserves {...p} />,
  'public-debt': p => <PublicDebt {...p} />,
  // assurance
  'fiscal-audit': p => <FiscalAudit {...p} />,
  'anti-fraud': p => <AntiFraud {...p} />,
  // portal
  'taxpayer-portal': p => <TaxpayerPortal {...p} />,
  'public-budget-dashboard': p => <PublicBudgetDashboard {...p} />,
};

export function TreasuryShell({ id, surface, now, role, withheld = [] }: {
  id: string; surface: SurfaceId; now: number; role: SovereignRole; withheld?: Capability[];
}) {
  const domain = domainBySurface(surface);
  const render = RENDER[surface];
  return (
    <div className="space-y-2 p-2" style={{ background: TREASURY_DS.inkBlack, boxShadow: 'inset 0 0 90px rgba(0,0,0,0.6)' }}>
      {render ? render({ id, now }) : <TreasuryOverview id={id} now={now} />}
      <FederationStrip />
      <RuntimeQueue
        scope={`treasury:${surface}`}
        kind={domain?.archetype === 'voucher' ? 'procurement' : domain?.archetype === 'register' ? 'permit' : 'case'}
        title={`${domain?.label ?? 'Treasury'} runtime — ${DISBURSEMENT_AUTHORISATION.title}`}
        by="Accounting Officer"
        role={role}
        withheld={withheld} />
      <SealFooter maxim="Sub gratia regis · under the seal of the state" />
    </div>
  );
}
