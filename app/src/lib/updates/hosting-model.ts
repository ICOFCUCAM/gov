// Hosting & deployment cost model for the Update Center.
//
// Pure and deterministic: estimate(path, answers, rate) computes sizing, a
// phased timeline, capital and annual costs, and a five-year total from the
// nation's questionnaire. Every unit cost and multiplier lives in
// HOSTING_MODEL, in the publisher's reference currency (USD), and is
// multiplied by the nation's contract rate. The figures are planning
// estimates, not quotes: unit costs are placeholders until the publisher
// sets real ones (docs/INTEGRATION_REGISTER.md §10), and an engineering
// review adjusts and issues the official assessment.

import type { CostLine, HostingEstimate, HostingPath, HostingQuestionnaire, TimelinePhase } from '@/lib/api/types';

export const HOSTING_MODEL = {
  version: '2026.10-placeholder',
  referenceCurrency: 'USD',
  sizing: {
    baseVcpu: 64,                 // control plane, audit chain, queues, observability
    vcpuPer1000ActiveUsers: 0.8,  // peak concurrent load
    vcpuPerService: 2,
    ramGbPerVcpu: 4,
    mbPerCitizen: 2,              // civil records, permits, receipts
    mbPerActiveUser: 50,          // documents and attachments
    replication: 3,               // three copies within a site
    headroom: 1.5,                // growth and failover headroom
    vcpuPerNode: 64,
    nodesPerRack: 14,
    gbpsPer100kActive: 1,
  },
  /** Redundancy multiplier on compute by target availability. */
  availability: [
    { min: 99.99, factor: 1.8, tier: 'Tier IV-class' },
    { min: 99.95, factor: 1.4, tier: 'Tier III-class' },
    { min: 99.9, factor: 1.2, tier: 'Tier III-class' },
    { min: 0, factor: 1.0, tier: 'Tier II-class' },
  ],
  dc: {
    nodeCost: 38_000,             // 64 vCPU / 256 GB server
    storagePerTb: 450,            // enterprise usable TB
    networkPerSite: 220_000,
    networkPerGbps: 15_000,
    securityPerSite: 260_000,     // firewalls, HSM, SIEM collectors
    facilityPerRack: { none: 120_000, partial: 60_000, 'tier3-ready': 12_000 },
    upsGeneratorForUnstablePower: 150_000,
    drSiteFactor: 0.7,            // DR site hardware relative to primary
    deploymentServicesPct: 0.18,  // of hardware
    kwPerRack: 8,
    pue: 1.6,
    pricePerKwh: 0.14,
    unstablePowerPremium: 1.25,   // generator fuel and losses
    fteAnnual: 42_000,
    baseFte: 12,
    ftePer4Racks: 1,
    fte24x7Extra: 6,              // availability ≥ 99.95 needs round-the-clock shifts
    maintenancePct: 0.12,         // of hardware, per year
    connectivityPerSite: { 'redundant-fibre': 60_000, 'single-link': 90_000, limited: 140_000 },
    platformSupportBase: 150_000,
    platformSupportPerCitizen: 0.02,
  },
  cloud: {
    vcpuMonth: 28,
    storageTbMonth: 25,
    egressShareOfStorage: 0.02,   // TB egress per month as a share of stored TB
    egressPerTb: 80,
    managedPostgresPremium: 1.3,  // on the database share of compute
    databaseShareOfCompute: 0.3,
    kmsAnnual: 12_000,
    hsmApplianceWhenNoKms: 90_000,
    landingZoneSetup: 180_000,
    kindFactor: { 'public-hyperscaler': 1.0, 'regional-sovereign': 1.15, 'private-cloud': 1.25 },
    baseOpsFte: 6,
    opsFtePer200Vcpu: 1,
  },
  hosted: {
    plans: {
      standard: { base: 240_000, perCitizen: 0.12, label: 'Standard — shared sovereign tenancy, 99.9%' },
      enterprise: { base: 480_000, perCitizen: 0.18, label: 'Enterprise — dedicated tenant, 99.95%, 24/7 support' },
      'sovereign-dedicated': { base: 950_000, perCitizen: 0.25, label: 'Sovereign dedicated — dedicated infrastructure in your region, 99.99%' },
    },
    fiveYearDiscountPct: 15,
    onboarding: 60_000,
  },
  perpetual: {
    base: 1_200_000,
    perCitizen: 0.6,
    supportPct: 0.18,
    updatesPct: 0.12,
  },
} as const;

