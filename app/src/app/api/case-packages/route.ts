// /api/case-packages — the nation's procedures (lib/casework/packages.ts,
// design §6.3). GET: every version with its state. POST { op: 'draft',
// package } writes a draft (officials of the responsible institution);
// { op: 'approve', key, version, activeFrom? } approves it (an official who
// can sign there, different from its author, once its tests pass);
// { op: 'install-references' } drafts the reference procedures CivicOS ships
// that the installation does not have yet (administrators; drafts only);
// { op: 'load-demonstration' } loads the demonstration set (a sample act and
// the civil procedures approved under it; administrators, demo and training
// installations only, lib/casework/demo.ts); { op: 'draft-referral',
// institution } drafts that institution's referral procedure from the
// template (its own officials or administrators; lib/casework/referral.ts).
import { NextRequest, NextResponse } from 'next/server';
import { caseActRefusal } from '@/lib/auth/roles';
import { authorityFor } from '@/lib/data/store';
import { listPackages, draftPackage, approvePackage, getPackage, ownerInstitution, runPackageTests } from '@/lib/casework/packages';
import { registeredEffects } from '@/lib/casework/engine';
import { routeActor } from '@/lib/casework/actor';
import type { CasePackage } from '@/lib/casework/types';
import { installReferenceProcedures } from '@/lib/casework/modules';
import { adminOnly } from '@/lib/auth/roles';
import { loadDemonstration } from '@/lib/casework/demo';
import { draftReferralProcedure } from '@/lib/casework/referral';

export const dynamic = 'force-dynamic';

export function GET(req: NextRequest) {
  const key = req.nextUrl.searchParams.get('key') ?? undefined;
  const packages = listPackages({ key }).map(p => ({ ...p, ownerInstitution: ownerInstitution(p.owner, authorityFor) ?? null, tests: p.tests, testResult: runPackageTests(p) }));
  return NextResponse.json({ packages, effects: registeredEffects() });
}

export async function POST(req: NextRequest) {
  const b = (await req.json().catch(() => ({}))) as { op?: string; package?: CasePackage; key?: string; version?: number; activeFrom?: string; by?: string };
  const actor = await routeActor(b.by);
  if (b.op === 'draft') {
    const p = b.package;
    if (!p || typeof p !== 'object') return NextResponse.json({ error: 'Send the procedure' }, { status: 422 });
    const owner = ownerInstitution(p.owner, authorityFor);
    if (!owner) return NextResponse.json({ error: 'Name the responsible institution under Who is responsible first' }, { status: 422 });
    if (actor.scope) {
      const why = caseActRefusal(actor.scope, { owner, sensitivity: 'normal' });
      if (why) return NextResponse.json({ error: why }, { status: 403 });
    }
    // Only what a procedure states; who wrote and approved it comes from the sign-in, never the request.
    const input = { key: p.key, version: p.version, owner: p.owner, title: p.title, refPrefix: p.refPrefix, citations: p.citations ?? [], fields: p.fields ?? [], documents: p.documents ?? [], stages: p.stages ?? [], actions: p.actions ?? [], deadlines: p.deadlines ?? [], notifications: p.notifications ?? [], ...(p.appeal ? { appeal: p.appeal } : {}), retention: p.retention, sensitivity: p.sensitivity, ...(p.migration ? { migration: p.migration } : {}), tests: p.tests ?? [] };
    const r = draftPackage(input, actor.name, actor.id, registeredEffects());
    return 'error' in r ? NextResponse.json(r, { status: 422 }) : NextResponse.json({ package: r }, { status: 201 });
  }
  if (b.op === 'approve') {
    const p = getPackage(String(b.key ?? ''), Number(b.version));
    if (!p) return NextResponse.json({ error: 'No such procedure version' }, { status: 404 });
    const owner = ownerInstitution(p.owner, authorityFor);
    if (!owner) return NextResponse.json({ error: 'Name the responsible institution under Who is responsible first' }, { status: 422 });
    if (actor.scope) {
      const why = caseActRefusal(actor.scope, { owner, sensitivity: 'normal', decision: true });
      if (why) return NextResponse.json({ error: why }, { status: 403 });
    }
    const r = approvePackage(p.key, p.version, actor.name, actor.id, b.activeFrom, registeredEffects());
    return 'error' in r ? NextResponse.json(r, { status: 422 }) : NextResponse.json({ package: r });
  }
  if (b.op === 'install-references') {
    if (actor.scope) {
      const why = adminOnly(actor.scope);
      if (why) return NextResponse.json({ error: why }, { status: 403 });
    }
    return NextResponse.json(installReferenceProcedures(actor.name));
  }
  if (b.op === 'load-demonstration') {
    if (actor.scope) {
      const why = adminOnly(actor.scope);
      if (why) return NextResponse.json({ error: why }, { status: 403 });
    }
    const r = loadDemonstration(actor.name);
    return 'error' in r ? NextResponse.json(r, { status: 422 }) : NextResponse.json(r);
  }
  if (b.op === 'draft-referral') {
    const institution = String((b as { institution?: unknown }).institution ?? '');
    if (actor.scope) {
      const why = actor.scope.institution === institution ? null : adminOnly(actor.scope);
      if (why) return NextResponse.json({ error: why }, { status: 403 });
    }
    const r = draftReferralProcedure(institution, actor.name);
    return 'error' in r ? NextResponse.json(r, { status: 422 }) : NextResponse.json(r);
  }
  return NextResponse.json({ error: 'op must be draft, approve, install-references, load-demonstration or draft-referral' }, { status: 422 });
}
