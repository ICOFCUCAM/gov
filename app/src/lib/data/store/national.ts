// The national executive snapshot and the cross-ministry coordination fabric.
import { REFERENCE_MODEL } from '@/lib/twin/signal';
import { profileFor } from '@/lib/archetype-profiles';
import { nationRegions } from '@/lib/nation/registry';
import type {
  IncidentSeverity,
  ArchetypeKey,
  OpsTone,
  NationalSnapshot,
  CrossMinistryIncident,
  NationalIndicator,
  NationalCoordination,
  CoordinationNode,
  CoordinationEdge,
  OpsTimelineEvent,
  CoordinationPinned,
  FabricPressure,
  ChronologyEvent,
} from '@/lib/api/types';
import { db } from './state';
import { seededInt } from './shared';
import { verifyAuditChain } from './audit';
import { seedQueue, seedIncidents } from './seeds';

// ── National executive snapshot (cross-ministry, realistic) ───────────
function ensureIncidentsSeeded(): void {
  for (const m of db.ministries) {
    if (m.status === 'merged') continue;
    if (!db.ministryIncidents[m.id]) {
      db.ministryIncidents[m.id] = seedIncidents(m.id, m.archetype);
    }
    if (!db.ministryQueues[m.id]) {
      db.ministryQueues[m.id] = seedQueue(m.id);
    }
  }
}

// Cross-ministry dependency model — which institutions an institution
// supplies or underwrites. Directed: from → to ("from" supports "to").
const COORDINATION_DEPS: Partial<Record<ArchetypeKey, { to: ArchetypeKey; relation: string }[]>> = {
  FINANCE: [
    { to: 'HEALTH', relation: 'funds' }, { to: 'EDUCATION', relation: 'funds' },
    { to: 'ENERGY', relation: 'funds' }, { to: 'TRANSPORT', relation: 'funds' },
    { to: 'INTERIOR', relation: 'funds' }, { to: 'JUSTICE', relation: 'funds' },
  ],
  ENERGY: [
    { to: 'HEALTH', relation: 'supplies' }, { to: 'TRANSPORT', relation: 'supplies' },
    { to: 'INTERIOR', relation: 'supplies' }, { to: 'EDUCATION', relation: 'supplies' },
    { to: 'ENVIRONMENT', relation: 'supplies' },
  ],
  TRANSPORT: [
    { to: 'HEALTH', relation: 'moves' }, { to: 'AGRICULTURE', relation: 'moves' },
    { to: 'TRADE', relation: 'moves' }, { to: 'INTERIOR', relation: 'moves' },
  ],
  INTERIOR: [
    { to: 'JUSTICE', relation: 'secures' }, { to: 'HEALTH', relation: 'secures' },
    { to: 'TRANSPORT', relation: 'secures' }, { to: 'ENERGY', relation: 'secures' },
  ],
  JUSTICE: [{ to: 'INTERIOR', relation: 'adjudicates' }, { to: 'LABOR', relation: 'adjudicates' }],
  LABOR: [{ to: 'HEALTH', relation: 'staffs' }, { to: 'EDUCATION', relation: 'staffs' }],
  ENVIRONMENT: [{ to: 'ENERGY', relation: 'regulates' }, { to: 'AGRICULTURE', relation: 'regulates' }],
  TRADE: [{ to: 'AGRICULTURE', relation: 'enables' }, { to: 'FINANCE', relation: 'enables' }],
  AGRICULTURE: [{ to: 'HEALTH', relation: 'feeds' }],
};
const SEV_WEIGHT: Record<IncidentSeverity, number> = { sev1: 100, sev2: 78, sev3: 50, sev4: 28 };
const RELATION_COUPLING: Record<string, number> = {
  funds: 0.9, supplies: 0.8, secures: 0.7, moves: 0.6, staffs: 0.55,
  regulates: 0.5, feeds: 0.5, enables: 0.5, adjudicates: 0.5,
};

function toneForRisk(r: number): OpsTone {
  return r >= 67 ? 'alert' : r >= 34 ? 'warn' : 'ok';
}

// ── Live sovereign data fabric (pure, time-stepped, replayable) ───────
const FABRIC_TICK_MS = 15_000;
const FABRIC_WINDOW = 160;
const P_INCIDENT = 78;   // pressure ≥ → emergent incident
const P_RECOVER = 68;    // hysteresis floor for recovery
const P_DEGRADE = 60;    // service degradation threshold

