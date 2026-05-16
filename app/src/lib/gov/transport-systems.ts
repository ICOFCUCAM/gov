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

export function transportInstability(id: string, t: number): number {
  const o = transportOps(id, t);
  const v =
    Math.max(0, (85 - o.networkAvailabilityPct)) * 1.1 +
    o.corridors.filter(c => c.tone === 'alert').length * 9 +
    o.modes.reduce((a, m) => a + m.incidents, 0) * 1.4 +
    Math.max(0, (90 - o.safetyIndex)) * 0.6;
  return Math.round(Math.max(0, Math.min(100, v)));
}
