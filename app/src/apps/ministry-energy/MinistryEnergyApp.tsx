'use client';

// apps/ministry-energy — federated energy execution application.
//
// Tier-1 federated operational application backed by the dedicated
// One-Line Diagram design system, shell, federation contract and
// executable workflows. Legacy domain keys remain resolvable through
// resolveEnergySurface().

import * as React from 'react';
import { EnergyShell } from '@/apps/ministry-energy/shell/EnergyShell';
import { resolveEnergySurface } from '@/apps/ministry-energy/core/domains';
import type { SovereignRole, Capability } from '@/shared/permissions/rbac';

export function MinistryEnergyApp({ instanceId, domain, now, role, withheld }: {
  instanceId: string; domain: string; now: number; role: SovereignRole; withheld: Capability[];
}) {
  const surface = resolveEnergySurface(domain);
  return (
    <EnergyShell id={instanceId} surface={surface} now={now} role={role} withheld={withheld} />
  );
}
