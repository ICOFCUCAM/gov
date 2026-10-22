// Reference indicator definitions (plan step I3): shipped in every mode as
// unapproved drafts, like reference procedures. Each names what it counts, its
// denominator where it has one, its period, how coverage is decided, its
// method and version, its disclosure rule and the domain's qualifications
// (spec Part 1 §3.6, §5.6, §6.4; Part 2 C.1, F; Part 3 A.1, A.4, F; forms
// catalogue part 13 §8.2). No target value is typed: a target is the nation's
// policy, set elsewhere if at all. Nothing here is approved by shipping; an
// institution approves a version through two of its officials.

import type { IndicatorOwner, IndicatorTerms } from './types';
import { getMethod } from './methods';

type Ref = { id: string; owner: IndicatorOwner; terms: Omit<IndicatorTerms, 'coverage' | 'period'> };

const CASE_LIMITS = [
  'Counts cases kept in the platform under approved procedures only: work done on paper or in another system is not counted until it is loaded (case import or a connected case system).',
  'A case is counted under the institution that owns it; a referral opens a new case at the receiving institution.',
];
const WORKLOAD = { kind: 'not-personal' as const, reason: 'a count of the institution\'s own case work; no attribute of any person is published' };
const each = { each: 'institution' as const };

const cases = (id: string, method: string, title: string, definition: string, unit: string, numerator: string, denominator: string | undefined, qualifications: string[], intendedUse: string): Ref => ({
  id, owner: each,
  terms: {
    title, definition, intendedUse, domain: 'Case work', unit, numerator, ...(denominator ? { denominator } : {}),
    method: { id: method, version: 1 }, disclosure: WORKLOAD, qualifications, limitations: CASE_LIMITS,
    source: { registerId: 'case-work', recordType: 'case' },
  },
});

const family = (id: string, slot: IndicatorOwner, fam: string, method: string, domain: string, title: string, definition: string, unit: string, numerator: string, denominator: string | undefined, qualifications: string[], recordType: string): Ref => ({
  id, owner: slot,
  terms: {
    title, definition, intendedUse: 'Operational monitoring of the institution\'s own processing; not a measure of the outcome in society', domain, unit, numerator,
    ...(denominator ? { denominator } : {}), method: { id: method, version: 1, params: { family: fam } }, disclosure: WORKLOAD, qualifications, limitations: CASE_LIMITS,
    source: { registerId: 'case-work', recordType },
  },
});

const CIVIL_QUAL = [
  'A count of events registered, not of events that occurred: completeness of registration needs an independent estimate of births or deaths, which this is not.',
  'Corrections and revocations of registrations are not subtracted.',
];
const civil = (kind: 'birth' | 'death' | 'marriage', plural: string): Ref => ({
  id: `civil.${plural}_registered`, owner: { slot: 'civilRegistration' },
  terms: {
    title: `${plural[0]!.toUpperCase()}${plural.slice(1)} registered`, definition: `${plural[0]!.toUpperCase()}${plural.slice(1)} entered in the civil register in the period (by registration date), by region`,
    intendedUse: 'Workload and registration activity of the civil registration authority', domain: 'Civil registration', unit: '{events}',
    numerator: `${kind} events registered in the period`, method: { id: 'civil.registered', version: 1, params: { kind } },
    disclosure: { kind: 'small-cells' }, qualifications: CIVIL_QUAL,
    limitations: ['An event with no region recorded is counted nationally only.', 'Regions with no event ever registered are missing, never zero.'],
    source: { registerId: 'civil-register', recordType: 'vital_event' },
  },
});

