// The citizen and business journey (plan step I13; forms catalogue Part 13
// §3.1): discover → authenticate or choose a lawful alternative → apply →
// routed to the competent institution → track → receive the decision →
// complete or challenge. Built on what exists, never beside it:
//
//   discover      the published catalogue (lib/frontdoor/catalogue.ts), its public page
//                 (/services) and the site search;
//   authenticate  the nation's identity provider (deployment.identity.citizens, OpenID
//                 Connect: lib/auth/citizen-oidc.ts); no identity system of its own. Where
//                 none is configured it says so, and names the lawful alternatives the
//                 nation allows (assisted at an office, paper);
//   apply         the procedure's own form through submitForm() (lib/casework/engine.ts:
//                 the same checks and messages as the form in the browser);
//   route         to the institution the procedure's owner resolves to through the
//                 deployment profile (authorityFor()), recorded with a receipt
//                 (lib/frontdoor/register.ts recordRouting());
//   track         stage, deadlines and sealed decisions of the person's own cases (and
//                 those a representation lets them follow);
//   challenge     reconsideration as a case under the deciding institution's own
//                 procedure (svc.reconsideration.<institution>).
//
// A representative acts only within the representation the person granted
// (lib/frontdoor/representation.ts); every act records both persons.

import { submitForm, openCase, listCases, getCase, type Refusal } from '@/lib/casework/engine';
import { activePackage, getPackage, ownerInstitution } from '@/lib/casework/packages';
import { authorityFor, getMinistry, getSovereign } from '@/lib/data/store';
import { recordAudit } from '@/lib/data/store/audit';
import { getDecision } from '@/lib/records/decisions';
import { certificatesFor } from '@/lib/records/certificates';
import { samplesAllowed } from '@/lib/ops/mode';
import { getService, publicService, publishedVersion, serviceStatus, type PublicService } from './catalogue';
import { recordRouting, routingOf, reconsiderationsOfOriginal, type Routing } from './register';
import { frontdoorKey } from './procedures';
import { representationCovering, type Citizen } from './representation';
import type { Case } from '@/lib/casework/types';

/** How people prove who they are for a service: the nation's identity provider, or the lawful alternatives it allows. */
export interface IdentityRoute {
  provider: { issuer: string; assurance?: string } | null;
  /** Offices take applications for people who cannot authenticate digitally (the nation's choice; on unless it turned it off). */
  assisted: boolean;
  statement: string;
}

export function identityRoute(): IdentityRoute {
  const id = getSovereign().deployment?.identity;
  const provider = id?.citizens?.issuer ? { issuer: id.citizens.issuer, ...(id.citizens.assurance ? { assurance: id.citizens.assurance } : {}) } : null;
  const assisted = id?.assisted !== false;
  const statement = provider
    ? `Sign in through the nation's identity provider (${provider.issuer})${assisted ? ', or apply in person at an office, where an official records the identity document seen' : ''}.`
    : `No identity provider is connected for citizens: online sign-in is not available${samplesAllowed() ? ' (this demonstration signs in a demo citizen instead)' : ''}.${assisted ? ' Apply in person at an office, where an official records the identity document seen, or on paper.' : ' The nation has not enabled assisted applications at offices.'}`;
  return { provider, assisted, statement };
}

export type StepState = 'ready' | 'not-connected' | 'not-applicable';
export interface JourneyStep { key: 'discover' | 'authenticate' | 'apply' | 'route' | 'track' | 'decision' | 'challenge'; label: string; state: StepState; detail: string }

