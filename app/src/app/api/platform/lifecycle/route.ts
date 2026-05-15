import { NextResponse } from 'next/server';
import { getLifecycle } from '@/lib/data/store';
export const dynamic = 'force-dynamic';
export function GET() { return NextResponse.json({ lifecycle: getLifecycle() }); }
