// The sovereign profile, cabinet overview, seed localisation, first-run setup and presets.
import { locales } from '@/lib/i18n/config';
import { checkDeployment, checkEdition, authorityIn, isAuthorityKey, AUTHORITIES, MODULES, type AuthorityKey, type InstitutionalEdition } from '@/lib/nation/deployment';
import { proposePolicy, confirmPolicy, withdrawPolicy, lapsePolicy, type PolicyVersion } from '@/lib/law/policy-change';
import { dualControlPendingHours } from '@/lib/data/dual-control';
import { isWorldview } from '@/lib/map/disputed';
import { checkClassification } from '@/lib/nation/classification';
import { applyNation, nationPaymentRail } from '@/lib/nation/registry';
import type {
  SovereignProfile,
  CabinetOverview,
  SovereignPreset,
  PlatformSetup,
  StateClassification,
} from '@/lib/api/types';
import { db } from './state';
import { citizen, REGIONS, canonicalJson } from './shared';
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
  // The composable classification (§1.2, plan phase 4): lists of short keys, a known style, sources and a date.
  if (patch.constitution?.classification !== undefined && patch.constitution.classification !== null) {
    const c = checkClassification(patch.constitution.classification);
    if ('error' in c) return c;
    patch = { ...patch, constitution: { ...patch.constitution, classification: c } };
  }
  // Once setup is complete the classification changes only through its own change process (plan phase 5):
  // a constitution sent without it keeps the recorded one; resending the same one is not a change.
  if (db.setup && patch.constitution !== undefined && patch.constitution !== null) {
    const current = db.sovereign.constitution?.classification;
    if (!('classification' in patch.constitution) || patch.constitution.classification === undefined) {
      const { classification: _drop, ...rest } = patch.constitution;
      patch = { ...patch, constitution: { ...rest, ...(current ? { classification: current } : {}) } };
    } else if (canonicalJson(patch.constitution.classification ?? null) !== canonicalJson(current ?? null)) {
      return { error: CLASSIFICATION_AFTER_SETUP };
    }
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
    // Once setup is complete, who is responsible changes only through the change process (plan phase 2,
    // audit D): proposed citing the law, confirmed by a different official (proposeAuthorities()).
    if (db.setup && d.authorities !== undefined && !sameAuthorities(d.authorities, db.sovereign.deployment?.authorities)) {
      return { error: AUTHORITIES_AFTER_SETUP };
    }
    // The Institutional Edition likewise (proposeEdition()): resending the same one is not a change.
    if (db.setup && 'edition' in d && canonicalJson(d.edition ?? null) !== canonicalJson(db.sovereign.deployment?.edition ?? null)) {
      return { error: EDITION_AFTER_SETUP };
    }
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

// ── Who is responsible, after setup (plan phase 2; audit D) ─────────────
// During first-run setup the deployment profile's authorities are set through
// /api/sovereign as before. Once setup is complete they change only through
// the country's change process (lib/law/policy-change.ts): one administrator
// serving the whole government proposes, citing the laws register; a
// different official confirms within the waiting period; every version kept.

/** Why a direct change to who is responsible is refused once setup is complete. */
export const AUTHORITIES_AFTER_SETUP = 'Setup is complete: who is responsible for a register or power now changes only through the change process. Propose the change citing the law (Who is responsible → Propose a change); a different official confirms it.';

type AuthorityMap = Partial<Record<AuthorityKey, string>>;
const named = (a: AuthorityMap | undefined): AuthorityMap => Object.fromEntries(Object.entries(a ?? {}).filter(([, v]) => !!v)) as AuthorityMap;
function sameAuthorities(a: AuthorityMap | undefined, b: AuthorityMap | undefined): boolean {
  const x = named(a), y = named(b);
  const keys = new Set([...Object.keys(x), ...Object.keys(y)]) as Set<AuthorityKey>;
  return [...keys].every(k => x[k] === y[k]);
}
const AUTH_AUDIT = 'sovereign.authorities';
const labelOf = (k: AuthorityKey) => AUTHORITIES.find(a => a.key === k)?.label ?? k;
const nameOf = (id?: string) => (id ? db.ministries.find(m => m.id === id)?.name ?? id : 'not named');
const describeAuthorities = (before: AuthorityMap) => (v: { authorities: AuthorityMap }) => {
  const cur = before;
  const diff = AUTHORITIES.filter(a => (v.authorities[a.key] ?? '') !== (cur[a.key] ?? ''))
    .map(a => `${labelOf(a.key)}: ${nameOf(cur[a.key])} → ${nameOf(v.authorities[a.key])}`);
  return diff.length ? diff.join('; ') : 'no change';
};

/** Changes to who is responsible: the waiting proposal (lapsed ones are moved to history at the next step) and every earlier version. Read only. */
export function authorityChanges() {
  return structuredClone(db.authorityChanges ?? {});
}

/**
 * Propose who is responsible (registers left out keep their institution; ''
 * un-names one), citing the law. Before setup is complete, use
 * setSovereign() as setup does.
 */
export function proposeAuthorities(input: { authorities?: unknown; legalBasis?: unknown }, actor: { by: string; byId?: string }, now = new Date()) {
  if (!db.setup) return { error: 'Setup is still running: name who is responsible in setup (it is saved directly until setup is complete)' };
  const a = input.authorities;
  if (!a || typeof a !== 'object' || Array.isArray(a)) return { error: 'Name the institution for each register that changes: { authorities: { register: institution id or "" } }' };
  const next: AuthorityMap = { ...named(db.sovereign.deployment?.authorities) };
  for (const [k, v] of Object.entries(a as Record<string, unknown>)) {
    if (!isAuthorityKey(k)) return { error: `Unknown register: ${k}` };
    if (v === '' || v === null) { delete next[k]; continue; }
    if (typeof v !== 'string' || !db.ministries.some(m => m.id === v && m.status !== 'merged')) return { error: `No institution ${String(v)} for ${k}` };
    next[k] = v;
  }
  const current = { authorities: named(db.sovereign.deployment?.authorities) };
  return proposePolicy(db.authorityChanges, current, { authorities: next }, input.legalBasis, {
    by: actor.by, ...(actor.byId ? { byId: actor.byId } : {}), now, pendingHours: dualControlPendingHours(), audit: AUTH_AUDIT,
    context: 'Who is responsible for registers and powers', describe: describeAuthorities(current.authorities),
    check: v => (sameAuthorities(v.authorities, current.authorities) ? 'This proposal changes nothing' : null),
  });
}

/** A different official confirms the waiting proposal: the deployment profile names the new institutions. */
export function confirmAuthorities(actor: { by: string; byId?: string }, now = new Date()) {
  const before = named(db.sovereign.deployment?.authorities);
  return confirmPolicy(db.authorityChanges, {
    by: actor.by, ...(actor.byId ? { byId: actor.byId } : {}), now, audit: AUTH_AUDIT, describe: describeAuthorities(before),
    adopt: (v: PolicyVersion<{ authorities: AuthorityMap }>) => {
      db.sovereign = { ...db.sovereign, deployment: { ...(db.sovereign.deployment ?? {}), authorities: { ...v.values.authorities } } };
      applyNation({ ...db.sovereign, configured: !!db.setup });
    },
  });
}

// ── The classification, after setup (plan phase 5; guidance §1.2, §7.4) ────
// During first-run setup the classification is saved through /api/sovereign
// as before. Once setup is complete it changes only through the change
// process: one administrator proposes it (or a return to the classification
// derived from the form of state, `null`) citing the laws register; a
// different official confirms; every version kept. A dispute over the
// constitutional profile freezes it (lib/constitution/profile-state.ts).

/** Why a direct change to the classification is refused once setup is complete. */
export const CLASSIFICATION_AFTER_SETUP = 'Setup is complete: the classification of the state now changes only through the change process. Propose it citing the law (Offices → Classification of the state); a different official confirms it.';
const CLASS_AUDIT = 'constitution.classification';
type ClassValues = { classification: StateClassification | null };
const describeClassification = (v: ClassValues) => v.classification
  ? `${[...v.classification.stateForms, ...v.classification.governmentForms, ...v.classification.territorialArrangements].join(', ') || 'no forms listed'}${v.classification.style ? ` · style ${v.classification.style}` : ''}${v.classification.effectiveFrom ? ` from ${v.classification.effectiveFrom}` : ''}`
  : 'derived from the form of state (no recorded classification)';

/** Changes to the classification: the waiting proposal and every earlier version. Read only. */
export function classificationChanges() {
  return structuredClone(db.classificationChanges ?? {});
}

/** Propose a classification (`null`: return to the one derived from the form of state), citing the law. */
export function proposeClassification(input: { classification?: unknown; legalBasis?: unknown }, actor: { by: string; byId?: string }, now = new Date()) {
  if (!db.setup) return { error: 'Setup is still running: record the classification in setup (it is saved directly until setup is complete)' };
  let next: StateClassification | null = null;
  if (input.classification !== null) {
    const c = checkClassification(input.classification);
    if ('error' in c) return c;
    next = c;
  }
  const current: ClassValues = { classification: db.sovereign.constitution?.classification ?? null };
  return proposePolicy(db.classificationChanges ??= {}, current, { classification: next }, input.legalBasis, {
    by: actor.by, ...(actor.byId ? { byId: actor.byId } : {}), now, pendingHours: dualControlPendingHours(), audit: CLASS_AUDIT,
    context: 'Classification of the state', describe: describeClassification,
    check: v => (canonicalJson(v.classification) === canonicalJson(current.classification) ? 'This proposal changes nothing' : null),
  });
}

/** A different official confirms the waiting classification: the profile records it. */
export function confirmClassification(actor: { by: string; byId?: string }, now = new Date()) {
  return confirmPolicy(db.classificationChanges ??= {}, {
    by: actor.by, ...(actor.byId ? { byId: actor.byId } : {}), now, audit: CLASS_AUDIT, describe: describeClassification,
    adopt: (v: PolicyVersion<ClassValues>) => {
      const { classification: _old, ...rest } = db.sovereign.constitution ?? {};
      db.sovereign = { ...db.sovereign, constitution: { ...rest, ...(v.values.classification ? { classification: structuredClone(v.values.classification) } : {}) } };
      applyNation({ ...db.sovereign, configured: !!db.setup });
    },
  });
}

export const withdrawClassification = (by: string, reason?: string) => withdrawPolicy(db.classificationChanges ??= {}, { by, ...(reason ? { reason } : {}), audit: CLASS_AUDIT });
export const lapseClassification = (now = new Date()) => lapsePolicy(db.classificationChanges ??= {}, now, CLASS_AUDIT);

export const withdrawAuthorities = (by: string, reason?: string) => withdrawPolicy(db.authorityChanges, { by, ...(reason ? { reason } : {}), audit: AUTH_AUDIT });
export const lapseAuthorities = (now = new Date()) => lapsePolicy(db.authorityChanges, now, AUTH_AUDIT);

// ── The Institutional Edition, after setup (Health I4 standalone-and-pilot; spec Part 5 D) ──
// During first-run setup the edition is saved through /api/sovereign with the rest of the deployment
// profile. Once setup is complete it changes only through the change process: an administrator serving
// the whole government proposes it (or `null`, no edition: every institution connected) citing the laws
// register; a different official confirms; every version kept. None ships.

/** Why a direct change to the Institutional Edition is refused once setup is complete. */
export const EDITION_AFTER_SETUP = 'Setup is complete: the Institutional Edition now changes only through the change process. Propose it citing the law (National settings → Institutional Edition); a different official confirms it.';
const EDITION_AUDIT = 'sovereign.edition';
type EditionValues = { edition: InstitutionalEdition | null };
const describeEdition = (v: EditionValues) => v.edition
  ? `${v.edition.label}: ${v.edition.institutions.map(nameOf).join(', ')} · modules ${v.edition.modules.map(k => MODULES.find(m => m.key === k)?.label ?? k).join(', ')}`
  : 'no Institutional Edition (every institution connected)';

/** Changes to the Institutional Edition: the waiting proposal and every earlier version. Read only. */
export function editionChanges() {
  return structuredClone(db.editionChanges ?? {});
}

/** Propose an Institutional Edition (`null`: none), citing the law. Before setup is complete, use setSovereign() as setup does. */
export function proposeEdition(input: { edition?: unknown; legalBasis?: unknown }, actor: { by: string; byId?: string }, now = new Date()) {
  if (!db.setup) return { error: 'Setup is still running: record the Institutional Edition in setup (it is saved directly until setup is complete)' };
  if (input.edition === undefined) return { error: 'Give the edition { label, institutions, modules }, or null for none' };
  let edition: InstitutionalEdition | null = null;
  if (input.edition !== null) {
    const e = checkEdition(input.edition, db.ministries.filter(m => m.status !== 'merged').map(m => m.id));
    if ('error' in e) return e;
    edition = e;
  }
  const current: EditionValues = { edition: db.sovereign.deployment?.edition ?? null };
  return proposePolicy(db.editionChanges ??= {}, current, { edition }, input.legalBasis, {
    by: actor.by, ...(actor.byId ? { byId: actor.byId } : {}), now, pendingHours: dualControlPendingHours(), audit: EDITION_AUDIT,
    context: 'The Institutional Edition this installation runs as', describe: describeEdition,
    check: v => (canonicalJson(v.edition) === canonicalJson(current.edition) ? 'This proposal changes nothing' : null),
  });
}

/** A different official confirms the waiting proposal: the deployment profile records the edition. */
export function confirmEdition(actor: { by: string; byId?: string }, now = new Date()) {
  return confirmPolicy(db.editionChanges ??= {}, {
    by: actor.by, ...(actor.byId ? { byId: actor.byId } : {}), now, audit: EDITION_AUDIT, describe: describeEdition,
    adopt: (v: PolicyVersion<EditionValues>) => {
      const { edition: _old, ...rest } = db.sovereign.deployment ?? {};
      db.sovereign = { ...db.sovereign, deployment: { ...rest, ...(v.values.edition ? { edition: structuredClone(v.values.edition) } : {}) } };
      applyNation({ ...db.sovereign, configured: !!db.setup });
    },
  });
}
export const withdrawEdition = (by: string, reason?: string) => withdrawPolicy(db.editionChanges ??= {}, { by, ...(reason ? { reason } : {}), audit: EDITION_AUDIT });
export const lapseEdition = (now = new Date()) => lapsePolicy(db.editionChanges ??= {}, now, EDITION_AUDIT);

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

/** Why a preset is refused once setup is complete. */
export const PRESET_AFTER_SETUP = 'Setup is complete, so a preset can no longer be applied: it would change the form of state, titles and currency in one step. Edit each part of the profile under National settings instead; who is responsible and each institution\'s standing change through the change process (proposed citing the law, confirmed by a second official).';

export function listSovereignPresets(): SovereignPreset[] {
  return SOVEREIGN_PRESETS;
}

export function applySovereignPreset(
  key: string,
  by: string,
): SovereignProfile | { error: string } {
  const preset = SOVEREIGN_PRESETS.find(p => p.key === key);
  if (!preset) return { error: 'Unknown preset' };
  // A preset is a first-run template (plan phase 0): once setup is complete it would change the
  // form of state, titles and currency in one step by one administrator. Refused; each field is
  // edited on its own under National settings (audited), and who is responsible and institutions'
  // standing change only through the change process (two officials, citing the law).
  if (db.setup) {
    recordAudit(by, 'sovereign.preset', `Sovereign:${key}`, 'denied', 'Setup is complete');
    return { error: PRESET_AFTER_SETUP };
  }
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
