'use client';

// apps/judicial-branch — Apex Court sovereign operational app.

import * as React from 'react';
import { JudicialShell } from '@/apps/judicial-branch/shell/JudicialShell';
import { resolveJudicialSurface } from '@/apps/judicial-branch/core/domains';
import type { SovereignRole, Capability } from '@/shared/permissions/rbac';

export function JudicialBranchApp({ appId, domain, now, role, withheld = [] }: {
  appId: string; domain: string; now: number; role: SovereignRole; withheld?: Capability[];
}) {
  return (
    <JudicialShell id={appId} surface={resolveJudicialSurface(domain)} now={now} role={role} withheld={withheld} />
  );
}
