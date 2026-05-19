'use client';

// apps/police-command — the Police Command sovereign shell.
//
// Tier-1 federated operational application: a dedicated shell (normalized
// domain taxonomy, dedicated design system, Interior-OS federation
// contract, migration-safe legacy nav-key resolution). Interior
// orchestrates Police; Police keeps its own shell and source of truth.

import * as React from 'react';
import { resolvePoliceDomain } from '@/apps/police-command/core/domains';
import { PoliceShell } from '@/apps/police-command/shell/PoliceShell';
import type { SovereignRole, Capability } from '@/shared/permissions/rbac';

export function PoliceCommandApp({ appId, domain, now, role, withheld }: {
  appId: string; domain: string; now: number; role: SovereignRole; withheld: Capability[];
}) {
  const resolved = resolvePoliceDomain(domain);
  return (
    <PoliceShell domain={resolved} appId={appId} now={now} role={role} withheld={withheld} />
  );
}
