import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

type Channel = 'DEV' | 'STAGING' | 'STABLE';

/**
 * Release governance. A release is created in DEV and promoted through
 * staged channels. Promotion to STABLE requires an explicit operator
 * approval (named) — controlled operational evolution, never automatic.
 */
@Injectable()
export class ReleaseService {
  constructor(private readonly prisma: PrismaService) {}

  list() {
    return this.prisma.release.findMany({ orderBy: { createdAt: 'desc' } });
  }

  async create(input: {
    version: string;
    notes: string;
    schemaMigration?: string;
  }) {
    const exists = await this.prisma.release.findFirst({
      where: { version: input.version, channel: 'DEV' },
    });
    if (exists) throw new ConflictException('Version already in DEV');
    return this.prisma.release.create({
      data: {
        version: input.version,
        notes: input.notes,
        schemaMigration: input.schemaMigration ?? null,
        channel: 'DEV',
        status: 'AVAILABLE',
      },
    });
  }

  private readonly next: Record<Channel, Channel | null> = {
    DEV: 'STAGING',
    STAGING: 'STABLE',
    STABLE: null,
  };

  async promote(id: string, by: string) {
    const rel = await this.prisma.release.findUnique({ where: { id } });
    if (!rel) throw new NotFoundException('Release not found');
    const target = this.next[rel.channel as Channel];
    if (!target) throw new BadRequestException('Already at STABLE');
    // STABLE is the approval gate.
    return this.prisma.release.update({
      where: { id },
      data: {
        channel: target,
        status: 'AVAILABLE',
        approvedBy: target === 'STABLE' ? by : rel.approvedBy,
        approvedAt: target === 'STABLE' ? new Date() : rel.approvedAt,
      },
    });
  }
}
