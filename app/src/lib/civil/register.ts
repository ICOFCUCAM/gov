// The civil register (docs/GOVERNMENT_OPERATING_MODEL.md §8, directions
// 16.1): the people it records and their vital events (births, deaths,
// marriages), each registered by a decided case of the civil registration
// authority (lib/casework). A person is never merged into another without
// adjudication; corrections and amendments are new versions, never edits in
// place. Registration numbers are given per kind and year. Holding a person
// record does not mean holding a national identity: that is a separate
// process (directions 6.2, 6.3). Legal owner: the civil registration
// authority (deployment profile). Personal data: read only through the case
// and register rules; reads of these records are written to the access log
// by the routes. Held in platform state.

import { recordAudit } from '@/lib/data/store/audit';
import { touch } from '@/lib/data/repo/track';
import { uuid7 } from '@/lib/data/uuid7';

export type VitalKind = 'birth' | 'death' | 'marriage';
export type Sex = 'female' | 'male' | 'other' | 'unknown';

export interface PersonRef { person?: string; given?: string; family?: string }
export interface Place { text?: string; region?: string; district?: string; facility?: string }

export interface PersonVersion {
  n: number;
  names: { given: string; family: string; other?: string };
  sex: Sex;
  birth?: { date: string; place: Place };
  parents?: { mother?: PersonRef; father?: PersonRef };
  status: 'alive' | 'deceased';
  at: string; by: string; reason: string;
  /** The registration (vital event) or correction case this version comes from. */
  source: { event?: string; case?: string };
}

export interface Person {
  id: string;
  /** Identifiers by scheme: the birth registration number, and a national ID only when the identity authority issued one. */
  identifiers: Record<string, string>;
  versions: PersonVersion[];
  /** Possible duplicates found and how they were decided (never merged without adjudication). */
  matching: { other: string; score: number; decided?: 'same' | 'different'; by?: string; at: string; case?: string }[];
  createdAt: string;
  /** Created by a sample case in a demo or training run (lib/casework/engine.ts `sampleMark`); absent on real records. */
  sample?: true;
}

export interface VitalEvent {
  id: string;
  kind: VitalKind;
  registrationNumber: string;
  date: string;
  place: Place;
  /** The people it concerns: the child or the deceased, the spouses. */
  persons: { role: 'child' | 'deceased' | 'spouse'; person: string }[];
  /** Parents of a birth, informant of any event. */
  parents?: { mother?: PersonRef; father?: PersonRef };
  informant?: { name: string; relation?: string };
  case: string;
  decision?: string;
  registeredAt: string;
  late: boolean;
  amendments: { at: string; case: string; decision?: string; changed: string[] }[];
  /** Marriages: the form the law recognises (civil, customary, religious…). */
  form?: string;
  /** Registered from a sample case in a demo or training run (lib/casework/engine.ts `sampleMark`); absent on real records. */
  sample?: true;
}

interface CivilDb { persons: Person[]; events: VitalEvent[]; birthSeq: number; deathSeq: number; marriageSeq: number }
const g = globalThis as unknown as { __civicosCivil?: CivilDb };
const db = (): CivilDb => {
  const d = touch('__civicosCivil', g.__civicosCivil ??= { persons: [], events: [], birthSeq: 0, deathSeq: 0, marriageSeq: 0 });
  d.birthSeq ??= 0; d.deathSeq ??= 0; d.marriageSeq ??= 0;
  return d;
};
export function resetCivil(): void { g.__civicosCivil = undefined; }

const PREFIX: Record<VitalKind, string> = { birth: 'BR', death: 'DR', marriage: 'MR' };
const clone = <T,>(x: T): T => structuredClone(x);
export const current = (p: Person): PersonVersion => p.versions[p.versions.length - 1]!;

