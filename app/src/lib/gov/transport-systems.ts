// Transport Systems — deep operational engine (TRANSPORT archetype).
// Aviation, maritime, rail, road, logistics/fleet and mobility services
// as live operational environments. Pure & deterministic.

import { seed, wave } from '@/lib/telemetry';

export interface ModeOps { mode: string; throughputPct: number; delaysMin: number; incidents: number; tone: 'ok' | 'warn' | 'alert' }
export interface CorridorFlow { corridor: string; loadPct: number; throughputKt: number; tone: 'ok' | 'warn' | 'alert' }
export interface TransportOps {
  modes: ModeOps[];
  corridors: CorridorFlow[];
  fleet: { vehicles: number; available: number; maintenanceBacklog: number };
  registry: { vehiclesM: number; licencesIssuedToday: number; backlog: number };
  safetyIndex: number;
  networkAvailabilityPct: number;
}
const MODES = ['Aviation', 'Maritime', 'Rail', 'Road'];
const CORRIDORS = ['Northern trunk', 'Coastal export', 'Capital ring', 'Eastern freight', 'Highland link'];

export function transportOps(id: string, t: number): TransportOps {
  const modes: ModeOps[] = MODES.map((mode, i) => {
    const tp = Math.round(wave(`tr:tp:${id}:${i}`, t, 55, 99));
    return { mode, throughputPct: tp, delaysMin: Math.round(wave(`tr:dl:${id}:${i}`, t, 2, 80)), incidents: Math.round(seed(`tr:in:${id}:${i}:${Math.floor(t / 8)}`) * 9), tone: tp >= 85 ? 'ok' : tp >= 68 ? 'warn' : 'alert' };
  });
  const corridors: CorridorFlow[] = CORRIDORS.map((corridor, i) => {
    const load = Math.round(wave(`tr:cl:${id}:${i}`, t, 40, 99));
    return { corridor, loadPct: load, throughputKt: Math.round(wave(`tr:ck:${id}:${i}`, t, 20, 480)), tone: load >= 90 ? 'alert' : load >= 75 ? 'warn' : 'ok' };
  });
  const vehicles = 1200 + Math.round(seed(`tr:fv:${id}`) * 2600);
  return {
    modes,
    corridors,
    fleet: { vehicles, available: Math.round(vehicles * wave(`tr:fa:${id}`, t, 0.55, 0.92)), maintenanceBacklog: Math.round(wave(`tr:mb:${id}`, t, 10, 320)) },
    registry: { vehiclesM: Math.round(wave(`tr:rv:${id}`, t, 3, 12) * 10) / 10, licencesIssuedToday: Math.round(wave(`tr:li:${id}`, t, 200, 9000)), backlog: Math.round(wave(`tr:rb:${id}`, t, 100, 5200)) },
    safetyIndex: Math.round(wave(`tr:si:${id}`, t, 58, 96)),
    networkAvailabilityPct: Math.round(modes.reduce((a, m) => a + m.throughputPct, 0) / modes.length),
  };
}

// ── Transport Command ────────────────────────────────────────────────
// National mobility authority: synthesises modal/corridor/fleet/registry
// state into one emergent posture, domain rollup and ranked directives.
export interface TransDomainStatus { domain: string; metric: string; value: string; tone: 'ok' | 'warn' | 'alert' }
export interface TransDirective { priority: 'critical' | 'priority' | 'advisory'; title: string; rationale: string; target: string }
export interface TransportCommand {
  postureIndex: number;
  posture: 'steady' | 'engaged' | 'crisis';
  domains: TransDomainStatus[];
  directives: TransDirective[];
  criticalDomains: number;
}
export function transportCommand(id: string, t: number): TransportCommand {
  const o = transportOps(id, t);
  const worstMode = [...o.modes].sort((a, b) => a.throughputPct - b.throughputPct)[0]!;
  const congested = o.corridors.filter(c => c.tone === 'alert').length;
  const domains: TransDomainStatus[] = [
    { domain: 'Network availability', metric: 'Mean throughput', value: `${o.networkAvailabilityPct}%`,
      tone: o.networkAvailabilityPct >= 85 ? 'ok' : o.networkAvailabilityPct >= 68 ? 'warn' : 'alert' },
    { domain: `Weakest mode · ${worstMode.mode}`, metric: 'Throughput', value: `${worstMode.throughputPct}%`,
      tone: worstMode.tone },
    { domain: 'Corridor congestion', metric: 'Critical corridors', value: `${congested}`,
      tone: congested >= 2 ? 'alert' : congested >= 1 ? 'warn' : 'ok' },
    { domain: 'Fleet readiness', metric: 'Maint. backlog', value: `${o.fleet.maintenanceBacklog}`,
      tone: o.fleet.maintenanceBacklog > 200 ? 'alert' : o.fleet.maintenanceBacklog > 90 ? 'warn' : 'ok' },
    { domain: 'Road safety', metric: 'Safety index', value: `${o.safetyIndex}`,
      tone: o.safetyIndex >= 80 ? 'ok' : o.safetyIndex >= 65 ? 'warn' : 'alert' },
  ];
  const directives: TransDirective[] = [];
  if (worstMode.tone === 'alert') directives.push({ priority: 'critical', title: `Restore ${worstMode.mode} throughput`, rationale: `${worstMode.mode} at ${worstMode.throughputPct}%`, target: worstMode.mode.toLowerCase() });
  if (congested >= 2) directives.push({ priority: 'priority', title: 'Corridor congestion relief', rationale: `${congested} corridors critical`, target: 'logistics' });
  if (o.fleet.maintenanceBacklog > 200) directives.push({ priority: 'priority', title: 'Clear fleet maintenance backlog', rationale: `${o.fleet.maintenanceBacklog} units awaiting maintenance`, target: 'logistics' });
  if (o.safetyIndex < 65) directives.push({ priority: 'critical', title: 'Road-safety intervention', rationale: `Safety index ${o.safetyIndex}`, target: 'road' });
  if (o.registry.backlog > 3000) directives.push({ priority: 'advisory', title: 'Reduce registry backlog', rationale: `${o.registry.backlog} pending registrations`, target: 'citizen' });
  directives.sort((a, b) => ({ critical: 0, priority: 1, advisory: 2 }[a.priority] - { critical: 0, priority: 1, advisory: 2 }[b.priority]));
  const criticalDomains = domains.filter(d => d.tone === 'alert').length;
  const postureIndex = Math.max(0, Math.min(100, Math.round((100 - transportInstability(id, t)) * 0.5 + (100 - criticalDomains * 18) * 0.5)));
  const posture: TransportCommand['posture'] =
    criticalDomains >= 3 || postureIndex < 45 ? 'crisis' : criticalDomains >= 1 || postureIndex < 70 ? 'engaged' : 'steady';
  return { postureIndex, posture, domains, directives, criticalDomains };
}

export function transportInstability(id: string, t: number): number {
  const o = transportOps(id, t);
  const v =
    Math.max(0, (85 - o.networkAvailabilityPct)) * 1.1 +
    o.corridors.filter(c => c.tone === 'alert').length * 9 +
    o.modes.reduce((a, m) => a + m.incidents, 0) * 1.4 +
    Math.max(0, (90 - o.safetyIndex)) * 0.6;
  return Math.round(Math.max(0, Math.min(100, v)));
}
