import { NextResponse } from 'next/server';
import { nationalSnapshot } from '@/lib/data/store';
import { withTwin } from '@/lib/twin/national';

export const dynamic = 'force-dynamic';

export async function GET() { return NextResponse.json(await withTwin(nationalSnapshot())); }