const round = (v: number) => Math.round(v);
const sum = (lines: CostLine[]) => lines.reduce((s, l) => s + l.amount, 0);
const fmtN = (v: number) => v.toLocaleString('en-US');

/** Sensible starting answers for a nation that has not filled the questionnaire. */
export function defaultQuestionnaire(base: Partial<HostingQuestionnaire> = {}): HostingQuestionnaire {
  return {
    population: 5_000_000, activeUsers: 250_000, institutions: 12, services: 40,
    residency: 'in-country', legalConstraints: '', availability: 99.9, rtoHours: 4, rpoMinutes: 15,
    existingFacility: 'partial', power: 'reliable', connectivity: 'redundant-fibre', itStaff: 20,
    cloudKind: 'regional-sovereign', cloudRegionInCountry: true,
    capabilities: { kubernetes: true, managedPostgres: true, objectStorage: true, kms: true },
    plan: 'enterprise', term: 1, support: true, updates: true,
    ...base,
  };
}

/** Validate answers; returns the problems (empty when usable). */
export function validateQuestionnaire(q: Partial<HostingQuestionnaire>): string[] {
  const e: string[] = [];
  const int = (v: unknown, min: number, max: number) => Number.isFinite(Number(v)) && Number(v) >= min && Number(v) <= max;
  if (!int(q.population, 1000, 2_000_000_000)) e.push('Population must be between 1,000 and 2 billion');
  if (!int(q.activeUsers, 0, 2_000_000_000) || Number(q.activeUsers) > Number(q.population)) e.push('Active users must be between 0 and the population');
  if (!int(q.institutions, 1, 5000)) e.push('Institutions must be 1–5000');
  if (!int(q.services, 1, 10_000)) e.push('Services must be 1–10000');
  if (!['in-country', 'regional', 'none'].includes(q.residency as string)) e.push('Choose a data-residency rule');
  if (!int(q.availability, 90, 99.999)) e.push('Availability must be between 90 and 99.999%');
  if (!int(q.rtoHours, 0, 720)) e.push('RTO must be 0–720 hours');
  if (!int(q.rpoMinutes, 0, 10_080)) e.push('RPO must be 0–10080 minutes');
  if (!['none', 'partial', 'tier3-ready'].includes(q.existingFacility as string)) e.push('Describe the existing facilities');
  if (!['reliable', 'unstable'].includes(q.power as string)) e.push('Describe the power supply');
  if (!['redundant-fibre', 'single-link', 'limited'].includes(q.connectivity as string)) e.push('Describe the connectivity');
  if (!int(q.itStaff, 0, 100_000)) e.push('In-country IT staff must be a number');
  if (q.legalConstraints !== undefined && String(q.legalConstraints).length > 2000) e.push('Legal constraints: 2000 characters at most');
  return e;
}

function availabilityRow(a: number) {
  return HOSTING_MODEL.availability.find(r => a >= r.min)!;
}

/** Infrastructure sizing for one site at the target availability. */
export function sizing(q: HostingQuestionnaire) {
  const S = HOSTING_MODEL.sizing;
  const av = availabilityRow(q.availability);
  const vcpu = Math.ceil((S.baseVcpu + (q.activeUsers / 1000) * S.vcpuPer1000ActiveUsers + q.services * S.vcpuPerService) * av.factor * S.headroom);
  const storageTb = Math.ceil(((q.population * S.mbPerCitizen + q.activeUsers * S.mbPerActiveUser) / 1_000_000) * S.replication * S.headroom);
  const nodes = Math.max(3, Math.ceil(vcpu / S.vcpuPerNode));
  const racks = Math.max(1, Math.ceil(nodes / S.nodesPerRack) + 1); // +1 network/storage rack
  const bandwidthGbps = Math.max(1, Math.ceil((q.activeUsers / 100_000) * S.gbpsPer100kActive));
  return { vcpu, ramGb: vcpu * S.ramGbPerVcpu, storageTb, nodes, racks, bandwidthGbps, tier: av.tier, availabilityFactor: av.factor };
}