function fabricTick(): number {
  return Math.floor((Date.now() - db.fabricStartedAt) / FABRIC_TICK_MS);
}
function unit(seed: string): number {
  return seededInt(seed, 0, 1000) / 1000;
}

interface FabricCell { base: number; pressure: number; sources: string[] }

// Pure: the entire national pressure field at a given tick.
function pressuresAt(tick: number): Map<string, FabricCell> {
  const st = db.sovereign.stateName;
  const active = db.ministries.filter(m => m.status === 'active');
  const base = new Map<string, number>();
  for (const m of active) {
    const phase = unit(`fab:${st}:${m.id}:ph`) * Math.PI * 2;
    const amp = seededInt(`fab:${m.id}:amp`, 16, 40);
    const mid = seededInt(`fab:${st}:${m.id}:mid`, 26, 56);
    const slow = Math.sin(phase + tick / 6.5);
    const fast = Math.sin(phase * 1.7 + tick / 2.3);
    let p = mid + amp * 0.7 * slow + amp * 0.3 * fast;
    if (unit(`fab:${m.id}:${Math.floor(tick / 8)}:shock`) > 0.9) p += 28;
    base.set(m.id, Math.max(0, Math.min(100, Math.round(p))));
  }
  const cells = new Map<string, FabricCell>();
  for (const m of active) {
    cells.set(m.id, { base: base.get(m.id) ?? 0, pressure: base.get(m.id) ?? 0, sources: [] });
  }
  const byArch = new Map<ArchetypeKey, string>();
  for (const m of active) if (!byArch.has(m.archetype)) byArch.set(m.archetype, m.id);
  for (const m of active) {
    for (const dep of COORDINATION_DEPS[m.archetype] ?? []) {
      const toId = byArch.get(dep.to);
      if (!toId || toId === m.id) continue;
      const srcP = base.get(m.id) ?? 0;
      const coupling = RELATION_COUPLING[dep.relation] ?? 0.5;
      const contrib = Math.max(0, srcP - 55) * coupling * 0.6;
      if (contrib < 1) continue;
      const cell = cells.get(toId)!;
      cell.pressure = Math.min(100, Math.round(cell.pressure + contrib));
      if (contrib >= 8) cell.sources.push(m.name);
    }
  }
  return cells;
}

function driversFor(m: { id: string; name: string }, cell: FabricCell): string[] {
  const d: string[] = [];
  if (cell.base >= P_DEGRADE) d.push('internal operational load');
  for (const s of cell.sources) d.push(`${s} instability`);
  const realInc = (db.ministryIncidents[m.id] ?? []).filter(i => i.active).length;
  if (realInc > 0) d.push(`${realInc} active incident${realInc === 1 ? '' : 's'}`);
  const q = (db.ministryQueues[m.id] ?? []).filter(x => x.state !== 'cleared').length;
  if (q > 6) d.push('approvals queue surge');
  return d.length ? d : ['nominal'];
}

