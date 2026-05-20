// lib/gov/justice-continuity.ts
//
// Sovereign Justice & Constitutional Affairs engine. Constitutional
// review chamber, national judicial operations, legislative review,
// prosecutorial coordination, corrections, rights protection, admin-
// legality and judicial forecasting — one connected deterministic
// runtime. Cross-ministry propagation chains turn a constitutional /
// judicial crisis into a national cascade across Interior / Treasury /
// Legislature / Cabinet / Education / National Coordination.
// Pure & deterministic; SSR-stable per operational epoch.

import { seed, wave } from '@/lib/telemetry';
import { justiceOps } from '@/lib/gov/justice-systems';

const REGIONS = ['Capital District', 'Northern', 'Eastern', 'Western', 'Coastal', 'Highland'];

export type ConstitutionalPosture =
  | 'sound' | 'engaged' | 'under-review' | 'pressure' | 'breach-watch';

// ── 1. Constitutional review chamber ────────────────────────────────
export interface ConstitutionalArticle {
  article: string;            // formal designation, e.g. "§ I.4"
  title: string;
  integrityIdx: number;       // 0..100 higher = better
  underReview: boolean;
  emergencyPowerActive: boolean;
}

export interface ConstitutionalReview {
  posture: ConstitutionalPosture;
  integrityIdx: number;        // composite
  articlesUnderReview: number;
  emergencyPowersAsserted: number;
  separationOfPowersIdx: number;
  judicialIndependenceIdx: number;
  articles: ConstitutionalArticle[];
}

// ── 2. National judicial operations ─────────────────────────────────
export interface CourtRoster {
  id: string;
  court: string;              // e.g. Capital Constitutional Court
  tier: 'Constitutional' | 'Supreme' | 'Appellate' | 'High' | 'Magistrates';
  region: string;
  pendingCases: number;
  medianDispositionDays: number;
  benchUtilisationPct: number;
  backlogClass: 'cleared' | 'monitored' | 'congested' | 'overdue';
}

// ── 3. Legislative & regulatory review ──────────────────────────────
export interface StatuteReview {
  id: string;
  statute: string;
  domain: 'Constitutional' | 'Administrative' | 'Criminal' | 'Civil' | 'Regulatory';
  interpretationStability: number;
  legalityVerdict: 'compliant' | 'review-required' | 'inconsistent';
  daysSinceReview: number;
}

// ── 4. Prosecutorial & investigative coordination ───────────────────
export interface ProsecutorialDocket {
  id: string;
  matter: string;
  agency: string;
  stage: 'intake' | 'investigation' | 'charging' | 'pre-trial' | 'trial' | 'disposition' | 'appeal';
  evidentiaryIntegrity: number;
  detaineeRights: 'safeguarded' | 'review-engaged' | 'breach-alert';
}

// ── 5. Correctional & rehabilitation ────────────────────────────────
export interface CorrectionalFacility {
  id: string;
  facility: string;
  region: string;
  occupancyPct: number;
  rehabilitationProgrammes: number;
  rightsSafeguardIdx: number;
  oversightStatus: 'independent-oversight' | 'ministerial-review' | 'no-recent-audit';
}

// ── 6. Human rights & civil liberties protection ────────────────────
export interface RightsProtection {
  right: 'Due process' | 'Equality before the law' | 'Freedom of expression' | 'Right to counsel' | 'Privacy' | 'Detention safeguards' | 'Judicial review';
  monitoringIdx: number;
  alertsRaised: number;
  proceduralFairnessIdx: number;
  status: 'preserved' | 'watch' | 'escalation';
}

// ── 7. Administrative legality ──────────────────────────────────────
export interface AdministrativeReview {
  ministry: string;
  complianceIdx: number;
  outstandingActions: number;
  auditLineageYears: number;
  executiveAccountabilityIdx: number;
}

// ── 8. Judicial intelligence & forecasting ──────────────────────────
export type JusticeIncidentKind =
  | 'executive-overreach' | 'constitutional-amendment-strain' | 'court-strike'
  | 'detention-rights-breach' | 'electoral-petition-flood' | 'legislative-deadlock'
  | 'judicial-independence-threat';

export interface JusticeIncident {
  id: string;
  kind: JusticeIncidentKind;
  severity: 'advisory' | 'elevated' | 'critical' | 'national';
  origin: string;
  ageDays: number;
  ministryCascade: { ministry: string; effect: string; delayHrs: number; status: 'pending' | 'engaged' | 'cleared' }[];
  reviewVerdict: 'pending' | 'review' | 'ruling-issued' | 'precedent-set';
}