/** The journey of one published service, each step computed from the records (never a promise the platform cannot keep). */
export function serviceJourney(id: string, on = new Date()): { service: PublicService; steps: JourneyStep[] } | null {
  const e = getService(id);
  const pub = e ? publicService(e, on) : null;
  if (!e || !pub) return null;
  const v = publishedVersion(e)!;
  const st = serviceStatus(e, on);
  const ident = identityRoute();
  const pkg = v.terms.procedure ? activePackage(v.terms.procedure, on.toISOString().slice(0, 10)) : undefined;
  const takes = st.shown === 'active' || st.shown === 'pilot';
  const recon = st.owner ? activePackage(frontdoorKey('svc.reconsideration', st.owner.id), on.toISOString().slice(0, 10)) : undefined;
  const decisions = pkg?.actions.filter(a => a.decision) ?? [];
  const info = v.terms.declared === 'informational';
  const steps: JourneyStep[] = [
    { key: 'discover', label: 'Find the service', state: 'ready', detail: `${pub.name}: ${pub.statusLabel}${pub.reasons.length ? ` (${pub.reasons.join('; ')})` : ''}` },
    { key: 'authenticate', label: 'Prove who you are', state: info ? 'not-applicable' : ident.provider || samplesAllowed() ? 'ready' : ident.assisted ? 'ready' : 'not-connected', detail: info ? 'Information only: nothing to sign in for' : ident.statement },
    { key: 'apply', label: 'Apply', state: info ? 'not-applicable' : takes && pub.channels.some(c => c.key === 'online') ? 'ready' : 'not-connected', detail: info ? 'Information only' : takes ? `${pkg?.form ? 'The form' : 'The application'} of ${pkg?.title ?? v.terms.procedure}; channels: ${pub.channels.map(c => c.label).join(', ')}` : `Not taking applications: ${st.reasons.join('; ')}` },
    { key: 'route', label: 'Sent to the institution responsible', state: info ? 'not-applicable' : st.owner && pkg ? 'ready' : 'not-connected', detail: st.owner ? `${st.owner.name} decides it under its own procedure${pkg ? ` (${pkg.key}, version ${pkg.version})` : ''}` : 'No institution is named as responsible for it yet' },
    { key: 'track', label: 'Follow it', state: info ? 'not-applicable' : pkg ? 'ready' : 'not-connected', detail: pkg ? `Stages: ${pkg.stages.map(s => s.label).join(' → ')}` : 'No procedure in force' },
    { key: 'decision', label: 'Receive the decision', state: info ? 'not-applicable' : decisions.length ? 'ready' : 'not-connected', detail: decisions.length ? `A sealed decision with its reasons and the law it cites (${decisions.map(a => a.label.toLowerCase()).join(', ')}); checked at /verify` : 'No decision step in force' },
    { key: 'challenge', label: 'Ask for it to be reconsidered', state: info ? 'not-applicable' : recon ? 'ready' : 'not-connected', detail: recon ? `${st.owner!.name} reconsiders its own decisions by officials who took no part in them${v.terms.review ? `; ${v.terms.review}` : ''}` : `${st.owner?.name ?? 'The institution'} has no approved reconsideration procedure yet${v.terms.review ? `; ${v.terms.review}` : ''}` },
  ];
  return { service: pub, steps };
}

const today = (now: Date) => now.toISOString().slice(0, 10);