/** Names compared without case, accents or spacing. */
export const fold = (s: string | undefined): string => (s ?? '').normalize('NFD').replace(/\p{M}/gu, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();

/**
 * People who may be the same as the one described: same family name and
 * given name (folded) and the same date of birth score 1; same names with
 * no date 0.6; same family name, date and mother's family name 0.7. Never
 * decides: an official adjudicates.
 */
export function findMatches(q: { given?: string; family?: string; birthDate?: string; motherFamily?: string }, exceptId?: string): { person: string; score: number; registration?: string }[] {
  const out: { person: string; score: number; registration?: string }[] = [];
  for (const p of db().persons) {
    if (p.id === exceptId) continue;
    const v = current(p);
    const sameFamily = fold(v.names.family) === fold(q.family) && !!q.family;
    const sameGiven = fold(v.names.given) === fold(q.given) && !!q.given;
    const sameDate = !!q.birthDate && v.birth?.date === q.birthDate;
    const sameMother = !!q.motherFamily && fold(v.parents?.mother?.family) === fold(q.motherFamily);
    const score = sameFamily && sameGiven && sameDate ? 1 : sameFamily && sameDate && sameMother ? 0.7 : sameFamily && sameGiven && !q.birthDate ? 0.6 : 0;
    if (score) out.push({ person: p.id, score, ...(p.identifiers.birthRegistration ? { registration: p.identifiers.birthRegistration } : {}) });
  }
  return out.sort((a, b) => b.score - a.score);
}

/** Record a vital event and the person records it creates or updates; returns the registration number. */
export function registerEvent(input: {
  kind: VitalKind; date: string; place: Place; case: string; informant?: VitalEvent['informant']; late?: boolean; form?: string;
  child?: { given: string; family: string; other?: string; sex: Sex; mother?: PersonRef; father?: PersonRef };
  deceased?: string; spouses?: string[];
  /** From a sample case: the event (and a child's person record) carry the sample marker. */
  sample?: true;
}, by: string, now = new Date()): VitalEvent | { error: string } {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(input.date)) return { error: 'The date of the event must be YYYY-MM-DD' };
  if (input.date > now.toISOString().slice(0, 10)) return { error: 'The event cannot be in the future' };
  const d = db();
  if (d.events.some(e => e.case === input.case && e.kind === input.kind)) return { error: 'This case has already registered the event' };
  const at = now.toISOString();
  const persons: VitalEvent['persons'] = [];
  // Checked before a number is given, so a refused registration never uses one.
  if (input.kind === 'birth' && (!input.child?.given?.trim() || !input.child.family?.trim())) return { error: 'A birth registers the child\'s given and family names' };
  if (input.kind === 'death') {
    const p = d.persons.find(x => x.id === input.deceased);
    if (!p) return { error: 'A death is registered for a person in the register (or register their birth late first)' };
    if (current(p).status === 'deceased') return { error: 'This person\'s death is already registered' };
  }
  if (input.kind === 'marriage') {
    if (!input.spouses || input.spouses.length !== 2 || input.spouses[0] === input.spouses[1]) return { error: 'A marriage registers two different persons of the register' };
    for (const s of input.spouses) {
      const p = d.persons.find(x => x.id === s);
      if (!p) return { error: 'Both spouses must be in the register' };
      if (current(p).status === 'deceased') return { error: 'A deceased person cannot be married' };
    }
  }
  const key = `${input.kind}Seq` as 'birthSeq' | 'deathSeq' | 'marriageSeq';
  d[key] += 1;
  const registrationNumber = `${PREFIX[input.kind]}-${input.date.slice(0, 4)}-${String(d[key]).padStart(6, '0')}`;
  const id = uuid7();
  if (input.kind === 'birth') {
    const c = input.child!;
    const person: Person = {
      id: uuid7(), identifiers: { birthRegistration: registrationNumber }, matching: [], createdAt: at, ...(input.sample ? { sample: true as const } : {}),
      versions: [{ n: 1, names: { given: c.given.trim(), family: c.family.trim(), ...(c.other ? { other: c.other.trim() } : {}) }, sex: c.sex, birth: { date: input.date, place: input.place }, parents: { ...(c.mother ? { mother: c.mother } : {}), ...(c.father ? { father: c.father } : {}) }, status: 'alive', at, by, reason: 'Birth registration', source: { event: id, case: input.case } }],
    };
    d.persons.push(person);
    persons.push({ role: 'child', person: person.id });
  } else if (input.kind === 'death') {
    const p = d.persons.find(x => x.id === input.deceased)!;
    const v = current(p);
    p.versions.push({ ...clone(v), n: v.n + 1, status: 'deceased', at, by, reason: 'Death registration', source: { event: id, case: input.case } });
    persons.push({ role: 'deceased', person: p.id });
  } else {
    for (const s of input.spouses!) persons.push({ role: 'spouse', person: s });
  }
  const e: VitalEvent = { id, kind: input.kind, registrationNumber, date: input.date, place: input.place, persons, ...(input.kind === 'birth' && input.child ? { parents: { ...(input.child.mother ? { mother: input.child.mother } : {}), ...(input.child.father ? { father: input.child.father } : {}) } } : {}), ...(input.informant ? { informant: input.informant } : {}), case: input.case, registeredAt: at, late: !!input.late, amendments: [], ...(input.form ? { form: input.form } : {}), ...(input.sample ? { sample: true as const } : {}) };
  d.events.push(e);
  // The audit entry and its event carry the registration number and region, never names.
  recordAudit(by, `civil.${input.kind}.register`, `Civil:${registrationNumber}`, 'ok', `${input.kind} · ${input.date.slice(0, 7)}${input.place.region ? ` · ${input.place.region}` : ''}${input.late ? ' · late' : ''}${input.sample ? ' · sample' : ''}`);
  return clone(e);
}

