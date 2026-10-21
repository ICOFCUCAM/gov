// POST /api/legislature/bills/{id}/assent — assent to a passed bill, or that it
// was withheld, where the legislative procedure asks for assent
// (lib/legislature/register.ts recordAssent(); plan phase 7): an official who
// can sign at the institution named for the head of state; where the nation
// names none, the legislature's clerk records it as communicated to the
// chamber. Body: { outcome: assented | withheld, date?, reference?, note? }.
import { NextRequest } from 'next/server';
import { refusal } from '@/lib/auth/official';
import { assentRefusal } from '@/lib/auth/roles';
import { authorityFor } from '@/lib/data/store';
import { recordAssent, legislatureId } from '@/lib/legislature/register';
import { legislativeActor, answer } from '@/lib/legislature/route-actor';

export const dynamic = 'force-dynamic';

/** @example request {"outcome":"assented","date":"2026-11-02","reference":"Assent instrument 14"} */
export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const refused = await refusal(s => assentRefusal(s, authorityFor('headOfState'), legislatureId()));
  if (refused) return refused;
  const { id } = await ctx.params;
  const b = (await req.json().catch(() => ({}))) as Record<string, unknown> & { by?: string };
  const a = await legislativeActor(b.by);
  const r = recordAssent(decodeURIComponent(id), b as object, a);
  return answer('error' in r ? r : { bill: r });
}
