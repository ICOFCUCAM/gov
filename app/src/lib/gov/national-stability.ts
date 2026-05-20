// lib/gov/national-stability.ts
//
// National Stability Command — the apex operational view that braids
// Interior's eight role areas (national stability, policing, identity,
// borders, emergency command, investigations, cyber operations,
// intelligence fusion) into one cross-cutting operational picture, on
// top of the federated operational shells. Pure & deterministic.

import { seed, wave } from '@/lib/telemetry';
import { policeOps, emergencyOps, immigrationOps } from '@/lib/gov/agency-systems';
import { interiorOps } from '@/lib/gov/interior-systems';

export type StabilityTone = 'ok' | 'warn' | 'alert';
const toneOf = (good: number) => (good >= 70 ? 'ok' : good >= 50 ? 'warn' : 'alert') as StabilityTone;

export interface RoleAreaSignal {
  key: 'stability' | 'policing' | 'identity' | 'borders' | 'emergency' | 'investigations' | 'cyber' | 'intelligence';
  label: string;
  index: number;             // 0..100 operational health (higher = better)
  metric: string;            // human-readable headline metric
  detail: string;            // secondary metric line
  tone: StabilityTone;
  federationRoute: string;   // where to drill into
}

export type StabilityPosture = 'stable' | 'engaged' | 'strained' | 'critical';
export type StabilityTension =
  | 'policing-intelligence-fusion' | 'borders-policing-spillover'
  | 'cyber-investigations-cascade' | 'emergency-policing-saturation'
  | 'identity-borders-pressure' | 'national-multi-domain-stress';

export interface NationalStabilityBoard {
  epoch: number;
  roleAreas: RoleAreaSignal[];
  posture: StabilityPosture;
  stabilityIndex: number;     // 0..100 weighted mean
  alerts: number;
  warns: number;
  tensions: { kind: StabilityTension; rationale: string; severity: 'advisory' | 'elevated' | 'critical' }[];
  reinforcementPriority: RoleAreaSignal[];
}