export function attachDecision(eventId: string, decision: string): void {
  const e = db().events.find(x => x.id === eventId);
  if (e) e.decision = decision;
}

/** Correct or amend a person (a decided correction case): a new version; the earlier ones stay. */
export function amendPerson(personId: string, change: Partial<Pick<PersonVersion, 'names' | 'sex' | 'birth' | 'parents'>>, reason: string, caseId: string, by: string, now = new Date()): Person | { error: string } {
  const p = db().persons.find(x => x.id === personId);
  if (!p) return { error: 'No such person' };
  if (!reason?.trim()) return { error: 'Say what is corrected and why' };
  const v = current(p);
  const changed = Object.keys(change).filter(k => change[k as keyof typeof change] !== undefined);
  if (!changed.length) return { error: 'Nothing to correct' };
  p.versions.push({ ...clone(v), ...clone(change), n: v.n + 1, at: now.toISOString(), by, reason: reason.trim().slice(0, 300), source: { case: caseId } });
  for (const e of db().events) if (e.persons.some(x => x.person === personId)) e.amendments.push({ at: now.toISOString(), case: caseId, changed });
  recordAudit(by, 'civil.person.amend', `Civil:${p.identifiers.birthRegistration ?? p.id}`, 'ok', `version ${v.n + 1} · ${changed.join(', ')}`);
  return clone(p);
}

/** Record an adjudication between two person records: the same person, or different (never merged automatically). */
export function adjudicate(a: string, b: string, decided: 'same' | 'different', caseId: string, by: string, now = new Date()): { error: string } | { ok: true } {
  const pa = db().persons.find(x => x.id === a), pb = db().persons.find(x => x.id === b);
  if (!pa || !pb || a === b) return { error: 'Two different persons of the register' };
  for (const [p, o] of [[pa, b], [pb, a]] as const) p.matching.push({ other: o, score: 1, decided, by, at: now.toISOString(), case: caseId });
  recordAudit(by, 'civil.person.adjudicate', `Civil:${pa.identifiers.birthRegistration ?? a}`, 'ok', `${decided} as ${pb.identifiers.birthRegistration ?? b}`);
  return { ok: true };
}

export const getPerson = (id: string): Person | undefined => { const p = db().persons.find(x => x.id === id || x.identifiers.birthRegistration === id); return p ? clone(p) : undefined; };
export const getEvent = (idOrNumber: string): VitalEvent | undefined => { const e = db().events.find(x => x.id === idOrNumber || x.registrationNumber === idOrNumber); return e ? clone(e) : undefined; };
export const eventOfCase = (caseId: string): VitalEvent | undefined => { const e = db().events.find(x => x.case === caseId); return e ? clone(e) : undefined; };

/** Search people by names and date of birth (folded); the routes log the search. */
export function searchPersons(q: { given?: string; family?: string; birthDate?: string; registration?: string }, limit = 50): Person[] {
  return db().persons.filter(p => {
    const v = current(p);
    if (q.registration && p.identifiers.birthRegistration !== q.registration) return false;
    if (q.family && fold(v.names.family) !== fold(q.family)) return false;
    if (q.given && !fold(v.names.given).startsWith(fold(q.given))) return false;
    if (q.birthDate && v.birth?.date !== q.birthDate) return false;
    return true;
  }).slice(0, limit).map(clone);
}

/** Registered events counted by kind, month and region: the register's own administrative counts (for the twin). */
export function eventCounts(kind: VitalKind): { month: string; region: string; count: number; ids: string[] }[] {
  const by = new Map<string, { month: string; region: string; count: number; ids: string[] }>();
  for (const e of db().events) {
    if (e.kind !== kind) continue;
    const month = e.date.slice(0, 7), region = e.place.region ?? '';
    const k = `${month}|${region}`;
    const x = by.get(k) ?? { month, region, count: 0, ids: [] };
    x.count++; x.ids.push(e.id);
    by.set(k, x);
  }
  return [...by.values()].sort((a, b) => a.month.localeCompare(b.month) || a.region.localeCompare(b.region));
}

/**
 * What an aggregate counts of each registered event (the indicator register,
 * lib/indicators/methods.ts): its id, when it was registered, its region and
 * whether a sample case made it. No name, date of the event or person.
 */
export function eventFacts(kind: VitalKind): { id: string; registeredAt: string; region?: string; sample: boolean }[] {
  return db().events.filter(e => e.kind === kind).map(e => ({ id: e.id, registeredAt: e.registeredAt, ...(e.place.region ? { region: e.place.region } : {}), sample: !!e.sample }));
}

export const registerSize = () => ({ persons: db().persons.length, births: db().events.filter(e => e.kind === 'birth').length, deaths: db().events.filter(e => e.kind === 'death').length, marriages: db().events.filter(e => e.kind === 'marriage').length });