function fabricChronology(tickNow: number): ChronologyEvent[] {
  const active = db.ministries.filter(m => m.status === 'active');
  const nameById = new Map(active.map(m => [m.id, m.name]));
  const archById = new Map(active.map(m => [m.id, m.archetype]));
  const out: ChronologyEvent[] = [];
  const from = Math.max(1, tickNow - FABRIC_WINDOW);
  const atOf = (t: number) =>
    new Date(db.fabricStartedAt + t * FABRIC_TICK_MS).toISOString();
  for (let t = from; t <= tickNow; t++) {
    const prev = pressuresAt(t - 1);
    const cur = pressuresAt(t);
    for (const m of active) {
      const pc = prev.get(m.id)?.pressure ?? 0;
      const cc = cur.get(m.id)?.pressure ?? 0;
      if (pc < P_INCIDENT && cc >= P_INCIDENT) {
        out.push({
          tick: t, at: atOf(t), ministryId: m.id, ministry: m.name,
          kind: 'incident', tone: cc >= 90 ? 'alert' : 'warn',
          title: `${m.name}: operational incident emerging`,
          detail: `Composite pressure ${cc}/100 crossed the incident threshold`,
        });
      } else if (pc >= P_INCIDENT && cc < P_RECOVER) {
        out.push({
          tick: t, at: atOf(t), ministryId: m.id, ministry: m.name,
          kind: 'recovery', tone: 'ok',
          title: `${m.name}: pressure recovering`,
          detail: `Composite pressure eased to ${cc}/100`,
        });
      } else if (pc < P_DEGRADE && cc >= P_DEGRADE && cc < P_INCIDENT) {
        out.push({
          tick: t, at: atOf(t), ministryId: m.id, ministry: m.name,
          kind: 'degradation', tone: 'warn',
          title: `${m.name}: service degradation`,
          detail: `Pressure rising — ${cc}/100`,
        });
      }
      // sustained → escalation
      if (cc >= P_INCIDENT) {
        const run = [t - 1, t - 2, t - 3].every(
          k => (pressuresAt(k).get(m.id)?.pressure ?? 0) >= P_INCIDENT,
        );
        const justSustained =
          (pressuresAt(t - 4).get(m.id)?.pressure ?? 0) < P_INCIDENT;
        if (run && justSustained) {
          const arch = archById.get(m.id);
          const chain = arch ? profileFor(arch).escalation : [];
          out.push({
            tick: t, at: atOf(t), ministryId: m.id, ministry: m.name,
            kind: 'escalation', tone: 'alert',
            title: `${m.name}: sustained pressure — escalated`,
            detail: `Authority: ${chain[chain.length - 1] ?? 'institutional command'}`,
          });
        }
      }
    }
    // propagation: a stressed source visibly pressuring a dependent
    for (const m of active) {
      if ((cur.get(m.id)?.pressure ?? 0) < P_INCIDENT) continue;
      for (const dep of COORDINATION_DEPS[m.archetype] ?? []) {
        const toId = [...nameById.keys()].find(
          id => archById.get(id) === dep.to && id !== m.id,
        );
        if (!toId) continue;
        const tc = cur.get(toId)!;
        if (tc.sources.includes(m.name) && tc.pressure - tc.base >= 12) {
          out.push({
            tick: t, at: atOf(t), ministryId: toId, ministry: nameById.get(toId),
            kind: 'propagation', tone: tc.pressure >= P_INCIDENT ? 'alert' : 'warn',
            title: `${m.name} → ${nameById.get(toId)}: ${dep.relation} dependency strained`,
            detail: `Disruption at ${m.name} is pressuring ${nameById.get(toId)} (+${tc.pressure - tc.base})`,
          });
          break;
        }
      }
    }
  }
  return out;
}

