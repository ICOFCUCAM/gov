// Health screens, administrative and aggregate only (CLAUDE.md, Health: "no
// patient or clinical field anywhere, no national patient record; returns are
// aggregates"; audit B §6.5). The health application's simulation screens read
// this module instead of the person-level parts of the health engines: the
// workforce and its professional standing, licensing and inspection work,
// facility returns, service volumes and waits counted per desk, stock and
// turnaround — never a person's condition, triage level, diagnosis, vital
// sign, medicine or risk score. Everything here is generated (Sample in demo
// and training, folded to Not connected in production by the screens) until
// the professions register, the health regulator's returns and the facility
// register answer for it (lib/professions, lib/health, lib/data/facilities.ts).
// Pure and deterministic.

import { seed, wave, waveSeries } from '@/lib/telemetry';
import { doctorRoster, hospitalOps, patientServices as serviceVolumes } from '@/lib/gov/health-systems';
import { patientDeepExecution as serviceExecution, citizenPortalView as portalView } from '@/lib/gov/health-operations';

export type Tone = 'ok' | 'warn' | 'alert' | 'info';

const CADRES = ['Medical officers', 'Nurses & midwives', 'Clinical officers', 'Pharmacists', 'Laboratory scientists', 'Community health workers'];
const PROFESSIONS = ['Medical practitioner', 'Registered nurse', 'Midwife', 'Pharmacist', 'Laboratory scientist', 'Clinical officer'];
const FACILITY_KINDS = ['Hospital', 'Health centre', 'Clinic', 'Pharmacy', 'Laboratory', 'Maternity home'];
const LICENCE_STAGES = ['received', 'inspection', 'decision', 'issued'] as const;
const SERVICE_LINES = ['Outpatients', 'Maternity', 'Emergency', 'Inpatient wards', 'Theatre', 'Community outreach'];
const STOCK = ['Essential medicines list', 'Vaccines (cold chain)', 'Laboratory reagents', 'Surgical consumables', 'Oxygen', 'Blood products (units)'];
const TESTS = ['Routine chemistry', 'Haematology', 'Microbiology', 'Imaging reports', 'Molecular panel'];
const DESKS = ['Registration desk', 'Referral desk', 'Ambulance handover', 'Telehealth line'] as const;

/** Service volumes (portal members, appointments, coverage, claims): aggregate counts, for the health application's legacy screens. */
export { serviceVolumes };

const tone = (good: boolean, near: boolean): Tone => (good ? 'ok' : near ? 'warn' : 'alert');

// ── Workforce & licensing desk (was the clinician workstation) ─────────
export interface TeamMember { id: string; name: string; profession: string; number: string; standing: 'registered' | 'renewal due' | 'with conditions'; shift: 'on duty' | 'on call' | 'off duty'; tone: Tone }
export interface WorkforceDesk {
  member: TeamMember & { facility: string; validUntil: string; rota: string; cpdPct: number };
  team: TeamMember[];
  kpis: { onRegister: number; onDuty: number; renewalsDue: number; licencesPending: number; returnsDue: number; establishmentPct: number };
  cadres: { cadre: string; inPost: number; establishment: number; filledPct: number; tone: Tone }[];
  licensing: { ref: string; subject: string; stage: typeof LICENCE_STAGES[number]; ageDays: number; tone: Tone }[];
  duty: { at: string; kind: string; detail: string; tone: Tone }[];
  attendance: { label: string; value: string; series: number[]; tone: Tone }[];
  serviceLines: { line: string; attendances: number; sharePct: number }[];
  stock: { item: string; daysCover: number; tone: Tone }[];
  turnaround: { test: string; medianHrs: number; withinTargetPct: number; tone: Tone }[];
  requests: { name: string; kind: string; tone: Tone }[];
  cpd: { task: string; done: boolean; due: string }[];
  alerts: { title: string; sub: string; ago: string; tone: Tone }[];
  advisory: { summary: string; recommended: string[] };
}

