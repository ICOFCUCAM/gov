// Tasking of the devices behind the twin's stream sources (review I3; OGC
// SensorThings API Part 2 – Tasking Core, 17-079r1; register 16.23).
//
//   TaskingCapability  what a device can be asked to do, declared on a stream
//                      source by an administrator: the parameters it takes
//                      (name, kind, unit, range or choices, required) and the
//                      integration that executes it (an approved integration
//                      holding the scope sta:task). Retired, never deleted.
//   Actuator           the device that acts, as the capability names it.
//   Task               one request: the capability, its parameters (checked
//                      against the declaration, nothing guessed), the reason,
//                      and the signed-in official who made it (canTaskSensor,
//                      lib/auth/roles.ts). Audited.
//
// The platform never executes a task. The executing integration pulls the
// tasks for its capabilities with its own key (GET /api/twin/tasking/executor,
// the first pull marks them delivered) and acknowledges each with a status
// (accepted, rejected, in-progress, completed, failed) and a note; an official
// may cancel a task until it is finished. Every step keeps who, when and the
// note in the task's history and goes to the audit chain.
//
// One store on globalThis (__civicosTwinTasking), saved and restored by
// lib/data/persist.ts like every store (JSON only), per-record documents in
// postgres mode through touch().

import { recordAudit, listIntegrations } from '@/lib/data/store';
import { withDefaults } from '@/lib/data/defaults';
import { touch } from '@/lib/data/repo/track';
import { listSources } from './register';

/** The scope an integration needs to execute tasks (pull and acknowledge them). */
export const TASKING_SCOPE = 'sta:task';

export type TaskParameterKind = 'number' | 'text' | 'choice' | 'boolean';
export interface TaskParameter {
  /** The key in a task's parameters, e.g. "samplingInterval". */
  name: string;
  label: string;
  kind: TaskParameterKind;
  /** UCUM unit of a number. */
  unit?: string;
  min?: number;
  max?: number;
  /** The values a choice takes. */
  choices?: string[];
  required: boolean;
}

export interface TaskingCapability {
  id: string;
  /** The stream source whose device it tasks. */
  sourceId: string;
  name: string;
  description: string;
  actuator: { name: string; description: string };
  /** The integration that executes it (pulls and acknowledges its tasks). */
  integrationId: string;
  parameters: TaskParameter[];
  declaredBy: string;
  declaredAt: string;
  retired?: { at: string; by: string; reason: string };
}

export type TaskStatus = 'created' | 'delivered' | 'accepted' | 'rejected' | 'in-progress' | 'completed' | 'failed' | 'cancelled';
export const FINAL_STATUSES: readonly TaskStatus[] = ['rejected', 'completed', 'failed', 'cancelled'];
/** What the executing integration may report, from each status. */
const NEXT: Record<TaskStatus, TaskStatus[]> = {
  created: ['accepted', 'rejected'],
  delivered: ['accepted', 'rejected'],
  accepted: ['in-progress', 'completed', 'failed'],
  'in-progress': ['completed', 'failed'],
  rejected: [], completed: [], failed: [], cancelled: [],
};
export const EXECUTOR_STATUSES: readonly TaskStatus[] = ['accepted', 'rejected', 'in-progress', 'completed', 'failed'];

export interface TwinTask {
  id: string;
  capabilityId: string;
  parameters: Record<string, string | number | boolean>;
  reason: string;
  createdBy: string;
  /** The official's institution, when they serve one. */
  institution?: string;
  createdAt: string;
  status: TaskStatus;
  history: { status: TaskStatus; at: string; by: string; note?: string }[];
}

// A type alias (not an interface) so withDefaults() takes it as a plain record.
type TaskingStore = { seq: number; capabilities: TaskingCapability[]; tasks: TwinTask[] };

/** Tasks kept at most; the oldest finished ones leave first (their audit entries stay). */
export const TASKS_KEPT = 5_000;
/** Tasks one pull hands over at most. */
export const PULL_LIMIT = 100;