export function nationalCoordination(): NationalCoordination {
  ensureIncidentsSeeded();
  const tick = fabricTick();
  const active = db.ministries.filter(m => m.status === 'active');
  const byArch = new Map<ArchetypeKey, typeof active[number]>();
  for (const m of active) if (!byArch.has(m.archetype)) byArch.set(m.archetype, m);

  const nodes: CoordinationNode[] = active.map(m => {
    const incs = (db.ministryIncidents[m.id] ?? []).filter(i => i.active);
    const queue = (db.ministryQueues[m.id] ?? []).filter(x => x.state !== 'cleared');
    const slaBreaching = queue.length > 6;
    let risk = incs.reduce((mx, i) => Math.max(mx, SEV_WEIGHT[i.severity]), 0);
    if (slaBreaching) risk = Math.min(100, risk + 15 + Math.min(20, (queue.length - 6) * 3));
    else risk = Math.min(100, risk + Math.min(12, queue.length * 2));
    const sevRank: IncidentSeverity[] = ['sev1', 'sev2', 'sev3', 'sev4'];
    const topSeverity =
      incs.length === 0
        ? null
        : sevRank.find(s => incs.some(i => i.severity === s)) ?? null;
    return {
      ministryId: m.id,
      ministry: m.name,
      archetype: m.archetype,
      riskScore: risk,
      posture: toneForRisk(risk),
      activeIncidents: incs.length,
      topSeverity,
      queueDepth: queue.length,
      slaBreaching,
    };
  });
  const nodeById = new Map(nodes.map(n => [n.ministryId, n]));

  // Live fabric: blend the time-stepped pressure field into node risk so
  // the national picture visibly moves and propagates between ticks.
  const curCells = pressuresAt(tick);
  const prevCells = pressuresAt(tick - 1);
  const fabric: FabricPressure[] = [];
  for (const m of active) {
    const cell = curCells.get(m.id);
    if (!cell) continue;
    const prevP = prevCells.get(m.id)?.pressure ?? cell.pressure;
    const delta = cell.pressure - prevP;
    const node = nodeById.get(m.id);
    if (node) {
      node.riskScore = Math.max(node.riskScore, cell.pressure);
      node.posture = toneForRisk(node.riskScore);
    }
    fabric.push({
      ministryId: m.id,
      ministry: m.name,
      archetype: m.archetype,
      pressure: cell.pressure,
      trend: delta >= 4 ? 'rising' : delta <= -4 ? 'falling' : 'steady',
      drivers: driversFor(m, cell),
    });
  }
  fabric.sort((a, b) => b.pressure - a.pressure);

  const edges: CoordinationEdge[] = [];
  for (const m of active) {
    for (const dep of COORDINATION_DEPS[m.archetype] ?? []) {
      const target = byArch.get(dep.to);
      if (!target || target.id === m.id) continue;
      const from = nodeById.get(m.id);
      if (!from) continue;
      const coupling = RELATION_COUPLING[dep.relation] ?? 0.5;
      edges.push({
        fromId: m.id,
        toId: target.id,
        from: m.name,
        to: target.name,
        relation: dep.relation,
        propagatedRisk: Math.round(from.riskScore * coupling),
      });
    }
  }

  const timeline: OpsTimelineEvent[] = [];
  const now = Date.now();
  for (const e of [...db.audit].slice(-16)) {
    const a = e.action.toLowerCase();
    const tone: OpsTone =
      e.outcome === 'error' || e.outcome === 'denied'
        ? 'alert'
        : a.includes('escalate')
          ? 'warn'
          : a.startsWith('sovereign')
            ? 'neutral'
            : 'ok';
    timeline.push({
      at: e.at,
      kind: a.startsWith('sovereign') ? 'sovereign' : a.includes('escalate') ? 'escalation' : 'audit',
      tone,
      title: `${e.actor} · ${e.action}`,
      detail: `${e.resource}${e.detail ? ` — ${e.detail}` : ''}`,
    });
  }
  for (const m of active) {
    for (const inc of (db.ministryIncidents[m.id] ?? []).filter(i => i.active)) {
      const offsetMin = seededInt(`tl:${m.id}:${inc.key}`, 6, 2160);
      timeline.push({
        at: new Date(now - offsetMin * 60_000).toISOString(),
        ministryId: m.id,
        ministry: m.name,
        kind: 'incident',
        tone: inc.severity === 'sev1' || inc.severity === 'sev2' ? 'alert' : inc.severity === 'sev3' ? 'warn' : 'neutral',
        title: `${m.name}: ${inc.label}`,
        detail: `${inc.severity.toUpperCase()} — ${inc.detail}`,
      });
    }
    const n = nodeById.get(m.id);
    if (n?.slaBreaching) {
      timeline.push({
        at: new Date(now - seededInt(`tl:sla:${m.id}`, 12, 600) * 60_000).toISOString(),
        ministryId: m.id,
        ministry: m.name,
        kind: 'sla',
        tone: 'warn',
        title: `${m.name}: approvals queue breaching SLA`,
        detail: `${n.queueDepth} items beyond service threshold`,
      });
    }
  }
  const chronology = fabricChronology(tick);
  const tlKind: Record<ChronologyEvent['kind'], OpsTimelineEvent['kind']> = {
    incident: 'incident', escalation: 'escalation', recovery: 'audit',
    propagation: 'incident', degradation: 'sla',
  };
  for (const c of chronology.slice(-24)) {
    timeline.push({
      at: c.at,
      ministryId: c.ministryId,
      ministry: c.ministry,
      kind: tlKind[c.kind],
      tone: c.tone,
      title: c.title,
      detail: c.detail,
    });
  }
  timeline.sort((a, b) => (a.at < b.at ? 1 : -1));

  const pinnedIncidents: CoordinationPinned[] = [];
  for (const m of active) {
    const chain = profileFor(m.archetype).escalation;
    for (const inc of (db.ministryIncidents[m.id] ?? []).filter(i => i.active)) {
      if (inc.severity !== 'sev1' && inc.severity !== 'sev2') continue;
      const affects = (COORDINATION_DEPS[m.archetype] ?? [])
        .map(d => byArch.get(d.to))
        .filter((x): x is typeof active[number] => !!x && x.id !== m.id)
        .map(x => x.name);
      pinnedIncidents.push({
        ministryId: m.id,
        ministry: m.name,
        label: inc.label,
        severity: inc.severity,
        authority: chain[inc.tierIndex] ?? '—',
        affects,
      });
    }
  }
  pinnedIncidents.sort((a, b) => a.severity.localeCompare(b.severity));

  const avgNode = nodes.length
    ? Math.round(nodes.reduce((s, n) => s + n.riskScore, 0) / nodes.length)
    : 0;
  const maxEdge = edges.reduce((mx, e) => Math.max(mx, e.propagatedRisk), 0);
  const nationalRisk = Math.round(0.65 * avgNode + 0.35 * maxEdge);
  const cascadeRisks = edges.filter(e => e.propagatedRisk >= 50).length;
  const level = toneForRisk(nationalRisk);

  return {
    sovereign: db.sovereign,
    generatedAt: new Date().toISOString(),
    tick,
    tickMs: FABRIC_TICK_MS,
    posture: {
      level,
      label: level === 'alert' ? 'CRITICAL' : level === 'warn' ? 'STRAINED' : 'STABLE',
      nationalRisk,
      coordinatingMinistries: nodes.length,
      cascadeRisks,
    },
    nodes,
    edges,
    fabric,
    chronology,
    timeline: timeline.slice(0, 28),
    pinnedIncidents,
  };
}

