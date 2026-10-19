// /api/releases/publisher/contracts — every nation's contract (GET); seats,
// modules, support tier, renewal proposals and payments received (POST).
import { NextRequest, NextResponse } from 'next/server';
import { publisherAuthorized, unauthorized } from '@/lib/updates/access';
import { nationRecord, publisherOverview } from '@/lib/data/updates';
import { contractFor, publisherContractAction, MODULES } from '@/lib/data/contracts';
import { withOfficial } from '@/lib/auth/official';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  if (!await publisherAuthorized(req)) return unauthorized();
  const contracts = publisherOverview().nations.map(v => contractFor(nationRecord(v.id)!, v.name));
  return NextResponse.json({ contracts, modules: MODULES });
}

export async function POST(req: NextRequest) {
  if (!await publisherAuthorized(req)) return unauthorized();
  let b: { nationId?: string; action?: string; by?: string; licensed?: number; modules?: string[]; tier?: string; years?: number; invoiceId?: string; reference?: string };
  try { b = await withOfficial(await req.json()); } catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }); }
  const n = nationRecord(String(b.nationId ?? ''));
  if (!n) return NextResponse.json({ error: 'Choose an enrolled nation' }, { status: 422 });
  const out = publisherContractAction(n, b);
  if ('error' in out) return NextResponse.json({ error: out.error }, { status: out.status });
  return NextResponse.json({ ok: true });
}
