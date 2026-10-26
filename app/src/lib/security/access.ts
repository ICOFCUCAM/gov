// Reading the security registers (plan step I12; catalogue Part 11 §3.3, §4.2,
// §5.3, §6): every read goes through securityAccessRefusal() in
// lib/auth/roles.ts and is written to the access log, allowed or refused,
// with the purpose and the rule. Three views:
//
//   full        the keeping institution's officials who need to know the
//               record (named for it or assigned to its case), with a purpose,
//               and for a marked record a clearance at its level or above,
//               valid today; or an oversight body under an approved audit or
//               request-information relationship covering `security` records
//               for the stated purpose. A clearance alone grants nothing.
//   recipient   a restricted recipient the keeping institution named: the
//               summary, the status and the coordination terms of its kind,
//               never exploitable detail (a vulnerability's technical detail,
//               a dependency's failure scenarios, a plan's recovery
//               procedures); a site only as viewFacility() generalises it.
//   public      nothing but what the officials decided to publish: a
//               vulnerability's public summary once its disclosure date has
//               come and the disclosure step was taken. No map, no dependency,
//               no risk and no designation list is public (§6 "not a public
//               map of exploitable vulnerabilities").

import { recordAccess } from '@/lib/records/access-log';
import { accessBy } from '@/lib/records/access-by';
import { securityAccessRefusal, relationshipRule, readRelationship, roleOf, type CaseScope } from '@/lib/auth/roles';
import { getFacility, viewFacility } from '@/lib/data/facilities';
import { rankOf, markingLabel } from './classification';
import { securityRecordRaw, securityRecordsRaw, clearanceOf, listingOf, effectiveStatus, KIND_LABEL, KIND_REGISTER, SECURITY_REGISTER, type SecurityKind, type SecurityRecord, type SecurityListing, type TermValue } from './register';

/** The terms a recipient sees, by kind: coordination, never exploitable detail. */
export const RECIPIENT_TERMS: Record<SecurityKind, string[]> = {
  incident: ['incidentCategory', 'affectedServices', 'severity', 'coordinationActions', 'notifications', 'serviceStatus'],
  vulnerability: ['affectedProduct', 'severity', 'remediationActions', 'remediationDue', 'attestation'],
  supplier: ['supplierOutcome', 'correctiveActions'],
  exception: ['control', 'compensatingControls'],
  exercise: ['exerciseScope', 'participants', 'findingsOwners'],
  designation: ['sector', 'service', 'operator'],
  dependency: ['service', 'upstream', 'downstream'],
  risk: [],
  plan: ['essentialServices', 'exerciseSchedule'],
  clearance: [],
};

type Viewer = (CaseScope & { label?: string }) | null;
const activeNeedToKnow = (r: SecurityRecord) => r.needToKnow.filter(x => !x.withdrawn).map(x => x.id);
const factsOf = (r: SecurityRecord) => ({ owner: r.owner, rank: rankOf(r.marking), needToKnow: activeNeedToKnow(r), recipients: r.recipients.map(x => x.institution) });
const clearanceRank = (s: Viewer, now: Date) => { const c = clearanceOf(s?.id, now); return c ? { rank: rankOf(c.level) } : null; };

export interface RecipientView { number: string; kind: SecurityKind; kindLabel: string; register: string; owner: string; status: string; marking: string; summary: string; terms: Record<string, TermValue>; disclosureDate?: string; validUntil?: string; site?: { region?: string; generalised: boolean } }

function recipientView(r: SecurityRecord, now: Date): RecipientView {
  const terms = Object.fromEntries(Object.entries(r.terms).filter(([k]) => RECIPIENT_TERMS[r.kind].includes(k)));
  const f = typeof r.terms.facility === 'string' && r.terms.facility ? getFacility(r.terms.facility) : undefined;
  // A designated site reaches a recipient only generalised (no position, outline or district).
  const site = f ? (() => { const v = viewFacility(f, { signedIn: true, institution: 'restricted-recipient' }); return { ...(v.place?.region ? { region: v.place.region } : {}), generalised: true }; })() : undefined;
  return { number: r.number, kind: r.kind, kindLabel: KIND_LABEL[r.kind], register: KIND_REGISTER[r.kind], owner: r.owner, status: effectiveStatus(r, now), marking: markingLabel(r.marking), summary: r.summary, terms,
    ...(r.disclosure?.date ? { disclosureDate: r.disclosure.date } : {}), ...(r.validUntil ? { validUntil: r.validUntil } : {}), ...(site ? { site } : {}) };
}

/**
 * Read one security record in the view asked for: refused unless every
 * dimension of the access rule holds; the attempt is logged either way.
 */
export function readSecurityRecord(number: string, s: Viewer, input: { purpose?: string; view?: 'full' | 'recipient'; action?: 'read' | 'export' }, now = new Date()): { record: SecurityRecord | RecipientView; view: 'full' | 'recipient' } | { error: string; status: number } {
  const r = securityRecordRaw(number);
  if (!r) return { error: 'No such security record', status: 404 };
  const view = input.view === 'recipient' ? 'recipient' : 'full';
  const action = input.action === 'export' ? 'export' : 'read';
  const purpose = input.purpose?.trim().slice(0, 500) || undefined;
  const why = securityAccessRefusal(s, factsOf(r), { action, view, purpose, clearance: clearanceRank(s, now) });
  const grant = s && view === 'full' && s.institution !== r.owner ? readRelationship(s, r.owner, ['security'], purpose) : null;
  if (s) recordAccess({ ...accessBy({ ...(s.id ? { id: s.id } : {}), label: s.label ?? s.id ?? 'Official', ...(s.institution ? { institution: s.institution } : {}) }, now),
    record: { register: SECURITY_REGISTER, id: r.number }, action: why ? 'refused' : action === 'export' ? 'export' : 'view', ...(purpose ? { purpose } : {}), result: why ? 'refused' : 'allowed',
    rule: why ?? (grant ? relationshipRule(grant) : `${view === 'full' ? 'Need to know, purpose' : 'Restricted recipient, purpose'}${r.marking ? ', clearance at the marking' : ''}`) }, now);
  if (why) return { error: why, status: s ? 403 : 401 };
  return { record: view === 'full' ? r : recipientView(r, now), view };
}

/**
 * The records an official may see listed: their own institution's records and
 * those shared with it, in the listing view (no terms). The summary of a
 * marked record shows only to a named official with a clearance at its level.
 */
export function listSecurity(s: Viewer, filter: { kind?: SecurityKind } = {}, now = new Date()): SecurityListing[] {
  if (!s?.institution || roleOf(s) === 'administrator') return [];
  const mine = s.institution;
  const clearance = clearanceRank(s, now);
  return securityRecordsRaw(filter).filter(r => r.owner === mine || r.recipients.some(x => x.institution === mine)).map(r => {
    const rank = rankOf(r.marking);
    const named = !!s.id && activeNeedToKnow(r).includes(s.id);
    const show = rank === 0 ? true : named && !!clearance && clearance.rank >= rank;
    return listingOf(r, show, now);
  });
}

/** What the public may see: vulnerability summaries the officials published once their disclosure date came. Nothing else. */
export function publicSecurityView(now = new Date()): { advisories: { number: string; summary: string; published: string }[] } {
  const day = now.toISOString().slice(0, 10);
  return {
    advisories: securityRecordsRaw({ kind: 'vulnerability' })
      .filter(r => !r.sample && r.disclosure?.published && r.disclosure.publicSummary && r.disclosure.date <= day)
      .map(r => ({ number: r.number, summary: r.disclosure!.publicSummary!, published: r.disclosure!.published! })),
  };
}
