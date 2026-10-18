// OGC API – Features conformance classes the twin's endpoint implements.
import { NextResponse } from 'next/server';
import { CONFORMANCE } from '@/lib/twin/ogc';

export function GET() {
  return NextResponse.json({ conformsTo: CONFORMANCE });
}
