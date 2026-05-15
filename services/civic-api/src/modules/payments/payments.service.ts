import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { OutboxService } from '../../events/outbox.service';
import { Topics } from '../../events/topics';
import { chainHash } from '../../common/hash';

@Injectable()
export class PaymentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly outbox: OutboxService,
  ) {}

  listBills(tenantId: string) {
    return this.prisma.bill.findMany({
      where: { tenantId },
      orderBy: { dueDate: 'asc' },
    });
  }

  listReceipts(tenantId: string) {
    return this.prisma.receipt.findMany({
      where: { tenantId },
      orderBy: { seq: 'desc' },
      take: 200,
    });
  }

  /** Execute a payment: mark the bill paid and append an immutable,
   *  hash-chained receipt — atomically, with an outbox event. */
  async pay(tenantId: string, billId: string, rail: string) {
    return this.prisma.$transaction(async tx => {
      const bill = await tx.bill.findFirst({ where: { id: billId, tenantId } });
      if (!bill) throw new NotFoundException('Bill not found');
      if (bill.status === 'PAID') throw new ConflictException('Bill already paid');

      await tx.bill.update({ where: { id: billId }, data: { status: 'PAID' } });

      const last = await tx.receipt.findFirst({
        where: { tenantId },
        orderBy: { seq: 'desc' },
        select: { seq: true, hash: true },
      });
      const seq = (last?.seq ?? 0) + 1;
      const prevHash = last?.hash ?? null;
      const payload = {
        billId,
        amountMinor: bill.amountMinor,
        currency: bill.currency,
        rail,
        paidAt: new Date().toISOString(),
      };
      const hash = chainHash(prevHash, payload, seq);

      const receipt = await tx.receipt.create({
        data: {
          tenantId,
          citizenId: bill.citizenId,
          billId,
          kind: 'payment',
          payload,
          amountMinor: bill.amountMinor,
          currency: bill.currency,
          rail,
          prevHash,
          hash,
          seq,
        },
      });

      await this.outbox.enqueue(tx, {
        tenantId,
        topic: Topics.PaymentExecuted,
        partitionKey: billId,
        payload: { receiptId: receipt.id, billId, amountMinor: bill.amountMinor },
      });

      return receipt;
    });
  }
}
