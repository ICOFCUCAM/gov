// Check a position before recording a site (no change is made): inside the
// nation and the stated region, the region and district it falls in, possible
// duplicates nearby, swapped coordinates and low precision.
import { NextRequest, NextResponse } from 'next/server';
import { checkLocation } from '@/lib/data/facilities';
import { limit } from '@/lib/ops/rate-limit';
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  const limited = await limit(req, 'check');
  if (limited) return limited;
  const b = (await req.json().catch(() => ({}))) as { lng?: number; lat?: number; category?: string; region?: string; name?: string };
  return NextResponse.json(await checkLocation({ lng: Number(b.lng), lat: Number(b.lat), category: String(b.category ?? ''), region: b.region, name: b.name }));
}
