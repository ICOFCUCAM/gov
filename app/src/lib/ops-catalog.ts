// CivicOS — operational module catalog.
//
// Archetype-driven. Each operational module (a moduleKey activated on a
// ministry) declares a realistic operational SPEC: KPIs, queues, alerts.
// Values are materialised per-ministry by the store — derived from real
// platform data where it exists, otherwise deterministic-stable synthetic
// indicators (seeded by ministry+module) so a given institution always
// shows a consistent operational picture.
//
// This is configurable composition: governments enable/disable modules;
// the dashboard recomposes. No per-ministry code.

import type { IncidentSeverity } from '@/lib/api/types';

export interface KpiDef {
  key: string;
  label: string;
  unit?: string;
  /** lower-better KPIs flip tone thresholds */
  direction: 'higher-better' | 'lower-better';
  /** synthetic value range [min,max] when not derived from real data */
  range: [number, number];
  target: number;
}
export interface QueueDef {
  key: string;
  label: string;
  slaHours: number;
  range: [number, number];
}
export interface AlertDef {
  key: string;
  label: string;
  severity: IncidentSeverity;
  /** probability the alert is active (seeded) */
  likelihood: number;
  detail: string;
}
export interface ModuleOpsSpec {
  title: string;
  kpis: KpiDef[];
  queues: QueueDef[];
  alerts: AlertDef[];
}

const pct = (label: string, key: string, target: number, dir: KpiDef['direction'] = 'higher-better'): KpiDef => ({
  key, label, unit: '%', direction: dir, range: dir === 'higher-better' ? [target - 18, 99] : [1, target + 12], target,
});

