'use client';

// apps/communications — Communications & Digital Infrastructure
// sovereign standing-agency app.
//
// Tier-1 federated operational application backed by the dedicated
// Topology Graph design system, shell, federation contract and
// executable workflows. Legacy domain keys remain resolvable through
// resolveCommsSurface().

import * as React from 'react';
import { CommunicationsShell } from '@/apps/communications/shell/CommunicationsShell';
import { resolveCommsSurface } from '@/apps/communications/core/domains';
import type { SovereignRole, Capability } from '@/shared/permissions/rbac';

export function CommunicationsApp({ appId, domain, now, role, withheld = [] }: {
  appId: string; domain: string; now: number; role: SovereignRole; withheld?: Capability[];
}) {
  const surface = resolveCommsSurface(domain);
  return (
    <CommunicationsShell id={appId} surface={surface} now={now} role={role} withheld={withheld} />
  );
}
