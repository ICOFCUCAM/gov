// /api/org/ministries/{id}/standing — an institution's constitutional terms
// (lib/data/store/institutions.ts; plan phase 1): its standing, branch,
// establishing law, the date it applies from, independence per dimension,
// what the law forbids and the records it owns.
// GET: the terms in force, changes scheduled, a change waiting for its second
// official, every earlier version, and the choices (standings, dimensions,
// branches).
// POST { op }:
//   'record'   (first-run setup only; administrators) { standing?, branch?, effectiveFrom?, independence?, prohibitions?, records?, legalBasis? }
//   'propose'  (administrators of the whole government or of the institution) the same fields, legalBasis: [{ instrument, eId }]
//              required, and optionally change: { kind: rename, name } | { kind: deactivate } | { kind: merge, into };
//   'confirm'  a different official (an administrator or one who can sign); for an independent institution with its own
//              officials who can sign, one of them;
//   'withdraw' { reason? } the proposer or an administrator.
// Who acted comes from the sign-in. Every step is audited and every version kept.
import { NextRequest, NextResponse } from 'next/server';
import { caseScope } from '@/lib/auth/official';
import { routeActor } from '@/lib/casework/actor';
import { roleOf, wholeGovernment } from '@/lib/auth/roles';
import { hasOwnSigners } from '@/lib/auth/officials';
import { queueMirror } from '@/lib/db/mirror';
import {
  getMinistry, termsOf, scheduledTerms, isIndependentInstitution, confirmerRequired, setupRunning,
  recordTermsDuringSetup, proposeInstitutionTerms, confirmInstitutionTerms, withdrawInstitutionTerms, lapseInstitutionTerms,
  STANDINGS, INDEPENDENCE_DIMENSIONS, BRANCHES,
} from '@/lib/data/store';

export const dynamic = 'force-dynamic';

export async function GET(_req: NextRequest, props: { params: Promise<{ id: string }> }) {
  const { id } = await props.params;
  lapseInstitutionTerms();
  const m = getMinistry(id);
  if (!m) return NextResponse.json({ error: 'No such institution' }, { status: 404 });
  return NextResponse.json({
    institution: { id: m.id, name: m.name, status: m.status },
    terms: termsOf(m), independent: isIndependentInstitution(m.id), scheduled: scheduledTerms(m),
    pending: m.terms?.pending ?? null, history: m.terms?.history ?? [],
    confirmBy: confirmerRequired(m.id) && hasOwnSigners(m.id) ? { id: m.id, name: m.name } : null,
    setupRunning: setupRunning(),
    choices: { standings: STANDINGS, dimensions: INDEPENDENCE_DIMENSIONS, branches: BRANCHES },
  });
}

/** @example request {"op":"propose","standing":"judiciary","branch":"judiciary","independence":{"decisions":{"protected":true}},"legalBasis":[{"instrument":"/eli/x/act/2026/1","eId":"sec_1"}]} */
export async function POST(req: NextRequest, props: { params: Promise<{ id: string }> }) {
  const { id } = await props.params;
  const b = (await req.json().catch(() => ({}))) as Record<string, unknown> & { op?: string; reason?: string };
  const m = getMinistry(id);
  if (!m) return NextResponse.json({ error: 'No such institution' }, { status: 404 });
  const s = await caseScope();
  const actor = await routeActor(b.by);
  const role = s ? roleOf(s) : undefined;
  const fail = (error: string, status = 422) => NextResponse.json({ error }, { status });
  const out = (r: object) => {
    if ('error' in r) return fail((r as { error: string }).error);
    queueMirror('institutions');
    return NextResponse.json({ result: r, terms: termsOf(getMinistry(id)!), independent: isIndependentInstitution(id), pending: getMinistry(id)!.terms?.pending ?? null });
  };
  const terms = { standing: b.standing, branch: b.branch, effectiveFrom: b.effectiveFrom, independence: b.independence, prohibitions: b.prohibitions, records: b.records };
  const op = b.op ?? 'propose';
  if (op === 'record') {
    if (s && role !== 'administrator') return fail('Only an administrator records an institution\'s standing during setup', 403);
    return out(recordTermsDuringSetup(id, { ...terms, legalBasis: b.legalBasis }, actor.name));
  }
  if (op === 'propose') {
    // One administrator proposes: of the whole government, or of the institution itself.
    if (s && (role !== 'administrator' || !(wholeGovernment(s) || s.institution === id))) return fail('An administrator of the whole government or of this institution proposes a change to its standing', 403);
    return out(proposeInstitutionTerms(id, { ...terms, change: b.change, legalBasis: b.legalBasis }, { by: actor.name, ...(actor.id ? { byId: actor.id } : {}) }));
  }
  if (op === 'confirm') {
    const r = confirmInstitutionTerms(id, { by: actor.name, ...(actor.id ? { byId: actor.id } : {}), ...(s ? { role, ...(s.institution ? { institution: s.institution } : {}) } : {}) }, { ownSigners: hasOwnSigners(id) });
    if ('error' in r && /is independent: an official who can sign there/.test(r.error)) return fail(r.error, 403);
    return out(r);
  }
  if (op === 'withdraw') {
    const pending = m.terms?.pending;
    if (s && pending && role !== 'administrator' && pending.byId !== actor.id) return fail('The proposer or an administrator withdraws a waiting change', 403);
    return out(withdrawInstitutionTerms(id, actor.name, typeof b.reason === 'string' ? b.reason : undefined));
  }
  return fail('op must be record, propose, confirm or withdraw');
}