export function workforceDesk(id: string, t: number, selected?: string): WorkforceDesk {
  const roster = doctorRoster(id, t, 10);
  const team: TeamMember[] = roster.map((d, i) => {
    const s = seed(`hw:st:${id}:${i}`);
    const standing: TeamMember['standing'] = s > 0.86 ? 'renewal due' : s > 0.78 ? 'with conditions' : 'registered';
    const shift: TeamMember['shift'] = d.status === 'off-duty' ? 'off duty' : d.onCall ? 'on call' : 'on duty';
    return { id: d.id, name: d.name, profession: PROFESSIONS[i % PROFESSIONS.length]!, number: `REG-${String(10000 + Math.floor(seed(`hw:no:${id}:${i}`) * 89999))}`, standing, shift, tone: standing === 'registered' ? 'ok' : 'warn' };
  });
  const m = team.find(x => x.id === selected) ?? team[0]!;
  const mi = team.indexOf(m);
  const cadres = CADRES.map((cadre, i) => {
    const establishment = Math.round(wave(`hw:es:${id}:${i}`, 0, 40, 420));
    const filledPct = Math.round(wave(`hw:fp:${id}:${i}`, t, 58, 99));
    return { cadre, establishment, inPost: Math.round(establishment * filledPct / 100), filledPct, tone: tone(filledPct >= 85, filledPct >= 70) };
  });
  const licensing = Array.from({ length: 7 }, (_, i) => {
    const stage = LICENCE_STAGES[Math.floor((t / 7 + seed(`hw:lq:${id}:${i}`) * 4)) % 4]!;
    const ageDays = Math.round(wave(`hw:la:${id}:${i}`, t, 1, 60));
    return { ref: `LIC-${4100 + i}`, subject: `${FACILITY_KINDS[i % FACILITY_KINDS.length]} · ${['North', 'East', 'South', 'West', 'Central'][i % 5]} district`, stage, ageDays, tone: tone(ageDays <= 30, ageDays <= 45) };
  });
  const hours = ['07:00', '08:30', '10:00', '11:30', '13:00', '14:30', '16:00', '19:00'];
  const duty = hours.map((at, i) => ({
    at, kind: ['Shift start', 'Handover', 'Facility inspection', 'Returns filed', 'Training session', 'Rota review', 'Supply check', 'Shift end'][i]!,
    detail: ['Team on duty confirmed', 'Staffing handed over to the day team', 'Licence inspection visit', 'Monthly capacity return submitted', 'Continuing professional development', 'Next week\'s rota drafted', 'Stock levels counted', 'Night team on duty confirmed'][i]!,
    tone: (seed(`hw:dt:${id}:${i}:${Math.floor(t / 6)}`) > 0.85 ? 'warn' : 'ok') as Tone,
  }));
  const attendance = [['Attendances / hour', 'at', 30, 140], ['Waiting over target', 'wo', 0, 30], ['Staff on duty', 'so', 40, 95], ['Beds available', 'ba', 5, 60]].map(([label, k, lo, hi]) => {
    const series = waveSeries(`hw:tr:${k}:${id}`, t, 12, lo as number, hi as number);
    const v = Math.round(series.at(-1)!);
    return { label: label as string, value: String(v), series, tone: (k === 'wo' ? tone(v < 10, v < 20) : 'ok') as Tone };
  });
  const lineRaw = SERVICE_LINES.map((line, i) => ({ line, attendances: Math.round(wave(`hw:sl:${id}:${i}`, t, 40, 900)) }));
  const total = lineRaw.reduce((a, x) => a + x.attendances, 0) || 1;
  const stock = STOCK.map((item, i) => { const d = Math.round(wave(`hw:sk:${id}:${i}`, t, 3, 90)); return { item, daysCover: d, tone: tone(d >= 30, d >= 14) }; });
  const turnaround = TESTS.map((test, i) => { const w = Math.round(wave(`hw:ta:${id}:${i}`, t, 62, 99)); return { test, medianHrs: Math.round(wave(`hw:tm:${id}:${i}`, t, 2, 48)), withinTargetPct: w, tone: tone(w >= 90, w >= 75) }; });
  const requests = ['Leave request', 'Shift swap', 'Locum cover', 'Supply requisition', 'Training place'].map((name, i) => ({ name, kind: i < 3 ? 'Staffing' : 'Administration', tone: (seed(`hw:rq:${id}:${i}:${Math.floor(t / 8)}`) > 0.7 ? 'warn' : 'info') as Tone }));
  const cpd = [['Registration renewal', 'in 21 days'], ['Mandatory training module', 'in 9 days'], ['Annual appraisal', 'in 40 days'], ['Fire and safety refresher', 'done'], ['Information governance course', 'done']].map(([task, due]) => ({ task: task!, done: due === 'done', due: due! }));
  const renewalsDue = team.filter(x => x.standing === 'renewal due').length + Math.round(wave(`hw:rd:${id}`, t, 4, 40));
  const alerts = [
    ...(renewalsDue ? [{ title: `${renewalsDue} registrations due for renewal`, sub: 'within 30 days · professions register', ago: 'today', tone: 'warn' as Tone }] : []),
    ...cadres.filter(c => c.tone === 'alert').slice(0, 2).map(c => ({ title: `${c.cadre} below establishment`, sub: `${c.inPost} of ${c.establishment} in post`, ago: '2h', tone: 'alert' as Tone })),
    ...stock.filter(s => s.tone === 'alert').slice(0, 1).map(s => ({ title: `${s.item}: ${s.daysCover} days of cover`, sub: 'below the 14-day floor', ago: '1h', tone: 'alert' as Tone })),
  ];
  const short = cadres.filter(c => c.tone !== 'ok').map(c => c.cadre.toLowerCase());
  return {
    member: { ...m, facility: `${FACILITY_KINDS[mi % 3]} ${['North', 'Central', 'Coastal'][mi % 3]}`, validUntil: `${12 + Math.floor(seed(`hw:vu:${id}:${mi}`) * 20)} months`, rota: m.shift === 'off duty' ? 'Off duty today' : 'Day rota · 07:00–19:00', cpdPct: Math.round(wave(`hw:cp:${id}:${mi}`, t, 40, 100)) },
    team,
    kpis: {
      onRegister: Math.round(wave(`hw:or:${id}`, t, 1800, 9600)),
      onDuty: team.filter(x => x.shift === 'on duty').length,
      renewalsDue,
      licencesPending: licensing.filter(l => l.stage !== 'issued').length,
      returnsDue: Math.round(wave(`hw:re:${id}`, t, 0, 24)),
      establishmentPct: Math.round(cadres.reduce((a, c) => a + c.filledPct, 0) / cadres.length),
    },
    cadres, licensing, duty, attendance,
    serviceLines: lineRaw.map(x => ({ ...x, sharePct: Math.round((x.attendances / total) * 100) })),
    stock, turnaround, requests, cpd, alerts,
    advisory: {
      summary: short.length ? `Staffing below establishment in ${short.slice(0, 2).join(' and ')}; ${renewalsDue} registrations fall due within 30 days.` : `Establishment filled across cadres; ${renewalsDue} registrations fall due within 30 days.`,
      recommended: ['Confirm next week\'s rota against the establishment', 'Remind professionals whose registration falls due', 'File this month\'s capacity return'],
    },
  };
}

