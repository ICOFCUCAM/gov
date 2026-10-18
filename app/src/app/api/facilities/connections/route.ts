// Digital interoperability on the map (lib/data/interop-map.ts): institutions
// at their registered seats, agreed exchanges (approved grants and
// integrations), live exchanges (institutions' systems calling the platform,
// with health) and, by region, the share of published sites that reported in
// the last 31 days. Only records the platform holds; nothing generated.
import { NextResponse } from 'next/server';
import { interoperability } from '@/lib/data/interop-map';
export const dynamic = 'force-dynamic';

export function GET() {
  return NextResponse.json({ ...interoperability(), asOf: new Date().toISOString() });
}
