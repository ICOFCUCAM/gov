// GET /api/cases/[id]/documents/[doc]?v= — a document's bytes (a version, the
// latest by default), for those the case rules let read the case; checked
// against its SHA-256. Reads of restricted and secret cases' documents are
// written to the access log.
import { NextRequest, NextResponse } from 'next/server';
import { caseReadRefusal, caseRecordTypes, readRelationship, relationshipRule } from '@/lib/auth/roles';
import { caseScope } from '@/lib/auth/official';
import { getCase, caseFacts } from '@/lib/casework/engine';
import { documentBytes, getDocument } from '@/lib/records/documents';
import { recordAccess } from '@/lib/records/access-log';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest, props: { params: Promise<{ id: string; doc: string }> }) {
  const { id, doc } = await props.params;
  const c = getCase(id);
  const d = getDocument(doc);
  if (!c || !d || d.belongsTo.id !== c.id) return NextResponse.json({ error: 'No such document' }, { status: 404 });
  const s = await caseScope();
  const purpose = req.nextUrl.searchParams.get('purpose') ?? undefined;
  if (s) {
    const facts = caseFacts(c);
    const why = caseReadRefusal(s, facts, purpose);
    // A read under an approved audit or request-information relationship is always logged, naming it (plan phase 3).
    const grant = !why && s.institution !== c.owner ? readRelationship(s, c.owner, caseRecordTypes(facts), purpose) : null;
    const rule = why ?? (grant ? relationshipRule(grant) : undefined);
    if (c.sensitivity !== 'normal' || why || grant) recordAccess({ by: { id: s.id, name: s.label, ...(s.institution ? { institution: s.institution } : {}) }, record: { register: 'documents', id: d.id }, action: why ? 'refused' : 'view', ...(purpose ? { purpose } : {}), result: why ? 'refused' : 'allowed', ...(rule ? { rule } : {}) });
    if (why) return NextResponse.json({ error: why }, { status: 403 });
  }
  const v = Number(req.nextUrl.searchParams.get('v')) || undefined;
  const r = documentBytes(d.id, v);
  if ('error' in r) return NextResponse.json(r, { status: 422 });
  return new NextResponse(new Uint8Array(r.bytes), { headers: { 'content-type': r.mediaType, 'content-disposition': `inline; filename="${d.class}-${d.id}"`, 'x-content-sha256': r.sha256, 'cache-control': 'no-store' } });
}
