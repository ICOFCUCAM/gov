// Per-archetype institutional subsystem catalog. This is the real
// operational machinery each ministry archetype is composed of — the
// hospitals/clinics/pharmacies of Health, the grid/substations of Energy,
// etc. Pure & deterministic; surfaced across the workspace operational
// tabs so every ministry reads as a deployable operational ecosystem
// rather than a generic dashboard.

import type { ArchetypeKey } from '@/lib/api/types';

export interface Subsystem {
  /** institutional component name */
  name: string;
  /** what the count unit represents */
  unit: string;
  /** typical national-scale magnitude (drives seeded inventory size) */
  scale: number;
}

const C: Record<ArchetypeKey, Subsystem[]> = {
  HEALTH: [
    { name: 'Tertiary hospitals', unit: 'facilities', scale: 38 },
    { name: 'District clinics', unit: 'facilities', scale: 420 },
    { name: 'Diagnostic laboratories', unit: 'labs', scale: 96 },
    { name: 'Pharmacies & dispensaries', unit: 'outlets', scale: 510 },
    { name: 'Ambulance fleet', unit: 'vehicles', scale: 240 },
    { name: 'Epidemiology centres', unit: 'centres', scale: 22 },
    { name: 'Blood & cold-chain banks', unit: 'banks', scale: 34 },
    { name: 'Vaccination sites', unit: 'sites', scale: 680 },
  ],
  ENERGY: [
    { name: 'Generation plants', unit: 'plants', scale: 28 },
    { name: 'Grid segments', unit: 'segments', scale: 310 },
    { name: 'Substations', unit: 'substations', scale: 142 },
    { name: 'Distribution transformers', unit: 'units', scale: 5400 },
    { name: 'Rural electrification projects', unit: 'projects', scale: 88 },
    { name: 'Grid control centres', unit: 'centres', scale: 9 },
    { name: 'Strategic fuel reserves', unit: 'depots', scale: 16 },
  ],
  TRANSPORT: [
    { name: 'Trunk road network', unit: 'segments', scale: 540 },
    { name: 'Vehicle registries', unit: 'offices', scale: 64 },
    { name: 'Public transit routes', unit: 'routes', scale: 210 },
    { name: 'Inspection & safety stations', unit: 'stations', scale: 120 },
    { name: 'Seaports', unit: 'ports', scale: 7 },
    { name: 'Airports', unit: 'airports', scale: 14 },
    { name: 'Logistics corridors', unit: 'corridors', scale: 11 },
  ],
  FINANCE: [
    { name: 'Treasury accounts', unit: 'accounts', scale: 180 },
    { name: 'Revenue & tax offices', unit: 'offices', scale: 96 },
    { name: 'Procurement boards', unit: 'boards', scale: 24 },
    { name: 'Disbursement channels', unit: 'channels', scale: 40 },
    { name: 'Budget control units', unit: 'units', scale: 52 },
    { name: 'Public-debt instruments', unit: 'instruments', scale: 31 },
  ],
  AGRICULTURE: [
    { name: 'Extension offices', unit: 'offices', scale: 260 },
    { name: 'Irrigation schemes', unit: 'schemes', scale: 74 },
    { name: 'Markets & aggregation hubs', unit: 'markets', scale: 190 },
    { name: 'Strategic grain stores', unit: 'depots', scale: 48 },
    { name: 'Farmer cooperatives', unit: 'co-ops', scale: 1200 },
    { name: 'Veterinary & plant-health labs', unit: 'labs', scale: 36 },
  ],
  EDUCATION: [
    { name: 'Basic-education schools', unit: 'schools', scale: 9400 },
    { name: 'Examination centres', unit: 'centres', scale: 540 },
    { name: 'Teacher colleges', unit: 'colleges', scale: 62 },
    { name: 'Scholarship boards', unit: 'boards', scale: 18 },
    { name: 'Curriculum units', unit: 'units', scale: 26 },
    { name: 'Special-needs institutions', unit: 'institutions', scale: 84 },
  ],
  JUSTICE: [
    { name: 'Court liaison offices', unit: 'offices', scale: 120 },
    { name: 'Legal-aid centres', unit: 'centres', scale: 96 },
    { name: 'Public registries', unit: 'registries', scale: 140 },
    { name: 'Correctional facilities', unit: 'facilities', scale: 78 },
    { name: 'Case-coordination units', unit: 'units', scale: 44 },
  ],
  ENVIRONMENT: [
    { name: 'Monitoring stations', unit: 'stations', scale: 220 },
    { name: 'Protected areas', unit: 'areas', scale: 88 },
    { name: 'Permit & compliance offices', unit: 'offices', scale: 64 },
    { name: 'Climate-adaptation units', unit: 'units', scale: 30 },
    { name: 'Emissions registries', unit: 'registries', scale: 18 },
  ],
  INTERIOR: [
    { name: 'Civil registry offices', unit: 'offices', scale: 320 },
    { name: 'Identity issuance centres', unit: 'centres', scale: 210 },
    { name: 'Border & entry posts', unit: 'posts', scale: 96 },
    { name: 'Internal coordination cells', unit: 'cells', scale: 48 },
    { name: 'Permit & licensing desks', unit: 'desks', scale: 260 },
  ],
  LABOR: [
    { name: 'Employment offices', unit: 'offices', scale: 180 },
    { name: 'Workplace inspection units', unit: 'units', scale: 120 },
    { name: 'Social-insurance funds', unit: 'funds', scale: 22 },
    { name: 'Dispute tribunals', unit: 'tribunals', scale: 56 },
    { name: 'Skills & training centres', unit: 'centres', scale: 140 },
  ],
  TRADE: [
    { name: 'Business registries', unit: 'registries', scale: 110 },
    { name: 'Standards & metrology labs', unit: 'labs', scale: 40 },
    { name: 'Export-facilitation desks', unit: 'desks', scale: 72 },
    { name: 'Licensing offices', unit: 'offices', scale: 130 },
    { name: 'Industrial parks', unit: 'parks', scale: 24 },
  ],
  GENERIC: [
    { name: 'Administrative units', unit: 'units', scale: 60 },
    { name: 'Public service centres', unit: 'centres', scale: 140 },
    { name: 'Records & registry offices', unit: 'offices', scale: 90 },
    { name: 'Field coordination cells', unit: 'cells', scale: 40 },
  ],
};

export function subsystemsFor(archetype: ArchetypeKey): Subsystem[] {
  return C[archetype] ?? C.GENERIC;
}

/** Total declared institutional components for an archetype. */
export function subsystemCount(archetype: ArchetypeKey): number {
  return subsystemsFor(archetype).length;
}
