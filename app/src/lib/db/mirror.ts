// The substrate as a mirror of platform registers (architecture review R19,
// finding D8). The platform owns directives (lib/data/directives.ts,
// /api/directives) and institutions (the ministry registry, /api/org/ministries,
// plus the standing branches and agencies, lib/institution/charters.ts); the
// substrate's civicos.directives and civicos.institutions are copies of them,
// kept for the substrate's own rows, aggregates and realtime feeds.
//
// The same pattern as the audit anchors (/api/cron/audit-anchor): written
// after the platform's commit, with the service role, best-effort. A record
// is queued first (so a failure stays visible), written, and taken off the
// queue only once the substrate accepted it; a failure is logged
// (`substrate.mirror_failed`), counted and retried on the next write, by the
// hourly cron (/api/cron/promote-directives, which also re-copies everything)
// or by `reconcileMirror()`. The mirror is never the source of a read the
// platform answers. This module is the only app code that writes those
// tables (register-owners.test.ts checks); it runs on the server only.
//
// Cases under procedures (lib/casework/) are mirrored the same way, one row
// per case in civicos.case_mirror, carrying progress only (procedure, owner,
// stage, priority, next deadline, approval waiting): no fields, parties,
// documents or decisions leave the platform.
//
// When the platform first meets a substrate that already holds directives
// (an installation from before this change, when the substrate owned them),
// `adoptSubstrateDirectives()` copies the ones the platform lacks into the
// platform once, audited; from then on the platform's record wins.

import { serverClient } from '@/lib/db/client';
import { touch } from '@/lib/data/repo/track';
import { logger } from '@/lib/ops/log';
import type { DirectiveRow } from '@/lib/db/types';
import { allDirectiveRefs, directive, adoptDirectives } from '@/lib/data/directives';
import { institutionRows } from '@/lib/institution/charter-register';
import { getCase, listCases } from '@/lib/casework/engine';

export type MirrorKind = 'directive' | 'institutions' | 'case';
export interface MirrorItem {
  /** `directive:<ref>`, `case:<id>` or `institutions`. */
  id: string;
  kind: MirrorKind;
  key: string;
  queuedAt: string;
  /** Bumped each time the record is queued again; a write clears the item only if it is unchanged. */
  rev: number;
  attempts: number;
  lastTriedAt: string | null;
  lastError: string | null;
}
interface Db {
  items: MirrorItem[];
  written: number;
  failed: number;
  lastWriteAt: string | null;
  lastError: string | null;
  directivesAdoptedAt: string | null;
}

const g = globalThis as unknown as { __civicosSubstrateMirror?: Db; __substrateMirrorFlush?: Promise<void> | null };
const fresh = (): Db => ({ items: [], written: 0, failed: 0, lastWriteAt: null, lastError: null, directivesAdoptedAt: null });
const db = (): Db => touch('__civicosSubstrateMirror', g.__civicosSubstrateMirror ??= fresh());
export function resetMirror(): void { g.__civicosSubstrateMirror = undefined; g.__substrateMirrorFlush = null; }

type Client = NonNullable<ReturnType<typeof serverClient>>;
const client = (): Client | null => (typeof window === 'undefined' ? serverClient() : null);

/** True when the substrate is connected with the service role, so the mirror can be written. */
export function mirrorConfigured(): boolean { return client() !== null; }

/**
 * Queue one record of a platform register for the substrate and start writing
 * it. Called by the owner's routes after their change is committed. Returns at
 * once; the write happens in the background.
 */
export function queueMirror(kind: MirrorKind, key: string = kind): void {
  if (!mirrorConfigured()) return;
  const id = kind === 'institutions' ? kind : `${kind}:${key}`;
  const d = db();
  const had = d.items.find(i => i.id === id);
  if (had) had.rev = (had.rev ?? 0) + 1;
  else d.items.push({ id, kind, key, queuedAt: new Date().toISOString(), rev: 0, attempts: 0, lastTriedAt: null, lastError: null });
  void flushMirror();
}

/** Write every queued record (one flush at a time). Failures stay queued. */
export function flushMirror(): Promise<void> {
  if (g.__substrateMirrorFlush) return g.__substrateMirrorFlush;
  const run = (async () => {
    const sb = client();
    if (!sb) return;
    // Items queued while this flush runs are written by it too; each item once per flush.
    const tried = new Set<string>();
    for (let item = db().items.find(i => !tried.has(i.id)); item; item = db().items.find(i => !tried.has(i.id))) {
      tried.add(item.id);
      const rev = item.rev ?? 0;
      const error = await write(sb, item).catch((e: unknown) => (e instanceof Error ? e.message : String(e)));
      const d = db();
      const now = new Date().toISOString();
      const id = item.id;
      const live = d.items.find(i => i.id === id);
      if (!error) {
        // Changed again while being written: write it once more.
        if (live && (live.rev ?? 0) !== rev) tried.delete(id);
        else d.items = d.items.filter(i => i.id !== id);
        d.written++;
        d.lastWriteAt = now;
      } else {
        d.failed++;
        d.lastError = `${id}: ${error}`;
        if (live) { live.attempts++; live.lastTriedAt = now; live.lastError = error; }
        logger.error('substrate.mirror_failed', { record: id, attempts: live?.attempts ?? 1, message: error });
      }
    }
  })().finally(() => { g.__substrateMirrorFlush = null; });
  g.__substrateMirrorFlush = run;
  return run;
}

