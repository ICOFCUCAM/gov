// GET /api/exchange/services — the directory of services this installation
// offers (lib/exchange/services.ts): id, version, owner, kind, the scope a
// caller needs, the fields it returns, its data class and legal basis.
import { NextResponse } from 'next/server';
import { serviceDirectory } from '@/lib/exchange/services';

export const dynamic = 'force-dynamic';
export function GET() { return NextResponse.json({ services: serviceDirectory() }); }
