// The institutional framework: archetypes, ministries, module operations,
// regions, queues, ministry incidents, field operations and series.
import { specFor } from '@/lib/ops-catalog';
import { profileFor } from '@/lib/archetype-profiles';
import { scoreInstitution } from '@/lib/institution/readiness';
import { blueprintFor } from '@/lib/institution/blueprint';
import type {
  Archetype,
  ArchetypeKey,
  Ministry,
  Department,
  MinistryOperations,
  ModuleOps,
  KpiValue,
  QueueValue,
  AlertValue,
  OpsTone,
  RegionStat,
  MinistryRegions,
  QueueItem,
  QueueItemState,
  QueueAction,
  MinistryQueue,
  AnalyticDelta,
  MinistryIncident,
  MinistryIncidents,
  FieldUnitStatus,
  MinistryFieldOps,
  AnalyticSeries,
  MinistrySeries,
} from '@/lib/api/types';
import { db } from './state';
import { uid, seededInt, REGIONS } from './shared';
import { recordAudit, UNVERIFIED_ACTOR } from './audit';
import { seedQueue, seedIncidents } from './seeds';

// ── Institutional framework (mirrors backend archetypes) ──────────────
const ARCHETYPES: Record<ArchetypeKey, Archetype> = {
  HEALTH: { key: 'HEALTH', title: 'Ministry of Health', summary: 'Public health, facilities, licensing, outbreak response.', defaultDepartments: ['Public Health', 'Facilities & Licensing', 'Pharmaceuticals', 'Emergency Response'], defaultModules: ['facilities', 'licensing', 'outbreak-monitoring', 'pharma-supply', 'vaccination', 'ambulance-coordination'], domainEntities: ['Hospital', 'Clinic', 'Practitioner', 'Outbreak', 'PharmaBatch', 'VaccinationRecord'] },
  EDUCATION: { key: 'EDUCATION', title: 'Ministry of Education', summary: 'Schools, learners, examinations, curriculum, scholarships.', defaultDepartments: ['Basic Education', 'Examinations', 'Curriculum', 'Scholarships'], defaultModules: ['schools', 'enrolment', 'examinations', 'curriculum', 'scholarships', 'performance-analytics'], domainEntities: ['School', 'Learner', 'Teacher', 'Exam', 'Curriculum', 'Scholarship'] },
  FINANCE: { key: 'FINANCE', title: 'Ministry of Finance / Treasury', summary: 'Treasury, taxation, budget, procurement, public expenditure.', defaultDepartments: ['Treasury', 'Revenue', 'Budget', 'Procurement'], defaultModules: ['treasury', 'taxation', 'budget', 'procurement', 'grants', 'expenditure'], domainEntities: ['Account', 'TaxFiling', 'BudgetLine', 'Tender', 'Grant', 'Disbursement'] },
  AGRICULTURE: { key: 'AGRICULTURE', title: 'Ministry of Agriculture', summary: 'Extension, subsidies, irrigation, market access.', defaultDepartments: ['Extension Services', 'Subsidies', 'Irrigation', 'Markets'], defaultModules: ['farmer-registry', 'subsidies', 'extension', 'market-access', 'climate-advisory'], domainEntities: ['Farmer', 'Subsidy', 'IrrigationScheme', 'MarketPrice', 'ExtensionVisit'] },
  ENERGY: { key: 'ENERGY', title: 'Ministry of Energy', summary: 'Generation, grid, licensing, rural electrification.', defaultDepartments: ['Generation', 'Grid', 'Licensing', 'Electrification'], defaultModules: ['grid-monitoring', 'licensing', 'electrification', 'tariffs'], domainEntities: ['PowerPlant', 'GridSegment', 'Licence', 'ElectrificationProject', 'Tariff'] },
  TRANSPORT: { key: 'TRANSPORT', title: 'Ministry of Transport', summary: 'Roads, vehicles, licensing, public transit, safety.', defaultDepartments: ['Roads', 'Vehicle Registration', 'Licensing', 'Public Transit'], defaultModules: ['vehicle-registry', 'driver-licensing', 'roads', 'transit', 'road-safety'], domainEntities: ['Vehicle', 'DriverLicence', 'RoadSegment', 'TransitRoute', 'Inspection'] },
  JUSTICE: { key: 'JUSTICE', title: 'Ministry of Justice', summary: 'Courts coordination, legal aid, registries, corrections.', defaultDepartments: ['Legal Aid', 'Registries', 'Corrections', 'Court Liaison'], defaultModules: ['legal-aid', 'registries', 'case-coordination', 'corrections'], domainEntities: ['Case', 'LegalAidGrant', 'Registry', 'Facility'] },
  ENVIRONMENT: { key: 'ENVIRONMENT', title: 'Ministry of Environment', summary: 'Monitoring, permits, conservation, climate adaptation.', defaultDepartments: ['Monitoring', 'Permits', 'Conservation', 'Climate'], defaultModules: ['environmental-monitoring', 'permits', 'conservation', 'climate-adaptation'], domainEntities: ['MonitoringStation', 'EnvPermit', 'ProtectedArea', 'EmissionRecord'] },
  INTERIOR: { key: 'INTERIOR', title: 'Ministry of Interior', summary: 'Civil registry, identity, internal coordination.', defaultDepartments: ['Civil Registry', 'Identity', 'Coordination'], defaultModules: ['civil-registry', 'identity', 'permits'], domainEntities: ['CivilRecord', 'IdentityCredential', 'Permit'] },
  LABOR: { key: 'LABOR', title: 'Ministry of Labor', summary: 'Employment, inspections, social insurance, disputes.', defaultDepartments: ['Employment', 'Inspections', 'Social Insurance'], defaultModules: ['employment-registry', 'inspections', 'social-insurance', 'disputes'], domainEntities: ['Employer', 'Worker', 'Inspection', 'InsuranceClaim', 'Dispute'] },
  TRADE: { key: 'TRADE', title: 'Ministry of Trade & Industry', summary: 'Business registration, licensing, standards, exports.', defaultDepartments: ['Business Registration', 'Standards', 'Exports'], defaultModules: ['business-registry', 'licensing', 'standards', 'export-facilitation'], domainEntities: ['Business', 'Licence', 'Standard', 'ExportPermit'] },
  GENERIC: { key: 'GENERIC', title: 'Generic Ministry / Agency / Commission', summary: 'A blank institutional foundation to compose from scratch.', defaultDepartments: ['Administration'], defaultModules: ['documents', 'notifications'], domainEntities: ['Record'] },
};

