// /api/professions/types — the regulated professions (lib/professions/register.ts):
// GET lists them (the shipped references and the nation's own); POST { key,
// title, authority, permitType?, publicCheck? } configures one, naming the
// regulator that keeps its register (administrators, audited). What its
// public check shows changes by two officials citing the law:
// { op: 'propose-disclosure', key, publicFields, legalBasis: [{ instrument,
// eId }] }, then { op: 'confirm-disclosure', key } by a different official,
// or { op: 'withdraw-disclosure', key }. GET lists each profession with its
// waiting proposal and earlier versions.
import { NextRequest, NextResponse } from 'next/server';
import { withOfficial } from '@/lib/auth/official';
import { routeActor } from '@/lib/casework/actor';
import { dualControlPolicy } from '@/lib/casework/dual-control-policy';
import { defineProfession, professions, proposeDisclosure, confirmDisclosure, withdrawDisclosure, disclosureChanges } from '@/lib/professions/register';

export const dynamic = 'force-dynamic';

export function GET() {
  return NextResponse.json({ professions: professions().map(p => ({ ...p, disclosureChanges: disclosureChanges(p.key) })) });
}

export async function POST(req: NextRequest) {
  const raw = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  if (typeof raw.op === 'string' && raw.op.endsWith('-disclosure')) {
    const actor = await routeActor(raw.by);
    const key = String(raw.key ?? '');
    const dc = dualControlPolicy();
    const r = raw.op === 'propose-disclosure' ? proposeDisclosure(key, raw.publicFields, raw.legalBasis, actor.name, actor.id, new Date(), dc.pendingHours)
      : raw.op === 'confirm-disclosure' ? confirmDisclosure(key, actor.name, actor.id, new Date(), dc.requireIdentityBinding)
      : raw.op === 'withdraw-disclosure' ? withdrawDisclosure(key, actor.name, typeof raw.reason === 'string' ? raw.reason : undefined)
      : { error: 'op is propose-disclosure, confirm-disclosure or withdraw-disclosure' };
    return 'error' in r ? NextResponse.json(r, { status: 422 }) : NextResponse.json({ result: r, disclosureChanges: disclosureChanges(key) });
  }
  const b = await withOfficial(raw);
  const r = defineProfession(b as never, String(b.by ?? 'Administrator'));
  return 'error' in r ? NextResponse.json(r, { status: 422 }) : NextResponse.json({ profession: r }, { status: 201 });
}
