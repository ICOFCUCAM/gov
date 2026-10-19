// What follows a durable audit entry: its CloudEvent (lib/events/outbox.ts)
// and, every N entries or T minutes, a signed head (lib/audit/sign.ts). The
// memory backend runs it as the entry is appended; the postgres backend runs
// it once the entry is committed with its final sequence and hash, on the
// instance that owns those two single-writer stores (lib/data/repo/postgres.ts).
// Not re-exported by the store barrel.

import type { AuditEntry } from '@/lib/api/types';
import { maybeSignHead } from '@/lib/audit/sign';
import { noteAudit } from '@/lib/events/outbox';

export function auditCommitted(entry: AuditEntry): void {
  noteAudit(entry);
  maybeSignHead(entry);
}
