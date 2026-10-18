// Real cases into an institution's queue (register 15.9). A ministry loads
// the cases it already holds — a CSV saved from its spreadsheet or case
// system — or types one in. Every row is checked first: a row that cannot be
// read is refused with its reason, never guessed. A load names the official,
// keeps the file's SHA-256 and goes to the audit chain; it can be withdrawn
// (cases nobody has acted on yet leave the queue). Once real cases arrive the
// institution can remove the platform's example cases. Cases age from when
// they were received, so My work and the late counts are the institution's
// own. Held in platform state (lib/data/persist.ts).

import { createHash, randomUUID, randomBytes, timingSafeEqual } from 'node:crypto';
import { getMinistry, queueFor, queueRegions, recordAudit } from '@/lib/data/store';
import { parseCsv } from '@/lib/twin/csv';
import type { CaseColumn, CaseFeed, CaseImport, CaseRefusal, QueueItem, QueueItemState, QueuePriority } from '@/lib/api/types';

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

interface Db { imports: CaseImport[]; feeds: CaseFeed[] }
const g = globalThis as unknown as { __civicosCaseImports?: Db };
const db = (): Db => {
  const d = (g.__civicosCaseImports ??= { imports: [], feeds: [] });
  d.feeds ??= []; // snapshots saved before case feeds existed
  return d;
};
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
export function checkCases(ministryId: string, records: Record<string, string>[], source: 'imported' | 'entered' | 'feed', now = Date.now()): { cases: QueueItem[]; refused: Refusal[] } | { error: string } {
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

// ── Connected case systems ───────────────────────────────────────────
// A ministry's own case system sends its cases straight to the queue: no
// spreadsheet. Each system has its own key (ccf_<prefix>_<secret>), shown
// once when issued; only its SHA-256 is kept and it is compared in constant
// time. A call adds new cases under the same checks as a loaded file and
// updates the cases that system sent before (closed, reassigned, re-graded
// in the ministry's system); it never changes cases loaded or typed in on the
// platform. The system can also read back what officials did here since a
// given time, so both sides agree. Every call is audited with the SHA-256 of
// what was sent.

const sha256 = (v: string) => createHash('sha256').update(v).digest('hex');
const FEED_STATES: Record<string, QueueItemState> = { open: 'open', assigned: 'assigned', escalated: 'escalated', cleared: 'cleared', closed: 'cleared' };
const KEY = /^ccf_([0-9a-f]{8})_[0-9a-f]{40}$/;
// Key hashes live apart from the feed records, which officials' screens read.
interface FeedKeys { hashes: Record<string, string> }
const gk = globalThis as unknown as { __civicosCaseFeedKeys?: FeedKeys };
const keys = (): FeedKeys => (gk.__civicosCaseFeedKeys ??= { hashes: {} });

export function listFeeds(ministryId: string): CaseFeed[] {
  return db().feeds.filter(f => f.ministryId === ministryId);
}

/** Connect a case system: returns its key once. */
export function issueFeed(ministryId: string, name: string | undefined, by: string | undefined): { feed: CaseFeed; key: string } | { error: string } {
  const m = getMinistry(ministryId);
  if (!m) return { error: 'Ministry not found' };
  const who = by?.trim();
  if (!who) return { error: 'Name the official connecting the system' };
  const label = (name ?? '').trim();
  if (!label || label.length > 80) return { error: 'Name the case system (up to 80 characters)' };
  if (listFeeds(ministryId).some(f => !f.revokedAt && f.name.toLowerCase() === label.toLowerCase())) return { error: 'A connected system already has that name' };
  const hex = randomBytes(24).toString('hex');
  const prefix = hex.slice(0, 8);
  const key = `ccf_${prefix}_${hex.slice(8)}`;
  const feed: CaseFeed = { id: `FEED-${randomUUID().slice(0, 8)}`, ministryId, name: label, prefix, issuedAt: new Date().toISOString(), issuedBy: who, calls: 0 };
  db().feeds.push(feed);
  keys().hashes[feed.id] = sha256(key);
  recordAudit(who, 'queue.feed.issue', `CaseFeed:${feed.id}`, 'ok', `${m.name} · ${label} · ccf_${prefix}…`);
  return { feed, key };
}

export function revokeFeed(ministryId: string, feedId: string, by: string | undefined): CaseFeed | { error: string } {
  const f = db().feeds.find(x => x.id === feedId && x.ministryId === ministryId);
  if (!f) return { error: 'No such connected system' };
  if (!by?.trim()) return { error: 'Name the official disconnecting the system' };
  if (f.revokedAt) return { error: 'This system is already disconnected' };
  Object.assign(f, { revokedAt: new Date().toISOString(), revokedBy: by.trim() });
  delete keys().hashes[f.id];
  recordAudit(by.trim(), 'queue.feed.revoke', `CaseFeed:${f.id}`, 'ok', `${getMinistry(ministryId)?.name ?? ministryId} · ${f.name} · ccf_${f.prefix}…`);
  return f;
}

/** The connected system a key belongs to, for this ministry; null for anything else. */
export function feedForKey(ministryId: string, authorization: string | null | undefined): CaseFeed | null {
  const key = (authorization ?? '').replace(/^Bearer\s+/i, '').trim();
  const m = KEY.exec(key);
  if (!m) return null;
  const want = Buffer.from(sha256(key), 'hex');
  for (const f of db().feeds) {
    if (f.ministryId !== ministryId || f.revokedAt || f.prefix !== m[1]) continue;
    const h = keys().hashes[f.id];
    if (!h) continue;
    const have = Buffer.from(h, 'hex');
    if (have.length === want.length && timingSafeEqual(have, want)) return f;
  }
  return null;
}

const feedActor = (f: CaseFeed) => `Case system: ${f.name} (ccf_${f.prefix}…)`;

/**
 * Receive cases from a connected system. New references are added (checked
 * like a loaded row); references this system sent before are updated; any
 * other existing reference is refused. Answers per case, by position.
 */
export function receiveFeed(feed: CaseFeed, body: unknown, raw: string, now = Date.now()):
  { added: number; updated: number; unchanged: number; refused: { index: number; reference?: string; reason: string }[] } | { error: string } {
  const list = (body as { cases?: unknown } | null)?.cases;
  if (!Array.isArray(list)) return { error: 'Send { "cases": [ … ] }' };
  if (list.length > MAX_ROWS) return { error: `A call takes at most ${MAX_ROWS} cases` };
  const q = queueFor(feed.ministryId);
  if ('error' in q) return q;
  const byRef = new Map(q.items.filter(it => !isSample(it)).map(it => [it.ref.toLowerCase(), it] as const));
  const refused: { index: number; reference?: string; reason: string }[] = [];
  const fresh: { index: number; rec: Record<string, string>; state?: QueueItemState }[] = [];
  let updated = 0, unchanged = 0;
  const seen = new Set<string>();
  list.forEach((raw0, index) => {
    const c = (raw0 && typeof raw0 === 'object' ? raw0 : {}) as Record<string, unknown>;
    // rec: only the fields sent (an update touches nothing else); a new case is checked with every column.
    const rec: Record<string, string> = {};
    for (const col of CASE_COLUMNS) if (c[col.name] !== undefined && c[col.name] !== null) rec[col.name] = String(c[col.name]);
    const full = Object.fromEntries(CASE_COLUMNS.map(col => [col.name, rec[col.name] ?? '']));
    const reference = (rec.reference ?? '').trim();
    const no = (reason: string) => refused.push({ index, ...(reference ? { reference } : {}), reason });
    let state: QueueItemState | undefined;
    if (c.state !== undefined) {
      state = FEED_STATES[String(c.state).toLowerCase()];
      if (!state) return no('"state" must be open, assigned, escalated or closed');
    }
    if (!reference) return no('"reference" is empty');
    if (seen.has(reference.toLowerCase())) return no('this reference appears twice in the call');
    seen.add(reference.toLowerCase());
    const existing = byRef.get(reference.toLowerCase());
    if (!existing) { fresh.push({ index, rec: full, state }); return; }
    if (existing.feedId !== feed.id) return no('this case was loaded or entered on the platform; only officials change it');
    const before = JSON.stringify(existing);
    if (rec.subject?.trim()) existing.subject = rec.subject.trim().slice(0, 200);
    if (rec.priority) {
      const p = rec.priority.toLowerCase() as QueuePriority;
      if (!PRIORITIES.includes(p)) return no('"priority" must be routine, elevated or urgent');
      existing.priority = p;
    }
    if (rec.region !== undefined) {
      const r = queueRegions().find(x => x.toLowerCase() === rec.region!.trim().toLowerCase());
      if (rec.region.trim() && !r) return no(`"${rec.region}" is not one of the nation's regions (National settings)`);
      existing.region = r ?? '';
    }
    if (rec.assignee !== undefined) existing.assignee = rec.assignee.trim().slice(0, 120) || undefined;
    if (rec.note !== undefined) existing.note = rec.note.trim().slice(0, 500) || undefined;
    if (state) existing.state = state;
    if (JSON.stringify(existing) === before) unchanged++; else updated++;
  });

  let added = 0;
  if (fresh.length) {
    const checked = checkCases(feed.ministryId, fresh.map(f => f.rec), 'feed', now);
    if ('error' in checked) {
      for (const f of fresh) refused.push({ index: f.index, ...(f.rec.reference ? { reference: f.rec.reference } : {}), reason: checked.error });
    } else {
      for (const r of checked.refused) {
        const f = fresh[r.row - 2]!;
        refused.push({ index: f.index, ...(r.reference ? { reference: r.reference } : {}), reason: r.reason });
      }
      const stateOf = new Map(fresh.map(f => [(f.rec.reference ?? '').trim().toLowerCase(), f.state] as const));
      for (const c of checked.cases) {
        const st = stateOf.get(c.ref.toLowerCase());
        q.items.push({ ...c, feedId: feed.id, ...(st ? { state: st } : {}) });
        added++;
      }
    }
  }
  refused.sort((a, b) => a.index - b.index);
  feed.calls++;
  feed.lastCallAt = new Date(now).toISOString();
  feed.lastResult = { added, updated, unchanged, refused: refused.length };
  recordAudit(feedActor(feed), 'queue.feed.receive', `CaseFeed:${feed.id}`, refused.length && !added && !updated ? 'denied' : 'ok',
    `${q.ministry.name} · ${added} added, ${updated} updated, ${unchanged} unchanged, ${refused.length} refused · sha256 ${sha256(raw).slice(0, 16)}`);
  return { added, updated, unchanged, refused };
}

/** What officials did on the platform to this system's cases since a time, so the system can follow. */
export function feedChanges(feed: CaseFeed, since: string | null): { cases: Pick<QueueItem, 'ref' | 'state' | 'assignee' | 'note' | 'actedAt'>[] } | { error: string } {
  const t = since ? Date.parse(since) : 0;
  if (since && Number.isNaN(t)) return { error: '"since" must be a date and time, e.g. 2026-10-18T09:00:00Z' };
  const q = queueFor(feed.ministryId);
  if ('error' in q) return q;
  return {
    cases: q.items
      .filter(it => it.feedId === feed.id && it.actedAt && Date.parse(it.actedAt) > t)
      .map(it => ({ ref: it.ref, state: it.state, assignee: it.assignee, note: it.note, actedAt: it.actedAt })),
  };
}
