// Retire a tasking capability (lib/twin/tasking.ts retireCapability): POST
// { reason }. No new tasks for it; those already made run their course; the
// record stays. Administrators only (ADMIN_ONLY in lib/auth/roles.ts); the
// signed-in official's verified name is recorded (withOfficial); audited.

import { NextRequest, NextResponse } from 'next/server';
import { withOfficial, refusal } from '@/lib/auth/official';
import { adminOnly } from '@/lib/auth/roles';
import { retireCapability } from '@/lib/twin/tasking';

export const dynamic = 'force-dynamic';

/**
 * @example { "by": "Platform Administrator", "reason": "Logger replaced by a model without remote control" }
 */
export async function POST(req: NextRequest, props: { params: Promise<{ id: string }> }) {
  const { id } = await props.params;
  const refused = await refusal(adminOnly);
  if (refused) return refused;
  const b = (await withOfficial(await req.json().catch(() => ({})))) as { by?: string; reason?: string };
  const r = retireCapability(decodeURIComponent(id), String(b.by ?? ''), String(b.reason ?? ''));
  if ('error' in r) return NextResponse.json(r, { status: 422 });
  return NextResponse.json({ capability: r });
}
