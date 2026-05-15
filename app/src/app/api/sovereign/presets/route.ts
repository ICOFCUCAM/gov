import { NextResponse } from 'next/server';
import { listSovereignPresets } from '@/lib/data/store';
export const dynamic = 'force-dynamic';
export function GET() { return NextResponse.json({ presets: listSovereignPresets() }); }
