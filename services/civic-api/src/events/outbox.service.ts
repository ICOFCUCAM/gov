import { Injectable } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import type { Topic } from './topics';

/**
 * Transactional outbox. Callers enqueue an event using the SAME Prisma
 * transaction client that performed the state change, so the event is
 * committed atomically with the write. The relay (OutboxRelay) publishes
 * pending rows to the broker and marks them dispatched — at-least-once
 * delivery without distributed transactions.
 */
@Injectable()
export class OutboxService {
  async enqueue(
    tx: Prisma.TransactionClient,
    args: {
      tenantId: string;
      topic: Topic;
      partitionKey: string;
      payload: unknown;
    },
  ): Promise<void> {
    await tx.outboxEvent.create({
      data: {
        tenantId: args.tenantId,
        topic: args.topic,
        partitionKey: args.partitionKey,
        payload: args.payload as object,
        status: 'PENDING',
      },
    });
  }
}
