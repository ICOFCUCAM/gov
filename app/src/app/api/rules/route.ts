// /api/rules — operational rules (rate tables, tariff schedules;
// lib/law/rules.ts). GET: every version with the one in force per key, or
// ?key=&amount=&code=&on= to see what the rule in force would give.
// POST: { op: 'draft', rule } (officials of the owning authority; its tests
// run and must pass), { op: 'approve', key, version } (a different official
// who can sign there; needs its legal basis), { op: 'withdraw', key,
// version, reason }. Who acted comes from the sign-in.
import { NextRequest, NextResponse } from 'next/server';
import { caseScope } from '@/lib/auth/official';
import { canManageRule } from '@/lib/auth/roles';
import { authorityFor } from '@/lib/data/store';
import { ownerInstitution } from '@/lib/casework/packages';
import { routeActor } from '@/lib/casework/actor';
import { draftRule, approveRule, withdrawRule, listRules, ruleInForce, calculate } from '@/lib/law/rules';

export const dynamic = 'force-dynamic';

export function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams;
  const key = q.get('key') ?? undefined;
  if (key && q.get('amount')) return NextResponse.json({ calculation: calculate(key, { amountMinor: Number(q.get('amount')), ...(q.get('code') ? { code: q.get('code')! } : {}) }, q.get('on') ?? undefined) });
  const rules = listRules(key);
  const keys = [...new Set(rules.map(r => r.key))];
  return NextResponse.json({ rules, inForce: Object.fromEntries(keys.map(k => [k, ruleInForce(k)?.version ?? null])) });
}

export async function POST(req: NextRequest) {
  const b = (await req.json().catch(() => ({}))) as { op?: string; rule?: Record<string, unknown>; key?: string; version?: number; reason?: string; by?: string };
  const actor = await routeActor(b.by);
  const owner = b.op === 'draft' ? String(b.rule?.owner ?? '') : listRules(String(b.key ?? '')).find(r => r.version === Number(b.version))?.owner;
  const s = await caseScope();
  if (s) {
    const why = canManageRule(s, owner ? ownerInstitution(owner, authorityFor) : undefined, b.op === 'approve');
    if (why) return NextResponse.json({ error: why }, { status: 403 });
  }
  if (b.op === 'draft') {
    const r = draftRule(b.rule ?? {}, actor.name, actor.id);
    return 'error' in r ? NextResponse.json(r, { status: 422 }) : NextResponse.json({ rule: r }, { status: 201 });
  }
  if (b.op === 'approve') {
    const r = approveRule(String(b.key ?? ''), Number(b.version), actor.name, actor.id);
    return 'error' in r ? NextResponse.json(r, { status: 422 }) : NextResponse.json({ rule: r });
  }
  if (b.op === 'withdraw') {
    const r = withdrawRule(String(b.key ?? ''), Number(b.version), String(b.reason ?? ''), actor.name);
    return 'error' in r ? NextResponse.json(r, { status: 422 }) : NextResponse.json({ rule: r });
  }
  return NextResponse.json({ error: 'op must be draft, approve or withdraw' }, { status: 422 });
}
