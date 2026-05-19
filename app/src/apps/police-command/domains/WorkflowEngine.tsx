'use client';

// Police domain — Workflow Engine. Cross-domain mission orchestration plus
// the casework runtime the Operations Officer drives.

import * as React from 'react';
import { MissionOrchestration } from '@/components/features/MissionOrchestration';
import { RuntimeQueue } from '@/components/features/RuntimeQueue';
import type { SovereignRole, Capability } from '@/shared/permissions/rbac';

export function WorkflowEngine({ id, role, withheld }: {
  id: string; role: SovereignRole; withheld: Capability[];
}) {
  return (
    <div className="space-y-2">
      <MissionOrchestration />
      <RuntimeQueue
        scope={`${id}:workflow-engine`}
        kind="case"
        title="Casework runtime — intake → triage → assigned → resolved"
        by="Operations Officer"
        role={role}
        withheld={withheld}
      />
    </div>
  );
}
