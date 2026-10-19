// The persistence port (architecture review R6, C2). The registers that move
// to per-record tables first — the audit chain, the national twin (entities,
// crosswalk keys, sources, runs, observations), the facility register and the
// boundary versions, the land parcel register — change their state only through these interfaces. The
// exported domain functions (recordAudit, runSource, stateAsOf,
// proposeFacility, publishBoundaries …) keep their signatures and stay
// synchronous: every implementation keeps the records in memory as the read
// model, on the same globalThis stores as before.
//
//   memory    (default) the read model is the whole truth; lib/data/persist.ts
//             saves it as snapshots (file, supabase) or not at all
//   postgres  CIVICOS_STATE=postgres: the same read model, and every change is
//             also written through, in order, to per-record tables
//             (lib/data/repo/postgres.ts)
//
// A repository is bound to its store's accessor (`() => TwinDb`, …), so the
// domain module keeps owning its store's shape and defaults, and the port
// never imports the domain modules (no cycles).
//
// Every other store goes through the port's generic side: its accessor passes
// the store through `touch()` (./track.ts), and the postgres backend keeps it
// as per-record documents (./documents.ts), written with the audit entry of
// each change and followed by every instance. The stores keep mutating their
// own objects; no domain function changed its signature.

import type { AuditEntry } from '@/lib/api/types';
import type { TwinDb } from '@/lib/twin/db';
import type { TwinEntity, TwinSource, TwinRun, Observation } from '@/lib/twin/register';
import type { Facility } from '@/lib/data/facilities';
import type { BoundaryVersion } from '@/lib/data/boundaries';
import type { Parcel } from '@/lib/data/parcels';

export type BackendName = 'memory' | 'postgres';

export interface AuditRepo {
  /** The chain, oldest first (the read model; entries are never changed). */
  entries(): AuditEntry[];
  /** The newest entry, the head new entries chain from. */
  head(): AuditEntry | undefined;
  /**
   * Append an entry already hashed on the head. `committed` runs once the
   * entry is durable with its final sequence and hash: at once in memory;
   * after the transaction in postgres (where an entry another instance
   * appended first moves this one up the chain and re-hashes it).
   */
  append(entry: AuditEntry, committed?: (e: AuditEntry) => void): void;
}

export interface TwinRepo {
  state(): TwinDb;
  /** The next number for a run or source id (RUN-n, SRC-n); unique across instances in postgres. */
  nextSeq(): number;
  /** Add or replace an entity (by id). */
  putEntity(e: TwinEntity): void;
  /** Record that entities changed in place (the read model already holds them). */
  putEntities(list: TwinEntity[]): void;
  /** Add a crosswalk key (a system's id for an entity), unless it is there. */
  addKey(k: { entityId: string; system: string; key: string }): void;
  addSource(s: TwinSource): void;
  /** Record that a source changed in place (its last run). */
  saveSource(s: TwinSource): void;
  /** Add a run (newest first). */
  addRun(r: TwinRun): void;
  /** Record that a run changed in place (withdrawn), live or archived. */
  saveRun(r: TwinRun): void;
  /** Append the observations an import accepted (all of one run). */
  addObservations(list: Observation[]): void;
  /** Mark every observation of a run (live and archived) superseded at `at`; returns how many were marked. */
  supersedeRun(runId: string, at: string): number;
}

/** The part of the facility store the port manages: the site records and their numbering. */
export interface FacilityStore { facilities: Facility[]; seq: number }
export interface FacilityRepo {
  list(): Facility[];
  /** The next site number (FAC-nnnnn); unique across instances in postgres. */
  nextSeq(): number;
  add(f: Facility): void;
  /** Record that a site changed in place. */
  save(f: Facility): void;
}

export interface BoundaryStore { versions: BoundaryVersion[]; seq: number }
export interface BoundaryRepo {
  versions(): BoundaryVersion[];
  /** The next version number (bnd-nnnn); unique across instances in postgres. */
  nextSeq(): number;
  add(v: BoundaryVersion): void;
  /** Record that a version changed in place (published, withdrawn). */
  save(v: BoundaryVersion): void;
}

/** The part of the parcel store the port manages: the parcel records and their numbering. */
export interface ParcelStore { parcels: Parcel[]; seq: number }
export interface ParcelRepo {
  list(): Parcel[];
  /** The next parcel record number (PCL-nnnnnn); unique across instances in postgres. */
  nextSeq(): number;
  add(p: Parcel): void;
  /** Record that a parcel changed in place (published, amended, withdrawn). */
  save(p: Parcel): void;
}

/** A storage backend: makes each repository for its store's accessor. */
export interface Backend {
  name: BackendName;
  audit(chain: () => AuditEntry[]): AuditRepo;
  twin(state: () => TwinDb): TwinRepo;
  facilities(store: () => FacilityStore): FacilityRepo;
  boundaries(store: () => BoundaryStore): BoundaryRepo;
  parcels(store: () => ParcelStore): ParcelRepo;
}
