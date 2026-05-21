// lib/gov/presidency-engine.ts
//
// Sovereign Presidency / Cabinet Office engine. Pure & deterministic.

import { seed, wave } from '@/lib/telemetry';

export const PRESIDENTIAL_SAFEGUARDS = {
  termLimitedExecutive: true as const,
  collectiveCabinetResponsibility: true as const,
  transparentExecutiveOrders: true as const,
  civilSupremacyOverMilitary: true as const,
  prohibited: [
    'unilateral-rule-by-decree', 'martial-extension-beyond-cabinet',
    'sealed-orders-without-rationale', 'cabinet-purge-without-process',
    'suspension-of-elections', 'extra-constitutional-emergency-powers',
    'concealment-of-foreign-engagements',
  ] as const,
};

export type PresidentialPosture = 'governing' | 'cabinet-in-session' | 'national-address' | 'state-visit' | 'crisis-stewardship';

export interface CabinetMinister {
  id: string;
  name: string;
  ministry: string;
  appointmentDate: string;
  termMonthsRemaining: number;
  presence: 'active' | 'on-leave' | 'travelling';
}

export interface ExecutiveOrder {
  id: string;
  number: number;
  title: string;
  status: 'drafting' | 'cabinet-review' | 'signed' | 'judicial-review' | 'in-force' | 'repealed';
  ageDays: number;
  citation: string;
}

export interface CabinetResolution {
  id: string;
  topic: string;
  stage: 'tabled' | 'debate' | 'concurrence' | 'adopted' | 'tabled-again';
  ministersFor: number;
  ministersAgainst: number;
  ageDays: number;
}

export interface StateEngagement {
  id: string;
  partner: string;
  kind: 'state-visit' | 'summit' | 'bilateral' | 'multilateral' | 'diplomatic-call';
  status: 'planning' | 'scheduled' | 'live' | 'concluded';
  daysAhead: number;
}

export interface PresidencyBoard {
  epoch: number;
  posture: PresidentialPosture;
  ministers: CabinetMinister[];
  orders: ExecutiveOrder[];
  resolutions: CabinetResolution[];
  engagements: StateEngagement[];
  approvalIndex: number;
  cabinetCohesion: number;
  prohibited: readonly string[];
}

export function presidencyBoard(now: number): PresidencyBoard {
  const epoch = Math.max(0, Math.floor(now / 4000));
  const ts = epoch;
  const ministries = ['Treasury', 'Justice', 'Health', 'Interior', 'Education', 'Foreign Affairs', 'Police Command', 'Emergency', 'Energy', 'Transport', 'Trade', 'Labour', 'Environment', 'Agriculture', 'Communications'];
  const ministers: CabinetMinister[] = ministries.map((m, i) => ({
    id: `MIN-${String(i + 1).padStart(2, '0')}`,
    name: ['Hon. Adamu', 'Hon. Petrov', 'Hon. Mehta', 'Hon. Oduya', 'Hon. Tanaka', 'Hon. Brennan', 'Hon. Park', 'Hon. Chen', 'Hon. Okafor', 'Hon. Ngozi', 'Hon. Hassan', 'Hon. Kovacs', 'Hon. Rao', 'Hon. Silva', 'Hon. Müller'][i]!,
    ministry: m,
    appointmentDate: '2023-04-15',
    termMonthsRemaining: Math.round(wave(`pm:t:${i}`, ts, 12, 48)),
    presence: ['active', 'active', 'active', 'travelling', 'active', 'active', 'active', 'active', 'on-leave', 'active', 'active', 'active', 'active', 'travelling', 'active'][i] as CabinetMinister['presence'],
  }));
  const orderTitles = ['Climate Adaptation Implementation', 'Cyber-Resilience Coordination', 'Strategic Reserve Activation', 'Inter-Ministry Data Standard', 'Anti-Discrimination Compliance', 'Open-Curriculum Mandate', 'Rural Connectivity Acceleration', 'Public Procurement Reform'];
  const orderStatuses: ExecutiveOrder['status'][] = ['drafting', 'cabinet-review', 'signed', 'judicial-review', 'in-force', 'repealed'];
  const orders: ExecutiveOrder[] = orderTitles.map((t, i) => {
    const k = `eo:${i}:${Math.floor(ts / 4)}`;
    return {
      id: `EO-${(8000 + Math.floor(seed(`${k}:i`) * 2000))}`,
      number: 2024 * 100 + i,
      title: t,
      status: orderStatuses[Math.floor(seed(`${k}:s`) * orderStatuses.length)]!,
      ageDays: Math.round(wave(`${k}:d`, ts, 4, 480)),
      citation: ['§2.4', '§30.1', '§9', '§37.4', '§24.4', '§14.6', '§37.2', '§11'][i]!,
    };
  });
  const resolutionTopics = ['Quarterly economic posture', 'Inter-ministry continuity drill', 'National security review', 'Annual judicial liaison', 'Climate-resilience mid-cycle', 'Procurement reform package'];
  const resolutionStages: CabinetResolution['stage'][] = ['tabled', 'debate', 'concurrence', 'adopted', 'tabled-again'];
  const resolutions: CabinetResolution[] = resolutionTopics.map((t, i) => {
    const k = `cr:${i}:${Math.floor(ts / 4)}`;
    return {
      id: `CR-${(50000 + Math.floor(seed(`${k}:i`) * 30000))}`,
      topic: t,
      stage: resolutionStages[Math.floor(seed(`${k}:s`) * resolutionStages.length)]!,
      ministersFor: 8 + Math.round(seed(`${k}:f`) * 7),
      ministersAgainst: Math.round(seed(`${k}:a`) * 4),
      ageDays: Math.round(wave(`${k}:d`, ts, 1, 90)),
    };
  });
  const engagementPartners = ['Continental Compact', 'Pacific Realm', 'Atlantic Union', 'Indo-Maritime Pact', 'UN Coordination', 'Northern Federation'];
  const engagementKinds: StateEngagement['kind'][] = ['state-visit', 'summit', 'bilateral', 'multilateral', 'diplomatic-call'];
  const engagementStatuses: StateEngagement['status'][] = ['planning', 'scheduled', 'live', 'concluded'];
  const engagements: StateEngagement[] = engagementPartners.map((p, i) => {
    const k = `se:${i}:${Math.floor(ts / 4)}`;
    return {
      id: `SE-${(30000 + Math.floor(seed(`${k}:i`) * 40000))}`,
      partner: p,
      kind: engagementKinds[Math.floor(seed(`${k}:k`) * engagementKinds.length)]!,
      status: engagementStatuses[Math.floor(seed(`${k}:s`) * engagementStatuses.length)]!,
      daysAhead: Math.round(wave(`${k}:d`, ts, -30, 120)),
    };
  });
  const postures: PresidentialPosture[] = ['governing', 'cabinet-in-session', 'national-address', 'state-visit', 'crisis-stewardship'];
  const posture = postures[Math.floor(seed(`pp:${Math.floor(ts / 8)}`) * postures.length) % postures.length]!;
  return {
    epoch,
    posture,
    ministers,
    orders,
    resolutions,
    engagements,
    approvalIndex: Math.round(wave('pi:a', ts, 48, 78)),
    cabinetCohesion: Math.round(wave('pi:c', ts, 72, 96)),
    prohibited: PRESIDENTIAL_SAFEGUARDS.prohibited,
  };
}
