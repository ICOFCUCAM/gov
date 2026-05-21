// lib/institution/charters/types.ts
//
// Ministry Charter Schema — the sovereign contract every ministry must
// honour to count as institution-grade. Each ministry's charter declares
// what it claims to provide; the maturity scorer measures the gap
// between claim and implementation. This is the single source of truth
// referenced by /gov/charter-registry and the maturity test.

import type { ArchetypeKey } from '@/lib/api/types';

/** Tier classifies a ministry's institutional depth. */
export type MaturityTier =
  | 'reference'    // Interior / Health / Police-Command quality: own DS, shell, ≥30 domains, federation, workflows
  | 'operational'  // own DS + shell + domain catalog + ≥10 surfaces + federation
  | 'advanced'     // ≥10 surfaces + at least 1 workflow + federation declared
  | 'baseline'     // ≥4 surfaces dispatched through generic shell
  | 'stub';        // declared but no surfaces yet

/** Visual / layout grammar a ministry uses. Distinct ministries pick
 *  distinct layout primitives so the cabinet doesn't reduce to palette. */
export type LayoutGrammar =
  | 'situation-room'        // Interior
  | 'clinical-floor-plan'   // Health
  | 'fiscal-ledger'         // Treasury
  | 'docket-chamber'        // Justice
  | 'one-line-diagram'      // Energy
  | 'corridor-map'          // Transport
  | 'seasonal-wheel'        // Agriculture
  | 'topology-graph'        // Communications
  | 'world-dispatch'        // Foreign Affairs
  | 'biome-map'             // Environment
  | 'workforce-flow'        // Labour
  | 'industrial-corridor'   // Trade & Industry
  | 'lecture-hall'          // Education
  | 'crisis-theatre'        // Emergency Management
  | 'senate-chamber'        // Senate (Upper House)
  | 'assembly-floor'        // National Assembly (Lower House)
  | 'apex-court'            // Judicial Branch
  | 'generic-sector';       // fallback — explicit flag of unrealised identity

/** Constitutional / blueprint section references. Charters MUST cite the
 *  blueprint section(s) they implement so the spec doesn't drift. */
export interface BlueprintCitation {
  document: 'master' | 'vol-ii';
  section: string;          // e.g. "13", "20", "Part 9"
  title: string;            // e.g. "Healthcare Infrastructure"
}

export interface FederationContract {
  /** Ministries this ministry produces cross-ministry events for. */
  produces: string[];
  /** Ministries this ministry consumes events from. */
  consumes: string[];
  /** Whether engine emits a cross-ministry cascade map. */
  emitsCascade: boolean;
}

export interface WorkflowSurface {
  id: string;
  title: string;
  kind: 'incident' | 'case' | 'permit' | 'approval' | 'procurement' | 'field';
}

export interface MinistryCharter {
  /** Stable identifier (matches app id or archetype-derived id). */
  id: string;
  /** Display label as it appears in the cabinet. */
  label: string;
  /** Mounting strategy: archetype-routed (via SectorInstitutionApp) or
   *  standing agency (its own AppHost dispatch branch). */
  mount: { kind: 'archetype'; archetype: ArchetypeKey } | { kind: 'agency'; appId: string };
  /** Blueprint sections this ministry implements. */
  blueprint: BlueprintCitation[];
  /** Layout grammar — drives distinct identity. */
  grammar: LayoutGrammar;
  /** Has a dedicated design system in apps/<ministry>/design-system/. */
  hasDesignSystem: boolean;
  /** Has a dedicated shell in apps/<ministry>/shell/. */
  hasShell: boolean;
  /** Federation contract declaration. */
  federation: FederationContract;
  /** Declared domain count expected at reference quality. */
  expectedDomains: number;
  /** Current domain count actually shipped. */
  shippedDomains: number;
  /** Executable workflows declared. */
  workflows: WorkflowSurface[];
  /** Constitutional safeguards engine identifier (e.g. JUSTICE_RECORDS_SAFEGUARDS).
   *  An empty string means safeguards are declarative only or absent. */
  safeguardsConstant: string;
  /** Tag set used by the cabinet UI for filter and grouping. */
  tags: ('command' | 'continuity' | 'service' | 'security' | 'economy' | 'environment' | 'social')[];
}

export interface MaturityReport {
  charter: MinistryCharter;
  tier: MaturityTier;
  score: number;          // 0..100
  gaps: string[];         // human-readable list of what's missing for next tier
}
