// Sovereign institution-factory core. Pure, deterministic, no React/DOM.
// An institution's readiness, lifecycle and deployability are computed
// from its actual composed structure + the capabilities its archetype
// guarantees — not assumed. Every command surface derives from this.

import type { Ministry } from '@/lib/api/types';
import { ARCHETYPE_PROFILES } from '@/lib/archetype-profiles';
import { specFor } from '@/lib/institution/archetype-spec';
import { subsystemHealth } from '@/lib/institution/operational-catalog';
import { ministryFabric } from '@/lib/institution/ministry-fabric';

export type Lifecycle =
  | 'draft' | 'composed' | 'validated' | 'operational'
  | 'nationally-active' | 'crisis-capable';

export interface ReadinessDimension {
  key: string;
  label: string;
  score: number; // 0-100
  detail: string;
}
export interface InstitutionReadiness {
  dimensions: ReadinessDimension[];
  total: number;            // 0-100 weighted composite
  lifecycle: Lifecycle;
  deployable: boolean;      // passes the activation gate
  blocking: string[];       // why not deployable (empty if deployable)
}

const clamp = (n: number) => Math.max(0, Math.min(100, Math.round(n)));

// Activation gate: an institution may not reach a nationally-active
// lifecycle until composite readiness passes and no critical dimension
// is unprovisioned.
export const READINESS_THRESHOLD = 70;
const CRITICAL = ['governance', 'operational', 'deployment'];

export function scoreInstitution(m: Ministry, ctx?: { cascadeStress?: number }): InstitutionReadiness {
  const profile = ARCHETYPE_PROFILES[m.archetype];
  const spec = specFor(m.archetype);
  const depts = m.departments?.length ?? 0;
  const mods = m.modules?.filter(x => x.enabled).length ?? 0;
  const totalMods = m.modules?.length ?? 0;
  const isActive = m.status === 'active';
  const known = !!profile && m.archetype !== 'GENERIC';
  const ssHealth = subsystemHealth(m.id, m.archetype);
  const fab = ministryFabric({ id: m.id, archetype: m.archetype });

  const dims: ReadinessDimension[] = [
    { key: 'governance', label: 'Governance structure',
      score: clamp((depts / spec.requiredDepartments) * 100),
      detail: `${depts}/${spec.requiredDepartments} departments` },
    { key: 'operational', label: 'Operational modules',
      score: clamp((mods / spec.requiredModules) * 100),
      detail: `${mods}/${spec.requiredModules} required enabled` },
    { key: 'telemetry', label: 'Telemetry & KPIs',
      score: known ? clamp((profile.kpis.length / 4) * 100) : 55,
      detail: known ? `${profile.kpis.length} KPI contracts` : 'generic schema' },
    { key: 'staffing', label: 'Field staffing',
      score: known ? clamp((profile.fieldUnits.length / 3) * 100) : 50,
      detail: known ? `${profile.fieldUnits.length} field unit classes` : 'baseline' },
    { key: 'infrastructure', label: 'Subsystem operational health',
      score: isActive ? clamp(ssHealth * 0.7 + (mods / spec.requiredModules) * 30)
        : depts > 0 || mods > 0 ? 45 : 0,
      detail: isActive ? `${ssHealth}% mean across institutional subsystems`
        : 'subsystems not provisioned (inactive)' },
    { key: 'interoperability', label: 'Interoperability',
      score: isActive ? clamp(64 + fab.dependencies.length * 8) : 55,
      detail: isActive ? `${fab.dependencies.length} cross-ministry dependencies wired` : 'not connected' },
    { key: 'fabric', label: 'Institutional fabric',
      score: isActive ? clamp((fab.layersProvisioned / 6) * 70 + (fab.tiers.length / 3) * 30)
        : depts > 0 || mods > 0 ? 40 : 0,
      detail: isActive ? `${fab.layersProvisioned}/6 layers · ${fab.tiers.length} command tiers`
        : 'ecosystem not composed' },
    { key: 'emergency', label: 'Emergency readiness',
      score: known ? clamp((profile.incidentTypes.length / 3) * 100) : 45,
      detail: known ? `${profile.incidentTypes.length} incident classes` : 'generic' },
    { key: 'audit', label: 'Audit integrity',
      score: 100, detail: 'tamper-evident chain inherited' },
    { key: 'deployment', label: 'Deployment readiness',
      score: isActive && depts > 0 && mods > 0 ? 100 : depts > 0 || mods > 0 ? 45 : 0,
      detail: isActive ? 'activatable' : 'not activated' },
    { key: 'resilience', label: 'Cascade resilience',
      score: ctx?.cascadeStress == null ? 90 : clamp(100 - ctx.cascadeStress),
      detail: ctx?.cascadeStress == null ? 'no propagated stress' : `${ctx.cascadeStress} propagated stress` },
  ];

  // Weighted composite — critical dimensions weigh double.
  let wsum = 0, w = 0;
  for (const d of dims) {
    const weight = CRITICAL.includes(d.key) ? 2 : 1;
    wsum += d.score * weight; w += weight;
  }
  const total = clamp(wsum / w);

  const blocking: string[] = [];
  for (const d of dims) {
    if (CRITICAL.includes(d.key) && d.score < 50) blocking.push(`${d.label} incomplete`);
  }
  if (total < READINESS_THRESHOLD) blocking.push(`Composite readiness ${total}% < ${READINESS_THRESHOLD}%`);

  const deployable = blocking.length === 0;

  let lifecycle: Lifecycle;
  if (!isActive && depts === 0 && mods === 0) lifecycle = 'draft';
  else if (!isActive && !deployable) lifecycle = 'composed';
  else if (!isActive) lifecycle = 'validated';
  else if (total >= 88) lifecycle = 'crisis-capable';
  else if (total >= READINESS_THRESHOLD) lifecycle = 'nationally-active';
  else lifecycle = 'operational';

  return { dimensions: dims, total, lifecycle, deployable, blocking };
}

export const LIFECYCLE_LABEL: Record<Lifecycle, string> = {
  draft: 'Draft', composed: 'Composed', validated: 'Validated',
  operational: 'Operational', 'nationally-active': 'Nationally active',
  'crisis-capable': 'Crisis-capable',
};

/** Institutions the sovereign command layer should surface dynamically. */
export function deployableInstitutions(list: Ministry[], cascadeById?: Map<string, number>) {
  return list
    .filter(m => m.status === 'active')
    .map(m => ({ ministry: m, readiness: scoreInstitution(m, { cascadeStress: cascadeById?.get(m.id) }) }))
    .sort((a, b) => b.readiness.total - a.readiness.total);
}
