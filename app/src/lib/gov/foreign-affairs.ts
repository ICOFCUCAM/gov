// lib/gov/foreign-affairs.ts
//
// Sovereign Foreign Affairs & Geopolitical Relations engine. Global
// geopolitical posture, diplomatic missions, treaties, international
// crises, economic diplomacy, strategic intelligence, consular
// continuity and international-organisation coordination — one
// connected deterministic runtime. Cross-ministry cascade carries
// every diplomatic event through Treasury / Trade / Interior / Energy /
// Agriculture / Defense / Cabinet / National Coordination.
// Pure & deterministic; SSR-stable per operational epoch. Defensive,
// internationally lawful — no offensive operations, no per-citizen
// targeting, anti-imperial escalation safeguards enforced by tests.

import { seed, wave } from '@/lib/telemetry';

export const DIPLOMATIC_SAFEGUARDS = {
  internationallyLawful: true as const,
  pluralisticEngagement: true as const,
  humanitarianProtections: true as const,
  prohibited: [
    'offensive-influence-operations', 'unlawful-intelligence-aggregation',
    'imperial-coercion', 'per-citizen-foreign-targeting',
    'population-influence-against-third-states', 'unlawful-extraterritorial-enforcement',
  ] as const,
};

export type GeopoliticalPosture =
  | 'aligned' | 'balanced' | 'realigning' | 'pressured' | 'crisis-engagement';

export const REGIONS = ['Northern Realms', 'Eastern Compact', 'Southern Bloc', 'Western Union', 'Maritime Periphery', 'Polar Frontier'] as const;
export type Region = (typeof REGIONS)[number];

export interface RegionalTension {
  region: Region;
  tensionIdx: number;
  drift: 'aligning' | 'stable' | 'cooling' | 'drifting' | 'fracturing';
  flashpoints: number;
}

export interface GeopoliticalCommand {
  posture: GeopoliticalPosture;
  globalAlignmentIdx: number;
  allianceStabilityIdx: number;
  diplomaticEscalationIdx: number;
  multipolarBalanceIdx: number;
  regionalTensions: RegionalTension[];
}

export interface DiplomaticMission {
  id: string;
  postName: string;
  region: Region;
  partner: string;
  capital: string;
  ambassador: string;
  staff: number;
  securityPosture: 'normal' | 'heightened' | 'lockdown' | 'evacuation';
  continuityIdx: number;
  consularLoad: number;
  flag: 'embassy' | 'consulate' | 'permanent-mission' | 'special-envoy';
}

export interface Treaty {
  id: string;
  title: string;
  scope: 'bilateral' | 'regional' | 'multilateral' | 'universal';
  signatories: number;
  yearsInForce: number;
  complianceIdx: number;
  status: 'in-force' | 'review' | 'amendment' | 'suspended' | 'expired';
  renegotiationDueY: number;
  domain: 'security' | 'trade' | 'climate' | 'rights' | 'maritime' | 'tech';
}

export type DiplomaticIncidentKind =
  | 'bilateral-breakdown' | 'regional-conflict' | 'treaty-suspension'
  | 'sanctions-imposed-on-us' | 'humanitarian-crisis' | 'alliance-drift'
  | 'embassy-incident' | 'consular-mass-event';

export interface DiplomaticIncident {
  id: string;
  kind: DiplomaticIncidentKind;
  severity: 'advisory' | 'elevated' | 'critical' | 'national';
  counterparty: string;
  region: Region;
  ageDays: number;
  negotiationStage: 'observation' | 'consultation' | 'demarche' | 'mediation' | 'arbitration' | 'resolution';
  ministryCascade: { ministry: string; effect: string; delayHrs: number; status: 'pending' | 'engaged' | 'cleared' }[];
}

export interface EconomicDiplomacy {
  tradeAlignmentIdx: number;
  investmentContinuityIdx: number;
  sanctionsExposureIdx: number;
  strategicResourceCoverageIdx: number;
  bilateralPartners: { partner: string; alignmentIdx: number; tradeShare: number }[];
}

export interface RegionalDrift {
  region: Region;
  driftIdx: number;
  influenceIdx: number;
  instabilityForecast: number;
  dependencyIdx: number;
}

