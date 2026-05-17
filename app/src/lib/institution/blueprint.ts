// Institutional Blueprint Factory.
//
// A ministry / branch is NOT a dashboard. It is a sovereign institutional
// operating ecosystem instantiated from a deployable archetype. This module
// is the factory: given an institution kind it returns the FULL system
// topology — command, network, citizen, personnel, intelligence, registry,
// regulatory, finance, emergency, logistics, audit and interoperability
// systems — organised into operating groups. Activation instantiates the
// ecosystem; before activation the systems are blueprinted but not yet
// provisioned. Pure & deterministic; no React/DOM.

import type { ArchetypeKey, Ministry } from '@/lib/api/types';
import { seed, wave } from '@/lib/telemetry';

export type SystemKind =
  | 'command' | 'network' | 'registry' | 'workflow' | 'citizen' | 'personnel'
  | 'intelligence' | 'analytics' | 'finance' | 'regulatory' | 'emergency'
  | 'logistics' | 'audit' | 'interop' | 'field';

export type InstitutionKind = ArchetypeKey | 'LEGISLATURE' | 'JUDICIARY';

export interface BlueprintSystem { name: string; kind: SystemKind }
export interface BlueprintGroup { key: string; name: string; purpose: string; systems: BlueprintSystem[] }

const G = (key: string, name: string, purpose: string, systems: BlueprintSystem[]): BlueprintGroup =>
  ({ key, name, purpose, systems });
const S = (name: string, kind: SystemKind): BlueprintSystem => ({ name, kind });

