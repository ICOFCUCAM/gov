// Housing programmes, applications and allocations (plan step I7;
// specification Part 3 §D.13 "Housing programmes and public housing assets";
// supplement Part 20 HPC-HOU-001 … 004: "Housing allocation must use
// transparent, approved eligibility and priority rules").
//
// A programme's terms are its rules: the eligibility criteria an applicant
// must meet and the priority factors with the points each carries, entered by
// the nation's officials (none ship) and approved by two officials citing the
// law, each version kept with its digest. An application is assessed against
// the version in force: an officer records, criterion by criterion, whether
// it is met and on what evidence; eligibility is whether every criterion is
// met, and the priority is the sum of the points of the factors recorded, by
// that version. The allocation of a home is decided by an official with
// reasons; it records the terms version and, where an eligible applicant with
// more points still waits, says so (out of order), so the reasons have to
// carry it. Nothing allocates on its own.
//
// Applicants and their household are personal data; this register keeps the
// assessment and the decision, never income figures or health details (the
// evidence stays a document of the case). Written only by the housing
// procedures' effects (lib/housing/procedures.ts).

import { createHash } from 'node:crypto';
import { touch } from '@/lib/data/repo/track';
import { recordAudit } from '@/lib/data/store/audit';

export interface Criterion { key: string; label: string }
export interface PriorityFactor { key: string; label: string; points: number }
export interface ProgrammeTerms { n: number; eligibility: Criterion[]; priority: PriorityFactor[]; digest: string; case: string; decision?: string; at: string }
export interface HousingUnit { ref: string; region?: string; parcel?: string; rooms?: number; state: 'available' | 'allocated'; allocatedTo?: string }
export interface HousingProgramme { number: string; title: string; case: { id: string; ref: string }; terms: ProgrammeTerms[]; units: HousingUnit[]; state: 'active' | 'closed'; at: string; sample?: true }

export interface CriterionAnswer { key: string; met: boolean; evidence?: string }
export interface HousingApplication {
  number: string;
  programme: string;
  case: { id: string; ref: string };
  householdSize?: number;
  state: 'applied' | 'eligible' | 'ineligible' | 'allocated' | 'withdrawn';
  assessment?: { terms: number; answers: CriterionAnswer[]; eligible: boolean; factors: string[]; points: number; by: string; at: string };
  allocation?: { unit: string; terms: number; decision?: string; reasons: string; outOfOrder: boolean; higherWaiting: number; by: string; at: string };
  at: string;
  sample?: true;
}

interface Db { programmes: HousingProgramme[]; applications: HousingApplication[]; seq: Record<string, number> }
const g = globalThis as unknown as { __civicosHousing?: Db };
const db = (): Db => {
  const d = touch('__civicosHousing', g.__civicosHousing ??= { programmes: [], applications: [], seq: {} });
  d.programmes ??= []; d.applications ??= []; d.seq ??= {};
  return d;
};
export function resetHousing(): void { g.__civicosHousing = undefined; }

const clone = <T,>(x: T): T => structuredClone(x);
const next = (prefix: string, now: Date) => { const d = db(); d.seq[prefix] = (d.seq[prefix] ?? 0) + 1; return `${prefix}-${now.getUTCFullYear()}-${String(d.seq[prefix]).padStart(6, '0')}`; };
const KEY = /^[a-z][a-z0-9-]{0,40}$/;
export const termsDigest = (t: Pick<ProgrammeTerms, 'eligibility' | 'priority'>) => createHash('sha256').update(JSON.stringify([t.eligibility, t.priority]), 'utf8').digest('hex');

/** Read terms as officials enter them: criteria `key | label`, factors `key | label | points`, units `ref | region | parcel | rooms`. */
export function readTerms(input: { eligibility: string; priority: string }): Pick<ProgrammeTerms, 'eligibility' | 'priority'> | { error: string } {
  const rows = (v: string) => v.split('\n').map(x => x.trim()).filter(Boolean).map(l => l.split('|').map(x => x.trim()));
  const eligibility: Criterion[] = [];
  for (const [i, [key = '', label = '']] of rows(input.eligibility).entries()) {
    if (!KEY.test(key) || !label) return { error: `Criterion ${i + 1}: key | label (a short lower-case key, then the criterion as the law states it)` };
    eligibility.push({ key, label });
  }
  if (!eligibility.length) return { error: 'Give the eligibility criteria the law sets: one per line, key | label' };
  const priority: PriorityFactor[] = [];
  for (const [i, [key = '', label = '', pts = '']] of rows(input.priority).entries()) {
    const points = Number(pts);
    if (!KEY.test(key) || !label || !Number.isInteger(points) || points < 0 || points > 1000) return { error: `Priority factor ${i + 1}: key | label | points (a whole number the approved rules give it)` };
    priority.push({ key, label, points });
  }
  if (new Set([...eligibility.map(c => c.key)]).size !== eligibility.length || new Set(priority.map(f => f.key)).size !== priority.length) return { error: 'Each criterion and factor once' };
  return { eligibility, priority };
}
export function readUnits(v: string): HousingUnit[] | { error: string } {
  const out: HousingUnit[] = [];
  for (const [i, l] of v.split('\n').map(x => x.trim()).filter(Boolean).entries()) {
    const [ref = '', region = '', parcel = '', rooms = ''] = l.split('|').map(x => x.trim());
    if (!ref) return { error: `Home ${i + 1}: give its reference` };
    const n = rooms ? Number(rooms) : undefined;
    if (n !== undefined && (!Number.isInteger(n) || n < 1 || n > 50)) return { error: `Home ${i + 1}: rooms is a whole number` };
    out.push({ ref, ...(region ? { region } : {}), ...(parcel ? { parcel } : {}), ...(n ? { rooms: n } : {}), state: 'available' });
  }
  if (new Set(out.map(u => u.ref)).size !== out.length) return { error: 'Each home once' };
  return out;
}