/** Queue every directive, the institutions and every open case, then write them: the full re-copy the hourly cron runs. */
export async function reconcileMirror(): Promise<MirrorStatus> {
  if (mirrorConfigured()) {
    for (const ref of allDirectiveRefs()) queueMirror('directive', ref);
    queueMirror('institutions');
    for (const c of listCases({ open: true })) queueMirror('case', c.id);
    await flushMirror();
  }
  return mirrorStatus();
}

export interface MirrorStatus {
  configured: boolean;
  pending: number;
  /** The oldest queued records, with their last error. */
  items: MirrorItem[];
  written: number;
  failed: number;
  lastWriteAt: string | null;
  lastError: string | null;
  directivesAdoptedAt: string | null;
}

export function mirrorStatus(): MirrorStatus {
  const d = db();
  return {
    configured: mirrorConfigured(), pending: d.items.length, items: d.items.slice(0, 20).map(i => ({ ...i })),
    written: d.written, failed: d.failed, lastWriteAt: d.lastWriteAt, lastError: d.lastError, directivesAdoptedAt: d.directivesAdoptedAt,
  };
}

/**
 * Once per installation: copy into the platform the directives the substrate
 * holds and the platform does not (they were written while the substrate
 * owned them). Afterwards the platform is the only owner.
 */
export async function adoptSubstrateDirectives(): Promise<number> {
  if (db().directivesAdoptedAt) return 0;
  const sb = client();
  if (!sb) return 0;
  let rows: DirectiveRow[];
  try {
    const { data, error } = await sb.from('civicos_directives').select('*').order('created_at', { ascending: true }).limit(10_000);
    if (error) throw new Error(error.message);
    rows = (data ?? []) as DirectiveRow[];
  } catch (e) {
    // Not taken over yet: tried again on the next read.
    logger.error('substrate.mirror_adopt_failed', { message: e instanceof Error ? e.message : String(e) });
    return 0;
  }
  const n = adoptDirectives(rows);
  db().directivesAdoptedAt = new Date().toISOString();
  return n;
}

// ── Writing one record ──────────────────────────────────────────────────────

async function write(sb: Client, item: MirrorItem): Promise<string | null> {
  if (item.kind === 'directive') {
    const row = directive(item.key);
    if (!row) return null; // nothing to copy (never recorded on this installation)
    const { error } = await sb.rpc('civicos_mirror_directive', { p_row: row });
    return error ? error.message : null;
  }
  if (item.kind === 'case') {
    const row = caseMirrorRow(item.key);
    if (!row) return null;
    const { error } = await sb.rpc('civicos_mirror_case', { p_row: row });
    return error ? error.message : null;
  }
  for (const row of institutionRows()) {
    const { error } = await sb.rpc('civicos_mirror_institution', {
      p_charter_id: row.charterId, p_label: row.label, p_kind: row.kind, p_domain: row.domain,
      p_archetype_or_branch: row.archetypeOrBranch, p_activated: row.activated, p_meta: row.meta,
    });
    if (error) return `${row.charterId}: ${error.message}`;
  }
  return null;
}

/** What the substrate keeps of a case: its progress, never its content. */
export function caseMirrorRow(id: string): Record<string, string | number | boolean | null> | null {
  const c = getCase(id);
  if (!c) return null;
  const next = c.deadlines.filter(d => !d.met && !d.lapsed).sort((a, b) => a.due.localeCompare(b.due))[0];
  return {
    id: c.id, ref: c.ref, procedure_key: c.package.key, procedure_version: c.package.version, owner_institution: c.owner,
    stage: c.stage, priority: c.priority, sensitivity: c.sensitivity, pending_approval: Boolean(c.pending),
    next_due: next?.due ?? null, source: c.source, opened_at: c.openedAt, closed_at: c.closedAt ?? null,
  };
}

// The charter rows the mirror copies are the platform's register
// (lib/institution/charter-register.ts); re-exported for existing callers.
export { institutionRows, type InstitutionMirrorRow } from '@/lib/institution/charter-register';
