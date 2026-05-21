'use client';

// apps/presidency — Executive Mansion sovereign operational app.

import * as React from 'react';
import { PresidencyShell } from '@/apps/presidency/shell/PresidencyShell';
import { resolvePresidencySurface } from '@/apps/presidency/core/domains';
import type { SovereignRole, Capability } from '@/shared/permissions/rbac';

export function PresidencyApp({ appId, domain, now, role, withheld = [] }: {
  appId: string; domain: string; now: number; role: SovereignRole; withheld?: Capability[];
}) {
  return (
    <PresidencyShell id={appId} surface={resolvePresidencySurface(domain)} now={now} role={role} withheld={withheld} />
  );
}
