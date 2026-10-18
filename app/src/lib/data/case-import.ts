// Real cases into an institution's queue (register 15.9). A ministry loads
// the cases it already holds — a CSV saved from its spreadsheet or case
// system — or types one in. Every row is checked first: a row that cannot be
// read is refused with its reason, never guessed. A load names the official,
// keeps the file's SHA-256 and goes to the audit chain; it can be withdrawn
// (cases nobody has acted on yet leave the queue). Once real cases arrive the
// institution can remove the platform's example cases. Cases age from when
// they were received, so My work and the late counts are the institution's
// own. Held in platform state (lib/data/persist.ts).

import { createHash, randomUUID } from 'node:crypto';
import { getMinistry, queueFor, queueRegions, recordAudit } from '@/lib/data/store';
import { parseCsv } from '@/lib/twin/csv';
import type { CaseColumn, CaseImport, CaseRefusal, QueueItem, QueuePriority } from '@/lib/api/types';

/** The columns a file may have, in the order of the template. */
export const CASE_COLUMNS: CaseColumn[] = [
  { name: 'reference', required: true, means: 'The case number your institution uses (unique).', aliases: ['ref', 'case', 'case number', 'case_number', 'id'] },
  { name: 'subject', required: true, means: 'What the case is about, in a few words.', aliases: ['title', 'description', 'summary'] },
  { name: 'received', required: true, means: 'When it was received: 2026-03-14 or 2026-03-14T09:30.', aliases: ['received_at', 'date', 'date received', 'opened', 'submitted'] },
  { name: 'region', required: false, means: 'One of the nation\'s regions, as written in National settings.', aliases: ['county', 'district', 'province', 'state'] },
  { name: 'priority', required: false, means: 'routine (the default), elevated or urgent.', aliases: ['urgency'] },
  { name: 'assignee', required: false, means: 'The official already handling it, if any.', aliases: ['assigned_to', 'assigned to', 'officer', 'owner'] },
  { name: 'note', required: false, means: 'Anything the next official should know.', aliases: ['notes', 'remarks', 'comment'] },
];

export const MAX_ROWS = 5000;
export const MAX_BYTES = 2_000_000;
const PRIORITIES: QueuePriority[] = ['routine', 'elevated', 'urgent'];

export type { CaseImport };
export type Refusal = CaseRefusal;

interface Db { imports: CaseImport[] }
const g = globalThis as unknown as { __civicosCaseImports?: Db };
const db = (): Db => (g.__civicosCaseImports ??= { imports: [] });
export function resetCaseImports(): void { g.__civicosCaseImports = undefined; }

const isSample = (it: QueueItem) => (it.source ?? 'sample') === 'sample';

/** Read a header name as one of CASE_COLUMNS, whatever its case or spacing. */
function columnOf(header: string): string | undefined {
  const h = header.trim().toLowerCase().replace(/\s+/g, ' ');
  return CASE_COLUMNS.find(c => c.name === h || c.aliases.includes(h))?.name;
}

function parseReceived(v: string, now: number): string | { error: string } {
  const s = v.trim();
  if (!/^\d{4}-\d{2}-\d{2}([T ]\d{2}:\d{2}(:\d{2}(\.\d+)?)?(Z|[+-]\d{2}:?\d{2})?)?$/.test(s)) return { error: `"received" must be a date like 2026-03-14 (got "${s.slice(0, 40)}")` };
  const t = Date.parse(s.length === 10 ? `${s}T00:00:00Z` : s.replace(' ', 'T'));
  if (Number.isNaN(t)) return { error: `"received" is not a real date ("${s}")` };
  if (t > now + 5 * 60_000) return { error: '"received" is in the future' };
  if (t < Date.parse('1900-01-01T00:00:00Z')) return { error: '"received" is before 1900' };
  return new Date(t).toISOString();
}

/**
 * Check rows against the rules and the institution's queue. Returns the cases
 * that would be added and every refused row with its reason (row numbers
 * count the header as row 1, as a spreadsheet shows them).
 */
