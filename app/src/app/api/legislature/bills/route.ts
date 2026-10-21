// /api/legislature/bills — the legislature's bills (lib/legislature/register.ts;
// plan phase 7). GET: officials of the legislature read the full record; the
// head of state's office reads bills passed and on; everyone else reads what
// the chamber's procedure makes public (texts, journal, amendments, reports,
// votes with names or counts as set; never who on the staff recorded a step).
// POST: introduce a bill under the approved procedure in force — an official
// of the legislature { title, number?, instrumentType?, language?, sponsor?,
// chamber?, summary?, provisions, date?, lawInstrument? }.
import { NextRequest, NextResponse } from 'next/server';
import { caseScope, refusal } from '@/lib/auth/official';
import { legislativeRecordRefusal } from '@/lib/auth/roles';
import { listBills, publicBill, introduceBill, readsFullRecord, certificationOf, legislatureId, legislatureName, activeProcedure, type IntroduceInput } from '@/lib/legislature/register';
import { legislativeActor, answer } from '@/lib/legislature/route-actor';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams;
  const s = await caseScope();
  const bills = listBills({ state: q.get('state') ?? undefined, q: q.get('q') ?? undefined }).flatMap((b): object[] => {
    if (readsFullRecord(s, b)) return [{ ...b, full: true, certification: certificationOf(b) }];
    const p = publicBill(b.id);
    return p ? [{ ...p, full: false }] : [];
  });
  const leg = legislatureId();
  return NextResponse.json({ bills, legislature: leg ? { id: leg, name: legislatureName() } : null, procedure: activeProcedure() ?? null, ownOfficial: !!s && !!leg && s.institution === leg });
}

/** @example request {"title":"Public Records Bill","provisions":[{"eId":"sec_1","num":"1","heading":"Short title","text":"This Act may be cited as the Public Records Act."}]} */
export async function POST(req: NextRequest) {
  const refused = await refusal(s => legislativeRecordRefusal(s, legislatureId(), 'record'));
  if (refused) return refused;
  const b = (await req.json().catch(() => ({}))) as IntroduceInput & { by?: string };
  const a = await legislativeActor(b.by);
  const r = introduceBill(b, a);
  return answer('error' in r ? r : { bill: r }, 201);
}