// ── Service access (was patient systems): counted per desk, never per person ──
export interface ServiceAccess {
  posture: 'steady' | 'strained' | 'crisis';
  enrolledM: number; portalUptime: number; appointmentsToday: number; appointmentsHonouredPct: number; recordsCompletenessPct: number;
  desks: { id: string; desk: string; waiting: number; meanWaitMin: number; tone: Tone }[];
  emergencyByFacility: { facility: string; attendances: number; tone: Tone }[];
  dispensing: { category: string; issued: number; flagged: number; tone: Tone }[];
  vaccination: { vaccine: string; coveragePct: number; trend: string; tone: Tone }[];
  timeline: { atHrsAgo: number; kind: string; detail: string; tone: Tone }[];
}
export function serviceAccess(id: string, t: number): ServiceAccess {
  const v = serviceVolumes(id, t);
  const e = serviceExecution(id, t);
  const desks = DESKS.map((desk, i) => {
    const waiting = Math.round(wave(`sa:dw:${id}:${i}`, t, 0, 40));
    const meanWaitMin = Math.round(wave(`sa:dm:${id}:${i}`, t, 4, 120));
    return { id: `DESK-${i + 1}`, desk, waiting, meanWaitMin, tone: tone(meanWaitMin <= 45, meanWaitMin <= 90) };
  });
  const byFacility = new Map<string, number>();
  for (const s of e.emergencyStatuses) byFacility.set(s.facility, (byFacility.get(s.facility) ?? 0) + 1);
  return {
    posture: e.posture, enrolledM: v.registeredM, portalUptime: v.portalUptime, appointmentsToday: v.appointmentsToday,
    appointmentsHonouredPct: e.appointmentsHonouredPct, recordsCompletenessPct: e.recordsIntegrityPct,
    desks,
    emergencyByFacility: [...byFacility].map(([facility, n]) => ({ facility, attendances: n * Math.round(wave(`sa:ef:${id}:${facility}`, t, 3, 30)), tone: (n > 1 ? 'warn' : 'ok') as Tone })),
    dispensing: e.rx.map(x => ({ category: x.category, issued: x.issued, flagged: x.flagged, tone: x.tone as Tone })),
    vaccination: e.vaccination.map(x => ({ vaccine: x.vaccine, coveragePct: x.coveragePct, trend: x.trend, tone: x.tone as Tone })),
    timeline: [
      { atHrsAgo: 1, kind: 'Returns', detail: 'Daily attendance return received from the district hospitals', tone: 'ok' },
      { atHrsAgo: 3, kind: 'Desks', detail: `${desks.filter(d => d.tone !== 'ok').length} service desks over the waiting target`, tone: desks.some(d => d.tone === 'alert') ? 'alert' : 'warn' },
      { atHrsAgo: 6, kind: 'Appointments', detail: `${v.appointmentsToday.toLocaleString('en')} appointments booked through the portal today`, tone: 'ok' },
      { atHrsAgo: 12, kind: 'Coverage', detail: 'Immunisation coverage counts updated from facility returns', tone: 'ok' },
    ],
  };
}

