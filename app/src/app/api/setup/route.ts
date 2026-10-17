import { NextRequest, NextResponse } from 'next/server';
import { getSetup, completeSetup } from '@/lib/data/store';
export const dynamic = 'force-dynamic';
export function GET() { return NextResponse.json({ setup: getSetup() }); }
export async function POST(req: NextRequest) {
  const b = (await req.json().catch(() => ({}))) as { by?: string };
  return NextResponse.json({ setup: completeSetup(b.by || 'cabinet-office') });
}