export function listArchetypes(): Archetype[] {
  return Object.values(ARCHETYPES);
}
export function listMinistries(): Ministry[] {
  return [...db.ministries].sort(
    (a, b) => +new Date(b.createdAt) - +new Date(a.createdAt),
  );
}
/**
 * The institutions that keep records of one kind (an archetype's domain
 * entity, e.g. 'Permit'): the registry's active ministries whose archetype
 * holds it. Read at use, from the registry; used to scope who reads those
 * records (lib/auth/roles.ts canReadPermits()).
 */
export function institutionsKeeping(entity: string): string[] {
  return db.ministries.filter(m => m.status === 'active' && ARCHETYPES[m.archetype]?.domainEntities.includes(entity)).map(m => m.id);
}
export function getMinistry(id: string): Ministry | undefined {
  return db.ministries.find(m => m.id === id);
}
export function createMinistry(input: {
  archetype: ArchetypeKey;
  name: string;
  slug: string;
  /** Who acted: the verified official (routes pass it from the session). */
  by?: string;
}): Ministry | { error: string } {
  const bp = ARCHETYPES[input.archetype];
  if (!bp) return { error: 'Unknown archetype' };
  if (!/^[a-z0-9-]+$/.test(input.slug)) {
    return { error: 'slug must be lowercase letters, digits, hyphens' };
  }
  if (db.ministries.some(m => m.slug === input.slug)) {
    return { error: 'slug already used' };
  }
  // Provisioning instantiates the institution from its archetype blueprint:
  // every operating group of the generated ecosystem becomes a department,
  // so the institution is a real structure, not a thin container.
  const groups = blueprintFor(input.archetype).map(g => g.name);
  const deptNames = groups.length ? groups : bp.defaultDepartments;
  const m: Ministry = {
    id: uid('MIN'),
    slug: input.slug,
    name: input.name,
    archetype: input.archetype,
    status: 'active',
    // An executive ministry until the nation records otherwise (lib/data/store/institutions.ts).
    standing: 'executive-ministry',
    createdAt: new Date().toISOString(),
    departments: deptNames.map(name => ({ id: uid('DEP'), name })),
    modules: bp.defaultModules.map(moduleKey => ({ moduleKey, enabled: true })),
  };
  m.activatedAt = m.createdAt;
  db.ministries.unshift(m);
  recordAudit(input.by || UNVERIFIED_ACTOR, 'ministry.create', `Ministry:${m.id}`, 'ok', `${input.archetype}/${input.slug}`);
  return m;
}
/**
 * Take in an institution's registry record from its own export
 * (lib/portability/import.ts, confirmed by two officials), keeping its id so
 * every record that names it still resolves. Its constitutional terms are not
 * taken from the export: this installation records them through its own
 * change process. An institution already here with that id is kept as it is.
 */