export interface JusticeForecast {
  horizonYears: number[];
  constitutionalIntegrityTrajectory: number[];
  judicialIndependenceTrajectory: number[];
  rightsConfidenceTrajectory: number[];
  caseBacklogProjection: number[];
  legitimacyTrajectory: number;     // single 0..100 reading
  constitutionalCrisisRisk: number;
}

export interface JusticeContinuityBoard {
  epoch: number;
  review: ConstitutionalReview;
  courts: CourtRoster[];
  statutes: StatuteReview[];
  dockets: ProsecutorialDocket[];
  corrections: CorrectionalFacility[];
  rights: RightsProtection[];
  administrative: AdministrativeReview[];
  incidents: JusticeIncident[];
  forecast: JusticeForecast;
  bannerLine: string;
  ministriesEngaged: { ministry: string; engaged: number }[];
}

const PROPAGATION: Record<JusticeIncidentKind, { ministry: string; effect: string; delayHrs: number }[]> = {
  'executive-overreach': [
    { ministry: 'Interior', effect: 'Operational constraints under constitutional review', delayHrs: 4 },
    { ministry: 'Treasury', effect: 'Disbursement legality freeze gate', delayHrs: 8 },
    { ministry: 'Legislature', effect: 'Emergency hearing convened', delayHrs: 12 },
    { ministry: 'National Coordination', effect: 'Cabinet continuity reassessment', delayHrs: 24 },
  ],
  'constitutional-amendment-strain': [
    { ministry: 'Legislature', effect: 'Procedural review escalated', delayHrs: 24 },
    { ministry: 'National Coordination', effect: 'Constitutional continuity advisory', delayHrs: 48 },
    { ministry: 'Education', effect: 'Civic-literacy advisory circulated', delayHrs: 168 },
  ],
  'court-strike': [
    { ministry: 'Interior', effect: 'Lawful-assembly protections engaged', delayHrs: 4 },
    { ministry: 'Treasury', effect: 'Judicial compensation review', delayHrs: 72 },
  ],
  'detention-rights-breach': [
    { ministry: 'Interior', effect: 'Independent oversight engaged', delayHrs: 0 },
    { ministry: 'Cabinet', effect: 'Constitutional advisory issued', delayHrs: 24 },
    { ministry: 'Citizen Identity', effect: 'Citizen-rights advisory issued', delayHrs: 12 },
  ],
  'electoral-petition-flood': [
    { ministry: 'Legislature', effect: 'Procedural calendar adjustment', delayHrs: 24 },
    { ministry: 'Interior', effect: 'Civil-stability watch', delayHrs: 12 },
  ],
  'legislative-deadlock': [
    { ministry: 'Treasury', effect: 'Appropriation continuity protection', delayHrs: 24 },
    { ministry: 'Cabinet', effect: 'Constitutional-continuity protocol', delayHrs: 12 },
    { ministry: 'National Coordination', effect: 'Cross-branch coordination engaged', delayHrs: 24 },
  ],
  'judicial-independence-threat': [
    { ministry: 'Cabinet', effect: 'Constitutional protection invoked', delayHrs: 12 },
    { ministry: 'Legislature', effect: 'Independent inquiry tabled', delayHrs: 24 },
    { ministry: 'National Coordination', effect: 'Sovereign continuity brief', delayHrs: 24 },
  ],
};

const KIND_LIST: JusticeIncidentKind[] = [
  'executive-overreach', 'constitutional-amendment-strain', 'court-strike',
  'detention-rights-breach', 'electoral-petition-flood', 'legislative-deadlock',
  'judicial-independence-threat',
];

const ARTICLES: { article: string; title: string }[] = [
  { article: '§ I', title: 'Sovereignty & territorial integrity' },
  { article: '§ II', title: 'Separation of powers' },
  { article: '§ III', title: 'Bill of rights' },
  { article: '§ IV', title: 'Judicial independence' },
  { article: '§ V', title: 'Emergency powers & sunset' },
  { article: '§ VI', title: 'Fiscal accountability' },
  { article: '§ VII', title: 'Due process & detention' },
  { article: '§ VIII', title: 'Pluralistic governance' },
];

