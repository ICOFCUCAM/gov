// lib/gov/communications-continuity.ts
//
// Sovereign Communications & Digital Infrastructure engine — the
// connectivity nervous system of a civilization-state. Models eight
// operational layers across one connected deterministic runtime:
// connectivity command, telecom infrastructure, internet & sovereign
// cloud, cybersecurity & information resilience, emergency
// communications, digital identity & citizen connectivity, media /
// spectrum governance, long-horizon communications intelligence and
// the public digital services portal. Pure & deterministic.

import { seed, wave } from '@/lib/telemetry';

export const COMMUNICATIONS_SAFEGUARDS = {
  endToEndIntegrityProtected: true as const,
  citizenAuthenticationConsentBased: true as const,
  spectrumAsPublicResource: true as const,
  pressIndependenceProtected: true as const,
  prohibited: [
    'mass-surveillance-without-warrant', 'arbitrary-network-shutdown',
    'unauthorised-deep-packet-inspection', 'press-censorship-without-court-order',
    'identity-credential-misuse', 'concealment-of-cyber-incidents',
    'spectrum-allocation-without-tender',
  ] as const,
};

export const REGIONS = ['Capital District', 'Northern', 'Eastern', 'Western', 'Coastal', 'Highland'];

// ── 1. National Connectivity Command ────────────────────────────────
export type ConnectivityPosture = 'nominal' | 'engaged' | 'degraded' | 'critical' | 'sovereign-lockdown';

export interface RegionalConnectivity {
  region: string;
  households: number;
  broadbandPenetrationPct: number;
  mobileCoveragePct: number;
  averageLatencyMs: number;
  degradationIdx: number;
  classification: 'nominal' | 'observant' | 'degraded' | 'fractured';
}

export interface ConnectivityCommand {
  posture: ConnectivityPosture;
  nationalUptimePct: number;
  signalIntegrityIdx: number;
  routingResilienceIdx: number;
  sovereignAutonomyIdx: number;
  emergencyChannelsActive: number;
  regions: RegionalConnectivity[];
}

// ── 2. Telecommunications Infrastructure ────────────────────────────
export type NetworkAssetKind = 'mobile-tower' | 'fiber-trunk' | 'submarine-cable' | 'satellite-uplink' | 'broadcast-tower' | 'data-center';

export interface NetworkAsset {
  id: string;
  kind: NetworkAssetKind;
  region: string;
  capacityIdx: number;
  utilisationPct: number;
  uptimePct: number;
  maintenanceWindow: 'none' | 'scheduled' | 'overdue';
  status: 'operational' | 'degraded' | 'maintenance' | 'offline';
}

// ── 3. Internet & Sovereign Cloud ──────────────────────────────────
export interface DataCenterCapacity {
  facility: string;
  region: string;
  rackUtilisationPct: number;
  redundancy: 'N' | 'N+1' | '2N' | '2N+1';
  failoverReadinessIdx: number;
  greenPowerSharePct: number;
  status: 'optimal' | 'monitored' | 'pressured' | 'degraded';
}

export interface RoutingHealth {
  metric: 'bgp-stability' | 'dns-resolution' | 'cdn-edge' | 'ipv6-coverage' | 'cloud-failover' | 'cross-border-link';
  scoreIdx: number;
  anomaliesActive: number;
  classification: 'stable' | 'watch' | 'engaged' | 'degraded';
}

// ── 4. Cybersecurity & Information Resilience ───────────────────────
export type CyberIncidentKind =
  | 'ddos' | 'ransomware' | 'data-exfiltration' | 'supply-chain-compromise'
  | 'phishing-campaign' | 'critical-infra-intrusion' | 'misinformation-flood' | 'identity-credential-theft';

export interface CyberIncident {
  id: string;
  kind: CyberIncidentKind;
  targetSector: 'government' | 'finance' | 'energy' | 'health' | 'transport' | 'telecom' | 'media' | 'citizen';
  detectedHrsAgo: number;
  severity: 'low' | 'elevated' | 'critical' | 'national';
  containmentPct: number;
  attribution: 'unattributed' | 'criminal' | 'state-aligned' | 'hacktivist' | 'insider';
  phase: 'detection' | 'containment' | 'eradication' | 'recovery' | 'closed';
  ministryCascade: { ministry: string; effect: string; delayHrs: number; status: 'pending' | 'engaged' | 'cleared' }[];
}

