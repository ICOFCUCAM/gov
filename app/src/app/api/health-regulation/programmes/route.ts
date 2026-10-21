// /api/health-regulation/programmes — the register of public-health programmes
// (lib/health/programmes/register.ts; Health I4 dependency
// public-health-programmes). Administrative records and aggregates only.
//
// GET: the programmes (number, standing, terms by version, history), the
// interventions decided (area or population measures), the accepted returns
// as they may be published (publishedReturn(): every count through the
// nation's small-cell rule, the four classes kept apart, a count not available
// shown as missing, never zero), the intervention authority rules in force
// (CFG-PH-003) and the small-cell rule, each with its waiting change; counts.
// POST (administrators): the country rule sets, by two officials citing the
// law: { op: 'propose-intervention-rules', rules: [{ kind, authority,
// reviewRequired, expiryRequired }], legalBasis: [{ instrument, eId }] }, then
// { op: 'confirm-intervention-rules' } by a different official, or
// { op: 'withdraw-intervention-rules' }; the small-cell threshold the same way:
// { op: 'propose-small-cells', threshold, legalBasis }, { op:
// 'confirm-small-cells' }, { op: 'withdraw-small-cells' }. Programmes,
// interventions and returns change only through decided cases (/api/cases).
import { NextRequest, NextResponse } from 'next/server';
import { authorityFor } from '@/lib/data/store';
import { routeActor } from '@/lib/casework/actor';
import { dualControlPolicy } from '@/lib/casework/dual-control-policy';
import {
  listProgrammes, listInterventions, listPublishedReturns, interventionRules, interventionRuleChanges, programmeCounts,
  proposeInterventionRules, confirmInterventionRules, withdrawInterventionRules, PROGRAMME_STATE_LABEL, BASIS_LABEL,
} from '@/lib/health/programmes/register';
import { smallCellRule, smallCellChanges, proposeSmallCellRule, confirmSmallCellRule, withdrawSmallCellRule } from '@/lib/health/small-cells';

export const dynamic = 'force-dynamic';

const rulesNow = () => ({
  rules: interventionRules(), ruleChanges: interventionRuleChanges(), smallCells: smallCellRule(), smallCellChanges: smallCellChanges(),
});

export async function GET(req: NextRequest) {
  const programme = req.nextUrl.searchParams.get('programme')?.trim() || undefined;
  return NextResponse.json({
    programmes: listProgrammes().filter(p => !programme || p.number === programme),
    interventions: listInterventions().filter(i => !programme || i.programme === programme),
    returns: listPublishedReturns(programme),
    ...rulesNow(), counts: programmeCounts(), authorityNamed: !!authorityFor('publicHealth'),
    labels: { states: PROGRAMME_STATE_LABEL, bases: BASIS_LABEL },
  });
}

export async function POST(req: NextRequest) {
  const b = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const actor = await routeActor(b.by);
  const dc = dualControlPolicy();
  const reason = typeof b.reason === 'string' ? b.reason : undefined;
  const r = b.op === 'propose-intervention-rules' ? proposeInterventionRules(b.rules, b.legalBasis, actor.name, actor.id, new Date(), dc.pendingHours)
    : b.op === 'confirm-intervention-rules' ? confirmInterventionRules(actor.name, actor.id, new Date(), dc.requireIdentityBinding)
    : b.op === 'withdraw-intervention-rules' ? withdrawInterventionRules(actor.name, reason)
    : b.op === 'propose-small-cells' ? proposeSmallCellRule(b.threshold, b.legalBasis, actor.name, actor.id, new Date(), dc.pendingHours)
    : b.op === 'confirm-small-cells' ? confirmSmallCellRule(actor.name, actor.id, new Date(), dc.requireIdentityBinding)
    : b.op === 'withdraw-small-cells' ? withdrawSmallCellRule(actor.name, reason)
    : { error: 'op is propose-intervention-rules, confirm-intervention-rules, withdraw-intervention-rules, propose-small-cells, confirm-small-cells or withdraw-small-cells' };
  return 'error' in r ? NextResponse.json(r, { status: 422 }) : NextResponse.json({ result: r, ...rulesNow() });
}