const COURT_DEFS: { court: string; tier: CourtRoster['tier']; region: string }[] = [
  { court: 'Constitutional Court', tier: 'Constitutional', region: 'Capital District' },
  { court: 'Supreme Court', tier: 'Supreme', region: 'Capital District' },
  { court: 'Northern Appellate Court', tier: 'Appellate', region: 'Northern' },
  { court: 'Eastern High Court', tier: 'High', region: 'Eastern' },
  { court: 'Coastal High Court', tier: 'High', region: 'Coastal' },
  { court: 'Highland Magistrates Bench', tier: 'Magistrates', region: 'Highland' },
  { court: 'Western Magistrates Bench', tier: 'Magistrates', region: 'Western' },
];

const STATUTES: { statute: string; domain: StatuteReview['domain'] }[] = [
  { statute: 'Constitutional Continuity Act', domain: 'Constitutional' },
  { statute: 'Administrative Procedure Code', domain: 'Administrative' },
  { statute: 'Criminal Code', domain: 'Criminal' },
  { statute: 'Civil Procedure Code', domain: 'Civil' },
  { statute: 'Public Procurement Regulation', domain: 'Regulatory' },
  { statute: 'Detention Standards Act', domain: 'Criminal' },
];

const RIGHTS: RightsProtection['right'][] = [
  'Due process', 'Equality before the law', 'Freedom of expression',
  'Right to counsel', 'Privacy', 'Detention safeguards', 'Judicial review',
];

const REVIEW_MINISTRIES = ['Interior', 'Treasury', 'Health', 'Education', 'Energy', 'Transport', 'Agriculture', 'Trade & Industry'];

