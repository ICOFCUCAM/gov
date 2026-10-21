// /api/indicators — the indicator register (plan step I3; lib/indicators/).
//
// GET: every definition (owner, versions, approvals) with its current value
// computed from the records (a slot's institution, or the whole government for
// a definition each institution keeps), the small-cell rule and its waiting
// change, and the methods a definition may name. ?institution=ID gives that
// institution's values instead (the ministry workspace and /control);
// ?month=YYYY-MM another month. A value outside the reader's reach shows only
// once its institution approved the definition.
// POST: { op: 'draft', id, owner?, terms, reason } (an official of the owning
// institution), { op: 'approve', id, version, institution? } (a different
// official who can sign there), { op: 'withdraw-approval', id, reason,
// institution? }, { op: 'publish' } (the approved values to the twin now, as
// the twin ingest job does), and the small-cell rule (administrators):
// { op: 'propose-small-cells', threshold, legalBasis: [{ instrument, eId }] },
// { op: 'confirm-small-cells' } by a different official, { op:
// 'withdraw-small-cells', reason }. Who acted comes from the sign-in.
import { NextRequest, NextResponse } from 'next/server';
import { routeActor } from '@/lib/casework/actor';
import { refusal } from '@/lib/auth/official';
import { adminOnly } from '@/lib/auth/roles';
import { dualControlPolicy } from '@/lib/casework/dual-control-policy';
import { getMinistry } from '@/lib/data/store';
import { listDefinitions, draftVersion, approveVersion, withdrawApproval, ownerInstitutionOf, ownerLabel, approvedAt } from '@/lib/indicators/register';
import { registerValues, institutionValues, monthPeriod } from '@/lib/indicators/compute';
import { indicatorSmallCells } from '@/lib/indicators/disclosure';
import { publishIndicators } from '@/lib/indicators/twin';
import { METHODS } from '@/lib/indicators/methods';

export const dynamic = 'force-dynamic';

const rule = () => ({ smallCells: indicatorSmallCells.rule(), smallCellChanges: indicatorSmallCells.changes() });

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams;
  const month = q.get('month') ?? undefined;
  const viewer = (await routeActor()).scope;
  const institution = q.get('institution')?.trim();
  const period = monthPeriod(month);
  if (institution) {
    if (!getMinistry(institution)) return NextResponse.json({ error: 'No such institution' }, { status: 404 });
    return NextResponse.json({ institution, period, values: institutionValues(institution, { month, viewer }), ...rule() });
  }
  const definitions = listDefinitions().map(d => {
    const owner = ownerInstitutionOf(d.owner);
    return {
      id: d.id, owner: d.owner, ownerLabel: ownerLabel(d.owner), ownerInstitution: owner ? { id: owner, name: getMinistry(owner)?.name ?? owner } : owner === '' ? null : undefined,
      latest: d.versions.at(-1), versions: d.versions.length, approvals: d.approvals, approvedAt: approvedAt(d).map(id => ({ id, name: getMinistry(id)?.name ?? id })),
    };
  });
  return NextResponse.json({ period, definitions, values: registerValues({ month, viewer }), methods: METHODS.map(m => ({ id: m.id, version: m.version, label: m.label, unit: m.unit, geography: m.geography, coverage: m.coverage, params: m.params ?? [] })), ...rule() });
}

export async function POST(req: NextRequest) {
  const b = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const actor = await routeActor(b.by);
  const who = { name: actor.name, ...(actor.id ? { id: actor.id } : {}), scope: actor.scope };
  const dc = dualControlPolicy();
  if (typeof b.op === 'string' && b.op.endsWith('small-cells')) {
    const no = await refusal(adminOnly, { register: 'indicators', id: 'small-cells' });
    if (no) return no;
  }
  const reason = typeof b.reason === 'string' ? b.reason : undefined;
  const r = b.op === 'draft' ? draftVersion({ id: b.id, owner: b.owner, terms: b.terms, reason: b.reason }, who)
    : b.op === 'approve' ? approveVersion(b.id, b.version, who, { institution: b.institution })
    : b.op === 'withdraw-approval' ? withdrawApproval(b.id, who, b.reason, { institution: b.institution })
    : b.op === 'publish' ? await publishIndicators(actor.name, true)
    : b.op === 'propose-small-cells' ? indicatorSmallCells.propose(b.threshold, b.legalBasis, actor.name, actor.id, new Date(), dc.pendingHours)
    : b.op === 'confirm-small-cells' ? indicatorSmallCells.confirm(actor.name, actor.id, new Date(), dc.requireIdentityBinding)
    : b.op === 'withdraw-small-cells' ? indicatorSmallCells.withdraw(actor.name, reason)
    : { error: 'op is draft, approve, withdraw-approval, publish, propose-small-cells, confirm-small-cells or withdraw-small-cells' };
  if ('error' in r && r.error) return NextResponse.json({ error: r.error }, { status: /^(Auditors|An indicator is|Approving an indicator)/.test(r.error) ? 403 : 422 });
  return NextResponse.json({ result: r, ...rule() });
}
