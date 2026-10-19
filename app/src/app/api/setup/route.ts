import { NextRequest, NextResponse } from 'next/server';
import { getSetup, completeSetup } from '@/lib/data/store';
import { withOfficial, refusal } from '@/lib/auth/official';
import { adminOnly } from '@/lib/auth/roles';
export const dynamic = 'force-dynamic';
export function GET() { return NextResponse.json({ setup: getSetup() }); }
export async function POST(req: NextRequest) {
  const refused = await refusal(adminOnly);
  if (refused) return refused;
  const b = (await withOfficial(await req.json().catch(() => ({})))) as { by?: string };
  return NextResponse.json({ setup: completeSetup(b.by || 'cabinet-office') });
}
