import { NextRequest, NextResponse } from 'next/server';
import { federationCheck } from '@/lib/data/store';
export const dynamic = 'force-dynamic';
export function GET(req: NextRequest) {
  const to = req.nextUrl.searchParams.get('to');
  const scope = req.nextUrl.searchParams.get('scope');
  if (!to || !scope) return NextResponse.json({ error: 'to and scope required' }, { status: 422 });
  return NextResponse.json(federationCheck(to, scope));
}
