// /api/services — the public service catalogue for officials (plan step I13,
// lib/frontdoor/catalogue.ts). GET: every service with every version (proposed,
// published, superseded, withdrawn), its status computed now from the records
// (never stored) and the reasons when it is not what the owner declared, its
// journey (?journey=<id>: discover → authenticate → apply → route → track →
// decision → challenge, each step ready or not connected), the front-door
// procedure templates and which institutions adopted them, the identity route
// for citizens. The public sees only published entries (/api/public/services,
// /services).
//
// POST (signed-in officials; checked in lib/frontdoor against the owner):
//   { op: 'propose', id?, terms, reason }        an official of the owning institution (a new service, or a new version)
//   { op: 'publish', id }                        a different person who can sign at the owning institution
//   { op: 'withdraw', id, reason }               the proposer, or one who could publish it
//   { op: 'retire', id, reason, plan }           propose retiring a published service (the record is kept)
//   { op: 'decide-retirement', id, decision }    confirm (a different official who can sign there) or withdraw
//   { op: 'adopt', institution }                 an administrator or one who can sign there drafts the institution's
//                                                own front-door procedures (svc.*), approved by a second official
import { NextRequest, NextResponse } from 'next/server';
import { caseScope } from '@/lib/auth/official';
import { roleOf } from '@/lib/auth/roles';
import { routeActor } from '@/lib/casework/actor';
import { getMinistry, listMinistries } from '@/lib/data/store';
import { listPackages } from '@/lib/casework/packages';
import { AUTHORITIES } from '@/lib/nation/deployment';
import { listServices, serviceStatus, proposeService, publishService, withdrawServiceVersion, proposeRetirement, decideRetirement, ownerLabel, catalogueCounts, STATUS_LABEL, SERVICE_CHANNELS, CHANNEL_LABEL } from '@/lib/frontdoor/catalogue';
import { serviceJourney, identityRoute } from '@/lib/frontdoor/journey';
import { FRONTDOOR_PROCEDURES, installFrontdoorProcedures, frontdoorKey } from '@/lib/frontdoor/procedures';
import '@/lib/casework/modules';

export const dynamic = 'force-dynamic';

const str = (v: unknown, max = 200) => (typeof v === 'string' ? v.trim().slice(0, max) : '');

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams;
  const j = q.get('journey');
  if (j) {
    const r = serviceJourney(j);
    return r ? NextResponse.json(r) : NextResponse.json({ error: 'No published service of the catalogue has that id' }, { status: 404 });
  }
  const now = new Date();
  const packages = listPackages();
  return NextResponse.json({
    services: listServices().map(e => {
      const s = serviceStatus(e, now);
      const current = e.versions.filter(v => v.state === 'published').at(-1) ?? e.versions.at(-1)!;
      return { id: e.id, name: current.terms.name, owner: ownerLabel(current.terms.owner), status: s.shown, statusLabel: STATUS_LABEL[s.shown], reasons: s.reasons, stages: s.stages.map(x => x.label), procedure: s.procedure, fee: s.fee,
        versions: e.versions, retirement: e.retirement ?? [], ...(e.sample ? { sample: true } : {}) };
    }),
    counts: catalogueCounts(now),
    identity: identityRoute(),
    channels: SERVICE_CHANNELS.map(k => ({ key: k, label: CHANNEL_LABEL[k] })),
    slots: AUTHORITIES.map(a => ({ key: a.key, label: a.label })),
    institutions: listMinistries().map(m => ({ id: m.id, name: m.name })),
    templates: FRONTDOOR_PROCEDURES.map(t => ({ key: t.key, title: t.title, forms: t.forms, adoptedBy: packages.filter(p => p.key.startsWith(`${t.key}.`) && p.state !== 'superseded').map(p => ({ key: p.key, institution: p.owner, state: p.state, version: p.version })) })),
  });
}

export async function POST(req: NextRequest) {
  const b = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const s = await caseScope();
  const who = await routeActor(b.by);
  const actor = { name: who.name, ...(who.id ? { id: who.id } : {}), scope: s };
  const op = str(b.op, 40);
  // A refusal about who may act answers 403; one about the record, 422.
  const send = (r: object | { error: string }) => ('error' in r ? NextResponse.json(r, { status: /officials of|can sign|Auditors|signed-in official/.test((r as { error: string }).error) ? 403 : 422 }) : NextResponse.json(r));
  if (op === 'propose') return send(proposeService({ id: b.id, terms: b.terms, reason: b.reason, ...(b.sample === true ? { sample: true } : {}) }, actor));
  if (op === 'publish') return send(publishService(b.id, actor));
  if (op === 'withdraw') return send(withdrawServiceVersion(b.id, b.reason, actor));
  if (op === 'retire') return send(proposeRetirement(b.id, { reason: b.reason, plan: b.plan }, actor));
  if (op === 'decide-retirement') return send(decideRetirement(b.id, b.decision, actor));
  if (op === 'adopt') {
    const inst = str(b.institution, 120);
    if (!getMinistry(inst)) return NextResponse.json({ error: 'No such institution' }, { status: 404 });
    if (s && (s.institution !== inst || !['administrator', 'signatory'].includes(roleOf(s)))) return NextResponse.json({ error: 'An administrator or an official who can sign at the institution drafts its own front-door procedures' }, { status: 403 });
    const r = installFrontdoorProcedures(inst, who.name, who.id);
    return 'error' in r ? NextResponse.json(r, { status: 422 }) : NextResponse.json({ ...r, keys: FRONTDOOR_PROCEDURES.map(t => frontdoorKey(t.key, inst)) });
  }
  return NextResponse.json({ error: 'op is propose, publish, withdraw, retire, decide-retirement or adopt' }, { status: 400 });
}
