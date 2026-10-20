// Court hearings (directions 16.4, Gate 5): the hearings each court case has
// scheduled, adjourned, held or vacated, kept by the judiciary's procedures
// (lib/courts/procedures.ts). The public cause list shows what is heard
// where and when by case number, court and kind, never the parties' names
// or what the case is about (a court may publish more under its own rules,
// through its public site). Judgments are the case's sealed decisions; their
// publication with redaction is the court's decision, not built here.
// Held in platform state.

import { recordAudit } from '@/lib/data/store/audit';
import { touch } from '@/lib/data/repo/track';
import { uuid7 } from '@/lib/data/uuid7';

export type HearingState = 'scheduled' | 'held' | 'adjourned' | 'vacated';
export interface Hearing {
  id: string;
  case: string;
  caseRef: string;
  court: string;
  kind: string;
  at: string;
  room?: string;
  state: HearingState;
  history: { state: HearingState; at: string; by: string; reason?: string }[];
}

interface Db { hearings: Hearing[] }
const g = globalThis as unknown as { __civicosHearings?: Db };
const db = (): Db => { const d = touch('__civicosHearings', g.__civicosHearings ??= { hearings: [] }); d.hearings ??= []; return d; };
export function resetHearings(): void { g.__civicosHearings = undefined; }
const clone = <T,>(x: T): T => structuredClone(x);
const WHEN = /^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2})?$/;

export function scheduleHearing(input: { case: string; caseRef: string; court: string; kind: string; at: string; room?: string }, by: string, now = new Date()): Hearing | { error: string } {
  if (!WHEN.test(input.at)) return { error: 'The hearing needs its date (and time): YYYY-MM-DD or YYYY-MM-DDTHH:MM' };
  if (input.at.slice(0, 10) < now.toISOString().slice(0, 10)) return { error: 'A hearing is scheduled for today or later' };
  const h: Hearing = { id: uuid7(), case: input.case, caseRef: input.caseRef, court: input.court, kind: (input.kind || 'hearing').slice(0, 80), at: input.at, ...(input.room ? { room: input.room.slice(0, 80) } : {}), state: 'scheduled', history: [{ state: 'scheduled', at: now.toISOString(), by }] };
  db().hearings.push(h);
  recordAudit(by, 'court.hearing.schedule', `Case:${input.caseRef}`, 'ok', `${h.kind} on ${h.at}${h.room ? ` in ${h.room}` : ''}`);
  return clone(h);
}

/** The case's next scheduled hearing becomes held, adjourned or vacated. */
export function concludeHearing(caseId: string, state: Exclude<HearingState, 'scheduled'>, by: string, reason?: string, now = new Date()): Hearing | { error: string } {
  const h = db().hearings.filter(x => x.case === caseId && x.state === 'scheduled').sort((a, b) => a.at.localeCompare(b.at))[0];
  if (!h) return { error: 'No hearing is scheduled for this case' };
  h.state = state;
  h.history.push({ state, at: now.toISOString(), by, ...(reason ? { reason: reason.slice(0, 300) } : {}) });
  recordAudit(by, `court.hearing.${state}`, `Case:${h.caseRef}`, 'ok', `${h.kind} of ${h.at}`);
  return clone(h);
}

export const hearingsOf = (caseId: string): Hearing[] => db().hearings.filter(h => h.case === caseId).map(clone);

export interface CauseListEntry { caseRef: string; court: string; kind: string; at: string; room?: string }

/** The public cause list: scheduled hearings from a date, by case number, court and kind only. */
export function causeList(from: string, days = 7): CauseListEntry[] {
  const end = new Date(Date.parse(`${from}T00:00:00Z`) + days * 86_400_000).toISOString().slice(0, 10);
  return db().hearings.filter(h => h.state === 'scheduled' && h.at.slice(0, 10) >= from && h.at.slice(0, 10) < end)
    .sort((a, b) => a.at.localeCompare(b.at))
    .map(h => ({ caseRef: h.caseRef, court: h.court, kind: h.kind, at: h.at, ...(h.room ? { room: h.room } : {}) }));
}
