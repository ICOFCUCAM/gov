'use client';

import * as React from 'react';
import { procurementOps } from '@/lib/gov/treasury-systems';
import { LedgerFrame, KpiStrip, BrassRule, VoucherStamp, TREASURY_DS } from '@/apps/treasury/design-system/treasury-ds';
import { seed, wave } from '@/lib/telemetry';

const SECTORS = ['Infrastructure', 'Defence', 'Health supplies', 'Education materials', 'Energy', 'IT & comms', 'Agriculture inputs', 'Services'];

export function ProcurementBoards({ id, now }: { id: string; now: number }) {
  const ts = now / 4000;
  const p = procurementOps(id, ts);
  const fy = String(new Date(now).getFullYear());
  return (
    <LedgerFrame archetype="register" ref="PR-BRD-01" title="Procurement Boards" subtitle="open tenders" fiscalYear={fy}>
      <KpiStrip items={[
        { label: 'Open tenders', value: p.activeTenders, tone: TREASURY_DS.brass },
        { label: 'Average award (Bn)', value: Math.round(wave(`pr:av:${id}`, ts, 0.4, 8) * 10) / 10, tone: TREASURY_DS.brass },
        { label: 'Bidders this Q', value: Math.round(wave(`pr:bd:${id}`, ts, 480, 14800)).toLocaleString(), tone: TREASURY_DS.brassDim },
        { label: 'Single-bid (red flag)', value: Math.floor(seed(`pr:sb:${id}`) * 18), tone: TREASURY_DS.deficit },
      ]} />
      <BrassRule label="tenders by sector" />
      <ul className="space-y-1">
        {SECTORS.map(s => {
          const count = Math.floor(wave(`pr:s:${s}:${id}`, ts, 2, 32));
          return (
            <li key={s} className="grid grid-cols-[1fr_140px_60px] items-center gap-3 border-b py-1.5 text-[11px]" style={{ borderColor: TREASURY_DS.ruleSoft }}>
              <span style={{ color: TREASURY_DS.parchment }}>{s}</span>
              <div className="h-1.5" style={{ background: TREASURY_DS.vaultDeep }}>
                <div className="h-full" style={{ width: `${count * 3}%`, background: TREASURY_DS.brass }} />
              </div>
              <span className="text-right tabular-nums" style={{ color: TREASURY_DS.brass }}>{count}</span>
            </li>
          );
        })}
      </ul>
    </LedgerFrame>
  );
}

export function ContractRegistry({ id, now }: { id: string; now: number }) {
  const ts = now / 4000;
  const p = procurementOps(id, ts);
  const fy = String(new Date(now).getFullYear());
  return (
    <LedgerFrame archetype="register" ref="PR-CTR-02" title="Contract Registry" subtitle="awarded contracts" fiscalYear={fy}>
      <KpiStrip items={[
        { label: 'Active contracts', value: p.contractsAwarded.toLocaleString(), tone: TREASURY_DS.brass },
        { label: 'Total value (Bn)', value: Math.round(wave(`ct:tot:${id}`, ts, 80, 1240) * 10) / 10, tone: TREASURY_DS.brass },
        { label: 'Awards this Q', value: Math.round(wave(`ct:aw:${id}`, ts, 80, 1200)).toLocaleString(), tone: TREASURY_DS.brassDim },
        { label: 'Compliance idx', value: Math.round(wave(`ct:cm:${id}`, ts, 58, 92)), tone: TREASURY_DS.brass },
      ]} />
      <BrassRule label="recent awards (sample)" />
      <ul className="space-y-1">
        {SECTORS.slice(0, 6).map((s, i) => {
          const amt = Math.round(wave(`ct:${s}:${id}`, ts, 0.4, 18) * 10) / 10;
          const vendor = `Vendor ${(i + 1) * 17}`;
          return (
            <li key={s} className="grid grid-cols-[120px_1fr_120px_100px_100px] items-baseline gap-3 border-b py-1.5 text-[11px]" style={{ borderColor: TREASURY_DS.ruleSoft }}>
              <span className="tabular-nums text-[10px]" style={{ color: TREASURY_DS.brass }}>CTR-{fy}-{String(i + 1).padStart(4, '0')}</span>
              <span style={{ color: TREASURY_DS.parchment }}>{s}</span>
              <span style={{ color: TREASURY_DS.ink }}>{vendor}</span>
              <span className="text-right tabular-nums" style={{ color: TREASURY_DS.brass }}>{amt.toFixed(2)} Bn</span>
              <span className="text-right text-[9.5px] uppercase tracking-[0.18em]" style={{ color: TREASURY_DS.surplus }}>· active</span>
            </li>
          );
        })}
      </ul>
    </LedgerFrame>
  );
}

export function VendorRegistry({ id, now }: { id: string; now: number }) {
  const ts = now / 4000;
  return (
    <LedgerFrame archetype="register" ref="PR-VND-03" title="Vendor Registry" subtitle="supplier registration & status">
      <KpiStrip items={[
        { label: 'Registered vendors', value: Math.round(wave(`vn:r:${id}`, ts, 4800, 124000)).toLocaleString(), tone: TREASURY_DS.brass },
        { label: 'New this Q', value: Math.round(wave(`vn:n:${id}`, ts, 240, 4800)).toLocaleString(), tone: TREASURY_DS.surplus },
        { label: 'Debarred', value: Math.floor(seed(`vn:d:${id}`) * 240), tone: TREASURY_DS.deficit },
        { label: 'Mean rating', value: `${Math.round(wave(`vn:rt:${id}`, ts, 60, 92))}/100`, tone: TREASURY_DS.brass },
      ]} />
      <BrassRule label="vendor doctrine" />
      <p className="text-[10.5px] italic" style={{ color: TREASURY_DS.mut, fontFamily: 'ui-serif, Georgia, serif' }}>
        Vendor registration is a precondition for any public contract. Vendors are rated by past performance and
        subjected to sanctions screening at every award.
      </p>
    </LedgerFrame>
  );
}

export function MilestoneEscrow({ id, now }: { id: string; now: number }) {
  const ts = now / 4000;
  const fy = String(new Date(now).getFullYear());
  const escrows = Array.from({ length: 4 }).map((_, i) => ({
    id: `ESC-${fy}-${String(i + 1).padStart(3, '0')}`,
    project: ['Northern Highway Phase II', 'Capital Hospital Expansion', 'Rural Electrification Lot 3', 'Coastal Port Upgrade'][i]!,
    vendor: ['Highway Construction SOE', 'Capital Hospital Trust', 'Northern Power Co.', 'Coastal Marine Eng.'][i]!,
    amount: Math.round(wave(`esc:${i}`, ts, 0.4, 24) * 10) / 10,
    milestone: ['M2/M4', 'M1/M3', 'M3/M5', 'M2/M3'][i]!,
  }));
  return (
    <LedgerFrame archetype="voucher" ref="PR-ESC-04" title="Milestone Escrow" subtitle="procurement milestone disbursement escrow" fiscalYear={fy}>
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        {escrows.map(e => (
          <VoucherStamp key={e.id}
            ref={e.id}
            party="Treasury Escrow"
            counterparty={e.vendor}
            amount={`${e.amount.toFixed(2)} Bn`}
            fiscalYear={fy}
            authority={`Accounting Officer · ${e.project}`}
            status={`milestone ${e.milestone}`}
            statusColor={TREASURY_DS.brass} />
        ))}
      </div>
    </LedgerFrame>
  );
}
