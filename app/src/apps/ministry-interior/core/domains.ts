// apps/ministry-interior/core — Interior domain registry.
//
// Single source of truth for the Ministry of Interior operating system:
// the sovereign domain taxonomy, per-domain identity (accent + layout
// archetype), federation ownership boundaries, and migration-safe legacy
// key compatibility. Pure data — no React, no engine — so the navigation
// framework, shell and manifest all derive from one normalized model.

export type DomainGroupKey = 'command' | 'runtime' | 'procedural' | 'economy' | 'temporal' | 'constitutional' | 'civil' | 'federated' | 'infra';

export interface DomainGroup {
  key: DomainGroupKey;
  label: string;
  purpose: string;
}

// Layout archetypes give each domain a distinct visual hierarchy and
// information architecture instead of "same dashboard, different label".
export type LayoutArchetype =
  | 'command' | 'registry' | 'analytics' | 'governance' | 'ops' | 'workflow' | 'fabric' | 'runtime' | 'oversight';

// A federated domain's source of truth lives in another sovereign shell.
// Interior orchestrates and monitors it — it never owns or replaces it.
export interface FederationRef {
  ownerId: string;
  ownerLabel: string;
  ownerRoute: string;
}

export type SurfaceId =
  | 'national-overview' | 'interior-command' | 'civil-registry' | 'population'
  | 'permits' | 'regional' | 'municipal' | 'councils' | 'corrections' | 'workflows'
  | 'police' | 'immigration' | 'emergency' | 'intelligence' | 'cyber' | 'investigations'
  | 'event-bus' | 'fabric' | 'audit' | 'reports'
  | 'national-control-board' | 'transaction-observability' | 'anti-corruption'
  | 'separation-of-powers' | 'sovereign-authority' | 'oversight-mirroring' | 'citizen-accountability'
  | 'workflow-orchestration' | 'appeals-rights' | 'jurisdiction-delegation' | 'constitutional-interruption'
  | 'institutional-economy' | 'pressure-propagation' | 'resilience-continuity' | 'corruption-pressure'
  | 'temporal-forecast' | 'early-warning' | 'continuity-forecast' | 'temporal-corruption';

export interface InteriorDomain {
  key: string;
  label: string;
  group: DomainGroupKey;
  accent: string;
  archetype: LayoutArchetype;
  surface: SurfaceId;
  /** Present iff the domain is federated from another sovereign shell. */
  federation: FederationRef | null;
  /** One-line operational identity shown in the domain header. */
  identity: string;
}

export const GROUPS: DomainGroup[] = [
  { key: 'command', label: 'National Command', purpose: 'Sovereign internal-governance apex' },
  { key: 'runtime', label: 'Sovereign Runtime', purpose: 'National observability, deadline enforcement & anti-corruption' },
  { key: 'procedural', label: 'Procedural Execution', purpose: 'Sovereign workflow chains, appeals, jurisdiction & continuity' },
  { key: 'economy', label: 'Institutional Economy', purpose: 'Finite capacity, strain propagation, resilience & corruption pressure' },
  { key: 'temporal', label: 'Temporal Intelligence', purpose: 'Forecasting, early warning, anticipatory continuity' },
  { key: 'constitutional', label: 'Constitutional Governance', purpose: 'Separation of powers, multi-key authority & citizen rights' },
  { key: 'civil', label: 'Civil Governance', purpose: 'Civil administration & territorial governance' },
  { key: 'federated', label: 'Federated Operations', purpose: 'Embedded sovereign operational shells' },
  { key: 'infra', label: 'Sovereign Infrastructure', purpose: 'Cross-shell fabric, audit & analytics' },
];

const POLICE: FederationRef = { ownerId: 'police-command', ownerLabel: 'Police Command', ownerRoute: '/app/police' };