const seed = (): TaskingStore => ({ seq: 0, capabilities: [], tasks: [] });
const g = globalThis as unknown as { __civicosTwinTasking?: TaskingStore };
const store = (): TaskingStore => touch('__civicosTwinTasking', g.__civicosTwinTasking = withDefaults(g.__civicosTwinTasking ??= seed(), seed()));

export function resetTasking(): void { g.__civicosTwinTasking = undefined; }

const next = (prefix: string) => `${prefix}-${++store().seq}`;
const NAME = /^[A-Za-z][A-Za-z0-9_]{0,39}$/;
const text = (v: unknown, max: number) => (typeof v === 'string' ? v.trim().slice(0, max) : '');

export function listCapabilities(opts: { includeRetired?: boolean } = {}): TaskingCapability[] {
  return store().capabilities.filter(c => opts.includeRetired || !c.retired).map(c => structuredClone(c));
}
export function getCapability(id: string): TaskingCapability | undefined {
  const c = store().capabilities.find(x => x.id === id);
  return c ? structuredClone(c) : undefined;
}
export function listTasks(filter: { capabilityId?: string; integrationId?: string } = {}): TwinTask[] {
  const caps = filter.integrationId ? new Set(store().capabilities.filter(c => c.integrationId === filter.integrationId).map(c => c.id)) : undefined;
  return store().tasks.filter(t => (!filter.capabilityId || t.capabilityId === filter.capabilityId) && (!caps || caps.has(t.capabilityId))).map(t => structuredClone(t)).reverse();
}
export function getTask(id: string): TwinTask | undefined {
  const t = store().tasks.find(x => x.id === id);
  return t ? structuredClone(t) : undefined;
}

/** Check a declared parameter list: names unique and well formed, ranges and choices sound. */
function checkParameters(raw: unknown): TaskParameter[] | { error: string } {
  if (!Array.isArray(raw) || !raw.length) return { error: 'Declare at least one parameter the device takes' };
  if (raw.length > 20) return { error: 'At most 20 parameters' };
  const out: TaskParameter[] = [];
  for (const p of raw as Record<string, unknown>[]) {
    const name = text(p?.name, 40);
    if (!NAME.test(name)) return { error: `"${name}" is not a parameter name (a letter, then letters, digits or _)` };
    if (out.some(x => x.name === name)) return { error: `The parameter ${name} is declared twice` };
    const kind = p.kind as TaskParameterKind;
    if (!['number', 'text', 'choice', 'boolean'].includes(kind)) return { error: `Say what kind of value ${name} takes: number, text, choice or boolean` };
    const q: TaskParameter = { name, label: text(p.label, 80) || name, kind, required: p.required !== false };
    if (kind === 'number') {
      for (const k of ['min', 'max'] as const) {
        if (p[k] === undefined || p[k] === null || p[k] === '') continue;
        const n = Number(p[k]);
        if (!Number.isFinite(n)) return { error: `The ${k} of ${name} is not a number` };
        q[k] = n;
      }
      if (q.min !== undefined && q.max !== undefined && q.min > q.max) return { error: `The range of ${name} is empty (${q.min} > ${q.max})` };
      const unit = text(p.unit, 24);
      if (unit) q.unit = unit;
    }
    if (kind === 'choice') {
      const choices = Array.isArray(p.choices) ? [...new Set((p.choices as unknown[]).map(c => text(c, 60)).filter(Boolean))] : [];
      if (choices.length < 2) return { error: `Name at least two values ${name} may take` };
      q.choices = choices.slice(0, 30);
    }
    out.push(q);
  }
  return out;
}

/**
 * Declare what a stream source's device can be asked to do (an administrator;
 * the route checks the role): its parameters and the integration that
 * executes the tasks, which must be approved and hold the scope sta:task.
 * Audited.
 */
