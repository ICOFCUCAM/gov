import { NextResponse } from 'next/server';
import { nationalSnapshot } from '@/lib/data/store';
export const dynamic = 'force-dynamic';
export function GET() { return NextResponse.json(nationalSnapshot()); }
