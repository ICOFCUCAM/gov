'use client';

// apps/police-command/federation — the federation contract layer.
//
// Police Command is a sovereign operational shell that federates UP into
// the Interior OS: Interior orchestrates and monitors it; Police keeps its
// own shell, routes and source of truth. This component is the visible +
// structural boundary marker for that contract.

import * as React from 'react';
import Link from 'next/link';
import type { PoliceFederationRef } from '@/apps/police-command/core/domains';

export function PoliceFederatedBadge() {
  return (
    <span className="flex items-center gap-1 rounded-[2px] border border-line px-1.5 py-px text-[8px] font-semibold uppercase tracking-[0.14em] text-ink-muted">
      <span aria-hidden>▣</span> Federated
    </span>
  );
}

export function PoliceFederatedMount({ federation, children }: {
  federation: PoliceFederationRef;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-2">
      <div
        className="flex flex-wrap items-center gap-x-2 gap-y-1 rounded-[3px] border border-line bg-surface px-2 py-1 text-[10px]"
        role="note">
        <span aria-hidden style={{ color: '#45c0c8' }}>▣</span>
        <span className="text-ink-soft">
          Federation contract — orchestrated by{' '}
          <span className="font-semibold text-ink">{federation.ownerLabel}</span>. Police Command
          retains sovereign ownership of this surface.
        </span>
        <Link href={federation.ownerRoute} className="ml-auto text-link underline underline-offset-2">
          Open {federation.ownerRoute} →
        </Link>
      </div>
      <div aria-label={`Federation surface — orchestrated by ${federation.ownerLabel}`}>{children}</div>
    </div>
  );
}
