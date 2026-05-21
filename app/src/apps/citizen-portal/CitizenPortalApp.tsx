'use client';

// apps/citizen-portal — Citizen Super-Portal sovereign operational app.

import * as React from 'react';
import { PortalShell } from '@/apps/citizen-portal/shell/PortalShell';
import { resolvePortalSurface } from '@/apps/citizen-portal/core/domains';
import type { SovereignRole, Capability } from '@/shared/permissions/rbac';

export function CitizenPortalApp({ appId, domain, now, role, withheld = [] }: {
  appId: string; domain: string; now: number; role: SovereignRole; withheld?: Capability[];
}) {
  return (
    <PortalShell id={appId} surface={resolvePortalSurface(domain)} now={now} role={role} withheld={withheld} />
  );
}