// ── Changes (only from lib/housing/procedures.ts) ─────────────────────────────

export function registerProgramme(input: { title: string; case: { id: string; ref: string }; terms: Pick<ProgrammeTerms, 'eligibility' | 'priority'>; units: HousingUnit[]; decision?: string; sample?: boolean }, now = new Date()): HousingProgramme {
  const existing = db().programmes.find(p => p.case.id === input.case.id);
  if (existing) return clone(existing);
  const p: HousingProgramme = {
    number: next('HPG', now), title: input.title, case: input.case, units: clone(input.units), state: 'active', at: now.toISOString(),
    terms: [{ n: 1, ...clone(input.terms), digest: termsDigest(input.terms), case: input.case.ref, ...(input.decision ? { decision: input.decision } : {}), at: now.toISOString() }],
    ...(input.sample ? { sample: true as const } : {}),
  };
  db().programmes.push(p);
  recordAudit('Housing', 'housing.programme.register', `HousingProgramme:${p.number}`, 'ok', `${p.title} · ${p.terms[0]!.eligibility.length} criteria, ${p.terms[0]!.priority.length} priority factors, ${p.units.length} homes · ${input.case.ref}`);
  return clone(p);
}

export function receiveApplication(input: { programme: string; case: { id: string; ref: string }; householdSize?: number; sample?: boolean }, now = new Date()): HousingApplication {
  const existing = db().applications.find(a => a.case.id === input.case.id);
  if (existing) return clone(existing);
  const a: HousingApplication = { number: next('HAP', now), programme: input.programme, case: input.case, ...(input.householdSize ? { householdSize: input.householdSize } : {}), state: 'applied', at: now.toISOString(), ...(input.sample ? { sample: true as const } : {}) };
  db().applications.push(a);
  return clone(a);
}

export function recordAssessment(caseId: string, assessment: NonNullable<HousingApplication['assessment']>): HousingApplication | { error: string } {
  const a = db().applications.find(x => x.case.id === caseId);
  if (!a) return { error: 'No housing application is recorded for this case' };
  a.assessment = clone(assessment);
  a.state = assessment.eligible ? 'eligible' : 'ineligible';
  return clone(a);
}

export function allocate(caseId: string, allocation: NonNullable<HousingApplication['allocation']>): HousingApplication | { error: string } {
  const a = db().applications.find(x => x.case.id === caseId);
  if (!a) return { error: 'No housing application is recorded for this case' };
  const p = db().programmes.find(x => x.number === a.programme);
  const u = p?.units.find(x => x.ref === allocation.unit);
  if (!p || !u || u.state !== 'available') return { error: 'That home is not available' };
  u.state = 'allocated'; u.allocatedTo = a.number;
  a.allocation = clone(allocation); a.state = 'allocated';
  recordAudit(allocation.by, 'housing.allocate', `HousingApplication:${a.number}`, 'ok', `${p.number} · home ${u.ref} · terms v${allocation.terms}${allocation.outOfOrder ? ` · out of priority order (${allocation.higherWaiting} with more points waiting), with reasons` : ''}`);
  return clone(a);
}
export function closeApplication(caseId: string, state: 'ineligible' | 'withdrawn'): HousingApplication | { error: string } {
  const a = db().applications.find(x => x.case.id === caseId);
  if (!a) return { error: 'No housing application is recorded for this case' };
  a.state = state;
  return clone(a);
}

// ── Reads ─────────────────────────────────────────────────────────────────────

export const getProgramme = (number: string): HousingProgramme | undefined => { const p = db().programmes.find(x => x.number === number); return p ? clone(p) : undefined; };
export const termsInForce = (p: HousingProgramme): ProgrammeTerms => p.terms.at(-1)!;
export const applicationOfCase = (caseId: string): HousingApplication | undefined => { const a = db().applications.find(x => x.case.id === caseId); return a ? clone(a) : undefined; };
export const applicationsOf = (programme: string): HousingApplication[] => db().applications.filter(a => a.programme === programme).map(clone);
/** Eligible applications still waiting in a programme, by priority points (most first), then the earliest. */
export function waitingList(programme: string): HousingApplication[] {
  return db().applications.filter(a => a.programme === programme && a.state === 'eligible')
    .sort((x, y) => (y.assessment?.points ?? 0) - (x.assessment?.points ?? 0) || x.at.localeCompare(y.at)).map(clone);
}
export const listProgrammes = (): HousingProgramme[] => db().programmes.map(clone);
export function housingCounts(): { programmes: number; homes: number; available: number; applications: number; eligible: number; allocated: number; outOfOrder: number; samples: number } {
  const d = db();
  const homes = d.programmes.flatMap(p => p.units);
  return {
    programmes: d.programmes.length, homes: homes.length, available: homes.filter(u => u.state === 'available').length,
    applications: d.applications.length, eligible: d.applications.filter(a => a.state === 'eligible').length, allocated: d.applications.filter(a => a.state === 'allocated').length,
    outOfOrder: d.applications.filter(a => a.allocation?.outOfOrder).length, samples: [...d.programmes, ...d.applications].filter(x => x.sample).length,
  };
}
