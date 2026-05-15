// CivicOS — archetype operational profiles.
//
// Specialises the shared operational core (regions, queues, analytics,
// incidents, field ops) into real ministry environments. Pure data: the
// store materialises deterministic values from these specs; the console
// renders them. No per-ministry code, no new platform theory — depth on
// the shared foundation.

import type { ArchetypeKey, IncidentSeverity } from '@/lib/api/types';

export interface ProfileKpi {
  key: string;
  label: string;
  unit: string;
  range: [number, number];
  goodWhenUp: boolean;
}
export interface ProfileIncidentType {
  key: string;
  label: string;
  severity: IncidentSeverity;
  detail: string;
  likelihood: number; // seeded active probability
}
export interface ProfileFieldUnit {
  key: string;
  label: string;
  states: string[]; // e.g. ['available','deployed','offline']
}
export interface ArchetypeProfile {
  title: string;
  /** what "operational %" means for this sector's regional table */
  regionUnitLabel: string;
  capacityLabel: string;
  caseLabel: string;
  kpis: ProfileKpi[];
  queueTitle: string;
  queueSubject: string;
  /** ordered escalation tiers (low → high authority) */
  escalation: string[];
  incidentTypes: ProfileIncidentType[];
  fieldUnits: ProfileFieldUnit[];
}

const RESP = ['available', 'deployed', 'offline'];

