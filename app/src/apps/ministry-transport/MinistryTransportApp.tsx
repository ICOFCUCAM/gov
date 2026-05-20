'use client';

// apps/ministry-transport — federated transport execution application.
//
// Tier-1 federated operational application backed by the dedicated
// Corridor Map design system, shell, federation contract and
// executable workflows. Legacy domain keys remain resolvable through
// resolveTransportSurface().

import * as React from 'react';
import { TransportShell } from '@/apps/ministry-transport/shell/TransportShell';
import { resolveTransportSurface } from '@/apps/ministry-transport/core/domains';
import type { SovereignRole, Capability } from '@/shared/permissions/rbac';

export function MinistryTransportApp({ instanceId, domain, now, role, withheld }: {
  instanceId: string; domain: string; now: number; role: SovereignRole; withheld: Capability[];
}) {
  const surface = resolveTransportSurface(domain);
  return (
    <TransportShell id={instanceId} surface={surface} now={now} role={role} withheld={withheld} />
  );
}