// ── Archetype blueprints — the institutional ecosystems generated on
//    activation. Each archetype is a real sovereign institution, not a page.
const BP: Record<InstitutionKind, BlueprintGroup[]> = {
  HEALTH: [
    G('command', 'Health Command', 'National healthcare command authority', [
      S('National healthcare command centre', 'command'),
      S('Outbreak intelligence', 'intelligence'),
      S('Emergency medicine coordination', 'emergency'),
    ]),
    G('hospitals', 'Hospital Network', 'Tertiary, district and field care', [
      S('Hospitals', 'network'), S('Clinics', 'network'),
      S('ICU & critical-care systems', 'network'), S('Operating theatres', 'network'),
      S('Emergency wards', 'emergency'),
    ]),
    G('doctor', 'Doctor Systems', 'Clinical workforce & care workflows', [
      S('Doctor portal', 'personnel'), S('Diagnosis workflows', 'workflow'),
      S('Patient intake', 'workflow'), S('Treatment workflows', 'workflow'),
      S('Referral system', 'workflow'),
    ]),
    G('patient', 'Patient Systems', 'Citizen-facing health services', [
      S('Citizen health app', 'citizen'), S('Medical records', 'registry'),
      S('Appointments', 'citizen'), S('Prescriptions', 'citizen'),
      S('Vaccination records', 'registry'),
    ]),
    G('disease', 'Disease Intelligence', 'Epidemiology & population health', [
      S('Epidemiology engine', 'intelligence'), S('Outbreak tracking', 'intelligence'),
      S('Diagnostic aggregation', 'analytics'), S('Demographic analytics', 'analytics'),
    ]),
    G('lab', 'Laboratory Systems', 'Pathology & testing networks', [
      S('Pathology', 'network'), S('Testing & results', 'workflow'),
      S('Laboratory network', 'network'),
    ]),
    G('pharma', 'Pharmaceutical Systems', 'Medicine supply & dispensing', [
      S('Pharmacies', 'network'), S('Medicine inventories', 'logistics'),
      S('Prescription validation', 'workflow'), S('Medicine supply chain', 'logistics'),
    ]),
    G('finance', 'Health Finance', 'Insurance, claims & procurement', [
      S('Health insurance', 'finance'), S('Procurement', 'finance'),
      S('Budgeting', 'finance'), S('Claims', 'workflow'),
    ]),
    G('regulatory', 'Regulatory Systems', 'Licensing & accreditation', [
      S('Facility licensing', 'regulatory'), S('Accreditation', 'regulatory'),
      S('Compliance', 'regulatory'),
    ]),
    G('emergency', 'Emergency Medical Systems', 'Pre-hospital & disaster medicine', [
      S('Ambulance telemetry', 'field'), S('Emergency dispatch', 'emergency'),
      S('Disaster medicine', 'emergency'),
    ]),
    G('situation', 'National Situation Room', 'Whole-of-nation health command picture', [
      S('National telemetry', 'command'), S('Healthcare grid', 'network'),
      S('Crisis propagation', 'intelligence'),
    ]),
  ],
  FINANCE: [
    G('command', 'Fiscal Command', 'Sovereign fiscal authority', [
      S('Treasury command centre', 'command'), S('Fiscal intelligence', 'intelligence'),
      S('Macro-stability monitor', 'analytics'),
    ]),
    G('revenue', 'Revenue Systems', 'Taxation & customs', [
      S('Taxation engine', 'workflow'), S('Customs & duties', 'workflow'),
      S('Taxpayer registry', 'registry'), S('Revenue analytics', 'analytics'),
    ]),
    G('budget', 'Budget Systems', 'Appropriation & execution', [
      S('Budget formulation', 'workflow'), S('Appropriation ledger', 'registry'),
      S('Expenditure control', 'finance'), S('Public-debt management', 'finance'),
    ]),
    G('procurement', 'Procurement Systems', 'Public procurement & contracts', [
      S('Procurement boards', 'workflow'), S('Contract registry', 'registry'),
      S('Vendor management', 'workflow'),
    ]),
    G('rails', 'Banking Rails', 'Disbursement & settlement', [
      S('Treasury single account', 'finance'), S('Disbursement channels', 'logistics'),
      S('Settlement & reconciliation', 'finance'),
    ]),
    G('citizen', 'Citizen Finance', 'Public-facing fiscal services', [
      S('Taxpayer portal', 'citizen'), S('Payments', 'citizen'),
      S('Refunds & claims', 'workflow'),
    ]),
    G('audit', 'Fiscal Assurance', 'Integrity & oversight', [
      S('Audit trail', 'audit'), S('Anti-fraud intelligence', 'intelligence'),
      S('Compliance', 'regulatory'),
    ]),
  ],
  EDUCATION: [
    G('command', 'Education Command', 'National education authority', [
      S('Education command centre', 'command'), S('System analytics', 'analytics'),
    ]),
    G('schools', 'School Network', 'Basic & secondary institutions', [
      S('Schools', 'network'), S('Special-needs institutions', 'network'),
      S('Facilities', 'network'),
    ]),
    G('higher', 'Higher Education', 'Universities & colleges', [
      S('Universities', 'network'), S('Teacher colleges', 'network'),
      S('Accreditation', 'regulatory'),
    ]),
    G('exams', 'Examination Systems', 'Assessment & certification', [
      S('Examination centres', 'network'), S('Exam workflows', 'workflow'),
      S('Certification registry', 'registry'),
    ]),
    G('curriculum', 'Curriculum Systems', 'Standards & content', [
      S('Curriculum units', 'workflow'), S('Content standards', 'regulatory'),
    ]),
    G('teacher', 'Teacher Systems', 'Educator workforce', [
      S('Teacher portal', 'personnel'), S('Posting & transfers', 'workflow'),
      S('Payroll integration', 'finance'),
    ]),
    G('student', 'Student Systems', 'Learner-facing services', [
      S('Student portal', 'citizen'), S('Enrolment', 'workflow'),
      S('Scholarships', 'finance'), S('Learner registry', 'registry'),
    ]),
  ],
  AGRICULTURE: [
    G('command', 'Agriculture Command', 'Food-security authority', [
      S('Agriculture command centre', 'command'), S('Food-security intelligence', 'intelligence'),
    ]),
    G('crop', 'Crop Systems', 'Production & advisory', [
      S('Crop monitoring', 'field'), S('Extension advisory', 'workflow'),
      S('Pest & disease surveillance', 'intelligence'),
    ]),
    G('livestock', 'Livestock Systems', 'Animal production & health', [
      S('Livestock registry', 'registry'), S('Veterinary services', 'network'),
      S('Plant-health labs', 'network'),
    ]),
    G('irrigation', 'Irrigation Systems', 'Water for production', [
      S('Irrigation schemes', 'network'), S('Water allocation', 'workflow'),
    ]),
    G('market', 'Commodity Intelligence', 'Markets & price stability', [
      S('Market & price analytics', 'analytics'), S('Aggregation hubs', 'logistics'),
      S('Strategic grain reserves', 'logistics'),
    ]),
    G('farmer', 'Farmer Systems', 'Producer-facing services', [
      S('Farmer registry', 'registry'), S('Subsidy disbursement', 'finance'),
      S('Cooperative portal', 'citizen'),
    ]),
  ],
  ENERGY: [
    G('command', 'Energy Command', 'Grid & energy security', [
      S('Grid control centre', 'command'), S('Energy-security intelligence', 'intelligence'),
      S('Load-dispatch system', 'workflow'),
    ]),
    G('generation', 'Generation Network', 'Power production', [
      S('Generation plants', 'network'), S('Reserve & peaking units', 'network'),
    ]),
    G('grid', 'Transmission & Distribution', 'Grid delivery', [
      S('Grid segments', 'network'), S('Substations', 'network'),
      S('Distribution transformers', 'field'),
    ]),
    G('access', 'Electrification', 'Universal access', [
      S('Rural electrification', 'workflow'), S('Connection registry', 'registry'),
    ]),
    G('fuel', 'Fuel & Reserves', 'Strategic energy stocks', [
      S('Strategic fuel reserves', 'logistics'), S('Fuel logistics', 'logistics'),
    ]),
    G('citizen', 'Consumer Systems', 'Customer-facing services', [
      S('Consumer portal', 'citizen'), S('Billing & tariffs', 'finance'),
      S('Outage reporting', 'citizen'),
    ]),
  ],
  TRANSPORT: [
    G('command', 'Transport Command', 'National mobility authority', [
      S('Transport command centre', 'command'), S('Corridor intelligence', 'intelligence'),
    ]),
    G('aviation', 'Aviation Systems', 'Airspace & airports', [
      S('Airports', 'network'), S('Air-traffic coordination', 'workflow'),
    ]),
    G('maritime', 'Maritime Systems', 'Ports & waterways', [
      S('Seaports', 'network'), S('Port operations', 'logistics'),
    ]),
    G('rail', 'Rail Systems', 'Rail network', [
      S('Rail network', 'network'), S('Rail operations', 'logistics'),
    ]),
    G('road', 'Road Systems', 'Roads & safety', [
      S('Trunk road network', 'network'), S('Road safety', 'regulatory'),
      S('Inspection stations', 'field'),
    ]),
    G('logistics', 'Logistics & Fleet', 'Freight & fleet', [
      S('Logistics corridors', 'logistics'), S('Fleet systems', 'field'),
    ]),
    G('citizen', 'Mobility Services', 'Citizen-facing transport', [
      S('Vehicle registry', 'registry'), S('Driver licensing', 'citizen'),
      S('Transit information', 'citizen'),
    ]),
  ],
  JUSTICE: [
    G('command', 'Justice Command', 'Rule-of-law administration', [
      S('Justice command centre', 'command'), S('Case intelligence', 'intelligence'),
    ]),
    G('courts', 'Court Liaison', 'Court support & coordination', [
      S('Court liaison offices', 'network'), S('Case-coordination units', 'workflow'),
    ]),
    G('legalaid', 'Legal Aid', 'Access to justice', [
      S('Legal-aid centres', 'network'), S('Legal-aid intake', 'citizen'),
    ]),
    G('corrections', 'Corrections', 'Custodial system', [
      S('Correctional facilities', 'network'), S('Inmate registry', 'registry'),
      S('Rehabilitation programmes', 'workflow'),
    ]),
    G('registries', 'Public Registries', 'Legal registries', [
      S('Public registries', 'registry'), S('Document verification', 'workflow'),
    ]),
    G('citizen', 'Citizen Justice', 'Public-facing services', [
      S('Justice portal', 'citizen'), S('Complaints & redress', 'workflow'),
    ]),
  ],
  ENVIRONMENT: [
    G('command', 'Environment Command', 'Climate & ecology authority', [
      S('Environment command centre', 'command'), S('Climate intelligence', 'intelligence'),
    ]),
    G('monitoring', 'Monitoring Network', 'Environmental sensing', [
      S('Monitoring stations', 'field'), S('Air & water quality', 'analytics'),
    ]),
    G('protected', 'Protected Areas', 'Conservation', [
      S('Protected-area management', 'network'), S('Ranger operations', 'field'),
    ]),
    G('permit', 'Regulatory Systems', 'Permits & compliance', [
      S('Permit & compliance offices', 'regulatory'), S('Emissions registry', 'registry'),
    ]),
    G('climate', 'Climate Adaptation', 'Resilience programmes', [
      S('Adaptation units', 'workflow'), S('Disaster-risk analytics', 'analytics'),
    ]),
    G('citizen', 'Public Environment', 'Citizen-facing services', [
      S('Environmental portal', 'citizen'), S('Incident reporting', 'citizen'),
    ]),
  ],
  INTERIOR: [
    G('command', 'Interior Command', 'Internal coordination authority', [
      S('Interior command centre', 'command'), S('Internal-security intelligence', 'intelligence'),
    ]),
    G('identity', 'Identity Systems', 'Civil identity backbone', [
      S('Civil registry', 'registry'), S('Identity issuance centres', 'network'),
      S('Biometric verification', 'workflow'),
    ]),
    G('border', 'Border Systems', 'Entry & frontier control', [
      S('Border & entry posts', 'field'), S('Entry/exit control', 'workflow'),
    ]),
    G('licensing', 'Permit & Licensing', 'Internal permits', [
      S('Permit & licensing desks', 'network'), S('Licensing workflows', 'workflow'),
    ]),
    G('coordination', 'Internal Coordination', 'Multi-agency coordination', [
      S('Coordination cells', 'workflow'), S('Public-order monitoring', 'intelligence'),
    ]),
    G('citizen', 'Citizen Services', 'Public-facing identity services', [
      S('Citizen identity portal', 'citizen'), S('Document services', 'citizen'),
    ]),
  ],
  LABOR: [
    G('command', 'Labour Command', 'Employment & welfare authority', [
      S('Labour command centre', 'command'), S('Labour-market intelligence', 'intelligence'),
    ]),
    G('employment', 'Employment Systems', 'Jobs & placement', [
      S('Employment offices', 'network'), S('Jobseeker registry', 'registry'),
      S('Placement workflows', 'workflow'),
    ]),
    G('inspection', 'Workplace Inspection', 'Safety & compliance', [
      S('Inspection units', 'field'), S('Occupational-safety compliance', 'regulatory'),
    ]),
    G('insurance', 'Social Insurance', 'Worker protection funds', [
      S('Social-insurance funds', 'finance'), S('Contributions & claims', 'workflow'),
    ]),
    G('disputes', 'Dispute Resolution', 'Labour tribunals', [
      S('Dispute tribunals', 'workflow'), S('Case registry', 'registry'),
    ]),
    G('citizen', 'Worker Services', 'Public-facing services', [
      S('Worker portal', 'citizen'), S('Skills & training centres', 'network'),
    ]),
  ],
  TRADE: [
    G('command', 'Trade Command', 'Commerce & industry authority', [
      S('Trade command centre', 'command'), S('Trade intelligence', 'intelligence'),
    ]),
    G('registry', 'Business Registry', 'Enterprise registration', [
      S('Business registries', 'registry'), S('Company filing', 'workflow'),
    ]),
    G('standards', 'Standards & Metrology', 'Quality assurance', [
      S('Standards & metrology labs', 'network'), S('Conformity assessment', 'regulatory'),
    ]),
    G('export', 'Export Facilitation', 'Trade promotion', [
      S('Export-facilitation desks', 'workflow'), S('Trade analytics', 'analytics'),
    ]),
    G('licensing', 'Licensing Systems', 'Commercial licensing', [
      S('Licensing offices', 'network'), S('Permit workflows', 'workflow'),
    ]),
    G('industry', 'Industrial Systems', 'Industrial development', [
      S('Industrial parks', 'network'), S('Investment registry', 'registry'),
    ]),
    G('citizen', 'Business Services', 'Enterprise-facing services', [
      S('Business portal', 'citizen'), S('Permit applications', 'citizen'),
    ]),
  ],
  GENERIC: [
    G('command', 'Institutional Command', 'Executive authority', [
      S('Command centre', 'command'), S('Operational intelligence', 'intelligence'),
    ]),
    G('operations', 'Operations Network', 'Service delivery', [
      S('Public service centres', 'network'), S('Field coordination cells', 'field'),
    ]),
    G('registry', 'Registry Systems', 'Records & registries', [
      S('Records & registry offices', 'registry'), S('Document workflows', 'workflow'),
    ]),
    G('citizen', 'Citizen Systems', 'Public-facing services', [
      S('Citizen portal', 'citizen'), S('Service requests', 'workflow'),
    ]),
    G('institutional', 'Institutional Systems', 'Corporate functions', [
      S('Workforce & staffing', 'personnel'), S('Budget & finance', 'finance'),
      S('Audit & compliance', 'audit'),
    ]),
  ],
  // ── Constitutional branches use the same generation model ──
  LEGISLATURE: [
    G('command', 'Legislative Command', 'Parliamentary authority', [
      S('Speaker / presiding command', 'command'), S('Legislative intelligence', 'intelligence'),
    ]),
    G('chambers', 'Chambers', 'Deliberative bodies', [
      S('Chamber sittings', 'network'), S('Quorum & attendance', 'workflow'),
      S('Order paper', 'workflow'),
    ]),
    G('committees', 'Committee Systems', 'Scrutiny & inquiry', [
      S('Standing committees', 'network'), S('Committee workflows', 'workflow'),
      S('Witness & evidence', 'registry'),
    ]),
    G('bills', 'Bill Systems', 'Legislation lifecycle', [
      S('Bill drafting', 'workflow'), S('Readings & stages', 'workflow'),
      S('Statute registry', 'registry'),
    ]),
    G('voting', 'Voting Systems', 'Division & decision', [
      S('Electronic division', 'workflow'), S('Vote registry', 'registry'),
    ]),
    G('appropriation', 'Appropriation Systems', 'Money bills & supply', [
      S('Appropriation workflow', 'finance'), S('Budget scrutiny', 'analytics'),
    ]),
    G('oversight', 'Oversight Systems', 'Executive accountability', [
      S('Questions & motions', 'workflow'), S('Inquiry & summons', 'workflow'),
    ]),
    G('citizen', 'Public Participation', 'Citizen engagement', [
      S('Public-petitions portal', 'citizen'), S('Hansard & records', 'registry'),
    ]),
  ],
  JUDICIARY: [
    G('command', 'Judicial Command', 'Apex judicial administration', [
      S('Chief Justice administration', 'command'), S('Judicial intelligence', 'intelligence'),
    ]),
    G('courts', 'Court Systems', 'Tiered courts', [
      S('Apex & constitutional court', 'network'), S('Appellate courts', 'network'),
      S('Trial courts', 'network'),
    ]),
    G('cases', 'Case Systems', 'Docket & case management', [
      S('Case filing', 'workflow'), S('Docket & cause list', 'workflow'),
      S('Case registry', 'registry'),
    ]),
    G('constitutional', 'Constitutional Review', 'Judicial review', [
      S('Constitutional petitions', 'workflow'), S('Precedent registry', 'registry'),
    ]),
    G('appeals', 'Appeals Systems', 'Appellate process', [
      S('Appeals workflow', 'workflow'), S('Judgment publication', 'registry'),
    ]),
    G('prosecution', 'Prosecution Liaison', 'State prosecution interface', [
      S('Prosecution liaison', 'workflow'), S('Evidence systems', 'registry'),
    ]),
    G('corrections', 'Corrections Integration', 'Custodial linkage', [
      S('Prison integration', 'interop'), S('Warrant registry', 'registry'),
    ]),
    G('citizen', 'Access to Justice', 'Public-facing services', [
      S('Judiciary portal', 'citizen'), S('Legal registries', 'registry'),
    ]),
  ],
};

