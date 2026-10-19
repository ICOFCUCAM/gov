// Anchoring the platform audit chain outside the platform state (review R7).
//
// The anchor cron (/api/cron/audit-anchor) signs the current head
// (lib/audit/sign.ts) and copies it to places whoever holds the state cannot
// rewrite together with it:
//   - the substrate's federation stream ('audit.anchor', scope 'platform'),
//     when the substrate is connected (done by the route);
//   - an append-only file outside the state (file mode): every line is one
//     signed head plus the SHA-256 of the previous line, so the file is a
//     chain of its own. CIVICOS_AUDIT_ANCHOR_FILE names it; with
//     CIVICOS_STATE=file and no name it is `.civicos-anchors/platform-audit-heads.jsonl`
//     next to (never inside) the state directory.

import { appendFileSync, existsSync, mkdirSync, readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { auditHead } from '@/lib/data/store';
import { signHead, markAnchored, type SignedHead } from './sign';

export function anchorFilePath(env: NodeJS.ProcessEnv = process.env): string | null {
  if (env.CIVICOS_AUDIT_ANCHOR_FILE) return env.CIVICOS_AUDIT_ANCHOR_FILE;
  if (env.CIVICOS_STATE !== 'file') return null;
  const stateDir = env.CIVICOS_STATE_DIR || path.join(process.cwd(), '.civicos-state');
  return path.join(path.dirname(path.resolve(stateDir)), '.civicos-anchors', 'platform-audit-heads.jsonl');
}

const sha = (s: string) => createHash('sha256').update(s, 'utf8').digest('hex');

/** Append a signed head to the anchor file (opened in append mode only). Returns the line's hash. */
export function appendAnchorLine(file: string, head: SignedHead): string {
  mkdirSync(path.dirname(file), { recursive: true });
  let prev = 'GENESIS';
  if (existsSync(file)) {
    const lines = readFileSync(file, 'utf8').split('\n').filter(Boolean);
    const last = lines[lines.length - 1];
    if (last) prev = sha(last);
  }
  const { anchoredAt: _a, anchoredTo: _t, ...signed } = head;
  const line = JSON.stringify({ kind: 'civicos-audit-anchor-v1', prev, ...signed });
  appendFileSync(file, `${line}\n`, { flag: 'a' });
  return sha(line);
}

/** Check an anchor file's own chain; returns the number of lines or the first broken line. */
export function verifyAnchorFile(file: string): { ok: boolean; lines: number; brokenAtLine?: number } {
  const lines = readFileSync(file, 'utf8').split('\n').filter(Boolean);
  let prev = 'GENESIS';
  for (let i = 0; i < lines.length; i++) {
    const row = JSON.parse(lines[i]!) as { prev?: string };
    if (row.prev !== prev) return { ok: false, lines: lines.length, brokenAtLine: i + 1 };
    prev = sha(lines[i]!);
  }
  return { ok: true, lines: lines.length };
}

export interface PlatformAnchor {
  head: SignedHead | null;
  file?: { path: string; written: boolean; error?: string };
}

/** Sign the current head and write it to the anchor file when there is one. The route adds the substrate. */
export function anchorPlatformHead(now = Date.now()): PlatformAnchor {
  const h = auditHead();
  if (!h) return { head: null };
  const head = signHead(h, now);
  const file = anchorFilePath();
  if (!file) return { head };
  try {
    appendAnchorLine(file, head);
    markAnchored(head.seq, ['file'], now);
    return { head, file: { path: file, written: true } };
  } catch (e) {
    return { head, file: { path: file, written: false, error: (e as Error).message } };
  }
}
