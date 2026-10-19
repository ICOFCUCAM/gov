// Which storage backend the ported registers use (lib/data/repo/types.ts).
// Memory unless lib/data/persist.ts started the postgres backend
// (CIVICOS_STATE=postgres). Held on globalThis under a key persist.ts never
// saves (it saves only `__civicos*`), so every module copy sees the same one.

import type { AuditEntry } from '@/lib/api/types';
import type { TwinDb } from '@/lib/twin/db';
import { memoryBackend } from './memory';
import type { AuditRepo, Backend, BoundaryRepo, BoundaryStore, FacilityRepo, FacilityStore, TwinRepo } from './types';

export type * from './types';

const g = globalThis as unknown as { __recordBackend?: Backend };

/** The backend in use. */
export const backend = (): Backend => g.__recordBackend ?? memoryBackend;
/** Use another backend (persist.ts at start; tests). Returns the one it replaces. */
export function useBackend(b: Backend | null): Backend {
  const prev = backend();
  g.__recordBackend = b ?? undefined;
  return prev;
}

export const auditRepo = (chain: () => AuditEntry[]): AuditRepo => backend().audit(chain);
export const twinRepo = (state: () => TwinDb): TwinRepo => backend().twin(state);
export const facilityRepo = (store: () => FacilityStore): FacilityRepo => backend().facilities(store);
export const boundaryRepo = (store: () => BoundaryStore): BoundaryRepo => backend().boundaries(store);
