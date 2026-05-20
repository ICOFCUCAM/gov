// lib/gov/foreign-affairs-extended.ts
//
// Sovereign Foreign Affairs extension — three operational layers
// complementing the core foreign-affairs board: geopolitical
// intelligence systems (anomaly detection, conflict probability,
// AI-assisted reasoning), international law & sovereignty
// protection (treaty legality, disputes, maritime/airspace), and
// the citizen foreign services portal (passport, consular,
// visas, overseas emergency, travel advisories).
// Pure & deterministic; SSR-stable per operational epoch.
// Composed from the existing foreign-affairs engine for continuity.

import { seed, wave } from '@/lib/telemetry';
import { foreignAffairsBoard, REGIONS, type Region } from '@/lib/gov/foreign-affairs';

export const FOREIGN_EXTENDED_SAFEGUARDS = {
  diplomaticImmunityRespected: true as const,
  internationalLawCompliance: true as const,
  consularRightToAccess: true as const,
  nonInterventionDoctrine: true as const,
  prohibited: [
    'covert-extrajudicial-operations', 'breach-of-diplomatic-immunity',
    'denial-of-consular-access', 'unlawful-extraterritorial-coercion',
    'manipulation-of-foreign-elections', 'concealment-of-treaty-violations',
  ] as const,
};

// ── A. Geopolitical Intelligence ────────────────────────────────────
export interface GeopoliticalAnomaly {
  id: string;
  region: Region;
  signal: 'military-movement' | 'economic-shock' | 'cyber-activity' | 'political-realignment' | 'communications-blackout' | 'mass-mobilisation';
  confidence: number;          // 0..100
  novelty: number;             // 0..100 (low = recurring pattern, high = new)
  detectedHrsAgo: number;
  riskTier: 'observation' | 'elevated' | 'urgent' | 'critical';
}

export interface ConflictProbability {
  pair: string;                // counterparty pair (e.g. "Northern Federation ↔ Atlantic Union")
  probability30dPct: number;
  trajectory: 'cooling' | 'stable' | 'rising' | 'spiking';
  driver: 'territorial' | 'economic' | 'identity' | 'resource' | 'historical';
}

export interface StrategicDependency {
  resource: 'energy' | 'food' | 'rare-earths' | 'pharmaceuticals' | 'semiconductors' | 'capital';
  sourcePartner: string;
  dependencyPct: number;       // % of national consumption sourced from this partner
  diversificationIdx: number;  // 0..100
  exposureClass: 'low' | 'moderate' | 'concentration' | 'critical';
}

export interface InfluenceSignal {
  domain: 'soft-power' | 'media' | 'cultural-exchange' | 'development-aid' | 'multilateral-leadership' | 'scientific-collaboration';
  inboundIdx: number;          // foreign influence on us
  outboundIdx: number;         // our influence abroad
  netIdx: number;              // outbound - inbound + 50
}

export interface GeopoliticalIntelligence {
  anomalies: GeopoliticalAnomaly[];
  conflictProbabilities: ConflictProbability[];
  strategicDependencies: StrategicDependency[];
  influenceSignals: InfluenceSignal[];
  aiReasoningCoverage: number;   // 0..100 % of intelligence cycle augmented by AI
  signalProcessingLatencyMs: number;
  intelligenceFusionIdx: number;
}

// ── B. International Law & Sovereignty Protection ───────────────────
export interface SovereigntyDispute {
  id: string;
  counterparty: string;
  domain: 'maritime' | 'airspace' | 'land-border' | 'cyber-jurisdiction' | 'resource-rights' | 'treaty-interpretation';
  filedDaysAgo: number;
  ageInForum: number;
  forum: 'bilateral' | 'arbitration-tribunal' | 'international-court' | 'mediation';
  stage: 'consultation' | 'memorial' | 'oral-hearings' | 'deliberation' | 'ruling-pending';
  ourPosture: 'defending' | 'asserting' | 'co-claimant' | 'observer';
}

export interface TreatyLegalityCheck {
  treatyTitle: string;
  scope: 'bilateral' | 'regional' | 'multilateral' | 'universal';
  complianceClass: 'compliant' | 'partial' | 'in-breach' | 'reservation-filed';
  outstandingObligations: number;
  nextReviewDays: number;
  legalIntegrityIdx: number;
}

