// Legal deadlines in calendar or working days (docs/GOVERNMENT_OPERATING_MODEL.md §6.4):
// working days skip the nation's non-working weekdays and public holidays
// (deployment profile calendar). Pure.

import { DEFAULT_CALENDAR } from '@/lib/nation/deployment';

type Cal = { workingDays: number[]; holidays: { date: string }[] };

/** The date `days` after `start` (ISO time), counted in calendar or working days; returns an ISO date at the end of that day (UTC). */
export function addDays(start: string, days: number, kind: 'calendar' | 'working', cal: Cal = DEFAULT_CALENDAR): string {
  const d = new Date(start.slice(0, 10) + 'T00:00:00Z');
  if (kind === 'calendar') { d.setUTCDate(d.getUTCDate() + days); return d.toISOString().slice(0, 10); }
  const holidays = new Set(cal.holidays.map(h => h.date));
  const working = new Set(cal.workingDays.length ? cal.workingDays : DEFAULT_CALENDAR.workingDays);
  let left = days;
  while (left > 0) {
    d.setUTCDate(d.getUTCDate() + 1);
    if (working.has(d.getUTCDay()) && !holidays.has(d.toISOString().slice(0, 10))) left--;
  }
  return d.toISOString().slice(0, 10);
}

/** Whether a due date (YYYY-MM-DD, inclusive) has passed at `now`. */
export const lapsed = (due: string, now: Date): boolean => now.toISOString().slice(0, 10) > due;
