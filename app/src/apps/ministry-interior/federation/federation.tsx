'use client';

// apps/ministry-interior/federation — the federation contract layer.
//
// Operational domains (Police, Immigration, Emergency, Intelligence,
// Cyber, Investigations, plus the cross-shell civil federations) keep
// their own sovereign shells and ownership. Interior embeds their command
// surfaces as federated modules: it orchestrates and monitors them, the
// source of truth never moves. This component is the visible + structural
// boundary marker for that contract.

import * as React from 'react';
import Link from 'next/link';
import type { FederationRef } from '@/apps/ministry-interior/core/domains';

export function FederatedBadge() {
  return (
    <span className="flex items-center gap-1 rounded-[2px] border border-line px-1.5 py-px text-[8px] font-semibold uppercase tracking-[0.14em] text-ink-muted">
      <span aria-hidden>▣</span> Federated
    </span>
  );
}

/**
 * FederatedMount — wraps an embedded operational surface with its
 * federation contract: declares the owning sovereign shell, links to its
 * canonical route, and makes explicit that Interior does not own the
 * underlying system.
 */
export function FederatedMount({ federation, children }: {
  federation: FederationRef;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-2">
      <div
        className="flex flex-wrap items-center gap-x-2 gap-y-1 rounded-[3px] border border-line bg-surface px-2 py-1 text-[10px]"
        role="note">
        <span aria-hidden style={{ color: '#5fb0ff' }}>▣</span>
        <span className="text-ink-soft">
          Federated module — source of truth:{' '}
          <span className="font-semibold text-ink">{federation.ownerLabel}</span>
        </span>
        <Link
          href={federation.ownerRoute}
          className="ml-auto text-link underline underline-offset-2">
          Open sovereign shell {federation.ownerRoute} →
        </Link>
      </div>
      <div aria-label={`Federated surface owned by ${federation.ownerLabel}`}>{children}</div>
    </div>
  );
}
