// CivicOS — Update Center status page and monthly SLA report, server-side.
//
// Composed from records that already exist: the publisher's service
// incidents and planned maintenance (lib/data/support.ts), the nation's
// fallback incidents, scheduled installs (lib/data/updates.ts), its
// maintenance windows and blackouts (lib/data/change-control.ts), its
// support tickets, and — for the installation itself — the live service
// health the operations dashboard already reports (serviceHealth()).
//
// Availability counts unplanned impact only: a major outage counts in full,
// a partial outage at half, degradation and announced maintenance not at
// all. SaaS nations are measured on the hosted platform plus the publisher's
// services; self-hosted and air-gapped nations on the publisher's services
// only (they run the platform themselves).

import type { ServiceImpact, ServiceIncident, SlaReport, StatusComponent, StatusPage, SubscribedNation, TicketPriority } from '@/lib/api/types';
import { getChamber } from './updates';
import { changeControl } from './change-control';
import { serviceHealth } from './store';
import { SERVICE_COMPONENTS, affects, listServiceIncidents, ticketsInRange, tierPolicy, PRIORITIES } from './support';

const MIN = 60_000;
const DAY = 86_400_000;
const WEIGHT: Record<ServiceImpact, number> = { operational: 0, degraded: 0, maintenance: 0, 'partial-outage': 0.5, 'major-outage': 1 };
const RANK: ServiceImpact[] = ['operational', 'maintenance', 'degraded', 'partial-outage', 'major-outage'];
const worst = (a: ServiceImpact, b: ServiceImpact) => (RANK.indexOf(a) >= RANK.indexOf(b) ? a : b);
const ms = (s: string) => new Date(s).getTime();

function componentsFor(n: Pick<SubscribedNation, 'deliveryMode'>) {
  return SERVICE_COMPONENTS.filter(c => c.group === 'publisher' || n.deliveryMode === 'saas');
}
function incidentsFor(nationId: string, key: string): ServiceIncident[] {
  return listServiceIncidents().filter(i => affects(i, nationId) && i.components.includes(key));
}
const span = (i: ServiceIncident, now: number): [number, number] => i.scheduled
  ? [ms(i.scheduled.start), i.resolvedAt ? ms(i.resolvedAt) : ms(i.scheduled.end)]
  : [ms(i.startedAt), i.resolvedAt ? ms(i.resolvedAt) : now];

/** Weighted downtime minutes for one component in [from, to). */
export function downtime(nationId: string, key: string, from: number, to: number, now = Date.now()): number {
  let m = 0;
  for (const i of incidentsFor(nationId, key)) {
    if (i.scheduled) continue;
    const [s, e] = span(i, now);
    const o = Math.max(0, Math.min(e, to, now) - Math.max(s, from));
    m += (o / MIN) * WEIGHT[i.impact];
  }
  return Math.round(m * 10) / 10;
}
const pct = (down: number, from: number, to: number) => Math.round((1 - down / ((to - from) / MIN)) * 100_000) / 1000;

export function statusPage(nationId: string, now = Date.now()): StatusPage | { error: string } {
  const c = getChamber(nationId);
  if ('error' in c) return c;
  const n = c.nation;
  const from90 = now - 90 * DAY;
  const all = listServiceIncidents().filter(i => affects(i, nationId));
  const isActive = (i: ServiceIncident) => {
    const [s, e] = span(i, now);
    return !i.resolvedAt && s <= now && (i.scheduled ? e > now : true);
  };
  const components: StatusComponent[] = componentsFor(n).map(sc => {
    const current = all.filter(i => i.components.includes(sc.key) && isActive(i)).reduce<ServiceImpact>((w, i) => worst(w, i.impact), 'operational');
    const days = Array.from({ length: 90 }, (_, k) => {
      const d0 = now - (89 - k) * DAY - (now % DAY), d1 = d0 + DAY;
      const impact = all.filter(i => i.components.includes(sc.key)).filter(i => { const [s, e] = span(i, now); return s < d1 && e > d0 && s <= now; })
        .reduce<ServiceImpact>((w, i) => worst(w, i.impact), 'operational');
      return { date: new Date(d0).toISOString().slice(0, 10), impact };
    });
    return { key: sc.key, label: sc.label, group: sc.group, status: current, uptime90: pct(downtime(nationId, sc.key, from90, now, now), from90, now), days };
  });
  // The installation itself: live service health, for the nation this installation belongs to.
  if (n.home) {
    const map: Record<string, ServiceImpact> = { ok: 'operational', degraded: 'degraded', down: 'major-outage' };
    for (const s of serviceHealth()) components.push({ key: `local:${s.name}`, label: s.name, group: 'installation', status: map[s.status] ?? 'degraded', detail: s.detail });
  }
  const upcoming = [
    ...all.filter(i => i.scheduled && !i.resolvedAt && ms(i.scheduled.end) > now).map(i => ({ title: i.title, start: i.scheduled!.start, end: i.scheduled!.end, kind: 'publisher' as const })),
    ...c.releases.filter(r => r.install.state === 'scheduled' && r.install.window && ms(r.install.window.end) > now)
      .map(r => ({ title: `Upgrade to ${r.version}`, start: r.install.window!.start, end: r.install.window!.end, kind: 'install' as const })),
  ].sort((a, b) => a.start.localeCompare(b.start));
  const cc = changeControl(nationId);
  return {
    nation: { id: n.id, name: n.name, deliveryMode: n.deliveryMode },
    generatedAt: new Date(now).toISOString(),
    overall: components.reduce<ServiceImpact>((w, x) => worst(w, x.status), 'operational'),
    components,
    active: all.filter(isActive),
    recent: all.filter(i => !isActive(i) && !(i.scheduled && !i.resolvedAt) && span(i, now)[0] >= now - 30 * DAY),
    fallbackIncidents: c.incidents.filter(i => ms(i.openedAt) >= now - 30 * DAY),
    maintenance: { upcoming, windows: cc.windows, blackouts: cc.blackouts.filter(b => ms(b.end) > now) },
  };
}

