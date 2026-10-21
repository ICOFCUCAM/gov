// /api/cases/[id] — one case (lib/casework/engine.ts). GET: the case with its
// fields, documents, decisions and history, for those the case rules let
// read it; reads of restricted and secret cases (and refusals) are written to
// the access log, with the purpose (?purpose=). POST: a step on the case:
// act (an action of its procedure; four-eyes where it says), assign, attach a
// document, hold or release, refer to another institution, or withdraw a
// proposal waiting for its second official.
import { NextRequest, NextResponse } from 'next/server';
import { caseReadRefusal, caseRecordTypes, readRelationship, relationshipRule } from '@/lib/auth/roles';
import { caseScope } from '@/lib/auth/official';
import { getCase, act, assign, attach, hold, release, refer, cancelPending, caseFacts } from '@/lib/casework/engine';
import { hearingsOf } from '@/lib/courts/hearings';
import { getPackage } from '@/lib/casework/packages';
import { routeActor } from '@/lib/casework/actor';
import { recordAccess } from '@/lib/records/access-log';
import { getDocument } from '@/lib/records/documents';
import { getDecision } from '@/lib/records/decisions';
import { certificatesFor } from '@/lib/records/certificates';
import '@/lib/casework/modules';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest, props: { params: Promise<{ id: string }> }) {
  const { id } = await props.params;
  const c = getCase(id);
  if (!c) return NextResponse.json({ error: 'No such case' }, { status: 404 });
  const s = await caseScope();
  const purpose = req.nextUrl.searchParams.get('purpose') ?? undefined;
  if (s) {
    const facts = caseFacts(c);
    const why = caseReadRefusal(s, facts, purpose);
    // A read under an approved audit or request-information relationship is always logged, naming it (plan phase 3).
    const grant = !why && s.institution !== c.owner ? readRelationship(s, c.owner, caseRecordTypes(facts), purpose) : null;
    const rule = why ?? (grant ? relationshipRule(grant) : undefined);
    if (c.sensitivity !== 'normal' || why || grant) recordAccess({ by: { id: s.id, name: s.label, ...(s.institution ? { institution: s.institution } : {}) }, record: { register: 'cases', id: c.ref }, action: why ? 'refused' : 'view', ...(purpose ? { purpose } : {}), result: why ? 'refused' : 'allowed', ...(rule ? { rule } : {}) });
    if (why) return NextResponse.json({ error: why }, { status: 403 });
  }
  return NextResponse.json({
    case: c, procedure: getPackage(c.package.key, c.package.version),
    documents: c.documents.map(getDocument).filter(Boolean),
    decisions: c.decisions.map(getDecision).filter(Boolean),
    certificates: certificatesFor(c.decisions),
    hearings: hearingsOf(c.id),
  });
}

export async function POST(req: NextRequest, props: { params: Promise<{ id: string }> }) {
  const { id } = await props.params;
  const b = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const actor = await routeActor(b.by);
  const str = (v: unknown) => (typeof v === 'string' ? v : '');
  let r: unknown;
  switch (b.op) {
    case 'act': r = await act(id, { action: str(b.action), fields: (b.fields ?? undefined) as Record<string, unknown> | undefined, reason: str(b.reason) || undefined, citations: Array.isArray(b.citations) ? (b.citations as never) : undefined, expectedVersion: typeof b.expectedVersion === 'number' ? b.expectedVersion : undefined, idempotencyKey: str(b.idempotencyKey) || undefined }, actor); break;
    case 'assign': r = assign(id, { id: str(b.assigneeId), name: str(b.assigneeName) || str(b.assigneeId) }, actor); break;
    case 'attach': r = attach(id, str(b.document), actor); break;
    case 'hold': r = hold(id, str(b.reason), actor); break;
    case 'release': r = release(id, actor); break;
    case 'refer': r = refer(id, { procedure: str(b.procedure), fields: (b.fields ?? undefined) as Record<string, unknown> | undefined, reason: str(b.reason) }, actor); break;
    case 'cancel': r = cancelPending(id, actor, str(b.reason)); break;
    default: return NextResponse.json({ error: 'op must be act, assign, attach, hold, release, refer or cancel' }, { status: 422 });
  }
  if (r && typeof r === 'object' && 'error' in r) return NextResponse.json(r, { status: (r as { error: string }).error === 'No such case' ? 404 : 422 });
  return NextResponse.json(r);
}
