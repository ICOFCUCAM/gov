import { NextResponse } from 'next/server';
import { listGrants } from '@/lib/data/store';
export const dynamic = 'force-dynamic';
export function GET() { return NextResponse.json({ grants: listGrants() }); }