export const OPS_CATALOG: Record<string, ModuleOpsSpec> = {
  // ── Health ──────────────────────────────────────────────────────────
  facilities: {
    title: 'Facilities oversight',
    kpis: [
      pct('Facilities operational', 'fac-op', 95),
      pct('Bed availability', 'beds', 65, 'higher-better'),
      { key: 'inspections-due', label: 'Inspections overdue', direction: 'lower-better', range: [0, 14], target: 3 },
    ],
    queues: [{ key: 'fac-review', label: 'Facility review', slaHours: 240, range: [2, 40] }],
    alerts: [{ key: 'fac-down', label: 'Facility reporting outage', severity: 'sev3', likelihood: 0.25, detail: 'A facility has not reported status in >24h.' }],
  },
  licensing: {
    title: 'Licensing',
    kpis: [
      pct('On-time decisions', 'lic-ontime', 90),
      { key: 'lic-median', label: 'Median decision time', unit: 'd', direction: 'lower-better', range: [2, 14], target: 7 },
    ],
    queues: [{ key: 'lic-q', label: 'Licence applications', slaHours: 288, range: [3, 60] }],
    alerts: [{ key: 'lic-sla', label: 'Licensing SLA at risk', severity: 'sev3', likelihood: 0.3, detail: 'Oldest application approaching the SLA boundary.' }],
  },
  'outbreak-monitoring': {
    title: 'Outbreak monitoring',
    kpis: [
      { key: 'signals', label: 'Active signals', direction: 'lower-better', range: [0, 6], target: 1 },
      pct('Surveillance coverage', 'surv', 88),
    ],
    queues: [{ key: 'invest', label: 'Signals under investigation', slaHours: 72, range: [0, 5] }],
    alerts: [{ key: 'cluster', label: 'Possible cluster detected', severity: 'sev2', likelihood: 0.2, detail: 'Case count above expected baseline in one district. Human epidemiologist review required.' }],
  },
  vaccination: {
    title: 'Vaccination',
    kpis: [pct('Coverage', 'cov', 85), pct('Cold-chain compliance', 'cold', 96)],
    queues: [{ key: 'stockouts', label: 'Stock-out follow-ups', slaHours: 48, range: [0, 8] }],
    alerts: [{ key: 'cold-break', label: 'Cold-chain excursion', severity: 'sev2', likelihood: 0.15, detail: 'Temperature excursion logged at a storage point.' }],
  },
  // ── Finance / Treasury ──────────────────────────────────────────────
  treasury: {
    title: 'Treasury',
    kpis: [
      pct('Reconciliation', 'recon', 99),
      { key: 'unrecon', label: 'Unreconciled items', direction: 'lower-better', range: [0, 30], target: 5 },
    ],
    queues: [{ key: 'settlement', label: 'Settlements pending', slaHours: 24, range: [0, 25] }],
    alerts: [{ key: 'recon-break', label: 'Reconciliation variance', severity: 'sev2', likelihood: 0.2, detail: 'Ledger variance exceeds tolerance — auditor notified.' }],
  },
  taxation: {
    title: 'Revenue',
    kpis: [pct('Filing rate', 'file', 80), pct('Collection efficiency', 'coll', 88)],
    queues: [{ key: 'tax-review', label: 'Returns under review', slaHours: 480, range: [10, 120] }],
    alerts: [{ key: 'fraud-pattern', label: 'Anomaly pattern surfaced', severity: 'sev3', likelihood: 0.25, detail: 'Pattern flagged for human investigator (Class D — no automated action).' }],
  },
  budget: {
    title: 'Budget execution',
    kpis: [pct('Execution rate', 'exec', 78), pct('Within-ceiling lines', 'ceil', 95)],
    queues: [{ key: 'reallocations', label: 'Reallocation approvals', slaHours: 120, range: [0, 18] }],
    alerts: [{ key: 'overspend', label: 'Line approaching ceiling', severity: 'sev3', likelihood: 0.3, detail: 'A budget line is within 5% of its ceiling.' }],
  },
  procurement: {
    title: 'Procurement',
    kpis: [
      pct('Open-contracting published', 'ocds', 100),
      { key: 'single-bid', label: 'Single-bid share', unit: '%', direction: 'lower-better', range: [2, 22], target: 8 },
    ],
    queues: [{ key: 'tender-review', label: 'Tender evaluations', slaHours: 360, range: [1, 14] }],
    alerts: [{ key: 'collusion', label: 'Collusion signal', severity: 'sev3', likelihood: 0.2, detail: 'Bid pattern flagged for human review (Companion 141 discipline).' }],
  },
  // ── Education ───────────────────────────────────────────────────────
  schools: {
    title: 'Schools',
    kpis: [pct('Schools reporting', 'rep', 96), pct('Teacher fill rate', 'fill', 90)],
    queues: [{ key: 'maint', label: 'Maintenance requests', slaHours: 336, range: [5, 50] }],
    alerts: [{ key: 'closure', label: 'Unplanned closure', severity: 'sev3', likelihood: 0.15, detail: 'A school reported an unplanned closure.' }],
  },
  enrolment: {
    title: 'Enrolment',
    kpis: [pct('Net enrolment', 'net', 92), { key: 'transfers', label: 'Transfers pending', direction: 'lower-better', range: [0, 40], target: 10 }],
    queues: [{ key: 'transfer-q', label: 'Transfer applications', slaHours: 240, range: [3, 35] }],
    alerts: [],
  },
  examinations: {
    title: 'Examinations',
    kpis: [pct('On-schedule centres', 'sched', 98), pct('Integrity checks passed', 'integ', 99)],
    queues: [{ key: 'remark', label: 'Remark requests', slaHours: 480, range: [0, 60] }],
    alerts: [{ key: 'leak', label: 'Integrity incident', severity: 'sev1', likelihood: 0.05, detail: 'Suspected exam-integrity breach — independent review.' }],
  },
  scholarships: {
    title: 'Scholarships',
    kpis: [pct('Disbursed on time', 'disb', 93)],
    queues: [{ key: 'sch-q', label: 'Applications to assess', slaHours: 600, range: [10, 90] }],
    alerts: [],
  },
  // ── Energy ──────────────────────────────────────────────────────────
  'grid-monitoring': {
    title: 'Grid monitoring',
    kpis: [pct('Grid availability', 'avail', 98), { key: 'outages', label: 'Active outages', direction: 'lower-better', range: [0, 8], target: 1 }],
    queues: [{ key: 'fault-q', label: 'Faults to dispatch', slaHours: 12, range: [0, 10] }],
    alerts: [{ key: 'instability', label: 'Frequency instability', severity: 'sev2', likelihood: 0.15, detail: 'Grid frequency outside tolerance in one region.' }],
  },
  electrification: {
    title: 'Electrification',
    kpis: [pct('Coverage', 'cov', 75), pct('Projects on schedule', 'sched', 82)],
    queues: [{ key: 'conn-q', label: 'Connection requests', slaHours: 720, range: [20, 200] }],
    alerts: [],
  },
  // ── Agriculture ─────────────────────────────────────────────────────
  'farmer-registry': {
    title: 'Farmer registry',
    kpis: [pct('Registry coverage', 'cov', 85)],
    queues: [{ key: 'reg-q', label: 'Registrations pending', slaHours: 240, range: [5, 70] }],
    alerts: [],
  },
  subsidies: {
    title: 'Subsidies',
    kpis: [pct('Disbursed on time', 'disb', 90), { key: 'leakage', label: 'Flagged leakage cases', direction: 'lower-better', range: [0, 12], target: 2 }],
    queues: [{ key: 'sub-q', label: 'Subsidy claims', slaHours: 168, range: [10, 120] }],
    alerts: [{ key: 'elite', label: 'Elite-capture pattern', severity: 'sev3', likelihood: 0.2, detail: 'Concentration pattern flagged for human investigator.' }],
  },
  // ── Justice ─────────────────────────────────────────────────────────
  'legal-aid': {
    title: 'Legal aid',
    kpis: [pct('Requests met', 'met', 88)],
    queues: [{ key: 'aid-q', label: 'Aid requests', slaHours: 120, range: [3, 40] }],
    alerts: [],
  },
  'case-coordination': {
    title: 'Case coordination',
    kpis: [{ key: 'backlog', label: 'Backlog cases', direction: 'lower-better', range: [50, 400], target: 120 }],
    queues: [{ key: 'sched-q', label: 'Scheduling requests', slaHours: 336, range: [10, 90] }],
    alerts: [],
  },
  // ── Transport ───────────────────────────────────────────────────────
  'vehicle-registry': {
    title: 'Vehicle registry',
    kpis: [pct('Same-day registrations', 'sameday', 92)],
    queues: [{ key: 'veh-q', label: 'Registrations pending', slaHours: 72, range: [5, 80] }],
    alerts: [],
  },
  'driver-licensing': {
    title: 'Driver licensing',
    kpis: [pct('On-time issuance', 'ontime', 90)],
    queues: [{ key: 'lic-q', label: 'Licence applications', slaHours: 240, range: [10, 120] }],
    alerts: [],
  },
  'road-safety': {
    title: 'Road safety',
    kpis: [{ key: 'incidents', label: 'Incidents this period', direction: 'lower-better', range: [0, 40], target: 8 }],
    queues: [{ key: 'blackspot-q', label: 'Black-spot remediations', slaHours: 720, range: [0, 20] }],
    alerts: [{ key: 'hotspot', label: 'Emerging accident hot-spot', severity: 'sev3', likelihood: 0.2, detail: 'Incident clustering on one corridor.' }],
  },
};

export const GENERIC_SPEC: ModuleOpsSpec = {
  title: 'Operations',
  kpis: [
    { key: 'throughput', label: 'Service throughput', unit: '%', direction: 'higher-better', range: [70, 99], target: 90 },
    { key: 'backlog', label: 'Backlog items', direction: 'lower-better', range: [0, 50], target: 10 },
  ],
  queues: [{ key: 'work-q', label: 'Work queue', slaHours: 240, range: [2, 40] }],
  alerts: [],
};

export function specFor(moduleKey: string): ModuleOpsSpec {
  return OPS_CATALOG[moduleKey] ?? { ...GENERIC_SPEC, title: moduleKey };
}