const phase = (p: string, min: number, max: number, detail: string): TimelinePhase => ({ phase: p, minWeeks: Math.round(min), maxWeeks: Math.round(max), detail });

function finish(e: Omit<HostingEstimate, 'capexTotal' | 'annualTotal' | 'fiveYearTotal' | 'totalWeeks'>): HostingEstimate {
  const capexTotal = sum(e.capex), annualTotal = sum(e.annual);
  return {
    ...e,
    capexTotal, annualTotal, fiveYearTotal: capexTotal + 5 * annualTotal,
    totalWeeks: { min: e.timeline.reduce((s, p) => s + p.minWeeks, 0), max: e.timeline.reduce((s, p) => s + p.maxWeeks, 0) },
  };
}

const GUARANTEES = [
  'Full data export at any time in open formats: PostgreSQL dump, object-storage manifest with checksums, and the audit chain with its inclusion proofs.',
  'No lock-in: the same release runs on every path; open APIs and documented schemas; your licence never ties your data to our infrastructure.',
  'Parallel run before cut-over, and a rollback plan back to the current path until acceptance.',
];
const MIGRATION_STEPS: Record<HostingPath, string> = {
  'sovereign-dc': 'Stand up your data centre and install the same release there',
  'other-cloud': 'Build the landing zone and install the same release in your cloud',
  hosted: 'Provision your tenant in our cloud',
  perpetual: 'Install the licensed release on infrastructure you operate',
};

function migration(from: HostingPath | undefined, to: HostingPath): HostingEstimate['migration'] {
  if (!from || from === to) return undefined;
  return {
    from,
    steps: [
      MIGRATION_STEPS[to],
      'Export a full data snapshot from the current platform and verify its checksums',
      'Import into the new platform and reconcile record counts and audit-chain proofs',
      'Run both in parallel; switch citizen and officer traffic in a maintenance window you choose',
      'Keep the current platform read-only for the agreed period, then decommission it',
    ],
    guarantees: GUARANTEES,
  };
}

