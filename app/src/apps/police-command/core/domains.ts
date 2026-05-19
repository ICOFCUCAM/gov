// apps/police-command/core — Police Command domain registry.
//
// Single source of truth for the Police Command sovereign shell: the
// operational domain taxonomy, per-domain identity (accent + layout
// archetype), federation ownership boundaries (Police is a federated
// module of the Interior OS — it keeps its own shell and source of
// truth), and migration-safe legacy nav-key resolution.

export type PoliceGroupKey = 'command' | 'investigative' | 'federation' | 'oversight';

export interface PoliceGroup {
  key: PoliceGroupKey;
  label: string;
  purpose: string;
}

export type PoliceArchetype =
  | 'command' | 'runtime' | 'ops' | 'fabric' | 'registry' | 'governance' | 'oversight';

export interface PoliceFederationRef {
  ownerId: string;
  ownerLabel: string;
  ownerRoute: string;
}

export type PoliceSurfaceId =
  | 'strategic-command' | 'operational-runtime' | 'dispatch' | 'investigations'
  | 'intelligence' | 'cyber' | 'institutional-federation' | 'facility-network'
  | 'workflow-engine' | 'citizen-services' | 'constitutional-oversight' | 'audit-chain';

export interface PoliceDomain {
  key: string;
  label: string;
  group: PoliceGroupKey;
  accent: string;
  archetype: PoliceArchetype;
  surface: PoliceSurfaceId;
  federation: PoliceFederationRef | null;
  identity: string;
}

export const POLICE_GROUPS: PoliceGroup[] = [
  { key: 'command', label: 'Command Tier', purpose: 'Strategic authority & operational execution' },
  { key: 'investigative', label: 'Investigative Tier', purpose: 'Casework, intelligence & cyber' },
  { key: 'federation', label: 'Federation & Service', purpose: 'Institutional chain, facilities & citizens' },
  { key: 'oversight', label: 'Sovereign Oversight', purpose: 'Constitutional & audit accountability' },
];

// Police Command is a federated operational module of the Interior OS.
const INTERIOR: PoliceFederationRef = {
  ownerId: 'ministry-interior', ownerLabel: 'Ministry of Interior (Interior OS)', ownerRoute: '/app/interior',
};

export const POLICE_DOMAINS: PoliceDomain[] = [
  // ── Command Tier ──────────────────────────────────────────────────
  { key: 'strategic-command', label: 'Strategic Command', group: 'command', accent: '#5fb0ff', archetype: 'command', surface: 'strategic-command', federation: null, identity: 'National civil-stability command authority' },
  { key: 'operational-runtime', label: 'Operational Runtime', group: 'command', accent: '#5fb0ff', archetype: 'runtime', surface: 'operational-runtime', federation: null, identity: 'Live incident execution engine' },
  { key: 'dispatch', label: 'Dispatch & Deployment', group: 'command', accent: '#5fa8ff', archetype: 'ops', surface: 'dispatch', federation: null, identity: 'Patrol division & field deployment' },
  // ── Investigative Tier ────────────────────────────────────────────
  { key: 'investigations', label: 'Investigations', group: 'investigative', accent: '#5fa8ff', archetype: 'ops', surface: 'investigations', federation: null, identity: 'Major-case investigative casework' },
  { key: 'intelligence', label: 'Intelligence Fusion', group: 'investigative', accent: '#8a7df0', archetype: 'ops', surface: 'intelligence', federation: null, identity: 'Internal-security intelligence fusion' },
  { key: 'cyber', label: 'Cybercrime', group: 'investigative', accent: '#8a7df0', archetype: 'ops', surface: 'cyber', federation: null, identity: 'Cyber threat & digital-crime unit' },
  // ── Federation & Service ──────────────────────────────────────────
  { key: 'institutional-federation', label: 'Institutional Federation', group: 'federation', accent: '#45c0c8', archetype: 'fabric', surface: 'institutional-federation', federation: INTERIOR, identity: 'Federation contract with the Interior OS' },
  { key: 'facility-network', label: 'Facility Network', group: 'federation', accent: '#45c0c8', archetype: 'registry', surface: 'facility-network', federation: null, identity: 'Stations, rosters & record custody' },
  { key: 'workflow-engine', label: 'Workflow Engine', group: 'federation', accent: '#54d08f', archetype: 'fabric', surface: 'workflow-engine', federation: null, identity: 'Cross-domain mission orchestration' },
  { key: 'citizen-services', label: 'Citizen Services', group: 'federation', accent: '#54d08f', archetype: 'governance', surface: 'citizen-services', federation: null, identity: 'Public-facing police service desk' },
  // ── Sovereign Oversight ───────────────────────────────────────────
  { key: 'constitutional-oversight', label: 'Constitutional Oversight', group: 'oversight', accent: '#d8a23a', archetype: 'oversight', surface: 'constitutional-oversight', federation: null, identity: 'Mandate, emergency-power & rights review' },
  { key: 'audit-chain', label: 'Sovereign Audit Chain', group: 'oversight', accent: '#d8a23a', archetype: 'registry', surface: 'audit-chain', federation: null, identity: 'Tamper-evident command audit ledger' },
];

// Migration-safe compatibility — legacy agency nav keys still resolve.
export const POLICE_LEGACY_KEYS: Record<string, string> = {
  incident: 'strategic-command',
  command: 'strategic-command',
  dispatch: 'dispatch',
  patrol: 'dispatch',
  investigations: 'investigations',
  evidence: 'investigations',
  intelligence: 'intelligence',
  cyber: 'cyber',
};

export const POLICE_DEFAULT_DOMAIN = POLICE_DOMAINS[0]!.key;

const BY_KEY = new Map(POLICE_DOMAINS.map(d => [d.key, d]));

export function resolvePoliceDomain(key: string | null | undefined): PoliceDomain {
  if (key && BY_KEY.has(key)) return BY_KEY.get(key)!;
  const legacy = key ? POLICE_LEGACY_KEYS[key] : undefined;
  if (legacy && BY_KEY.has(legacy)) return BY_KEY.get(legacy)!;
  return BY_KEY.get(POLICE_DEFAULT_DOMAIN)!;
}

export function policeNav(): { key: string; label: string }[] {
  return POLICE_DOMAINS.map(d => ({ key: d.key, label: d.label }));
}

export function policeNavGroups(): { group: PoliceGroup; domains: PoliceDomain[] }[] {
  return POLICE_GROUPS.map(group => ({ group, domains: POLICE_DOMAINS.filter(d => d.group === group.key) }));
}
