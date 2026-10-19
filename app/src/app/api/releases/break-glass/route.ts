// /api/releases/break-glass — the worst case: switch the software back to the
// restore point taken before the running release was installed. Dual control
// by two sign-ins (review H-5): the first official proposes { reason }, a
// different signed-in official confirms in their own request, and only then
// does it run. { action: 'cancel' } withdraws a proposal. Installation-level:
// this nation's government-wide administrators only (lib/auth/roles.ts,
// checked in chamberBody()). Names and identities come from the verified
// session, never from the body; a typed second name is refused.
import { NextRequest, NextResponse } from 'next/server';
import { breakGlass } from '@/lib/data/updates';
import { chamberBody } from '@/lib/updates/access';
import { officialId } from '@/lib/auth/official';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  const r = await chamberBody<{ by?: string; secondBy?: string; reason?: string; action?: string }>(req);
  if (r instanceof NextResponse) return r;
  const s = (v: unknown) => (typeof v === 'string' ? v : undefined);
  const action = r.b.action === 'cancel' || r.b.action === 'confirm' || r.b.action === 'propose' ? r.b.action : undefined;
  if (r.b.action !== undefined && !action) return NextResponse.json({ error: 'action must be propose, confirm or cancel' }, { status: 422 });
  const out = breakGlass(r.nation.id, { by: s(r.b.by), byId: await officialId(), secondBy: s(r.b.secondBy), reason: s(r.b.reason), action });
  if ('error' in out) return NextResponse.json({ error: out.error }, { status: out.status });
  return NextResponse.json(out);
}
