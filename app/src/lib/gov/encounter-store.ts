'use client';

// Service-encounter store — the platform let the public *appear* to talk to
// the state directly while officials only saw dashboards. A service
// encounter is the live, two-way exchange between a PUBLIC actor (patient,
// citizen, applicant) and the OFFICIAL serving them THROUGH a facility
// (clinician at a hospital, officer at a station, assessor at a branch):
// real turns an operator can post, persisted across navigation, seeded with
// a deterministic prior exchange so a thread is never empty. SSR-safe and
// inert under test (no window) so engine determinism is unaffected.

import { seed } from '@/lib/telemetry';

export type EncounterAuthor = 'OFFICIAL' | 'PUBLIC';
export type EncounterKind = 'note' | 'question' | 'instruction' | 'result';
export interface EncounterMsg {
  id: string;
  at: number;
  author: EncounterAuthor;
  name: string;
  kind: EncounterKind;
  body: string;
  seeded?: boolean;
}

type Listener = () => void;
const threads = new Map<string, EncounterMsg[]>(); // key = scope
const listeners = new Set<Listener>();
let _version = 0;
let _hydrated = false;
const PERSIST_KEY = 'civicos.encounter.v1';

export function version(): number { return _version; }
export function subscribe(l: Listener): () => void {
  listeners.add(l);
  return () => { listeners.delete(l); };
}
function bump() { _version++; listeners.forEach(l => l()); persist(); }

function persist() {
  if (typeof window === 'undefined') return;
  try {
    const live = [...threads.entries()].map(([k, v]) => [k, v.filter(m => !m.seeded).slice(-40)] as const);
    window.localStorage.setItem(PERSIST_KEY, JSON.stringify(live));
  } catch { /* continuity degrades to session-only */ }
}
function hydrate() {
  if (_hydrated) return;
  _hydrated = true;
  if (typeof window === 'undefined') return;
  try {
    const raw = window.localStorage.getItem(PERSIST_KEY);
    if (!raw) return;
    const parsed = JSON.parse(raw) as [string, EncounterMsg[]][];
    for (const [k, v] of parsed) if (Array.isArray(v)) threads.set(k, v);
  } catch { /* ignore corrupt continuity */ }
}

const SEED_TURNS: { author: EncounterAuthor; kind: EncounterKind; body: string }[] = [
  { author: 'PUBLIC', kind: 'question', body: 'Following up — are the latest results back, and is the current plan unchanged?' },
  { author: 'OFFICIAL', kind: 'result', body: 'Results received and filed at the facility; values within expected range.' },
  { author: 'OFFICIAL', kind: 'instruction', body: 'Continue the current regimen; book a review in two weeks through the desk.' },
  { author: 'PUBLIC', kind: 'note', body: 'Understood — symptoms easing, will keep to the schedule and report any change.' },
  { author: 'OFFICIAL', kind: 'note', body: 'Encounter committed to the facility record and rolled to the ministry registry.' },
];

/** Deterministic prior exchange so an encounter thread is never empty. */
function seedThread(scope: string, official: string, pub: string, now: number): EncounterMsg[] {
  const n = 3 + Math.floor(seed(`enc:n:${scope}`) * 3);
  return Array.from({ length: n }).map((_, i) => {
    const t = SEED_TURNS[Math.floor(seed(`enc:t:${scope}:${i}`) * SEED_TURNS.length)] ?? SEED_TURNS[0]!;
    return {
      id: `seed-${scope}-${i}`,
      at: now - (n - i) * 2_400_000 - Math.floor(seed(`enc:a:${scope}:${i}`) * 600_000),
      author: t.author,
      name: t.author === 'OFFICIAL' ? official : pub,
      kind: t.kind, body: t.body, seeded: true,
    };
  });
}

export function thread(scope: string, official: string, pub: string, now: number): EncounterMsg[] {
  hydrate();
  if (!threads.has(scope)) threads.set(scope, seedThread(scope, official, pub, now));
  else if (!threads.get(scope)!.some(m => m.seeded)) {
    threads.set(scope, [...seedThread(scope, official, pub, now), ...threads.get(scope)!]);
  }
  return threads.get(scope)!;
}

export function post(scope: string, msg: Omit<EncounterMsg, 'id' | 'at' | 'seeded'>, now: number): void {
  hydrate();
  const list = threads.get(scope) ?? seedThread(scope, msg.name, msg.name, now);
  list.push({ ...msg, id: `m-${now}-${Math.floor(seed(`m:${scope}:${now}`) * 1e6)}`, at: now });
  threads.set(scope, list.slice(-60));
  bump();
}