export function justiceContinuityBoard(now: number): JusticeContinuityBoard {
  const epoch = Math.max(0, Math.floor(now / 4000));
  const ts = epoch;
  const j = justiceOps('national', ts);
  void j;

  // 1. Constitutional review
  const articles: ConstitutionalArticle[] = ARTICLES.map((a, i) => {
    const k = `jc:art:${a.article}`;
    const integrityIdx = Math.round(wave(`${k}:i`, epoch / 11, 58, 96));
    const reviewRoll = seed(`${k}:r:${Math.floor(epoch / 9)}`);
    const emerRoll = seed(`${k}:e:${Math.floor(epoch / 14)}`);
    void i;
    return {
      article: a.article, title: a.title, integrityIdx,
      underReview: reviewRoll > 0.78 || integrityIdx < 72,
      emergencyPowerActive: a.article === '§ V' && emerRoll > 0.72,
    };
  });
  const integrityIdx = Math.round(articles.reduce((s, a) => s + a.integrityIdx, 0) / articles.length);
  const articlesUnderReview = articles.filter(a => a.underReview).length;
  const emergencyPowersAsserted = articles.filter(a => a.emergencyPowerActive).length;
  const separationOfPowersIdx = Math.round(wave(`jc:sop`, epoch / 14, 58, 94));
  const judicialIndependenceIdx = Math.round(wave(`jc:ji`, epoch / 12, 56, 96));
  const posture: ConstitutionalPosture =
    articlesUnderReview >= 4 || integrityIdx < 60 ? 'breach-watch'
      : articlesUnderReview >= 2 || integrityIdx < 72 ? 'pressure'
        : articlesUnderReview >= 1 ? 'under-review'
          : integrityIdx < 86 ? 'engaged' : 'sound';
  const review: ConstitutionalReview = {
    posture, integrityIdx, articlesUnderReview, emergencyPowersAsserted,
    separationOfPowersIdx, judicialIndependenceIdx, articles,
  };

  // 2. Court roster
  const courts: CourtRoster[] = COURT_DEFS.map((c, i) => {
    const k = `jc:ct:${c.court}`;
    const pendingCases = Math.round(wave(`${k}:p`, epoch / 5, 60, 8800));
    const medianDispositionDays = Math.round(wave(`${k}:m`, epoch / 6, 28, 480));
    const benchUtilisationPct = Math.round(wave(`${k}:b`, epoch / 5, 58, 99));
    const backlogClass: CourtRoster['backlogClass'] =
      medianDispositionDays >= 360 ? 'overdue'
        : medianDispositionDays >= 180 ? 'congested'
          : medianDispositionDays >= 90 ? 'monitored' : 'cleared';
    void i;
    return { id: `CT-${i + 1}`, court: c.court, tier: c.tier, region: c.region, pendingCases, medianDispositionDays, benchUtilisationPct, backlogClass };
  });

  // 3. Statute review
  const statutes: StatuteReview[] = STATUTES.map((s, i) => {
    const k = `jc:st:${s.statute}`;
    const interpretationStability = Math.round(wave(`${k}:i`, epoch / 9, 52, 96));
    const verdictRoll = seed(`${k}:v:${Math.floor(epoch / 8)}`);
    const legalityVerdict: StatuteReview['legalityVerdict'] =
      verdictRoll > 0.92 ? 'inconsistent' : verdictRoll > 0.72 ? 'review-required' : 'compliant';
    const daysSinceReview = Math.round(wave(`${k}:d`, epoch / 12, 20, 720));
    void i;
    return { id: `ST-${i + 1}`, statute: s.statute, domain: s.domain, interpretationStability, legalityVerdict, daysSinceReview };
  });

  // 4. Prosecutorial docket
  const stages: ProsecutorialDocket['stage'][] = ['intake', 'investigation', 'charging', 'pre-trial', 'trial', 'disposition', 'appeal'];
  const dockets: ProsecutorialDocket[] = Array.from({ length: 9 }, (_, i) => {
    const k = `jc:dk:${i}:${Math.floor(epoch / 4)}`;
    const stage = stages[Math.floor(seed(`${k}:s`) * stages.length)]!;
    const evidentiaryIntegrity = Math.round(wave(`${k}:e`, epoch / 5, 58, 96));
    const rightsRoll = seed(`${k}:r`);
    const detaineeRights: ProsecutorialDocket['detaineeRights'] =
      rightsRoll > 0.92 ? 'breach-alert' : rightsRoll > 0.78 ? 'review-engaged' : 'safeguarded';
    return {
      id: `DK-${(5000 + Math.floor(seed(`${k}:id`) * 60000))}`,
      matter: ['Constitutional petition', 'Public-procurement audit', 'Detention-rights review', 'Anti-corruption case', 'Administrative-overreach review', 'Cross-border evidentiary'][i % 6]!,
      agency: ['National Prosecutor', 'Police Investigation Bureau', 'Anti-Corruption Authority', 'Constitutional Court Liaison'][i % 4]!,
      stage, evidentiaryIntegrity, detaineeRights,
    };
  });

  // 5. Correctional facilities
  const facilityDefs = [
    { facility: 'Capital Central Detention', region: 'Capital District' },
    { facility: 'Northern Correctional Complex', region: 'Northern' },
    { facility: 'Eastern Rehabilitation Centre', region: 'Eastern' },
    { facility: 'Coastal Open Custody', region: 'Coastal' },
    { facility: 'Highland Reform Institute', region: 'Highland' },
  ];
  const corrections: CorrectionalFacility[] = facilityDefs.map((f, i) => {
    const k = `jc:cf:${f.facility}`;
    const occupancyPct = Math.round(wave(`${k}:o`, epoch / 6, 62, 132));
    const rehabilitationProgrammes = 4 + Math.floor(seed(`${k}:rp`) * 14);
    const rightsSafeguardIdx = Math.round(wave(`${k}:rs`, epoch / 8, 58, 94));
    const overRoll = seed(`${k}:ov`);
    const oversightStatus: CorrectionalFacility['oversightStatus'] =
      overRoll > 0.74 ? 'independent-oversight' : overRoll > 0.32 ? 'ministerial-review' : 'no-recent-audit';
    void i;
    return { id: `CF-${i + 1}`, facility: f.facility, region: f.region, occupancyPct, rehabilitationProgrammes, rightsSafeguardIdx, oversightStatus };
  });

  // 6. Rights protection
  const rights: RightsProtection[] = RIGHTS.map(right => {
    const k = `jc:rt:${right}`;
    const monitoringIdx = Math.round(wave(`${k}:m`, epoch / 9, 56, 96));
    const alertsRaised = Math.floor(seed(`${k}:a:${Math.floor(epoch / 6)}`) * 6);
    const proceduralFairnessIdx = Math.round(wave(`${k}:p`, epoch / 8, 58, 94));
    const status: RightsProtection['status'] =
      monitoringIdx < 70 || alertsRaised >= 4 ? 'escalation'
        : monitoringIdx < 84 || alertsRaised >= 2 ? 'watch' : 'preserved';
    return { right, monitoringIdx, alertsRaised, proceduralFairnessIdx, status };
  });

  // 7. Administrative legality
  const administrative: AdministrativeReview[] = REVIEW_MINISTRIES.map(ministry => {
    const k = `jc:ad:${ministry}`;
    const complianceIdx = Math.round(wave(`${k}:c`, epoch / 9, 58, 96));
    const outstandingActions = Math.floor(seed(`${k}:o:${Math.floor(epoch / 7)}`) * 18);
    const auditLineageYears = 3 + Math.floor(seed(`${k}:al`) * 40);
    const executiveAccountabilityIdx = Math.round(wave(`${k}:ea`, epoch / 11, 52, 92));
    return { ministry, complianceIdx, outstandingActions, auditLineageYears, executiveAccountabilityIdx };
  }).sort((a, b) => a.complianceIdx - b.complianceIdx);

  // Incidents
  const incidents: JusticeIncident[] = Array.from({ length: 7 }, (_, i) => {
    const k = `jc:inc:${i}:${Math.floor(epoch / 4)}`;
    const kind = KIND_LIST[Math.floor(seed(`${k}:k`) * KIND_LIST.length)]!;
    const sevRoll = seed(`${k}:sv`);
    const severity: JusticeIncident['severity'] = sevRoll > 0.92 ? 'national' : sevRoll > 0.76 ? 'critical' : sevRoll > 0.5 ? 'elevated' : 'advisory';
    const ageDays = Math.round(wave(`${k}:age`, epoch / 7, 1, 180));
    const cascade = (PROPAGATION[kind] ?? []).map(c => ({
      ...c,
      status: (ageDays * 24 < c.delayHrs ? 'pending' : ageDays * 24 > c.delayHrs * 6 ? 'cleared' : 'engaged') as 'pending' | 'engaged' | 'cleared',
    }));
    const verdictRoll = seed(`${k}:vd`);
    const reviewVerdict: JusticeIncident['reviewVerdict'] =
      verdictRoll > 0.86 ? 'precedent-set' : verdictRoll > 0.6 ? 'ruling-issued' : verdictRoll > 0.32 ? 'review' : 'pending';
    return {
      id: `JCI-${(6000 + Math.floor(seed(`${k}:id`) * 50000))}`,
      kind, severity,
      origin: REVIEW_MINISTRIES[Math.floor(seed(`${k}:or`) * REVIEW_MINISTRIES.length)]!,
      ageDays, ministryCascade: cascade, reviewVerdict,
    };
  }).sort((a, b) => {
    const sev = (s: JusticeIncident['severity']) => s === 'national' ? 3 : s === 'critical' ? 2 : s === 'elevated' ? 1 : 0;
    return sev(b.severity) - sev(a.severity) || b.ageDays - a.ageDays;
  });

  // Forecast — 20 years at 5-year steps
  const horizon = [5, 10, 15, 20];
  const forecast: JusticeForecast = {
    horizonYears: horizon,
    constitutionalIntegrityTrajectory: horizon.map(h => Math.max(0, Math.min(100, Math.round(integrityIdx + wave(`jc:fc:int`, epoch / 6 + h * 0.12, -10, 8))))),
    judicialIndependenceTrajectory: horizon.map(h => Math.max(0, Math.min(100, Math.round(judicialIndependenceIdx + wave(`jc:fc:ji`, epoch / 5 + h * 0.14, -12, 8))))),
    rightsConfidenceTrajectory: horizon.map(h => Math.round(wave(`jc:fc:rc`, epoch / 6 + h * 0.13, 58, 94))),
    caseBacklogProjection: horizon.map(h => Math.round(wave(`jc:fc:bk`, epoch / 4 + h * 0.16, 40, 95))),
    legitimacyTrajectory: Math.round((integrityIdx + judicialIndependenceIdx + separationOfPowersIdx) / 3),
    constitutionalCrisisRisk: Math.min(100, Math.round(articlesUnderReview * 12 + emergencyPowersAsserted * 18 + (100 - integrityIdx) * 0.4)),
  };

  const banner =
    posture === 'breach-watch' ? 'CONSTITUTIONAL BREACH WATCH — chamber convened'
      : posture === 'pressure' ? 'CONSTITUTIONAL ORDER UNDER PRESSURE'
        : posture === 'under-review' ? 'ARTICLE UNDER FORMAL REVIEW'
          : posture === 'engaged' ? 'JUDICIAL CONTINUITY ENGAGED' : 'CONSTITUTIONAL ORDER SOUND';

  const ministries = new Map<string, number>();
  for (const inc of incidents) {
    for (const c of inc.ministryCascade) {
      if (c.status !== 'pending') ministries.set(c.ministry, (ministries.get(c.ministry) ?? 0) + 1);
    }
  }
  const ministriesEngaged = Array.from(ministries.entries())
    .map(([ministry, engaged]) => ({ ministry, engaged }))
    .sort((a, b) => b.engaged - a.engaged);

  return { epoch, review, courts, statutes, dockets, corrections, rights, administrative, incidents, forecast, bannerLine: banner, ministriesEngaged };
}