export function adoptInstitution(r: { id: string; slug: string; name: string; archetype: ArchetypeKey; departments?: Department[]; createdAt?: string }, by: string): Ministry | { error: string } {
  const here = db.ministries.find(m => m.id === r.id);
  if (here) return here;
  if (!ARCHETYPES[r.archetype]) return { error: `Unknown archetype ${r.archetype}` };
  if (!/^[a-z0-9-]+$/.test(r.slug) || db.ministries.some(m => m.slug === r.slug)) return { error: `The institution's short name ${r.slug} is already used here by another institution` };
  const at = new Date().toISOString();
  const m: Ministry = { id: r.id, slug: r.slug, name: r.name.slice(0, 200), archetype: r.archetype, status: 'active', standing: 'executive-ministry', createdAt: r.createdAt ?? at, activatedAt: at,
    departments: (r.departments ?? []).map(d => ({ ...structuredClone(d), id: d.id, name: d.name })), modules: [] };
  db.ministries.unshift(m);
  recordAudit(by, 'ministry.adopt', `Ministry:${m.id}`, 'ok', `${m.name} taken in from its own export with its id; its standing is recorded here through the change process`);
  return m;
}
export function renameMinistry(id: string, name: string, by = UNVERIFIED_ACTOR): Ministry | { error: string } {
  const m = getMinistry(id);
  if (!m) return { error: 'Ministry not found' };
  m.name = name;
  recordAudit(by, 'ministry.rename', `Ministry:${id}`, 'ok', name);
  return m;
}
/**
 * The activation gate (plan I2): completeness per item
 * (lib/onboarding/completeness.ts registers it), which refuses activation in
 * a production installation while a critical item is not verified. Kept on
 * globalThis so this store needs no import of the modules completeness reads.
 */
const gate = globalThis as unknown as { __institutionActivationGate?: (id: string) => string | null };
export function registerActivationGate(fn: (id: string) => string | null): void { gate.__institutionActivationGate = fn; }

/**
 * Activate an institution. The composite readiness score
 * (lib/institution/readiness.ts) no longer gates activation (plan I0.2): it
 * is recorded with the entry for information only. The gate is completeness
 * per item, with owner, date and next action (lib/onboarding/completeness.ts,
 * plan I2): in production every critical item verified.
 */
