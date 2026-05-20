// lib/gov/sovereign-events.ts
//
// National sovereign-events engine. Deterministic live incident stream
// for the Ministry of Interior's tactical command — incidents originate
// from an Interior agency, carry an escalation stage, and propagate
// across ministries (Health / Treasury / Transport / Emergency / National
// Coordination) along realistic chains. Pure & deterministic;
// SSR-stable per operational epoch.

import { seed, wave } from '@/lib/telemetry';

export type IncidentKind =
  | 'border-incident' | 'civil-unrest' | 'cyber-attack' | 'disaster'
  | 'smuggling-network' | 'infrastructure-breach' | 'intelligence-alert'
  | 'identity-fraud-network' | 'cross-border-pursuit';

export type Severity = 'advisory' | 'elevated' | 'critical' | 'national';
export type EscalationStage =
  | 'detected' | 'verified' | 'tactical-response' | 'regional-escalation'
  | 'national-coordination' | 'contained' | 'recovery';

export type OriginAgency =
  | 'POLICE' | 'IMMIGRATION' | 'EMERGENCY' | 'CIVIL_REGISTRY'
  | 'CYBER_UNIT' | 'INTELLIGENCE' | 'CUSTOMS' | 'REGIONAL_ADMIN';

export type Ministry =
  | 'Interior' | 'Health' | 'Treasury' | 'Transport' | 'Energy'
  | 'Emergency Operations' | 'National Coordination' | 'Justice';

export interface MinistryEffect {
  ministry: Ministry;
  effect: string;
  delayHrs: number;
  status: 'pending' | 'engaged' | 'cleared';
}

export interface SovereignIncident {
  id: string;
  kind: IncidentKind;
  region: string;
  severity: Severity;
  originatingAgency: OriginAgency;
  ageHrs: number;
  escalationStage: EscalationStage;
  escalationChain: EscalationStage[];
  propagation: MinistryEffect[];
  status: 'open' | 'escalating' | 'contained' | 'recovering' | 'closed';
  rationale: string;
}

const REGIONS = ['Capital District', 'Northern', 'Eastern', 'Western', 'Coastal', 'Highland'];

const KIND_ORIGIN: Record<IncidentKind, OriginAgency> = {
  'border-incident': 'IMMIGRATION', 'civil-unrest': 'POLICE',
  'cyber-attack': 'CYBER_UNIT', 'disaster': 'EMERGENCY',
  'smuggling-network': 'CUSTOMS', 'infrastructure-breach': 'INTELLIGENCE',
  'intelligence-alert': 'INTELLIGENCE', 'identity-fraud-network': 'CIVIL_REGISTRY',
  'cross-border-pursuit': 'POLICE',
};

const STAGE_ORDER: EscalationStage[] = [
  'detected', 'verified', 'tactical-response', 'regional-escalation',
  'national-coordination', 'contained', 'recovery',
];