export const ARCHETYPE_PROFILES: Record<ArchetypeKey, ArchetypeProfile> = {
  HEALTH: {
    title: 'Health operations',
    regionUnitLabel: 'Facilities operational',
    capacityLabel: 'Bed availability',
    caseLabel: 'Open licensing cases',
    kpis: [
      { key: 'occ', label: 'Bed occupancy', unit: '%', range: [55, 96], goodWhenUp: false },
      { key: 'imm', label: 'Immunisation coverage', unit: '%', range: [70, 98], goodWhenUp: true },
      { key: 'stockout', label: 'Essential-med stockouts', unit: '', range: [0, 22], goodWhenUp: false },
      { key: 'mdt', label: 'Median licence decision', unit: 'd', range: [3, 14], goodWhenUp: false },
    ],
    queueTitle: 'Licensing & approvals',
    queueSubject: 'Facility / practitioner licence',
    escalation: ['Duty officer', 'District health officer', 'Regional director', 'Chief Medical Officer'],
    incidentTypes: [
      { key: 'outbreak', label: 'Possible disease cluster', severity: 'sev2', likelihood: 0.3, detail: 'Case count above baseline — epidemiologist review required. No automated action.' },
      { key: 'coldchain', label: 'Cold-chain excursion', severity: 'sev2', likelihood: 0.25, detail: 'Vaccine storage temperature out of range.' },
      { key: 'facoutage', label: 'Facility offline', severity: 'sev3', likelihood: 0.3, detail: 'A facility has not reported status in >24h.' },
    ],
    fieldUnits: [
      { key: 'ambulance', label: 'Ambulances', states: ['available', 'dispatched', 'offline'] },
      { key: 'mobile-clinic', label: 'Mobile clinics', states: ['active', 'transit', 'maintenance'] },
    ],
  },
  FINANCE: {
    title: 'Treasury operations',
    regionUnitLabel: 'Revenue offices operational',
    capacityLabel: 'Collection efficiency',
    caseLabel: 'Open approvals',
    kpis: [
      { key: 'exec', label: 'Budget execution', unit: '%', range: [55, 95], goodWhenUp: true },
      { key: 'rev', label: 'Revenue vs target', unit: '%', range: [70, 110], goodWhenUp: true },
      { key: 'singlebid', label: 'Single-bid share', unit: '%', range: [3, 26], goodWhenUp: false },
      { key: 'unrecon', label: 'Unreconciled items', unit: '', range: [0, 40], goodWhenUp: false },
    ],
    queueTitle: 'Procurement & payment approvals',
    queueSubject: 'Tender evaluation / disbursement',
    escalation: ['Finance officer', 'Head of procurement', 'Director of budget', 'Permanent Secretary'],
    incidentTypes: [
      { key: 'variance', label: 'Reconciliation variance', severity: 'sev2', likelihood: 0.25, detail: 'Ledger variance exceeds tolerance — Auditor General notified.' },
      { key: 'collusion', label: 'Procurement collusion signal', severity: 'sev3', likelihood: 0.25, detail: 'Bid pattern flagged for human investigator (Companion 141 discipline).' },
      { key: 'overspend', label: 'Budget line near ceiling', severity: 'sev3', likelihood: 0.3, detail: 'A line is within 5% of its ceiling.' },
    ],
    fieldUnits: [
      { key: 'audit-team', label: 'Field audit teams', states: ['available', 'on-site', 'reporting'] },
    ],
  },
  EDUCATION: {
    title: 'Education operations',
    regionUnitLabel: 'Schools reporting',
    capacityLabel: 'Teacher fill rate',
    caseLabel: 'Open requests',
    kpis: [
      { key: 'net', label: 'Net enrolment', unit: '%', range: [78, 99], goodWhenUp: true },
      { key: 'attend', label: 'Attendance', unit: '%', range: [70, 97], goodWhenUp: true },
      { key: 'ptr', label: 'Pupil:teacher ratio', unit: ':1', range: [25, 60], goodWhenUp: false },
      { key: 'remark', label: 'Remark backlog', unit: '', range: [0, 90], goodWhenUp: false },
    ],
    queueTitle: 'School & exam approvals',
    queueSubject: 'Maintenance / transfer / remark',
    escalation: ['School head', 'Sub-county director', 'County director', 'Director of Education'],
    incidentTypes: [
      { key: 'closure', label: 'Unplanned school closure', severity: 'sev3', likelihood: 0.2, detail: 'A school reported an unplanned closure.' },
      { key: 'integrity', label: 'Exam-integrity incident', severity: 'sev1', likelihood: 0.08, detail: 'Suspected breach — independent review.' },
    ],
    fieldUnits: [
      { key: 'inspector', label: 'School inspectors', states: RESP },
    ],
  },
  ENERGY: {
    title: 'Energy operations',
    regionUnitLabel: 'Grid availability',
    capacityLabel: 'Reserve margin',
    caseLabel: 'Open connections',
    kpis: [
      { key: 'saidi', label: 'Outage minutes (SAIDI)', unit: '', range: [20, 400], goodWhenUp: false },
      { key: 'losses', label: 'Distribution losses', unit: '%', range: [6, 28], goodWhenUp: false },
      { key: 'cov', label: 'Electrification coverage', unit: '%', range: [55, 95], goodWhenUp: true },
      { key: 'renew', label: 'Renewable share', unit: '%', range: [10, 80], goodWhenUp: true },
    ],
    queueTitle: 'Connections & licensing',
    queueSubject: 'Connection / generation licence',
    escalation: ['Control-room operator', 'Regional grid manager', 'System operator', 'Director General'],
    incidentTypes: [
      { key: 'instab', label: 'Frequency instability', severity: 'sev2', likelihood: 0.2, detail: 'Grid frequency outside tolerance in a region.' },
      { key: 'outage', label: 'Major outage', severity: 'sev2', likelihood: 0.2, detail: 'Sustained loss of supply affecting a region.' },
    ],
    fieldUnits: [
      { key: 'crew', label: 'Line crews', states: ['available', 'dispatched', 'on-fault'] },
    ],
  },
  TRANSPORT: {
    title: 'Transport operations',
    regionUnitLabel: 'Corridors operational',
    capacityLabel: 'Network availability',
    caseLabel: 'Open registrations',
    kpis: [
      { key: 'incidents', label: 'Road incidents', unit: '', range: [0, 60], goodWhenUp: false },
      { key: 'sameday', label: 'Same-day registrations', unit: '%', range: [60, 98], goodWhenUp: true },
      { key: 'fatality', label: 'Fatality rate index', unit: '', range: [10, 90], goodWhenUp: false },
      { key: 'punct', label: 'Transit punctuality', unit: '%', range: [60, 96], goodWhenUp: true },
    ],
    queueTitle: 'Registration & licensing',
    queueSubject: 'Vehicle / driver application',
    escalation: ['Duty controller', 'Regional transport officer', 'Director of roads', 'Permanent Secretary'],
    incidentTypes: [
      { key: 'hotspot', label: 'Accident hot-spot emerging', severity: 'sev3', likelihood: 0.25, detail: 'Incident clustering on a corridor.' },
      { key: 'bridge', label: 'Structure condition alert', severity: 'sev2', likelihood: 0.15, detail: 'Bridge/structure flagged for inspection.' },
    ],
    fieldUnits: [
      { key: 'patrol', label: 'Highway patrol', states: ['available', 'on-corridor', 'offline'] },
      { key: 'inspection', label: 'Inspection units', states: RESP },
    ],
  },
  INTERIOR: {
    title: 'Public-safety & civil operations',
    regionUnitLabel: 'Stations operational',
    capacityLabel: 'Response readiness',
    caseLabel: 'Open registry cases',
    kpis: [
      { key: 'response', label: 'Median response time', unit: 'm', range: [6, 45], goodWhenUp: false },
      { key: 'civreg', label: 'Civil-registration timeliness', unit: '%', range: [70, 98], goodWhenUp: true },
      { key: 'clearance', label: 'Case clearance rate', unit: '%', range: [40, 90], goodWhenUp: true },
    ],
    queueTitle: 'Civil registry & permits',
    queueSubject: 'Registration / permit',
    escalation: ['Duty officer', 'Station commander', 'Regional commander', 'Inspector-General'],
    incidentTypes: [
      { key: 'masscas', label: 'Mass-casualty coordination', severity: 'sev1', likelihood: 0.08, detail: 'Multi-agency coordination — NCCC pathway. Human command only.' },
      { key: 'disorder', label: 'Public-order escalation', severity: 'sev2', likelihood: 0.18, detail: 'Rights-respecting response; oversight engaged (Companion 100).' },
    ],
    fieldUnits: [
      { key: 'response', label: 'Response teams', states: ['available', 'deployed', 'standby'] },
    ],
  },
  AGRICULTURE: {
    title: 'Agriculture operations',
    regionUnitLabel: 'Extension coverage',
    capacityLabel: 'Input availability',
    caseLabel: 'Open subsidy claims',
    kpis: [
      { key: 'yield', label: 'Yield vs forecast', unit: '%', range: [60, 115], goodWhenUp: true },
      { key: 'subdisb', label: 'Subsidy disbursed on time', unit: '%', range: [60, 98], goodWhenUp: true },
      { key: 'leakage', label: 'Flagged leakage cases', unit: '', range: [0, 18], goodWhenUp: false },
    ],
    queueTitle: 'Subsidy & registry approvals',
    queueSubject: 'Subsidy claim / registration',
    escalation: ['Extension officer', 'Sub-county officer', 'County director', 'Director of Agriculture'],
    incidentTypes: [
      { key: 'pest', label: 'Pest / disease outbreak', severity: 'sev2', likelihood: 0.2, detail: 'Crop/livestock threat reported in a region.' },
      { key: 'elite', label: 'Subsidy elite-capture pattern', severity: 'sev3', likelihood: 0.2, detail: 'Concentration flagged for human investigator.' },
    ],
    fieldUnits: [
      { key: 'extension', label: 'Extension officers', states: RESP },
    ],
  },
  JUSTICE: {
    title: 'Justice operations',
    regionUnitLabel: 'Registries operational',
    capacityLabel: 'Legal-aid availability',
    caseLabel: 'Open coordination cases',
    kpis: [
      { key: 'backlog', label: 'Case backlog', unit: '', range: [60, 420], goodWhenUp: false },
      { key: 'aidmet', label: 'Legal-aid requests met', unit: '%', range: [55, 95], goodWhenUp: true },
      { key: 'dtime', label: 'Median disposition time', unit: 'd', range: [40, 220], goodWhenUp: false },
    ],
    queueTitle: 'Legal aid & coordination',
    queueSubject: 'Legal-aid request / scheduling',
    escalation: ['Registry officer', 'Senior registrar', 'Regional coordinator', 'Director of Justice'],
    incidentTypes: [
      { key: 'rights', label: 'Rights-safeguard alert', severity: 'sev2', likelihood: 0.15, detail: 'Due-process safeguard flagged for human review.' },
    ],
    fieldUnits: [
      { key: 'aid', label: 'Mobile legal-aid units', states: RESP },
    ],
  },
  ENVIRONMENT: {
    title: 'Environment operations',
    regionUnitLabel: 'Monitoring stations operational',
    capacityLabel: 'Sampling coverage',
    caseLabel: 'Open permit cases',
    kpis: [
      { key: 'aqi', label: 'Air-quality exceedances', unit: '', range: [0, 40], goodWhenUp: false },
      { key: 'compliance', label: 'Permit compliance', unit: '%', range: [60, 98], goodWhenUp: true },
      { key: 'forest', label: 'Forest-cover change', unit: '%', range: [-6, 4], goodWhenUp: true },
    ],
    queueTitle: 'Environmental permits',
    queueSubject: 'EIA / discharge permit',
    escalation: ['Field officer', 'Regional inspector', 'Director of monitoring', 'Permanent Secretary'],
    incidentTypes: [
      { key: 'pollution', label: 'Pollution event', severity: 'sev2', likelihood: 0.2, detail: 'Discharge above limit reported.' },
    ],
    fieldUnits: [{ key: 'inspector', label: 'Inspection teams', states: RESP }],
  },
  LABOR: {
    title: 'Labour operations',
    regionUnitLabel: 'Inspectorates operational',
    capacityLabel: 'Inspection coverage',
    caseLabel: 'Open disputes',
    kpis: [
      { key: 'inspections', label: 'Inspections completed', unit: '%', range: [55, 95], goodWhenUp: true },
      { key: 'disputes', label: 'Dispute backlog', unit: '', range: [10, 200], goodWhenUp: false },
      { key: 'claims', label: 'Insurance claims on time', unit: '%', range: [60, 97], goodWhenUp: true },
    ],
    queueTitle: 'Inspections & claims',
    queueSubject: 'Inspection / insurance claim',
    escalation: ['Labour officer', 'Senior inspector', 'Regional director', 'Commissioner of Labour'],
    incidentTypes: [
      { key: 'safety', label: 'Workplace-safety incident', severity: 'sev2', likelihood: 0.18, detail: 'Serious incident reported at a workplace.' },
    ],
    fieldUnits: [{ key: 'inspector', label: 'Labour inspectors', states: RESP }],
  },
  TRADE: {
    title: 'Trade & industry operations',
    regionUnitLabel: 'Registries operational',
    capacityLabel: 'Standards capacity',
    caseLabel: 'Open registrations',
    kpis: [
      { key: 'reg', label: 'Same-week registrations', unit: '%', range: [55, 96], goodWhenUp: true },
      { key: 'standards', label: 'Standards conformity', unit: '%', range: [60, 98], goodWhenUp: true },
      { key: 'export', label: 'Export permits backlog', unit: '', range: [0, 60], goodWhenUp: false },
    ],
    queueTitle: 'Registration & licensing',
    queueSubject: 'Business / export application',
    escalation: ['Registration officer', 'Senior officer', 'Director of trade', 'Permanent Secretary'],
    incidentTypes: [
      { key: 'noncompliance', label: 'Standards non-compliance', severity: 'sev3', likelihood: 0.2, detail: 'Product flagged for standards review.' },
    ],
    fieldUnits: [{ key: 'standards', label: 'Standards inspectors', states: RESP }],
  },
  GENERIC: {
    title: 'Operations',
    regionUnitLabel: 'Offices operational',
    capacityLabel: 'Service capacity',
    caseLabel: 'Open cases',
    kpis: [
      { key: 'tp', label: 'Service throughput', unit: '%', range: [60, 98], goodWhenUp: true },
      { key: 'bk', label: 'Backlog', unit: '', range: [10, 200], goodWhenUp: false },
    ],
    queueTitle: 'Approvals queue',
    queueSubject: 'Service application',
    escalation: ['Officer', 'Supervisor', 'Director', 'Permanent Secretary'],
    incidentTypes: [
      { key: 'svc', label: 'Service degradation', severity: 'sev3', likelihood: 0.2, detail: 'A service is operating below standard.' },
    ],
    fieldUnits: [{ key: 'team', label: 'Field teams', states: RESP }],
  },
};

