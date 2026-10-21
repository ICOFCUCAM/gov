// /api/org/ministries/{id}/export/{exportId} — a confirmed export's sealed
// archive (lib/portability/export.ts). GET downloads it (the .cvx file, still
// sealed: it opens only with the key custody's key); GET ?check runs the
// offline verification (lib/portability/verify.ts) on it here and returns the
// report. Only the institution's administrators and officials who can sign
// there (exportDownloadRefusal()); every download is an export in the access
// log and an audit entry.
import { NextRequest, NextResponse } from 'next/server';
import { routeActor } from '@/lib/casework/actor';
import { getMinistry, recordAudit } from '@/lib/data/store';
import { readRefusal } from '@/lib/auth/official';
import { exportDownloadRefusal } from '@/lib/auth/roles';
import { recordAccess } from '@/lib/records/access-log';
import { accessBy } from '@/lib/records/access-by';
import { exportArchive, listExports, portabilityActorOf, PORTABILITY_ID } from '@/lib/portability/export';
import { verifyInstitutionExport } from '@/lib/portability/verify';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest, props: { params: Promise<{ id: string; exportId: string }> }) {
  const { id, exportId } = await props.params;
  if (!getMinistry(id) || !PORTABILITY_ID.test(exportId) || !listExports(id).some(p => p.id === exportId)) return NextResponse.json({ error: 'No such export for this institution' }, { status: 404 });
  const refused = await readRefusal(s => exportDownloadRefusal(s, id));
  if (refused) return refused;
  const got = await exportArchive(exportId).catch(e => ({ error: (e as Error).message }));
  if ('error' in got) return NextResponse.json(got, { status: 409 });
  if (req.nextUrl.searchParams.has('check')) return NextResponse.json(await verifyInstitutionExport(got.archive));
  const actor = portabilityActorOf(await routeActor());
  recordAccess({ ...(actor.scope ? accessBy({ ...(actor.byId ? { id: actor.byId } : {}), label: actor.by, ...(actor.institution ? { institution: actor.institution } : {}) }) : { by: { name: actor.by } }),
    record: { register: 'institution-export', id: exportId }, action: 'export', result: 'allowed', rule: 'Download of a confirmed export (sealed archive)' });
  recordAudit(actor.by, 'institution.export.download', `InstitutionExport:${exportId}`, 'ok', `${got.record.sizeBytes} bytes · sha256 ${got.record.sha256.slice(0, 16)}…`);
  return new NextResponse(new Uint8Array(got.archive), { headers: {
    'content-type': 'application/octet-stream', 'cache-control': 'private, no-store', 'x-content-sha256': got.record.sha256,
    'content-disposition': `attachment; filename="${exportId}.cvx"`,
  } });
}
