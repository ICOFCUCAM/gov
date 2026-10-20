// GET /verify/check?code= — sends the code form to /verify/<code> (normalised).
import { NextRequest, NextResponse } from 'next/server';
import { normaliseCode } from '@/lib/records/certificates';

export function GET(req: NextRequest) {
  const code = normaliseCode(req.nextUrl.searchParams.get('code') ?? '').replace(/[^A-Z0-9]/g, '').slice(0, 20);
  return NextResponse.redirect(new URL(code ? `/verify/${code}` : '/verify', req.url), 303);
}