export function activateMinistry(id: string, by = UNVERIFIED_ACTOR): Ministry | { error: string } {
  const m = getMinistry(id);
  if (!m) return { error: 'Ministry not found' };
  if (m.status === 'merged') return { error: 'Merged institutions cannot be activated' };
  const held = gate.__institutionActivationGate?.(id) ?? null;
  if (held) {
    recordAudit(by, 'ministry.activate', `Ministry:${id}`, 'denied', held.slice(0, 400));
    return { error: held };
  }
  const r = scoreInstitution({ ...m, status: 'active' });
  m.status = 'active';
  m.activatedAt ??= new Date().toISOString();
  recordAudit(by, 'ministry.activate', `Ministry:${id}`, 'ok', `structure score ${r.total}% (information only, not a gate)${r.blocking.length ? ` · open items: ${r.blocking.join('; ')}` : ''}`.slice(0, 400));
  return m;
}
export function deactivateMinistry(id: string, by = UNVERIFIED_ACTOR): Ministry | { error: string } {
  const m = getMinistry(id);
  if (!m) return { error: 'Ministry not found' };
  m.status = 'deactivated';
  recordAudit(by, 'ministry.deactivate', `Ministry:${id}`, 'ok');
  return m;
}
export function mergeMinistry(sourceId: string, targetId: string, by = UNVERIFIED_ACTOR): Ministry | { error: string } {
  if (sourceId === targetId) return { error: 'Cannot merge into itself' };
  const src = getMinistry(sourceId);
  const tgt = getMinistry(targetId);
  if (!src || !tgt) return { error: 'Ministry not found' };
  if (src.status !== 'active' || tgt.status !== 'active') {
    return { error: 'Both ministries must be active' };
  }
  const at = new Date().toISOString();
  // The target takes over the source's departments in operation (a copy with the same id); the
  // source keeps its own, ended with the merge as the reason: a department is never deleted (plan I0.2).
  for (const d of src.departments) {
    if (!isActiveDepartment(d)) continue;
    if (!activeDepartments(tgt).some(x => x.name === d.name)) tgt.departments.push({ ...structuredClone(d), status: 'active' });
    Object.assign(d, { status: 'ended', endedAt: at, endedBy: by, endReason: `Merged into ${tgt.name}` });
  }
  for (const mod of src.modules) {
    if (!tgt.modules.some(x => x.moduleKey === mod.moduleKey)) tgt.modules.push(mod);
  }
  src.status = 'merged';
  src.mergedIntoId = targetId;
  src.modules = [];
  recordAudit(by, 'ministry.merge', `Ministry:${sourceId}`, 'ok', `-> ${targetId}`);
  return tgt;
}
/** Whether a department is in operation (records from before carry no status: active). */
export const isActiveDepartment = (d: { status?: string }): boolean => d.status !== 'ended';
/** An institution's departments in operation (ended ones stay on the record, never deleted). */
export const activeDepartments = <D extends { status?: string }>(m: { departments?: D[] }): D[] => (m.departments ?? []).filter(isActiveDepartment);

export function addDepartment(ministryId: string, name: string, by = UNVERIFIED_ACTOR): Ministry | { error: string } {
  const m = getMinistry(ministryId);
  if (!m) return { error: 'Ministry not found' };
  if (activeDepartments(m).some(d => d.name === name)) return { error: 'Department exists' };
  m.departments.push({ id: uid('DEP'), name, status: 'active' });
  recordAudit(by, 'department.add', `Ministry:${ministryId}`, 'ok', name);
  return m;
}
/**
 * End a department with a reason: it stays on the record (status ended, who,
 * when and why), never deleted (plan I0.2). The earlier DELETE route asks for
 * the reason and ends it.
 */
export function endDepartment(ministryId: string, deptId: string, reason: string, by = UNVERIFIED_ACTOR): Ministry | { error: string; status: number } {
  const m = getMinistry(ministryId);
  if (!m) return { error: 'Ministry not found', status: 404 };
  const d = m.departments.find(x => x.id === deptId);
  if (!d) return { error: 'Department not found', status: 404 };
  if (!isActiveDepartment(d)) return { error: `${d.name} was already ended on ${d.endedAt?.slice(0, 10) ?? 'an earlier date'}`, status: 409 };
  const why = String(reason ?? '').trim().slice(0, 500);
  if (!why) return { error: 'Give the reason the department is ended: a department is ended with a reason and kept, never deleted', status: 422 };
  Object.assign(d, { status: 'ended', endedAt: new Date().toISOString(), endedBy: by, endReason: why });
  recordAudit(by, 'department.end', `Ministry:${ministryId}`, 'ok', `${d.name} (${d.id}) · ${why}`.slice(0, 400));
  return m;
}
export function setModule(ministryId: string, moduleKey: string, enabled: boolean, by = UNVERIFIED_ACTOR): Ministry | { error: string } {
  const m = getMinistry(ministryId);
  if (!m) return { error: 'Ministry not found' };
  const existing = m.modules.find(x => x.moduleKey === moduleKey);
  if (existing) existing.enabled = enabled;
  else m.modules.push({ moduleKey, enabled });
  recordAudit(by, 'module.set', `Ministry:${ministryId}`, 'ok', `${moduleKey}=${enabled}`);
  return m;
}