export function blueprintFor(kind: InstitutionKind): BlueprintGroup[] {
  return BP[kind] ?? BP.GENERIC;
}

// ── Instantiated (live) ecosystem ──────────────────────────────────────
export type SystemStatus = 'operational' | 'degraded' | 'provisioning';

export interface InstitutionSystem extends BlueprintSystem {
  status: SystemStatus;
  uptime: number; // 0-100
}
export interface InstitutionSystemGroup {
  key: string; name: string; purpose: string;
  systems: InstitutionSystem[];
  health: number; // 0-100 mean uptime of operational systems
  tone: 'ok' | 'warn' | 'alert';
}
export interface InstitutionEcosystem {
  kind: InstitutionKind;
  activated: boolean;
  groups: InstitutionSystemGroup[];
  stats: {
    groups: number; systems: number;
    operational: number; degraded: number; provisioning: number;
    meanHealth: number;
  };
}

// Instantiate the full institutional ecosystem. Before activation the
// systems are blueprinted but in 'provisioning' (not yet generated). On
// activation the factory brings them online; a deterministic minority run
// 'degraded' to reflect real operational pressure.
export function instantiateInstitution(
  inst: { id: string; kind: InstitutionKind; activated: boolean },
  t: number,
): InstitutionEcosystem {
  const groups = blueprintFor(inst.kind).map(g => {
    const systems: InstitutionSystem[] = g.systems.map(s => {
      const k = `bp:${inst.id}:${g.key}:${s.name}`;
      if (!inst.activated) {
        return { ...s, status: 'provisioning' as const, uptime: 0 };
      }
      const up = Math.round(wave(`${k}:up`, t, 58, 99));
      const degraded = seed(`${k}:deg`) > 0.82;
      return {
        ...s,
        status: degraded ? ('degraded' as const) : ('operational' as const),
        uptime: degraded ? Math.min(up, 64) : up,
      };
    });
    const live = systems.filter(s => s.status !== 'provisioning');
    const health = live.length ? Math.round(live.reduce((a, s) => a + s.uptime, 0) / live.length) : 0;
    const anyDeg = systems.some(s => s.status === 'degraded');
    const tone: 'ok' | 'warn' | 'alert' =
      !inst.activated ? 'warn' : health >= 80 && !anyDeg ? 'ok' : health >= 65 ? 'warn' : 'alert';
    return { key: g.key, name: g.name, purpose: g.purpose, systems, health, tone };
  });

  const all = groups.flatMap(g => g.systems);
  const operational = all.filter(s => s.status === 'operational').length;
  const degraded = all.filter(s => s.status === 'degraded').length;
  const provisioning = all.filter(s => s.status === 'provisioning').length;
  const live = all.filter(s => s.status !== 'provisioning');
  const meanHealth = live.length ? Math.round(live.reduce((a, s) => a + s.uptime, 0) / live.length) : 0;

  return {
    kind: inst.kind,
    activated: inst.activated,
    groups,
    stats: { groups: groups.length, systems: all.length, operational, degraded, provisioning, meanHealth },
  };
}

