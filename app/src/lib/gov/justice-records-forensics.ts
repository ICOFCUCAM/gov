// lib/gov/justice-records-forensics.ts
//
// Sovereign Justice Records, Forensic Coordination & Public Portal
// engine. Complements the justice-continuity board with three
// operational layers: national legal-records continuity (sovereign
// archives, judicial memory, chain-of-custody), forensic & evidence
// coordination (laboratories, digital forensics, biometrics, inter-
// agency evidence exchange) and the public justice portal (filings,
// digital court access, attorney systems, rights petitions, case
// tracking). Pure & deterministic; SSR-stable per operational epoch.
// Constitutional, procedural, archival.

import { seed, wave } from '@/lib/telemetry';

export const JUSTICE_RECORDS_SAFEGUARDS = {
  archivalIntegrity: true as const,
  chainOfCustodyDoctrine: true as const,
  attorneyClientPrivilege: true as const,
  petitionerRightToAccess: true as const,
  prohibited: [
    'evidence-fabrication', 'tampering-with-chain-of-custody',
    'unlawful-records-destruction', 'denial-of-counsel',
    'rights-petition-suppression', 'extra-judicial-evidence-acquisition',
  ] as const,
};

// ── A. National Legal Records Continuity ────────────────────────────
export interface ArchiveVault {
  id: string;
  vault: string;             // e.g. Capital Constitutional Archive
  category: 'constitutional' | 'supreme-rulings' | 'criminal' | 'civil' | 'land-title' | 'corporate-registry';
  recordsM: number;          // millions of records
  digitisedPct: number;
  integrityIdx: number;
  custodian: string;
  status: 'sealed' | 'live' | 'review' | 'restoration';
}

export interface ChainOfCustodyTransaction {
  id: string;
  matter: string;            // case / matter identifier
  artefact: 'document' | 'physical-evidence' | 'digital-evidence' | 'biometric-record' | 'forensic-report';
  fromCustodian: string;
  toCustodian: string;
  ageHrs: number;
  status: 'in-transit' | 'verified' | 'held' | 'flagged';
}

export interface LegalRecordsContinuity {
  archives: ArchiveVault[];
  custodyTransactions: ChainOfCustodyTransaction[];
  totalRecordsM: number;
  digitisationProgressPct: number;
  archivalIntegrityIdx: number;
  judicialMemoryYears: number;     // span of archived judicial history
  outstandingRestorationCases: number;
}

// ── B. Forensic & Evidence Coordination ─────────────────────────────
export interface ForensicLab {
  id: string;
  lab: string;
  discipline: 'DNA & biology' | 'Toxicology' | 'Ballistics' | 'Digital & cyber' | 'Document examination' | 'Trace evidence' | 'Forensic pathology';
  region: string;
  caseloadActive: number;
  capacityUtilisationPct: number;
  averageTurnaroundDays: number;
  accreditationStatus: 'accredited' | 'review' | 'probation' | 'suspended';
  examinersOnDuty: number;
}

export interface EvidenceCorpus {
  totalItemsM: number;            // millions
  digitalEvidenceTb: number;      // terabytes
  biometricRecordsM: number;
  pendingAuthentication: number;
  rejectedThisQ: number;
  interAgencyExchangesDaily: number;
}

export interface ForensicCoordination {
  labs: ForensicLab[];
  corpus: EvidenceCorpus;
  meanQualityIdx: number;
  authenticationBacklog: number;
  interOperabilityIdx: number;
}

// ── C. Public Justice Portal ────────────────────────────────────────
export interface LegalFilingFlow {
  category: 'civil' | 'criminal' | 'family' | 'commercial' | 'administrative' | 'constitutional';
  filedToday: number;
  acceptedToday: number;
  rejectedToday: number;
  pending: number;
  medianAcceptanceHrs: number;
}

export interface AttorneyRegistration {
  licensedAttorneysK: number;
  newAdmissionsThisQ: number;
  disciplinaryCasesOpen: number;
  proBonoHoursThisQK: number;
  registrationUptimePct: number;
}

export interface CivilComplaint {
  id: string;
  kind: 'discrimination' | 'denial-of-service' | 'rights-violation' | 'enforcement-abuse' | 'administrative-grievance' | 'consumer-rights';
  ageDays: number;
  status: 'received' | 'screening' | 'mediation' | 'tribunal' | 'resolved';
  severity: 'low' | 'elevated' | 'severe';
}

export interface RightsPetition {
  id: string;
  scope: 'individual' | 'class' | 'institutional';
  matter: string;
  filedDaysAgo: number;
  daysToHearing: number;
  status: 'docketed' | 'scheduled' | 'in-hearing' | 'reserved' | 'ruling-issued';
}