export interface ConsularStatus {
  citizensRegisteredAbroadK: number;
  consularCasesActive: number;
  emergencyEvacuationsActive: number;
  passportIssuanceQueue: number;
  travelAdvisoriesActive: { region: Region; level: 'caution' | 'increased' | 'reconsider' | 'do-not-travel' }[];
}

export interface InternationalOrgRoster {
  org: string;
  membership: 'full' | 'observer' | 'associate' | 'review';
  participationIdx: number;
  votingAlignmentIdx: number;
  contributionTier: 'leading' | 'core' | 'standard' | 'minimal';
}

export interface DiplomaticForecast {
  horizonYears: number[];
  alignmentTrajectory: number[];
  allianceIntegrityTrajectory: number[];
  influenceTrajectory: number[];
  globalCoordinationTrajectory: number[];
  civilizationalStandingIdx: number;
  geopoliticalCrisisRisk: number;
  longHorizonSovereigntyIdx: number;
}

export interface ForeignAffairsBoard {
  epoch: number;
  command: GeopoliticalCommand;
  missions: DiplomaticMission[];
  treaties: Treaty[];
  incidents: DiplomaticIncident[];
  economic: EconomicDiplomacy;
  drifts: RegionalDrift[];
  consular: ConsularStatus;
  organizations: InternationalOrgRoster[];
  forecast: DiplomaticForecast;
  bannerLine: string;
  ministriesEngaged: { ministry: string; engaged: number }[];
  prohibited: readonly string[];
}

const PROPAGATION: Record<DiplomaticIncidentKind, { ministry: string; effect: string; delayHrs: number }[]> = {
  'bilateral-breakdown': [
    { ministry: 'Treasury', effect: 'Sovereign-asset exposure review', delayHrs: 12 },
    { ministry: 'Trade & Industry', effect: 'Trade-corridor contingency engaged', delayHrs: 6 },
    { ministry: 'Cabinet', effect: 'Diplomatic-continuity advisory', delayHrs: 24 },
  ],
  'regional-conflict': [
    { ministry: 'Trade & Industry', effect: 'Corridor & port rerouting', delayHrs: 4 },
    { ministry: 'Energy', effect: 'Import-dependency rebalancing', delayHrs: 12 },
    { ministry: 'Interior', effect: 'Migration & border posture elevated', delayHrs: 24 },
    { ministry: 'Cabinet', effect: 'National-security review convened', delayHrs: 12 },
    { ministry: 'National Coordination', effect: 'Cross-ministry continuity briefing', delayHrs: 24 },
  ],
  'treaty-suspension': [
    { ministry: 'Trade & Industry', effect: 'Commercial-relations recalibration', delayHrs: 24 },
    { ministry: 'Treasury', effect: 'Treaty-linked revenue impact modelled', delayHrs: 48 },
    { ministry: 'Cabinet', effect: 'Constitutional-implication review', delayHrs: 48 },
  ],
  'sanctions-imposed-on-us': [
    { ministry: 'Treasury', effect: 'Reserve-asset & payments shielding', delayHrs: 6 },
    { ministry: 'Trade & Industry', effect: 'Export-substitution scenarios', delayHrs: 12 },
    { ministry: 'Energy', effect: 'Strategic-import diversification', delayHrs: 24 },
    { ministry: 'Cabinet', effect: 'Counter-measures convened', delayHrs: 12 },
  ],
  'humanitarian-crisis': [
    { ministry: 'Interior', effect: 'Refugee & migration response engaged', delayHrs: 6 },
    { ministry: 'Health', effect: 'International medical assistance dispatched', delayHrs: 12 },
    { ministry: 'Cabinet', effect: 'Humanitarian-doctrine review', delayHrs: 24 },
    { ministry: 'National Coordination', effect: 'Multi-ministry humanitarian protocol', delayHrs: 24 },
  ],
  'alliance-drift': [
    { ministry: 'Cabinet', effect: 'Strategic-alignment review', delayHrs: 48 },
    { ministry: 'Defense', effect: 'Joint-posture re-evaluation', delayHrs: 48 },
    { ministry: 'National Coordination', effect: 'Alliance-continuity advisory', delayHrs: 72 },
  ],
  'embassy-incident': [
    { ministry: 'Interior', effect: 'Reciprocal-security advisory', delayHrs: 2 },
    { ministry: 'Cabinet', effect: 'Diplomatic-protection invoked', delayHrs: 6 },
  ],
  'consular-mass-event': [
    { ministry: 'Interior', effect: 'Repatriation coordination', delayHrs: 6 },
    { ministry: 'Health', effect: 'Returning-citizen care protocol', delayHrs: 12 },
    { ministry: 'Transport', effect: 'Evacuation airlift & sealift', delayHrs: 4 },
  ],
};

