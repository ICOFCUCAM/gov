// /api/org/relationships — the relationships between institutions
// (lib/data/store/relationships.ts; plan phase 3; guidance §3.3): which
// institution appoints, funds, instructs, audits, requests information from
// … which other, within what scope, on which law, between which dates.
// GET (?institution=): every relationship (or those touching one institution)
// with its status, the version in force, a proposal waiting for its second
// official and every earlier version; the kinds; the institutions.
// POST { op }:
//   'propose'  (administrators of the whole government or of either end) { id?, from, to, type, scope: { recordTypes,
//              purposes, territories }, conditions, effectiveFrom?, effectiveTo?, note?, legalBasis: [{ instrument, eId }] };
//              with id, a new version of that relationship (values left out kept);
//   'suspend' / 'end'  (the same administrators) { id, legalBasis, effectiveFrom? }: a new version suspending or ending it;
//   'confirm'  { id } a different official (an administrator or one who can sign); when an end is independent and has
//              officials who can sign, one of them for each such end;
//   'withdraw' { id, reason? } the proposer or an administrator withdraws the waiting proposal.
// Who acted comes from the sign-in. Nothing is approved without two officials; every step is audited, every version kept.
import { NextRequest, NextResponse } from 'next/server';
import { caseScope } from '@/lib/auth/official';
import { routeActor } from '@/lib/casework/actor';
import { roleOf, wholeGovernment, EXECUTIVE_OFFICE, INSTRUCTION_KINDS, READ_RELATIONSHIPS } from '@/lib/auth/roles';
import { hasOwnSigners } from '@/lib/auth/officials';
import {
  listRelationships, getRelationship, proposeRelationship, confirmRelationship, withdrawRelationshipProposal, pendingProposer,
  RELATIONSHIP_TYPES, listMinistries, isIndependentInstitution,
} from '@/lib/data/store';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const institution = req.nextUrl.searchParams.get('institution') ?? undefined;
  return NextResponse.json({
    relationships: listRelationships({ ...(institution ? { institution } : {}), ownSigners: hasOwnSigners }),
    institutions: listMinistries().filter(m => m.status === 'active').map(m => ({ id: m.id, name: m.name, independent: isIndependentInstitution(m.id) })),
    executiveOffice: EXECUTIVE_OFFICE,
    choices: { types: RELATIONSHIP_TYPES, instructionKinds: INSTRUCTION_KINDS, readTypes: READ_RELATIONSHIPS, caseRecordTypes: ['cases', 'queue'] },
  });
}

/** @example request {"op":"propose","from":"audit-office","to":"min-finance","type":"request_information","scope":{"recordTypes":["cases"],"purposes":["statutory financial audit"]},"legalBasis":[{"instrument":"/eli/x/act/2026/1","eId":"sec_18"}]} */
export async function POST(req: NextRequest) {
  const b = (await req.json().catch(() => ({}))) as Record<string, unknown> & { op?: string; id?: string; reason?: string };
  const s = await caseScope();
  const actor = await routeActor(b.by);
  const role = s ? roleOf(s) : undefined;
  const fail = (error: string, status = 422) => NextResponse.json({ error }, { status });
  const by = { by: actor.name, ...(actor.id ? { byId: actor.id } : {}) };
  const id = typeof b.id === 'string' ? b.id : undefined;
  const op = b.op ?? 'propose';
  if (op === 'propose' || op === 'suspend' || op === 'end') {
    // One administrator proposes: of the whole government, or of an institution at either end.
    const current = id ? getRelationship(id) : undefined;
    if (id && !current) return fail('No such relationship', 404);
    const ends = current ? [current.terms.from, current.terms.to] : [String(b.from ?? ''), String(b.to ?? '')];
    if (s && (role !== 'administrator' || !(wholeGovernment(s) || ends.includes(s.institution!)))) return fail('An administrator of the whole government or of one of the two institutions proposes a relationship', 403);
    if (op !== 'propose' && !id) return fail('Name the relationship (id)');
    const status = op === 'suspend' ? 'suspended' : op === 'end' ? 'withdrawn' : 'approved';
    const input = op === 'propose'
      ? { id, from: b.from, to: b.to, type: b.type, scope: b.scope as never, conditions: b.conditions, effectiveFrom: b.effectiveFrom, effectiveTo: b.effectiveTo, note: b.note, legalBasis: b.legalBasis, status }
      : { id, effectiveFrom: b.effectiveFrom, note: b.note, legalBasis: b.legalBasis, status };
    const r = proposeRelationship(input as Parameters<typeof proposeRelationship>[0], by);
    return 'error' in r ? fail(r.error) : NextResponse.json(r, { status: id ? 200 : 201 });
  }
  if (!id) return fail('Name the relationship (id)');
  if (op === 'confirm') {
    const r = confirmRelationship(id, { ...by, ...(s ? { role, ...(s.institution ? { institution: s.institution } : {}) } : {}) }, hasOwnSigners);
    if ('error' in r) return fail(r.error, r.error === 'No such relationship' ? 404 : /independent: an official who can sign there|who can sign confirms|proposed this|must sign in/.test(r.error) ? 403 : 422);
    return NextResponse.json(r);
  }
  if (op === 'withdraw') {
    const p = pendingProposer(id);
    if (s && p && role !== 'administrator' && p.byId !== actor.id) return fail('The proposer or an administrator withdraws a waiting proposal', 403);
    const r = withdrawRelationshipProposal(id, actor.name, typeof b.reason === 'string' ? b.reason : undefined);
    return 'error' in r ? fail(r.error, r.error === 'No such relationship' ? 404 : 422) : NextResponse.json(r);
  }
  return fail('op must be propose, suspend, end, confirm or withdraw');
}