export function checkCases(ministryId: string, records: Record<string, string>[], source: 'imported' | 'entered', now = Date.now()): { cases: QueueItem[]; refused: Refusal[] } | { error: string } {
  const q = queueFor(ministryId);
  if ('error' in q) return q;
  if (records.length === 0) return { error: 'The file has no rows under its header' };
  if (records.length > MAX_ROWS) return { error: `A load takes at most ${MAX_ROWS} cases; split the file` };
  const headers = Object.keys(records[0]!);
  const mapped = new Map(headers.map(h => [h, columnOf(h)] as const));
  const missing = CASE_COLUMNS.filter(c => c.required && ![...mapped.values()].includes(c.name)).map(c => c.name);
  if (missing.length) return { error: `The file needs the column${missing.length > 1 ? 's' : ''} ${missing.join(', ')} (see the template)` };

  const regions = new Map(queueRegions().map(r => [r.toLowerCase(), r] as const));
  const taken = new Set(q.items.filter(it => !isSample(it)).map(it => it.ref.toLowerCase()));
  const cases: QueueItem[] = [];
  const refused: Refusal[] = [];
  records.forEach((rec, i) => {
    const row = i + 2;
    const v: Record<string, string> = {};
    for (const [h, name] of mapped) if (name && !v[name]) v[name] = (rec[h] ?? '').trim();
    const reference = v.reference ?? '';
    const no = (reason: string) => refused.push({ row, ...(reference ? { reference } : {}), reason });
    if (!reference) return no('"reference" is empty');
    if (reference.length > 64) return no('"reference" is longer than 64 characters');
    if (taken.has(reference.toLowerCase())) return no('a case with this reference is already in the queue or earlier in the file');
    const subject = v.subject ?? '';
    if (!subject) return no('"subject" is empty');
    if (subject.length > 200) return no('"subject" is longer than 200 characters');
    const received = parseReceived(v.received ?? '', now);
    if (typeof received !== 'string') return no(received.error);
    let region = '';
    if (v.region) {
      const r = regions.get(v.region.toLowerCase());
      if (!r) return no(`"${v.region}" is not one of the nation's regions (National settings)`);
      region = r;
    }
    const priority = (v.priority || 'routine').toLowerCase() as QueuePriority;
    if (!PRIORITIES.includes(priority)) return no(`"priority" must be routine, elevated or urgent (got "${v.priority}")`);
    const assignee = (v.assignee ?? '').slice(0, 120) || undefined;
    taken.add(reference.toLowerCase());
    cases.push({
      id: `Q-${randomUUID().slice(0, 8)}`,
      ref: reference,
      subject,
      region,
      ageHours: Math.max(0, Math.floor((now - Date.parse(received)) / 3_600_000)),
      priority,
      state: assignee ? 'assigned' : 'open',
      ...(assignee ? { assignee } : {}),
      ...(v.note ? { note: v.note.slice(0, 500) } : {}),
      receivedAt: received,
      source,
    });
  });
  return { cases, refused };
}

/**
 * Load a CSV into an institution's queue. With dryRun nothing changes and the
 * answer says what would happen. removeSamples takes the platform's example
 * cases out of this institution's queue in the same step.
 */
export function importCases(ministryId: string, input: { csv?: string; fileName?: string; dryRun?: boolean; removeSamples?: boolean; by?: string }, now = Date.now()):
  { accepted: number; refused: Refusal[]; samples: number; import?: CaseImport } | { error: string } {
  const csv = input.csv ?? '';
  if (!csv.trim()) return { error: 'Choose a CSV file' };
  if (Buffer.byteLength(csv) > MAX_BYTES) return { error: 'The file is larger than 2 MB; split it' };
  const by = input.by?.trim();
  if (!input.dryRun && !by) return { error: 'Name the official loading the cases' };
  const checked = checkCases(ministryId, parseCsv(csv), 'imported', now);
  if ('error' in checked) return checked;
  const q = queueFor(ministryId);
  if ('error' in q) return q;
  const samples = q.items.filter(isSample).length;
  if (input.dryRun) return { accepted: checked.cases.length, refused: checked.refused, samples };
  if (checked.cases.length === 0) return { error: 'No row could be loaded; see the reasons' };

  const record: CaseImport = {
    id: `IMP-${randomUUID().slice(0, 8)}`, ministryId, at: new Date(now).toISOString(), by: by!,
    ...(input.fileName ? { fileName: input.fileName.slice(0, 120) } : {}),
    sha256: createHash('sha256').update(csv).digest('hex'),
    accepted: checked.cases.length, refused: checked.refused.length, removedSamples: 0,
  };
  if (input.removeSamples && samples) record.removedSamples = removeSamplesFrom(q.items);
  for (const c of checked.cases) q.items.push({ ...c, importId: record.id });
  db().imports.unshift(record);
  const name = getMinistry(ministryId)?.name ?? ministryId;
  recordAudit(by!, 'queue.import', `CaseImport:${record.id}`, 'ok',
    `${name} · ${record.accepted} cases${record.fileName ? ` from ${record.fileName}` : ''} · sha256 ${record.sha256.slice(0, 16)} · ${record.refused} refused${record.removedSamples ? ` · ${record.removedSamples} example cases removed` : ''}`);
  return { accepted: record.accepted, refused: checked.refused, samples: samples - record.removedSamples, import: record };
}