function sovereignDc(q: HostingQuestionnaire, rate: number, currency: string, from?: HostingPath): HostingEstimate {
  const D = HOSTING_MODEL.dc;
  const s = sizing(q);
  const $ = (v: number) => round(v * rate);
  const hwPrimary = s.nodes * D.nodeCost + s.storageTb * D.storagePerTb;
  const hwDr = hwPrimary * D.drSiteFactor;
  const hardware = hwPrimary + hwDr;
  const racksTotal = s.racks + Math.ceil(s.racks * D.drSiteFactor);
  const facility = racksTotal * D.facilityPerRack[q.existingFacility] + (q.power === 'unstable' ? 2 * D.upsGeneratorForUnstablePower : 0);
  const network = 2 * D.networkPerSite + s.bandwidthGbps * D.networkPerGbps * 2;
  const security = 2 * D.securityPerSite;
  const capex: CostLine[] = [
    { label: 'Facility (primary and DR site)', amount: $(facility), basis: `${racksTotal} racks × ${fmtN(D.facilityPerRack[q.existingFacility])} (${q.existingFacility === 'none' ? 'new build' : q.existingFacility === 'partial' ? 'upgrade of existing' : 'fit-out of Tier III-ready space'})${q.power === 'unstable' ? ` + UPS/generators ${fmtN(2 * D.upsGeneratorForUnstablePower)}` : ''}` },
    { label: 'Hardware (compute and storage)', amount: $(hardware), basis: `${s.nodes} nodes × ${fmtN(D.nodeCost)} + ${s.storageTb} TB × ${D.storagePerTb}, plus DR site at ${D.drSiteFactor * 100}%` },
    { label: 'Network', amount: $(network), basis: `2 sites × ${fmtN(D.networkPerSite)} + ${s.bandwidthGbps} Gbps × ${fmtN(D.networkPerGbps)} per site` },
    { label: 'Security', amount: $(security), basis: `2 sites × ${fmtN(D.securityPerSite)} (firewalls, HSM, SIEM collectors)` },
    { label: 'Deployment services', amount: $(hardware * D.deploymentServicesPct), basis: `${D.deploymentServicesPct * 100}% of hardware` },
  ];
  const kwh = racksTotal * D.kwPerRack * D.pue * 24 * 365;
  const power = kwh * D.pricePerKwh * (q.power === 'unstable' ? D.unstablePowerPremium : 1);
  const fte = D.baseFte + Math.ceil(racksTotal / 4) * D.ftePer4Racks + (q.availability >= 99.95 ? D.fte24x7Extra : 0);
  const annual: CostLine[] = [
    { label: 'Power and cooling', amount: $(power), basis: `${racksTotal} racks × ${D.kwPerRack} kW × PUE ${D.pue} × 8,760 h × ${D.pricePerKwh}/kWh${q.power === 'unstable' ? ` × ${D.unstablePowerPremium} (generator fuel)` : ''}` },
    { label: 'Staff', amount: $(fte * D.fteAnnual), basis: `${fte} FTE × ${fmtN(D.fteAnnual)} (reference salary; local rates vary)` },
    { label: 'Hardware maintenance', amount: $(hardware * D.maintenancePct), basis: `${D.maintenancePct * 100}% of hardware per year` },
    { label: 'Connectivity', amount: $(2 * D.connectivityPerSite[q.connectivity]), basis: `2 sites × ${fmtN(D.connectivityPerSite[q.connectivity])} (${q.connectivity})` },
    { label: 'Platform licences and support', amount: $(D.platformSupportBase + q.population * D.platformSupportPerCitizen), basis: `${fmtN(D.platformSupportBase)} + ${D.platformSupportPerCitizen} per citizen` },
  ];
  const siteWeeks = { none: [26, 52], partial: [12, 26], 'tier3-ready': [2, 6] }[q.existingFacility];
  const remote = q.connectivity === 'limited' || q.power === 'unstable' ? 4 : 0;
  const scale = Math.max(1, racksTotal / 10);
  const timeline = [
    phase('Site readiness', siteWeeks[0]!, siteWeeks[1]!, q.existingFacility === 'none' ? 'Design and build a Tier III-class facility, power and cooling' : 'Upgrade power, cooling and physical security to Tier III-class'),
    phase('Procurement', 12 + remote, 24 + remote, 'Public tender, award and delivery of hardware and network'),
    phase('Build and install', 8 * scale, 16 * scale, `Rack, cable and burn in ${racksTotal} racks across primary and DR sites`),
    phase('Platform deployment', 4, 8, 'Install the platform, connect HSM and identity, run the security baseline'),
    phase('Data migration', 4 + q.institutions / 6, 12 + q.institutions / 3, `Migrate ${q.institutions} institutions' records with reconciliation`),
    phase('Acceptance and handover', 4, 8, 'Failover drill against the RTO/RPO, penetration test, operational handover'),
  ];
  const staffing = [
    { role: 'Data-centre operations (24/7 shifts)', count: Math.max(6, Math.ceil(fte * 0.4)), note: 'Facilities, hardware, remote hands' },
    { role: 'Platform and SRE engineers', count: Math.max(3, Math.ceil(fte * 0.3)), note: 'Kubernetes, databases, upgrades and probation' },
    { role: 'Network and security engineers', count: Math.max(2, Math.ceil(fte * 0.2)), note: 'Firewalls, HSM, SOC liaison' },
    { role: 'Service management', count: Math.max(1, fte - Math.max(6, Math.ceil(fte * 0.4)) - Math.max(3, Math.ceil(fte * 0.3)) - Math.max(2, Math.ceil(fte * 0.2))), note: 'Change, incident and capacity management' },
  ];
  const risks = [
    q.existingFacility === 'none' ? 'A new facility is the longest and least certain phase; planning permission and power supply drive the date.' : 'Retrofitting an existing facility can uncover power or cooling limits late.',
    q.power === 'unstable' ? 'Unstable grid power: generators and fuel logistics are critical to availability.' : 'Grid dependency: confirm two independent feeds to each site.',
    q.connectivity !== 'redundant-fibre' ? 'Connectivity is a single point of failure until redundant fibre is in place.' : 'Keep the two sites on diverse fibre routes.',
    q.itStaff < fte ? `Staffing gap: ${fte} FTE needed, ${q.itStaff} available today — recruitment and training are on the critical path.` : 'Retaining trained staff is the main long-term risk.',
    'Hardware lead times and currency movements affect the capital budget.',
  ];
  return finish({
    path: 'sovereign-dc', modelVersion: HOSTING_MODEL.version, currency, computedAt: new Date().toISOString(),
    sizing: { vcpu: s.vcpu, ramGb: s.ramGb, storageTb: s.storageTb, bandwidthGbps: s.bandwidthGbps, nodes: s.nodes, racks: racksTotal, sites: ['Primary site', 'Disaster-recovery site (≥100 km away)'], tier: s.tier },
    timeline, capex, annual, staffing, risks,
    prerequisites: [
      'A sponsoring ministry and budget authority for capital and running costs',
      'Two sites with independent power and diverse fibre routes',
      `In-country team of about ${fte} FTE, trained before handover`,
      `Disaster-recovery objectives agreed: RTO ${q.rtoHours} h, RPO ${q.rpoMinutes} min`,
    ],
    assumptions: assumptionsFor(q, s, rate, currency),
    migration: migration(from, 'sovereign-dc'),
  });
}

