// lib/gov/noc-engine.ts
//
// Sovereign National Operations Centre engine. Pure & deterministic.
// The NOC is the cross-ministry situation-room: it consumes posture
// signals from every branch and ministry, fuses them into a single
// operational picture, and exposes the cross-cutting decisions that
// cannot live inside any single ministry.

import { seed, wave } from '@/lib/telemetry';

export const NOC_SAFEGUARDS = {
  civilianCommand: true as const,
  rolesNeverFused: true as const,        // NOC observes & coordinates but does not command ministries
  auditPublic: true as const,             // every NOC decision is publicly audited
  noConstitutionalOverride: true as const,// NOC cannot suspend constitutional process
  prohibited: [
    'unilateral-deployment-orders',
    'cross-ministry-command-bypass',
    'sealed-decisions-without-rationale',
    'replacing-cabinet-decision-procedure',
    'fusion-of-civilian-and-military-command',
    'denying-judicial-or-legislative-access',
    'manipulating-posture-signals',
  ] as const,
};

export type NocPosture = 'steady' | 'elevated' | 'crisis' | 'national-emergency' | 'recovery';

export interface MinistryPosture {
  ministry: string;
  operational: number;       // 0-100
  posture: 'steady' | 'elevated' | 'crisis';
  inFlightIncidents: number;
  contributionToNational: number;
}

export interface NocIncident {
  id: string;
  scope: 'local' | 'regional' | 'national';
  category: 'energy' | 'health' | 'security' | 'climate' | 'communications' | 'transport' | 'fiscal';
  severity: 'watch' | 'minor' | 'major' | 'national';
  ageMin: number;
  leadMinistry: string;
}

export interface NocDecision {
  id: string;
  topic: string;
  cabinetOwner: string;
  status: 'observing' | 'coordinating' | 'recommendation-published' | 'cabinet-decided';
  rationalePublic: boolean;
  ageHrs: number;
}

export interface NocBoard {
  epoch: number;
  posture: NocPosture;
  nationalReadiness: number;
  ministries: MinistryPosture[];
  incidents: NocIncident[];
  decisions: NocDecision[];
  cabinetSyncMin: number;
  publicBriefing: { lastPublishedMin: number; cadenceMin: number };
  prohibited: readonly string[];
}

const MINISTRIES = [
  'Treasury', 'Justice', 'Health', 'Interior', 'Education', 'Foreign Affairs',
  'Police Command', 'Emergency', 'Energy', 'Transport', 'Trade', 'Labour',
  'Environment', 'Agriculture', 'Communications',
];

export function nocBoard(now: number): NocBoard {
  const epoch = Math.max(0, Math.floor(now / 4000));
  const ts = epoch;
  const ministries: MinistryPosture[] = MINISTRIES.map((m, i) => {
    const op = Math.round(wave(`nm:${i}`, ts, 64, 99));
    return {
      ministry: m,
      operational: op,
      posture: op >= 85 ? 'steady' : op >= 70 ? 'elevated' : 'crisis',
      inFlightIncidents: Math.round(wave(`ni:${i}`, ts, 0, 8)),
      contributionToNational: Math.round(op * (0.6 + seed(`nc:${i}`) * 0.4)),
    };
  });
  const incCategories: NocIncident['category'][] = ['energy', 'health', 'security', 'climate', 'communications', 'transport', 'fiscal'];
  const incScopes: NocIncident['scope'][] = ['local', 'regional', 'national'];
  const incSev: NocIncident['severity'][] = ['watch', 'minor', 'major', 'national'];
  const incidents: NocIncident[] = Array.from({ length: 8 }, (_, i) => ({
    id: `INC-${(10000 + Math.floor(seed(`inc:${i}:${Math.floor(ts / 3)}`) * 90000))}`,
    scope: incScopes[Math.floor(seed(`ins:${i}`) * incScopes.length)]!,
    category: incCategories[Math.floor(seed(`inc:${i}`) * incCategories.length)]!,
    severity: incSev[Math.floor(seed(`inv:${i}:${Math.floor(ts / 3)}`) * incSev.length)]!,
    ageMin: Math.round(wave(`ina:${i}`, ts, 4, 480)),
    leadMinistry: MINISTRIES[Math.floor(seed(`inl:${i}`) * MINISTRIES.length)]!,
  }));
  const decisionTopics = [
    'Cross-ministry climate adaptation', 'Continental supply-chain resilience', 'Cyber-resilience coordination',
    'Heatwave response (multi-region)', 'Energy reserve dispatch', 'Inter-ministry information posture',
  ];
  const decisionStatuses: NocDecision['status'][] = ['observing', 'coordinating', 'recommendation-published', 'cabinet-decided'];
  const decisions: NocDecision[] = decisionTopics.map((t, i) => {
    const k = `dec:${i}:${Math.floor(ts / 4)}`;
    return {
      id: `NOC-${(20000 + Math.floor(seed(`${k}:i`) * 60000))}`,
      topic: t,
      cabinetOwner: MINISTRIES[Math.floor(seed(`${k}:o`) * MINISTRIES.length)]!,
      status: decisionStatuses[Math.floor(seed(`${k}:s`) * decisionStatuses.length)]!,
      rationalePublic: true,
      ageHrs: Math.round(wave(`${k}:a`, ts, 1, 240)),
    };
  });
  const major = incidents.filter(x => x.severity === 'major' || x.severity === 'national').length;
  const posture: NocPosture = major >= 3 ? 'national-emergency' : major >= 2 ? 'crisis' : major >= 1 ? 'elevated' : 'steady';
  const nationalReadiness = Math.round(ministries.reduce((s, m) => s + m.operational, 0) / ministries.length);
  return {
    epoch,
    posture,
    nationalReadiness,
    ministries,
    incidents,
    decisions,
    cabinetSyncMin: Math.round(wave('cs:m', ts, 6, 60)),
    publicBriefing: { lastPublishedMin: Math.round(wave('pb:l', ts, 12, 240)), cadenceMin: 360 },
    prohibited: NOC_SAFEGUARDS.prohibited,
  };
}