/** Add one case typed in by an official. */
export function addCase(ministryId: string, input: Record<string, string | undefined> & { by?: string }, now = Date.now()): QueueItem | { error: string } {
  const by = input.by?.trim();
  if (!by) return { error: 'Name the official adding the case' };
  const rec: Record<string, string> = {};
  for (const c of CASE_COLUMNS) rec[c.name] = String(input[c.name] ?? '');
  const checked = checkCases(ministryId, [rec], 'entered', now);
  if ('error' in checked) return checked;
  if (checked.refused.length) return { error: checked.refused[0]!.reason.replace(/^./, ch => ch.toUpperCase()) };
  const q = queueFor(ministryId);
  if ('error' in q) return q;
  const c = checked.cases[0]!;
  q.items.push(c);
  recordAudit(by, 'queue.add', `QueueItem:${c.id}`, 'ok', `${getMinistry(ministryId)?.name ?? ministryId} · ${c.ref}`);
  return c;
}

function removeSamplesFrom(items: QueueItem[]): number {
  const before = items.length;
  const keep = items.filter(it => !isSample(it));
  items.splice(0, items.length, ...keep);
  return before - keep.length;
}

/** Take the platform's example cases out of an institution's queue (audited). */
export function removeSampleCases(ministryId: string, by?: string): { removed: number } | { error: string } {
  if (!by?.trim()) return { error: 'Name the official removing the example cases' };
  const q = queueFor(ministryId);
  if ('error' in q) return q;
  const removed = removeSamplesFrom(q.items);
  if (removed) recordAudit(by, 'queue.samples.remove', `Ministry:${ministryId}`, 'ok', `${q.ministry.name} · ${removed} example cases`);
  return { removed };
}

/** Undo a load: its cases that nobody has acted on since leave the queue; the rest stay (audited). */
export function withdrawImport(ministryId: string, importId: string, by?: string): CaseImport | { error: string } {
  if (!by?.trim()) return { error: 'Name the official withdrawing the load' };
  const rec = db().imports.find(r => r.id === importId && r.ministryId === ministryId);
  if (!rec) return { error: 'No such load' };
  if (rec.withdrawnAt) return { error: 'This load was already withdrawn' };
  const q = queueFor(ministryId);
  if ('error' in q) return q;
  const keep = q.items.filter(it => it.importId !== importId || !!it.actedAt);
  const removed = q.items.length - keep.length;
  q.items.splice(0, q.items.length, ...keep);
  Object.assign(rec, { withdrawnAt: new Date().toISOString(), withdrawnBy: by, withdrawn: removed });
  recordAudit(by, 'queue.import.withdraw', `CaseImport:${rec.id}`, 'ok', `${q.ministry.name} · ${removed} of ${rec.accepted} cases removed; ${rec.accepted - removed} already acted on stay`);
  return rec;
}

export function listImports(ministryId: string): CaseImport[] {
  return db().imports.filter(r => r.ministryId === ministryId);
}

/** How many of an institution's queue cases are the platform's examples. */
export function sampleCount(ministryId: string): number {
  const q = queueFor(ministryId);
  return 'error' in q ? 0 : q.items.filter(isSample).length;
}