export function declareCapability(input: { sourceId?: unknown; name?: unknown; description?: unknown; actuator?: { name?: unknown; description?: unknown }; integrationId?: unknown; parameters?: unknown }, by: string, now = new Date()): TaskingCapability | { error: string } {
  const who = by.trim();
  if (!who) return { error: 'Name the administrator declaring the capability' };
  const source = listSources().find(s => s.id === input.sourceId);
  if (!source) return { error: 'Name the stream source whose device is tasked' };
  if (source.kind !== 'stream') return { error: `${source.name} is not a stream source: only a stream's device is tasked` };
  const name = text(input.name, 120);
  if (!name) return { error: 'Name what the device can be asked to do, e.g. "Change the sampling interval"' };
  const integrationId = text(input.integrationId, 40);
  const client = listIntegrations().find(i => i.id === integrationId);
  if (!client) return { error: `No integration ${integrationId || '(none named)'}: register the gateway that executes the tasks in Integrations first` };
  if (client.status !== 'approved') return { error: `Integration ${client.name} is ${client.status}: an administrator approves it first` };
  if (!client.scopes.includes(TASKING_SCOPE)) return { error: `Integration ${client.name} does not hold the scope ${TASKING_SCOPE}` };
  const parameters = checkParameters(input.parameters);
  if ('error' in parameters) return parameters;
  const s = store();
  if (s.capabilities.some(c => !c.retired && c.sourceId === source.id && c.name.toLowerCase() === name.toLowerCase())) return { error: `${source.name} already has a capability named ${name}` };
  const cap: TaskingCapability = {
    id: next('TC'), sourceId: source.id, name, description: text(input.description, 500),
    actuator: { name: text(input.actuator?.name, 120) || `${source.name} device`, description: text(input.actuator?.description, 500) },
    integrationId: client.id, parameters, declaredBy: who, declaredAt: now.toISOString(),
  };
  s.capabilities.push(cap);
  recordAudit(who, 'twin.tasking.capability.declare', `Twin:${source.id}/${cap.id}`, 'ok',
    `${name} · executed by ${client.name} (${client.id}) · parameters ${parameters.map(p => `${p.name}:${p.kind}${p.required ? '' : '?'}`).join(', ')}`);
  return structuredClone(cap);
}

/** Retire a capability (an administrator, with a reason): no new tasks; those already made run their course. Audited. */
export function retireCapability(id: string, by: string, reason: string, now = new Date()): TaskingCapability | { error: string } {
  const c = store().capabilities.find(x => x.id === id);
  if (!c) return { error: 'No such capability' };
  const who = by.trim(), why = reason.trim();
  if (!who) return { error: 'Name the administrator retiring it' };
  if (why.length < 4) return { error: 'Give the reason for retiring it' };
  if (c.retired) return { error: `Already retired on ${c.retired.at.slice(0, 10)} by ${c.retired.by}` };
  c.retired = { at: now.toISOString(), by: who, reason: why.slice(0, 500) };
  recordAudit(who, 'twin.tasking.capability.retire', `Twin:${c.sourceId}/${c.id}`, 'ok', `${c.name} · ${c.retired.reason}`);
  return structuredClone(c);
}

/** A task's parameters checked against the capability's declaration: every value of its kind and range, nothing undeclared. */
export function checkTaskParameters(cap: TaskingCapability, raw: unknown): { values: Record<string, string | number | boolean> } | { error: string } {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return { error: 'Send the task\'s parameters as an object, e.g. { "samplingInterval": 60 }' };
  const given = raw as Record<string, unknown>;
  const unknown = Object.keys(given).find(k => !cap.parameters.some(p => p.name === k));
  if (unknown) return { error: `${cap.name} takes no parameter ${unknown.slice(0, 40)} (it takes ${cap.parameters.map(p => p.name).join(', ')})` };
  const out: Record<string, string | number | boolean> = {};
  for (const p of cap.parameters) {
    const v = given[p.name];
    if (v === undefined || v === null || v === '') {
      if (p.required) return { error: `Give ${p.label} (${p.name})` };
      continue;
    }
    if (p.kind === 'number') {
      const n = typeof v === 'number' ? v : typeof v === 'string' && v.trim() ? Number(v) : NaN;
      if (!Number.isFinite(n)) return { error: `${p.label} must be a number` };
      if (p.min !== undefined && n < p.min) return { error: `${p.label} must be at least ${p.min}${p.unit ? ` ${p.unit}` : ''}` };
      if (p.max !== undefined && n > p.max) return { error: `${p.label} must be at most ${p.max}${p.unit ? ` ${p.unit}` : ''}` };
      out[p.name] = n;
    } else if (p.kind === 'boolean') {
      if (typeof v !== 'boolean' && v !== 'true' && v !== 'false') return { error: `${p.label} is true or false` };
      out[p.name] = v === true || v === 'true';
    } else if (p.kind === 'choice') {
      if (typeof v !== 'string' || !p.choices!.includes(v)) return { error: `${p.label} is one of ${p.choices!.join(', ')}` };
      out[p.name] = v;
    } else {
      if (typeof v !== 'string') return { error: `${p.label} is text` };
      const t = v.trim();
      if (!t) return { error: `Give ${p.label} (${p.name})` };
      out[p.name] = t.slice(0, 500);
    }
  }
  return { values: out };
}

