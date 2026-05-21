'use client';

// apps/senate — Upper Chamber sovereign operational app.

import * as React from 'react';
import { SenateShell } from '@/apps/senate/shell/SenateShell';
import { resolveSenateSurface } from '@/apps/senate/core/domains';
import type { SovereignRole, Capability } from '@/shared/permissions/rbac';

export function SenateApp({ appId, domain, now, role, withheld = [] }: {
  appId: string; domain: string; now: number; role: SovereignRole; withheld?: Capability[];
}) {
  return (
    <SenateShell id={appId} surface={resolveSenateSurface(domain)} now={now} role={role} withheld={withheld} />
  );
}
