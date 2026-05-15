import { NextResponse } from 'next/server';
import { verifyAuditChain } from '@/lib/data/store';

export const dynamic = 'force-dynamic';

export function GET() {
  return NextResponse.json(verifyAuditChain());
}