export interface CyberDefence {
  threatLevel: 'normal' | 'elevated' | 'high' | 'severe';
  incidentsActive: CyberIncident[];
  socAnalystsOnDuty: number;
  threatsBlockedDaily: number;
  meanContainmentHrs: number;
  cyberResilienceIdx: number;
}

// ── 5. Emergency Communications ─────────────────────────────────────
export interface EmergencyBroadcast {
  id: string;
  channel: 'national-tv' | 'national-radio' | 'cell-broadcast' | 'satellite-emergency' | 'siren-network' | 'civic-app';
  region: string;
  reachM: number;
  uptimePct: number;
  alertsLast24h: number;
  status: 'standby' | 'broadcasting' | 'engaged' | 'degraded';
}

export interface FailoverChannel {
  fromChannel: string;
  toChannel: string;
  triggerCondition: string;
  readinessPct: number;
}

// ── 6. Digital Identity & Citizen Connectivity ──────────────────────
export interface DigitalIdentityProgramme {
  citizensEnrolledM: number;
  authRequestsDailyM: number;
  authSuccessRatePct: number;
  credentialBreachesThisQ: number;
  recoveryRequestsPending: number;
  trustIdx: number;
}

// ── 7. Media, Spectrum & Information Governance ─────────────────────
export interface SpectrumBand {
  band: 'low-band' | 'mid-band' | 'high-band-mmwave' | 'broadcast-tv' | 'broadcast-radio' | 'satellite';
  allocatedMhz: number;
  utilisationPct: number;
  licensees: number;
  congestionIdx: number;
  classification: 'optimal' | 'observant' | 'congested' | 'oversubscribed';
}

export interface MediaLandscape {
  broadcastersLicensed: number;
  pressIndependenceIdx: number;
  contentIntegrityIdx: number;
  spectrumDisputesOpen: number;
  publicServiceMediaUptimePct: number;
}

// ── 8. Communications Intelligence & Forecasting ────────────────────
export interface ConnectivityForecast {
  horizonYears: number[];                  // [5, 10, 15, 20, 25]
  bandwidthDemandTrajectoryTbps: number[];
  rural5GCoverageTrajectory: number[];
  cyberThreatLevelTrajectory: number[];
  sovereignCloudShareTrajectory: number[];
  digitalIdentityPenetrationTrajectory: number[];
  systemicConnectivityRisk: number;
  longHorizonDigitalResilienceIdx: number;
}

export interface SignalAnomaly {
  id: string;
  signalDomain: 'cellular' | 'fiber' | 'satellite' | 'submarine' | 'broadcast' | 'data-center';
  region: string;
  detectedHrsAgo: number;
  confidence: number;
  tier: 'observation' | 'elevated' | 'urgent' | 'critical';
}

// ── 9. Public Digital Services Portal ───────────────────────────────
export interface DigitalServiceRequest {
  id: string;
  service: 'identity-renewal' | 'connectivity-report' | 'cyber-incident-report' | 'broadband-complaint' | 'spectrum-licence' | 'telecom-portability';
  region: string;
  daysOpen: number;
  status: 'received' | 'verifying' | 'in-progress' | 'resolved';
}

export interface PublicAdvisoryComms {
  id: string;
  kind: 'service-disruption' | 'planned-maintenance' | 'cyber-threat-warning' | 'emergency-broadcast' | 'identity-renewal-drive' | 'spectrum-reallocation';
  region: string;
  ageHrs: number;
  reachM: number;
  severity: 'advisory' | 'warning' | 'critical';
}

export interface DigitalServicesPortal {
  requests: DigitalServiceRequest[];
  advisories: PublicAdvisoryComms[];
  citizenContactsDailyK: number;
  portalAvailabilityPct: number;
}