const KIND_LIST: DiplomaticIncidentKind[] = [
  'bilateral-breakdown', 'regional-conflict', 'treaty-suspension',
  'sanctions-imposed-on-us', 'humanitarian-crisis', 'alliance-drift',
  'embassy-incident', 'consular-mass-event',
];

const PARTNER_CAPITALS: { partner: string; region: Region; capital: string }[] = [
  { partner: 'Pacific Realm', region: 'Eastern Compact', capital: 'Senkai' },
  { partner: 'Northern Federation', region: 'Northern Realms', capital: 'Aurøre' },
  { partner: 'Atlantic Union', region: 'Western Union', capital: 'Vilfanten' },
  { partner: 'Southern League', region: 'Southern Bloc', capital: 'Mateca' },
  { partner: 'Continental Compact', region: 'Western Union', capital: 'Reichenau' },
  { partner: 'Indo-Maritime Pact', region: 'Maritime Periphery', capital: 'Sakthipur' },
  { partner: 'Resource Confederation', region: 'Polar Frontier', capital: 'Kolyma' },
  { partner: 'Health Compact', region: 'Maritime Periphery', capital: 'Soraya' },
  { partner: 'Equatorial Alliance', region: 'Southern Bloc', capital: 'Tangelo' },
  { partner: 'Trans-Polar Council', region: 'Polar Frontier', capital: 'Borealis' },
];

const TREATY_DEFS: { title: string; scope: Treaty['scope']; domain: Treaty['domain']; signatories: number }[] = [
  { title: 'Global Maritime Continuity Convention', scope: 'universal', domain: 'maritime', signatories: 162 },
  { title: 'Northern Strategic Defense Pact', scope: 'regional', domain: 'security', signatories: 11 },
  { title: 'Pacific Rim Trade Accord', scope: 'multilateral', domain: 'trade', signatories: 22 },
  { title: 'Continental Climate Compact', scope: 'multilateral', domain: 'climate', signatories: 34 },
  { title: 'Universal Civil Rights Charter', scope: 'universal', domain: 'rights', signatories: 187 },
  { title: 'Bilateral Energy Treaty — Northern Federation', scope: 'bilateral', domain: 'trade', signatories: 2 },
  { title: 'Tech Sovereignty Convention', scope: 'multilateral', domain: 'tech', signatories: 41 },
  { title: 'Polar Frontier Resource Treaty', scope: 'regional', domain: 'maritime', signatories: 9 },
  { title: 'Equatorial Health Pact', scope: 'regional', domain: 'rights', signatories: 18 },
  { title: 'Atlantic Mutual Defense Compact', scope: 'multilateral', domain: 'security', signatories: 14 },
];

const ORG_DEFS = [
  'United Federation', 'Continental Council', 'Maritime Compact', 'Global Trade Court',
  'World Health Convention', 'Polar Frontier Council', 'Climate Continuity Forum', 'Civil Rights Tribunal',
];

function ambassadorName(seedKey: string): string {
  const firsts = ['Adelena', 'Tariq', 'Mira', 'Constance', 'Yuto', 'Ola', 'Petros', 'Idris', 'Lavinia', 'Sora', 'Helio', 'Anika'];
  const lasts = ['Marek', 'Sevda', 'Halberd', 'Okonkwo', 'Veresov', 'Nakahara', 'Astiz', 'Ardent', 'Faroux', 'Renndalen'];
  const f = firsts[Math.floor(seed(`${seedKey}:f`) * firsts.length)]!;
  const l = lasts[Math.floor(seed(`${seedKey}:l`) * lasts.length)]!;
  return `${f} ${l}`;
}