export interface PublicJusticePortal {
  filings: LegalFilingFlow[];
  attorneyRegistration: AttorneyRegistration;
  complaints: CivilComplaint[];
  rightsPetitions: RightsPetition[];
  publicLegalNoticesIssued24h: number;
  caseTrackingAccessesDailyK: number;
  portalAvailabilityPct: number;
}

export interface JusticeRecordsForensicsBoard {
  epoch: number;
  records: LegalRecordsContinuity;
  forensics: ForensicCoordination;
  portal: PublicJusticePortal;
  prohibited: readonly string[];
}

const REGIONS = ['Capital District', 'Northern', 'Eastern', 'Western', 'Coastal', 'Highland'];

const ARCHIVE_DEFS: { vault: string; category: ArchiveVault['category']; custodian: string }[] = [
  { vault: 'Capital Constitutional Archive', category: 'constitutional', custodian: 'Office of the Chief Archivist' },
  { vault: 'Supreme Court Rulings Vault', category: 'supreme-rulings', custodian: 'Supreme Court Clerk' },
  { vault: 'National Criminal Records', category: 'criminal', custodian: 'National Criminal Registry' },
  { vault: 'Civil Procedure Archive', category: 'civil', custodian: 'Civil Procedure Registrar' },
  { vault: 'National Land-Title Vault', category: 'land-title', custodian: 'Land Registry Office' },
  { vault: 'Corporate Records Registry', category: 'corporate-registry', custodian: 'Corporate Affairs Bureau' },
];

const LAB_DEFS: { lab: string; discipline: ForensicLab['discipline']; region: string }[] = [
  { lab: 'Capital National Forensic Centre', discipline: 'DNA & biology', region: 'Capital District' },
  { lab: 'Eastern Toxicology Institute', discipline: 'Toxicology', region: 'Eastern' },
  { lab: 'Northern Ballistics Laboratory', discipline: 'Ballistics', region: 'Northern' },
  { lab: 'National Digital Forensics Unit', discipline: 'Digital & cyber', region: 'Capital District' },
  { lab: 'Coastal Documents Examination Bureau', discipline: 'Document examination', region: 'Coastal' },
  { lab: 'Western Trace Evidence Lab', discipline: 'Trace evidence', region: 'Western' },
  { lab: 'National Forensic Pathology Centre', discipline: 'Forensic pathology', region: 'Capital District' },
];

const ARTEFACT_KINDS: ChainOfCustodyTransaction['artefact'][] = ['document', 'physical-evidence', 'digital-evidence', 'biometric-record', 'forensic-report'];
const CUSTODIANS = ['Court Registrar', 'Police Evidence Unit', 'Forensic Custody', 'Prosecutor\'s Office', 'Defence Counsel', 'Independent Custodian'];

const FILING_CATEGORIES: LegalFilingFlow['category'][] = ['civil', 'criminal', 'family', 'commercial', 'administrative', 'constitutional'];
const COMPLAINT_KINDS: CivilComplaint['kind'][] = ['discrimination', 'denial-of-service', 'rights-violation', 'enforcement-abuse', 'administrative-grievance', 'consumer-rights'];
const PETITION_SCOPES: RightsPetition['scope'][] = ['individual', 'class', 'institutional'];
const PETITION_MATTERS = [
  'Right to counsel — pre-trial detention review',
  'Freedom of association — assembly restriction',
  'Equal protection — administrative classification',
  'Privacy — biometric collection scope',
  'Due process — administrative sanction',
  'Right to information — public records access',
];

