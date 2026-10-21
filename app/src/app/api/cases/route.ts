// /api/cases — cases under the nation's procedures (lib/casework/engine.ts,
// design §6.5). GET: the cases the official may read (their institution's,
// or every institution's for officials of the whole government, never a
// court's from outside it), without personal fields but with the parties'
// names of normal cases, so each list is written to the access log as one
// search (query and count). POST: open a case under the procedure version in
// force (the responsible institution's officials). With `channel`, it is an
// applicant's form taken at an office (`assisted`: the identity evidence the
// official saw, never its number) or transcribed from paper (`paper`): the
// form's required answers, declaration and checks apply (submitForm(), the
// same rules and messages as the form in the browser), and a refusal names
// the answers it concerns (`fieldErrors`). The answer carries the receipt.
import { NextRequest, NextResponse } from 'next/server';
import { caseReadRefusal } from '@/lib/auth/roles';
import { caseScope } from '@/lib/auth/official';
import { listCases, submitForm, caseFacts } from '@/lib/casework/engine';
import { listView } from '@/lib/casework/view';
import { routeActor } from '@/lib/casework/actor';
import { recordSearch } from '@/lib/records/access-search';
import { receiptOf } from '@/lib/forms/receipt';
import '@/lib/casework/modules';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams;
  const s = await caseScope();
  const open = q.get('open');
  const cases = listCases({ owner: q.get('owner') ?? undefined, procedure: q.get('procedure') ?? undefined, stage: q.get('stage') ?? undefined, open: open === null ? undefined : open !== 'false', limit: Number(q.get('limit')) || undefined })
    .filter(c => !s || !caseReadRefusal(s, { ...caseFacts(c), sensitivity: 'normal' }));
  // The list carries the parties' names of normal cases: one search entry, the query and how many it returned.
  if (s) recordSearch(s, 'cases', q.toString() || '(all)', cases.length, 'case rules (caseReadRefusal)');
  return NextResponse.json({ cases: cases.map(listView) });
}

const str = (v: unknown, max = 120) => (typeof v === 'string' ? v.trim().slice(0, max) : '');

export async function POST(req: NextRequest) {
  const b = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const actor = await routeActor(b.by);
  const channel = b.channel === 'assisted' || b.channel === 'paper' ? b.channel : undefined;
  if (b.channel !== undefined && !channel) return NextResponse.json({ error: 'An official records an application as assisted or paper; self-service applications are sent by the applicant' }, { status: 422 });
  const decl = b.declaration as { version?: unknown } | undefined;
  const assisted = b.assisted as { servicePoint?: unknown; identityEvidence?: unknown } | undefined;
  const paper = b.paper as { receivedOn?: unknown } | undefined;
  const r = await submitForm({
    procedure: String(b.procedure ?? ''), fields: (b.fields ?? {}) as Record<string, unknown>,
    subject: Array.isArray(b.subject) ? (b.subject as never) : [], ...(b.applicant ? { applicant: b.applicant as never } : {}),
    priority: (['routine', 'priority', 'urgent'].includes(String(b.priority)) ? b.priority : 'routine') as never,
    ...(typeof b.idempotencyKey === 'string' ? { idempotencyKey: b.idempotencyKey.slice(0, 100) } : {}),
    ...(channel ? { channel } : {}),
    ...(decl && typeof decl.version === 'string' ? { declaration: { version: decl.version.slice(0, 20) } } : {}),
    ...(channel === 'assisted' ? { assisted: { identityEvidence: str(assisted?.identityEvidence), ...(str(assisted?.servicePoint) ? { servicePoint: str(assisted?.servicePoint) } : {}) } } : {}),
    ...(channel === 'paper' ? { paper: { ...(str(paper?.receivedOn, 10) ? { receivedOn: str(paper?.receivedOn, 10) } : {}) } } : {}),
    ...(typeof b.locale === 'string' ? { locale: b.locale.slice(0, 3) } : {}),
  }, actor);
  if ('error' in r) return NextResponse.json(r, { status: 422 });
  return NextResponse.json({ case: r, receipt: receiptOf(r) }, { status: 201 });
}
