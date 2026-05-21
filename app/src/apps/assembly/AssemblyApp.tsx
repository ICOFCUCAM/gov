'use client';

// apps/assembly — Lower Chamber sovereign operational app.

import * as React from 'react';
import { AssemblyShell } from '@/apps/assembly/shell/AssemblyShell';
import { resolveAssemblySurface } from '@/apps/assembly/core/domains';
import type { SovereignRole, Capability } from '@/shared/permissions/rbac';

export function AssemblyApp({ appId, domain, now, role, withheld = [] }: {
  appId: string; domain: string; now: number; role: SovereignRole; withheld?: Capability[];
}) {
  return (
    <AssemblyShell id={appId} surface={resolveAssemblySurface(domain)} now={now} role={role} withheld={withheld} />
  );
}