export interface CommunicationsBoard {
  epoch: number;
  command: ConnectivityCommand;
  networkAssets: NetworkAsset[];
  dataCenters: DataCenterCapacity[];
  routing: RoutingHealth[];
  cyber: CyberDefence;
  emergencyBroadcasts: EmergencyBroadcast[];
  failoverChannels: FailoverChannel[];
  digitalIdentity: DigitalIdentityProgramme;
  spectrum: SpectrumBand[];
  media: MediaLandscape;
  intelligence: { forecast: ConnectivityForecast; anomalies: SignalAnomaly[]; aiReasoningCoveragePct: number };
  portal: DigitalServicesPortal;
  bannerLine: string;
  ministriesEngaged: { ministry: string; engaged: number }[];
  prohibited: readonly string[];
}

const PROPAGATION: Record<CyberIncidentKind, { ministry: string; effect: string; delayHrs: number }[]> = {
  ddos: [
    { ministry: 'Interior', effect: 'National-security monitoring engaged', delayHrs: 1 },
    { ministry: 'Treasury', effect: 'Payments-rail isolation', delayHrs: 2 },
    { ministry: 'Energy', effect: 'OT/ICS surface hardening', delayHrs: 4 },
  ],
  ransomware: [
    { ministry: 'Interior', effect: 'Investigation & forensic capture', delayHrs: 1 },
    { ministry: 'Treasury', effect: 'Ransom-payment ban enforcement', delayHrs: 4 },
    { ministry: 'Justice', effect: 'Criminal-case routing', delayHrs: 12 },
    { ministry: 'Cabinet', effect: 'Continuity advisory', delayHrs: 24 },
  ],
  'data-exfiltration': [
    { ministry: 'Justice', effect: 'Data-protection enforcement', delayHrs: 12 },
    { ministry: 'Interior', effect: 'National-security review', delayHrs: 6 },
    { ministry: 'Foreign Affairs', effect: 'Diplomatic-channel notification (if cross-border)', delayHrs: 24 },
  ],
  'supply-chain-compromise': [
    { ministry: 'Treasury', effect: 'Procurement halt for affected vendor', delayHrs: 4 },
    { ministry: 'Trade & Industry', effect: 'Vendor-ecosystem audit', delayHrs: 24 },
    { ministry: 'Cabinet', effect: 'Strategic-supply review', delayHrs: 48 },
  ],
  'phishing-campaign': [
    { ministry: 'Treasury', effect: 'Citizen-financial-fraud alert', delayHrs: 6 },
    { ministry: 'Justice', effect: 'Consumer-protection enforcement', delayHrs: 12 },
  ],
  'critical-infra-intrusion': [
    { ministry: 'Interior', effect: 'National-security escalation', delayHrs: 1 },
    { ministry: 'Energy', effect: 'OT/ICS hardening engaged', delayHrs: 2 },
    { ministry: 'Transport', effect: 'Operational-system isolation', delayHrs: 2 },
    { ministry: 'Cabinet', effect: 'Continuity activation', delayHrs: 6 },
  ],
  'misinformation-flood': [
    { ministry: 'Justice', effect: 'Content-integrity review (lawful)', delayHrs: 12 },
    { ministry: 'Cabinet', effect: 'Strategic-communication advisory', delayHrs: 24 },
  ],
  'identity-credential-theft': [
    { ministry: 'Treasury', effect: 'Financial-account monitoring', delayHrs: 6 },
    { ministry: 'Justice', effect: 'Identity-fraud enforcement', delayHrs: 12 },
    { ministry: 'Interior', effect: 'Civil-registry credential rotation', delayHrs: 24 },
  ],
};

