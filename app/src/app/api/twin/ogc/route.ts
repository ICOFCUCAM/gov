// OGC API – Features landing page for the national twin (lib/twin/ogc.ts).
import { NextRequest, NextResponse } from 'next/server';
import { landing } from '@/lib/twin/ogc';
import { getSovereign } from '@/lib/data/store';

export const dynamic = 'force-dynamic';

export function GET(req: NextRequest) {
  return NextResponse.json(landing(`${req.nextUrl.origin}/api/twin/ogc`, getSovereign().stateName));
}
