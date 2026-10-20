// GET /api/registers/professionals?name=&number= — anyone's check of one
// person: is this person on a public register of a regulated profession, and
// in what standing? The full name (five letters or more) is required; the
// registration number only narrows it, so the register cannot be read number
// by number. At most 20 answers, with the fields the profession's disclosure
// profile makes public (lib/professions/register.ts). Rate-limited per
// caller, and harvesting patterns are flagged (lib/professions/watch.ts).
// Bulk verification is the authorised exchange service professional.standing.
import { NextRequest, NextResponse } from 'next/server';
import { checkProfessional, professions } from '@/lib/professions/register';
import { limit, callerOf } from '@/lib/ops/rate-limit';
import { noteCheck } from '@/lib/professions/watch';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const tooMany = await limit(req, 'registerCheck');
  if (tooMany) return tooMany;
  const q = req.nextUrl.searchParams;
  // `q` is the earlier name of the name parameter.
  const name = (q.get('name') ?? q.get('q') ?? '').slice(0, 120), number = (q.get('number') ?? '').slice(0, 40);
  const results = checkProfessional({ name, number });
  if (name || number) noteCheck(await callerOf(req), results.length > 0);
  return NextResponse.json({ professions: professions().filter(p => p.publicCheck).map(p => ({ key: p.key, title: p.title })), results, ...(number && !name ? { note: 'Give the full name; the registration number only narrows the check' } : {}) });
}
