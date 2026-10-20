// The sovereign profile, cabinet overview, seed localisation, first-run setup and presets.
import { locales } from '@/lib/i18n/config';
import { checkDeployment, authorityIn, type AuthorityKey } from '@/lib/nation/deployment';
import { isWorldview } from '@/lib/map/disputed';
import { applyNation, nationPaymentRail } from '@/lib/nation/registry';
import type {
  SovereignProfile,
  CabinetOverview,
  SovereignPreset,
  PlatformSetup,
} from '@/lib/api/types';
import { db } from './state';
import { citizen, REGIONS } from './shared';
import { recordAudit, verifyAuditChain } from './audit';

// ── Sovereign profile + cabinet (global-state neutrality) ────────────
/** The institution the nation named as legally responsible for a register (deployment profile), if any. */
export const authorityFor = (key: AuthorityKey): string | undefined => authorityIn(db.sovereign.deployment, key);

export function getSovereign(): SovereignProfile {
  return db.sovereign;
}

const MAP_PROJECTIONS: string[] = ['auto', 'conic-equal-area', 'azimuthal-equal-area', 'transverse-mercator', 'albers-usa'];
const STATE_FORMS = ['republic', 'federation', 'monarchy', 'city-state', 'union', 'parliamentary'];

export function setSovereign(
  patch: Partial<SovereignProfile>,
  by: string,
): SovereignProfile | { error: string } {
  if (patch.stateForm && !STATE_FORMS.includes(patch.stateForm)) {
    return { error: 'Unknown state form' };
  }
  if (patch.iso3 !== undefined && patch.iso3 !== '' && !/^[A-Z]{3}$/.test(patch.iso3)) {
    return { error: 'Country must be an ISO 3166-1 alpha-3 code' };
  }
  if (patch.regions !== undefined && (!Array.isArray(patch.regions) || patch.regions.some(r => typeof r !== 'string'))) {
    return { error: 'Regions must be a list of names' };
  }
  const ch = patch.constitution?.chambers;
  if (ch !== undefined && (!Array.isArray(ch) || ch.length > 2 || ch.some(c => typeof c?.name !== 'string' || !Number.isFinite(c?.seats) || c.seats < 1))) {
    return { error: 'Chambers must be one or two named chambers with a positive seat count' };
  }
  if (patch.timeZone) {
    try { new Intl.DateTimeFormat('en', { timeZone: patch.timeZone }); } catch { return { error: 'Unknown time zone' }; }
  }
  if (patch.map !== undefined) {
    const m = patch.map, c = m?.capital;
    if (m === null || typeof m !== 'object') return { error: 'Map settings must be an object' };
    if (c !== undefined && (typeof c?.name !== 'string' || !c.name.trim() || c.name.length > 80 || !Number.isFinite(c.lng) || !Number.isFinite(c.lat) || Math.abs(c.lng) > 180 || Math.abs(c.lat) > 90)) {
      return { error: 'The capital needs a name and a position (longitude −180 to 180, latitude −90 to 90)' };
    }
    if (m.projection !== undefined && !MAP_PROJECTIONS.includes(m.projection)) return { error: 'Unknown map projection' };
    if (m.worldview !== undefined && !isWorldview(m.worldview)) return { error: 'Unknown point of view for disputed territory' };
  }
  if (patch.aiAssistantModel !== undefined) {
    const m = patch.aiAssistantModel;
    if (!m || typeof m !== 'object' || (m.api !== 'anthropic' && m.api !== 'openai')) return { error: 'The AI model service must say its API: anthropic or openai' };
    if (m.endpoint !== undefined && m.endpoint !== '') {
      let u: URL | null = null;
      try { u = new URL(m.endpoint); } catch { u = null; }
      if (!u || (u.protocol !== 'https:' && u.protocol !== 'http:') || u.username || u.password) return { error: 'The model service address must be an http(s) address without a user name or password' };
    }
    if (m.model !== undefined && m.model !== '' && !/^[A-Za-z0-9._:/@-]{1,100}$/.test(m.model)) return { error: 'The model name may use letters, digits and . _ : / @ - (up to 100)' };
    patch = { ...patch, aiAssistantModel: { api: m.api, ...(m.endpoint ? { endpoint: m.endpoint.replace(/\/+$/, '') } : {}), ...(m.model ? { model: m.model } : {}) } };
  }
  if (patch.languages !== undefined && (!Array.isArray(patch.languages) || patch.languages.length > 10 || patch.languages.some(l => typeof l !== 'string' || !locales.some(x => x.code === l)))) {
    return { error: 'Further languages must be language codes the platform has' };
  }
  if (patch.deployment !== undefined) {
    const d = checkDeployment(patch.deployment, db.ministries.filter(m => m.status !== 'merged').map(m => m.id));
    if ('error' in d) return d;
    // Each part sent replaces that part; parts not sent stay as they were.
    patch = { ...patch, deployment: { ...(db.sovereign.deployment ?? {}), ...d } };
  }
  db.sovereign = { ...db.sovereign, ...patch };
  applyNation({ ...db.sovereign, configured: !!db.setup });
  localizeSeed();
  recordAudit(by, 'sovereign.configure', 'Sovereign:profile', 'ok',
    patch.stateForm ?? patch.stateName);
  return db.sovereign;
}

