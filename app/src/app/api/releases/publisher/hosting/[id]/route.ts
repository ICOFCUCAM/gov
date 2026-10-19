// /api/releases/publisher/hosting/[id] — engineering review: start the
// review, then issue a versioned assessment with any adjustments.
import { NextRequest, NextResponse } from 'next/server';
import { publisherHostingAction } from '@/lib/data/hosting';
import { nationRecord } from '@/lib/data/updates';
import { publisherAuthorized, unauthorized } from '@/lib/updates/access';
import { withOfficial } from '@/lib/auth/official';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  if (!(await publisherAuthorized(req))) return unauthorized();
  let b: { action?: string; by?: string; notes?: string; capexFactor?: number; annualFactor?: number; timelineFactor?: number };
  try { b = await withOfficial(await req.json()); } catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }); }
  const out = publisherHostingAction(params.id, b ?? {}, nationRecord);
  if ('error' in out) return NextResponse.json({ error: out.error }, { status: out.status });
  return NextResponse.json({ request: out });
}