const KIND_LIST: CyberIncidentKind[] = ['ddos', 'ransomware', 'data-exfiltration', 'supply-chain-compromise', 'phishing-campaign', 'critical-infra-intrusion', 'misinformation-flood', 'identity-credential-theft'];
const ASSET_KINDS: NetworkAssetKind[] = ['mobile-tower', 'fiber-trunk', 'submarine-cable', 'satellite-uplink', 'broadcast-tower', 'data-center'];
const CYBER_SECTORS: CyberIncident['targetSector'][] = ['government', 'finance', 'energy', 'health', 'transport', 'telecom', 'media', 'citizen'];
const ATTRIBUTIONS: CyberIncident['attribution'][] = ['unattributed', 'criminal', 'state-aligned', 'hacktivist', 'insider'];
const PHASES: CyberIncident['phase'][] = ['detection', 'containment', 'eradication', 'recovery', 'closed'];
const BROADCAST_CHANNELS: EmergencyBroadcast['channel'][] = ['national-tv', 'national-radio', 'cell-broadcast', 'satellite-emergency', 'siren-network', 'civic-app'];
const ROUTING_METRICS: RoutingHealth['metric'][] = ['bgp-stability', 'dns-resolution', 'cdn-edge', 'ipv6-coverage', 'cloud-failover', 'cross-border-link'];
const SPECTRUM_BANDS: SpectrumBand['band'][] = ['low-band', 'mid-band', 'high-band-mmwave', 'broadcast-tv', 'broadcast-radio', 'satellite'];
const ANOMALY_DOMAINS: SignalAnomaly['signalDomain'][] = ['cellular', 'fiber', 'satellite', 'submarine', 'broadcast', 'data-center'];
const SERVICE_KINDS: DigitalServiceRequest['service'][] = ['identity-renewal', 'connectivity-report', 'cyber-incident-report', 'broadband-complaint', 'spectrum-licence', 'telecom-portability'];
const ADVISORY_KINDS: PublicAdvisoryComms['kind'][] = ['service-disruption', 'planned-maintenance', 'cyber-threat-warning', 'emergency-broadcast', 'identity-renewal-drive', 'spectrum-reallocation'];

const DATA_CENTERS = ['Capital Sovereign Cloud-1', 'Capital Sovereign Cloud-2', 'Northern Industrial DC', 'Eastern Coastal DC', 'Western Cold-Storage DC'];