export interface InternationalLawReadout {
  disputes: SovereigntyDispute[];
  treatyLegality: TreatyLegalityCheck[];
  sovereigntyIntegrityIdx: number;
  internationalComplianceIdx: number;
  activeArbitrationsOurs: number;
  legalCoordinationLatencyHrs: number;
}

// ── C. Citizen Foreign Services Portal ──────────────────────────────
export interface PassportPipeline {
  service: 'first-issue' | 'renewal' | 'replacement-lost' | 'emergency-travel' | 'diplomatic-passport';
  applicationsToday: number;
  issuedToday: number;
  medianTurnaroundDays: number;
  pendingBacklog: number;
}

export interface ConsularRequest {
  id: string;
  kind: 'detention-abroad' | 'medical-emergency' | 'death-of-citizen' | 'legal-aid-abroad' | 'evacuation-request' | 'document-attestation';
  embassyPost: string;
  hrsOpen: number;
  status: 'received' | 'in-progress' | 'awaiting-host' | 'resolved';
  severity: 'standard' | 'urgent' | 'critical';
}

export interface VisaProcessing {
  category: 'tourist' | 'business' | 'student' | 'work' | 'diplomatic' | 'family-reunion' | 'humanitarian';
  applicationsThisWeek: number;
  approvalRatePct: number;
  medianReviewDays: number;
  pending: number;
}

export interface TravelAdvisoryFeed {
  region: Region;
  level: 'normal' | 'heightened-caution' | 'reconsider-travel' | 'do-not-travel';
  reasonsActive: number;
  citizensRegisteredK: number;
}

export interface CitizenForeignServicesPortalData {
  passports: PassportPipeline[];
  consularRequests: ConsularRequest[];
  visas: VisaProcessing[];
  travelAdvisories: TravelAdvisoryFeed[];
  overseasEmergencyHotlineOnline: boolean;
  citizensRegisteredAbroadK: number;
  portalAvailabilityPct: number;
}

export interface ForeignAffairsExtendedBoard {
  epoch: number;
  intelligence: GeopoliticalIntelligence;
  law: InternationalLawReadout;
  portal: CitizenForeignServicesPortalData;
  prohibited: readonly string[];
}

const SIGNALS: GeopoliticalAnomaly['signal'][] = ['military-movement', 'economic-shock', 'cyber-activity', 'political-realignment', 'communications-blackout', 'mass-mobilisation'];
const PAIRS = [
  'Northern Federation ↔ Atlantic Union',
  'Pacific Realm ↔ Indo-Maritime Pact',
  'Continental Compact ↔ Resource Confederation',
  'Southern League ↔ Equatorial Alliance',
  'Trans-Polar Council ↔ Northern Federation',
  'Health Compact ↔ Continental Compact',
];
const CONFLICT_DRIVERS: ConflictProbability['driver'][] = ['territorial', 'economic', 'identity', 'resource', 'historical'];

const DEPENDENCY_RESOURCES: StrategicDependency['resource'][] = ['energy', 'food', 'rare-earths', 'pharmaceuticals', 'semiconductors', 'capital'];
const DEPENDENCY_PARTNERS = ['Northern Federation', 'Pacific Realm', 'Atlantic Union', 'Continental Compact', 'Indo-Maritime Pact', 'Resource Confederation'];
const INFLUENCE_DOMAINS: InfluenceSignal['domain'][] = ['soft-power', 'media', 'cultural-exchange', 'development-aid', 'multilateral-leadership', 'scientific-collaboration'];

const DISPUTE_DOMAINS: SovereigntyDispute['domain'][] = ['maritime', 'airspace', 'land-border', 'cyber-jurisdiction', 'resource-rights', 'treaty-interpretation'];
const DISPUTE_FORUMS: SovereigntyDispute['forum'][] = ['bilateral', 'arbitration-tribunal', 'international-court', 'mediation'];
const DISPUTE_STAGES: SovereigntyDispute['stage'][] = ['consultation', 'memorial', 'oral-hearings', 'deliberation', 'ruling-pending'];
const DISPUTE_POSTURES: SovereigntyDispute['ourPosture'][] = ['defending', 'asserting', 'co-claimant', 'observer'];
const DISPUTE_COUNTERPARTIES = ['Northern Federation', 'Atlantic Union', 'Pacific Realm', 'Continental Compact', 'Southern League', 'Indo-Maritime Pact'];

