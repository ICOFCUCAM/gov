/**
 * Sovereign ministry archetypes — reusable institutional blueprints.
 *
 * These are CONFIGURABLE FOUNDATIONS, not hardcoded apps. Instantiating an
 * archetype seeds default departments + module activations + the domain
 * entities the sector typically operates. A government then renames, adds,
 * removes, and reconfigures freely — no platform rewrite.
 *
 * Every ministry, whatever its archetype, inherits the shared sovereign core
 * (identity, audit, RBAC, observability, workflows, notifications,
 * interoperability, documents, payments, deployment) from the platform.
 */

export type ArchetypeKey =
  | 'HEALTH'
  | 'EDUCATION'
  | 'FINANCE'
  | 'AGRICULTURE'
  | 'ENERGY'
  | 'TRANSPORT'
  | 'JUSTICE'
  | 'ENVIRONMENT'
  | 'INTERIOR'
  | 'LABOR'
  | 'TRADE'
  | 'GENERIC';

export interface Archetype {
  key: ArchetypeKey;
  title: string;
  summary: string;
  defaultDepartments: string[];
  /** moduleKey list — operational modules switched on by default */
  defaultModules: string[];
  /** the sector's principal domain entities (for dashboards/queues) */
  domainEntities: string[];
}

export const ARCHETYPES: Record<ArchetypeKey, Archetype> = {
  HEALTH: {
    key: 'HEALTH',
    title: 'Ministry of Health',
    summary: 'Public health, facilities, licensing, outbreak response.',
    defaultDepartments: ['Public Health', 'Facilities & Licensing', 'Pharmaceuticals', 'Emergency Response'],
    defaultModules: ['facilities', 'licensing', 'outbreak-monitoring', 'pharma-supply', 'vaccination', 'ambulance-coordination'],
    domainEntities: ['Hospital', 'Clinic', 'Practitioner', 'Outbreak', 'PharmaBatch', 'VaccinationRecord'],
  },
  EDUCATION: {
    key: 'EDUCATION',
    title: 'Ministry of Education',
    summary: 'Schools, learners, examinations, curriculum, scholarships.',
    defaultDepartments: ['Basic Education', 'Examinations', 'Curriculum', 'Scholarships'],
    defaultModules: ['schools', 'enrolment', 'examinations', 'curriculum', 'scholarships', 'performance-analytics'],
    domainEntities: ['School', 'Learner', 'Teacher', 'Exam', 'Curriculum', 'Scholarship'],
  },
  FINANCE: {
    key: 'FINANCE',
    title: 'Ministry of Finance / Treasury',
    summary: 'Treasury, taxation, budget, procurement, public expenditure.',
    defaultDepartments: ['Treasury', 'Revenue', 'Budget', 'Procurement'],
    defaultModules: ['treasury', 'taxation', 'budget', 'procurement', 'grants', 'expenditure'],
    domainEntities: ['Account', 'TaxFiling', 'BudgetLine', 'Tender', 'Grant', 'Disbursement'],
  },
  AGRICULTURE: {
    key: 'AGRICULTURE',
    title: 'Ministry of Agriculture',
    summary: 'Extension, subsidies, irrigation, market access.',
    defaultDepartments: ['Extension Services', 'Subsidies', 'Irrigation', 'Markets'],
    defaultModules: ['farmer-registry', 'subsidies', 'extension', 'market-access', 'climate-advisory'],
    domainEntities: ['Farmer', 'Subsidy', 'IrrigationScheme', 'MarketPrice', 'ExtensionVisit'],
  },
  ENERGY: {
    key: 'ENERGY',
    title: 'Ministry of Energy',
    summary: 'Generation, grid, licensing, rural electrification.',
    defaultDepartments: ['Generation', 'Grid', 'Licensing', 'Electrification'],
    defaultModules: ['grid-monitoring', 'licensing', 'electrification', 'tariffs'],
    domainEntities: ['PowerPlant', 'GridSegment', 'Licence', 'ElectrificationProject', 'Tariff'],
  },
  TRANSPORT: {
    key: 'TRANSPORT',
    title: 'Ministry of Transport',
    summary: 'Roads, vehicles, licensing, public transit, safety.',
    defaultDepartments: ['Roads', 'Vehicle Registration', 'Licensing', 'Public Transit'],
    defaultModules: ['vehicle-registry', 'driver-licensing', 'roads', 'transit', 'road-safety'],
    domainEntities: ['Vehicle', 'DriverLicence', 'RoadSegment', 'TransitRoute', 'Inspection'],
  },
  JUSTICE: {
    key: 'JUSTICE',
    title: 'Ministry of Justice',
    summary: 'Courts coordination, legal aid, registries, corrections.',
    defaultDepartments: ['Legal Aid', 'Registries', 'Corrections', 'Court Liaison'],
    defaultModules: ['legal-aid', 'registries', 'case-coordination', 'corrections'],
    domainEntities: ['Case', 'LegalAidGrant', 'Registry', 'Facility'],
  },
  ENVIRONMENT: {
    key: 'ENVIRONMENT',
    title: 'Ministry of Environment',
    summary: 'Monitoring, permits, conservation, climate adaptation.',
    defaultDepartments: ['Monitoring', 'Permits', 'Conservation', 'Climate'],
    defaultModules: ['environmental-monitoring', 'permits', 'conservation', 'climate-adaptation'],
    domainEntities: ['MonitoringStation', 'EnvPermit', 'ProtectedArea', 'EmissionRecord'],
  },
  INTERIOR: {
    key: 'INTERIOR',
    title: 'Ministry of Interior',
    summary: 'Civil registry, identity, internal coordination.',
    defaultDepartments: ['Civil Registry', 'Identity', 'Coordination'],
    defaultModules: ['civil-registry', 'identity', 'permits'],
    domainEntities: ['CivilRecord', 'IdentityCredential', 'Permit'],
  },
  LABOR: {
    key: 'LABOR',
    title: 'Ministry of Labor',
    summary: 'Employment, inspections, social insurance, disputes.',
    defaultDepartments: ['Employment', 'Inspections', 'Social Insurance'],
    defaultModules: ['employment-registry', 'inspections', 'social-insurance', 'disputes'],
    domainEntities: ['Employer', 'Worker', 'Inspection', 'InsuranceClaim', 'Dispute'],
  },
  TRADE: {
    key: 'TRADE',
    title: 'Ministry of Trade & Industry',
    summary: 'Business registration, licensing, standards, exports.',
    defaultDepartments: ['Business Registration', 'Standards', 'Exports'],
    defaultModules: ['business-registry', 'licensing', 'standards', 'export-facilitation'],
    domainEntities: ['Business', 'Licence', 'Standard', 'ExportPermit'],
  },
  GENERIC: {
    key: 'GENERIC',
    title: 'Generic Ministry / Agency / Commission',
    summary: 'A blank institutional foundation to compose from scratch.',
    defaultDepartments: ['Administration'],
    defaultModules: ['documents', 'notifications'],
    domainEntities: ['Record'],
  },
};

export function listArchetypes(): Archetype[] {
  return Object.values(ARCHETYPES);
}
