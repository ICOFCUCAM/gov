// lib/gov/emergency-resilience.ts
//
// Sovereign Emergency Management & National Resilience engine.
// National emergency command, disaster response & rescue, national
// continuity & resilience, humanitarian & civil support, crisis
// communications & alert networks, recovery & reconstruction, and
// 20-year national risk forecasting — one connected deterministic
// runtime. Cross-ministry cascade carries every catastrophe through
// Interior / Health / Energy / Transport / Agriculture / Treasury /
// Foreign Affairs / Cabinet / National Coordination.
// Pure & deterministic; SSR-stable per operational epoch.

import { seed, wave } from '@/lib/telemetry';
import { emergencyOps } from '@/lib/gov/agency-systems';

export const EMERGENCY_SAFEGUARDS = {
  humanitarianContinuity: true as const,
  rightsPreservingResponse: true as const,
  civilianPriority: true as const,
  equitableDisasterSupport: true as const,
  prohibited: [
    'authoritarian-emergency-extension', 'martial-overreach',
    'discriminatory-evacuation-prioritisation', 'suspension-of-civil-protections',
    'non-consensual-population-displacement', 'denial-of-humanitarian-access',
  ] as const,
};

export type EmergencyPosture =
  | 'standby' | 'watch' | 'engaged' | 'crisis' | 'national-mobilisation';

export const REGIONS = ['Capital District', 'Northern', 'Eastern', 'Western', 'Coastal', 'Highland'];

// ── 1. National emergency command ───────────────────────────────────
export interface RegionalTheatre {
  region: string;
  status: 'nominal' | 'watch' | 'engaged' | 'crisis';
  activeIncidents: number;
  respondersDeployed: number;
  populationAffectedK: number;
  recoveryStartedPct: number;
}

export interface EmergencyCommand {
  posture: EmergencyPosture;
  nationalEscalationLevel: 1 | 2 | 3 | 4 | 5;
  activeCrises: number;
  severityComposite: number;     // 0..100
  continuityStabilisationIdx: number;
  multiAgencyCoordinationIdx: number;
  resilienceIdx: number;
  responseReadinessPct: number;
  theatres: RegionalTheatre[];
}

// ── 2. Disaster response & rescue operations ────────────────────────
export interface RescueOperation {
  id: string;
  kind: 'fire' | 'flood' | 'earthquake' | 'storm' | 'industrial-accident' | 'maritime' | 'building-collapse';
  region: string;
  severity: 'low' | 'elevated' | 'severe' | 'catastrophic';
  respondersOnSceneK: number;
  evacueesK: number;
  rescuedToday: number;
  meanResponseMin: number;
  phase: 'mobilising' | 'active-rescue' | 'containment' | 'stabilising' | 'standing-down';
}

export interface ResponseOperations {
  rescueOperations: RescueOperation[];
  respondersTotalK: number;
  respondersAvailableK: number;
  rescueVehiclesDeployed: number;
  aerialAssetsDeployed: number;
  marineAssetsDeployed: number;
  meanMobiliseMin: number;
}

// ── 3. National continuity & resilience ─────────────────────────────
export interface InfrastructureContinuity {
  domain: 'Energy grid' | 'Transport' | 'Water & sewage' | 'Telecommunications' | 'Public health' | 'Food supply';
  survivabilityIdx: number;
  recoveryProgressPct: number;
  reserveCoverageDays: number;
  status: 'intact' | 'pressured' | 'degraded' | 'restoring';
}

export interface NationalResilience {
  resilienceHardeningIdx: number;
  strategicReserveActivePct: number;
  societalStabilityIdx: number;
  infrastructure: InfrastructureContinuity[];
}

// ── 4. Humanitarian & civil support ─────────────────────────────────
export interface ShelterNetwork {
  id: string;
  region: string;
  shelters: number;
  occupancyK: number;
  capacityK: number;
  utilisationPct: number;
  status: 'available' | 'monitored' | 'pressured' | 'full';
}

export interface HumanitarianCoordination {
  displacedPopulationK: number;
  shelterNetworks: ShelterNetwork[];
  emergencyFoodDeliveriesDailyK: number;
  emergencyWaterDeliveriesDailyM: number;       // millions of litres
  reliefSuppliesCoverDays: number;
  humanitarianAccessIdx: number;
}

