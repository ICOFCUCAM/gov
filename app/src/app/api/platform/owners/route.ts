// Which store owns each register (lib/data/register-owners.ts): the owner,
// the one API that changes it, and every other copy with its role; and how
// the substrate mirrors stand (lib/db/mirror.ts: records waiting to be
// copied, with their last error).
import { NextResponse } from 'next/server';
import { REGISTER_OWNERS } from '@/lib/data/register-owners';
import { mirrorStatus } from '@/lib/db/mirror';
export const dynamic = 'force-dynamic';

export async function GET() {
  return NextResponse.json({ registers: REGISTER_OWNERS, substrateMirror: mirrorStatus() });
}