/** The months a report can be produced for: the current one and the previous eleven. */
export function reportMonths(now = Date.now()): string[] {
  const d = new Date(now);
  return Array.from({ length: 12 }, (_, k) => {
    const m = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() - k, 1));
    return m.toISOString().slice(0, 7);
  });
}

export function slaReport(nationId: string, month: string, now = Date.now()): SlaReport | { error: string; status: number } {
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(month)) return { error: 'Month must be YYYY-MM', status: 422 };
  const c = getChamber(nationId);
  if ('error' in c) return { error: c.error, status: 404 };
  const [y, m] = month.split('-').map(Number) as [number, number];
  const from = Date.UTC(y, m - 1, 1), monthEnd = Date.UTC(y, m, 1);
  if (from > now) return { error: 'That month has not started', status: 422 };
  const to = Math.min(monthEnd, now);
  const policy = tierPolicy(nationId);
  const uptime = componentsFor(c.nation).map(sc => {
    const d = downtime(nationId, sc.key, from, to, now);
    return { key: sc.key, label: sc.label, uptime: pct(d, from, to), downtimeMinutes: d };
  });
  const serviceUptime = Math.min(...uptime.map(u => u.uptime));
  const incidents: SlaReport['incidents'] = [
    ...listServiceIncidents().filter(i => affects(i, nationId) && !i.scheduled && ms(i.startedAt) >= from && ms(i.startedAt) < monthEnd)
      .map(i => ({ id: i.id, title: i.title, kind: 'service' as const, impact: i.impact, startedAt: i.startedAt, resolvedAt: i.resolvedAt, minutes: i.resolvedAt ? Math.round((ms(i.resolvedAt) - ms(i.startedAt)) / MIN) : undefined })),
    ...c.incidents.filter(i => ms(i.openedAt) >= from && ms(i.openedAt) < monthEnd)
      .map(i => ({ id: i.id, title: `Fallback ${i.fromVersion} → ${i.toVersion}`, kind: 'fallback' as const, impact: i.trigger, startedAt: i.openedAt })),
  ].sort((a, b) => a.startedAt.localeCompare(b.startedAt));
  const tickets = ticketsInRange(nationId, from, monthEnd, now);
  const byPriority = Object.fromEntries(PRIORITIES.map(p => [p, { opened: 0, responseMet: 0, responseBreached: 0, resolutionMet: 0, resolutionBreached: 0, open: 0 }])) as SlaReport['tickets']['byPriority'];
  for (const t of tickets) {
    const b = byPriority[t.priority as TicketPriority];
    b.opened++;
    if (t.sla.response.state === 'met') b.responseMet++; else if (t.sla.response.state === 'breached') b.responseBreached++;
    if (t.sla.resolution.state === 'met') b.resolutionMet++; else if (t.sla.resolution.state === 'breached') b.resolutionBreached++; else b.open++;
  }
  const sum = (k: 'responseMet' | 'responseBreached' | 'resolutionMet' | 'resolutionBreached') => PRIORITIES.reduce((a, p) => a + byPriority[p][k], 0);
  const rate = (ok: number, bad: number) => (ok + bad ? Math.round((ok / (ok + bad)) * 1000) / 10 : null);
  const uptimeMet = serviceUptime >= policy.uptimeTarget;
  return {
    nationId, nationName: c.nation.name, month, generatedAt: new Date(now).toISOString(), tier: policy,
    uptime, serviceUptime, uptimeMet, creditPct: uptimeMet ? 0 : policy.creditPct, incidents,
    tickets: { opened: tickets.length, byPriority, responsePct: rate(sum('responseMet'), sum('responseBreached')), resolutionPct: rate(sum('resolutionMet'), sum('resolutionBreached')) },
  };
}