export const DOMAINS: InteriorDomain[] = [
  // ── National Command ──────────────────────────────────────────────
  { key: 'national-overview', label: 'National Overview', group: 'command', accent: '#5fb0ff', archetype: 'command', surface: 'national-overview', federation: null, identity: 'National internal-governance situational picture' },
  { key: 'security-command', label: 'Security Command', group: 'command', accent: '#5fb0ff', archetype: 'command', surface: 'interior-command', federation: null, identity: 'Internal-security coordination authority' },
  // ── Sovereign Runtime ─────────────────────────────────────────────
  { key: 'national-control-board', label: 'National Control Board', group: 'runtime', accent: '#e0673a', archetype: 'command', surface: 'national-control-board', federation: null, identity: 'National process observability & execution governance' },
  { key: 'transaction-observability', label: 'Transaction Observability', group: 'runtime', accent: '#45c0c8', archetype: 'runtime', surface: 'transaction-observability', federation: null, identity: 'Nationally observable citizen-transaction runtime' },
  { key: 'anti-corruption', label: 'Anti-Corruption Runtime', group: 'runtime', accent: '#d8a23a', archetype: 'runtime', surface: 'anti-corruption', federation: null, identity: 'Deliberate-delay & bribery-risk enforcement layer' },
  // ── Procedural Execution ──────────────────────────────────────────
  { key: 'workflow-orchestration', label: 'Workflow Orchestration', group: 'procedural', accent: '#45c0c8', archetype: 'runtime', surface: 'workflow-orchestration', federation: null, identity: 'Sovereign execution-chain rails' },
  { key: 'appeals-rights', label: 'Appeals & Rights', group: 'procedural', accent: '#54d08f', archetype: 'governance', surface: 'appeals-rights', federation: null, identity: 'Lawful citizen recourse & review timelines' },
  { key: 'jurisdiction-delegation', label: 'Jurisdiction & Delegation', group: 'procedural', accent: '#d8a23a', archetype: 'fabric', surface: 'jurisdiction-delegation', federation: null, identity: 'Inter-jurisdiction transfer & delegated authority' },
  { key: 'constitutional-interruption', label: 'Constitutional Interruption', group: 'procedural', accent: '#8a7df0', archetype: 'oversight', surface: 'constitutional-interruption', federation: null, identity: 'Judicial halt, continuity & bounded AI' },
  // ── Institutional Economy ─────────────────────────────────────────
  { key: 'institutional-economy', label: 'Institutional Economy', group: 'economy', accent: '#e0673a', archetype: 'runtime', surface: 'institutional-economy', federation: null, identity: 'Finite-capacity agency resource runtime' },
  { key: 'pressure-propagation', label: 'Pressure Propagation', group: 'economy', accent: '#e0673a', archetype: 'fabric', surface: 'pressure-propagation', federation: null, identity: 'National strain mesh & regional propagation' },
  { key: 'resilience-continuity', label: 'Resilience & Continuity', group: 'economy', accent: '#5fb0ff', archetype: 'oversight', surface: 'resilience-continuity', federation: null, identity: 'Resilience modes & sovereign stabilization' },
  { key: 'corruption-pressure', label: 'Corruption Pressure', group: 'economy', accent: '#d8a23a', archetype: 'runtime', surface: 'corruption-pressure', federation: null, identity: 'Lawful overload vs suspicious obstruction' },
  // ── Temporal Intelligence ─────────────────────────────────────────
  { key: 'temporal-forecast', label: 'Temporal Forecast', group: 'temporal', accent: '#45c0c8', archetype: 'runtime', surface: 'temporal-forecast', federation: null, identity: 'Seasonal congestion & pressure trajectories' },
  { key: 'early-warning', label: 'National Early-Warning', group: 'temporal', accent: '#e0673a', archetype: 'oversight', surface: 'early-warning', federation: null, identity: 'Collapse-signal detection before failure' },
  { key: 'continuity-forecast', label: 'Continuity Forecast', group: 'temporal', accent: '#5fb0ff', archetype: 'oversight', surface: 'continuity-forecast', federation: null, identity: 'Anticipatory continuity & pre-emptive orchestration' },
  { key: 'temporal-corruption', label: 'Temporal Corruption', group: 'temporal', accent: '#d8a23a', archetype: 'runtime', surface: 'temporal-corruption', federation: null, identity: 'Corruption emergence across time' },
  // ── Constitutional Governance ─────────────────────────────────────
  { key: 'separation-of-powers', label: 'Separation of Powers', group: 'constitutional', accent: '#8a7df0', archetype: 'oversight', surface: 'separation-of-powers', federation: null, identity: 'Federated branches & bounded powers' },
  { key: 'sovereign-authority', label: 'Sovereign Authority', group: 'constitutional', accent: '#8a7df0', archetype: 'oversight', surface: 'sovereign-authority', federation: null, identity: 'Multi-key distributed authorization runtime' },
  { key: 'oversight-mirroring', label: 'Oversight Mirroring', group: 'constitutional', accent: '#5fb0ff', archetype: 'oversight', surface: 'oversight-mirroring', federation: null, identity: 'Immutable independent audit mirroring' },
  { key: 'citizen-accountability', label: 'Citizen Accountability', group: 'constitutional', accent: '#54d08f', archetype: 'governance', surface: 'citizen-accountability', federation: null, identity: 'Redacted citizen processing-rights view' },
  // ── Civil Governance ──────────────────────────────────────────────
  { key: 'civil-registry', label: 'Civil Registry & ID', group: 'civil', accent: '#54d08f', archetype: 'registry', surface: 'civil-registry', federation: null, identity: 'Sovereign civil-identity backbone' },
  { key: 'population', label: 'Population Analytics', group: 'civil', accent: '#54d08f', archetype: 'analytics', surface: 'population', federation: null, identity: 'National statistics & demographic intelligence' },
  { key: 'permits', label: 'Permits & Licensing', group: 'civil', accent: '#d8a23a', archetype: 'governance', surface: 'permits', federation: null, identity: 'Internal permits & licensing administration' },
  { key: 'regional', label: 'Regional Administration', group: 'civil', accent: '#54d08f', archetype: 'governance', surface: 'regional', federation: null, identity: 'Territorial governance & coordination' },
  { key: 'municipal', label: 'Municipal Systems', group: 'civil', accent: '#54d08f', archetype: 'governance', surface: 'municipal', federation: { ownerId: 'ministry-transport', ownerLabel: 'Ministry of Transport', ownerRoute: '/app/transport' }, identity: 'Municipal service federation layer' },
  { key: 'councils', label: 'Local Councils', group: 'civil', accent: '#54d08f', archetype: 'governance', surface: 'councils', federation: { ownerId: 'legislature', ownerLabel: 'Legislature', ownerRoute: '/app/parliament' }, identity: 'Sub-national council federation' },
  { key: 'corrections', label: 'Prisons & Corrections', group: 'civil', accent: '#c0556a', archetype: 'ops', surface: 'corrections', federation: { ownerId: 'ministry-justice', ownerLabel: 'Ministry of Justice', ownerRoute: '/app/justice' }, identity: 'Custodial estate federation' },
  { key: 'workflows', label: 'Administrative Workflows', group: 'civil', accent: '#54d08f', archetype: 'workflow', surface: 'workflows', federation: null, identity: 'Cross-domain mission & workflow orchestration' },
  // ── Federated Operations (source of truth stays in each shell) ────
  { key: 'police', label: 'Police Command', group: 'federated', accent: '#5fa8ff', archetype: 'ops', surface: 'police', federation: POLICE, identity: 'Civil-stability operational command' },
  { key: 'immigration', label: 'Immigration & Borders', group: 'federated', accent: '#5fa8ff', archetype: 'ops', surface: 'immigration', federation: { ownerId: 'immigration', ownerLabel: 'Immigration', ownerRoute: '/app/immigration' }, identity: 'Frontier & entry control' },
  { key: 'emergency', label: 'Emergency Operations', group: 'federated', accent: '#e0673a', archetype: 'ops', surface: 'emergency', federation: { ownerId: 'emergency-response', ownerLabel: 'Emergency Response', ownerRoute: '/app/emergency' }, identity: 'Crisis command & recovery' },
  { key: 'intelligence', label: 'Intelligence Fusion', group: 'federated', accent: '#8a7df0', archetype: 'ops', surface: 'intelligence', federation: POLICE, identity: 'Internal-security intelligence fusion' },
  { key: 'cyber', label: 'Cybercrime', group: 'federated', accent: '#8a7df0', archetype: 'ops', surface: 'cyber', federation: POLICE, identity: 'Cyber threat & digital-crime unit' },
  { key: 'investigations', label: 'Investigations', group: 'federated', accent: '#5fa8ff', archetype: 'ops', surface: 'investigations', federation: POLICE, identity: 'Major-case investigative casework' },
  // ── Sovereign Infrastructure ──────────────────────────────────────
  { key: 'event-bus', label: 'Event Bus Monitor', group: 'infra', accent: '#45c0c8', archetype: 'fabric', surface: 'event-bus', federation: null, identity: 'Sovereign event-mesh telemetry' },
  { key: 'fabric', label: 'Interoperability Fabric', group: 'infra', accent: '#45c0c8', archetype: 'fabric', surface: 'fabric', federation: null, identity: 'Cross-institution contract fabric' },
  { key: 'audit', label: 'Audit & Compliance', group: 'infra', accent: '#d8a23a', archetype: 'registry', surface: 'audit', federation: null, identity: 'Tamper-evident audit & chain integrity' },
  { key: 'reports', label: 'Reports & Analytics', group: 'infra', accent: '#54d08f', archetype: 'analytics', surface: 'reports', federation: null, identity: 'Consolidated Interior reporting' },
];

