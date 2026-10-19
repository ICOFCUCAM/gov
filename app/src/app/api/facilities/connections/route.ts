// Digital interoperability on the map (lib/data/interop-map.ts): institutions
// at their registered seats, agreed exchanges (approved grants and
// integrations), live exchanges (institutions' systems calling the platform,
// with health) and, by region, the share of published sites that reported in
// the last 31 days. Only records the platform holds; nothing generated.
// Seats are placed as the viewer may see them (restricted seats not placed for viewers without need).
import { NextResponse } from 'next/server';
import { interoperability } from '@/lib/data/interop-map';
import { currentOfficial } from '@/lib/auth/official';
export const dynamic = 'force-dynamic';

export async function GET() {
  const o = await currentOfficial();
  return NextResponse.json({ ...interoperability(o ? { institution: o.institution, signedIn: true } : { signedIn: false }), asOf: new Date().toISOString() });
}
