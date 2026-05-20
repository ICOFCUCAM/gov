'use client';

import * as React from 'react';
import { justiceRecordsForensicsBoard } from '@/lib/gov/justice-records-forensics';
import { DocketFrame, ChamberRule, JUSTICE_DS } from '@/apps/ministry-justice/design-system/justice-ds';

// ✠ III — Judicial Signatures registry.
// Tracks the HSM-backed signing keys held inside the judiciary's KMS
// (per CIVICOS Master §20.2 — keys never accessible to the executive
// branch). Surfaces signature throughput across the supreme-rulings
// vault and current rotation status.

const KEY_ROTATION_DAYS = 365;

export function JudicialSignatures({ id, now }: { id: string; now: number }) {
  void id;
  const b = justiceRecordsForensicsBoard(now);
  const supreme = b.records.archives.find(a => a.category === 'supreme-rulings');
  const constitutional = b.records.archives.find(a => a.category === 'constitutional');
  // synth: signatures-per-day derived from archive integrity
  const sigsPerDay = supreme ? Math.round((supreme.integrityIdx / 100) * 240) : 0;
  const rotationDue = Math.round(Math.random() * KEY_ROTATION_DAYS); // deterministic via b.epoch would be nicer; keep simple
  const fixedRotation = (b.epoch * 17) % KEY_ROTATION_DAYS;
  void rotationDue;
  return (
    <DocketFrame archetype="fascicle" numeral="✠ III" title="Judicial Signatures" subtitle="HSM-backed keys · independent of the executive">
      <div className="grid grid-cols-2 gap-px md:grid-cols-4" style={{ background: JUSTICE_DS.rule }}>
        {[
          { l: 'Signatures /day', v: sigsPerDay, t: JUSTICE_DS.ivory },
          { l: 'Key rotation due', v: `${KEY_ROTATION_DAYS - fixedRotation}d`, t: KEY_ROTATION_DAYS - fixedRotation < 30 ? JUSTICE_DS.burgundy : JUSTICE_DS.bronze },
          { l: 'Apex integrity', v: supreme?.integrityIdx ?? 0, t: (supreme?.integrityIdx ?? 0) >= 85 ? JUSTICE_DS.navy : JUSTICE_DS.bronze },
          { l: 'Constitutional integrity', v: constitutional?.integrityIdx ?? 0, t: (constitutional?.integrityIdx ?? 0) >= 90 ? JUSTICE_DS.navy : JUSTICE_DS.burgundy },
        ].map(x => (
          <div key={x.l} className="px-4 py-3" style={{ background: JUSTICE_DS.charcoal }}>
            <div className="text-[9px] uppercase tracking-[0.28em]" style={{ color: JUSTICE_DS.mut }}>{x.l}</div>
            <div className="mt-1 tabular-nums text-[16px]" style={{ color: x.t }}>{x.v}</div>
          </div>
        ))}
      </div>
      <ChamberRule label="key custody doctrine" />
      <p className="text-[11px] italic" style={{ color: JUSTICE_DS.mut }}>
        All judicial signatures use HSM-backed keys held inside the judiciary&apos;s own KMS. The executive branch
        holds no signing authority and no recovery path that bypasses the chamber. Annual rotation is mandatory
        and audited by the Chief Archivist (§ I custodian).
      </p>
    </DocketFrame>
  );
}
