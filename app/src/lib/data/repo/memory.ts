// The in-memory implementation of the persistence port (lib/data/repo/types.ts):
// exactly what the stores did before the port, on the same globalThis stores.
// It is the default, and the read model under the postgres backend.

import type { AuditEntry } from '@/lib/api/types';
import type { TwinDb } from '@/lib/twin/db';
import { forEachArchived } from '@/lib/twin/archive';
import type { Observation } from '@/lib/twin/register';
import type { AuditRepo, Backend, BoundaryRepo, BoundaryStore, FacilityRepo, FacilityStore, TwinRepo } from './types';

export function memoryAudit(chain: () => AuditEntry[]): AuditRepo {
  return {
    entries: chain,
    head: () => { const c = chain(); return c[c.length - 1]; },
    append(entry, committed) { chain().push(entry); committed?.(entry); },
  };
}

export function memoryTwin(state: () => TwinDb): TwinRepo {
  return {
    state,
    nextSeq: () => state().seq++,
    putEntity(e) { state().entities[e.id] = e; },
    putEntities(list) { const d = state(); for (const e of list) d.entities[e.id] = e; },
    addKey(k) {
      const d = state();
      if (!d.keys.some(x => x.system === k.system && x.key === k.key)) d.keys.push({ entityId: k.entityId, system: k.system, key: k.key });
    },
    addSource(s) { state().sources.push(s); },
    saveSource() { /* the read model holds the record itself */ },
    addRun(r) { state().runs.unshift(r); },
    saveRun() { /* the read model holds the record itself */ },
    addObservations(list) { state().observations.push(...list); },
    supersedeRun(runId, at) {
      let n = 0;
      const mark = (o: Observation) => { if (o.runId === runId && !o.supersededAt) { o.supersededAt = at; n++; } };
      state().observations.forEach(mark);
      forEachArchived(undefined, mark);
      return n;
    },
  };
}

export function memoryFacilities(store: () => FacilityStore): FacilityRepo {
  return {
    list: () => store().facilities,
    nextSeq: () => store().seq++,
    add(f) { store().facilities.push(f); },
    save() { /* the read model holds the record itself */ },
  };
}

export function memoryBoundaries(store: () => BoundaryStore): BoundaryRepo {
  return {
    versions: () => store().versions,
    nextSeq: () => store().seq++,
    add(v) { store().versions.push(v); },
    save() { /* the read model holds the record itself */ },
  };
}

export const memoryBackend: Backend = {
  name: 'memory',
  audit: memoryAudit,
  twin: memoryTwin,
  facilities: memoryFacilities,
  boundaries: memoryBoundaries,
};