export function nationalStabilityBoard(now: number): NationalStabilityBoard {
  const epoch = Math.max(0, Math.floor(now / 4000));
  const ts = epoch;     // floor to operational epoch for SSR-stable determinism
  const po = policeOps('national', ts);
  const em = emergencyOps('national', ts);
  const im = immigrationOps('national', ts);
  const io = interiorOps('national', ts);

  // Each role area reduces to a single operational health (0..100), higher = better.
  const policingHealth = Math.max(0, Math.min(100, Math.round(
    100 - po.activeIncidents * 0.3 - Math.max(0, po.meanResponseMin - 10) * 1.5 + po.clearanceRatePct * 0.2,
  )));
  const orderIdx = io.coordination.publicOrderIndex;
  const stabilityHealth = Math.max(0, Math.min(100, Math.round(orderIdx * 0.7 + (io.identity.uptimePct - 90) * 1.5 + 25)));
  const identityHealth = Math.max(0, Math.min(100, Math.round(io.identity.uptimePct * 0.7 - Math.min(50, io.identity.issuanceBacklog / 200))));
  const bordersHealth = Math.max(0, Math.min(100, Math.round((im.bordersOpen / Math.max(1, im.bordersTotal)) * 100 * 0.6 - im.flaggedEntries * 0.4 + 40)));
  const emergencyHealth = Math.max(0, Math.min(100, Math.round(em.resourceCoverPct * 0.6 + (em.respondersAvailable / Math.max(1, em.responders)) * 100 * 0.4 - (em.severity === 'national' ? 30 : em.severity === 'major' ? 18 : em.severity === 'elevated' ? 8 : 0))));
  const investigationsHealth = Math.max(0, Math.min(100, Math.round(po.clearanceRatePct * 0.7 - Math.min(40, po.openInvestigations / 100) + 30)));
  // Cyber & intelligence drift from policeOps + deterministic seed so they
  // remain stable & realistic without inventing per-citizen data.
  const cyberHealth = Math.max(0, Math.min(100, Math.round(wave(`ns:cyb:${epoch}`, epoch / 6, 55, 92) - (po.activeIncidents > 80 ? 8 : 0))));
  const intelHealth = Math.max(0, Math.min(100, Math.round(wave(`ns:int:${epoch}`, epoch / 7, 58, 90) - (im.flaggedEntries > 80 ? 10 : 0))));

  const roleAreas: RoleAreaSignal[] = [
    { key: 'stability', label: 'National Stability', index: stabilityHealth, metric: `Public order ${orderIdx}`, detail: `Threat level ${io.internalThreatLevel} · uptime ${io.identity.uptimePct}%`, tone: toneOf(stabilityHealth), federationRoute: '/app/interior/security-command' },
    { key: 'policing', label: 'Policing', index: policingHealth, metric: `${po.activeIncidents} active incidents`, detail: `Response ${po.meanResponseMin}m · clearance ${po.clearanceRatePct}%`, tone: toneOf(policingHealth), federationRoute: '/app/interior/police' },
    { key: 'identity', label: 'Identity', index: identityHealth, metric: `${io.identity.enrolledM}M enrolled`, detail: `Backlog ${io.identity.issuanceBacklog.toLocaleString()} · uptime ${io.identity.uptimePct}%`, tone: toneOf(identityHealth), federationRoute: '/app/interior/civil-registry' },
    { key: 'borders', label: 'Borders', index: bordersHealth, metric: `${im.bordersOpen}/${im.bordersTotal} posts open`, detail: `${im.crossingsToday.toLocaleString()} crossings · ${im.flaggedEntries} flagged`, tone: toneOf(bordersHealth), federationRoute: '/app/interior/immigration' },
    { key: 'emergency', label: 'Emergency Command', index: emergencyHealth, metric: `${em.activeCrises} active crises`, detail: `Severity ${em.severity} · resource cover ${em.resourceCoverPct}%`, tone: toneOf(emergencyHealth), federationRoute: '/app/interior/emergency' },
    { key: 'investigations', label: 'Investigations', index: investigationsHealth, metric: `${po.openInvestigations.toLocaleString()} open`, detail: `Clearance ${po.clearanceRatePct}% · custody ${po.custodyOccupancyPct}%`, tone: toneOf(investigationsHealth), federationRoute: '/app/interior/investigations' },
    { key: 'cyber', label: 'Cyber Operations', index: cyberHealth, metric: 'Cyber posture monitored', detail: `Posture index ${cyberHealth}`, tone: toneOf(cyberHealth), federationRoute: '/app/interior/cyber' },
    { key: 'intelligence', label: 'Intelligence Fusion', index: intelHealth, metric: 'Fusion cell active', detail: `Fusion index ${intelHealth}`, tone: toneOf(intelHealth), federationRoute: '/app/interior/intelligence' },
  ];

  const stabilityIndex = Math.round(roleAreas.reduce((s, r) => s + r.index, 0) / roleAreas.length);
  const alerts = roleAreas.filter(r => r.tone === 'alert').length;
  const warns = roleAreas.filter(r => r.tone === 'warn').length;
  const posture: StabilityPosture =
    alerts >= 3 || stabilityIndex < 45 ? 'critical'
      : alerts >= 1 || stabilityIndex < 60 ? 'strained'
        : warns >= 3 ? 'engaged' : 'stable';

  // Cross-domain tensions — operational interactions that need joint command.
  const tensions: NationalStabilityBoard['tensions'] = [];
  const hi = (k: RoleAreaSignal['key']) => roleAreas.find(r => r.key === k)!.tone !== 'ok';
  if (hi('policing') && hi('intelligence')) tensions.push({ kind: 'policing-intelligence-fusion', rationale: 'Police load + intelligence posture both strained — joint fusion-cell coordination required.', severity: 'elevated' });
  if (hi('borders') && hi('policing')) tensions.push({ kind: 'borders-policing-spillover', rationale: 'Border pressure spilling into policing load — frontier-to-interior coordination.', severity: 'elevated' });
  if (hi('cyber') && hi('investigations')) tensions.push({ kind: 'cyber-investigations-cascade', rationale: 'Cyber events compounding open investigations — digital-forensics surge advisable.', severity: 'advisory' });
  if (hi('emergency') && hi('policing')) tensions.push({ kind: 'emergency-policing-saturation', rationale: 'Emergency demand saturating policing capacity — unified incident command.', severity: 'elevated' });
  if (hi('identity') && hi('borders')) tensions.push({ kind: 'identity-borders-pressure', rationale: 'Identity throughput vs border processing imbalance.', severity: 'advisory' });
  if (alerts >= 4) tensions.push({ kind: 'national-multi-domain-stress', rationale: `${alerts} role areas at alert — convene national stability council.`, severity: 'critical' });

  const reinforcementPriority = [...roleAreas].sort((a, b) => a.index - b.index).slice(0, 3);

  return { epoch, roleAreas, posture, stabilityIndex, alerts, warns, tensions, reinforcementPriority };
}
