// /api/legislature/bills/{id} — one bill of the legislature's record
// (lib/legislature/register.ts; plan phase 7).
// GET: the full record for the legislature's officials (and the head of
// state's office once passed), otherwise what the chamber makes public.
// POST { op } — officials of the legislature only; the clerk's steps need an
// official who can sign there:
//   'text'        { label, provisions, date?, amendments? }   a new version of the text
//   'stage'       { stage, date?, note? }                     the bill moves to a later stage
//   'refer'       { committee, date? }                        committee referral
//   'report'      { committee, date?, recommendation, summary, reference? }
//   'amendment'   { number?, proposer?, text, date? }
//   'decide-amendment' { amendment, outcome: agreed | negatived | withdrawn, vote?, date? }
//   'vote'        { question?, on?: bill | amendment, amendment?, date?, yes, no, abstain, division?, names? }   (can sign)
//   'pass'        { date? }                                   (can sign)
//   'commence'    { inForce, note? }                          (can sign)
//   'publish'     { date?, reference, actNumber }             (can sign)
//   'close'       { outcome: withdrawn | lapsed | defeated, date?, reason }   (can sign)
//   'certify'     {}                                          the clerk certifies the record as it stands (can sign)
//   'transmit'    {}                                          the enacted text enters the laws register (can sign)
//   'correct'     { target: { kind: vote | journal, id }, values, reason }   proposes a correction
//   'confirm-correction'  { correction }                     a different official who can sign there
//   'withdraw-correction' { correction }
// Assent: POST /api/legislature/bills/{id}/assent.
import { NextRequest, NextResponse } from 'next/server';
import { caseScope, refusal } from '@/lib/auth/official';
import { legislativeRecordRefusal } from '@/lib/auth/roles';
import {
  getBill, publicBill, readsFullRecord, certificationOf, recordDigest, legislatureId, getProcedure,
  addText, recordStage, referToCommittee, recordReport, proposeAmendment, decideAmendment, recordVote, passBill,
  recordCommencement, publishBill, closeBill, certifyBill, transmitToLaws, proposeCorrection, confirmCorrection, withdrawCorrection,
  type Bill,
} from '@/lib/legislature/register';
import { legislativeActor, answer } from '@/lib/legislature/route-actor';

export const dynamic = 'force-dynamic';

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, ctx: Ctx) {
  const { id } = await ctx.params;
  const b = getBill(decodeURIComponent(id));
  const s = await caseScope();
  if (b && readsFullRecord(s, b)) {
    return NextResponse.json({ bill: b, full: true, certification: certificationOf(b), digest: recordDigest(b), procedure: getProcedure(b.procedureVersion) ?? null, ownOfficial: !!s && s.institution === legislatureId() });
  }
  const p = b ? publicBill(b.id) : null;
  if (!p) return NextResponse.json({ error: 'No such bill' }, { status: 404 });
  return NextResponse.json({ bill: p, full: false });
}

const SIGN = new Set(['vote', 'pass', 'commence', 'publish', 'close', 'certify', 'transmit', 'confirm-correction']);

/** @example request {"op":"vote","yes":120,"no":40,"abstain":5} */
export async function POST(req: NextRequest, ctx: Ctx) {
  const { id: raw } = await ctx.params;
  const id = decodeURIComponent(raw);
  const b = (await req.json().catch(() => ({}))) as Record<string, unknown> & { op?: string; by?: string };
  const op = b.op ?? '';
  const refused = await refusal(s => legislativeRecordRefusal(s, legislatureId(), SIGN.has(op) ? 'sign' : 'record'));
  if (refused) return refused;
  const a = await legislativeActor(b.by);
  const out = (r: Bill | { error: string }) => answer('error' in r ? r : { bill: r });
  const x = b as object;
  switch (op) {
    case 'text': return out(addText(id, x, a));
    case 'stage': return out(recordStage(id, x, a));
    case 'refer': return out(referToCommittee(id, x, a));
    case 'report': return out(recordReport(id, x, a));
    case 'amendment': return out(proposeAmendment(id, x, a));
    case 'decide-amendment': return out(decideAmendment(id, x, a));
    case 'vote': return out(recordVote(id, x, a));
    case 'pass': return out(passBill(id, x, a));
    case 'commence': return out(recordCommencement(id, x, a));
    case 'publish': return out(publishBill(id, x, a));
    case 'close': return out(closeBill(id, x, a));
    case 'certify': return out(certifyBill(id, a));
    case 'transmit': return answer(transmitToLaws(id, a), 201);
    case 'correct': return out(proposeCorrection(id, x, a));
    case 'confirm-correction': return out(confirmCorrection(id, String(b.correction ?? ''), a));
    case 'withdraw-correction': return out(withdrawCorrection(id, String(b.correction ?? ''), a));
    default: return NextResponse.json({ error: 'op must be text, stage, refer, report, amendment, decide-amendment, vote, pass, commence, publish, close, certify, transmit, correct, confirm-correction or withdraw-correction' }, { status: 422 });
  }
}