export function cabinetOverview(): CabinetOverview {
  const ministries = db.ministries.filter(m => m.status !== 'merged');
  const institutions = ministries.map(m => {
    const q = db.ministryQueues[m.id] ?? [];
    const inc = db.ministryIncidents[m.id] ?? [];
    return {
      id: m.id,
      name: m.name,
      archetype: m.archetype,
      status: m.status,
      openQueue: q.filter(x => x.state !== 'cleared').length,
      activeIncidents: inc.filter(x => x.active).length,
    };
  });
  const audit = verifyAuditChain();
  return {
    sovereign: db.sovereign,
    generatedAt: new Date().toISOString(),
    institutions,
    totals: {
      institutions: ministries.length,
      activeMinistries: ministries.filter(m => m.status === 'active').length,
      activeIncidents: institutions.reduce((s, i) => s + i.activeIncidents, 0),
      queuesBreaching: institutions.filter(i => i.openQueue > 6).length,
      auditIntact: audit.ok,
    },
  };
}


// ── Seed localisation ────────────────────────────────────────────────
// Sample records are seeded with reference places, USD and a neutral payment
// rail; whenever the nation changes they are rewritten to its own first
// regions, currency and rail, so demo data never shows another country.
let seedPlaces = ['Capital District', 'Eastern', 'Northern'];
const SEED_BILLS = new Set(['BL-9001', 'BL-9002', 'BL-9003']);
const SEED_RECEIPTS = new Set(['PR-3001']);

function localizeSeed(): void {
  const target = seedPlaces.map((p, i) => REGIONS[i] ?? p);
  const map = new Map(seedPlaces.map((p, i) => [p, target[i]!]));
  const re = new RegExp(seedPlaces.map(p => p.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).sort((a, b) => b.length - a.length).join('|'), 'g');
  const swap = (v: string) => v.replace(re, m => map.get(m) ?? m);
  citizen.municipality = swap(citizen.municipality);
  for (const p of db.permits) p.municipality = swap(p.municipality);
  for (const n of db.notifications) { n.subject = swap(n.subject); n.body = swap(n.body); }
  for (const i of db.incidents) { i.title = swap(i.title); i.scope = swap(i.scope); }
  for (const w of db.integrations) w.ownerOrg = swap(w.ownerOrg);
  db.tenantSync = Object.fromEntries(Object.entries(db.tenantSync).map(([k, v]) => [swap(k), v]));
  for (const b of db.bills) if (SEED_BILLS.has(b.id)) b.currency = db.sovereign.currency;
  for (const r of db.receipts) if (SEED_RECEIPTS.has(r.id)) { r.currency = db.sovereign.currency; r.rail = nationPaymentRail(); }
  seedPlaces = target;
}

// ── First-run platform setup ─────────────────────────────────────────
export function getSetup(): PlatformSetup | null {
  return db.setup ?? null;
}