// Inter-ministry propagation chains. Each ministry effect carries the
// realistic cascade delay so the apex can render the timeline correctly.
const PROPAGATION: Record<IncidentKind, MinistryEffect[]> = {
  'border-incident': [
    { ministry: 'Health', effect: 'Quarantine readiness raised', delayHrs: 2, status: 'pending' },
    { ministry: 'Treasury', effect: 'Contingency funding gated', delayHrs: 6, status: 'pending' },
    { ministry: 'Transport', effect: 'Corridor rerouting advised', delayHrs: 4, status: 'pending' },
    { ministry: 'National Coordination', effect: 'Cross-ministry brief', delayHrs: 8, status: 'pending' },
  ],
  'civil-unrest': [
    { ministry: 'Emergency Operations', effect: 'Standby & responder pre-position', delayHrs: 1, status: 'pending' },
    { ministry: 'Justice', effect: 'Judicial protection escalation', delayHrs: 3, status: 'pending' },
    { ministry: 'National Coordination', effect: 'Cabinet stability brief', delayHrs: 6, status: 'pending' },
  ],
  'cyber-attack': [
    { ministry: 'Treasury', effect: 'Fiscal-systems integrity check', delayHrs: 0, status: 'pending' },
    { ministry: 'Energy', effect: 'Grid SCADA isolation review', delayHrs: 1, status: 'pending' },
    { ministry: 'National Coordination', effect: 'National cyber posture raised', delayHrs: 2, status: 'pending' },
  ],
  'disaster': [
    { ministry: 'Health', effect: 'Medical surge & casualty triage', delayHrs: 0, status: 'pending' },
    { ministry: 'Transport', effect: 'Logistics & evacuation routing', delayHrs: 2, status: 'pending' },
    { ministry: 'Treasury', effect: 'Disaster contingency release gate', delayHrs: 6, status: 'pending' },
    { ministry: 'Emergency Operations', effect: 'Incident command activated', delayHrs: 0, status: 'pending' },
    { ministry: 'National Coordination', effect: 'National emergency brief', delayHrs: 4, status: 'pending' },
  ],
  'smuggling-network': [
    { ministry: 'Treasury', effect: 'Customs revenue impact assessment', delayHrs: 6, status: 'pending' },
    { ministry: 'National Coordination', effect: 'Inter-agency interdiction brief', delayHrs: 8, status: 'pending' },
  ],
  'infrastructure-breach': [
    { ministry: 'Energy', effect: 'Critical-infrastructure isolation', delayHrs: 1, status: 'pending' },
    { ministry: 'Transport', effect: 'Corridor protection raised', delayHrs: 2, status: 'pending' },
    { ministry: 'Emergency Operations', effect: 'Continuity posture', delayHrs: 4, status: 'pending' },
  ],
  'intelligence-alert': [
    { ministry: 'National Coordination', effect: 'Threat assessment circulated', delayHrs: 2, status: 'pending' },
    { ministry: 'Justice', effect: 'Warrant authorisation prepared', delayHrs: 4, status: 'pending' },
  ],
  'identity-fraud-network': [
    { ministry: 'Treasury', effect: 'Benefit-payment integrity review', delayHrs: 6, status: 'pending' },
    { ministry: 'Justice', effect: 'Prosecution coordination', delayHrs: 10, status: 'pending' },
  ],
  'cross-border-pursuit': [
    { ministry: 'Justice', effect: 'Extradition liaison', delayHrs: 8, status: 'pending' },
    { ministry: 'National Coordination', effect: 'Foreign-ministry brief', delayHrs: 12, status: 'pending' },
  ],
};

const KIND_RATIONALE: Record<IncidentKind, string> = {
  'border-incident': 'Frontier event with potential public-health and security spillover.',
  'civil-unrest': 'Civic-stability disturbance requiring lawful policing & emergency response.',
  'cyber-attack': 'Cyber posture engaged — institutional systems under digital pressure.',
  'disaster': 'Natural / industrial disaster requiring coordinated humanitarian response.',
  'smuggling-network': 'Illicit cross-border network detected; interdiction & revenue follow-up.',
  'infrastructure-breach': 'Critical infrastructure integrity compromised.',
  'intelligence-alert': 'Internal-security intelligence indicates emerging threat.',
  'identity-fraud-network': 'Identity-fraud ring detected — registry & financial integrity follow-up.',
  'cross-border-pursuit': 'Active suspect crossing jurisdictional boundary.',
};

function propagateEffect(eff: MinistryEffect, ageHrs: number): MinistryEffect {
  const status: MinistryEffect['status'] =
    ageHrs < eff.delayHrs ? 'pending'
      : ageHrs > eff.delayHrs * 6 ? 'cleared' : 'engaged';
  return { ...eff, status };
}

const KIND_LIST: IncidentKind[] = [
  'border-incident', 'civil-unrest', 'cyber-attack', 'disaster',
  'smuggling-network', 'infrastructure-breach', 'intelligence-alert',
  'identity-fraud-network', 'cross-border-pursuit',
];

