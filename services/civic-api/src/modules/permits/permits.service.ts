import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { OutboxService } from '../../events/outbox.service';
import { Topics } from '../../events/topics';
import type { CreatePermitDto, DecidePermitDto } from './permits.dto';

/**
 * Permit domain service. State machine:
 *   SUBMITTED -> IN_REVIEW -> { APPROVED | DECLINED | NEEDS_INFO }
 *   NEEDS_INFO -> IN_REVIEW (citizen responds)
 * Every transition is appended to PermitTransition (event-sourced timeline)
 * and emitted via the outbox in the same transaction.
 */
@Injectable()
export class PermitsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly outbox: OutboxService,
  ) {}

  list(tenantId: string) {
    return this.prisma.permit.findMany({
      where: { tenantId },
      orderBy: { submittedAt: 'desc' },
      include: { timeline: { orderBy: { at: 'asc' } } },
    });
  }

  async get(tenantId: string, id: string) {
    const permit = await this.prisma.permit.findFirst({
      where: { id, tenantId },
      include: { timeline: { orderBy: { at: 'asc' } } },
    });
    if (!permit) throw new NotFoundException('Permit not found');
    return permit;
  }

  async create(tenantId: string, dto: CreatePermitDto) {
    return this.prisma.$transaction(async tx => {
      const citizen = await tx.citizen.findFirst({
        where: { id: dto.citizenId, tenantId },
        select: { id: true },
      });
      if (!citizen) throw new BadRequestException('Unknown citizen for tenant');

      const permit = await tx.permit.create({
        data: {
          tenantId,
          citizenId: dto.citizenId,
          type: dto.type,
          title: dto.title,
          status: 'SUBMITTED',
          fields: dto.fields,
          decisionDueAt: new Date(Date.now() + 12 * 86400000),
          timeline: { create: { status: 'SUBMITTED' } },
        },
        include: { timeline: true },
      });

      await this.outbox.enqueue(tx, {
        tenantId,
        topic: Topics.PermitSubmitted,
        partitionKey: permit.id,
        payload: { permitId: permit.id, type: permit.type },
      });

      return permit;
    });
  }

  /** Human-signed decision. The deciding officer is named on the record;
   *  AI involvement (if any) is recorded by class, never as the decider. */
  async decide(
    tenantId: string,
    id: string,
    decidedBySub: string,
    dto: DecidePermitDto,
  ) {
    return this.prisma.$transaction(async tx => {
      const permit = await tx.permit.findFirst({ where: { id, tenantId } });
      if (!permit) throw new NotFoundException('Permit not found');
      if (['APPROVED', 'DECLINED'].includes(permit.status)) {
        throw new BadRequestException('Permit already decided');
      }

      const updated = await tx.permit.update({
        where: { id },
        data: {
          status: dto.decision,
          decidedById: decidedBySub,
          aiClass: dto.aiClass ?? null,
          timeline: {
            create: {
              status: dto.decision,
              note: dto.note,
              officerName: dto.officerName,
            },
          },
        },
        include: { timeline: { orderBy: { at: 'asc' } } },
      });

      await this.outbox.enqueue(tx, {
        tenantId,
        topic: Topics.PermitDecided,
        partitionKey: id,
        payload: {
          permitId: id,
          decision: dto.decision,
          officerName: dto.officerName,
        },
      });

      return updated;
    });
  }
}
