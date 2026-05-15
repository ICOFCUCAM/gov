import { NextResponse } from 'next/server';
import { cabinetOverview } from '@/lib/data/store';
export const dynamic = 'force-dynamic';
export function GET() { return NextResponse.json(cabinetOverview()); }
