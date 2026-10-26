// The front door's own records (plan step I13; forms catalogue Part 13 §3.1):
//
//   routings          where an application made through the front door went:
//                     the catalogue service and version, the competent
//                     institution the procedure's owner resolved to, the
//                     channel, when it was received, and, for an application
//                     made by a representative, the person represented and the
//                     representation relied on. Written once at submission
//                     (lib/frontdoor/journey.ts); the case is the engine's.
//   appointments      an appointment's confirmed time, wait-list place or
//                     cancellation, with every change kept (GOV-SVC-007, 008).
//   complaints        a service complaint's outcome (GOV-SVC-011): decides
//                     nothing about the case complained of.
//   reconsiderations  a reconsideration's outcome beside the original decision
//                     (GOV-SVC-012): the original stays as sealed; a varied or
//                     revoked decision names the correction to be made through
//                     the original procedure.
//
// Appointments, complaints and reconsiderations change only in the effects of
// the front-door procedures (lib/frontdoor/procedures.ts, decided cases).
// Nothing is deleted. Held in platform state.

import { touch } from '@/lib/data/repo/track';
import { withDefaults } from '@/lib/data/defaults';
import { recordAudit } from '@/lib/data/store/audit';

export interface Routing {
  case: string;
  ref: string;
  /** An application for a catalogue service, or a request to reconsider a decision. */
  kind: 'application' | 'reconsideration';
  /** The catalogue service and its version (an application). */
  service?: { id: string; version: number };
  procedure: { key: string; version: number };
  institution: string;
  channel: 'online' | 'assisted' | 'paper';
  receivedAt: string;
  /** Made by a representative: the representation relied on and the person represented (by id; never a name here). */
  representation?: { id: string; principal: string; agent: string };
  sample?: true;
}
export interface Appointment {
  case: string;
  institution: string;
  service: string;
  servicePoint: string;
  state: 'confirmed' | 'wait-listed' | 'cancelled' | 'attended';
  at?: string;
  history: { state: Appointment['state']; at?: string; when: string; by: string; reason?: string }[];
  sample?: true;
}
export interface ComplaintOutcome { case: string; institution: string; service?: string; relatedCase?: string; outcome: 'resolved' | 'not-upheld'; reasons: string; at: string; by: string[]; sample?: true }
export interface Reconsideration {
  case: string;
  institution: string;
  original: { id: string; ref: string; decisions: string[] };
  outcome?: 'confirmed' | 'varied' | 'revoked';
  reasons?: string;
  /** What the original procedure must now do (a varied or revoked decision is carried out there, never here). */
  correction?: string;
  decidedBy?: string[];
  at?: string;
  sample?: true;
}

type Db = { routings: Routing[]; appointments: Appointment[]; complaints: ComplaintOutcome[]; reconsiderations: Reconsideration[] };
const seed = (): Db => ({ routings: [], appointments: [], complaints: [], reconsiderations: [] });
const g = globalThis as unknown as { __civicosFrontdoor?: Db };
const db = (): Db => touch('__civicosFrontdoor', g.__civicosFrontdoor = withDefaults(g.__civicosFrontdoor ??= seed(), seed()));
export function resetFrontdoor(): void { g.__civicosFrontdoor = undefined; }
const clone = <T,>(x: T): T => structuredClone(x);

// ── changes ────────────────────────────────────────────────────────────────

/** The routing receipt of an application made through the front door (once per case). */
export function recordRouting(r: Routing, by: string): Routing {
  const d = db();
  const seen = d.routings.find(x => x.case === r.case);
  if (seen) return clone(seen);
  d.routings.push(clone(r));
  recordAudit(by, 'frontdoor.route', `Case:${r.ref}`, 'ok', `${r.service ? `service ${r.service.id}@${r.service.version}` : r.kind} → ${r.institution} under ${r.procedure.key}@${r.procedure.version} · ${r.channel}${r.representation ? ` · by a representative under ${r.representation.id}` : ''}`);
  return clone(r);
}