export function profileFor(archetype: ArchetypeKey): ArchetypeProfile {
  return ARCHETYPE_PROFILES[archetype] ?? ARCHETYPE_PROFILES.GENERIC;
}

/**
 * Per-archetype operational identity — each ministry reads as its own
 * command environment (Treasury ≠ Health ≠ Transport), not a recoloured
 * generic page. Accents are mid-tones tuned to remain legible on the
 * dark sovereign palette.
 */
export interface ArchetypeIdentity {
  accent: string;
  glyph: string;
  domain: string;
}
export const ARCHETYPE_IDENTITY: Record<ArchetypeKey, ArchetypeIdentity> = {
  HEALTH: { accent: '#2f9e7d', glyph: '✚', domain: 'National healthcare operations & licensing' },
  EDUCATION: { accent: '#4f7fd4', glyph: '✎', domain: 'National education administration' },
  FINANCE: { accent: '#c9a13b', glyph: '§', domain: 'Sovereign fiscal command & treasury control' },
  AGRICULTURE: { accent: '#6fae4a', glyph: '❧', domain: 'Agriculture & national food security' },
  ENERGY: { accent: '#d4894a', glyph: '⚡', domain: 'Grid & energy infrastructure command' },
  TRANSPORT: { accent: '#4f93d4', glyph: '⇄', domain: 'Logistics & corridor coordination' },
  JUSTICE: { accent: '#8f6fc4', glyph: '⚖', domain: 'Justice administration & registries' },
  ENVIRONMENT: { accent: '#3fae8a', glyph: '❂', domain: 'Environmental monitoring & enforcement' },
  INTERIOR: { accent: '#c4564f', glyph: '◈', domain: 'National security administration' },
  LABOR: { accent: '#4f9ab0', glyph: '⚒', domain: 'Labour & workforce administration' },
  TRADE: { accent: '#3f9ab0', glyph: '⛴', domain: 'Trade & commerce facilitation' },
  GENERIC: { accent: '#6a7689', glyph: '▣', domain: 'Institutional operating environment' },
};
export function identityFor(archetype: ArchetypeKey): ArchetypeIdentity {
  return ARCHETYPE_IDENTITY[archetype] ?? ARCHETYPE_IDENTITY.GENERIC;
}
