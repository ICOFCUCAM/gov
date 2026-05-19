'use client';

// Police domain — Institutional Federation. The federation contract map
// (who orchestrates Police, who Police hands off to) plus the live
// Interior institutional chain: facility ↔ ministry ↔ national dispatch,
// enrolment, record custody and cross-ministry referrals.

import * as React from 'react';
import Link from 'next/link';
import { MinistryChainSection } from '@/apps/_shared/InstitutionChain';

const PARTNERS: { label: string; rel: string; route: string }[] = [
  { label: 'Ministry of Interior · Interior OS', rel: 'Orchestrates & monitors Police Command', route: '/app/interior' },
  { label: 'Ministry of Justice', rel: 'Corrections & prosecution handoff', route: '/app/justice' },
  { label: 'Emergency Response', rel: 'Joint major-incident operations', route: '/app/emergency' },
  { label: 'National Coordination', rel: 'Civil-stability escalation to the apex', route: '/gov/coordination' },
];

export function InstitutionalFederation({ id, now, accent }: {
  id: string; now: number; accent: string;
}) {
  return (
    <div className="space-y-2">
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        {PARTNERS.map(p => (
          <Link
            key={p.label}
            href={p.route}
            className="focus-ring group rounded-[3px] border border-line bg-surface p-2 transition-colors hover:bg-surface-2"
            style={{ borderColor: `color-mix(in srgb,${accent} 18%,rgb(var(--c-line)))` }}>
            <div className="flex items-center gap-2">
              <span aria-hidden style={{ color: accent }}>▣</span>
              <span className="text-[12px] font-semibold text-ink">{p.label}</span>
              <span className="ml-auto text-[10px] text-link underline underline-offset-2">{p.route} →</span>
            </div>
            <p className="mt-0.5 text-[10px] text-ink-muted">{p.rel}</p>
          </Link>
        ))}
      </div>
      <MinistryChainSection ministryKey="INTERIOR" id={id} now={now} accent={accent} />
    </div>
  );
}