/** Convenience: instantiate from a Ministry record. */
export function instantiateMinistry(m: Pick<Ministry, 'id' | 'archetype' | 'status'>, t: number): InstitutionEcosystem {
  return instantiateInstitution({ id: m.id, kind: m.archetype, activated: m.status === 'active' }, t);
}

export interface NationalEcosystem {
  institutions: number;
  groups: number;
  systems: number;
  operational: number;
  degraded: number;
  meanHealth: number;
  /** most-degraded systems government-wide */
  weakest: { institution: string; group: string; system: string; uptime: number }[];
}

// The whole-of-government institutional footprint: every active ministry's
// generated ecosystem aggregated. The state is not pages — it is N
// instantiated institutions running K operational systems. Pure.
export function nationalEcosystem(
  mins: { id: string; name: string; archetype: ArchetypeKey; status: string }[],
  t: number,
): NationalEcosystem {
  const active = mins.filter(m => m.status === 'active');
  let groups = 0, systems = 0, operational = 0, degraded = 0, healthSum = 0, healthN = 0;
  const weak: { institution: string; group: string; system: string; uptime: number }[] = [];
  for (const m of active) {
    const eco = instantiateInstitution({ id: m.id, kind: m.archetype, activated: true }, t);
    groups += eco.stats.groups;
    systems += eco.stats.systems;
    operational += eco.stats.operational;
    degraded += eco.stats.degraded;
    for (const g of eco.groups) {
      for (const s of g.systems) {
        if (s.status === 'provisioning') continue;
        healthSum += s.uptime; healthN += 1;
        if (s.status === 'degraded') weak.push({ institution: m.name, group: g.name, system: s.name, uptime: s.uptime });
      }
    }
  }
  weak.sort((a, b) => a.uptime - b.uptime);
  return {
    institutions: active.length, groups, systems, operational, degraded,
    meanHealth: healthN ? Math.round(healthSum / healthN) : 0,
    weakest: weak.slice(0, 8),
  };
}