// ── 5. Crisis communications & alerts ───────────────────────────────
export interface AlertChannel {
  channel: string;             // e.g. SMS-Cell broadcast
  reachM: number;              // citizens reached (millions)
  uptimePct: number;
  activeAlerts: number;
  channelHealth: 'operational' | 'degraded' | 'offline';
}

export interface CrisisCommunications {
  channels: AlertChannel[];
  nationalAlertsActive: number;
  publicAdvisoriesIssued24h: number;
  interMinistryRoutesActive: number;
  averagePropagationSeconds: number;
}

// ── 6. Recovery & reconstruction ────────────────────────────────────
export interface RecoveryProgramme {
  id: string;
  programme: string;
  region: string;
  category: 'housing' | 'infrastructure' | 'economic' | 'social' | 'environmental';
  progressPct: number;
  fundingCommittedBn: number;
  daysActive: number;
  status: 'planning' | 'executing' | 'monitoring' | 'completing';
}

// ── 7. Risk forecasting ─────────────────────────────────────────────
export type NationalRiskKind =
  | 'climate-disaster' | 'pandemic' | 'cyber-infrastructure'
  | 'regional-conflict' | 'industrial-catastrophe' | 'cascading-grid-failure'
  | 'food-supply-disruption' | 'mass-displacement';

export interface NationalRisk {
  kind: NationalRiskKind;
  probabilityPct: number;
  potentialImpactIdx: number;     // 0..100
  preparednessIdx: number;
  composite: number;              // risk × impact ÷ preparedness factor
  classification: 'low' | 'moderate' | 'elevated' | 'severe';
}

export interface ResilienceForecast {
  horizonYears: number[];           // 5,10,15,20
  resilienceTrajectory: number[];
  preparednessTrajectory: number[];
  recoveryCapacityTrajectory: number[];
  cascadingFailureTrajectory: number[];   // higher = worse
  catastropheSurvivabilityIdx: number;
  systemicResilienceRisk: number;
}

// ── 8. Emergency incident ───────────────────────────────────────────
export type EmergencyIncidentKind =
  | 'major-earthquake' | 'national-flood' | 'wildfire-front'
  | 'severe-storm' | 'industrial-disaster' | 'critical-infrastructure-failure'
  | 'humanitarian-mass-displacement' | 'national-cyber-incident';

export interface EmergencyIncident {
  id: string;
  kind: EmergencyIncidentKind;
  severity: 'advisory' | 'elevated' | 'critical' | 'national';
  region: string;
  ageHours: number;
  populationAffectedK: number;
  recoveryPathway: 'rescue-mobilisation' | 'mass-evacuation' | 'continuity-stabilisation' | 'reconstruction';
  ministryCascade: { ministry: string; effect: string; delayHrs: number; status: 'pending' | 'engaged' | 'cleared' }[];
}

export interface EmergencyResilienceBoard {
  epoch: number;
  command: EmergencyCommand;
  response: ResponseOperations;
  resilience: NationalResilience;
  humanitarian: HumanitarianCoordination;
  communications: CrisisCommunications;
  recovery: RecoveryProgramme[];
  risks: NationalRisk[];
  forecast: ResilienceForecast;
  incidents: EmergencyIncident[];
  bannerLine: string;
  ministriesEngaged: { ministry: string; engaged: number }[];
  prohibited: readonly string[];
}