export function foreignAffairsBoard(now: number): ForeignAffairsBoard {
  const epoch = Math.max(0, Math.floor(now / 4000));

  const tensions: RegionalTension[] = REGIONS.map(region => {
    const k = `fa:rt:${region}`;
    const tensionIdx = Math.round(wave(`${k}:t`, epoch / 6, 12, 86));
    const driftRoll = seed(`${k}:d:${Math.floor(epoch / 7)}`);
    const drift: RegionalTension['drift'] =
      tensionIdx >= 75 ? 'fracturing'
        : driftRoll > 0.78 ? 'drifting'
          : driftRoll > 0.6 ? 'cooling'
            : driftRoll > 0.32 ? 'stable' : 'aligning';
    const flashpoints = tensionIdx >= 70 ? 2 + Math.floor(seed(`${k}:fp`) * 4) : tensionIdx >= 50 ? Math.floor(seed(`${k}:fp`) * 3) : 0;
    return { region, tensionIdx, drift, flashpoints };
  });
  const globalAlignmentIdx = Math.round(wave(`fa:cmd:al`, epoch / 7, 44, 92));
  const allianceStabilityIdx = Math.round(wave(`fa:cmd:as`, epoch / 6, 42, 94));
  const diplomaticEscalationIdx = Math.round(tensions.reduce((s, t) => s + t.tensionIdx, 0) / tensions.length);
  const multipolarBalanceIdx = Math.round(wave(`fa:cmd:mp`, epoch / 9, 38, 88));
  const fracturing = tensions.filter(t => t.drift === 'fracturing').length;
  const posture: GeopoliticalPosture =
    fracturing >= 2 || diplomaticEscalationIdx >= 70 ? 'crisis-engagement'
      : fracturing >= 1 || diplomaticEscalationIdx >= 58 ? 'pressured'
        : allianceStabilityIdx < 65 ? 'realigning'
          : globalAlignmentIdx < 78 ? 'balanced' : 'aligned';
  const command: GeopoliticalCommand = {
    posture, globalAlignmentIdx, allianceStabilityIdx,
    diplomaticEscalationIdx, multipolarBalanceIdx, regionalTensions: tensions,
  };

  const missions: DiplomaticMission[] = PARTNER_CAPITALS.map((p, i) => {
    const k = `fa:ms:${p.capital}`;
    const flagRoll = seed(`${k}:fl`);
    const flag: DiplomaticMission['flag'] = flagRoll > 0.86 ? 'permanent-mission' : flagRoll > 0.74 ? 'special-envoy' : flagRoll > 0.42 ? 'consulate' : 'embassy';
    const staff = 18 + Math.floor(seed(`${k}:st`) * 240);
    const continuityIdx = Math.round(wave(`${k}:co`, epoch / 5, 52, 96));
    const consularLoad = Math.round(wave(`${k}:cl`, epoch / 4, 40, 4800));
    const regionTension = tensions.find(t => t.region === p.region)?.tensionIdx ?? 30;
    const securityPosture: DiplomaticMission['securityPosture'] =
      regionTension >= 78 ? 'evacuation'
        : regionTension >= 65 ? 'lockdown'
          : regionTension >= 50 ? 'heightened' : 'normal';
    const postName =
      flag === 'consulate' ? `Consulate-General · ${p.capital}`
        : flag === 'permanent-mission' ? `Permanent Mission · ${p.capital}`
          : flag === 'special-envoy' ? `Special Envoy · ${p.capital}`
            : `Embassy · ${p.capital}`;
    return { id: `MS-${i + 1}`, postName, region: p.region, partner: p.partner, capital: p.capital, ambassador: ambassadorName(k), staff, securityPosture, continuityIdx, consularLoad, flag };
  });

  const treaties: Treaty[] = TREATY_DEFS.map((t, i) => {
    const k = `fa:tr:${t.title}`;
    const yearsInForce = 1 + Math.floor(seed(`${k}:y`) * 70);
    const complianceIdx = Math.round(wave(`${k}:c`, epoch / 7, 48, 96));
    const statusRoll = seed(`${k}:st:${Math.floor(epoch / 8)}`);
    const status: Treaty['status'] =
      statusRoll > 0.94 ? 'expired'
        : statusRoll > 0.86 ? 'suspended'
          : statusRoll > 0.74 ? 'amendment'
            : statusRoll > 0.58 ? 'review' : 'in-force';
    const renegotiationDueY = Math.max(0, Math.round(wave(`${k}:rn`, epoch / 6, -3, 12)));
    return { id: `TR-${i + 1}`, title: t.title, scope: t.scope, domain: t.domain, signatories: t.signatories, yearsInForce, complianceIdx, status, renegotiationDueY };
  });

  const stages: DiplomaticIncident['negotiationStage'][] = ['observation', 'consultation', 'demarche', 'mediation', 'arbitration', 'resolution'];
  const incidents: DiplomaticIncident[] = Array.from({ length: 7 }, (_, i) => {
    const k = `fa:inc:${i}:${Math.floor(epoch / 4)}`;
    const kind = KIND_LIST[Math.floor(seed(`${k}:k`) * KIND_LIST.length)]!;
    const sevRoll = seed(`${k}:sv`);
    const severity: DiplomaticIncident['severity'] = sevRoll > 0.92 ? 'national' : sevRoll > 0.76 ? 'critical' : sevRoll > 0.5 ? 'elevated' : 'advisory';
    const ageDays = Math.round(wave(`${k}:age`, epoch / 6, 1, 220));
    const counterparty = PARTNER_CAPITALS[Math.floor(seed(`${k}:cp`) * PARTNER_CAPITALS.length)]!.partner;
    const region = PARTNER_CAPITALS.find(p => p.partner === counterparty)?.region ?? 'Western Union';
    const stage = stages[Math.min(stages.length - 1, Math.floor(seed(`${k}:ns`) * stages.length))]!;
    const cascade = (PROPAGATION[kind] ?? []).map(c => ({
      ...c,
      status: (ageDays * 24 < c.delayHrs ? 'pending' : ageDays * 24 > c.delayHrs * 6 ? 'cleared' : 'engaged') as 'pending' | 'engaged' | 'cleared',
    }));
    return {
      id: `DCI-${(8000 + Math.floor(seed(`${k}:id`) * 60000))}`,
      kind, severity, counterparty, region, ageDays,
      negotiationStage: stage, ministryCascade: cascade,
    };
  }).sort((a, b) => {
    const sev = (s: DiplomaticIncident['severity']) => s === 'national' ? 3 : s === 'critical' ? 2 : s === 'elevated' ? 1 : 0;
    return sev(b.severity) - sev(a.severity) || b.ageDays - a.ageDays;
  });

  const bilateralPartners = PARTNER_CAPITALS.slice(0, 8).map(p => {
    const k = `fa:bp:${p.partner}`;
    const alignmentIdx = Math.round(wave(`${k}:al`, epoch / 6, 28, 94));
    const tradeShare = Math.round(wave(`${k}:ts`, epoch / 7, 2, 26));
    return { partner: p.partner, alignmentIdx, tradeShare };
  }).sort((a, b) => b.alignmentIdx - a.alignmentIdx);
  const economic: EconomicDiplomacy = {
    tradeAlignmentIdx: Math.round(wave(`fa:ec:ta`, epoch / 5, 48, 92)),
    investmentContinuityIdx: Math.round(wave(`fa:ec:ic`, epoch / 7, 42, 92)),
    sanctionsExposureIdx: Math.round(wave(`fa:ec:se`, epoch / 6, 8, 78)),
    strategicResourceCoverageIdx: Math.round(wave(`fa:ec:src`, epoch / 8, 48, 94)),
    bilateralPartners,
  };

  const drifts: RegionalDrift[] = REGIONS.map(region => {
    const k = `fa:dr:${region}`;
    const driftIdx = Math.round(wave(`${k}:di`, epoch / 7, -42, 42));
    const influenceIdx = Math.round(wave(`${k}:if`, epoch / 5, 22, 90));
    const instabilityForecast = Math.round(wave(`${k}:in`, epoch / 6, 14, 86));
    const dependencyIdx = Math.round(wave(`${k}:dp`, epoch / 7, 14, 78));
    return { region, driftIdx, influenceIdx, instabilityForecast, dependencyIdx };
  });

  const adv = (region: Region) => {
    const tension = tensions.find(t => t.region === region)?.tensionIdx ?? 0;
    const levelRoll = seed(`fa:ad:${region}:${Math.floor(epoch / 8)}`);
    if (tension >= 75) return { region, level: 'do-not-travel' as const };
    if (tension >= 60 || levelRoll > 0.88) return { region, level: 'reconsider' as const };
    if (tension >= 45 || levelRoll > 0.7) return { region, level: 'increased' as const };
    if (levelRoll > 0.5) return { region, level: 'caution' as const };
    return null;
  };
  const advisories = REGIONS.map(adv).filter((x): x is { region: Region; level: 'caution' | 'increased' | 'reconsider' | 'do-not-travel' } => x !== null);
  const consular: ConsularStatus = {
    citizensRegisteredAbroadK: Math.round(wave(`fa:co:cr`, epoch / 8, 280, 1200)),
    consularCasesActive: Math.round(wave(`fa:co:cc`, epoch / 5, 220, 5800)),
    emergencyEvacuationsActive: missions.filter(m => m.securityPosture === 'evacuation').length,
    passportIssuanceQueue: Math.round(wave(`fa:co:pq`, epoch / 5, 4000, 64000)),
    travelAdvisoriesActive: advisories,
  };

  const organizations: InternationalOrgRoster[] = ORG_DEFS.map(org => {
    const k = `fa:io:${org}`;
    const memRoll = seed(`${k}:m`);
    const membership: InternationalOrgRoster['membership'] = memRoll > 0.94 ? 'review' : memRoll > 0.84 ? 'associate' : memRoll > 0.62 ? 'observer' : 'full';
    const participationIdx = Math.round(wave(`${k}:p`, epoch / 7, 48, 96));
    const votingAlignmentIdx = Math.round(wave(`${k}:v`, epoch / 9, 38, 92));
    const contribRoll = seed(`${k}:c`);
    const contributionTier: InternationalOrgRoster['contributionTier'] = contribRoll > 0.88 ? 'leading' : contribRoll > 0.62 ? 'core' : contribRoll > 0.28 ? 'standard' : 'minimal';
    return { org, membership, participationIdx, votingAlignmentIdx, contributionTier };
  });

  const horizon = [5, 10, 15, 20];
  const forecast: DiplomaticForecast = {
    horizonYears: horizon,
    alignmentTrajectory: horizon.map(h => Math.max(0, Math.min(100, Math.round(globalAlignmentIdx + wave(`fa:fc:al`, epoch / 6 + h * 0.13, -12, 8))))),
    allianceIntegrityTrajectory: horizon.map(h => Math.max(0, Math.min(100, Math.round(allianceStabilityIdx + wave(`fa:fc:ai`, epoch / 5 + h * 0.14, -12, 8))))),
    influenceTrajectory: horizon.map(h => Math.round(wave(`fa:fc:if`, epoch / 6 + h * 0.12, 40, 92))),
    globalCoordinationTrajectory: horizon.map(h => Math.round(wave(`fa:fc:gc`, epoch / 7 + h * 0.14, 44, 92))),
    civilizationalStandingIdx: Math.round((globalAlignmentIdx + allianceStabilityIdx + multipolarBalanceIdx) / 3),
    geopoliticalCrisisRisk: Math.min(100, Math.round(
      fracturing * 18
      + Math.max(0, diplomaticEscalationIdx - 40) * 0.6
      + (100 - allianceStabilityIdx) * 0.4
    )),
    longHorizonSovereigntyIdx: Math.round(wave(`fa:fc:lh`, epoch / 9, 50, 92)),
  };

  const banner =
    posture === 'crisis-engagement' ? 'GEOPOLITICAL CRISIS ENGAGEMENT — diplomatic continuity convened'
      : posture === 'pressured' ? 'INTERNATIONAL ORDER UNDER PRESSURE'
        : posture === 'realigning' ? 'ALLIANCE STRUCTURE REALIGNING'
          : posture === 'balanced' ? 'MULTIPOLAR BALANCE HELD' : 'GLOBAL ALIGNMENT CONVERGED';

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
    epoch, command, missions, treaties, incidents, economic, drifts, consular, organizations,
    forecast, bannerLine: banner, ministriesEngaged,
    prohibited: DIPLOMATIC_SAFEGUARDS.prohibited,
  };
}
