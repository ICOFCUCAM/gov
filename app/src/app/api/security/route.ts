// /api/security — security governance and resilience (plan step I12;
// lib/security). Metadata only: no classified content, no intelligence
// register, source, target or attribution, no score about a person.
// Cyber incidents, vulnerabilities, supplier assessments, exceptions,
// exercises, critical infrastructure records and clearances move only through
// /api/cases under their own approved procedures; this route carries what
// sits around them.
//
// GET: the bodies the nation named (cyberAuthority, criticalInfrastructure,
// securityAccreditation, nationalSecurity; each empty by default), where the
// classification scheme and the installation's accreditation stand, the
// procedures and their state, counts (no content), and for the signed-in
// official the records they may see listed (listing view: no terms), the
// security directives of their institution as issuer or recipient, and its
// cross-domain transfer records.
//   ?record=<number>&purpose=…&view=full|recipient  one record, read under the
//       access rule (need to know, purpose, action, clearance for a marked
//       record); every attempt in the access log.
//   ?view=public  what the officials published: vulnerability summaries on or
//       after their disclosure date. Nothing else is public.
//
// POST (signed-in officials; checked again in lib/security against the record):
//   { op: 'propose-classification', scheme?, accreditation?, legalBasis: [{ instrument, eId }] }  (an administrator)
//   { op: 'confirm-classification' } (a different official) · { op: 'withdraw-classification', reason }
//   { op: 'need-to-know', record, grant: true|false, official: { id, name }, reason }  (one who can sign at the keeping institution; logged)
//   { op: 'directive-draft', … } · { op: 'directive-amend', ref, … } · { op: 'directive-issue', ref } (a different signatory)
//   { op: 'directive-end', ref, reason } · { op: 'directive-acknowledge', ref } · { op: 'directive-compliance', ref, state, note }
//   { op: 'transfer-record', … } · { op: 'transfer-decide', ref, outcome, reason } (a different signatory) · { op: 'transfer-receipt', ref, reference }
//   { op: 'disclosure', procedure, fields, identity, materialMarking?, materialReference? }  protected intake (lib/oversight)
import { NextRequest, NextResponse } from 'next/server';
import { caseScope, refusal } from '@/lib/auth/official';
import { adminOnly } from '@/lib/auth/roles';
import { routeActor } from '@/lib/casework/actor';
import { listPackages } from '@/lib/casework/packages';
import { dualControlPolicy } from '@/lib/casework/dual-control-policy';
import { authorityFor, getMinistry } from '@/lib/data/store';
import { AUTHORITIES, type AuthorityKey } from '@/lib/nation/deployment';
import { classificationStatus, securityClassificationChanges, proposeSecurityClassification, confirmSecurityClassification, withdrawSecurityClassification } from '@/lib/security/classification';
import { needToKnowGrant, securityCounts, KIND_LABEL, KIND_REGISTER } from '@/lib/security/register';
import { readSecurityRecord, listSecurity, publicSecurityView } from '@/lib/security/access';
import { SECURITY_PROCEDURES, SECURITY_SLOT_OF } from '@/lib/security/procedures';
import { draftSecurityDirective, amendSecurityDirective, issueSecurityDirective, endSecurityDirective, acknowledgeSecurityDirective, reportCompliance, listSecurityDirectives, securityDirectiveCounts, DIRECTIVE_KINDS, COMPLIANCE_STATES } from '@/lib/security/directives';
import { recordTransfer, decideTransfer, recordReceipt, listTransfers, transferCounts, TRANSFER_OUTCOMES } from '@/lib/security/transfers';
import { receiveSecurityDisclosure, SECURITY_DISCLOSURE_PROCEDURES } from '@/lib/security/disclosures';
import '@/lib/casework/modules';

export const dynamic = 'force-dynamic';

const SLOTS: AuthorityKey[] = ['cyberAuthority', 'criticalInfrastructure', 'securityAccreditation', 'nationalSecurity'];
const bodies = () => SLOTS.map(slot => {
  const id = authorityFor(slot);
  return { slot, label: AUTHORITIES.find(a => a.key === slot)?.label ?? slot, institution: id ?? null, name: id ? getMinistry(id)?.name ?? id : null };
});
const procedures = () => SECURITY_PROCEDURES.map(p => {
  const versions = listPackages({ key: p.key });
  return { key: p.key, title: p.title, slot: SECURITY_SLOT_OF[p.key], state: versions.some(v => v.state === 'approved') ? 'approved' : versions.length ? 'draft' : 'not installed' };
});
const labels = { kinds: KIND_LABEL, registers: KIND_REGISTER, directiveKinds: DIRECTIVE_KINDS, compliance: COMPLIANCE_STATES, transferOutcomes: TRANSFER_OUTCOMES, disclosureProcedures: SECURITY_DISCLOSURE_PROCEDURES };

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams;
  if (q.get('view') === 'public') return NextResponse.json(publicSecurityView());
  const s = await caseScope();
  const number = q.get('record')?.trim();
  if (number) {
    const r = readSecurityRecord(number, s, { purpose: q.get('purpose') ?? undefined, view: q.get('view') === 'recipient' ? 'recipient' : 'full', action: q.get('action') === 'export' ? 'export' : 'read' });
    return 'error' in r ? NextResponse.json({ error: r.error }, { status: r.status }) : NextResponse.json(r);
  }
  return NextResponse.json({
    bodies: bodies(), classification: classificationStatus(), classificationChanges: securityClassificationChanges(), procedures: procedures(),
    counts: { ...securityCounts(), directives: securityDirectiveCounts(), transfers: transferCounts() },
    records: listSecurity(s), directives: listSecurityDirectives(s), transfers: listTransfers(s), labels,
    names: Object.fromEntries(bodies().filter(b => b.institution).map(b => [b.institution!, b.name ?? b.institution!])),
  });
}

