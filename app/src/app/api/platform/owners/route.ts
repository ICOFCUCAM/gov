// Which store owns each register (lib/data/register-owners.ts): the owner,
// the one API that changes it, and every other copy with its role.
import { NextResponse } from 'next/server';
import { REGISTER_OWNERS } from '@/lib/data/register-owners';
export const dynamic = 'force-dynamic';

export async function GET() {
  return NextResponse.json({ registers: REGISTER_OWNERS });
}
