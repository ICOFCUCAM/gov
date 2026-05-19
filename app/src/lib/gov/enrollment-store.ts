'use client';

// Ministry enrollment runtime — every ministry runs enrolment desks where
// actors are registered INTO a facility (not the state directly). This is
// a session-persistent registry: operator enrolments persist across
// navigation; seeded baseline enrolment is deterministic so a desk is
// never empty. SSR/test-safe (no window) — engine determinism unaffected.

import { seed } from '@/lib/telemetry';

export interface Enrollment {
  id: string;
  at: number;
  ministryKey: string;
  facilityId: string;
  name: string;
  role: string;
  status: 'pending' | 'verified' | 'active';
  by: string;
}

type Listener = () => void;
const regs = new Map<string, Enrollment[]>(); // key = `${ministryKey}:${facilityId}`
const listeners = new Set<Listener>();
let _version = 0;
let _hydrated = false;
const PERSIST_KEY = 'civicos.enrol.v1';

export function version(): number { return _version; }
export function subscribe(l: Listener): () => void {
  listeners.add(l);
  return () => { listeners.delete(l); };
}
function bump() { _version++; listeners.forEach(l => l()); persist(); }

function persist() {
  if (typeof window === 'undefined') return;
  try {
    const live = [...regs.entries()].map(([k, v]) => [k, v.filter(e => !e.id.startsWith('seed-')).slice(-30)] as const);
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
    const parsed = JSON.parse(raw) as [string, Enrollment[]][];
    for (const [k, v] of parsed) if (Array.isArray(v)) regs.set(k, v);
  } catch { /* ignore corrupt continuity */ }
}

const NAMES = ['Amara Okonkwo', 'Kofi Mensah', 'Lena Larsen', 'Tariq Haddad', 'Mei Nakamura', 'Ravi Khan', 'Nadia Diallo', 'Diego Vargas'];
function seedRegs(key: string, role: string, now: number): Enrollment[] {
  const [ministryKey, facilityId] = key.split(':');
  const n = 2 + Math.floor(seed(`enr:n:${key}`) * 3);
  return Array.from({ length: n }).map((_, i) => {
    const s = seed(`enr:s:${key}:${i}`);
    return {
      id: `seed-${key}-${i}`,
      at: now - (n - i) * 86_400_000 - Math.floor(seed(`enr:a:${key}:${i}`) * 3_600_000),
      ministryKey: ministryKey ?? '', facilityId: facilityId ?? '',
      name: NAMES[Math.floor(seed(`enr:m:${key}:${i}`) * NAMES.length)] ?? 'Amara Okonkwo',
      role,
      status: s > 0.7 ? 'active' : s > 0.4 ? 'verified' : 'pending',
      by: 'Facility registrar',
    };
  });
}

export function enrollments(ministryKey: string, facilityId: string, role: string, now: number): Enrollment[] {
  hydrate();
  const key = `${ministryKey}:${facilityId}`;
  if (!regs.has(key)) regs.set(key, seedRegs(key, role, now));
  else if (!regs.get(key)!.some(e => e.id.startsWith('seed-'))) {
    regs.set(key, [...seedRegs(key, role, now), ...regs.get(key)!]);
  }
  return regs.get(key)!;
}

export function enroll(ministryKey: string, facilityId: string, name: string, role: string, by: string, now: number): void {
  hydrate();
  const key = `${ministryKey}:${facilityId}`;
  const list = regs.get(key) ?? seedRegs(key, role, now);
  list.push({
    id: `e-${now}-${Math.floor(seed(`e:${key}:${now}`) * 1e6)}`,
    at: now, ministryKey, facilityId, name: name.trim(), role,
    status: 'pending', by,
  });
  regs.set(key, list.slice(-40));
  bump();
}

/** National roll-up of the enrolment registers — counts across the given
 *  ministry:facility keys (the apex view of enrolment load). */
export function enrollmentTally(keys: { ministryKey: string; facilityId: string; role: string }[], now: number): { total: number; pending: number; active: number } {
  hydrate();
  let total = 0, pending = 0, active = 0;
  for (const { ministryKey, facilityId, role } of keys) {
    for (const e of enrollments(ministryKey, facilityId, role, now)) {
      total++;
      if (e.status === 'pending') pending++;
      else if (e.status === 'active') active++;
    }
  }
  return { total, pending, active };
}

export function advanceEnrollment(ministryKey: string, facilityId: string, id: string, now: number): void {
  hydrate();
  const key = `${ministryKey}:${facilityId}`;
  const list = regs.get(key);
  if (!list) return;
  const e = list.find(x => x.id === id);
  if (!e) return;
  e.status = e.status === 'pending' ? 'verified' : 'active';
  bump();
}