export function setAppointment(input: { case: string; institution: string; service: string; servicePoint: string; state: Appointment['state']; at?: string; reason?: string; when: string; by: string; sample?: true }): Appointment {
  const d = db();
  let a = d.appointments.find(x => x.case === input.case);
  if (!a) { a = { case: input.case, institution: input.institution, service: input.service, servicePoint: input.servicePoint, state: input.state, history: [], ...(input.sample ? { sample: true as const } : {}) }; d.appointments.push(a); }
  a.state = input.state;
  if (input.at) a.at = input.at; else if (input.state === 'wait-listed') delete a.at;
  if (input.servicePoint) a.servicePoint = input.servicePoint;
  a.history.push({ state: input.state, ...(input.at ? { at: input.at } : {}), when: input.when, by: input.by, ...(input.reason ? { reason: input.reason.slice(0, 300) } : {}) });
  recordAudit(input.by, 'frontdoor.appointment', `Case:${input.case}`, 'ok', `${input.state}${input.at ? ` for ${input.at}` : ''}`);
  return clone(a);
}

export function recordComplaintOutcome(o: ComplaintOutcome, by: string): ComplaintOutcome {
  db().complaints.push(clone(o));
  recordAudit(by, 'frontdoor.complaint.close', `Case:${o.case}`, 'ok', o.outcome);
  return clone(o);
}

export function admitReconsideration(r: Reconsideration, by: string): Reconsideration {
  const d = db();
  const seen = d.reconsiderations.find(x => x.case === r.case);
  if (seen) return clone(seen);
  d.reconsiderations.push(clone(r));
  recordAudit(by, 'frontdoor.reconsideration.admit', `Case:${r.case}`, 'ok', `of ${r.original.ref}`);
  return clone(r);
}

export function decideReconsideration(caseRef: string, outcome: NonNullable<Reconsideration['outcome']>, reasons: string, correction: string, by: string[], at: string, actor: string): Reconsideration | { error: string } {
  const r = db().reconsiderations.find(x => x.case === caseRef);
  if (!r) return { error: 'Admit the reconsideration first' };
  if (r.outcome) return { error: 'Already decided' };
  Object.assign(r, { outcome, reasons: reasons.slice(0, 4000), ...(correction ? { correction: correction.slice(0, 2000) } : {}), decidedBy: by, at });
  recordAudit(actor, 'frontdoor.reconsideration.decide', `Case:${caseRef}`, 'ok', `${outcome} · original ${r.original.ref} kept as sealed`);
  return clone(r);
}

// ── reads ──────────────────────────────────────────────────────────────────

export const routingOf = (caseId: string): Routing | undefined => { const r = db().routings.find(x => x.case === caseId || x.ref === caseId); return r ? clone(r) : undefined; };
export const routingsFor = (filter: { principal?: string; service?: string; institution?: string }): Routing[] =>
  db().routings.filter(r => (!filter.principal || r.representation?.principal === filter.principal) && (!filter.service || r.service?.id === filter.service) && (!filter.institution || r.institution === filter.institution)).map(clone);
export const appointmentOf = (caseRef: string): Appointment | undefined => { const a = db().appointments.find(x => x.case === caseRef); return a ? clone(a) : undefined; };
export const appointmentsOf = (institution: string): Appointment[] => db().appointments.filter(a => a.institution === institution).map(clone);
export const complaintOutcomeOf = (caseRef: string): ComplaintOutcome | undefined => { const c = db().complaints.find(x => x.case === caseRef); return c ? clone(c) : undefined; };
export const complaintsOf = (institution: string): ComplaintOutcome[] => db().complaints.filter(c => c.institution === institution).map(clone);
export const reconsiderationOf = (caseRef: string): Reconsideration | undefined => { const r = db().reconsiderations.find(x => x.case === caseRef); return r ? clone(r) : undefined; };
export const reconsiderationsOfOriginal = (originalId: string): Reconsideration[] => db().reconsiderations.filter(r => r.original.id === originalId || r.original.ref === originalId).map(clone);
export const reconsiderationsOf = (institution: string): Reconsideration[] => db().reconsiderations.filter(r => r.institution === institution).map(clone);

/** Counts (no person) for the console. */
export function frontdoorCounts(institution?: string): { routed: number; byRepresentative: number; appointments: Partial<Record<Appointment['state'], number>>; complaints: number; reconsiderations: number; decided: number } {
  const d = db();
  const mine = <T extends { institution: string }>(xs: T[]) => xs.filter(x => !institution || x.institution === institution);
  const appointments: Partial<Record<Appointment['state'], number>> = {};
  for (const a of mine(d.appointments)) appointments[a.state] = (appointments[a.state] ?? 0) + 1;
  const rec = mine(d.reconsiderations);
  return { routed: mine(d.routings).length, byRepresentative: mine(d.routings).filter(r => r.representation).length, appointments, complaints: mine(d.complaints).length, reconsiderations: rec.length, decided: rec.filter(r => r.outcome).length };
}
