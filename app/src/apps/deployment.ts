// Deployable Federation Topology.
//
// The deployment boundary is THE INSTITUTION — not individual workflows.
// This declares every institutional application as a true deployable
// sovereign root: the unit a platform (e.g. Vercel root-directory
// selector) targets for independent deployment, scaling, routing and
// permissioning. Operational subsystems live INSIDE these roots, never as
// separate deployments. The platform itself is a separate root (the
// nervous system: orchestration / interoperability / simulation only).
// Pure & deterministic; no React/DOM.

export type DeployKind = 'platform' | 'ministry' | 'branch' | 'agency' | 'citizen' | 'officer';

export interface DeployableRoot {
  /** deployable root id == apps/<id> directory */
  root: string;
  label: string;
  kind: DeployKind;
  /** sovereign domain — <domain>.gov.country */
  domain: string;
  /** institutional subsystems hosted INSIDE this root (not deployments) */
  subsystems: string[];
  /** shared sovereign services consumed across the federation boundary */
  sharedServices: string[];
  isolated: true;
}

const SHARED = [
  'auth', 'telemetry', 'orchestration', 'event-bus', 'ai',
  'resilience-engine', 'interoperability-fabric', 'constitutional-engine', 'audit-ledger',
];

const R = (root: string, label: string, kind: DeployKind, domain: string, subsystems: string[]): DeployableRoot =>
  ({ root, label, kind, domain, subsystems, sharedServices: SHARED, isolated: true });

export const PLATFORM_ROOT: DeployableRoot = {
  root: 'platform', label: 'Sovereign Platform', kind: 'platform', domain: 'platform',
  subsystems: ['national-command', 'orchestration', 'interoperability', 'simulation',
    'constitutional-intelligence', 'resilience', 'federation-management', 'telemetry-aggregation'],
  sharedServices: SHARED, isolated: true,
};

export const DEPLOYABLE_ROOTS: DeployableRoot[] = [
  R('ministry-health', 'Ministry of Health', 'ministry', 'health',
    ['health-command', 'hospital-network', 'doctor-systems', 'patient-systems', 'pharmaceutical', 'disease-intelligence', 'laboratory', 'emergency-medical', 'health-finance', 'regulatory']),
  R('ministry-education', 'Ministry of Education', 'ministry', 'education',
    ['education-command', 'school-network', 'higher-education', 'examinations', 'curriculum', 'teacher-systems', 'student-systems']),
  R('ministry-transport', 'Ministry of Transport', 'ministry', 'transport',
    ['transport-command', 'aviation', 'maritime', 'rail', 'road', 'logistics', 'mobility-services']),
  R('ministry-energy', 'Ministry of Energy', 'ministry', 'energy',
    ['energy-command', 'generation', 'transmission', 'electrification', 'fuel-reserves', 'consumer-systems']),
  R('treasury', 'Treasury & Finance', 'ministry', 'treasury',
    ['fiscal-command', 'national-budget', 'revenue', 'procurement', 'payments-rail', 'debt-reserves', 'anti-corruption-audit', 'inter-ministry-allocation', 'fiscal-forecasting']),
  R('judiciary', 'Judiciary', 'branch', 'judiciary',
    ['constitutional-court', 'supreme-court', 'appeals', 'trial-courts', 'evidence-registry', 'prison-coordination', 'judicial-operations', 'judicial-intelligence']),
  R('legislature', 'Legislature', 'branch', 'parliament',
    ['bills', 'committees', 'voting', 'amendments', 'oversight', 'public-hearings', 'budget-approval', 'constitutional-review', 'parliamentary-scheduling']),
  R('police-command', 'Police Command', 'agency', 'police',
    ['incident-command', 'dispatch', 'patrol-coordination', 'investigations', 'detention', 'intelligence', 'border-escalation', 'evidence-routing']),
  R('immigration', 'Immigration', 'agency', 'immigration',
    ['border-control', 'visas-permits', 'resident-registry', 'enforcement']),
  R('customs', 'Customs', 'agency', 'customs',
    ['clearance', 'tariffs-duties', 'inspection', 'revenue']),
  R('emergency-response', 'Emergency Response', 'agency', 'emergency',
    ['crisis-command', 'dispatch', 'resource-coordination', 'recovery-workflows']),
  R('communications', 'Communications & Digital Infrastructure', 'agency', 'communications',
    ['connectivity-command', 'cyber-resilience', 'identity-spectrum', 'foresight-portal',
      'network-assets', 'sovereign-cloud', 'emergency-broadcast', 'spectrum-management']),
  R('foreign-affairs', 'Foreign Affairs & Geopolitical Relations', 'agency', 'foreign',
    ['geopolitical-command', 'diplomatic-missions', 'treaties-alliances', 'crisis-foresight', 'consular-continuity', 'multilateral-coordination']),
  R('citizen-wallet', 'Citizen Super-Portal', 'citizen', 'citizen',
    ['wallet', 'identity', 'health', 'education', 'welfare', 'taxation', 'justice', 'civic', 'permits', 'records', 'safeguards']),
  R('noc', 'National Operations Centre', 'agency', 'noc',
    ['situation', 'ministries', 'incidents', 'decisions', 'briefing', 'continuity', 'fusion', 'safeguards']),
  R('presidency', 'Presidency · Cabinet Office', 'branch', 'presidency',
    ['cabinet', 'orders', 'resolutions', 'engagements', 'security', 'ministers', 'address', 'transparency', 'continuity', 'safeguards']),
  R('officer-console', 'Officer Console', 'officer', 'officer',
    ['work-queue', 'decisions', 'review']),
];

export function deployableRoots(): DeployableRoot[] {
  return DEPLOYABLE_ROOTS;
}
export function findDeployable(domainOrRoot: string): DeployableRoot | undefined {
  return DEPLOYABLE_ROOTS.find(d => d.root === domainOrRoot || d.domain === domainOrRoot);
}
export function deploymentTopology() {
  return {
    platform: PLATFORM_ROOT,
    institutions: DEPLOYABLE_ROOTS,
    totalRoots: DEPLOYABLE_ROOTS.length + 1,
    boundary: 'institution' as const,
  };
}
