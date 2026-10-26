// Transport registers (plan step I7; specification Part 3 §D.10 "Transport and
// Road Authority"; catalogue Part 9 §6 REG-TRN-001 driver and licence
// register, REG-TRN-002 vehicle register, REG-TRN-003 transport operator
// register, and the road works permits of §2.3).
//
// Four records the catalogue keeps apart, never one "approved" status
// (§4.3): a vehicle's registration and its keepers, a person's driving
// licence, an operator's licence (the operator an organisation of the
// organisations register, never a second identity) and a permit for works in
// a public road. Each is written only by the effects of the procedures of the
// body the nation names for it (vehicle and driver licensing, the road
// authority, the transport regulator: lib/transport/procedures.ts), every
// change an event with its case and sealed decision, the earlier state kept.
//
// Medical fitness to drive is never a field: where the nation's law asks for
// it, the licence keeps only the reference of a sealed document (its id and
// SHA-256 digest in the document register), read like any restricted
// document of the case. Keepers and licence holders are personal data: lists
// and counts carry the vehicle, the licence number and their states only.

import { touch } from '@/lib/data/repo/track';
import { recordAudit } from '@/lib/data/store/audit';

export interface Keeper { holderKind: 'person' | 'organisation' | 'state'; holder: string; holderRef?: string }
export interface TransportEvent { at: string; kind: string; case: string; decision?: string; by: string }

export interface Vehicle {
  number: string;
  vin: string;
  mark: string;
  category: string;
  make: string; model?: string;
  /** Personal data. */
  keepers: Keeper[];
  state: 'registered' | 'deregistered';
  history: (TransportEvent & { keepers?: Keeper[] })[];
  sample?: true;
}
export interface DrivingLicence {
  number: string;
  /** Personal data. */
  holder: { name: string; ref?: string };
  categories: string[];
  restrictions: string[];
  validFrom: string; validUntil: string;
  /** Only a sealed document's reference: never a clinical field. */
  medicalFitness?: { document: string; sha256?: string };
  state: 'valid' | 'suspended' | 'revoked';
  history: TransportEvent[];
  sample?: true;
}
export interface RoadWorksPermit {
  number: string;
  road: string;
  place: { regionCode?: string; region?: string; districtCode?: string; district?: string; point?: [number, number] };
  window: { from: string; to: string };
  closure: boolean;
  promoter: string;
  conditions: string[];
  state: 'granted';
  case: string; decision?: string; at: string;
  sample?: true;
}
export interface OperatorLicence {
  number: string;
  /** The operator: an organisation of the organisations register, by its number. */
  organisation: string;
  operatorClass: string;
  fleet: string[];
  areas: string[];
  conditions: string[];
  state: 'licensed';
  case: string; decision?: string; at: string;
  sample?: true;
}

interface Db { vehicles: Vehicle[]; licences: DrivingLicence[]; roadworks: RoadWorksPermit[]; operators: OperatorLicence[]; seq: Record<string, number> }
const g = globalThis as unknown as { __civicosTransport?: Db };
const db = (): Db => {
  const d = touch('__civicosTransport', g.__civicosTransport ??= { vehicles: [], licences: [], roadworks: [], operators: [], seq: {} });
  d.vehicles ??= []; d.licences ??= []; d.roadworks ??= []; d.operators ??= []; d.seq ??= {};
  return d;
};
export function resetTransport(): void { g.__civicosTransport = undefined; }

const clone = <T,>(x: T): T => structuredClone(x);
const next = (prefix: string, now: Date) => { const d = db(); d.seq[prefix] = (d.seq[prefix] ?? 0) + 1; return `${prefix}-${now.getUTCFullYear()}-${String(d.seq[prefix]).padStart(6, '0')}`; };

/** A vehicle identification number (ISO 3779): 17 letters and digits, never I, O or Q. */
export const VIN = /^[A-HJ-NPR-Z0-9]{17}$/;

// ── Changes (only from lib/transport/procedures.ts) ───────────────────────────