/**
 * A task, made by a signed-in official (the route verifies the session and
 * canTaskSensor): checked parameters and a reason; audited. The platform only
 * records it; the executing integration pulls it.
 */
export function createTask(input: { capabilityId?: unknown; parameters?: unknown; reason?: unknown }, official: { name: string; institution?: string }, now = new Date()): TwinTask | { error: string } {
  const who = official.name.trim();
  if (!who) return { error: 'Only a signed-in official creates a task' };
  const cap = store().capabilities.find(c => c.id === input.capabilityId);
  if (!cap) return { error: 'Name the tasking capability (TaskingCapability) the task is for' };
  if (cap.retired) return { error: `${cap.name} was retired on ${cap.retired.at.slice(0, 10)}: ${cap.retired.reason}` };
  const reason = text(input.reason, 500);
  if (reason.length < 4) return { error: 'Give the reason for the task' };
  const checked = checkTaskParameters(cap, input.parameters);
  if ('error' in checked) return checked;
  const parameters = checked.values;
  const s = store();
  const at = now.toISOString();
  const task: TwinTask = { id: next('TASK'), capabilityId: cap.id, parameters, reason, createdBy: who, ...(official.institution ? { institution: official.institution } : {}), createdAt: at, status: 'created', history: [{ status: 'created', at, by: who, note: reason }] };
  s.tasks.push(task);
  if (s.tasks.length > TASKS_KEPT) {
    const i = s.tasks.findIndex(t => FINAL_STATUSES.includes(t.status));
    if (i >= 0) s.tasks.splice(i, 1);
  }
  recordAudit(who, 'twin.tasking.task.create', `Twin:${cap.sourceId}/${task.id}`, 'ok', `${cap.name} (${cap.id}) · ${JSON.stringify(parameters).slice(0, 300)} · ${reason}`);
  return structuredClone(task);
}

/** An official cancels a task that is not finished, with a reason; audited. The integration sees it cancelled on its next pull. */
export function cancelTask(id: string, by: string, reason: string, now = new Date()): TwinTask | { error: string } {
  const t = store().tasks.find(x => x.id === id);
  if (!t) return { error: 'No such task' };
  const who = by.trim(), why = reason.trim();
  if (!who) return { error: 'Only a signed-in official cancels a task' };
  if (why.length < 4) return { error: 'Give the reason for cancelling it' };
  if (FINAL_STATUSES.includes(t.status)) return { error: `The task is already ${t.status}` };
  t.status = 'cancelled';
  t.history.push({ status: 'cancelled', at: now.toISOString(), by: who, note: why.slice(0, 500) });
  const cap = store().capabilities.find(c => c.id === t.capabilityId);
  recordAudit(who, 'twin.tasking.task.cancel', `Twin:${cap?.sourceId ?? '?'}/${t.id}`, 'ok', why.slice(0, 300));
  return structuredClone(t);
}

/**
 * The tasks an integration executes that are not finished, oldest first (at
 * most PULL_LIMIT), with each capability; tasks handed over for the first time
 * become delivered (audited once per pull). Tasks cancelled since the last
 * pull are listed once more, so the gateway learns to drop them.
 */
