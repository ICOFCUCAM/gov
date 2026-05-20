// apps/police-command/core — Police Command domain registry.
//
// Single source of truth for the Police Command sovereign shell: the
// operational domain taxonomy, per-domain identity (accent + layout
// archetype), federation ownership boundaries (Police is a federated
// module of the Interior OS — it keeps its own shell and source of
// truth), and migration-safe legacy nav-key resolution.

export type PoliceGroupKey =
  | 'command' | 'investigative' | 'forensics' | 'public-order'
  | 'community' | 'internal-affairs' | 'federation' | 'oversight';

export interface PoliceGroup {
  key: PoliceGroupKey;
  label: string;
  purpose: string;
}

export type PoliceArchetype =
  | 'command' | 'runtime' | 'ops' | 'fabric' | 'registry' | 'governance' | 'oversight'
  | 'patrol' | 'casework' | 'forensic' | 'public-order' | 'service' | 'tribunal';

export interface PoliceFederationRef {
  ownerId: string;
  ownerLabel: string;
  ownerRoute: string;
}

export type PoliceSurfaceId =
  // Command
  | 'strategic-command' | 'operational-runtime' | 'dispatch'
  | 'watch-commander' | 'call-stack' | 'tactical-deployment' | 'traffic-enforcement' | 'k9-operations'
  // Investigative
  | 'investigations' | 'intelligence' | 'cyber'
  | 'homicide-caseload' | 'violent-crime' | 'organised-crime-fusion' | 'narcotics-operations' | 'missing-persons'
  // Forensics
  | 'forensics-lab' | 'evidence-custody' | 'crime-scene'
  // Public Order
  | 'protest-posture' | 'public-event-security'
  // Community Services
  | 'victim-support' | 'domestic-incident' | 'youth-safeguarding'
  // Internal Affairs
  | 'internal-affairs' | 'use-of-force-review' | 'complaints-tribunal'
  // Federation
  | 'institutional-federation' | 'facility-network' | 'workflow-engine' | 'citizen-services'
  // Oversight
  | 'constitutional-oversight' | 'audit-chain';

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
  { key: 'command',         label: 'Command Tier',          purpose: 'Strategic authority & live operational execution' },
  { key: 'investigative',   label: 'Investigative Tier',    purpose: 'Major casework, intelligence & specialist units' },
  { key: 'forensics',       label: 'Forensic Tier',         purpose: 'Evidence, laboratories & scene coordination' },
  { key: 'public-order',    label: 'Public Order',          purpose: 'Crowd, assembly & event security' },
  { key: 'community',       label: 'Community Services',    purpose: 'Victim, family & youth-facing service desks' },
  { key: 'internal-affairs',label: 'Internal Affairs',      purpose: 'Conduct review, force discipline & complaints' },
  { key: 'federation',      label: 'Federation & Service',  purpose: 'Interior OS contract, facilities & citizen desk' },
  { key: 'oversight',       label: 'Sovereign Oversight',   purpose: 'Constitutional review & tamper-evident audit' },
];

// Police Command is a federated operational module of the Interior OS.
const INTERIOR: PoliceFederationRef = {
  ownerId: 'ministry-interior', ownerLabel: 'Ministry of Interior (Interior OS)', ownerRoute: '/app/interior',
};

const BLUE = '#5fb0ff'; const SKY = '#5fa8ff'; const VIOLET = '#8a7df0';
const TEAL = '#45c0c8'; const GREEN = '#54d08f'; const GOLD = '#d8a23a';
const RUST = '#d8754a'; const ROSE = '#d86a8c'; const CITRINE = '#cfb84a';
const SLATE = '#7a8fa6';