export function registerVehicle(input: Pick<Vehicle, 'vin' | 'mark' | 'category' | 'make' | 'model' | 'keepers'> & { case: string; decision?: string; by: string; sample?: boolean }, now = new Date()): Vehicle {
  const { case: ref, decision, by, sample, ...v } = input;
  const out: Vehicle = { ...clone(v), number: next('VEH', now), state: 'registered', history: [{ at: now.toISOString(), kind: 'registered', case: ref, ...(decision ? { decision } : {}), by, keepers: clone(v.keepers) }], ...(sample ? { sample: true as const } : {}) };
  db().vehicles.push(out);
  recordAudit(by, 'transport.vehicle.register', `Vehicle:${out.number}`, 'ok', `${out.mark} · ${out.category} · ${ref}`);
  return clone(out);
}
export function transferVehicle(mark: string, keepers: Keeper[], event: Omit<TransportEvent, 'at' | 'kind'>, now = new Date()): Vehicle | { error: string } {
  const v = db().vehicles.find(x => x.mark === mark && x.state === 'registered');
  if (!v) return { error: `No registered vehicle ${mark}` };
  v.keepers = clone(keepers);
  v.history.push({ ...event, at: now.toISOString(), kind: 'keeper-changed', keepers: clone(keepers) });
  recordAudit(event.by, 'transport.vehicle.transfer', `Vehicle:${v.number}`, 'ok', `${v.mark} · ${event.case}`);
  return clone(v);
}
export function issueLicence(input: Omit<DrivingLicence, 'number' | 'state' | 'history' | 'sample'> & { case: string; decision?: string; by: string; sample?: boolean }, now = new Date()): DrivingLicence {
  const { case: ref, decision, by, sample, ...l } = input;
  const out: DrivingLicence = { ...clone(l), number: next('DL', now), state: 'valid', history: [{ at: now.toISOString(), kind: 'issued', case: ref, ...(decision ? { decision } : {}), by }], ...(sample ? { sample: true as const } : {}) };
  db().licences.push(out);
  recordAudit(by, 'transport.licence.issue', `DrivingLicence:${out.number}`, 'ok', `${out.categories.join(', ')} · valid to ${out.validUntil} · ${ref}`);
  return clone(out);
}
export function grantRoadWorks(input: Omit<RoadWorksPermit, 'number' | 'state' | 'at' | 'sample'> & { sample?: boolean }, now = new Date()): RoadWorksPermit {
  const { sample, ...r } = input;
  const out: RoadWorksPermit = { ...clone(r), number: next('RWP', now), state: 'granted', at: now.toISOString(), ...(sample ? { sample: true as const } : {}) };
  db().roadworks.push(out);
  recordAudit('Road authority', 'transport.roadworks.grant', `RoadWorks:${out.number}`, 'ok', `${out.road} · ${out.window.from} to ${out.window.to}${out.closure ? ' · closure' : ''} · ${out.case}`);
  return clone(out);
}
export function licenseOperator(input: Omit<OperatorLicence, 'number' | 'state' | 'at' | 'sample'> & { sample?: boolean }, now = new Date()): OperatorLicence {
  const { sample, ...r } = input;
  const out: OperatorLicence = { ...clone(r), number: next('TOL', now), state: 'licensed', at: now.toISOString(), ...(sample ? { sample: true as const } : {}) };
  db().operators.push(out);
  recordAudit('Transport regulator', 'transport.operator.license', `OperatorLicence:${out.number}`, 'ok', `${out.organisation} · ${out.operatorClass} · ${out.fleet.length} vehicles · ${out.case}`);
  return clone(out);
}

// ── Reads ─────────────────────────────────────────────────────────────────────

export const vehicleByVin = (vin: string): Vehicle | undefined => { const v = db().vehicles.find(x => x.vin === vin.toUpperCase() && x.state === 'registered'); return v ? clone(v) : undefined; };
export const vehicleByMark = (mark: string): Vehicle | undefined => { const v = db().vehicles.find(x => x.mark.toUpperCase() === mark.toUpperCase() && x.state === 'registered'); return v ? clone(v) : undefined; };
export const licenceOfCase = (caseRef: string): DrivingLicence | undefined => { const l = db().licences.find(x => x.history[0]?.case === caseRef); return l ? clone(l) : undefined; };
export const roadWorksOfCase = (caseRef: string): RoadWorksPermit | undefined => { const r = db().roadworks.find(x => x.case === caseRef); return r ? clone(r) : undefined; };
export const operatorOfCase = (caseRef: string): OperatorLicence | undefined => { const r = db().operators.find(x => x.case === caseRef); return r ? clone(r) : undefined; };
/** The registers as lists carry them: no keeper, no holder, no medical reference. */
export function transportRegister(limit = 100) {
  const d = db();
  return {
    vehicles: d.vehicles.slice(-limit).reverse().map(v => ({ number: v.number, mark: v.mark, category: v.category, make: v.make, ...(v.model ? { model: v.model } : {}), state: v.state, keepers: v.keepers.length, events: v.history.length, ...(v.sample ? { sample: true as const } : {}) })),
    licences: d.licences.slice(-limit).reverse().map(l => ({ number: l.number, categories: l.categories, validUntil: l.validUntil, state: l.state, ...(l.sample ? { sample: true as const } : {}) })),
    roadworks: d.roadworks.slice(-limit).reverse().map(clone),
    operators: d.operators.slice(-limit).reverse().map(clone),
  };
}
export function transportCounts(): { vehicles: number; licences: number; roadworks: number; operators: number; samples: number } {
  const d = db();
  return { vehicles: d.vehicles.filter(v => v.state === 'registered').length, licences: d.licences.filter(l => l.state === 'valid').length, roadworks: d.roadworks.length, operators: d.operators.length,
    samples: [...d.vehicles, ...d.licences, ...d.roadworks, ...d.operators].filter(x => x.sample).length };
}