const PROPAGATION: Record<EmergencyIncidentKind, { ministry: string; effect: string; delayHrs: number }[]> = {
  'major-earthquake': [
    { ministry: 'Interior', effect: 'Search & rescue mobilisation', delayHrs: 1 },
    { ministry: 'Health', effect: 'Mass-casualty trauma protocol', delayHrs: 2 },
    { ministry: 'Transport', effect: 'Corridor & bridge assessment', delayHrs: 2 },
    { ministry: 'Energy', effect: 'Grid stabilisation & shut-off', delayHrs: 1 },
    { ministry: 'Treasury', effect: 'Emergency-relief disbursement', delayHrs: 12 },
    { ministry: 'Cabinet', effect: 'National-emergency declaration review', delayHrs: 6 },
  ],
  'national-flood': [
    { ministry: 'Transport', effect: 'Routing closures & detours', delayHrs: 2 },
    { ministry: 'Health', effect: 'Water-borne illness response', delayHrs: 12 },
    { ministry: 'Agriculture', effect: 'Yield & livestock assessment', delayHrs: 24 },
    { ministry: 'Treasury', effect: 'Relief & recovery funding', delayHrs: 24 },
    { ministry: 'Interior', effect: 'Evacuation & shelter coordination', delayHrs: 4 },
  ],
  'wildfire-front': [
    { ministry: 'Interior', effect: 'Fire-services & evacuation', delayHrs: 1 },
    { ministry: 'Health', effect: 'Respiratory surge response', delayHrs: 6 },
    { ministry: 'Transport', effect: 'Road & rail closures', delayHrs: 2 },
    { ministry: 'Agriculture', effect: 'Agricultural & wildlife assessment', delayHrs: 24 },
  ],
  'severe-storm': [
    { ministry: 'Energy', effect: 'Grid recovery & line crews', delayHrs: 4 },
    { ministry: 'Transport', effect: 'Aviation & maritime shutdown', delayHrs: 2 },
    { ministry: 'Health', effect: 'Injury surge protocol', delayHrs: 6 },
    { ministry: 'Interior', effect: 'Shelter & rescue coordination', delayHrs: 4 },
  ],
  'industrial-disaster': [
    { ministry: 'Health', effect: 'Hazmat-exposure protocol', delayHrs: 2 },
    { ministry: 'Interior', effect: 'Site cordon & investigation', delayHrs: 4 },
    { ministry: 'Environment', effect: 'Contamination assessment', delayHrs: 6 },
    { ministry: 'Treasury', effect: 'Liability & remediation funding', delayHrs: 48 },
  ],
  'critical-infrastructure-failure': [
    { ministry: 'Energy', effect: 'Restoration & blackstart', delayHrs: 2 },
    { ministry: 'Transport', effect: 'Alternate-routing engaged', delayHrs: 4 },
    { ministry: 'Health', effect: 'Hospital-continuity protocol', delayHrs: 4 },
    { ministry: 'Cabinet', effect: 'Continuity activation', delayHrs: 12 },
  ],
  'humanitarian-mass-displacement': [
    { ministry: 'Interior', effect: 'Border & shelter coordination', delayHrs: 6 },
    { ministry: 'Health', effect: 'Care for displaced populations', delayHrs: 12 },
    { ministry: 'Foreign Affairs', effect: 'International coordination', delayHrs: 24 },
    { ministry: 'Treasury', effect: 'Humanitarian-relief disbursement', delayHrs: 24 },
    { ministry: 'National Coordination', effect: 'Multi-ministry humanitarian protocol', delayHrs: 24 },
  ],
  'national-cyber-incident': [
    { ministry: 'Interior', effect: 'National-security review', delayHrs: 1 },
    { ministry: 'Energy', effect: 'OT/ICS hardening', delayHrs: 4 },
    { ministry: 'Treasury', effect: 'Payments-rail isolation', delayHrs: 2 },
    { ministry: 'Cabinet', effect: 'Continuity advisory', delayHrs: 12 },
  ],
};

const KIND_LIST: EmergencyIncidentKind[] = [
  'major-earthquake', 'national-flood', 'wildfire-front', 'severe-storm',
  'industrial-disaster', 'critical-infrastructure-failure',
  'humanitarian-mass-displacement', 'national-cyber-incident',
];

const RESCUE_KINDS: RescueOperation['kind'][] = ['fire', 'flood', 'earthquake', 'storm', 'industrial-accident', 'maritime', 'building-collapse'];
const PHASES: RescueOperation['phase'][] = ['mobilising', 'active-rescue', 'containment', 'stabilising', 'standing-down'];

const INFRA_DOMAINS: InfrastructureContinuity['domain'][] = ['Energy grid', 'Transport', 'Water & sewage', 'Telecommunications', 'Public health', 'Food supply'];

const ALERT_CHANNELS = ['SMS-Cell broadcast', 'National Radio', 'Public TV', 'Civic-app push', 'Sirens & loudspeakers', 'Government online portal'];