export function nationalEventStream(now: number, count = 14): SovereignIncident[] {
  const epoch = Math.max(0, Math.floor(now / 4000));
  return Array.from({ length: count }, (_, i) => {
    const k = `ev:${i}:${Math.floor(epoch / 5)}`;
    const kind = KIND_LIST[Math.floor(seed(`${k}:kn`) * KIND_LIST.length)]!;
    const region = REGIONS[Math.floor(seed(`${k}:rg`) * REGIONS.length)]!;
    const ageHrs = Math.round(wave(`${k}:age`, epoch / (4 + seed(`${k}:p`) * 5), 1, 96));
    const sevRoll = seed(`${k}:sv`);
    const severity: Severity = sevRoll > 0.93 ? 'national' : sevRoll > 0.78 ? 'critical' : sevRoll > 0.5 ? 'elevated' : 'advisory';
    const stageIdx = Math.min(STAGE_ORDER.length - 1, Math.floor((ageHrs / 96) * STAGE_ORDER.length));
    const stage = STAGE_ORDER[stageIdx]!;
    const chain = STAGE_ORDER.slice(0, stageIdx + 1);
    const propagation = (PROPAGATION[kind] ?? []).map(e => propagateEffect(e, ageHrs));
    const status: SovereignIncident['status'] =
      stage === 'contained' ? 'contained'
        : stage === 'recovery' ? 'recovering'
          : stage === 'detected' || stage === 'verified' ? 'open' : 'escalating';
    return {
      id: `INC-${(1000 + Math.floor(seed(`${k}:id`) * 90000))}`,
      kind, region, severity,
      originatingAgency: KIND_ORIGIN[kind],
      ageHrs,
      escalationStage: stage,
      escalationChain: chain,
      propagation,
      status,
      rationale: KIND_RATIONALE[kind],
    };
  }).sort((a, b) => {
    const sev = (s: Severity) => s === 'national' ? 3 : s === 'critical' ? 2 : s === 'elevated' ? 1 : 0;
    return sev(b.severity) - sev(a.severity) || b.ageHrs - a.ageHrs;
  });
}

export interface EventStreamBoard {
  epoch: number;
  incidents: SovereignIncident[];
  totalActive: number;
  criticalCount: number;
  nationalCount: number;
  byKind: { kind: IncidentKind; count: number }[];
  byRegion: { region: string; count: number; criticalCount: number }[];
  postureBanner: 'STABLE' | 'ENGAGED' | 'ELEVATED' | 'CRITICAL';
  ministriesActive: { ministry: Ministry; engaged: number }[];
}

export function eventStreamBoard(now: number): EventStreamBoard {
  const epoch = Math.max(0, Math.floor(now / 4000));
  const incidents = nationalEventStream(now);
  const totalActive = incidents.filter(i => i.status !== 'recovering' && i.status !== 'contained').length;
  const criticalCount = incidents.filter(i => i.severity === 'critical' || i.severity === 'national').length;
  const nationalCount = incidents.filter(i => i.severity === 'national').length;

  const byKind = KIND_LIST.map(k => ({ kind: k, count: incidents.filter(i => i.kind === k).length }))
    .filter(x => x.count > 0).sort((a, b) => b.count - a.count);
  const byRegion = REGIONS.map(region => ({
    region,
    count: incidents.filter(i => i.region === region).length,
    criticalCount: incidents.filter(i => i.region === region && (i.severity === 'critical' || i.severity === 'national')).length,
  })).sort((a, b) => b.criticalCount - a.criticalCount || b.count - a.count);

  const postureBanner: EventStreamBoard['postureBanner'] =
    nationalCount >= 1 || criticalCount >= 3 ? 'CRITICAL'
      : criticalCount >= 1 ? 'ELEVATED'
        : totalActive >= 6 ? 'ENGAGED' : 'STABLE';

  const ministriesActive: { ministry: Ministry; engaged: number }[] = (
    ['Interior', 'Health', 'Treasury', 'Transport', 'Energy', 'Emergency Operations', 'National Coordination', 'Justice'] as Ministry[]
  ).map(ministry => ({
    ministry,
    engaged: incidents.flatMap(i => i.propagation)
      .filter(e => e.ministry === ministry && e.status !== 'pending').length,
  })).filter(x => x.engaged > 0).sort((a, b) => b.engaged - a.engaged);

  return { epoch, incidents, totalActive, criticalCount, nationalCount, byKind, byRegion, postureBanner, ministriesActive };
}

// Operational timeline — deterministic recent incident-count history.
export function operationalTimeline(now: number, lookback = 8): { epoch: number; total: number; critical: number }[] {
  const nowEpoch = Math.max(0, Math.floor(now / 4000));
  const start = Math.max(0, nowEpoch - lookback);
  const out: { epoch: number; total: number; critical: number }[] = [];
  for (let e = start; e <= nowEpoch; e++) {
    const incidents = nationalEventStream(e * 4000);
    out.push({
      epoch: e,
      total: incidents.length,
      critical: incidents.filter(i => i.severity === 'critical' || i.severity === 'national').length,
    });
  }
  return out;
}