export function communicationsBoard(now: number): CommunicationsBoard {
  const epoch = Math.max(0, Math.floor(now / 4000));

  // 1. Regional connectivity + command
  const regions: RegionalConnectivity[] = REGIONS.map(region => {
    const k = `cm:rc:${region}`;
    const households = Math.round(wave(`${k}:h`, epoch / 8, 280000, 5400000));
    const broadbandPenetrationPct = Math.round(wave(`${k}:b`, epoch / 6, 38, 96));
    const mobileCoveragePct = Math.round(wave(`${k}:m`, epoch / 5, 78, 99.8));
    const averageLatencyMs = Math.round(wave(`${k}:l`, epoch / 4, 14, 220));
    const degradationIdx = Math.round(wave(`${k}:d`, epoch / 5, 4, 72));
    const classification: RegionalConnectivity['classification'] =
      degradationIdx >= 50 ? 'fractured'
        : degradationIdx >= 30 ? 'degraded'
          : degradationIdx >= 15 ? 'observant' : 'nominal';
    return { region, households, broadbandPenetrationPct, mobileCoveragePct, averageLatencyMs, degradationIdx, classification };
  });
  const fractured = regions.filter(r => r.classification === 'fractured').length;
  const degraded = regions.filter(r => r.classification === 'degraded').length;
  const nationalUptimePct = Math.round(wave(`cm:cmd:up`, epoch / 4, 96, 99.95) * 100) / 100;
  const signalIntegrityIdx = Math.round(wave(`cm:cmd:si`, epoch / 5, 58, 96));
  const routingResilienceIdx = Math.round(wave(`cm:cmd:rr`, epoch / 6, 48, 94));
  const sovereignAutonomyIdx = Math.round(wave(`cm:cmd:sa`, epoch / 8, 42, 88));
  const emergencyChannelsActive = Math.floor(seed(`cm:cmd:em:${Math.floor(epoch / 4)}`) * 4);
  const posture: ConnectivityPosture =
    fractured >= 2 || nationalUptimePct < 96.5 ? 'sovereign-lockdown'
      : fractured >= 1 || nationalUptimePct < 98 ? 'critical'
        : degraded >= 2 ? 'degraded'
          : degraded >= 1 || emergencyChannelsActive ? 'engaged' : 'nominal';
  const command: ConnectivityCommand = {
    posture, nationalUptimePct, signalIntegrityIdx, routingResilienceIdx,
    sovereignAutonomyIdx, emergencyChannelsActive, regions,
  };

  // 2. Network assets
  const networkAssets: NetworkAsset[] = Array.from({ length: 18 }, (_, i) => {
    const k = `cm:na:${i}`;
    const kind = ASSET_KINDS[Math.floor(seed(`${k}:k`) * ASSET_KINDS.length)]!;
    const region = REGIONS[Math.floor(seed(`${k}:r`) * REGIONS.length)]!;
    const capacityIdx = Math.round(wave(`${k}:c`, epoch / 6, 48, 96));
    const utilisationPct = Math.round(wave(`${k}:u`, epoch / 4, 22, 112));
    const uptimePct = Math.round(wave(`${k}:up`, epoch / 5, 92, 99.99) * 100) / 100;
    const maintRoll = seed(`${k}:mw:${Math.floor(epoch / 6)}`);
    const maintenanceWindow: NetworkAsset['maintenanceWindow'] = maintRoll > 0.88 ? 'overdue' : maintRoll > 0.62 ? 'scheduled' : 'none';
    const status: NetworkAsset['status'] =
      uptimePct < 95 ? 'offline'
        : utilisationPct >= 100 ? 'degraded'
          : maintenanceWindow === 'scheduled' || maintenanceWindow === 'overdue' ? 'maintenance' : 'operational';
    return { id: `NA-${(31000 + Math.floor(seed(`${k}:id`) * 60000))}`, kind, region, capacityIdx, utilisationPct, uptimePct, maintenanceWindow, status };
  });

  // 3. Data centers + routing
  const dataCenters: DataCenterCapacity[] = DATA_CENTERS.map((facility, i) => {
    const k = `cm:dc:${facility}`;
    const region = REGIONS[i % REGIONS.length]!;
    const rackUtilisationPct = Math.round(wave(`${k}:r`, epoch / 5, 38, 96));
    const redundancyRoll = seed(`${k}:rd`);
    const redundancy: DataCenterCapacity['redundancy'] = redundancyRoll > 0.85 ? '2N+1' : redundancyRoll > 0.55 ? '2N' : redundancyRoll > 0.3 ? 'N+1' : 'N';
    const failoverReadinessIdx = Math.round(wave(`${k}:f`, epoch / 6, 48, 96));
    const greenPowerSharePct = Math.round(wave(`${k}:g`, epoch / 8, 18, 92));
    const status: DataCenterCapacity['status'] =
      rackUtilisationPct >= 92 ? 'degraded'
        : rackUtilisationPct >= 80 ? 'pressured'
          : failoverReadinessIdx < 65 ? 'monitored' : 'optimal';
    return { facility, region, rackUtilisationPct, redundancy, failoverReadinessIdx, greenPowerSharePct, status };
  });

  const routing: RoutingHealth[] = ROUTING_METRICS.map(metric => {
    const k = `cm:rh:${metric}`;
    const scoreIdx = Math.round(wave(`${k}:s`, epoch / 5, 52, 99));
    const anomaliesActive = Math.floor(seed(`${k}:a:${Math.floor(epoch / 4)}`) * 6);
    const classification: RoutingHealth['classification'] =
      scoreIdx < 70 ? 'degraded'
        : scoreIdx < 82 ? 'engaged'
          : anomaliesActive >= 2 ? 'watch' : 'stable';
    return { metric, scoreIdx, anomaliesActive, classification };
  });

  // 4. Cyber defence
  const incidentsActive: CyberIncident[] = Array.from({ length: 7 }, (_, i) => {
    const k = `cm:ci:${i}:${Math.floor(epoch / 4)}`;
    const kind = KIND_LIST[Math.floor(seed(`${k}:k`) * KIND_LIST.length)]!;
    const targetSector = CYBER_SECTORS[Math.floor(seed(`${k}:t`) * CYBER_SECTORS.length)]!;
    const detectedHrsAgo = Math.round(wave(`${k}:d`, epoch / 4, 1, 120));
    const sevRoll = seed(`${k}:sv`);
    const severity: CyberIncident['severity'] = sevRoll > 0.92 ? 'national' : sevRoll > 0.74 ? 'critical' : sevRoll > 0.45 ? 'elevated' : 'low';
    const containmentPct = Math.min(100, Math.round((detectedHrsAgo / 48) * 100));
    const attribution = ATTRIBUTIONS[Math.floor(seed(`${k}:a`) * ATTRIBUTIONS.length)]!;
    const phaseIdx = Math.min(PHASES.length - 1, Math.floor((detectedHrsAgo / 48) * (PHASES.length - 1)));
    const phase = PHASES[phaseIdx]!;
    const ministryCascade = (PROPAGATION[kind] ?? []).map(c => ({
      ...c,
      status: (detectedHrsAgo < c.delayHrs ? 'pending' : detectedHrsAgo > c.delayHrs * 6 ? 'cleared' : 'engaged') as 'pending' | 'engaged' | 'cleared',
    }));
    return {
      id: `CY-${(32000 + Math.floor(seed(`${k}:id`) * 70000))}`,
      kind, targetSector, detectedHrsAgo, severity, containmentPct, attribution, phase, ministryCascade,
    };
  }).sort((a, b) => {
    const sev = (s: CyberIncident['severity']) => s === 'national' ? 3 : s === 'critical' ? 2 : s === 'elevated' ? 1 : 0;
    return sev(b.severity) - sev(a.severity) || a.detectedHrsAgo - b.detectedHrsAgo;
  });
  const nationalCyber = incidentsActive.filter(c => c.severity === 'national').length;
  const criticalCyber = incidentsActive.filter(c => c.severity === 'critical').length;
  const threatLevel: CyberDefence['threatLevel'] =
    nationalCyber >= 1 ? 'severe' : criticalCyber >= 2 ? 'high' : incidentsActive.length >= 4 ? 'elevated' : 'normal';
  const cyber: CyberDefence = {
    threatLevel,
    incidentsActive,
    socAnalystsOnDuty: Math.round(wave(`cm:cy:soc`, epoch / 5, 40, 320)),
    threatsBlockedDaily: Math.round(wave(`cm:cy:tb`, epoch / 4, 80000, 4800000)),
    meanContainmentHrs: Math.round(wave(`cm:cy:mc`, epoch / 5, 1, 36)),
    cyberResilienceIdx: Math.round(wave(`cm:cy:cr`, epoch / 7, 48, 92)),
  };

  // 5. Emergency broadcasts + failover
  const emergencyBroadcasts: EmergencyBroadcast[] = BROADCAST_CHANNELS.map(channel => {
    const k = `cm:eb:${channel}`;
    const region = REGIONS[Math.floor(seed(`${k}:r`) * REGIONS.length)]!;
    const reachM = Math.round(wave(`${k}:rm`, epoch / 5, 0.5, 38) * 10) / 10;
    const uptimePct = Math.round(wave(`${k}:up`, epoch / 4, 90, 99.9) * 10) / 10;
    const alertsLast24h = Math.floor(seed(`${k}:al:${Math.floor(epoch / 4)}`) * 24);
    const status: EmergencyBroadcast['status'] =
      uptimePct < 95 ? 'degraded'
        : alertsLast24h > 0 ? 'broadcasting'
          : emergencyChannelsActive > 0 ? 'engaged' : 'standby';
    return { id: `EB-${channel}`, channel, region, reachM, uptimePct, alertsLast24h, status };
  });

  const failoverChannels: FailoverChannel[] = [
    { fromChannel: 'national-tv', toChannel: 'national-radio', triggerCondition: 'TV transmitter loss', readinessPct: Math.round(wave(`cm:fc:1`, epoch / 6, 70, 99)) },
    { fromChannel: 'cell-broadcast', toChannel: 'civic-app', triggerCondition: 'cellular outage', readinessPct: Math.round(wave(`cm:fc:2`, epoch / 6, 60, 98)) },
    { fromChannel: 'fiber-trunk', toChannel: 'satellite-uplink', triggerCondition: 'submarine cable cut', readinessPct: Math.round(wave(`cm:fc:3`, epoch / 6, 55, 96)) },
    { fromChannel: 'data-center', toChannel: 'sovereign-cloud-failover', triggerCondition: 'primary DC offline', readinessPct: Math.round(wave(`cm:fc:4`, epoch / 6, 72, 99)) },
  ];

  // 6. Digital identity
  const digitalIdentity: DigitalIdentityProgramme = {
    citizensEnrolledM: Math.round(wave(`cm:di:ce`, epoch / 8, 18, 84) * 10) / 10,
    authRequestsDailyM: Math.round(wave(`cm:di:ar`, epoch / 4, 4, 84) * 10) / 10,
    authSuccessRatePct: Math.round(wave(`cm:di:as`, epoch / 5, 96, 99.95) * 100) / 100,
    credentialBreachesThisQ: Math.floor(seed(`cm:di:cb:${Math.floor(epoch / 6)}`) * 14),
    recoveryRequestsPending: Math.round(wave(`cm:di:rr`, epoch / 4, 200, 18000)),
    trustIdx: Math.round(wave(`cm:di:ti`, epoch / 7, 58, 94)),
  };

  // 7. Spectrum + media
  const spectrum: SpectrumBand[] = SPECTRUM_BANDS.map(band => {
    const k = `cm:sp:${band}`;
    const allocatedMhz = Math.round(wave(`${k}:al`, epoch / 8, 50, 2400));
    const utilisationPct = Math.round(wave(`${k}:u`, epoch / 4, 38, 124));
    const licensees = 2 + Math.floor(seed(`${k}:l`) * 84);
    const congestionIdx = Math.max(0, utilisationPct - 70);
    const classification: SpectrumBand['classification'] =
      utilisationPct >= 100 ? 'oversubscribed'
        : utilisationPct >= 85 ? 'congested'
          : utilisationPct >= 60 ? 'observant' : 'optimal';
    return { band, allocatedMhz, utilisationPct, licensees, congestionIdx, classification };
  });

  const media: MediaLandscape = {
    broadcastersLicensed: 40 + Math.floor(seed(`cm:me:bl`) * 240),
    pressIndependenceIdx: Math.round(wave(`cm:me:pi`, epoch / 9, 58, 92)),
    contentIntegrityIdx: Math.round(wave(`cm:me:ci`, epoch / 7, 52, 92)),
    spectrumDisputesOpen: Math.floor(seed(`cm:me:sd:${Math.floor(epoch / 5)}`) * 24),
    publicServiceMediaUptimePct: Math.round(wave(`cm:me:up`, epoch / 5, 92, 99.9) * 10) / 10,
  };

  // 8. Intelligence
  const horizon = [5, 10, 15, 20, 25];
  const forecast: ConnectivityForecast = {
    horizonYears: horizon,
    bandwidthDemandTrajectoryTbps: horizon.map(h => Math.round(wave(`cm:fc:bw`, epoch / 5 + h * 0.14, 80, 2400))),
    rural5GCoverageTrajectory: horizon.map(h => Math.max(0, Math.min(100, Math.round(wave(`cm:fc:r5`, epoch / 5 + h * 0.13, 22, 96))))),
    cyberThreatLevelTrajectory: horizon.map(h => Math.max(0, Math.min(100, Math.round(wave(`cm:fc:ct`, epoch / 5 + h * 0.16, 28, 86))))),
    sovereignCloudShareTrajectory: horizon.map(h => Math.max(0, Math.min(100, Math.round(wave(`cm:fc:sc`, epoch / 6 + h * 0.13, 22, 88))))),
    digitalIdentityPenetrationTrajectory: horizon.map(h => Math.max(0, Math.min(100, Math.round(wave(`cm:fc:di`, epoch / 6 + h * 0.12, 38, 96))))),
    systemicConnectivityRisk: Math.min(100, Math.round(
      fractured * 18
      + degraded * 8
      + (threatLevel === 'severe' ? 26 : threatLevel === 'high' ? 14 : threatLevel === 'elevated' ? 6 : 0)
    )),
    longHorizonDigitalResilienceIdx: Math.round(wave(`cm:fc:lh`, epoch / 9, 52, 92)),
  };

  const anomalies: SignalAnomaly[] = Array.from({ length: 8 }, (_, i) => {
    const k = `cm:an:${i}:${Math.floor(epoch / 4)}`;
    const signalDomain = ANOMALY_DOMAINS[Math.floor(seed(`${k}:d`) * ANOMALY_DOMAINS.length)]!;
    const region = REGIONS[Math.floor(seed(`${k}:r`) * REGIONS.length)]!;
    const detectedHrsAgo = Math.round(wave(`${k}:h`, epoch / 4, 1, 96));
    const confidence = Math.round(wave(`${k}:c`, epoch / 4, 38, 96));
    const tier: SignalAnomaly['tier'] =
      confidence >= 85 ? 'critical' : confidence >= 70 ? 'urgent' : confidence >= 55 ? 'elevated' : 'observation';
    return { id: `SA-${(33000 + Math.floor(seed(`${k}:id`) * 60000))}`, signalDomain, region, detectedHrsAgo, confidence, tier };
  }).sort((a, b) => {
    const t = (x: SignalAnomaly['tier']) => x === 'critical' ? 3 : x === 'urgent' ? 2 : x === 'elevated' ? 1 : 0;
    return t(b.tier) - t(a.tier) || a.detectedHrsAgo - b.detectedHrsAgo;
  });

  // 9. Portal
  const requests: DigitalServiceRequest[] = Array.from({ length: 10 }, (_, i) => {
    const k = `cm:pr:${i}:${Math.floor(epoch / 4)}`;
    const service = SERVICE_KINDS[Math.floor(seed(`${k}:s`) * SERVICE_KINDS.length)]!;
    const region = REGIONS[Math.floor(seed(`${k}:r`) * REGIONS.length)]!;
    const daysOpen = Math.round(wave(`${k}:d`, epoch / 4, 0, 30));
    const status: DigitalServiceRequest['status'] =
      daysOpen >= 18 ? 'resolved'
        : daysOpen >= 7 ? 'in-progress'
          : daysOpen >= 2 ? 'verifying' : 'received';
    return { id: `DR-${(34000 + Math.floor(seed(`${k}:id`) * 70000))}`, service, region, daysOpen, status };
  }).sort((a, b) => a.daysOpen - b.daysOpen);

  const advisories: PublicAdvisoryComms[] = Array.from({ length: 6 }, (_, i) => {
    const k = `cm:ad:${i}:${Math.floor(epoch / 4)}`;
    const kind = ADVISORY_KINDS[Math.floor(seed(`${k}:k`) * ADVISORY_KINDS.length)]!;
    const region = REGIONS[Math.floor(seed(`${k}:r`) * REGIONS.length)]!;
    const ageHrs = Math.round(wave(`${k}:h`, epoch / 4, 1, 72));
    const reachM = Math.round(wave(`${k}:rm`, epoch / 5, 0.2, 12) * 10) / 10;
    const sevRoll = seed(`${k}:sv`);
    const severity: PublicAdvisoryComms['severity'] = sevRoll > 0.85 ? 'critical' : sevRoll > 0.55 ? 'warning' : 'advisory';
    return { id: `CAD-${i + 1}`, kind, region, ageHrs, reachM, severity };
  });

  const portal: DigitalServicesPortal = {
    requests, advisories,
    citizenContactsDailyK: Math.round(wave(`cm:po:cc`, epoch / 4, 8, 280) * 10) / 10,
    portalAvailabilityPct: Math.round(wave(`cm:po:av`, epoch / 4, 96, 99.99) * 100) / 100,
  };

  const banner =
    posture === 'sovereign-lockdown' ? 'SOVEREIGN CONNECTIVITY LOCKDOWN — emergency continuity protocol'
      : posture === 'critical' ? 'NATIONAL CONNECTIVITY CRITICAL'
        : posture === 'degraded' ? 'CONNECTIVITY DEGRADATION — recovery engaged'
          : posture === 'engaged' ? 'CONNECTIVITY OPERATIONS ENGAGED' : 'NATIONAL CONNECTIVITY NOMINAL';

  const ministries = new Map<string, number>();
  for (const inc of incidentsActive) {
    for (const c of inc.ministryCascade) {
      if (c.status !== 'pending') ministries.set(c.ministry, (ministries.get(c.ministry) ?? 0) + 1);
    }
  }
  const ministriesEngaged = Array.from(ministries.entries()).map(([ministry, engaged]) => ({ ministry, engaged })).sort((a, b) => b.engaged - a.engaged);

  return {
    epoch, command, networkAssets, dataCenters, routing, cyber,
    emergencyBroadcasts, failoverChannels, digitalIdentity, spectrum, media,
    intelligence: { forecast, anomalies, aiReasoningCoveragePct: Math.round(wave(`cm:in:ai`, epoch / 8, 44, 94)) },
    portal, bannerLine: banner, ministriesEngaged,
    prohibited: COMMUNICATIONS_SAFEGUARDS.prohibited,
  };
}
