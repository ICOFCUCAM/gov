'use client';

// Cross-ministry referral runtime — bureaucracy spans ministries: Health
// refers a citizen to Labour for disability assessment, to Finance for
// reimbursement, to Justice for a determination. A referral is raised by
// one ministry TO another and worked: raised → accepted → actioned →
// closed. Session-persistent, deterministic seeded backlog, SSR/test-safe.

import { seed } from '@/lib/telemetry';

export type ReferralStatus = 'raised' | 'accepted' | 'actioned' | 'closed';
export const REFERRAL_FLOW: ReferralStatus[] = ['raised', 'accepted', 'actioned', 'closed'];

export interface Referral {
  id: string;
  at: number;
  fromKey: string;
  toKey: string;
  subject: string;
  by: string;
  status: ReferralStatus;
  recordRef?: string; // provenance — the originating facility record
}

type Listener = () => void;
const refs = new Map<string, Referral[]>(); // key = ministry key (the addressee inbox)
const listeners = new Set<Listener>();
let _version = 0;
let _hydrated = false;
const PERSIST_KEY = 'civicos.referral.v1';

export function version(): number { return _version; }
export function subscribe(l: Listener): () => void {
  listeners.add(l);
  return () => { listeners.delete(l); };
}
function bump() { _version++; listeners.forEach(l => l()); persist(); }

function persist() {
  if (typeof window === 'undefined') return;
  try {
    const live = [...refs.entries()].map(([k, v]) => [k, v.filter(r => !r.id.startsWith('seed-')).slice(-30)] as const);
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
    const parsed = JSON.parse(raw) as [string, Referral[]][];
    for (const [k, v] of parsed) if (Array.isArray(v)) refs.set(k, v);
  } catch { /* ignore corrupt continuity */ }
}

const PEERS = ['HEALTH', 'LABOR', 'FINANCE', 'JUSTICE', 'INTERIOR', 'EDUCATION'];
const TOPICS = ['Eligibility determination', 'Reimbursement authorisation', 'Disability assessment', 'Records cross-check', 'Benefit transfer', 'Compliance referral'];
function seedRefs(key: string, now: number): Referral[] {
  const n = 2 + Math.floor(seed(`ref:n:${key}`) * 3);
  return Array.from({ length: n }).map((_, i) => {
    const s = seed(`ref:s:${key}:${i}`);
    const from = PEERS[Math.floor(seed(`ref:f:${key}:${i}`) * PEERS.length)] ?? 'HEALTH';
    return {
      id: `seed-${key}-${i}`,
      at: now - (n - i) * 7_200_000 - Math.floor(seed(`ref:a:${key}:${i}`) * 1_800_000),
      fromKey: from === key ? 'HEALTH' : from,
      toKey: key,
      subject: TOPICS[Math.floor(seed(`ref:t:${key}:${i}`) * TOPICS.length)] ?? 'Records cross-check',
      by: 'Liaison officer',
      status: REFERRAL_FLOW[Math.min(3, Math.floor(s * 4))] ?? 'raised',
    };
  });
}

/** The inbox for a ministry — referrals addressed TO it. */
export function inbox(toKey: string, now: number): Referral[] {
  hydrate();
  if (!refs.has(toKey)) refs.set(toKey, seedRefs(toKey, now));
  else if (!refs.get(toKey)!.some(r => r.id.startsWith('seed-'))) {
    refs.set(toKey, [...seedRefs(toKey, now), ...refs.get(toKey)!]);
  }
  return refs.get(toKey)!;
}

export function raiseReferral(fromKey: string, toKey: string, subject: string, by: string, now: number, recordRef?: string): void {
  hydrate();
  const list = refs.get(toKey) ?? seedRefs(toKey, now);
  list.push({
    id: `rf-${now}-${Math.floor(seed(`rf:${toKey}:${now}`) * 1e6)}`,
    at: now, fromKey, toKey, subject: subject.trim(), by, status: 'raised',
    ...(recordRef ? { recordRef } : {}),
  });
  refs.set(toKey, list.slice(-40));
  bump();
}

/** Every referral in flight across all ministry inboxes — the national
 *  view of inter-ministry casework (newest last). */
export function referralDigest(keys: string[], now: number, limit = 12): Referral[] {
  hydrate();
  const all: Referral[] = [];
  for (const k of keys) all.push(...inbox(k, now));
  return all.sort((a, b) => a.at - b.at).slice(-limit);
}

export function advanceReferral(toKey: string, id: string, now: number): void {
  hydrate();
  const list = refs.get(toKey);
  if (!list) return;
  const r = list.find(x => x.id === id);
  if (!r) return;
  const i = REFERRAL_FLOW.indexOf(r.status);
  if (i < REFERRAL_FLOW.length - 1) { r.status = REFERRAL_FLOW[i + 1]!; bump(); }
}
