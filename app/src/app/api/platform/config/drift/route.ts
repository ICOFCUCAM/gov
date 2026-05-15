import { NextResponse } from 'next/server';
import { configDrift } from '@/lib/data/store';
export const dynamic = 'force-dynamic';
export function GET() { return NextResponse.json(configDrift()); }