// ── Per-system operational readout ─────────────────────────────────────
// Every instantiated system is an operating unit, not a label. Its live
// readout is kind-appropriate (a command centre reports posture &
// directives; a network reports nodes & coverage; a citizen system reports
// requests & SLA; a registry reports records & integrity; …). Pure.
export interface SystemMetric { label: string; value: string; tone: 'ok' | 'warn' | 'alert' }

const KIND_METRICS: Record<SystemKind, { label: string; lo: number; hi: number; unit: string; good: 'high' | 'low' }[]> = {
  command:    [{ label: 'Directives active', lo: 0, hi: 14, unit: '', good: 'low' }, { label: 'Posture', lo: 60, hi: 99, unit: '%', good: 'high' }, { label: 'Decision latency', lo: 2, hi: 30, unit: 'm', good: 'low' }],
  network:    [{ label: 'Nodes online', lo: 78, hi: 100, unit: '%', good: 'high' }, { label: 'Coverage', lo: 60, hi: 99, unit: '%', good: 'high' }, { label: 'Faults', lo: 0, hi: 24, unit: '', good: 'low' }],
  registry:   [{ label: 'Records', lo: 40, hi: 99, unit: 'k', good: 'high' }, { label: 'Integrity', lo: 92, hi: 100, unit: '%', good: 'high' }, { label: 'Sync lag', lo: 0, hi: 40, unit: 'm', good: 'low' }],
  workflow:   [{ label: 'In progress', lo: 10, hi: 90, unit: '', good: 'low' }, { label: 'SLA met', lo: 70, hi: 99, unit: '%', good: 'high' }, { label: 'Throughput', lo: 30, hi: 96, unit: '/h', good: 'high' }],
  citizen:    [{ label: 'Open requests', lo: 20, hi: 95, unit: '', good: 'low' }, { label: 'SLA met', lo: 68, hi: 99, unit: '%', good: 'high' }, { label: 'Satisfaction', lo: 55, hi: 96, unit: '%', good: 'high' }],
  personnel:  [{ label: 'Staffed', lo: 62, hi: 99, unit: '%', good: 'high' }, { label: 'Active sessions', lo: 20, hi: 96, unit: '', good: 'high' }, { label: 'Vacancies', lo: 0, hi: 30, unit: '%', good: 'low' }],
  intelligence: [{ label: 'Signals/h', lo: 20, hi: 96, unit: '', good: 'high' }, { label: 'Confidence', lo: 60, hi: 97, unit: '%', good: 'high' }, { label: 'Open alerts', lo: 0, hi: 18, unit: '', good: 'low' }],
  analytics:  [{ label: 'Pipelines', lo: 70, hi: 100, unit: '%', good: 'high' }, { label: 'Freshness', lo: 60, hi: 99, unit: '%', good: 'high' }, { label: 'Failures', lo: 0, hi: 12, unit: '', good: 'low' }],
  finance:    [{ label: 'Throughput', lo: 40, hi: 98, unit: '%', good: 'high' }, { label: 'Exceptions', lo: 0, hi: 22, unit: '', good: 'low' }, { label: 'Reconciled', lo: 85, hi: 100, unit: '%', good: 'high' }],
  regulatory: [{ label: 'Compliance', lo: 70, hi: 99, unit: '%', good: 'high' }, { label: 'Pending', lo: 0, hi: 60, unit: '', good: 'low' }, { label: 'Breaches', lo: 0, hi: 14, unit: '', good: 'low' }],
  emergency:  [{ label: 'Response time', lo: 4, hi: 28, unit: 'm', good: 'low' }, { label: 'Units ready', lo: 55, hi: 98, unit: '%', good: 'high' }, { label: 'Active calls', lo: 0, hi: 40, unit: '', good: 'low' }],
  logistics:  [{ label: 'Stock cover', lo: 30, hi: 96, unit: 'd', good: 'high' }, { label: 'In transit', lo: 20, hi: 96, unit: '', good: 'high' }, { label: 'Disruptions', lo: 0, hi: 16, unit: '', good: 'low' }],
  audit:      [{ label: 'Chain intact', lo: 99, hi: 100, unit: '%', good: 'high' }, { label: 'Findings', lo: 0, hi: 20, unit: '', good: 'low' }, { label: 'Coverage', lo: 70, hi: 100, unit: '%', good: 'high' }],
  interop:    [{ label: 'Contracts live', lo: 70, hi: 100, unit: '%', good: 'high' }, { label: 'Latency', lo: 20, hi: 400, unit: 'ms', good: 'low' }, { label: 'Failures', lo: 0, hi: 14, unit: '', good: 'low' }],
  field:      [{ label: 'Units deployed', lo: 40, hi: 96, unit: '%', good: 'high' }, { label: 'Telemetry', lo: 70, hi: 99, unit: '%', good: 'high' }, { label: 'Offline', lo: 0, hi: 22, unit: '', good: 'low' }],
};

