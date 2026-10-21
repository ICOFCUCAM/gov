// /api/seal-keys — the seal key register (lib/keys/seal-register.ts): which
// keys may seal decisions and certificates, their validity, who approved each
// under which law, compromise and review. The legal process behind each
// approval is the nation's; the platform records it.
// GET: every key with its history, the country's seal-key rules, the
// authority that approves (named in Who is responsible), the key the key
// provider presents now and where it stands, keys that sealed decisions but
// are not in the register (historic candidates), and waiting steps.
// POST { op }:
//   'propose'   { purpose?, publicKeyPem?, historic?, validFrom?, validUntil?, legalBasis: [{ instrument, eId }], resolution?, reason? }
//               an administrator or a signatory of the seal keys authority; without publicKeyPem the key presented now;
//   'approve'   { id, resolution? } an official who can sign at the seal keys authority (a different person each time);
//   'withdraw'  { id, reason } a waiting proposal;
//   'report-compromise' { id, compromisedFrom?, reason } stops the key sealing at once;
//   'confirm-compromise' { id } a different official, at once (no waiting period): revoked;
//   'withdraw-compromise' { id, reason } an unconfirmed report;
//   'review-compromise' { id, outcome: 'upheld' | 'earlier', compromisedFrom?, note } the authority's later review;
//   'propose-rules' { authority?, approvers?, legislatureResolution?, reviewWithinDays?, legalBasis } an administrator;
//   'confirm-rules' / 'withdraw-rules' { reason? } a different official.
// Who acted comes from the sign-in, never the request.
import { NextRequest, NextResponse } from 'next/server';
import { routeActor } from '@/lib/casework/actor';
import { signer } from '@/lib/keys/custody';
import {
  listSealKeys, sealKeyRules, sealKeyAuthority, waitingSealKeys, presentedStanding, registerSince, lapseSealKeyRules,
  proposeSealKey, approveSealKey, withdrawSealKey, reportCompromise, confirmCompromise, withdrawCompromise, reviewCompromise,
  proposeSealKeyRules, confirmSealKeyRules, withdrawSealKeyRules, fingerprintOf, type SealActor,
} from '@/lib/keys/seal-register';
import { listDecisions, sealedAt } from '@/lib/records/decisions';
import { getMinistry } from '@/lib/data/store';
import { AUTHORITIES } from '@/lib/nation/deployment';
import { installationMode } from '@/lib/ops/mode';

export const dynamic = 'force-dynamic';

async function presented(): Promise<string | undefined> {
  try { return (await signer('decision').load()).publicKeyPem; } catch { return undefined; }
}

export async function GET() {
  lapseSealKeyRules();
  const keys = listSealKeys();
  const rules = sealKeyRules();
  const authority = sealKeyAuthority();
  const pem = await presented();
  const s = signer('decision');
  // Keys that sealed decisions but are in no record of the register: candidates for historic registration.
  const known = new Set(keys.map(k => k.keyId));
  const seen = new Map<string, { keyId: string; publicKeyPem: string; count: number; first: string; last: string }>();
  for (const d of listDecisions()) {
    if (known.has(d.seal.keyId)) continue;
    const at = sealedAt(d);
    const e = seen.get(d.seal.keyId) ?? { keyId: d.seal.keyId, publicKeyPem: d.seal.publicKeyPem, count: 0, first: at, last: at };
    e.count++; if (at < e.first) e.first = at; if (at > e.last) e.last = at;
    seen.set(d.seal.keyId, e);
  }
  return NextResponse.json({
    keys, rules, mode: installationMode(),
    authority: { slot: rules.authority, label: AUTHORITIES.find(a => a.key === rules.authority)?.label ?? rules.authority, ...(authority ? { id: authority, name: getMinistry(authority)?.name ?? authority } : {}) },
    presented: pem ? { ...presentedStanding('decision', pem), source: s.source, development: !s.production, publicKeyPem: fingerprintOf(pem)?.pem } : null,
    since: registerSince('decision') ?? null,
    historicCandidates: [...seen.values()],
    waiting: waitingSealKeys(),
  });
}

/** @example request {"op":"propose","legalBasis":[{"instrument":"/eli/x/act/2026/4","eId":"sec_12"}],"reason":"Annual key change"} */
export async function POST(req: NextRequest) {
  const b = (await req.json().catch(() => ({}))) as Record<string, unknown> & { op?: string };
  const a = await routeActor(b.by);
  const actor: SealActor = { by: a.name, ...(a.id ? { byId: a.id } : {}), scope: a.scope };
  const out = (r: object, created = false) => ('error' in r
    ? NextResponse.json(r, { status: /^(Only|An administrator|Auditors|Sign in|Name the seal keys authority)/.test((r as { error: string }).error) ? 403 : 422 })
    : NextResponse.json({ result: r }, { status: created ? 201 : 200 }));
  const id = typeof b.id === 'string' ? b.id : '';
  const reason = typeof b.reason === 'string' ? b.reason : '';
  switch (b.op) {
    case 'propose': return out(proposeSealKey({ purpose: b.purpose, publicKeyPem: b.publicKeyPem, historic: b.historic, validFrom: b.validFrom, validUntil: b.validUntil, legalBasis: b.legalBasis, resolution: b.resolution, reason: b.reason }, actor, await presented()), true);
    case 'approve': return out(approveSealKey(id, { resolution: b.resolution }, actor, await presented()));
    case 'withdraw': return out(withdrawSealKey(id, reason, actor));
    case 'report-compromise': return out(reportCompromise(id, { compromisedFrom: b.compromisedFrom, reason: b.reason }, actor));
    case 'confirm-compromise': return out(confirmCompromise(id, actor));
    case 'withdraw-compromise': return out(withdrawCompromise(id, reason, actor));
    case 'review-compromise': return out(reviewCompromise(id, { outcome: b.outcome, compromisedFrom: b.compromisedFrom, note: b.note }, actor));
    case 'propose-rules': return out(proposeSealKeyRules({ authority: b.authority, approvers: b.approvers, legislatureResolution: b.legislatureResolution, reviewWithinDays: b.reviewWithinDays, legalBasis: b.legalBasis }, actor));
    case 'confirm-rules': return out(confirmSealKeyRules(actor));
    case 'withdraw-rules': return out(withdrawSealKeyRules(actor, reason || undefined));
    default: return NextResponse.json({ error: 'op must be propose, approve, withdraw, report-compromise, confirm-compromise, withdraw-compromise, review-compromise, propose-rules, confirm-rules or withdraw-rules' }, { status: 422 });
  }
}