const TREATY_TITLES = [
  'Global Maritime Continuity Convention',
  'Northern Strategic Defense Pact',
  'Pacific Rim Trade Accord',
  'Continental Climate Compact',
  'Universal Civil Rights Charter',
  'Tech Sovereignty Convention',
  'Atlantic Mutual Defense Compact',
];

const PASSPORT_SERVICES: PassportPipeline['service'][] = ['first-issue', 'renewal', 'replacement-lost', 'emergency-travel', 'diplomatic-passport'];
const CONSULAR_KINDS: ConsularRequest['kind'][] = ['detention-abroad', 'medical-emergency', 'death-of-citizen', 'legal-aid-abroad', 'evacuation-request', 'document-attestation'];
const VISA_CATEGORIES: VisaProcessing['category'][] = ['tourist', 'business', 'student', 'work', 'diplomatic', 'family-reunion', 'humanitarian'];

export function foreignAffairsExtendedBoard(now: number): ForeignAffairsExtendedBoard {
  const epoch = Math.max(0, Math.floor(now / 4000));
  const base = foreignAffairsBoard(now);

  // ── A. Intelligence ───────────────────────────────────────────────
  const anomalies: GeopoliticalAnomaly[] = Array.from({ length: 8 }, (_, i) => {
    const k = `fx:an:${i}:${Math.floor(epoch / 4)}`;
    const region = REGIONS[Math.floor(seed(`${k}:r`) * REGIONS.length)]!;
    const signal = SIGNALS[Math.floor(seed(`${k}:s`) * SIGNALS.length)]!;
    const confidence = Math.round(wave(`${k}:c`, epoch / 4, 38, 96));
    const novelty = Math.round(wave(`${k}:n`, epoch / 5, 14, 92));
    const detectedHrsAgo = Math.round(wave(`${k}:d`, epoch / 4, 1, 96));
    const riskTier: GeopoliticalAnomaly['riskTier'] =
      confidence >= 80 && novelty >= 70 ? 'critical'
        : confidence >= 70 && novelty >= 55 ? 'urgent'
          : confidence >= 55 ? 'elevated' : 'observation';
    return { id: `GA-${(13000 + Math.floor(seed(`${k}:id`) * 60000))}`, region, signal, confidence, novelty, detectedHrsAgo, riskTier };
  }).sort((a, b) => {
    const tier = (t: GeopoliticalAnomaly['riskTier']) => t === 'critical' ? 3 : t === 'urgent' ? 2 : t === 'elevated' ? 1 : 0;
    return tier(b.riskTier) - tier(a.riskTier) || a.detectedHrsAgo - b.detectedHrsAgo;
  });

  const conflictProbabilities: ConflictProbability[] = PAIRS.map(pair => {
    const k = `fx:cp:${pair}`;
    const probability30dPct = Math.round(wave(`${k}:p`, epoch / 6, 2, 64));
    const trajRoll = seed(`${k}:t:${Math.floor(epoch / 5)}`);
    const trajectory: ConflictProbability['trajectory'] =
      probability30dPct >= 50 ? 'spiking'
        : trajRoll > 0.78 ? 'rising'
          : trajRoll > 0.42 ? 'stable' : 'cooling';
    const driver = CONFLICT_DRIVERS[Math.floor(seed(`${k}:d`) * CONFLICT_DRIVERS.length)]!;
    return { pair, probability30dPct, trajectory, driver };
  }).sort((a, b) => b.probability30dPct - a.probability30dPct);

  const strategicDependencies: StrategicDependency[] = DEPENDENCY_RESOURCES.map((resource, i) => {
    const k = `fx:sd:${resource}`;
    const dependencyPct = Math.round(wave(`${k}:d`, epoch / 7, 8, 78));
    const diversificationIdx = Math.round(wave(`${k}:dv`, epoch / 6, 22, 94));
    const exposureClass: StrategicDependency['exposureClass'] =
      dependencyPct >= 60 && diversificationIdx < 50 ? 'critical'
        : dependencyPct >= 40 ? 'concentration'
          : dependencyPct >= 22 ? 'moderate' : 'low';
    return { resource, sourcePartner: DEPENDENCY_PARTNERS[i % DEPENDENCY_PARTNERS.length]!, dependencyPct, diversificationIdx, exposureClass };
  });

  const influenceSignals: InfluenceSignal[] = INFLUENCE_DOMAINS.map(domain => {
    const k = `fx:if:${domain}`;
    const inboundIdx = Math.round(wave(`${k}:i`, epoch / 7, 22, 78));
    const outboundIdx = Math.round(wave(`${k}:o`, epoch / 6, 22, 86));
    const netIdx = Math.max(0, Math.min(100, outboundIdx - inboundIdx + 50));
    return { domain, inboundIdx, outboundIdx, netIdx };
  });

  const intelligence: GeopoliticalIntelligence = {
    anomalies, conflictProbabilities, strategicDependencies, influenceSignals,
    aiReasoningCoverage: Math.round(wave(`fx:int:ai`, epoch / 8, 44, 92)),
    signalProcessingLatencyMs: Math.round(wave(`fx:int:lat`, epoch / 5, 80, 1200)),
    intelligenceFusionIdx: Math.round(wave(`fx:int:fu`, epoch / 6, 52, 94)),
  };

  // ── B. International law ──────────────────────────────────────────
  const disputes: SovereigntyDispute[] = Array.from({ length: 7 }, (_, i) => {
    const k = `fx:dp:${i}:${Math.floor(epoch / 4)}`;
    const counterparty = DISPUTE_COUNTERPARTIES[Math.floor(seed(`${k}:c`) * DISPUTE_COUNTERPARTIES.length)]!;
    const domain = DISPUTE_DOMAINS[Math.floor(seed(`${k}:d`) * DISPUTE_DOMAINS.length)]!;
    const filedDaysAgo = Math.round(wave(`${k}:f`, epoch / 6, 30, 1200));
    const ageInForum = Math.round(wave(`${k}:af`, epoch / 5, 14, 480));
    const forum = DISPUTE_FORUMS[Math.floor(seed(`${k}:fr`) * DISPUTE_FORUMS.length)]!;
    const stage = DISPUTE_STAGES[Math.floor(seed(`${k}:st`) * DISPUTE_STAGES.length)]!;
    const ourPosture = DISPUTE_POSTURES[Math.floor(seed(`${k}:po`) * DISPUTE_POSTURES.length)]!;
    return { id: `SD-${(14000 + Math.floor(seed(`${k}:id`) * 60000))}`, counterparty, domain, filedDaysAgo, ageInForum, forum, stage, ourPosture };
  }).sort((a, b) => b.ageInForum - a.ageInForum);

  const treatyLegality: TreatyLegalityCheck[] = TREATY_TITLES.map(treatyTitle => {
    const k = `fx:tl:${treatyTitle}`;
    const scopeRoll = seed(`${k}:sc`);
    const scope: TreatyLegalityCheck['scope'] = scopeRoll > 0.75 ? 'universal' : scopeRoll > 0.5 ? 'multilateral' : scopeRoll > 0.25 ? 'regional' : 'bilateral';
    const complianceRoll = seed(`${k}:cm:${Math.floor(epoch / 7)}`);
    const complianceClass: TreatyLegalityCheck['complianceClass'] =
      complianceRoll > 0.94 ? 'in-breach'
        : complianceRoll > 0.78 ? 'reservation-filed'
          : complianceRoll > 0.55 ? 'partial' : 'compliant';
    const outstandingObligations = Math.floor(seed(`${k}:o:${Math.floor(epoch / 5)}`) * 22);
    const nextReviewDays = Math.round(wave(`${k}:nr`, epoch / 6, -60, 360));
    const legalIntegrityIdx = Math.round(wave(`${k}:li`, epoch / 7, 48, 96));
    return { treatyTitle, scope, complianceClass, outstandingObligations, nextReviewDays, legalIntegrityIdx };
  });

  const law: InternationalLawReadout = {
    disputes, treatyLegality,
    sovereigntyIntegrityIdx: Math.round(wave(`fx:law:si`, epoch / 9, 58, 96)),
    internationalComplianceIdx: Math.round(treatyLegality.reduce((s, t) => s + t.legalIntegrityIdx, 0) / treatyLegality.length),
    activeArbitrationsOurs: disputes.filter(d => d.forum === 'arbitration-tribunal' || d.forum === 'international-court').length,
    legalCoordinationLatencyHrs: Math.round(wave(`fx:law:lat`, epoch / 5, 4, 96)),
  };

  // ── C. Citizen foreign services portal ────────────────────────────
  const passports: PassportPipeline[] = PASSPORT_SERVICES.map(service => {
    const k = `fx:ps:${service}`;
    const applicationsToday = Math.round(wave(`${k}:a`, epoch / 4, 80, 8400));
    const issuedToday = Math.round(applicationsToday * wave(`${k}:i`, epoch / 4, 0.68, 0.96));
    const medianTurnaroundDays = Math.round(wave(`${k}:t`, epoch / 6,
      service === 'emergency-travel' ? 1 : service === 'diplomatic-passport' ? 3 : 5,
      service === 'emergency-travel' ? 7 : service === 'diplomatic-passport' ? 14 : 42));
    const pendingBacklog = Math.round(wave(`${k}:p`, epoch / 4, 200, 38000));
    return { service, applicationsToday, issuedToday, medianTurnaroundDays, pendingBacklog };
  });

  const consularRequests: ConsularRequest[] = Array.from({ length: 10 }, (_, i) => {
    const k = `fx:cr:${i}:${Math.floor(epoch / 4)}`;
    const kind = CONSULAR_KINDS[Math.floor(seed(`${k}:k`) * CONSULAR_KINDS.length)]!;
    const embassyPost = base.missions[Math.floor(seed(`${k}:e`) * base.missions.length)]!.postName;
    const hrsOpen = Math.round(wave(`${k}:h`, epoch / 4, 1, 240));
    const sevRoll = seed(`${k}:sv`);
    const severity: ConsularRequest['severity'] =
      kind === 'detention-abroad' || kind === 'evacuation-request' || kind === 'death-of-citizen'
        ? (sevRoll > 0.4 ? 'critical' : 'urgent')
        : kind === 'medical-emergency' ? (sevRoll > 0.5 ? 'urgent' : 'standard')
          : sevRoll > 0.85 ? 'urgent' : 'standard';
    const statusRoll = seed(`${k}:st`);
    const status: ConsularRequest['status'] =
      hrsOpen > 96 ? 'resolved'
        : hrsOpen > 48 ? 'awaiting-host'
          : statusRoll > 0.5 ? 'in-progress' : 'received';
    return { id: `CR-${(15000 + Math.floor(seed(`${k}:id`) * 70000))}`, kind, embassyPost, hrsOpen, status, severity };
  }).sort((a, b) => {
    const sev = (s: ConsularRequest['severity']) => s === 'critical' ? 2 : s === 'urgent' ? 1 : 0;
    return sev(b.severity) - sev(a.severity) || a.hrsOpen - b.hrsOpen;
  });

  const visas: VisaProcessing[] = VISA_CATEGORIES.map(category => {
    const k = `fx:vs:${category}`;
    const applicationsThisWeek = Math.round(wave(`${k}:a`, epoch / 4, 200, 28000));
    const approvalRatePct = Math.round(wave(`${k}:ap`, epoch / 6, 42, 94));
    const medianReviewDays = Math.round(wave(`${k}:r`, epoch / 5, 2, 38));
    const pending = Math.round(wave(`${k}:p`, epoch / 4, 200, 18000));
    return { category, applicationsThisWeek, approvalRatePct, medianReviewDays, pending };
  });

  const travelAdvisories: TravelAdvisoryFeed[] = REGIONS.map(region => {
    const t = base.command.regionalTensions.find(x => x.region === region)?.tensionIdx ?? 30;
    const level: TravelAdvisoryFeed['level'] =
      t >= 78 ? 'do-not-travel'
        : t >= 60 ? 'reconsider-travel'
          : t >= 42 ? 'heightened-caution' : 'normal';
    const reasonsActive = t >= 78 ? 4 + Math.floor(seed(`fx:ta:r:${region}`) * 4) : t >= 60 ? 2 + Math.floor(seed(`fx:ta:r:${region}`) * 3) : t >= 42 ? Math.floor(seed(`fx:ta:r:${region}`) * 3) : 0;
    const citizensRegisteredK = Math.round(wave(`fx:ta:cr:${region}`, epoch / 7, 12, 480));
    return { region, level, reasonsActive, citizensRegisteredK };
  });

  const portal: CitizenForeignServicesPortalData = {
    passports, consularRequests, visas, travelAdvisories,
    overseasEmergencyHotlineOnline: seed(`fx:po:hl:${Math.floor(epoch / 8)}`) > 0.05,
    citizensRegisteredAbroadK: base.consular.citizensRegisteredAbroadK,
    portalAvailabilityPct: Math.round(wave(`fx:po:av`, epoch / 4, 95, 99.9) * 10) / 10,
  };

  return {
    epoch, intelligence, law, portal,
    prohibited: FOREIGN_EXTENDED_SAFEGUARDS.prohibited,
  };
}