// ── Module operations (archetype-driven dashboards) ───────────────────

export function ministryOperations(id: string): MinistryOperations | { error: string } {
  const m = getMinistry(id);
  if (!m) return { error: 'Ministry not found' };

  // Real-data hooks: where a module maps onto existing platform data, use it.
  const openPermits = db.permits.filter(p =>
    ['submitted', 'in-review', 'needs-info'].includes(p.status),
  ).length;

  const modules: ModuleOps[] = m.modules
    .filter(mod => mod.enabled)
    .map(mod => {
      const spec = specFor(mod.moduleKey);
      const kpis: KpiValue[] = spec.kpis.map(k => {
        const raw = seededInt(`${id}:${mod.moduleKey}:${k.key}`, k.range[0], k.range[1]);
        const good =
          k.direction === 'higher-better' ? raw >= k.target : raw <= k.target;
        const near =
          k.direction === 'higher-better'
            ? raw >= k.target * 0.9
            : raw <= k.target * 1.15;
        const tone: OpsTone = good ? 'ok' : near ? 'warn' : 'alert';
        return {
          label: k.label,
          value: `${raw}${k.unit ?? ''}`,
          tone,
          target: `${k.target}${k.unit ?? ''}`,
        };
      });
      const queues: QueueValue[] = spec.queues.map(q => {
        let depth = seededInt(`${id}:${mod.moduleKey}:${q.key}:d`, q.range[0], q.range[1]);
        // Health licensing queue reflects real open permits.
        if (mod.moduleKey === 'licensing' && m.archetype === 'HEALTH') {
          depth = openPermits;
        }
        const oldest = seededInt(`${id}:${mod.moduleKey}:${q.key}:o`, 1, Math.round(q.slaHours * 1.2));
        return {
          label: q.label,
          depth,
          oldestAgeHours: oldest,
          slaHours: q.slaHours,
          breaching: oldest > q.slaHours,
        };
      });
      const alerts: AlertValue[] = spec.alerts.map(a => {
        const roll = seededInt(`${id}:${mod.moduleKey}:${a.key}`, 0, 100) / 100;
        return {
          label: a.label,
          severity: a.severity,
          active: roll < a.likelihood,
          detail: a.detail,
        };
      });
      return { module: mod.moduleKey, title: spec.title, kpis, queues, alerts };
    });

  return {
    ministry: { id: m.id, name: m.name, archetype: m.archetype, status: m.status },
    generatedAt: new Date().toISOString(),
    // Generated (seeded) figures, marked wherever they are read.
    kind: 'sample',
    modules,
  };
}

// ── Deep operational console (regions, queues, analytics) ─────────────
/** The regions queue cases and regional figures are reported under (the nation's, from setup). */
export const queueRegions = (): string[] => [...REGIONS];

export function regionsFor(id: string): MinistryRegions | { error: string } {
  const m = getMinistry(id);
  if (!m) return { error: 'Ministry not found' };
  const openPermits = db.permits.filter(p =>
    ['submitted', 'in-review', 'needs-info'].includes(p.status),
  ).length;
  const regions: RegionStat[] = REGIONS.map((region, i) => {
    const facil = seededInt(`${id}:${region}:facil`, 78, 99);
    const cap = seededInt(`${id}:${region}:cap`, 45, 95);
    const sla = seededInt(`${id}:${region}:sla`, 0, 6);
    // Spread real open permits across regions deterministically.
    const openCases =
      seededInt(`${id}:${region}:open`, 4, 60) + (i === 0 ? openPermits : 0);
    const status: OpsTone =
      facil < 85 || sla > 3 ? 'alert' : facil < 92 || sla > 1 ? 'warn' : 'ok';
    return {
      region,
      facilitiesOperationalPct: facil,
      capacityPct: cap,
      openCases,
      slaBreaches: sla,
      status,
    };
  });
  const prof = profileFor(m.archetype);
  return {
    ministry: { id: m.id, name: m.name, archetype: m.archetype },
    labels: {
      unit: prof.regionUnitLabel,
      capacity: prof.capacityLabel,
      cases: prof.caseLabel,
    },
    generatedAt: new Date().toISOString(),
    // Generated (seeded) figures, marked wherever they are read.
    kind: 'sample',
    regions,
  };
}