function otherCloud(q: HostingQuestionnaire, rate: number, currency: string, from?: HostingPath): HostingEstimate {
  const C = HOSTING_MODEL.cloud;
  const s = sizing(q);
  const $ = (v: number) => round(v * rate);
  const kind = q.cloudKind ?? 'public-hyperscaler';
  const cap = q.capabilities ?? { kubernetes: true, managedPostgres: true, objectStorage: true, kms: true };
  const kf = C.kindFactor[kind];
  const compute = s.vcpu * C.vcpuMonth * 12 * kf * 2; // two regions/zones for DR
  const db = compute * C.databaseShareOfCompute * (cap.managedPostgres ? C.managedPostgresPremium - 1 : 0);
  const storage = s.storageTb * C.storageTbMonth * 12 * kf;
  const egress = kind === 'private-cloud' ? 0 : s.storageTb * C.egressShareOfStorage * C.egressPerTb * 12;
  const opsFte = C.baseOpsFte + Math.ceil(s.vcpu / 200) * C.opsFtePer200Vcpu;
  const annual: CostLine[] = [
    { label: 'Compute (two zones)', amount: $(compute), basis: `${s.vcpu} vCPU × ${C.vcpuMonth}/month × 12 × 2 zones × ${kf} (${kind})` },
    { label: 'Managed PostgreSQL premium', amount: $(db), basis: cap.managedPostgres ? `${C.databaseShareOfCompute * 100}% of compute × ${C.managedPostgresPremium - 1}` : 'Self-managed PostgreSQL (no premium; more operations work)' },
    { label: 'Object and block storage', amount: $(storage), basis: `${s.storageTb} TB × ${C.storageTbMonth}/month × 12 × ${kf}` },
    { label: 'Network egress', amount: $(egress), basis: kind === 'private-cloud' ? 'None (private cloud)' : `${C.egressShareOfStorage * 100}% of stored TB per month × ${C.egressPerTb}/TB` },
    { label: 'Key management', amount: $(cap.kms ? C.kmsAnnual : 0), basis: cap.kms ? `Managed KMS ${fmtN(C.kmsAnnual)}/year` : 'HSM appliance instead (capital)' },
    { label: 'Operations staff', amount: $(opsFte * HOSTING_MODEL.dc.fteAnnual), basis: `${opsFte} FTE × ${fmtN(HOSTING_MODEL.dc.fteAnnual)}` },
    { label: 'Platform licences and support', amount: $(HOSTING_MODEL.dc.platformSupportBase + q.population * HOSTING_MODEL.dc.platformSupportPerCitizen), basis: `${fmtN(HOSTING_MODEL.dc.platformSupportBase)} + ${HOSTING_MODEL.dc.platformSupportPerCitizen} per citizen` },
  ];
  const capex: CostLine[] = [
    { label: 'Landing zone and security baseline', amount: $(C.landingZoneSetup), basis: 'Accounts, networks, identity, logging, guardrails, CIS baseline' },
    ...(cap.kms ? [] : [{ label: 'HSM appliance (no managed KMS)', amount: $(C.hsmApplianceWhenNoKms), basis: 'Customer-held keys' }]),
  ];
  const fits = q.residency !== 'in-country' || q.cloudRegionInCountry === true;
  const compatibility = [
    { item: 'Kubernetes', status: cap.kubernetes ? 'ready' : 'missing', note: cap.kubernetes ? 'Managed Kubernetes available' : 'Required: the platform ships as containers and a Helm chart' },
    { item: 'Managed PostgreSQL', status: cap.managedPostgres ? 'ready' : 'needs-work', note: cap.managedPostgres ? 'Point-in-time recovery needed for restore points' : 'Run PostgreSQL yourselves with the operator in the install kit' },
    { item: 'Object storage', status: cap.objectStorage ? 'ready' : 'missing', note: cap.objectStorage ? 'S3-compatible API' : 'Required for documents and backups' },
    { item: 'KMS / HSM', status: cap.kms ? 'ready' : 'needs-work', note: cap.kms ? 'Customer-managed keys' : 'Bring an HSM appliance for customer-held keys' },
  ] as NonNullable<HostingEstimate['compatibility']>;
  return finish({
    path: 'other-cloud', modelVersion: HOSTING_MODEL.version, currency, computedAt: new Date().toISOString(),
    sizing: { vcpu: s.vcpu, ramGb: s.ramGb, storageTb: s.storageTb, bandwidthGbps: s.bandwidthGbps, nodes: s.nodes, racks: 0, sites: ['Primary zone', 'Second zone or region for DR'], tier: `${s.tier} equivalent` },
    timeline: [
      phase('Landing zone', 4, 8, 'Accounts, networks, identity federation, logging and guardrails'),
      phase('Security accreditation', q.residency === 'in-country' ? 6 : 3, q.residency === 'in-country' ? 12 : 6, 'National accreditation of the provider and the landing zone'),
      phase('Platform deployment', 3, 6, 'Install from the Helm chart; connect KMS, identity and backups'),
      phase('Data migration', 4 + q.institutions / 8, 10 + q.institutions / 4, `Migrate ${q.institutions} institutions with reconciliation`),
      phase('Acceptance', 2, 4, 'Failover test across zones, penetration test, handover'),
    ],
    capex, annual, compatibility,
    residencyFit: { fits, note: fits ? (q.residency === 'in-country' ? 'The provider has an in-country region: data stays in the country.' : 'Your residency rule allows this provider’s regions.') : 'Data must stay in the country, but this provider has no in-country region. Choose a regional sovereign or private cloud.' },
    landingZone: ['Separate accounts for production, staging and security tooling', 'Private networking; no public database endpoints', 'Federated identity with MFA for operators', 'Central logging to your SIEM, including the audit chain', 'Customer-managed keys for databases and object storage', 'Policy guardrails: region lock, encryption required, public-access blocks'],
    staffing: [{ role: 'Cloud platform engineers', count: opsFte, note: 'Landing zone, Kubernetes, databases, upgrades' }],
    risks: [
      ...(fits ? [] : ['Residency does not fit: the plan is blocked until an in-country region is available.']),
      ...compatibility.filter(c => c.status !== 'ready').map(c => `${c.item}: ${c.note}`),
      'Provider pricing changes and egress costs affect the running cost.',
      'Jurisdiction: a foreign provider may be subject to foreign legal requests; check with counsel.',
    ],
    prerequisites: ['A contract with the provider covering data protection and exit', 'Customer-managed keys', 'Operators trained on the provider and the platform'],
    assumptions: assumptionsFor(q, s, rate, currency),
    migration: migration(from, 'other-cloud'),
  });
}

