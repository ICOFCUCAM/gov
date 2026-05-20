'use client';

// apps/foreign-affairs — Foreign Affairs sovereign agency app.
//
// Tier-1 federated operational application backed by the dedicated
// World Dispatch design system, shell, federation contract and
// executable workflows. Legacy domain keys remain resolvable through
// resolveForeignSurface().

import * as React from 'react';
import { ForeignShell } from '@/apps/foreign-affairs/shell/ForeignShell';
import { resolveForeignSurface } from '@/apps/foreign-affairs/core/domains';
import type { SovereignRole, Capability } from '@/shared/permissions/rbac';

export function ForeignAffairsApp({ appId, domain, now, role, withheld = [] }: {
  appId: string; domain: string; now: number; role: SovereignRole; withheld?: Capability[];
}) {
  const surface = resolveForeignSurface(domain);
  return (
    <ForeignShell id={appId} surface={surface} now={now} role={role} withheld={withheld} />
  );
}
