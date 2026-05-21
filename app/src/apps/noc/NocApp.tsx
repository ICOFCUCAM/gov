'use client';

// apps/noc — National Operations Centre sovereign operational app.

import * as React from 'react';
import { NocShell } from '@/apps/noc/shell/NocShell';
import { resolveNocSurface } from '@/apps/noc/core/domains';
import type { SovereignRole, Capability } from '@/shared/permissions/rbac';

export function NocApp({ appId, domain, now, role, withheld = [] }: {
  appId: string; domain: string; now: number; role: SovereignRole; withheld?: Capability[];
}) {
  return (
    <NocShell id={appId} surface={resolveNocSurface(domain)} now={now} role={role} withheld={withheld} />
  );
}