// ── Citizen portal usage (was a person's portal): counts of service use ──
export interface PortalUsage {
  requests: { kind: string; count: number; tone: Tone }[];
  onTimePct: number; onTimeTone: Tone;
  bookedThisMonth: number; certificatesIssued: number; facilitySearches: number;
  schemeMembershipPct: number;
  busiest: { service: string; place: string };
  programmes: { name: string; coveragePct: number; tone: Tone }[];
  facilities: { name: string; kind: string; tag: string }[];
  advisories: { title: string; body: string; date: string; tone: Tone }[];
  unread: number;
}
export function portalUsage(id: string, t: number): PortalUsage {
  const p = portalView(id, t);
  const onTimePct = Math.round(wave(`pu:ot:${id}`, t, 68, 98));
  return {
    requests: ['Appointment booking', 'Certificate of fitness', 'Scheme membership', 'Facility complaint', 'Records access request', 'Vaccination certificate'].map((kind, i) => {
      const count = Math.round(wave(`pu:rq:${id}:${i}`, t, 20, 2400));
      return { kind, count, tone: (seed(`pu:rt:${id}:${i}:${Math.floor(t / 9)}`) > 0.8 ? 'warn' : 'ok') as Tone };
    }),
    onTimePct, onTimeTone: tone(onTimePct >= 90, onTimePct >= 75),
    bookedThisMonth: Math.round(wave(`pu:bk:${id}`, t, 8000, 64000)),
    certificatesIssued: Math.round(wave(`pu:ci:${id}`, t, 400, 9000)),
    facilitySearches: Math.round(wave(`pu:fs:${id}`, t, 2000, 40000)),
    schemeMembershipPct: Math.round(wave(`pu:sm:${id}`, t, 40, 92)),
    busiest: { service: p.upcoming.spec, place: p.upcoming.place },
    programmes: ['Childhood immunisation', 'Maternal health', 'Hypertension screening', 'Mental health access'].map((name, i) => { const c = Math.round(wave(`pu:pg:${id}:${i}`, t, 45, 96)); return { name, coveragePct: c, tone: tone(c >= 80, c >= 60) }; }),
    facilities: p.services.map(s => ({ name: s.name, kind: s.sub, tag: s.tag })),
    advisories: p.alerts.map(a => ({ title: a.title, body: a.body, date: a.date, tone: a.tone as Tone })),
    unread: p.unread,
  };
}

// ── Facility boards: capacity and waits, never who is in a bed ─────────
export function bayBoard(id: string, t: number, total = 16) {
  const hops = hospitalOps(id, t);
  const occupiedCount = Math.floor((hops.beds.occupancyPct / 100) * total);
  return { occupancyPct: hops.beds.occupancyPct, bays: Array.from({ length: total }, (_, i) => {
    const k = `bb:${id}:${i}:${Math.floor(t / 4)}`;
    const status = i < occupiedCount ? (seed(`${k}:c`) > 0.92 ? 'critical' as const : 'occupied' as const) : (seed(`${k}:c`) > 0.8 ? 'cleaning' as const : 'available' as const);
    return { id: `B-${String(i + 1).padStart(2, '0')}`, status, since: status === 'occupied' || status === 'critical' ? `${Math.floor(wave(`${k}:s`, t, 1, 72))}h` : undefined };
  }) };
}

/** Emergency department: attendances counted by acuity level and by the wait, never a person. */
export function emergencyAttendance(id: string, t: number) {
  const levels = [1, 2, 3, 4, 5].map(level => ({ level, count: Math.round(wave(`ea:lv:${id}:${level}`, t, level <= 2 ? 0 : 2, level <= 2 ? 6 : 24)), meanWaitMin: Math.round(wave(`ea:wt:${id}:${level}`, t, level <= 2 ? 0 : 10, level <= 2 ? 15 : 180)) }));
  return { levels, present: levels.reduce((a, l) => a + l.count, 0), waitingOverHour: levels.filter(l => l.meanWaitMin > 60).reduce((a, l) => a + l.count, 0) };
}
