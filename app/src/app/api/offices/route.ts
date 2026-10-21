// /api/offices — the nation's offices of state and who holds them
// (lib/nation/office-register.ts; plan phase 4, audit F). An office is a
// record: institution, title per language, kind, references to its powers
// (enforced where they are recorded, never here), term, acting and succession
// rules, legal basis and dates. Holding one grants no permission.
// GET: every office (the head of government derived from the profile until
// the nation records one), holdings with their history, waiting changes and
// the starting list of kinds.
// POST { op }:
//   'record'   (first-run setup only; administrators) { id?, institution?, title, titles?, kind, powers?, term?, acting?,
//              succession?, heldWith?, effectiveFrom?, effectiveTo?, legalBasis? }
//   'propose'  (an administrator of the whole government or of the office's institution) the same fields, a new office
//              without id; legalBasis: [{ instrument, eId }] required;
//   'confirm'  { id } a different official (an administrator or one who can sign; for an independent institution with
//              its own officials who can sign, one of them);
//   'withdraw' { id, reason? } the proposer or an administrator;
//   'link'     { officeId, accountId, from?, to?, acting?, note?, legalBasis? } an administrator of the office's
//              institution (or of the whole government when it is not independent); waits for a second official;
//   'confirm-link' { holding } a different official of the office's institution (administrator or can sign);
//   'end-link' { holding, to?, reason } ends a holding (or withdraws a waiting link); kept with its end date.
// Who acted comes from the sign-in. Every step is audited and every version kept.
import { NextRequest, NextResponse } from 'next/server';
import { caseScope } from '@/lib/auth/official';
import { routeActor } from '@/lib/casework/actor';
import { roleOf } from '@/lib/auth/roles';
import {
  listOffices, listHoldings, waitingOffices, officeHistory, lapseOffices, setupRunning, OFFICE_KINDS,
  recordOfficeDuringSetup, proposeOffice, confirmOffice, withdrawOffice, proposeHolding, confirmHolding, endHolding, officeConfirmer,
  type OfficeActor,
} from '@/lib/nation/office-register';
import { getMinistry } from '@/lib/data/store';

export const dynamic = 'force-dynamic';

export function GET() {
  lapseOffices();
  const offices = listOffices().map(o => {
    const confirmBy = o.derived ? null : officeConfirmer(o.id);
    return { ...o, ...(o.derived ? {} : { changes: officeHistory(o.id) }), confirmBy: confirmBy ? { id: confirmBy, name: getMinistry(confirmBy)?.name ?? confirmBy } : null };
  });
  return NextResponse.json({ offices, holdings: listHoldings(), waiting: waitingOffices(), kinds: OFFICE_KINDS, setupRunning: setupRunning() });
}

/** @example request {"op":"propose","title":"Speaker of the National Assembly","kind":"presiding-officer","institution":"assembly","legalBasis":[{"instrument":"/eli/x/act/2026/1","eId":"sec_4"}]} */
export async function POST(req: NextRequest) {
  const b = (await req.json().catch(() => ({}))) as Record<string, unknown> & { op?: string };
  const s = await caseScope();
  const a = await routeActor(b.by);
  const actor: OfficeActor = { by: a.name, ...(a.id ? { byId: a.id } : {}), ...(s ? { role: roleOf(s), ...(s.institution ? { institution: s.institution } : {}) } : {}) };
  const out = (r: object) => ('error' in r
    ? NextResponse.json(r, { status: /^(An administrator|An institution's administrator|An official of|An administrator or|The proposer|.* is independent: an official who can sign there)/.test((r as { error: string }).error) ? 403 : 422 })
    : NextResponse.json({ result: r }));
  const op = b.op ?? 'propose';
  const terms = { id: b.id, institution: b.institution, title: b.title, titles: b.titles, kind: b.kind, powers: b.powers, term: b.term, acting: b.acting,
    succession: b.succession, heldWith: b.heldWith, effectiveFrom: b.effectiveFrom, effectiveTo: b.effectiveTo, legalBasis: b.legalBasis };
  const id = typeof b.id === 'string' ? b.id : '';
  const reason = typeof b.reason === 'string' ? b.reason : undefined;
  if (op === 'record') return out(recordOfficeDuringSetup(terms, actor));
  if (op === 'propose') return out(proposeOffice(terms, actor));
  if (op === 'confirm') return out(confirmOffice(id, actor));
  if (op === 'withdraw') return out(withdrawOffice(id, actor, reason));
  if (op === 'link') return out(proposeHolding({ officeId: b.officeId, accountId: b.accountId, from: b.from, to: b.to, acting: b.acting, note: b.note, legalBasis: b.legalBasis }, actor));
  const holding = typeof b.holding === 'string' ? b.holding : '';
  if (op === 'confirm-link') return out(confirmHolding(holding, actor));
  if (op === 'end-link') return out(endHolding(holding, { to: b.to, reason: b.reason }, actor));
  return NextResponse.json({ error: 'op must be record, propose, confirm, withdraw, link, confirm-link or end-link' }, { status: 422 });
}