export function completeSetup(by: string): PlatformSetup {
  db.setup = { completedAt: new Date().toISOString(), by, stateName: db.sovereign.stateName };
  applyNation({ ...db.sovereign, configured: true });
  localizeSeed();
  recordAudit(by, 'platform.setup.complete', 'Platform:setup', 'ok', db.sovereign.stateName);
  return db.setup;
}

// ── Multi-country sovereign presets (global-state neutrality) ─────────
export const SOVEREIGN_PRESETS: SovereignPreset[] = [
  { key: 'parliamentary-republic', label: 'Parliamentary republic',
    profile: { stateName: 'Republic', stateForm: 'parliamentary', executiveTitle: 'Prime Minister', legislatureName: 'Parliament', currency: 'USD', regionNoun: 'county', locale: 'en', accent: '#1f3a5f', motto: 'Through Parliament, the people govern' } },
  { key: 'presidential-republic', label: 'Presidential republic',
    profile: { stateName: 'Republic', stateForm: 'republic', executiveTitle: 'President', legislatureName: 'National Assembly', currency: 'USD', regionNoun: 'region', locale: 'en', accent: '#1f2630', motto: 'Liberty · Order · Service' } },
  { key: 'federation', label: 'Federation',
    profile: { stateName: 'Federal Republic', stateForm: 'federation', executiveTitle: 'Chancellor', legislatureName: 'Federal Assembly', currency: 'EUR', regionNoun: 'state', locale: 'en', accent: '#23303a', motto: 'Unity of the states' } },
  { key: 'constitutional-monarchy', label: 'Constitutional monarchy',
    profile: { stateName: 'Kingdom', stateForm: 'monarchy', executiveTitle: 'Prime Minister', legislatureName: 'Council of State', currency: 'GBP', regionNoun: 'province', locale: 'en', accent: '#3a2342', motto: 'Crown and Constitution' } },
  { key: 'emirate', label: 'Emirate / Gulf state',
    profile: { stateName: 'Emirate', stateForm: 'monarchy', executiveTitle: 'Prime Minister', legislatureName: 'Federal National Council', currency: 'AED', regionNoun: 'emirate', locale: 'ar', accent: '#1d3b34', motto: 'الله · الوطن · القيادة' } },
  { key: 'city-state', label: 'City-state',
    profile: { stateName: 'City-State', stateForm: 'city-state', executiveTitle: 'Prime Minister', legislatureName: 'Parliament', currency: 'SGD', regionNoun: 'district', locale: 'en', accent: '#1f3a3a', motto: 'One city, one nation' } },
  { key: 'union', label: 'Supranational union',
    profile: { stateName: 'Union', stateForm: 'union', executiveTitle: 'High Representative', legislatureName: 'Union Council', currency: 'EUR', regionNoun: 'member state', locale: 'en', accent: '#1b3a5b', motto: 'United in diversity' } },
];

export function listSovereignPresets(): SovereignPreset[] {
  return SOVEREIGN_PRESETS;
}

export function applySovereignPreset(
  key: string,
  by: string,
): SovereignProfile | { error: string } {
  const preset = SOVEREIGN_PRESETS.find(p => p.key === key);
  if (!preset) return { error: 'Unknown preset' };
  // A constitutional template never overwrites the nation's own facts.
  // Who is responsible for each register (the deployment profile), the further languages and the
  // assistant choice are the nation's own decisions too: a preset changing them would silently lift
  // court isolation and the data-protection oversight step.
  const { iso3, regions, constitution, paymentRail, timeZone, emergency, foreignAffairs, map, deployment, languages, aiAssistant, aiAssistantModel } = db.sovereign;
  db.sovereign = { ...preset.profile, iso3, regions, constitution, paymentRail, timeZone, emergency, foreignAffairs, map,
    ...(deployment !== undefined ? { deployment } : {}), ...(languages !== undefined ? { languages } : {}),
    ...(aiAssistant !== undefined ? { aiAssistant } : {}), ...(aiAssistantModel !== undefined ? { aiAssistantModel } : {}) };
  applyNation({ ...db.sovereign, configured: !!db.setup });
  localizeSeed();
  recordAudit(by, 'sovereign.preset', `Sovereign:${key}`, 'ok', preset.label);
  return db.sovereign;
}