export function analyticsFor(id: string): AnalyticDelta[] | { error: string } {
  const m = getMinistry(id);
  if (!m) return { error: 'Ministry not found' };
  // Archetype-specialised KPIs (Health ≠ Finance ≠ Transport …).
  const profile = profileFor(m.archetype);
  return profile.kpis.map(k => {
    const v = seededInt(`${id}:an:${k.key}`, k.range[0], k.range[1]);
    const d = seededInt(`${id}:an:${k.key}:d`, -120, 140) / 10;
    return {
      label: k.label,
      value: `${v}${k.unit}`,
      delta: d,
      goodWhenUp: k.goodWhenUp,
    };
  });
}

export function queueFor(id: string): MinistryQueue | { error: string } {
  const m = getMinistry(id);
  if (!m) return { error: 'Ministry not found' };
  if (!db.ministryQueues[id]) db.ministryQueues[id] = seedQueue(id);
  // Real cases age from when they were received; examples keep their stated age.
  const now = Date.now();
  for (const it of db.ministryQueues[id]!) {
    if (it.receivedAt) it.ageHours = Math.max(0, Math.floor((now - Date.parse(it.receivedAt)) / 3_600_000));
  }
  const title = profileFor(m.archetype).queueTitle;
  return {
    ministry: { id: m.id, name: m.name, archetype: m.archetype },
    queueKey: 'approvals',
    title,
    slaHours: 288,
    items: db.ministryQueues[id]!,
  };
}

export function actOnQueueItem(
  id: string,
  itemId: string,
  action: QueueAction,
  by: string,
  note?: string,
): QueueItem | { error: string } {
  const q = db.ministryQueues[id];
  if (!q) return { error: 'Queue not found' };
  const item = q.find(x => x.id === itemId);
  if (!item) return { error: 'Item not found' };
  if (item.state === 'cleared') return { error: 'Item already cleared' };
  const nextState: Record<QueueAction, QueueItemState> = {
    assign: 'assigned',
    escalate: 'escalated',
    clear: 'cleared',
  };
  item.state = nextState[action];
  item.actedAt = new Date().toISOString();
  if (action === 'assign') item.assignee = by;
  if (note) item.note = note;
  recordAudit(by, `queue.${action}`, `QueueItem:${itemId}`, 'ok', item.ref);
  return item;
}

// ── Archetype-specialised: incidents + escalation, field operations ───
export function incidentsFor(id: string): MinistryIncidents | { error: string } {
  const m = getMinistry(id);
  if (!m) return { error: 'Ministry not found' };
  if (!db.ministryIncidents[id]) {
    db.ministryIncidents[id] = seedIncidents(id, m.archetype);
  }
  return {
    ministry: { id: m.id, name: m.name, archetype: m.archetype },
    escalation: profileFor(m.archetype).escalation,
    incidents: db.ministryIncidents[id]!,
  };
}

export function escalateMinistryIncident(
  id: string,
  key: string,
  by: string,
): MinistryIncident | { error: string } {
  const m = getMinistry(id);
  if (!m) return { error: 'Ministry not found' };
  if (!db.ministryIncidents[id]) {
    db.ministryIncidents[id] = seedIncidents(id, m.archetype);
  }
  const chain = profileFor(m.archetype).escalation;
  const inc = db.ministryIncidents[id]!.find(x => x.key === key);
  if (!inc) return { error: 'Incident not found' };
  if (!inc.active) return { error: 'Incident is not active' };
  if (inc.tierIndex >= chain.length - 1) {
    return { error: 'Already at top of escalation chain' };
  }
  inc.tierIndex += 1;
  recordAudit(
    by,
    'ministry-incident.escalate',
    `Ministry:${id}/${key}`,
    'ok',
    `-> ${chain[inc.tierIndex]}`,
  );
  return inc;
}

