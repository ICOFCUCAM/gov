// Recovery and event delivery (acceptance hardening): what consumers are told
// across a data restore. The outbox and the consumers' cursors are kept
// through a restore; events written after the restored point are voided, the
// cursors go back to it, and the restore's own event carries a new restore
// epoch so consumers re-read. Scenarios from the owner's directive:
//   1 an event committed but not delivered when the backup was taken
//   2 an event delivered whose acknowledgement was lost
//   3 the restore followed by the delivery worker starting again
//   4 the same event retried
//   5 events that arrive out of order
//   6 a consumer that processed an event about a record the restore removed
import { describe, it, expect, beforeAll, beforeEach, afterAll } from 'vitest';
import os from 'node:os';
import path from 'node:path';
import { mkdtempSync } from 'node:fs';
import { randomBytes } from 'node:crypto';
import { useTarget, dirTarget } from '@/lib/backup/target';
import { createBackup, requestRestore, resetBackups } from '@/lib/data/backups';
import { resetTax, registerTaxpayer, getTaxpayer } from '@/lib/tax/register';
import { pendingFor, advanceCursor, resetOutbox, recentEvents, type CloudEvent } from './outbox';

const KEK = randomBytes(32).toString('hex');
const ok = <T,>(r: T): Exclude<T, { error: string }> => { if (r && typeof r === 'object' && 'error' in r) throw new Error((r as { error: string }).error); return r as Exclude<T, { error: string }>; };
const WH = 'wh-mirror';
const taxEvents = () => pendingFor(WH, 'tax', 100);

/** A consumer that keeps what it applied by event id and orders by (restore epoch, audit sequence). */
class Consumer {
  seen = new Set<string>();
  applied: CloudEvent[] = [];
  resyncs = 0;
  epoch = 0;
  take(e: CloudEvent) {
    if (this.seen.has(e.id)) return false;
    this.seen.add(e.id);
    const ep = e.restoreepoch ?? 0;
    if (ep > this.epoch) { this.epoch = ep; this.resyncs++; }
    if (ep < this.epoch) return false;
    this.applied.push(e);
    return true;
  }
}

beforeAll(() => { process.env.CIVICOS_DATA_KEK = KEK; });
afterAll(() => { delete process.env.CIVICOS_DATA_KEK; useTarget(null); });

describe('event delivery across a data restore', () => {
  beforeEach(() => {
    useTarget(dirTarget(mkdtempSync(path.join(os.tmpdir(), 'civicos-restore-events-'))));
    resetBackups(); resetOutbox(); resetTax();
    process.env.CIVICOS_DATA_KEK = KEK;
  });

  it('voids what the restore took away, resets cursors, keeps what the backup holds, and tells consumers to re-read', async () => {
    const consumer = new Consumer();
    // 1. Committed before the backup, not yet delivered.
    const before = ok(registerTaxpayer({ party: { kind: 'person', id: 'BR-1', name: 'A' }, taxTypes: ['income'] }, 'c1', 'Officer'));
    const b = ok(await createBackup({ by: 'Admin Ada' }));
    // 2. After the backup: delivered, but the acknowledgement was lost (the cursor did not move).
    const after = ok(registerTaxpayer({ party: { kind: 'person', id: 'BR-2', name: 'B' }, taxTypes: ['income'] }, 'c2', 'Officer'));
    const delivered = taxEvents().find(e => e.subject === `Taxpayer:${after.tin}`)!;
    expect(consumer.take(delivered)).toBe(true);
    // 4. The same event retried before acknowledgement: same id, applied once.
    const retried = taxEvents().find(e => e.subject === `Taxpayer:${after.tin}`)!;
    expect(retried.id).toBe(delivered.id);
    expect(consumer.take(retried)).toBe(false);
    // Another consumer did acknowledge everything (its cursor is past the backup point).
    advanceCursor('wh-other', delivered.auditseq);

    ok(await requestRestore(b.id, { by: 'Admin Ada', acknowledgeLoss: true, reason: 'Test' }));
    const done = ok(await requestRestore(b.id, { by: 'Officer Ben', acknowledgeLoss: true }));
    if (done.pending) throw new Error('expected the restore');
    expect(getTaxpayer(after.tin)).toBeUndefined();
    expect(getTaxpayer(before.tin)).toBeDefined();

    // 3. The delivery worker starts again: the undelivered event the backup holds is still delivered;
    //    the event about the taxpayer the restore removed is voided, never delivered again.
    const now = taxEvents();
    expect(now.map(e => e.subject)).toContain(`Taxpayer:${before.tin}`);
    expect(now.map(e => e.subject)).not.toContain(`Taxpayer:${after.tin}`);
    expect(recentEvents(100).find(e => e.id === delivered.id)?.voided).toBe(b.id);
    // The restore's own event carries the new epoch; the acknowledging consumer's cursor went back to the restored point.
    const restoreEvent = pendingFor('wh-other', 'backup.restore', 10)[0]!;
    expect(restoreEvent.restoreepoch).toBe(1);
    expect(restoreEvent.auditseq).toBeLessThanOrEqual(delivered.auditseq);
    // 6. The consumer that processed the removed record learns of the restore and re-reads.
    expect(consumer.take(restoreEvent)).toBe(true);
    expect(consumer.resyncs).toBe(1);

    // 5. A change after the restore reuses an audit sequence the consumer saw before, but in the new epoch.
    const later = ok(registerTaxpayer({ party: { kind: 'person', id: 'BR-3', name: 'C' }, taxTypes: ['income'] }, 'c3', 'Officer'));
    const next = taxEvents().find(e => e.subject === `Taxpayer:${later.tin}`)!;
    expect(next.restoreepoch).toBe(1);
    expect(consumer.take(next)).toBe(true);
    // An event from before the restore arriving late (out of order) is not applied over the new epoch.
    expect(consumer.take({ ...delivered, id: 'evt-late-copy', restoreepoch: 0 })).toBe(false);
    // Numbers given after the backup are not given again (counters kept at their highest).
    expect(later.tin).not.toBe(after.tin);
  });
});
