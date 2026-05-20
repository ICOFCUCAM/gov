'use client';

import * as React from 'react';
import { justiceRecordsForensicsBoard } from '@/lib/gov/justice-records-forensics';
import { DocketFrame, RegisterRow, ChamberRule, JUSTICE_DS } from '@/apps/ministry-justice/design-system/justice-ds';

// ✠ II — Evidence Vault. Surfaces the criminal-records vault and the
// chain-of-custody transactions currently in flight or flagged.

export function EvidenceVault({ id, now }: { id: string; now: number }) {
  void id;
  const b = justiceRecordsForensicsBoard(now);
  const criminalVault = b.records.archives.find(a => a.category === 'criminal');
  const txs = b.records.custodyTransactions;
  const inFlight = txs.filter(t => t.status === 'in-transit');
  const flagged = txs.filter(t => t.status === 'flagged');
  const held = txs.filter(t => t.status === 'held');
  return (
    <DocketFrame archetype="fascicle" numeral="✠ II" title="Evidence Vault" subtitle="cryptographic chain-of-custody integrity">
      {criminalVault ? (
        <div className="grid grid-cols-2 gap-px md:grid-cols-4" style={{ background: JUSTICE_DS.rule }}>
          {[
            { l: 'Records (M)', v: criminalVault.recordsM, t: JUSTICE_DS.ivory },
            { l: 'Digitised', v: `${criminalVault.digitisedPct}%`, t: criminalVault.digitisedPct >= 80 ? JUSTICE_DS.navy : JUSTICE_DS.bronze },
            { l: 'Integrity', v: criminalVault.integrityIdx, t: criminalVault.integrityIdx >= 85 ? JUSTICE_DS.navy : JUSTICE_DS.burgundy },
            { l: 'Status', v: criminalVault.status, t: criminalVault.status === 'live' ? JUSTICE_DS.navy : JUSTICE_DS.bronze },
          ].map(x => (
            <div key={x.l} className="px-4 py-3" style={{ background: JUSTICE_DS.charcoal }}>
              <div className="text-[9px] uppercase tracking-[0.28em]" style={{ color: JUSTICE_DS.mut }}>{x.l}</div>
              <div className="mt-1 tabular-nums text-[16px]" style={{ color: x.t }}>{x.v}</div>
            </div>
          ))}
        </div>
      ) : null}
      <ChamberRule label="custody flow" />
      <div className="grid grid-cols-3 gap-3 text-center">
        <div className="border px-4 py-3" style={{ background: JUSTICE_DS.charcoalDeep, borderColor: JUSTICE_DS.ruleSoft, borderLeft: `3px solid ${JUSTICE_DS.bronze}` }}>
          <div className="text-[9px] uppercase italic tracking-[0.24em]" style={{ color: JUSTICE_DS.bronze }}>in-transit</div>
          <div className="mt-1 tabular-nums text-[20px]" style={{ color: JUSTICE_DS.ivory }}>{inFlight.length}</div>
        </div>
        <div className="border px-4 py-3" style={{ background: JUSTICE_DS.charcoalDeep, borderColor: JUSTICE_DS.ruleSoft, borderLeft: `3px solid ${JUSTICE_DS.burgundy}` }}>
          <div className="text-[9px] uppercase italic tracking-[0.24em]" style={{ color: JUSTICE_DS.burgundy }}>held</div>
          <div className="mt-1 tabular-nums text-[20px]" style={{ color: JUSTICE_DS.ivory }}>{held.length}</div>
        </div>
        <div className="border px-4 py-3" style={{ background: JUSTICE_DS.charcoalDeep, borderColor: JUSTICE_DS.ruleSoft, borderLeft: `3px solid ${JUSTICE_DS.alert}` }}>
          <div className="text-[9px] uppercase italic tracking-[0.24em]" style={{ color: JUSTICE_DS.alert }}>flagged</div>
          <div className="mt-1 tabular-nums text-[20px]" style={{ color: JUSTICE_DS.alert }}>{flagged.length}</div>
        </div>
      </div>
      <ChamberRule label="recent transactions" />
      {txs.slice(0, 6).map((t, i) => (
        <RegisterRow key={t.id} numeral={`№ ${String(i + 1).padStart(3, '0')}`}
          primary={`${t.fromCustodian} ↦ ${t.toCustodian}`}
          secondary={`${t.artefact} · matter ${t.matter}`}
          status={t.status}
          statusColor={t.status === 'verified' ? JUSTICE_DS.navy : t.status === 'flagged' ? JUSTICE_DS.alert : JUSTICE_DS.bronze}
          columns={[{ label: 'age', value: `${t.ageHrs}h` }]} />
      ))}
    </DocketFrame>
  );
}