/** Record, move or clear where a ministry incident is (checked first by lib/data/incident-places.ts). */
export function setMinistryIncidentPlace(
  id: string,
  key: string,
  place: MinistryIncident['place'] | null,
  by: string,
  note?: string,
): MinistryIncident | { error: string } {
  const m = getMinistry(id);
  if (!m) return { error: 'Ministry not found' };
  if (!db.ministryIncidents[id]) db.ministryIncidents[id] = seedIncidents(id, m.archetype);
  const inc = db.ministryIncidents[id]!.find(x => x.key === key);
  if (!inc) return { error: 'Incident not found' };
  if (!place && !inc.place) return { error: 'The incident has no place to clear' };
  if (inc.place) inc.placeHistory = [...(inc.placeHistory ?? []), inc.place];
  if (place) inc.place = place;
  else {
    inc.placeHistory!.push({ ...inc.place!, by, at: new Date().toISOString(), note, cleared: true });
    delete inc.place;
  }
  const where = place ? (place.facilityName ?? [place.district, place.region].filter(Boolean).join(', ')) || place.how : 'cleared';
  recordAudit(by, place ? 'ministry-incident.place' : 'ministry-incident.place.clear', `Ministry:${id}/${key}`, 'ok', note ? `${where} · ${note}` : where);
  return inc;
}

export function resolveMinistryIncident(
  id: string,
  key: string,
  by: string,
): MinistryIncident | { error: string } {
  const m = getMinistry(id);
  if (!m) return { error: 'Ministry not found' };
  const list = db.ministryIncidents[id];
  const inc = list?.find(x => x.key === key);
  if (!inc) return { error: 'Incident not found' };
  inc.active = false;
  inc.tierIndex = 0;
  recordAudit(by, 'ministry-incident.resolve', `Ministry:${id}/${key}`, 'ok');
  return inc;
}

export function fieldOpsFor(id: string): MinistryFieldOps | { error: string } {
  const m = getMinistry(id);
  if (!m) return { error: 'Ministry not found' };
  const prof = profileFor(m.archetype);
  const units: FieldUnitStatus[] = prof.fieldUnits.map(u => {
    const counts = u.states.map(state => ({
      state,
      n: seededInt(`${id}:fld:${u.key}:${state}`, 0, 24),
    }));
    return {
      unit: u.key,
      label: u.label,
      counts,
      total: counts.reduce((s, c) => s + c.n, 0),
    };
  });
  return {
    ministry: { id: m.id, name: m.name, archetype: m.archetype },
    // Generated (seeded) figures, marked wherever they are read.
    kind: 'sample',
    units,
  };
}


// ── Command visualisation series (deterministic period trend) ─────────
export function seriesFor(id: string): MinistrySeries | { error: string } {
  const m = getMinistry(id);
  if (!m) return { error: 'Ministry not found' };
  const prof = profileFor(m.archetype);
  const series: AnalyticSeries[] = prof.kpis.map(k => {
    const lo = k.range[0];
    const hi = k.range[1];
    const points: number[] = [];
    for (let t = 0; t < 12; t++) {
      points.push(seededInt(`${id}:ser:${k.key}:${t}`, lo, hi));
    }
    const current = points[points.length - 1]!;
    const mean = Math.round(points.reduce((a, b) => a + b, 0) / points.length);
    return {
      key: k.key,
      label: k.label,
      unit: k.unit,
      points,
      current,
      mean,
      goodWhenUp: k.goodWhenUp,
    };
  });
  return {
    ministry: { id: m.id, name: m.name, archetype: m.archetype },
    // Generated (seeded) figures, marked wherever they are read.
    kind: 'sample',
    series,
  };
}