/** Apply for a catalogue service through the front door (self-service), as oneself or for a person one represents. */
export async function applyForService(citizen: Citizen, input: { service?: unknown; fields?: Record<string, unknown>; declaration?: { version?: unknown }; locale?: unknown; idempotencyKey?: unknown; onBehalfOf?: unknown }, now = new Date()): Promise<{ case: Case; routing: Routing } | Refusal> {
  const e = getService(String(input.service ?? ''));
  const v = e ? publishedVersion(e) : undefined;
  if (!e || !v) return { error: 'No published service of the catalogue has that id' };
  const st = serviceStatus(e, now);
  if (st.shown !== 'active' && st.shown !== 'pilot') return { error: st.shown === 'informational' ? 'This service is information only: it takes no application' : `This service is not taking applications: ${st.reasons.join('; ') || st.shown}` };
  if (!v.terms.channels.includes('online')) return { error: 'This service does not take applications online: use the channels it lists' };
  const pkg = activePackage(v.terms.procedure!, today(now))!;
  const owner = ownerInstitution(pkg.owner, authorityFor)!;
  let representation: { id: string; principal: { id: string; name: string } } | undefined;
  const principal = typeof input.onBehalfOf === 'string' ? input.onBehalfOf.trim().slice(0, 120) : '';
  if (principal) {
    if (!v.terms.representatives) return { error: 'This service does not allow someone to apply for another person' };
    const d = representationCovering(citizen.sub, principal, pkg.key, 'apply', today(now));
    if ('error' in d) return d;
    representation = { id: d.id, principal: { id: d.principal.id, name: d.principal.name } };
  }
  const key = typeof input.idempotencyKey === 'string' ? input.idempotencyKey.slice(0, 80) : '';
  const c = await submitForm({
    procedure: pkg.key, fields: input.fields ?? {}, source: 'citizen',
    applicant: { kind: 'person', id: citizen.sub, name: citizen.name },
    ...(representation ? { onBehalfOf: { kind: 'person' as const, id: representation.principal.id, name: representation.principal.name }, delegation: representation.id } : {}),
    ...(pkg.form ? { channel: 'self-service' as const } : {}),
    ...(typeof input.declaration?.version === 'string' ? { declaration: { version: input.declaration.version.slice(0, 20) } } : {}),
    ...(typeof input.locale === 'string' ? { locale: input.locale.slice(0, 3) } : {}),
    ...(key ? { idempotencyKey: `citizen:${citizen.sub}:${key}` } : {}),
  }, { id: `citizen:${citizen.sub}`, name: citizen.demo ? 'Demo citizen' : `Citizen (${citizen.name})`, scope: null }, now);
  if ('error' in c) return c;
  const routing = recordRouting({ case: c.id, ref: c.ref, kind: 'application', service: { id: e.id, version: v.n }, procedure: { key: pkg.key, version: pkg.version }, institution: owner, channel: 'online', receivedAt: c.openedAt,
    ...(representation ? { representation: { id: representation.id, principal: representation.principal.id, agent: citizen.sub } } : {}), ...(e.sample ? { sample: true as const } : {}) }, 'Front door');
  // Every act of a representative records both persons (here by reference: the representation and the case, never names).
  if (representation) recordAudit('Front door', 'representation.act', `Case:${c.ref}`, 'ok', `apply under representation ${representation.id}`);
  return { case: c, routing };
}

export interface Tracked {
  id: string; ref: string; procedure: string; service?: string; institution: string; stage: string; openedAt: string; closedAt: string | null;
  /** Made by or for whom (from this person's point of view). */
  role: 'own' | 'made for you' | 'made by you for another';
  deadlines: { label: string; due: string; met?: string; lapsed?: string; sample?: true }[];
  decisions: { id: string; decision: string; at: string }[];
  certificates: { code: string; title: string; status: string }[];
  challenge: { available: boolean; why?: string };
  reconsiderations: { ref: string; outcome?: string }[];
}

/** Whether a decided case can be challenged through the front door now, and under which procedure. */
function challengeOf(c: Case, on: Date): { available: boolean; why?: string; key?: string } {
  if (!c.closedAt || !c.decisions.length) return { available: false, why: 'Nothing is decided yet' };
  if (c.package.key.startsWith('svc.reconsideration.')) return { available: false, why: 'A reconsideration is not reconsidered again here: the further review route is the one its decision names' };
  const key = frontdoorKey('svc.reconsideration', c.owner);
  if (!activePackage(key, today(on))) return { available: false, why: `${getMinistry(c.owner)?.name ?? c.owner} has no approved reconsideration procedure yet` };
  const open = reconsiderationsOfOriginal(c.id).length || listCases({ procedure: key, limit: 1000 }).some(x => x.fields.originalCase === c.ref && !x.closedAt);
  if (open) return { available: false, why: 'A reconsideration of this decision has already been asked for' };
  return { available: true, key };
}