// Migration-safe compatibility: legacy generic-sector / blueprint nav keys
// resolve to the new normalized domain so existing deep links never break.
export const LEGACY_KEYS: Record<string, string> = {
  command: 'security-command',
  identity: 'civil-registry',
  registry: 'civil-registry',
  citizen: 'civil-registry',
  population: 'population',
  border: 'immigration',
  licensing: 'permits',
  coordination: 'regional',
  intelligence: 'intelligence',
};

export const DEFAULT_DOMAIN = DOMAINS[0]!.key;

const BY_KEY = new Map(DOMAINS.map(d => [d.key, d]));

/** Resolve any incoming nav key (new or legacy) to a real domain. */
export function resolveDomain(key: string | null | undefined): InteriorDomain {
  if (key && BY_KEY.has(key)) return BY_KEY.get(key)!;
  const legacy = key ? LEGACY_KEYS[key] : undefined;
  if (legacy && BY_KEY.has(legacy)) return BY_KEY.get(legacy)!;
  return BY_KEY.get(DEFAULT_DOMAIN)!;
}

/** Flat navigation model consumed by the app manifest / shell rail. */
export function interiorNav(): { key: string; label: string }[] {
  return DOMAINS.map(d => ({ key: d.key, label: d.label }));
}

/** Domains grouped for the dedicated navigation framework. */
export function interiorNavGroups(): { group: DomainGroup; domains: InteriorDomain[] }[] {
  return GROUPS.map(group => ({ group, domains: DOMAINS.filter(d => d.group === group.key) }));
}