export const POLICE_DOMAINS: PoliceDomain[] = [
  // ── Command Tier ──────────────────────────────────────────────────
  { key: 'strategic-command',   label: 'Strategic Command',    group: 'command',       accent: BLUE,    archetype: 'command', surface: 'strategic-command',   federation: null,     identity: 'National civil-stability command authority' },
  { key: 'operational-runtime', label: 'Operational Runtime',  group: 'command',       accent: BLUE,    archetype: 'runtime', surface: 'operational-runtime', federation: null,     identity: 'Live incident execution engine' },
  { key: 'dispatch',            label: 'Dispatch & Deployment',group: 'command',       accent: SKY,     archetype: 'ops',     surface: 'dispatch',            federation: null,     identity: 'Patrol division & field deployment' },
  { key: 'watch-commander',     label: 'Watch Commander',      group: 'command',       accent: SKY,     archetype: 'command', surface: 'watch-commander',     federation: null,     identity: 'Live shift authority & posture call' },
  { key: 'call-stack',          label: 'Call Stack',           group: 'command',       accent: SKY,     archetype: 'runtime', surface: 'call-stack',          federation: null,     identity: 'National emergency call triage queue' },
  { key: 'tactical-deployment', label: 'Tactical Deployment',  group: 'command',       accent: BLUE,    archetype: 'patrol',  surface: 'tactical-deployment', federation: null,     identity: 'Specialist tactical & SWAT readiness' },
  { key: 'traffic-enforcement', label: 'Traffic Enforcement',  group: 'command',       accent: SKY,     archetype: 'patrol',  surface: 'traffic-enforcement', federation: null,     identity: 'National traffic policing & corridor flow' },
  { key: 'k9-operations',       label: 'K-9 Operations',       group: 'command',       accent: BLUE,    archetype: 'patrol',  surface: 'k9-operations',       federation: null,     identity: 'Canine detection & tracking unit' },
  // ── Investigative Tier ────────────────────────────────────────────
  { key: 'investigations',      label: 'Investigations',       group: 'investigative', accent: SKY,     archetype: 'ops',     surface: 'investigations',      federation: null,     identity: 'Major-case investigative casework' },
  { key: 'intelligence',        label: 'Intelligence Fusion',  group: 'investigative', accent: VIOLET,  archetype: 'ops',     surface: 'intelligence',        federation: null,     identity: 'Internal-security intelligence fusion' },
  { key: 'cyber',               label: 'Cybercrime',           group: 'investigative', accent: VIOLET,  archetype: 'ops',     surface: 'cyber',               federation: null,     identity: 'Cyber threat & digital-crime unit' },
  { key: 'homicide-caseload',   label: 'Homicide Caseload',    group: 'investigative', accent: VIOLET,  archetype: 'casework',surface: 'homicide-caseload',   federation: null,     identity: 'Homicide & unexplained-death docket' },
  { key: 'violent-crime',       label: 'Violent Crime Board',  group: 'investigative', accent: VIOLET,  archetype: 'casework',surface: 'violent-crime',       federation: null,     identity: 'Assault, robbery & weapons casework' },
  { key: 'organised-crime-fusion', label: 'Organised Crime Fusion', group: 'investigative', accent: VIOLET, archetype: 'casework', surface: 'organised-crime-fusion', federation: null, identity: 'Trans-regional organised-crime fusion cell' },
  { key: 'narcotics-operations',label: 'Narcotics Operations', group: 'investigative', accent: VIOLET,  archetype: 'casework',surface: 'narcotics-operations',federation: null,     identity: 'Narcotics interdiction & seizures' },
  { key: 'missing-persons',     label: 'Missing Persons',      group: 'investigative', accent: SKY,     archetype: 'casework',surface: 'missing-persons',     federation: null,     identity: 'Missing-persons registry & Amber alerts' },
  // ── Forensic Tier ─────────────────────────────────────────────────
  { key: 'forensics-lab',       label: 'Forensics Laboratory', group: 'forensics',     accent: CITRINE, archetype: 'forensic',surface: 'forensics-lab',       federation: null,     identity: 'DNA, ballistics & toxicology backlog' },
  { key: 'evidence-custody',    label: 'Evidence Custody',     group: 'forensics',     accent: CITRINE, archetype: 'registry',surface: 'evidence-custody',    federation: null,     identity: 'Chain-of-custody vault & seal log' },
  { key: 'crime-scene',         label: 'Crime Scene Coordination', group: 'forensics', accent: CITRINE, archetype: 'forensic',surface: 'crime-scene',         federation: null,     identity: 'Scene-of-crime SOC dispatch & integrity' },
  // ── Public Order ──────────────────────────────────────────────────
  { key: 'protest-posture',     label: 'Protest Posture',      group: 'public-order',  accent: RUST,    archetype: 'public-order', surface: 'protest-posture', federation: null, identity: 'Assembly facilitation & crowd posture' },
  { key: 'public-event-security', label: 'Public Event Security', group: 'public-order', accent: RUST, archetype: 'public-order', surface: 'public-event-security', federation: null, identity: 'Stadium, parade & VIP security' },
  // ── Community Services ────────────────────────────────────────────
  { key: 'victim-support',      label: 'Victim Support',       group: 'community',     accent: ROSE,    archetype: 'service', surface: 'victim-support',      federation: null,     identity: 'Trauma-informed victim & witness desk' },
  { key: 'domestic-incident',   label: 'Domestic Incident Response', group: 'community', accent: ROSE,  archetype: 'service', surface: 'domestic-incident',   federation: null,     identity: 'Family-violence intervention & safety plan' },
  { key: 'youth-safeguarding',  label: 'Youth Safeguarding',   group: 'community',     accent: ROSE,    archetype: 'service', surface: 'youth-safeguarding',  federation: null,     identity: 'Child & youth protection liaison' },
  // ── Internal Affairs ──────────────────────────────────────────────
  { key: 'internal-affairs',    label: 'Internal Affairs',     group: 'internal-affairs', accent: GOLD, archetype: 'tribunal',surface: 'internal-affairs',    federation: null,     identity: 'Officer-conduct investigation bureau' },
  { key: 'use-of-force-review', label: 'Use-of-Force Review',  group: 'internal-affairs', accent: GOLD, archetype: 'tribunal',surface: 'use-of-force-review', federation: null,     identity: 'Proportionality review of every UoF incident' },
  { key: 'complaints-tribunal', label: 'Complaints Tribunal',  group: 'internal-affairs', accent: GOLD, archetype: 'tribunal',surface: 'complaints-tribunal', federation: null,     identity: 'Independent civilian-complaint tribunal' },
  // ── Federation & Service ──────────────────────────────────────────
  { key: 'institutional-federation', label: 'Institutional Federation', group: 'federation', accent: TEAL, archetype: 'fabric', surface: 'institutional-federation', federation: INTERIOR, identity: 'Federation contract with the Interior OS' },
  { key: 'facility-network',    label: 'Facility Network',     group: 'federation',    accent: TEAL,    archetype: 'registry',surface: 'facility-network',    federation: null,     identity: 'Stations, rosters & record custody' },
  { key: 'workflow-engine',     label: 'Workflow Engine',      group: 'federation',    accent: GREEN,   archetype: 'fabric',  surface: 'workflow-engine',     federation: null,     identity: 'Cross-domain mission orchestration' },
  { key: 'citizen-services',    label: 'Citizen Services',     group: 'federation',    accent: GREEN,   archetype: 'governance', surface: 'citizen-services', federation: null,     identity: 'Public-facing police service desk' },
  // ── Sovereign Oversight ───────────────────────────────────────────
  { key: 'constitutional-oversight', label: 'Constitutional Oversight', group: 'oversight', accent: SLATE, archetype: 'oversight', surface: 'constitutional-oversight', federation: null, identity: 'Mandate, emergency-power & rights review' },
  { key: 'audit-chain',         label: 'Sovereign Audit Chain',group: 'oversight',     accent: SLATE,   archetype: 'registry',surface: 'audit-chain',         federation: null,     identity: 'Tamper-evident command audit ledger' },
];

// Migration-safe compatibility — legacy agency nav keys still resolve.
export const POLICE_LEGACY_KEYS: Record<string, string> = {
  incident: 'strategic-command',
  command: 'strategic-command',
  dispatch: 'dispatch',
  patrol: 'dispatch',
  investigations: 'investigations',
  evidence: 'evidence-custody',
  intelligence: 'intelligence',
  cyber: 'cyber',
  forensics: 'forensics-lab',
  custody: 'evidence-custody',
  ia: 'internal-affairs',
  complaints: 'complaints-tribunal',
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