function hosted(q: HostingQuestionnaire, rate: number, currency: string, from?: HostingPath): HostingEstimate {
  const H = HOSTING_MODEL.hosted;
  const plan = q.plan ?? 'enterprise';
  const term = q.term ?? 1;
  const P = H.plans[plan];
  const annualRef = P.base + q.population * P.perCitizen;
  const discount = term === 5 ? H.fiveYearDiscountPct : 0;
  const annualAmount = round(annualRef * rate * (1 - discount / 100));
  const s = sizing(q);
  return finish({
    path: 'hosted', modelVersion: HOSTING_MODEL.version, currency, computedAt: new Date().toISOString(),
    timeline: [
      phase('Setting up your installation', 1, 2, 'Your installation, keys and sign-in connection'),
      phase('Data migration', 2 + q.institutions / 10, 6 + q.institutions / 5, `Migrate ${q.institutions} institutions`),
      phase('Acceptance', 1, 2, 'Acceptance tests and go-live'),
    ],
    capex: [{ label: 'Onboarding', amount: round(H.onboarding * rate), basis: 'One-off tenant setup and migration support' }],
    annual: [{ label: `Subscription — ${plan}`, amount: annualAmount, basis: `${fmtN(P.base)} + ${P.perCitizen} per citizen × ${fmtN(q.population)}${discount ? ` − ${discount}% for a 5-year prepaid term` : ''}` }],
    subscription: {
      plan: P.label, term, annual: annualAmount, termTotal: annualAmount * term, discountPct: discount,
      includes: ['Infrastructure, operations and 24/7 monitoring', 'Security releases and the included security baseline', 'Blue-green upgrades with probation and automatic software fallback', 'Backups and disaster recovery across two sites', 'Data export at any time'],
    },
    risks: [
      ...(q.residency === 'in-country' && plan !== 'sovereign-dedicated' ? ['Data must stay in the country: choose “Sovereign dedicated” for infrastructure in your region.'] : []),
      'Dependence on the publisher for operations; mitigated by data export and the no-lock-in guarantees.',
    ],
    prerequisites: ['Identity federation with your directory', 'A named service owner'],
    assumptions: [...assumptionsFor(q, s, rate, currency), 'Subscription prices are per year; a 5-year term is prepaid.'],
    migration: migration(from, 'hosted'),
  });
}