export function systemReadout(instId: string, groupKey: string, sys: BlueprintSystem, t: number): SystemMetric[] {
  return KIND_METRICS[sys.kind].map(spec => {
    const v = Math.round(wave(`sysm:${instId}:${groupKey}:${sys.name}:${spec.label}`, t, spec.lo, spec.hi));
    const span = spec.hi - spec.lo || 1;
    const pct = ((v - spec.lo) / span) * 100;
    const score = spec.good === 'high' ? pct : 100 - pct;
    const tone: 'ok' | 'warn' | 'alert' = score >= 60 ? 'ok' : score >= 35 ? 'warn' : 'alert';
    return { label: spec.label, value: `${v}${spec.unit}`, tone };
  });
}

const KIND_LABEL: Partial<Record<SystemKind, string>> = {
  command: 'Command', network: 'Network', registry: 'Registry', workflow: 'Workflow',
  citizen: 'Citizen', personnel: 'Personnel', intelligence: 'Intelligence',
  analytics: 'Analytics', finance: 'Finance', regulatory: 'Regulatory',
  emergency: 'Emergency', logistics: 'Logistics', audit: 'Audit', interop: 'Interop', field: 'Field',
};
export function systemKindLabel(k: SystemKind): string {
  return KIND_LABEL[k] ?? k;
}
