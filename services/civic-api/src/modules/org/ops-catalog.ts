// Operational module catalog (backend). Mirrors the app contract. Each
// activated module declares a realistic operational spec; values are
// materialised per-ministry by OperationsService (deterministic-stable,
// derived from real data where it exists). Generic fallback covers any
// module without an explicit spec — every enabled module renders.

export interface KpiDef {
  key: string;
  label: string;
  unit?: string;
  direction: 'higher-better' | 'lower-better';
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
  severity: 'SEV1' | 'SEV2' | 'SEV3' | 'SEV4';
  likelihood: number;
  detail: string;
}
export interface ModuleOpsSpec {
  title: string;
  kpis: KpiDef[];
  queues: QueueDef[];
  alerts: AlertDef[];
}

const p = (
  label: string,
  key: string,
  target: number,
  dir: KpiDef['direction'] = 'higher-better',
): KpiDef => ({
  key,
  label,
  unit: '%',
  direction: dir,
  range: dir === 'higher-better' ? [target - 18, 99] : [1, target + 12],
  target,
});

export const OPS_CATALOG: Record<string, ModuleOpsSpec> = {
  licensing: {
    title: 'Licensing',
    kpis: [p('On-time decisions', 'lic-ontime', 90)],
    queues: [{ key: 'lic-q', label: 'Licence applications', slaHours: 288, range: [3, 60] }],
    alerts: [{ key: 'lic-sla', label: 'Licensing SLA at risk', severity: 'SEV3', likelihood: 0.3, detail: 'Oldest application approaching SLA.' }],
  },
  treasury: {
    title: 'Treasury',
    kpis: [p('Reconciliation', 'recon', 99)],
    queues: [{ key: 'settlement', label: 'Settlements pending', slaHours: 24, range: [0, 25] }],
    alerts: [{ key: 'recon', label: 'Reconciliation variance', severity: 'SEV2', likelihood: 0.2, detail: 'Ledger variance exceeds tolerance.' }],
  },
  procurement: {
    title: 'Procurement',
    kpis: [p('Open-contracting published', 'ocds', 100)],
    queues: [{ key: 'tender', label: 'Tender evaluations', slaHours: 360, range: [1, 14] }],
    alerts: [{ key: 'collusion', label: 'Collusion signal', severity: 'SEV3', likelihood: 0.2, detail: 'Flagged for human review (Companion 141).' }],
  },
  schools: {
    title: 'Schools',
    kpis: [p('Schools reporting', 'rep', 96)],
    queues: [{ key: 'maint', label: 'Maintenance requests', slaHours: 336, range: [5, 50] }],
    alerts: [],
  },
  'grid-monitoring': {
    title: 'Grid monitoring',
    kpis: [p('Grid availability', 'avail', 98)],
    queues: [{ key: 'fault', label: 'Faults to dispatch', slaHours: 12, range: [0, 10] }],
    alerts: [{ key: 'instab', label: 'Frequency instability', severity: 'SEV2', likelihood: 0.15, detail: 'Frequency outside tolerance.' }],
  },
};

export const GENERIC_SPEC: ModuleOpsSpec = {
  title: 'Operations',
  kpis: [p('Service throughput', 'tp', 90)],
  queues: [{ key: 'work', label: 'Work queue', slaHours: 240, range: [2, 40] }],
  alerts: [],
};

export function specFor(moduleKey: string): ModuleOpsSpec {
  return OPS_CATALOG[moduleKey] ?? { ...GENERIC_SPEC, title: moduleKey };
}

export function seededInt(seed: string, min: number, max: number): number {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  const r = ((h >>> 0) % 1000) / 1000;
  return Math.round(min + r * (max - min));
}
