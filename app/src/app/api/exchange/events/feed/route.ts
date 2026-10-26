// GET /api/exchange/events/feed?after=<published_at> — another institution's
// installation collects the federation envelopes its institution may receive
// (plan I9, lib/federation/events.ts feedFor()): its integration key of scope
// events:read in Authorization, linked by two officials to that institution.
// Only envelopes of the types an approved exchange relationship in force
// covers, from the institutions it names; references only (no actor, no free
// text). The source's public keys are at /api/exchange/institution-keys.
import { NextRequest, NextResponse } from 'next/server';
import { verifyIntegrationKey } from '@/lib/data/store';
import { integrationInstitution } from '@/lib/data/store/federation';
import { feedFor } from '@/lib/federation/events';
import { noteUnauthenticated } from '@/lib/exchange/log';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const access = verifyIntegrationKey(req.headers.get('authorization'), 'events:read');
  if (!access.ok) {
    noteUnauthenticated({ channel: 'federation', feedId: 'events-feed', result: access.error });
    return NextResponse.json({ error: access.error }, { status: access.status });
  }
  const institution = integrationInstitution(access.client.id);
  if (!institution) return NextResponse.json({ error: 'This integration acts for no institution of the register: two officials link it to one first' }, { status: 403 });
  const after = req.nextUrl.searchParams.get('after') ?? undefined;
  return NextResponse.json({ institution, ...feedFor(institution, after) });
}
