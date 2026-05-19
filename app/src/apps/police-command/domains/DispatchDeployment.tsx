'use client';

// Police domain — Dispatch & Deployment. Regional patrol load, patrol
// division status, the field unit panel, and the field deployment runtime
// the Field Coordinator drives. Engages patrol officers & field units.

import * as React from 'react';
import { policeOps } from '@/lib/gov/agency-systems';
import { BarPanel } from '@/apps/_shared/Ops';
import { FieldPanel } from '@/apps/_shared/AppKit';
import { RuntimeQueue } from '@/components/features/RuntimeQueue';
import type { SovereignRole, Capability } from '@/shared/permissions/rbac';

export function DispatchDeployment({ id, now, accent, role, withheld }: {
  id: string; now: number; accent: string; role: SovereignRole; withheld: Capability[];
}) {
  const ts = now / 4000;
  const o = policeOps(id, ts);
  return (
    <div className="space-y-2">
      <BarPanel
        title="Regional patrol load"
        meta="civil-stability footprint → national escalation"
        accent={accent}
        live
        rows={o.regional.map(r => ({ label: r.region, pct: r.load, tone: r.tone, tail: `${r.load}` }))}
      />
      <BarPanel
        title="Patrol divisions"
        meta="deployment status"
        accent={accent}
        rows={o.patrols.map(p => ({
          label: `${p.label} · ${p.region}`,
          pct: p.status === 'responding' ? 92 : p.status === 'patrolling' ? 55 : 25,
          tone: p.tone,
          tail: p.status,
        }))}
      />
      <FieldPanel instId={id} archetype="INTERIOR" now={now} />
      <RuntimeQueue
        scope={`${id}:dispatch`}
        kind="field"
        title="Field deployment runtime — stage → task → en-route → on-scene → cleared"
        by="Field Coordinator"
        role={role}
        withheld={withheld}
      />
    </div>
  );
}
