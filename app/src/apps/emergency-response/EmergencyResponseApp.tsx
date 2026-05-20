'use client';

// apps/emergency-response — federated crisis-response execution app.
//
// Tier-1 federated operational application backed by the dedicated
// Crisis Theatre design system, shell, federation contract and
// executable workflows. Legacy domain keys remain resolvable through
// resolveEmergencySurface().

import * as React from 'react';
import { EmergencyShell } from '@/apps/emergency-response/shell/EmergencyShell';
import { resolveEmergencySurface } from '@/apps/emergency-response/core/domains';
import type { SovereignRole, Capability } from '@/shared/permissions/rbac';

export function EmergencyResponseApp({ appId, domain, now, role, withheld }: {
  appId: string; domain: string; now: number; role: SovereignRole; withheld: Capability[];
}) {
  const surface = resolveEmergencySurface(domain);
  return (
    <EmergencyShell id={appId} surface={surface} now={now} role={role} withheld={withheld} />
  );
}
