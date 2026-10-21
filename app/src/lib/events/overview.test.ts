import { describe, it, expect, beforeEach } from 'vitest';
import { buildOutboxOverview, outboxOverview } from './overview';
import { afterRestore, advanceCursor, noteAudit, recordDelivery, resetOutbox, type CloudEvent } from './outbox';
import type { AuditEntry, WebhookSubscription } from '@/lib/api/types';

const ev = (seq: number, type: string, over: Partial<CloudEvent> = {}): CloudEvent => ({
  specversion: '1.0', id: `evt-${seq}`, source: '/civicos/platform', type: `org.civicos.${type}`, subject: 'Person:BR-2026-000001', time: `2026-10-0${seq}T00:00:00.000Z`,
  datacontenttype: 'application/json', auditseq: seq, restoreepoch: 0, data: { action: type, resource: 'Person:BR-2026-000001', actor: 'Registrar Jane', outcome: 'ok', detail: 'Amara Okafor', audit: { seq, hash: 'h' } }, ...over,
});
const hook = (over: Partial<WebhookSubscription>): WebhookSubscription => ({ id: 'wh-1', topic: 'facility', url: 'https://receiver.example.gov/hook?token=secret', status: 'active', failures: 0, createdAt: '', ...over });

describe('event outbox overview', () => {
  it('shows per subscription its cursor, what waits, its attempts and last result', () => {
    const o = buildOutboxOverview({
      events: [ev(1, 'facility.publish'), ev(2, 'facility.withdraw'), ev(3, 'permit.issue'), ev(4, 'facility.publish', { voided: 'BK-1' })],
      cursors: { 'wh-1': 1, 'wh-gone': 3 },
      deliveries: [
        { webhookId: 'wh-1', eventId: 'evt-1', type: 'org.civicos.facility.publish', at: '2026-10-01T01:00:00.000Z', ok: true, detail: 'delivered' },
        { webhookId: 'wh-1', eventId: 'evt-2', type: 'org.civicos.facility.withdraw', at: '2026-10-02T01:00:00.000Z', ok: false, detail: 'HTTP 500' },
      ],
      epoch: 1,
      webhooks: [hook({ failures: 1 }), hook({ id: 'wh-2', topic: '*', status: 'paused' })],
    });
    expect(o.consumers[0]).toMatchObject({ id: 'wh-1', host: 'receiver.example.gov', cursor: 1, pending: 1, oldestPendingAt: '2026-10-02T00:00:00.000Z', delivered: 1, failed: 1, lastAttempt: { ok: false, detail: 'HTTP 500' }, failures: 1 });
    expect(o.consumers[1]).toMatchObject({ id: 'wh-2', cursor: 0, pending: 3, status: 'paused' });
    expect(o.events).toMatchObject({ kept: 4, voided: 1 });
    expect(o.voidedBy).toEqual([{ backup: 'BK-1', count: 1 }]);
    expect(o.orphanCursors).toEqual([{ id: 'wh-gone', cursor: 3 }]);
    expect(o.recentEvents[0]).toEqual({ id: 'evt-4', type: 'org.civicos.facility.publish', time: '2026-10-04T00:00:00.000Z', auditseq: 4, restoreepoch: 0, voided: 'BK-1' });
    // Never the actor, subject, detail or the receiver's full address.
    const text = JSON.stringify(o);
    for (const s of ['Registrar Jane', 'Amara', 'BR-2026', 'token=secret']) expect(text).not.toContain(s);
  });

  describe('as the platform stands', () => {
    beforeEach(() => resetOutbox());
    it('follows a restore: voided events, cursors moved back, the epoch raised', () => {
      const at = '2026-10-01T00:00:00.000Z';
      for (let seq = 1; seq <= 3; seq++) noteAudit({ seq, at, actor: 'A', action: 'facility.publish', resource: `Facility:F${seq}`, outcome: 'ok', hash: 'h', prevHash: 'p' } as AuditEntry);
      advanceCursor('wh-x', 3);
      recordDelivery({ webhookId: 'wh-x', eventId: 'e', type: 'org.civicos.facility.publish', at, ok: true, detail: 'delivered' });
      afterRestore(1, 'BK-9');
      const o = outboxOverview();
      expect(o.epoch).toBe(1);
      expect(o.events).toMatchObject({ kept: 3, voided: 2 });
      expect(o.voidedBy).toEqual([{ backup: 'BK-9', count: 2 }]);
      expect(o.orphanCursors.find(c => c.id === 'wh-x')).toEqual({ id: 'wh-x', cursor: 1 });
      expect(o.recentDeliveries).toHaveLength(1);
    });
  });
});