function perpetual(q: HostingQuestionnaire, rate: number, currency: string, from?: HostingPath): HostingEstimate {
  const L = HOSTING_MODEL.perpetual;
  const licence = round((L.base + q.population * L.perCitizen) * rate);
  const supportAnnual = q.support === false ? 0 : round(licence * L.supportPct);
  const updatesAnnual = q.updates === false ? 0 : round(licence * L.updatesPct);
  const s = sizing(q);
  const annual: CostLine[] = [
    ...(supportAnnual ? [{ label: 'Support subscription (optional)', amount: supportAnnual, basis: `${L.supportPct * 100}% of the licence per year` }] : []),
    ...(updatesAnnual ? [{ label: 'Updates subscription (optional)', amount: updatesAnnual, basis: `${L.updatesPct * 100}% of the licence per year` }] : []),
  ];
  return finish({
    path: 'perpetual', modelVersion: HOSTING_MODEL.version, currency, computedAt: new Date().toISOString(),
    timeline: [phase('Licence and delivery', 1, 2, 'Signed release, offline bundle and documentation'), phase('Your own deployment', 4, 26, 'On infrastructure you choose, at your own pace')],
    capex: [{ label: 'Perpetual licence', amount: licence, basis: `${fmtN(L.base)} + ${L.perCitizen} per citizen × ${fmtN(q.population)}` }],
    annual,
    licence: {
      perpetual: licence, supportAnnual, updatesAnnual,
      independent: 'You may operate entirely on your own: no consultation, no approval and no connection to us is needed. Support and updates are optional; without them you keep the version you bought, forever.',
    },
    risks: ['Without the updates subscription you receive no new security releases; plan your own patching.', 'Infrastructure costs are yours and not included here; see the data-centre or other-cloud estimates.'],
    prerequisites: ['Infrastructure of your choice (data centre or cloud)', 'Staff able to install and operate the platform'],
    assumptions: [...assumptionsFor(q, s, rate, currency), 'Infrastructure and staff are excluded from this path’s figures.'],
    migration: migration(from, 'perpetual'),
  });
}

