'use client';

// Interior Constitutional Governance — Citizen Accountability Rights.
// Citizens see lawful status only: file, office, stage, legal deadline,
// escalation path and color state. Confidential investigations, protected
// intelligence and national-security operations are never exposed; officer
// identity and risk scoring are never citizen-visible.

import * as React from 'react';
import { citizenView, GOV_COLOR_CSS } from '@/lib/gov/constitutional-governance';

export function CitizenAccountability({ id, now }: { id: string; now: number }) {
  void id;
  const files = citizenView(now, 44);
  const visible = files.filter(f => !f.protected);
  const protectedN = files.length - visible.length;
  return (
    <div className="space-y-2 font-mono">
      <div className="flex flex-wrap items-stretch divide-x divide-line border-y border-line bg-black/30">
        <div className="min-w-[150px] flex-1 px-3 py-1.5">
          <div className="text-[8px] uppercase tracking-[0.16em] text-ink-muted">Citizen-visible files</div>
          <div className="mt-0.5 text-[17px] font-semibold tabular-nums text-ink">{visible.length}</div>
        </div>
        <div className="min-w-[150px] flex-1 px-3 py-1.5">
          <div className="text-[8px] uppercase tracking-[0.16em] text-ink-muted">Protected (not exposed)</div>
          <div className="mt-0.5 text-[17px] font-semibold tabular-nums" style={{ color: '#8a7df0' }}>{protectedN}</div>
        </div>
        <div className="min-w-[240px] flex-[2] px-3 py-1.5">
          <div className="text-[8px] uppercase tracking-[0.16em] text-ink-muted">Guarantee</div>
          <div className="mt-0.5 text-[10px] text-ink-soft">Lawful transparency without surveillance exposure.</div>
        </div>
      </div>

      <div className="border border-line">
        <div className="flex items-center gap-2 border-b border-line bg-black/30 px-2 py-1 text-[8px] font-semibold uppercase tracking-[0.16em] text-ink-muted">
          <span className="w-24 shrink-0">File</span>
          <span className="w-40 shrink-0">Responsible office</span>
          <span className="w-24 shrink-0">Stage</span>
          <span className="w-28 shrink-0">Legal deadline</span>
          <span className="min-w-0 flex-1">Escalation path</span>
        </div>
        <div className="max-h-[440px] overflow-y-auto">
          {files.map(f => (
            <div key={f.ref} className="flex items-center gap-2 border-b border-line/50 px-2 py-1 text-[10px] last:border-0">
              <span className="w-24 shrink-0 truncate tabular-nums text-ink-muted">{f.ref}</span>
              <span className="w-40 shrink-0 truncate text-ink">{f.office}</span>
              {f.protected ? (
                <span className="min-w-0 flex-1 italic" style={{ color: '#8a7df0' }}>
                  Protected — confidential operation; not citizen-visible
                </span>
              ) : (
                <>
                  <span className="w-24 shrink-0 truncate text-ink-soft">{f.stage}</span>
                  <span className="w-28 shrink-0 tabular-nums" style={{ color: GOV_COLOR_CSS[f.color!] }}>
                    {f.ageHrs}h / {f.legalDeadlineHrs}h
                  </span>
                  <span className="flex min-w-0 flex-1 items-center gap-1.5 truncate text-ink-muted">
                    <span className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: GOV_COLOR_CSS[f.color!] }} aria-hidden />
                    {f.escalationPath}
                  </span>
                </>
              )}
            </div>
          ))}
        </div>
      </div>
      <p className="text-[9px] text-ink-muted">
        Colors — green compliant · amber approaching deadline · red constitutional breach · purple escalation review ·
        blue judicial hold. Citizens may escalate via the ombudsman; protected operations remain confidential by law.
      </p>
    </div>
  );
}