/** The cases a person follows: their own, those made for them, and those they made for others. */
export function trackFor(citizen: Citizen, now = new Date()): Tracked[] {
  const all = listCases({ limit: 1000 }).filter(x => x.source === 'citizen' && (x.applicant?.id === citizen.sub || x.onBehalfOf?.id === citizen.sub));
  return all.map(x => {
    const p = getPackage(x.package.key, x.package.version);
    const r = routingOf(x.id);
    const ch = challengeOf(x, now);
    const role: Tracked['role'] = x.onBehalfOf?.id === citizen.sub ? 'made for you' : x.onBehalfOf ? 'made by you for another' : 'own';
    return {
      id: x.id, ref: x.ref, procedure: p?.title ?? x.package.key, ...(r?.service ? { service: getService(r.service.id) ? publishedVersion(getService(r.service.id)!)?.terms.name ?? r.service.id : r.service.id } : {}),
      institution: getMinistry(x.owner)?.name ?? x.owner, stage: p?.stages.find(s => s.key === x.stage)?.label ?? x.stage, openedAt: x.openedAt, closedAt: x.closedAt ?? null, role,
      deadlines: x.deadlines.map(d => ({ label: d.label, due: d.due, ...(d.met ? { met: d.met } : {}), ...(d.lapsed ? { lapsed: d.lapsed } : {}), ...(d.sample ? { sample: true as const } : {}) })),
      decisions: x.decisions.map(id => { const d = getDecision(id); return { id, decision: d?.content.decision ?? '', at: d?.content.at ?? '' }; }),
      certificates: certificatesFor(x.decisions).map(c => ({ code: c.code, title: c.title, status: c.status })),
      challenge: { available: ch.available, ...(ch.why ? { why: ch.why } : {}) },
      reconsiderations: listCases({ limit: 1000 }).filter(y => y.package.key.startsWith('svc.reconsideration.') && y.fields.originalCase === x.ref).map(y => ({ ref: y.ref, ...(y.closedAt ? { outcome: getPackage(y.package.key, y.package.version)?.stages.find(s => s.key === y.stage)?.label ?? y.stage } : {}) })),
    };
  });
}

/** Ask for a decided case to be reconsidered (the applicant, the person it was made for, or a representative allowed to challenge). */
export function requestReconsideration(citizen: Citizen, input: { case?: unknown; grounds?: unknown; newEvidence?: unknown }, now = new Date()): { case: Case; routing: Routing } | Refusal {
  const original = getCase(String(input.case ?? ''));
  if (!original || original.source !== 'citizen') return { error: 'No such application' };
  const mine = original.applicant?.id === citizen.sub || original.onBehalfOf?.id === citizen.sub;
  let representation: string | undefined;
  if (!mine) return { error: 'You can ask only about your own applications, or those made for you' };
  if (original.onBehalfOf && original.applicant?.id === citizen.sub) {
    // A representative challenges only within the representation the person granted.
    const d = representationCovering(citizen.sub, original.onBehalfOf.id!, original.package.key, 'challenge', today(now));
    if ('error' in d) return d;
    representation = d.id;
  }
  const ch = challengeOf(original, now);
  if (!ch.available) return { error: ch.why ?? 'Not open to reconsideration' };
  const grounds = typeof input.grounds === 'string' ? input.grounds.trim().slice(0, 8000) : '';
  if (grounds.length < 10) return { error: 'Say why the decision should be reconsidered' };
  const c = openCase({
    procedure: ch.key!, source: 'citizen', applicant: { kind: 'person', id: citizen.sub, name: citizen.name },
    ...(original.onBehalfOf ? { onBehalfOf: original.onBehalfOf } : {}), ...(representation ? { delegation: representation } : {}),
    fields: { originalCase: original.ref, grounds, ...(typeof input.newEvidence === 'string' && input.newEvidence.trim() ? { newEvidence: input.newEvidence.trim().slice(0, 4000) } : {}) },
    idempotencyKey: `citizen:${citizen.sub}:reconsider:${original.ref}`,
  }, { id: `citizen:${citizen.sub}`, name: citizen.demo ? 'Demo citizen' : `Citizen (${citizen.name})`, scope: null }, now);
  if ('error' in c) return c;
  const pkg = getPackage(c.package.key, c.package.version)!;
  const routing = recordRouting({ case: c.id, ref: c.ref, kind: 'reconsideration', procedure: { key: pkg.key, version: pkg.version }, institution: c.owner, channel: 'online', receivedAt: c.openedAt,
    ...(representation && original.onBehalfOf ? { representation: { id: representation, principal: original.onBehalfOf.id!, agent: citizen.sub } } : {}) }, 'Front door');
  if (representation) recordAudit('Front door', 'representation.act', `Case:${c.ref}`, 'ok', `challenge under representation ${representation}`);
  return { case: c, routing };
}
