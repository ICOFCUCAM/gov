// Archetype-specific service operations. Each ministry archetype runs a
// distinct set of real service KPIs (Health: ICU occupancy, ambulance
// dispatch, outbreak Rt…; Treasury: collection rate…; etc.). Pure &
// deterministic — the operational signature of the institution.

import { wave, seed } from '@/lib/telemetry';
import type { ArchetypeKey } from '@/lib/api/types';

export interface ServiceKpi { l: string; unit: string; lo: number; hi: number; good: 'high' | 'low' }

const SVC: Partial<Record<ArchetypeKey, ServiceKpi[]>> = {
  HEALTH: [
    { l: 'Bed availability', unit: '%', lo: 40, hi: 92, good: 'high' },
    { l: 'ICU occupancy', unit: '%', lo: 55, hi: 98, good: 'low' },
    { l: 'Ambulance dispatch', unit: 'min', lo: 6, hi: 24, good: 'low' },
    { l: 'Outbreak Rt', unit: '', lo: 6, hi: 24, good: 'low' },
    { l: 'Pharmacy stock', unit: 'd', lo: 8, hi: 60, good: 'high' },
    { l: 'Diagnostics throughput', unit: '/h', lo: 40, hi: 96, good: 'high' },
    { l: 'Vaccination coverage', unit: '%', lo: 55, hi: 96, good: 'high' },
    { l: 'Mortality index', unit: '', lo: 4, hi: 22, good: 'low' },
  ],
  FINANCE: [
    { l: 'Revenue collection', unit: '%', lo: 70, hi: 99, good: 'high' },
    { l: 'Budget execution', unit: '%', lo: 60, hi: 98, good: 'high' },
    { l: 'Disbursement latency', unit: 'd', lo: 2, hi: 30, good: 'low' },
    { l: 'Procurement integrity', unit: '%', lo: 78, hi: 99, good: 'high' },
    { l: 'Debt service ratio', unit: '%', lo: 8, hi: 34, good: 'low' },
    { l: 'Audit exceptions', unit: '', lo: 0, hi: 20, good: 'low' },
  ],
  ENERGY: [
    { l: 'Grid frequency', unit: 'Hz', lo: 48, hi: 50, good: 'high' },
    { l: 'Reserve margin', unit: '%', lo: 6, hi: 28, good: 'high' },
    { l: 'Outage minutes', unit: '/d', lo: 0, hi: 90, good: 'low' },
    { l: 'Generation mix clean', unit: '%', lo: 35, hi: 82, good: 'high' },
    { l: 'Electrification', unit: '%', lo: 60, hi: 98, good: 'high' },
    { l: 'Transformer load', unit: '%', lo: 45, hi: 95, good: 'low' },
  ],
  TRANSPORT: [
    { l: 'Network availability', unit: '%', lo: 70, hi: 99, good: 'high' },
    { l: 'Port dwell time', unit: 'h', lo: 8, hi: 72, good: 'low' },
    { l: 'Transit on-time', unit: '%', lo: 55, hi: 95, good: 'high' },
    { l: 'Road incidents', unit: '/d', lo: 2, hi: 40, good: 'low' },
    { l: 'Corridor throughput', unit: '%', lo: 45, hi: 93, good: 'high' },
  ],
  AGRICULTURE: [
    { l: 'Strategic grain', unit: 'd', lo: 20, hi: 120, good: 'high' },
    { l: 'Irrigation coverage', unit: '%', lo: 40, hi: 88, good: 'high' },
    { l: 'Market price index', unit: '', lo: 90, hi: 140, good: 'low' },
    { l: 'Extension reach', unit: '%', lo: 45, hi: 90, good: 'high' },
    { l: 'Crop-health alerts', unit: '', lo: 0, hi: 25, good: 'low' },
  ],
  INTERIOR: [
    { l: 'Identity issuance', unit: '/d', lo: 40, hi: 96, good: 'high' },
    { l: 'Border throughput', unit: '%', lo: 55, hi: 96, good: 'high' },
    { l: 'Response time', unit: 'min', lo: 6, hi: 30, good: 'low' },
    { l: 'Public-order index', unit: '', lo: 10, hi: 70, good: 'low' },
    { l: 'Registry integrity', unit: '%', lo: 88, hi: 99, good: 'high' },
  ],
  EDUCATION: [
    { l: 'Enrolment', unit: '%', lo: 70, hi: 99, good: 'high' },
    { l: 'Teacher coverage', unit: '%', lo: 60, hi: 96, good: 'high' },
    { l: 'Exam integrity', unit: '%', lo: 82, hi: 99, good: 'high' },
    { l: 'Dropout rate', unit: '%', lo: 2, hi: 24, good: 'low' },
  ],
  JUSTICE: [
    { l: 'Case clearance', unit: '%', lo: 55, hi: 95, good: 'high' },
    { l: 'Pre-trial backlog', unit: 'd', lo: 20, hi: 180, good: 'low' },
    { l: 'Legal-aid reach', unit: '%', lo: 40, hi: 88, good: 'high' },
    { l: 'Corrections capacity', unit: '%', lo: 60, hi: 98, good: 'low' },
  ],
  ENVIRONMENT: [
    { l: 'Air-quality index', unit: '', lo: 20, hi: 160, good: 'low' },
    { l: 'Protected coverage', unit: '%', lo: 55, hi: 92, good: 'high' },
    { l: 'Permit compliance', unit: '%', lo: 70, hi: 97, good: 'high' },
    { l: 'Climate-alert level', unit: '', lo: 0, hi: 5, good: 'low' },
  ],
  TRADE: [
    { l: 'Customs throughput', unit: '%', lo: 55, hi: 96, good: 'high' },
    { l: 'Export facilitation', unit: 'd', lo: 2, hi: 21, good: 'low' },
    { l: 'Standards compliance', unit: '%', lo: 75, hi: 98, good: 'high' },
    { l: 'Business registry SLA', unit: 'd', lo: 1, hi: 14, good: 'low' },
  ],
  GENERIC: [
    { l: 'Service availability', unit: '%', lo: 70, hi: 99, good: 'high' },
    { l: 'Request backlog', unit: '', lo: 0, hi: 40, good: 'low' },
    { l: 'Processing latency', unit: 'd', lo: 1, hi: 20, good: 'low' },
    { l: 'Coverage', unit: '%', lo: 50, hi: 95, good: 'high' },
  ],
};

export function serviceKpisFor(archetype: ArchetypeKey): ServiceKpi[] {
  return SVC[archetype] ?? SVC.GENERIC!;
}

export interface ServiceReading extends ServiceKpi { value: number; tone: 'ok' | 'warn' | 'alert' }

export function serviceReadings(id: string, archetype: ArchetypeKey, t: number): ServiceReading[] {
  return serviceKpisFor(archetype).map(k => {
    const value = Math.round(wave(`svc:${id}:${k.l}`, t, k.lo, k.hi) + (seed(`svcs:${id}:${k.l}`) - 0.5) * 2);
    const pct = ((value - k.lo) / (k.hi - k.lo)) * 100;
    const score = k.good === 'high' ? pct : 100 - pct;
    const tone = score >= 60 ? 'ok' : score >= 35 ? 'warn' : 'alert';
    return { ...k, value: Math.max(k.lo, Math.min(k.hi, value)), tone };
  });
}