export async function POST(req: NextRequest) {
  const b = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const s = await caseScope();
  const str = (v: unknown, max = 200) => (typeof v === 'string' ? v.trim().slice(0, max) : '');
  const done = <T,>(r: T | { error: string }, status = 200) => (r && typeof r === 'object' && 'error' in r
    ? NextResponse.json(r, { status: /^(Sign in|Only|Need to know|Administrators|Auditors|Security directives are|Issuing|A release|This record|Your institution)|only by|who can sign/.test((r as { error: string }).error) ? 403 : 422 })
    : NextResponse.json({ result: r }, { status }));
  const op = str(b.op, 40);
  if (op.endsWith('-classification')) {
    // The country's rule set: an administrator proposes, a different official confirms (lib/law/policy-change.ts).
    if (op === 'propose-classification') { const no = await refusal(adminOnly, { register: 'security', id: 'classification' }); if (no) return no; }
    const actor = await routeActor(b.by);
    const who = { name: actor.name, ...(actor.id ? { id: actor.id } : {}) };
    const dc = dualControlPolicy();
    const r = op === 'propose-classification' ? proposeSecurityClassification({ ...(b.scheme !== undefined ? { scheme: b.scheme } : {}), ...(b.accreditation !== undefined ? { accreditation: b.accreditation } : {}) }, b.legalBasis, who, new Date(), dc.pendingHours)
      : op === 'confirm-classification' ? confirmSecurityClassification(who, new Date(), dc.requireIdentityBinding)
      : op === 'withdraw-classification' ? withdrawSecurityClassification(actor.name, str(b.reason, 500) || undefined)
      : { error: 'op is propose-classification, confirm-classification or withdraw-classification' };
    if ('error' in r && r.error) return NextResponse.json({ error: r.error }, { status: 422 });
    return NextResponse.json({ result: r, classification: classificationStatus(), classificationChanges: securityClassificationChanges() });
  }
  switch (op) {
    case 'need-to-know': return done(needToKnowGrant(str(b.record, 40), { op: b.grant === false ? 'withdraw' : 'grant', official: (b.official ?? {}) as never, reason: b.reason }, s));
    case 'directive-draft': return done(draftSecurityDirective(b, s), 201);
    case 'directive-amend': return done(amendSecurityDirective(str(b.ref, 40), b, s));
    case 'directive-issue': return done(issueSecurityDirective(str(b.ref, 40), s));
    case 'directive-end': return done(endSecurityDirective(str(b.ref, 40), b.reason, s));
    case 'directive-acknowledge': return done(acknowledgeSecurityDirective(str(b.ref, 40), s));
    case 'directive-compliance': return done(reportCompliance(str(b.ref, 40), b as never, s));
    case 'transfer-record': return done(recordTransfer(b, s), 201);
    case 'transfer-decide': return done(decideTransfer(str(b.ref, 40), b as never, s));
    case 'transfer-receipt': return done(recordReceipt(str(b.ref, 40), b as never, s));
    case 'disclosure': {
      const actor = await routeActor(b.by);
      const r = receiveSecurityDisclosure({ procedure: str(b.procedure, 80), fields: (b.fields ?? {}) as Record<string, unknown>, identity: (b.identity ?? {}) as never, materialMarking: b.materialMarking, materialReference: b.materialReference }, actor);
      return 'error' in r ? NextResponse.json(r, { status: 422 }) : NextResponse.json({ case: { id: r.case.id, ref: r.case.ref, stage: r.case.stage }, identity: r.identity }, { status: 201 });
    }
    default: return NextResponse.json({ error: 'op is propose-classification, confirm-classification, withdraw-classification, need-to-know, directive-draft, directive-amend, directive-issue, directive-end, directive-acknowledge, directive-compliance, transfer-record, transfer-decide, transfer-receipt or disclosure' }, { status: 400 });
  }
}