function assumptionsFor(q: HostingQuestionnaire, s: ReturnType<typeof sizing>, rate: number, currency: string): string[] {
  return [
    `Cost model ${HOSTING_MODEL.version}: unit costs are placeholders in ${HOSTING_MODEL.referenceCurrency}${currency !== HOSTING_MODEL.referenceCurrency ? `, converted at contract rate ${rate}` : ''}.`,
    `Sizing for ${fmtN(q.population)} people and ${fmtN(q.activeUsers)} active users, ${q.services} services, ${q.availability}% availability (${s.tier}, ×${s.availabilityFactor} redundancy) with ${HOSTING_MODEL.sizing.headroom}× headroom.`,
    `Storage: ${HOSTING_MODEL.sizing.mbPerCitizen} MB per citizen and ${HOSTING_MODEL.sizing.mbPerActiveUser} MB per active user, ${HOSTING_MODEL.sizing.replication} copies.`,
    'Taxes, import duties and land are excluded.',
    'An estimate, not a quote: the engineering review adjusts it before an official assessment is issued.',
  ];
}

/** The estimate for one path. `rate` converts the reference currency into `currency`. */
export function estimate(path: HostingPath, q: HostingQuestionnaire, rate = 1, currency: string = HOSTING_MODEL.referenceCurrency, from?: HostingPath): HostingEstimate {
  switch (path) {
    case 'sovereign-dc': return sovereignDc(q, rate, currency, from);
    case 'other-cloud': return otherCloud(q, rate, currency, from);
    case 'hosted': return hosted(q, rate, currency, from);
    case 'perpetual': return perpetual(q, rate, currency, from);
  }
}

/** Engineering review: scale costs and durations, keeping the breakdown consistent. */
export function adjust(e: HostingEstimate, f: { capexFactor?: number; annualFactor?: number; timelineFactor?: number }): HostingEstimate {
  const cf = f.capexFactor ?? 1, af = f.annualFactor ?? 1, tf = f.timelineFactor ?? 1;
  const capex = e.capex.map(l => ({ ...l, amount: round(l.amount * cf) }));
  const annual = e.annual.map(l => ({ ...l, amount: round(l.amount * af) }));
  const timeline = e.timeline.map(p => ({ ...p, minWeeks: Math.round(p.minWeeks * tf), maxWeeks: Math.round(p.maxWeeks * tf) }));
  const capexTotal = sum(capex), annualTotal = sum(annual);
  return {
    ...e, capex, annual, timeline, capexTotal, annualTotal, fiveYearTotal: capexTotal + 5 * annualTotal,
    totalWeeks: { min: timeline.reduce((s, p) => s + p.minWeeks, 0), max: timeline.reduce((s, p) => s + p.maxWeeks, 0) },
    subscription: e.subscription ? { ...e.subscription, annual: round(e.subscription.annual * af), termTotal: round(e.subscription.termTotal * af) } : undefined,
    adjustments: { capexFactor: cf, annualFactor: af, timelineFactor: tf },
  };
}

/** Published unit costs, for the transparency table. */
export function unitCostTable(): { label: string; value: string }[] {
  const D = HOSTING_MODEL.dc, C = HOSTING_MODEL.cloud, H = HOSTING_MODEL.hosted, L = HOSTING_MODEL.perpetual;
  return [
    { label: 'Server node (64 vCPU)', value: fmtN(D.nodeCost) },
    { label: 'Enterprise storage per TB', value: fmtN(D.storagePerTb) },
    { label: 'Facility per rack (new / upgrade / fit-out)', value: `${fmtN(D.facilityPerRack.none)} / ${fmtN(D.facilityPerRack.partial)} / ${fmtN(D.facilityPerRack['tier3-ready'])}` },
    { label: 'Power per kWh, PUE', value: `${D.pricePerKwh}, ${D.pue}` },
    { label: 'Staff per FTE per year', value: fmtN(D.fteAnnual) },
    { label: 'Cloud vCPU per month / storage TB per month', value: `${C.vcpuMonth} / ${C.storageTbMonth}` },
    { label: 'Cloud landing zone (one-off)', value: fmtN(C.landingZoneSetup) },
    { label: 'Hosted plans per year (base + per citizen)', value: Object.entries(H.plans).map(([k, p]) => `${k}: ${fmtN(p.base)} + ${p.perCitizen}`).join(' · ') },
    { label: 'Hosted 5-year prepaid discount', value: `${H.fiveYearDiscountPct}%` },
    { label: 'Perpetual licence (base + per citizen)', value: `${fmtN(L.base)} + ${L.perCitizen}` },
  ];
}
