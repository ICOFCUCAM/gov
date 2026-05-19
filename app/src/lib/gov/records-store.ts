'use client';

// Facility records runtime — the vision is that an actor's dealings are
// CAPTURED by the actor, HELD at their facility first, COMMITTED to the
// facility register, ROLLED to the ministry and only then SYNCED to the
// national system. This is that flow made real and operable: an operator
// files a record at a facility and walks it up the chain stage by stage,
// persisted across navigation, with a deterministic seeded backlog so a
// register is never empty. SSR/test-safe (no window).

import { seed } from '@/lib/telemetry';

export type RecordStage = 'captured' | 'held' | 'committed' | 'rolled' | 'synced';
export const STAGE_ORDER: RecordStage[] = ['captured', 'held', 'committed', 'rolled', 'synced'];

export interface FiledRecord {
  id: string;
  at: number;
  ministryKey: string;
  facilityId: string;
  ref: string;
  subject: string;
  byActor: string;
  stage: RecordStage;
}

type Listener = () => void;
const regs = new Map<string, FiledRecord[]>(); // key = `${ministryKey}:${facilityId}`
const listeners = new Set<Listener>();
let _version = 0;
let _hydrated = false;
const PERSIST_KEY = 'civicos.records.v1';

export function version(): number { return _version; }
export function subscribe(l: Listener): () => void {
  listeners.add(l);
  return () => { listeners.delete(l); };
}
function bump() { _version++; listeners.forEach(l => l()); persist(); }

function persist() {
  if (typeof window === 'undefined') return;
  try {
    const live = [...regs.entries()].map(([k, v]) => [k, v.filter(r => !r.id.startsWith('seed-')).slice(-30)] as const);
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
    const parsed = JSON.parse(raw) as [string, FiledRecord[]][];
    for (const [k, v] of parsed) if (Array.isArray(v)) regs.set(k, v);
  } catch { /* ignore corrupt continuity */ }
}

const SUBJECTS = ['Intake assessment', 'Status review', 'Disposition note', 'Compliance return', 'Field report', 'Case update'];
function seedRecords(key: string, recordNoun: string, now: number): FiledRecord[] {
  const [ministryKey, facilityId] = key.split(':');
  const n = 2 + Math.floor(seed(`rec:n:${key}`) * 3);
  return Array.from({ length: n }).map((_, i) => {
    const st = seed(`rec:s:${key}:${i}`);
    const stage = STAGE_ORDER[Math.min(STAGE_ORDER.length - 1, Math.floor(st * STAGE_ORDER.length))]!;
    return {
      id: `seed-${key}-${i}`,
      at: now - (n - i) * 5_400_000 - Math.floor(seed(`rec:a:${key}:${i}`) * 1_800_000),
      ministryKey: ministryKey ?? '', facilityId: facilityId ?? '',
      ref: `${(facilityId ?? 'FAC')}-${recordNoun.slice(0, 3).toUpperCase()}-${String(100 + i)}`,
      subject: SUBJECTS[Math.floor(seed(`rec:m:${key}:${i}`) * SUBJECTS.length)] ?? 'Status review',
      byActor: 'Facility actor',
      stage,
    };
  });
}

export function records(ministryKey: string, facilityId: string, recordNoun: string, now: number): FiledRecord[] {
  hydrate();
  const key = `${ministryKey}:${facilityId}`;
  if (!regs.has(key)) regs.set(key, seedRecords(key, recordNoun, now));
  else if (!regs.get(key)!.some(r => r.id.startsWith('seed-'))) {
    regs.set(key, [...seedRecords(key, recordNoun, now), ...regs.get(key)!]);
  }
  return regs.get(key)!;
}

export function fileRecord(ministryKey: string, facilityId: string, subject: string, byActor: string, recordNoun: string, now: number): void {
  hydrate();
  const key = `${ministryKey}:${facilityId}`;
  const list = regs.get(key) ?? seedRecords(key, recordNoun, now);
  const seq = list.length + 1;
  list.push({
    id: `r-${now}-${Math.floor(seed(`r:${key}:${now}`) * 1e6)}`,
    at: now, ministryKey, facilityId,
    ref: `${facilityId}-${recordNoun.slice(0, 3).toUpperCase()}-${String(100 + seq)}`,
    subject: subject.trim(), byActor, stage: 'captured',
  });
  regs.set(key, list.slice(-40));
  bump();
}

export function advanceRecord(ministryKey: string, facilityId: string, id: string, now: number): void {
  hydrate();
  const list = regs.get(`${ministryKey}:${facilityId}`);
  if (!list) return;
  const r = list.find(x => x.id === id);
  if (!r) return;
  const i = STAGE_ORDER.indexOf(r.stage);
  if (i < STAGE_ORDER.length - 1) { r.stage = STAGE_ORDER[i + 1]!; bump(); }
}
