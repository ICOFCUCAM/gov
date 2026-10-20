// Which store owns each register (lib/data/register-owners.ts): the owner,
// the one API that changes it, and every other copy with its role; and how
// the substrate mirrors stand (lib/db/mirror.ts: records waiting to be
// copied, with their last error); and who is legally responsible for each
// register (`legal`: the authority the nation named in its deployment profile,
// or "no legal owner named").
import { NextResponse } from 'next/server';
import { REGISTER_OWNERS, legalOwners } from '@/lib/data/register-owners';
import { getSovereign } from '@/lib/data/store';
import { mirrorStatus } from '@/lib/db/mirror';
export const dynamic = 'force-dynamic';

export async function GET() {
  return NextResponse.json({ registers: REGISTER_OWNERS, legal: legalOwners(getSovereign().deployment?.authorities), substrateMirror: mirrorStatus() });
}