export function justiceRecordsForensicsBoard(now: number): JusticeRecordsForensicsBoard {
  const epoch = Math.max(0, Math.floor(now / 4000));

  // ── A. Records & archives ─────────────────────────────────────────
  const archives: ArchiveVault[] = ARCHIVE_DEFS.map((a, i) => {
    const k = `jr:av:${a.vault}`;
    const recordsM = Math.round(wave(`${k}:rm`, epoch / 9, 4, 240) * 10) / 10;
    const digitisedPct = Math.round(wave(`${k}:dp`, epoch / 7, 38, 96));
    const integrityIdx = Math.round(wave(`${k}:ii`, epoch / 8, 58, 98));
    const statusRoll = seed(`${k}:st:${Math.floor(epoch / 8)}`);
    const status: ArchiveVault['status'] =
      integrityIdx < 70 ? 'restoration'
        : statusRoll > 0.92 ? 'sealed'
          : statusRoll > 0.82 ? 'review' : 'live';
    return { id: `AV-${i + 1}`, vault: a.vault, category: a.category, recordsM, digitisedPct, integrityIdx, custodian: a.custodian, status };
  });

  const custodyTransactions: ChainOfCustodyTransaction[] = Array.from({ length: 8 }, (_, i) => {
    const k = `jr:cot:${i}:${Math.floor(epoch / 4)}`;
    const artefact = ARTEFACT_KINDS[Math.floor(seed(`${k}:a`) * ARTEFACT_KINDS.length)]!;
    const fromCustodian = CUSTODIANS[Math.floor(seed(`${k}:f`) * CUSTODIANS.length)]!;
    const toCustodian = CUSTODIANS[Math.floor(seed(`${k}:t`) * CUSTODIANS.length)]!;
    const ageHrs = Math.round(wave(`${k}:ag`, epoch / 4, 1, 168));
    const flagRoll = seed(`${k}:fl`);
    const status: ChainOfCustodyTransaction['status'] =
      flagRoll > 0.94 ? 'flagged'
        : ageHrs > 72 ? 'held'
          : ageHrs < 12 ? 'in-transit' : 'verified';
    return {
      id: `CT-${(8000 + Math.floor(seed(`${k}:id`) * 40000))}`,
      matter: `MTR-${(20000 + Math.floor(seed(`${k}:m`) * 80000))}`,
      artefact, fromCustodian, toCustodian, ageHrs, status,
    };
  }).sort((a, b) => a.ageHrs - b.ageHrs);

  const totalRecordsM = Math.round(archives.reduce((s, a) => s + a.recordsM, 0) * 10) / 10;
  const digitisationProgressPct = Math.round(archives.reduce((s, a) => s + a.digitisedPct, 0) / archives.length);
  const archivalIntegrityIdx = Math.round(archives.reduce((s, a) => s + a.integrityIdx, 0) / archives.length);
  const records: LegalRecordsContinuity = {
    archives, custodyTransactions, totalRecordsM, digitisationProgressPct, archivalIntegrityIdx,
    judicialMemoryYears: 120 + Math.floor(seed(`jr:rec:jm`) * 80),
    outstandingRestorationCases: archives.filter(a => a.status === 'restoration').length * 3 + Math.floor(seed(`jr:rec:or:${Math.floor(epoch / 5)}`) * 8),
  };

  // ── B. Forensic coordination ──────────────────────────────────────
  const labs: ForensicLab[] = LAB_DEFS.map((l, i) => {
    const k = `jr:lab:${l.lab}`;
    const caseloadActive = Math.round(wave(`${k}:cl`, epoch / 5, 60, 4600));
    const capacityUtilisationPct = Math.round(wave(`${k}:cu`, epoch / 4, 38, 118));
    const averageTurnaroundDays = Math.round(wave(`${k}:tr`, epoch / 6, 4, 96));
    const accRoll = seed(`${k}:ac`);
    const accreditationStatus: ForensicLab['accreditationStatus'] =
      accRoll > 0.94 ? 'suspended'
        : accRoll > 0.86 ? 'probation'
          : accRoll > 0.7 ? 'review' : 'accredited';
    const examinersOnDuty = 12 + Math.floor(seed(`${k}:ex`) * 86);
    return { id: `FL-${i + 1}`, lab: l.lab, discipline: l.discipline, region: l.region, caseloadActive, capacityUtilisationPct, averageTurnaroundDays, accreditationStatus, examinersOnDuty };
  });

  const corpus: EvidenceCorpus = {
    totalItemsM: Math.round(wave(`jr:ec:ti`, epoch / 8, 4, 64) * 10) / 10,
    digitalEvidenceTb: Math.round(wave(`jr:ec:de`, epoch / 6, 80, 2400)),
    biometricRecordsM: Math.round(wave(`jr:ec:bm`, epoch / 9, 2, 18) * 10) / 10,
    pendingAuthentication: Math.round(wave(`jr:ec:pa`, epoch / 4, 400, 12800)),
    rejectedThisQ: Math.round(wave(`jr:ec:rj`, epoch / 5, 40, 1800)),
    interAgencyExchangesDaily: Math.round(wave(`jr:ec:ix`, epoch / 4, 40, 880)),
  };

  const forensics: ForensicCoordination = {
    labs, corpus,
    meanQualityIdx: Math.round(wave(`jr:fc:mq`, epoch / 7, 58, 96)),
    authenticationBacklog: corpus.pendingAuthentication,
    interOperabilityIdx: Math.round(wave(`jr:fc:io`, epoch / 6, 48, 94)),
  };

  // ── C. Public justice portal ──────────────────────────────────────
  const filings: LegalFilingFlow[] = FILING_CATEGORIES.map(category => {
    const k = `jr:fl:${category}`;
    const filedToday = Math.round(wave(`${k}:ft`, epoch / 3, 40, 2400));
    const acceptedToday = Math.round(filedToday * wave(`${k}:ac`, epoch / 4, 0.62, 0.94));
    const rejectedToday = Math.max(0, filedToday - acceptedToday - Math.round(wave(`${k}:el`, epoch / 4, 2, 38)));
    const pending = Math.round(wave(`${k}:pn`, epoch / 4, 80, 18800));
    const medianAcceptanceHrs = Math.round(wave(`${k}:ma`, epoch / 5, 1, 96));
    return { category, filedToday, acceptedToday, rejectedToday, pending, medianAcceptanceHrs };
  });

  const attorneyRegistration: AttorneyRegistration = {
    licensedAttorneysK: Math.round(wave(`jr:at:lk`, epoch / 9, 22, 240)),
    newAdmissionsThisQ: Math.round(wave(`jr:at:na`, epoch / 5, 60, 1800)),
    disciplinaryCasesOpen: Math.round(wave(`jr:at:dc`, epoch / 4, 4, 280)),
    proBonoHoursThisQK: Math.round(wave(`jr:at:pb`, epoch / 5, 4, 220) * 10) / 10,
    registrationUptimePct: Math.round(wave(`jr:at:up`, epoch / 4, 92, 99.9) * 10) / 10,
  };

  const complaints: CivilComplaint[] = Array.from({ length: 10 }, (_, i) => {
    const k = `jr:cp:${i}:${Math.floor(epoch / 4)}`;
    const kind = COMPLAINT_KINDS[Math.floor(seed(`${k}:k`) * COMPLAINT_KINDS.length)]!;
    const ageDays = Math.round(wave(`${k}:ag`, epoch / 4, 1, 180));
    const sevRoll = seed(`${k}:sv`);
    const severity: CivilComplaint['severity'] = sevRoll > 0.85 ? 'severe' : sevRoll > 0.55 ? 'elevated' : 'low';
    const statusRoll = seed(`${k}:st`);
    const status: CivilComplaint['status'] =
      ageDays > 120 ? 'resolved'
        : ageDays > 60 ? 'tribunal'
          : ageDays > 21 ? 'mediation'
            : statusRoll > 0.5 ? 'screening' : 'received';
    return { id: `CC-${(11000 + Math.floor(seed(`${k}:id`) * 60000))}`, kind, ageDays, status, severity };
  }).sort((a, b) => a.ageDays - b.ageDays);

  const rightsPetitions: RightsPetition[] = Array.from({ length: 6 }, (_, i) => {
    const k = `jr:rp:${i}:${Math.floor(epoch / 4)}`;
    const scope = PETITION_SCOPES[Math.floor(seed(`${k}:sc`) * PETITION_SCOPES.length)]!;
    const matter = PETITION_MATTERS[Math.floor(seed(`${k}:m`) * PETITION_MATTERS.length)]!;
    const filedDaysAgo = Math.round(wave(`${k}:fd`, epoch / 5, 1, 220));
    const daysToHearing = Math.max(0, Math.round(wave(`${k}:dh`, epoch / 5, -30, 120)));
    const statusRoll = seed(`${k}:st`);
    const status: RightsPetition['status'] =
      filedDaysAgo > 120 ? 'ruling-issued'
        : daysToHearing === 0 ? 'in-hearing'
          : daysToHearing > 30 ? 'docketed'
            : statusRoll > 0.6 ? 'reserved' : 'scheduled';
    return { id: `RP-${(12000 + Math.floor(seed(`${k}:id`) * 50000))}`, scope, matter, filedDaysAgo, daysToHearing, status };
  });

  const portal: PublicJusticePortal = {
    filings, attorneyRegistration, complaints, rightsPetitions,
    publicLegalNoticesIssued24h: Math.round(wave(`jr:po:ln`, epoch / 4, 12, 340)),
    caseTrackingAccessesDailyK: Math.round(wave(`jr:po:ct`, epoch / 4, 40, 1800)),
    portalAvailabilityPct: Math.round(wave(`jr:po:av`, epoch / 4, 96, 99.95) * 100) / 100,
  };

  return {
    epoch, records, forensics, portal,
    prohibited: JUSTICE_RECORDS_SAFEGUARDS.prohibited,
  };
}
