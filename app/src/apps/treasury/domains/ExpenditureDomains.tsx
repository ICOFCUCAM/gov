'use client';

// Treasury expenditure surfaces — disbursement vouchers.

import * as React from 'react';
import { fundingChains } from '@/lib/gov/fiscal-execution';
import { LedgerFrame, VoucherStamp, KpiStrip, BrassRule, TREASURY_DS } from '@/apps/treasury/design-system/treasury-ds';
import { seed, wave } from '@/lib/telemetry';

export function DisbursementVouchers({ id, now }: { id: string; now: number }) {
  const ts = now / 4000;
  const chains = fundingChains(now, 8);
  const released = chains.filter(c => c.stage === 'disbursement' || c.stage === 'release');
  const fy = String(new Date(now).getFullYear());
  void id; void ts;
  return (
    <LedgerFrame archetype="voucher" ref="EX-DSB-01" title="Disbursement Vouchers" subtitle="live voucher register" fiscalYear={fy}>
      <KpiStrip items={[
        { label: 'Vouchers in flight', value: chains.length, tone: TREASURY_DS.brass },
        { label: 'Released', value: released.length, tone: TREASURY_DS.surplus },
        { label: 'Total value (Bn)', value: (chains.reduce((s, c) => s + c.amountM, 0) / 1000).toFixed(1), tone: TREASURY_DS.brass },
        { label: 'Pending approval', value: chains.filter(c => c.stage === 'review' || c.stage === 'approval').length, tone: TREASURY_DS.brassDim },
      ]} />
      <BrassRule label="voucher register" />
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
        {chains.map(c => (
          <VoucherStamp key={c.id}
            ref={`VR-${fy}-${c.id.replace(/[^0-9]/g, '').slice(-4) || '0000'}`}
            party="Treasury"
            counterparty={c.ministry}
            amount={`${(c.amountM / 1000).toFixed(2)} Bn`}
            fiscalYear={fy}
            authority={c.approverChain[c.approverChain.length - 1] ?? 'Treasurer'}
            status={c.stage}
            statusColor={c.stage === 'disbursement' ? TREASURY_DS.surplus : c.stage === 'release' ? TREASURY_DS.brass : TREASURY_DS.brassDim} />
        ))}
      </div>
      {void seed}{void wave}
    </LedgerFrame>
  );
}