export function nationalSnapshot(): NationalSnapshot {
  ensureIncidentsSeeded();
  const ministries = db.ministries.filter(m => m.status !== 'merged');
  const active = ministries.filter(m => m.status === 'active');

  // Each figure says where it comes from (lib/twin/signal.ts). Population has no
  // source until a statistics feed is connected (register 16.2); regions and
  // institutions are the nation's own records; the indices are samples from
  // the reference model, deterministic per configured state.
  const seedKey = db.sovereign.stateName;
  const fiscalIdx = seededInt(`nat:${seedKey}:fis`, 78, 118);    // budget exec index
  const svcAvail = seededInt(`nat:${seedKey}:svc`, 92, 100);
  const regions = nationRegions();
  const regionsN = regions.length || seededInt(`nat:${seedKey}:reg`, 6, 36);

  const indicators: NationalIndicator[] = [
    { label: 'Population', value: '—', unit: '', kind: 'unavailable', source: 'No population source connected (statistics office feed, register 16.2)' },
    { label: db.sovereign.regionNoun + 's', value: String(regionsN), unit: '', ...(regions.length ? { kind: 'reported' as const, source: 'Nation profile (setup): official subdivisions' } : { kind: 'sample' as const, source: REFERENCE_MODEL }) },
    { label: 'Fiscal execution index', value: String(fiscalIdx), unit: '', kind: 'sample', source: REFERENCE_MODEL },
    { label: 'Service availability', value: String(svcAvail), unit: '%', kind: 'sample', source: REFERENCE_MODEL },
    { label: 'Institutions', value: String(ministries.length), unit: '', kind: 'reported', source: 'Ministry registry (/api/org)' },
  ];

  const crossMinistryIncidents: CrossMinistryIncident[] = [];
  for (const m of active) {
    const list = db.ministryIncidents[m.id] ?? [];
    const chain = profileFor(m.archetype).escalation;
    for (const inc of list) {
      if (inc.active) {
        crossMinistryIncidents.push({
          ministryId: m.id,
          ministry: m.name,
          archetype: m.archetype,
          label: inc.label,
          severity: inc.severity,
          authority: chain[inc.tierIndex] ?? '—',
          key: inc.key,
          ...(inc.place ? { place: inc.place } : {}),
        });
      }
    }
  }
  crossMinistryIncidents.sort((a, b) => a.severity.localeCompare(b.severity));

  const queuesBreaching = active.filter(
    m => (db.ministryQueues[m.id] ?? []).filter(x => x.state !== 'cleared').length > 6,
  ).length;
  const audit = verifyAuditChain();

  return {
    sovereign: db.sovereign,
    generatedAt: new Date().toISOString(),
    classification: 'OFFICIAL',
    environment: 'Production',
    indicators,
    crossMinistryIncidents,
    totals: {
      institutions: ministries.length,
      activeMinistries: active.length,
      activeIncidents: crossMinistryIncidents.length,
      queuesBreaching,
      auditIntact: audit.ok,
    },
  };
}
