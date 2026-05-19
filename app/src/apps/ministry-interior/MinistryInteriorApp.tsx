'use client';

// apps/ministry-interior — the Ministry of Interior sovereign shell.
//
// Tier-1 sovereign internal-governance operating system. Replaces the
// generic sector renderer for Interior with a dedicated shell: normalized
// domain taxonomy, dedicated design system, federation contracts for
// embedded operational shells, and a migration-safe routing layer that
// resolves legacy nav keys to the new domain model.

import * as React from 'react';
import { resolveDomain } from '@/apps/ministry-interior/core/domains';
import { InteriorShell } from '@/apps/ministry-interior/shell/InteriorShell';
import type { SovereignRole, Capability } from '@/shared/permissions/rbac';

export function MinistryInteriorApp({ instanceId, domain, now, role, withheld }: {
  instanceId: string;
  domain: string;
  now: number;
  role: SovereignRole;
  withheld: Capability[];
}) {
  const resolved = resolveDomain(domain);
  return (
    <InteriorShell
      domain={resolved}
      instanceId={instanceId}
      now={now}
      role={role}
      withheld={withheld}
    />
  );
}