export const REFERENCE_DEFINITIONS: Ref[] = [
  cases('casework.cases_opened', 'cases.opened', 'Cases opened', 'Cases opened at the institution under its approved procedures in the period', '{cases}', 'cases opened in the period', undefined,
    ['A case opened is an application or report received, not a need or an entitlement established.'], 'Incoming workload of the institution'),
  cases('casework.cases_decided', 'cases.decided', 'Cases decided', 'Cases whose first decision was made in the period', '{cases}', 'cases with their first decision in the period', undefined,
    ['A high number of decisions is not by itself a measure of quality or fairness.'], 'Throughput of the institution'),
  cases('casework.backlog', 'cases.open_at_end', 'Open cases at the end of the period', 'Cases open (not closed) at the end of the period', '{cases}', 'cases opened before the end of the period and not closed by then', undefined,
    ['Open is not overdue: a case may be open within its deadlines or waiting on the applicant.'], 'Work in hand'),
  cases('casework.past_deadline', 'cases.open_past_deadline', 'Open cases past a deadline', 'Open cases at the end of the period with a procedure deadline passed and not met', '{cases}', 'open cases with a passed deadline', undefined,
    ['An overdue case is not evidence of poor performance where its deadline was formally suspended under an approved rule; the platform does not yet record suspensions.'], 'Cases needing attention'),
  cases('casework.days_to_decision', 'cases.days_to_decision', 'Days to decision (median)', 'Median days from a case\'s opening to its first decision, for cases decided in the period', 'd', 'days from opening to first decision, per case decided in the period (median)', 'cases decided in the period',
    ['Complexity and lawful waiting time (requests for information, appeals) differ by procedure: compare a procedure with itself over time, not institutions with each other.'], 'Processing time'),
  cases('casework.decided_on_time', 'cases.decided_on_time', 'Decided before a deadline passed', 'Share of cases decided in the period whose decision came before any procedure deadline passed', '%', 'cases decided in the period with no deadline passed before the decision', 'cases decided in the period',
    ['Deadlines are those of the approved procedure version; a deadline suspended under an approved rule is not yet recorded and would count as passed.'], 'Timeliness'),
  cases('casework.decisions_citing_law', 'decisions.citing_law', 'Decisions citing a law version', 'Share of cases decided in the period whose decision cites a version of law from the laws register', '%', 'cases decided in the period whose decision step cites a law version', 'cases decided in the period',
    ['A citation shows the legal basis was named, not that the decision was lawful.'], 'Legal grounding of decisions (spec Part 1 §3.6, §5.6)'),
  cases('casework.referrals_unresolved', 'referrals.unresolved', 'Unresolved referrals received', 'Referrals from other institutions still open at the institution at the end of the period', '{cases}', 'open cases opened as a referral from another institution', undefined,
    ['A referral is a request between institutions, never an order; an open referral may be waiting lawfully.'], 'Cross-institution coordination (spec Part 1 §3.6)'),
  family('police.incident_backlog', { slot: 'police' }, 'police.', 'cases.open_at_end', 'Police', 'Incident reports not yet referred or closed', 'Incident reports open at the end of the period', '{cases}', 'incident report cases open at the end of the period', undefined,
    ['An incident report is a report received, never a proven offence.', 'Incident classifications are those of the approved procedure and the law it cites.'], 'incident_report'),
  family('police.days_to_first_decision', { slot: 'police' }, 'police.', 'cases.days_to_decision', 'Police', 'Days from report to first decision (median)', 'Median days from receiving an incident report (the clock starts when the case is opened) to its first decision (classification or referral; the clock stops at that step)', 'd', 'days from opening to first decision (median)', 'incident reports with a first decision in the period',
    ['Clock rule: starts at the case opening, stops at the first decision step; not a response time on the ground.'], 'incident_report'),
  family('courts.filings_received', { slot: 'judiciary' }, 'court.', 'cases.opened', 'Courts', 'Filings received', 'Cases filed with the courts in the period', '{cases}', 'court cases opened in the period', undefined,
    ['Case categories and procedural stages are those of the approved court procedure; exclusions are none unless the judiciary approves a version that names them.', 'Published only when the judiciary approves the definition (an independent institution controls its own records).'], 'court_case'),
  family('courts.backlog', { slot: 'judiciary' }, 'court.', 'cases.open_at_end', 'Courts', 'Cases pending before the courts', 'Court cases open at the end of the period (backlog, explicitly: every open case, whatever its stage)', '{cases}', 'court cases open at the end of the period', undefined,
    ['A pending case is not a delayed case: complexity, procedural fairness and jurisdiction matter; this figure must not encourage hurried decisions.'], 'court_case'),
  family('customs.days_to_decision', { slot: 'customs' }, 'customs.', 'cases.days_to_decision', 'Customs', 'Days from declaration to first decision (median)', 'Median days from lodging a goods declaration to its first decision', 'd', 'days from lodging to first decision (median)', 'declarations with a first decision in the period',
    ['Release after all prerequisites of other agencies is not yet recorded separately.'], 'goods_declaration'),
  family('immigration.days_to_decision', { slot: 'immigration' }, 'immigration.', 'cases.days_to_decision', 'Immigration', 'Days to decision on applications (median)', 'Median days from an immigration application to its first decision', 'd', 'days from application to first decision (median)', 'applications with a first decision in the period',
    ['Comparisons must account for the case category (procedure) and the reporting period.'], 'immigration_application'),
  civil('birth', 'births'), civil('death', 'deaths'), civil('marriage', 'marriages'),
  { id: 'organisations.in_good_standing', owner: { slot: 'businessRegister' }, terms: {
    title: 'Organisations in good standing', definition: 'Organisations holding a granted standing in a register (registration, licence or accreditation) at the end of the period, by region',
    intendedUse: 'Size of the organisations register', domain: 'Business registration', unit: '{organisations}', numerator: 'organisations with a granted standing at the end of the period',
    method: { id: 'organisations.in_standing', version: 1 }, disclosure: { kind: 'not-personal', reason: 'the organisations register is public (its public check shows each standing)' },
    qualifications: ['A registered organisation is not an operating one: operation is not verified by registration.'],
    limitations: ['The region is the organisation\'s current one.', 'Reads up to 2000 organisations.'],
    source: { registerId: 'organisations-register', recordType: 'organisation' },
  } },
];

/** A reference definition's full terms (period and coverage from its method). */
export function referenceTerms(r: Ref): IndicatorTerms {
  const m = getMethod(r.terms.method.id, r.terms.method.version);
  return { ...r.terms, period: 'month', coverage: m?.coverage ?? 'Method not found' };
}
