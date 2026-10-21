// Health regulation (owner's Cycle 3 directive, workstream 3). Hospitals,
// clinics and pharmacies are organisations (lib/organisations/register.ts):
// their licences are standings in the `health-facilities` and `pharmacies`
// registers kept by the health regulator, their premises are registered
// sites. Professionals are on their own register (lib/professions/).
//
// This register holds only what health adds around them: capacity returns,
// aggregate counts a licensed facility reports for a period (beds, staff,
// outpatient attendances), versioned and always marked reported. Three kinds
// of data stay apart: public (who is licensed: the public registers),
// administrative (licences, inspections, returns: here and in the cases) and
// clinical (patients: never in the platform). There is no patient field
// anywhere and no national patient record. Held in platform state.

import { recordAudit } from '@/lib/data/store/audit';
import { touch } from '@/lib/data/repo/track';
import { uuid7 } from '@/lib/data/uuid7';
import { getOrganisation, current } from '@/lib/organisations/register';

export const CAPACITY_METRICS = ['beds.total', 'beds.intensive-care', 'staff.clinical', 'staff.total', 'outpatient.attendances'] as const;
export type CapacityMetric = typeof CAPACITY_METRICS[number];
const HEALTH_REGISTERS = ['health-facilities', 'pharmacies'];

export interface CapacityReturn {
  id: string;
  organisation: string;
  period: string;
  versions: { n: number; counts: Partial<Record<CapacityMetric, number>>; at: string; by: string; note?: string }[];
}

interface Db { returns: CapacityReturn[] }
const g = globalThis as unknown as { __civicosHealth?: Db };
const db = (): Db => {
  const d = touch('__civicosHealth', g.__civicosHealth ??= { returns: [] });
  d.returns ??= [];
  return d;
};
export function resetHealth(): void { g.__civicosHealth = undefined; }

/** Put back capacity returns keeping their ids (lib/portability/import.ts only: the confirmed import of an institution's own export (two officials) into an installation that holds none of these records). */
export function restoreCapacity(list: CapacityReturn[]): { restored: number } | { error: string } {
  const d = db();
  const clash = list.find(r => d.returns.some(x => x.id === r.id));
  if (clash) return { error: `Capacity return ${clash.id} is already in this installation` };
  d.returns.push(...list.map(r => structuredClone(r)));
  return { restored: list.length };
}
const clone = <T,>(x: T): T => structuredClone(x);
const PERIOD = /^\d{4}(-(0[1-9]|1[0-2])|-Q[1-4])?$/;

/** Record (or re-record, as a new version) the counts a licensed facility reported for a period. */
export function recordCapacity(input: { organisation: string; period: string; counts: Record<string, unknown>; note?: string }, by: string, now = new Date()): CapacityReturn | { error: string } {
  const o = getOrganisation(input.organisation);
  if (!o) return { error: `No organisation ${input.organisation || '(none given)'} in the register` };
  if (!o.standings.some(s => s.state === 'granted' && HEALTH_REGISTERS.includes(s.register))) return { error: `${current(o).name} is not a licensed health facility or pharmacy` };
  if (!PERIOD.test(input.period)) return { error: 'The period is a year (2026), a month (2026-03) or a quarter (2026-Q1)' };
  const counts: Partial<Record<CapacityMetric, number>> = {};
  for (const [k, v] of Object.entries(input.counts ?? {})) {
    if (!CAPACITY_METRICS.includes(k as CapacityMetric)) return { error: `Unknown count ${k}: one of ${CAPACITY_METRICS.join(', ')} (aggregates only, never patients)` };
    if (!Number.isInteger(v) || (v as number) < 0) return { error: `${k} is a whole, non-negative number` };
    counts[k as CapacityMetric] = v as number;
  }
  if (!Object.keys(counts).length) return { error: 'Report at least one count' };
  if ((counts['beds.intensive-care'] ?? 0) > (counts['beds.total'] ?? Infinity)) return { error: 'Intensive-care beds are more than all beds' };
  if ((counts['staff.clinical'] ?? 0) > (counts['staff.total'] ?? Infinity)) return { error: 'Clinical staff are more than all staff' };
  const d = db();
  let r = d.returns.find(x => x.organisation === o.number && x.period === input.period);
  const v = { counts, at: now.toISOString(), by, ...(input.note?.trim() ? { note: input.note.trim().slice(0, 500) } : {}) };
  if (r) r.versions.push({ n: r.versions.length + 1, ...v });
  else { r = { id: uuid7(), organisation: o.number, period: input.period, versions: [{ n: 1, ...v }] }; d.returns.push(r); }
  recordAudit(by, 'health.capacity.record', `Organisation:${o.number}`, 'ok', `${input.period} · version ${r.versions.length}`);
  return clone(r);
}

export const capacityOf = (organisation: string): CapacityReturn[] => db().returns.filter(r => r.organisation === organisation).map(clone);
export const allCapacity = (period?: string): CapacityReturn[] => db().returns.filter(r => !period || r.period === period).map(clone);
export const healthCounts = () => ({ returns: db().returns.length });
