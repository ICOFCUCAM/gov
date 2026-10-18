// Scenarios on the twin (register 16.7). A scenario applies stated assumptions
// ("population in region X grows 3%") to what the twin knew on a date, and
// keeps the result as a modelled figure next to the observed one. Every
// version is kept: who made it, when, the assumptions, the exact observations
// it started from (with source and import run) and a SHA-256 evidence hash
// over all of them, so a directive that cites a scenario version can be
// checked later against the same inputs. Nothing here changes an observation.

import { createHash } from 'node:crypto';
import { recordAudit } from '@/lib/data/store';
import { stateAsOf, getEntity, regionEntities, isoDate } from './register';

export interface Assumption {
  /** An entity id, or "*" for every entity with a value. */
  entityId: string;
  /** Change in percent, e.g. 3 or -12.5. */
  changePct: number;
  note?: string;
}

export interface ScenarioInput { entityId: string; value: number; unit: string; validFrom: string; sourceId: string; runId: string }
export interface ScenarioResult { entityId: string; name: string; baseline: number; projected: number; unit: string }

export interface ScenarioVersion {
  version: number;
  at: string;
  by: string;
  metric: string;
  /** The date the observed state was taken from (true on that date, as known when the version was made). */
  asOf: string;
  assumptions: Assumption[];
  note?: string;
  inputs: ScenarioInput[];
  results: ScenarioResult[];
  /** Sum over the nation's regions, only when every region has a value. */
  national: { baseline: number; projected: number; unit: string } | null;
  evidenceHash: string;
}

export interface Scenario { id: string; name: string; createdBy: string; createdAt: string; versions: ScenarioVersion[] }

interface Db { scenarios: Scenario[]; seq: number }
const g = globalThis as unknown as { __civicosTwinScenarios?: Db };
const db = (): Db => (g.__civicosTwinScenarios ??= { scenarios: [], seq: 1 });
export function resetScenarios(): void { g.__civicosTwinScenarios = undefined; }

const MAX_ASSUMPTIONS = 50;

/** The evidence hash of a version: SHA-256 over its id, version, metric, date, assumptions and inputs. */
export function evidenceHash(id: string, v: Pick<ScenarioVersion, 'version' | 'metric' | 'asOf' | 'assumptions' | 'inputs'>): string {
  const assumptions = [...v.assumptions].sort((a, b) => a.entityId.localeCompare(b.entityId) || a.changePct - b.changePct)
    .map(a => [a.entityId, a.changePct, a.note ?? null]);
  const inputs = [...v.inputs].sort((a, b) => a.entityId.localeCompare(b.entityId))
    .map(i => [i.entityId, i.value, i.unit, i.validFrom, i.sourceId, i.runId]);
  return createHash('sha256').update(JSON.stringify(['civicos-scenario-v1', id, v.version, v.metric, v.asOf, assumptions, inputs])).digest('hex');
}

/** Whether a stored version still matches its evidence hash. */
export function verifyVersion(id: string, v: ScenarioVersion): boolean {
  return evidenceHash(id, v) === v.evidenceHash;
}

interface Draft { by?: string; metric?: string; asOf?: string; assumptions?: Assumption[]; note?: string }

function build(id: string, version: number, d: Draft): ScenarioVersion | { error: string } {
  const by = d.by?.trim();
  if (!by) return { error: 'Name the official making the scenario' };
  const metric = d.metric?.trim() ?? '';
  if (!metric) return { error: 'Choose a metric' };
  const asOf = isoDate(d.asOf) ?? new Date().toISOString().slice(0, 10);
  const assumptions = (d.assumptions ?? []).slice(0, MAX_ASSUMPTIONS).map(a => ({
    entityId: String(a.entityId ?? '').trim(), changePct: Number(a.changePct), ...(a.note?.trim() ? { note: a.note.trim().slice(0, 200) } : {}),
  }));
  if (!assumptions.length) return { error: 'State at least one assumption' };
  for (const a of assumptions) {
    if (!Number.isFinite(a.changePct) || a.changePct < -100 || a.changePct > 1000) return { error: 'A change must be a percentage between -100 and 1000' };
    if (a.entityId !== '*' && !getEntity(a.entityId)) return { error: `Unknown entity ${a.entityId}` };
  }
  // What was true on the date, as the twin knows it now; the inputs are kept, so the version stays reproducible.
  const obs = stateAsOf({ asOf: `${asOf}T23:59:59Z`, knownAt: new Date().toISOString(), metric });
  if (!obs.length) return { error: `The twin knows nothing about ${metric} on ${asOf}` };
  const inputs: ScenarioInput[] = obs.map(o => ({ entityId: o.entityId, value: o.value, unit: o.unit, validFrom: o.validFrom, sourceId: o.sourceId, runId: o.runId }));
  const results: ScenarioResult[] = inputs.map(i => {
    const factor = assumptions.filter(a => a.entityId === '*' || a.entityId === i.entityId).reduce((f, a) => f * (1 + a.changePct / 100), 1);
    return { entityId: i.entityId, name: getEntity(i.entityId)?.name ?? i.entityId, baseline: i.value, projected: Math.round(i.value * factor * 100) / 100, unit: i.unit };
  });
  const regions = regionEntities();
  const inRegions = regions.map(r => results.find(x => x.entityId === r.id)).filter((x): x is ScenarioResult => !!x);
  const national = regions.length && inRegions.length === regions.length
    ? { baseline: inRegions.reduce((s, x) => s + x.baseline, 0), projected: Math.round(inRegions.reduce((s, x) => s + x.projected, 0) * 100) / 100, unit: inRegions[0]!.unit }
    : null;
  const v = { version, at: new Date().toISOString(), by, metric, asOf, assumptions, ...(d.note?.trim() ? { note: d.note.trim().slice(0, 500) } : {}), inputs, results, national };
  return { ...v, evidenceHash: evidenceHash(id, v) };
}

export function listScenarios(): Scenario[] {
  return db().scenarios.map(s => ({ ...s, versions: s.versions.map(v => ({ ...v })) }));
}

export function getScenario(id: string): Scenario | undefined {
  return listScenarios().find(s => s.id === id);
}

export function createScenario(input: Draft & { name?: string }): Scenario | { error: string } {
  const name = input.name?.trim();
  if (!name) return { error: 'Give the scenario a name' };
  const d = db();
  const id = `SCN-${String(d.seq).padStart(4, '0')}`;
  const v = build(id, 1, input);
  if ('error' in v) return v;
  d.seq++;
  const s: Scenario = { id, name: name.slice(0, 120), createdBy: v.by, createdAt: v.at, versions: [v] };
  d.scenarios.unshift(s);
  recordAudit(v.by, 'twin.scenario.create', `Scenario:${id}`, 'ok', `${s.name} · v1 · ${v.metric} as of ${v.asOf} · evidence ${v.evidenceHash.slice(0, 16)}`);
  return getScenario(id)!;
}

/** A new version; earlier versions stay as they were. */
export function reviseScenario(id: string, input: Draft): Scenario | { error: string } {
  const s = db().scenarios.find(x => x.id === id);
  if (!s) return { error: 'No such scenario' };
  const v = build(id, s.versions.length + 1, input);
  if ('error' in v) return v;
  s.versions.push(v);
  recordAudit(v.by, 'twin.scenario.revise', `Scenario:${id}`, 'ok', `v${v.version} · ${v.metric} as of ${v.asOf} · evidence ${v.evidenceHash.slice(0, 16)}`);
  return getScenario(id)!;
}