const RECOVERY_DEFS: { programme: string; category: RecoveryProgramme['category'] }[] = [
  { programme: 'Housing reconstruction', category: 'housing' },
  { programme: 'Transport corridor restoration', category: 'infrastructure' },
  { programme: 'Power-grid hardening', category: 'infrastructure' },
  { programme: 'SME recovery grants', category: 'economic' },
  { programme: 'Mental-health continuity outreach', category: 'social' },
  { programme: 'Watershed restoration', category: 'environmental' },
  { programme: 'Schools rebuilding', category: 'social' },
];

const RISK_KINDS: NationalRiskKind[] = [
  'climate-disaster', 'pandemic', 'cyber-infrastructure', 'regional-conflict',
  'industrial-catastrophe', 'cascading-grid-failure', 'food-supply-disruption', 'mass-displacement',
];

export function emergencyResilienceBoard(now: number): EmergencyResilienceBoard {
  const epoch = Math.max(0, Math.floor(now / 4000));
  const ts = epoch;
  const eo = emergencyOps('national', ts);

  // 1. Regional theatres
  const theatres: RegionalTheatre[] = REGIONS.map(region => {
    const k = `er:th:${region}`;
    const statusRoll = seed(`${k}:st:${Math.floor(epoch / 5)}`);
    const status: RegionalTheatre['status'] =
      statusRoll > 0.92 ? 'crisis'
        : statusRoll > 0.74 ? 'engaged'
          : statusRoll > 0.42 ? 'watch' : 'nominal';
    const activeIncidents = status === 'crisis' ? 2 + Math.floor(seed(`${k}:ai`) * 4)
      : status === 'engaged' ? 1 + Math.floor(seed(`${k}:ai`) * 2)
        : Math.floor(seed(`${k}:ai`) * 2);
    const respondersDeployed = Math.round(wave(`${k}:rd`, epoch / 4, 60, 2600));
    const populationAffectedK = Math.round(wave(`${k}:pa`, epoch / 5, 4, 880));
    const recoveryStartedPct = Math.round(wave(`${k}:rs`, epoch / 6, 0, 92));
    return { region, status, activeIncidents, respondersDeployed, populationAffectedK, recoveryStartedPct };
  });
  const crisesCount = theatres.filter(t => t.status === 'crisis').length;
  const engagedCount = theatres.filter(t => t.status === 'engaged').length;
  const severityComposite = Math.round(crisesCount * 22 + engagedCount * 12 + eo.activeCrises * 6);
  const continuityStabilisationIdx = Math.round(wave(`er:cmd:co`, epoch / 7, 44, 92));
  const multiAgencyCoordinationIdx = Math.round(wave(`er:cmd:ma`, epoch / 6, 50, 96));
  const resilienceIdx = Math.round(wave(`er:cmd:re`, epoch / 9, 48, 92));
  const responseReadinessPct = Math.round((eo.respondersAvailable / Math.max(1, eo.responders)) * 100);
  const posture: EmergencyPosture =
    crisesCount >= 2 || severityComposite >= 65 ? 'national-mobilisation'
      : crisesCount >= 1 || severityComposite >= 45 ? 'crisis'
        : engagedCount >= 1 || severityComposite >= 25 ? 'engaged'
          : severityComposite >= 10 ? 'watch' : 'standby';
  const nationalEscalationLevel = (posture === 'national-mobilisation' ? 5 : posture === 'crisis' ? 4 : posture === 'engaged' ? 3 : posture === 'watch' ? 2 : 1) as 1 | 2 | 3 | 4 | 5;
  const command: EmergencyCommand = {
    posture, nationalEscalationLevel, activeCrises: eo.activeCrises,
    severityComposite: Math.min(100, severityComposite), continuityStabilisationIdx,
    multiAgencyCoordinationIdx, resilienceIdx, responseReadinessPct, theatres,
  };

  // 2. Response operations
  const rescueOperations: RescueOperation[] = Array.from({ length: 7 }, (_, i) => {
    const k = `er:ro:${i}:${Math.floor(epoch / 4)}`;
    const kind = RESCUE_KINDS[Math.floor(seed(`${k}:k`) * RESCUE_KINDS.length)]!;
    const region = REGIONS[Math.floor(seed(`${k}:r`) * REGIONS.length)]!;
    const sevRoll = seed(`${k}:sv`);
    const severity: RescueOperation['severity'] = sevRoll > 0.92 ? 'catastrophic' : sevRoll > 0.74 ? 'severe' : sevRoll > 0.42 ? 'elevated' : 'low';
    const respondersOnSceneK = Math.round(wave(`${k}:ro`, epoch / 4, 0.1, 8.4) * 10) / 10;
    const evacueesK = Math.round(wave(`${k}:ev`, epoch / 4, 0.2, 64) * 10) / 10;
    const rescuedToday = Math.round(wave(`${k}:rt`, epoch / 4, 8, 1240));
    const meanResponseMin = Math.round(wave(`${k}:mr`, epoch / 5, 4, 38));
    const phase = PHASES[Math.floor(seed(`${k}:ph`) * PHASES.length)]!;
    return { id: `RO-${(4000 + Math.floor(seed(`${k}:id`) * 50000))}`, kind, region, severity, respondersOnSceneK, evacueesK, rescuedToday, meanResponseMin, phase };
  }).sort((a, b) => {
    const sev = (s: RescueOperation['severity']) => s === 'catastrophic' ? 3 : s === 'severe' ? 2 : s === 'elevated' ? 1 : 0;
    return sev(b.severity) - sev(a.severity) || b.evacueesK - a.evacueesK;
  });
  const response: ResponseOperations = {
    rescueOperations,
    respondersTotalK: Math.round(eo.responders / 1000),
    respondersAvailableK: Math.round(eo.respondersAvailable / 1000),
    rescueVehiclesDeployed: Math.round(wave(`er:resp:rv`, epoch / 4, 120, 4400)),
    aerialAssetsDeployed: Math.round(wave(`er:resp:ae`, epoch / 5, 4, 120)),
    marineAssetsDeployed: Math.round(wave(`er:resp:ma`, epoch / 5, 0, 60)),
    meanMobiliseMin: eo.meanMobiliseMin,
  };

  // 3. National resilience
  const infrastructure: InfrastructureContinuity[] = INFRA_DOMAINS.map(domain => {
    const k = `er:in:${domain}`;
    const survivabilityIdx = Math.round(wave(`${k}:su`, epoch / 6, 48, 96));
    const recoveryProgressPct = Math.round(wave(`${k}:rp`, epoch / 5, 0, 100));
    const reserveCoverageDays = Math.round(wave(`${k}:rs`, epoch / 7, 5, 120));
    const status: InfrastructureContinuity['status'] =
      survivabilityIdx < 60 ? 'degraded'
        : recoveryProgressPct < 95 && recoveryProgressPct > 5 ? 'restoring'
          : survivabilityIdx < 80 ? 'pressured' : 'intact';
    return { domain, survivabilityIdx, recoveryProgressPct, reserveCoverageDays, status };
  });
  const resilience: NationalResilience = {
    resilienceHardeningIdx: Math.round(wave(`er:rs:rh`, epoch / 7, 44, 92)),
    strategicReserveActivePct: Math.round(wave(`er:rs:sr`, epoch / 6, 0, 64)),
    societalStabilityIdx: Math.round(wave(`er:rs:ss`, epoch / 8, 52, 96)),
    infrastructure,
  };

  // 4. Humanitarian coordination
  const shelterNetworks: ShelterNetwork[] = REGIONS.map((region, i) => {
    const k = `er:sh:${region}`;
    const shelters = 18 + Math.floor(seed(`${k}:sh`) * 120);
    const capacityK = 8 + Math.floor(seed(`${k}:ca`) * 96);
    const occupancyK = Math.round(wave(`${k}:oc`, epoch / 4, 0.1, capacityK * 1.1) * 10) / 10;
    const utilisationPct = Math.min(100, Math.round((occupancyK / Math.max(0.1, capacityK)) * 100));
    const status: ShelterNetwork['status'] =
      utilisationPct >= 95 ? 'full'
        : utilisationPct >= 75 ? 'pressured'
          : utilisationPct >= 40 ? 'monitored' : 'available';
    void i;
    return { id: `SN-${i + 1}`, region, shelters, occupancyK, capacityK, utilisationPct, status };
  });
  const humanitarian: HumanitarianCoordination = {
    displacedPopulationK: Math.round(shelterNetworks.reduce((s, x) => s + x.occupancyK, 0) * 10) / 10,
    shelterNetworks,
    emergencyFoodDeliveriesDailyK: Math.round(wave(`er:hm:fd`, epoch / 4, 12, 380)),
    emergencyWaterDeliveriesDailyM: Math.round(wave(`er:hm:wd`, epoch / 4, 0.4, 18) * 10) / 10,
    reliefSuppliesCoverDays: Math.round(wave(`er:hm:rs`, epoch / 6, 4, 60)),
    humanitarianAccessIdx: Math.round(wave(`er:hm:ha`, epoch / 7, 58, 96)),
  };

  // 5. Crisis communications
  const channels: AlertChannel[] = ALERT_CHANNELS.map(channel => {
    const k = `er:ch:${channel}`;
    const reachM = Math.round(wave(`${k}:rm`, epoch / 7, 4, 48) * 10) / 10;
    const uptimePct = Math.round(wave(`${k}:up`, epoch / 5, 78, 99.5) * 10) / 10;
    const activeAlerts = Math.floor(seed(`${k}:al:${Math.floor(epoch / 4)}`) * 6);
    const channelHealth: AlertChannel['channelHealth'] = uptimePct < 90 ? 'degraded' : uptimePct < 80 ? 'offline' : 'operational';
    return { channel, reachM, uptimePct, activeAlerts, channelHealth };
  });
  const communications: CrisisCommunications = {
    channels,
    nationalAlertsActive: channels.reduce((s, c) => s + c.activeAlerts, 0),
    publicAdvisoriesIssued24h: Math.round(wave(`er:com:pa`, epoch / 4, 4, 120)),
    interMinistryRoutesActive: Math.round(wave(`er:com:im`, epoch / 5, 6, 38)),
    averagePropagationSeconds: Math.round(wave(`er:com:ap`, epoch / 5, 4, 38)),
  };

  // 6. Recovery programmes
  const recovery: RecoveryProgramme[] = RECOVERY_DEFS.map((r, i) => {
    const k = `er:rec:${r.programme}`;
    const progressPct = Math.round(wave(`${k}:pr`, epoch / 5, 4, 98));
    const fundingCommittedBn = Math.round(wave(`${k}:fc`, epoch / 7, 0.4, 28) * 10) / 10;
    const daysActive = Math.round(wave(`${k}:da`, epoch / 6, 12, 720));
    const status: RecoveryProgramme['status'] =
      progressPct < 20 ? 'planning'
        : progressPct < 60 ? 'executing'
          : progressPct < 92 ? 'monitoring' : 'completing';
    return { id: `RP-${i + 1}`, programme: r.programme, region: REGIONS[Math.floor(seed(`${k}:rg`) * REGIONS.length)]!, category: r.category, progressPct, fundingCommittedBn, daysActive, status };
  });

  // 7. National risks
  const risks: NationalRisk[] = RISK_KINDS.map(kind => {
    const k = `er:rk:${kind}`;
    const probabilityPct = Math.round(wave(`${k}:p`, epoch / 8, 4, 78));
    const potentialImpactIdx = Math.round(wave(`${k}:i`, epoch / 7, 40, 96));
    const preparednessIdx = Math.round(wave(`${k}:pr`, epoch / 6, 38, 92));
    const composite = Math.min(100, Math.round((probabilityPct * potentialImpactIdx) / Math.max(1, preparednessIdx)));
    const classification: NationalRisk['classification'] =
      composite >= 72 ? 'severe' : composite >= 48 ? 'elevated' : composite >= 28 ? 'moderate' : 'low';
    return { kind, probabilityPct, potentialImpactIdx, preparednessIdx, composite, classification };
  }).sort((a, b) => b.composite - a.composite);

  // 8. Emergency incidents
  const recoveries: EmergencyIncident['recoveryPathway'][] = ['rescue-mobilisation', 'mass-evacuation', 'continuity-stabilisation', 'reconstruction'];
  const incidents: EmergencyIncident[] = Array.from({ length: 7 }, (_, i) => {
    const k = `er:inc:${i}:${Math.floor(epoch / 4)}`;
    const kind = KIND_LIST[Math.floor(seed(`${k}:k`) * KIND_LIST.length)]!;
    const sevRoll = seed(`${k}:sv`);
    const severity: EmergencyIncident['severity'] = sevRoll > 0.92 ? 'national' : sevRoll > 0.76 ? 'critical' : sevRoll > 0.5 ? 'elevated' : 'advisory';
    const ageHours = Math.round(wave(`${k}:age`, epoch / 4, 1, 320));
    const populationAffectedK = Math.round(wave(`${k}:pa`, epoch / 5, 4, 1800));
    const region = REGIONS[Math.floor(seed(`${k}:rg`) * REGIONS.length)]!;
    const cascade = (PROPAGATION[kind] ?? []).map(c => ({
      ...c,
      status: (ageHours < c.delayHrs ? 'pending' : ageHours > c.delayHrs * 6 ? 'cleared' : 'engaged') as 'pending' | 'engaged' | 'cleared',
    }));
    return {
      id: `EMI-${(5000 + Math.floor(seed(`${k}:id`) * 50000))}`,
      kind, severity, region, ageHours, populationAffectedK,
      recoveryPathway: recoveries[Math.floor(seed(`${k}:rp`) * recoveries.length)]!,
      ministryCascade: cascade,
    };
  }).sort((a, b) => {
    const sev = (s: EmergencyIncident['severity']) => s === 'national' ? 3 : s === 'critical' ? 2 : s === 'elevated' ? 1 : 0;
    return sev(b.severity) - sev(a.severity) || b.populationAffectedK - a.populationAffectedK;
  });

  // 9. Forecast
  const horizon = [5, 10, 15, 20];
  const forecast: ResilienceForecast = {
    horizonYears: horizon,
    resilienceTrajectory: horizon.map(h => Math.max(0, Math.min(100, Math.round(resilience.resilienceHardeningIdx + wave(`er:fc:re`, epoch / 6 + h * 0.13, -12, 8))))),
    preparednessTrajectory: horizon.map(h => Math.max(0, Math.min(100, Math.round(wave(`er:fc:pr`, epoch / 5 + h * 0.14, 44, 92))))),
    recoveryCapacityTrajectory: horizon.map(h => Math.max(0, Math.min(100, Math.round(wave(`er:fc:rc`, epoch / 6 + h * 0.13, 40, 92))))),
    cascadingFailureTrajectory: horizon.map(h => Math.max(0, Math.min(100, Math.round(wave(`er:fc:cf`, epoch / 5 + h * 0.15, 12, 72))))),
    catastropheSurvivabilityIdx: Math.round((resilience.resilienceHardeningIdx + resilience.societalStabilityIdx + command.multiAgencyCoordinationIdx) / 3),
    systemicResilienceRisk: Math.min(100, Math.round(
      crisesCount * 16
      + risks.filter(r => r.classification === 'severe').length * 10
      + Math.max(0, command.severityComposite - 30) * 0.5
    )),
  };

  const banner =
    posture === 'national-mobilisation' ? 'NATIONAL MOBILISATION — multi-agency continuity convened'
      : posture === 'crisis' ? 'NATIONAL CRISIS RESPONSE ACTIVE'
        : posture === 'engaged' ? 'EMERGENCY RESPONSE ENGAGED'
          : posture === 'watch' ? 'NATIONAL EMERGENCY WATCH' : 'NATIONAL EMERGENCY STANDBY';

  const ministries = new Map<string, number>();
  for (const inc of incidents) {
    for (const c of inc.ministryCascade) {
      if (c.status !== 'pending') ministries.set(c.ministry, (ministries.get(c.ministry) ?? 0) + 1);
    }
  }
  const ministriesEngaged = Array.from(ministries.entries())
    .map(([ministry, engaged]) => ({ ministry, engaged }))
    .sort((a, b) => b.engaged - a.engaged);

  return {
    epoch, command, response, resilience, humanitarian, communications,
    recovery, risks, forecast, incidents, bannerLine: banner, ministriesEngaged,
    prohibited: EMERGENCY_SAFEGUARDS.prohibited,
  };
}
