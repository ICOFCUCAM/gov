// /api/citizen/applications — a citizen's own applications (design §8.4,
// §10.1). The route checks the citizen itself (SELF_AUTHENTICATED): signed in
// through the nation's identity service, or the demo citizen in training and
// demonstration installations. GET: the cases they applied for, with stage
// and decisions only, and the forms of the procedures citizens may start (as
// they render, in the language asked for with ?locale=; the procedure version
// in force, or "not connected" when none is approved). POST: notify a birth
// or report an incident to the police (civil.birth, civil.late-birth,
// police.incident), opened as a citizen case under the procedure in force.
// Under a procedure with a form (lib/forms/contract.ts) it is a self-service
// submission: the form's required answers, declaration and checks apply
// (submitForm(), the same rules and messages as the form in the browser), a
// refusal names the answers it concerns (`fieldErrors`), and the answer
// carries the receipt. Officials of the responsible authority take it from there.
import { NextRequest, NextResponse } from 'next/server';
import { currentCitizen } from '@/lib/auth/citizen';
import { submitForm, listCases } from '@/lib/casework/engine';
import { activePackage, getPackage } from '@/lib/casework/packages';
import { certificatesFor } from '@/lib/records/certificates';
import { formView } from '@/lib/forms/server';
import { receiptOf } from '@/lib/forms/receipt';
import '@/lib/casework/modules';

export const dynamic = 'force-dynamic';

const CITIZEN_PROCEDURES = ['civil.birth', 'civil.late-birth', 'police.incident'];

export async function GET(req: NextRequest) {
  const c = await currentCitizen();
  if (!c) return NextResponse.json({ error: 'Sign in first' }, { status: 401 });
  const mine = listCases({ limit: 1000 }).filter(x => x.source === 'citizen' && x.applicant?.id === c.sub);
  const locale = req.nextUrl.searchParams.get('locale') ?? undefined;
  return NextResponse.json({
    applications: mine.map(x => {
      const p = getPackage(x.package.key, x.package.version);
      return { id: x.id, ref: x.ref, procedure: p?.title ?? x.package.key, stage: p?.stages.find(s => s.key === x.stage)?.label ?? x.stage, openedAt: x.openedAt, closedAt: x.closedAt ?? null, certificates: certificatesFor(x.decisions).map(ce => ({ code: ce.code, title: ce.title, status: ce.status })) };
    }),
    procedures: CITIZEN_PROCEDURES,
    // Each procedure's form in force: a form view, or null (no approved version: "not connected").
    forms: Object.fromEntries(CITIZEN_PROCEDURES.map(k => { const p = activePackage(k); return [k, p ? formView(p, locale) : null]; })),
  });
}

export async function POST(req: NextRequest) {
  const c = await currentCitizen();
  if (!c) return NextResponse.json({ error: 'Sign in first' }, { status: 401 });
  const b = (await req.json().catch(() => ({}))) as { procedure?: string; fields?: Record<string, unknown>; idempotencyKey?: string; declaration?: { version?: unknown }; locale?: unknown };
  if (!CITIZEN_PROCEDURES.includes(String(b.procedure))) return NextResponse.json({ error: `Citizens may start: ${CITIZEN_PROCEDURES.join(', ')}` }, { status: 422 });
  const pkg = activePackage(String(b.procedure));
  const r = await submitForm({
    procedure: String(b.procedure), fields: b.fields ?? {}, source: 'citizen', applicant: { kind: 'person', id: c.sub, name: c.name },
    // A procedure with a form is a self-service submission (its required answers and declaration apply); one without keeps the earlier behaviour.
    ...(pkg?.form ? { channel: 'self-service' as const } : {}),
    ...(typeof b.declaration?.version === 'string' ? { declaration: { version: b.declaration.version.slice(0, 20) } } : {}),
    ...(typeof b.locale === 'string' ? { locale: b.locale.slice(0, 3) } : {}),
    ...(typeof b.idempotencyKey === 'string' ? { idempotencyKey: `citizen:${c.sub}:${b.idempotencyKey.slice(0, 80)}` } : {}),
  }, { id: `citizen:${c.sub}`, name: c.demo ? 'Demo citizen' : `Citizen (${c.name})`, scope: null });
  if ('error' in r) return NextResponse.json(r, { status: 422 });
  return NextResponse.json({ application: { id: r.id, ref: r.ref }, receipt: receiptOf(r) }, { status: 201 });
}
