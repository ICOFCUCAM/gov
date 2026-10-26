// POST /api/cases/[id]/documents — attach a document to a case: JSON
// { class, title, data (base64), note?, classification? } (lib/records/documents.ts: PDF,
// PNG, JPEG or WebP by their bytes, up to 5 MB, sealed at rest). Kept with
// the case's institution and sensitivity, then attached by the workflow
// engine (the case rules apply). A file marked above the installation's
// accreditation is refused, never stored (I12, lib/security/classification.ts).
import { NextRequest, NextResponse } from 'next/server';
import { getCase, attach } from '@/lib/casework/engine';
import { getPackage } from '@/lib/casework/packages';
import { routeActor } from '@/lib/casework/actor';
import { addDocument } from '@/lib/records/documents';
import { caseActRefusal } from '@/lib/auth/roles';
import { caseFacts } from '@/lib/casework/engine';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest, props: { params: Promise<{ id: string }> }) {
  const { id } = await props.params;
  const c = getCase(id);
  if (!c) return NextResponse.json({ error: 'No such case' }, { status: 404 });
  const b = (await req.json().catch(() => ({}))) as { class?: string; title?: string; data?: string; note?: string; by?: string; classification?: string };
  const actor = await routeActor(b.by);
  if (actor.scope) {
    const why = caseActRefusal(actor.scope, caseFacts(c));
    if (why) return NextResponse.json({ error: why }, { status: 403 });
  }
  if (typeof b.data !== 'string' || !/^[A-Za-z0-9+/]+={0,2}$/.test(b.data)) return NextResponse.json({ error: 'Send the file as base64 data' }, { status: 422 });
  const pkg = getPackage(c.package.key, c.package.version);
  const d = addDocument({ class: String(b.class ?? ''), title: String(b.title ?? ''), institution: c.owner, belongsTo: { kind: 'case', id: c.id }, sensitivity: c.sensitivity, ...(pkg ? { retention: pkg.retention } : {}), bytes: new Uint8Array(Buffer.from(b.data, 'base64')), ...(b.note ? { note: b.note } : {}), ...(typeof b.classification === 'string' ? { classification: b.classification } : {}) }, actor.name);
  if ('error' in d) return NextResponse.json(d, { status: 422 });
  const r = attach(c.id, d.id, actor);
  if ('error' in r) return NextResponse.json(r, { status: 422 });
  return NextResponse.json({ document: d, case: r }, { status: 201 });
}
