// /api/citizen/applications — a citizen's own applications (design §8.4,
// §10.1). The route checks the citizen itself (SELF_AUTHENTICATED): signed in
// through the nation's identity service, or the demo citizen in training and
// demonstration installations. GET: the cases they applied for, with stage
// and decisions only. POST: notify a birth or report an incident to the
// police (the procedures citizens may start: civil.birth, civil.late-birth,
// police.incident), opened as a citizen case under the procedure in force;
// officials of the responsible authority take it from there.
import { NextRequest, NextResponse } from 'next/server';
import { currentCitizen } from '@/lib/auth/citizen';
import { openCase, listCases } from '@/lib/casework/engine';
import { getPackage } from '@/lib/casework/packages';
import { certificatesFor } from '@/lib/records/certificates';
import '@/lib/casework/modules';

export const dynamic = 'force-dynamic';

const CITIZEN_PROCEDURES = ['civil.birth', 'civil.late-birth', 'police.incident'];

export async function GET() {
  const c = await currentCitizen();
  if (!c) return NextResponse.json({ error: 'Sign in first' }, { status: 401 });
  const mine = listCases({ limit: 1000 }).filter(x => x.source === 'citizen' && x.applicant?.id === c.sub);
  return NextResponse.json({
    applications: mine.map(x => {
      const p = getPackage(x.package.key, x.package.version);
      return { id: x.id, ref: x.ref, procedure: p?.title ?? x.package.key, stage: p?.stages.find(s => s.key === x.stage)?.label ?? x.stage, openedAt: x.openedAt, closedAt: x.closedAt ?? null, certificates: certificatesFor(x.decisions).map(ce => ({ code: ce.code, title: ce.title, status: ce.status })) };
    }),
    procedures: CITIZEN_PROCEDURES,
  });
}

export async function POST(req: NextRequest) {
  const c = await currentCitizen();
  if (!c) return NextResponse.json({ error: 'Sign in first' }, { status: 401 });
  const b = (await req.json().catch(() => ({}))) as { procedure?: string; fields?: Record<string, unknown>; idempotencyKey?: string };
  if (!CITIZEN_PROCEDURES.includes(String(b.procedure))) return NextResponse.json({ error: `Citizens may start: ${CITIZEN_PROCEDURES.join(', ')}` }, { status: 422 });
  const r = openCase({ procedure: String(b.procedure), fields: b.fields ?? {}, source: 'citizen', applicant: { kind: 'person', id: c.sub, name: c.name }, ...(typeof b.idempotencyKey === 'string' ? { idempotencyKey: `citizen:${c.sub}:${b.idempotencyKey.slice(0, 80)}` } : {}) }, { name: c.demo ? 'Demo citizen' : `Citizen (${c.name})`, scope: null });
  if ('error' in r) return NextResponse.json(r, { status: 422 });
  return NextResponse.json({ application: { id: r.id, ref: r.ref } }, { status: 201 });
}
