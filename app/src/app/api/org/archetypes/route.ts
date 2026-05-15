import { NextResponse } from 'next/server';
import { listArchetypes } from '@/lib/data/store';
export const dynamic = 'force-dynamic';
export function GET() { return NextResponse.json({ archetypes: listArchetypes() }); }
