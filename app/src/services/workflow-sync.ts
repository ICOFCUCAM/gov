// Workflow sync — push the in-code WORKFLOWS catalog to the substrate.
//
// The platform's base workflows are declared in lib/gov/runtime-workflow.ts.
// On boot we mirror each one to civicos.workflow_definitions so the
// substrate's transition_work_item RPC can validate actions against the
// canonical rules. Idempotent: same shape produces the same row.
//
// One-shot per process. Failures are swallowed (best-effort persistence
// — the engine works either way).

import { WORKFLOWS } from '@/lib/gov/runtime-workflow';
import { syncWorkflowDefinitionRow, substrateAvailable } from '@/lib/db/repos/work-items';

const PLATFORM_CHARTER = 'platform';

let _synced = false;
let _inflight: Promise<number> | null = null;

/** Mirror every platform workflow to the substrate. Returns the count
 *  of definitions accepted (0 when substrate is unavailable). */
export async function syncAllWorkflows(): Promise<number> {
  if (_synced) return Object.keys(WORKFLOWS).length;
  if (_inflight) return _inflight;
  if (!substrateAvailable()) return 0;

  _inflight = (async () => {
    let ok = 0;
    for (const [kind, def] of Object.entries(WORKFLOWS)) {
      const row = await syncWorkflowDefinitionRow({
        workflowId: kind,
        institutionCharterId: PLATFORM_CHARTER,
        archetype: null,
        title: def.label,
        kind: def.kind,
        definition: { terminal: def.terminal, transitions: def.transitions },
        stepCount: def.stages.length,
      }).catch(() => null);
      if (row) ok += 1;
    }
    _synced = ok > 0;
    return ok;
  })();
  try {
    return await _inflight;
  } finally {
    _inflight = null;
  }
}

/** Reset (tests only). */
export function __resetWorkflowSync(): void {
  _synced = false;
  _inflight = null;
}