export function pullTasks(integration: { id: string; name: string }, now = new Date()): { tasks: (TwinTask & { capability: Pick<TaskingCapability, 'id' | 'name' | 'sourceId' | 'parameters'> })[] } {
  const s = store();
  const caps = new Map(s.capabilities.filter(c => c.integrationId === integration.id).map(c => [c.id, c]));
  const by = `Integration ${integration.name} (${integration.id})`;
  const at = now.toISOString();
  const out: TwinTask[] = [];
  const fresh: string[] = [];
  for (const t of s.tasks) {
    if (out.length >= PULL_LIMIT) break;
    if (!caps.has(t.capabilityId)) continue;
    const cancelledUnseen = t.status === 'cancelled' && !t.history.some(h => h.status === 'cancelled' && h.note?.startsWith('Seen by '));
    if (FINAL_STATUSES.includes(t.status) && !cancelledUnseen) continue;
    if (t.status === 'created') { t.status = 'delivered'; t.history.push({ status: 'delivered', at, by }); fresh.push(t.id); }
    if (cancelledUnseen) t.history.push({ status: 'cancelled', at, by, note: `Seen by ${by}` });
    out.push(t);
  }
  if (fresh.length) recordAudit(by, 'twin.tasking.task.deliver', `Integration:${integration.id}`, 'ok', `${fresh.length} tasks delivered: ${fresh.slice(0, 20).join(', ')}${fresh.length > 20 ? ' …' : ''}`);
  return { tasks: out.map(t => { const c = caps.get(t.capabilityId)!; return { ...structuredClone(t), capability: { id: c.id, name: c.name, sourceId: c.sourceId, parameters: structuredClone(c.parameters) } }; }) };
}

/** The executing integration reports a task's status (accepted, rejected, in-progress, completed, failed) with an optional note; audited. */
export function acknowledgeTask(id: string, integration: { id: string; name: string }, status: unknown, note: unknown, now = new Date()): TwinTask | { error: string; status: number } {
  const s = store();
  const t = s.tasks.find(x => x.id === id);
  const cap = t ? s.capabilities.find(c => c.id === t.capabilityId) : undefined;
  // A task of another integration is answered as if it did not exist.
  if (!t || !cap || cap.integrationId !== integration.id) return { error: 'No such task for this integration', status: 404 };
  if (typeof status !== 'string' || !EXECUTOR_STATUSES.includes(status as TaskStatus)) return { error: `Report one of ${EXECUTOR_STATUSES.join(', ')}`, status: 400 };
  const to = status as TaskStatus;
  if (!NEXT[t.status].includes(to)) return { error: `A task that is ${t.status} cannot become ${to}${NEXT[t.status].length ? ` (only ${NEXT[t.status].join(' or ')})` : ''}`, status: 409 };
  const by = `Integration ${integration.name} (${integration.id})`;
  const n = text(note, 500);
  t.status = to;
  t.history.push({ status: to, at: now.toISOString(), by, ...(n ? { note: n } : {}) });
  recordAudit(by, 'twin.tasking.task.status', `Twin:${cap.sourceId}/${t.id}`, to === 'failed' || to === 'rejected' ? 'error' : 'ok', `${to}${n ? ` · ${n}` : ''}`);
  return structuredClone(t);
}

/** SWE Common DataRecord of a capability's parameters, as SensorThings Tasking Core serves taskingParameters. */
export function sweParameters(cap: TaskingCapability): { type: 'DataRecord'; field: Record<string, unknown>[] } {
  return {
    type: 'DataRecord',
    field: cap.parameters.map(p => ({
      name: p.name, label: p.label, optional: !p.required,
      ...(p.kind === 'number' ? { type: 'Quantity', ...(p.unit ? { uom: { code: p.unit } } : {}), ...(p.min !== undefined || p.max !== undefined ? { constraint: { type: 'AllowedValues', interval: [[p.min ?? null, p.max ?? null]] } } : {}) } : {}),
      ...(p.kind === 'choice' ? { type: 'Category', constraint: { type: 'AllowedTokens', value: p.choices } } : {}),
      ...(p.kind === 'boolean' ? { type: 'Boolean' } : {}),
      ...(p.kind === 'text' ? { type: 'Text' } : {}),
    })),
  };
}
