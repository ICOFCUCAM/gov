import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { sha256 } from '../../common/hash';

/**
 * Tenant-aware backup metadata. The platform records WHERE an encrypted
 * snapshot lives in the sovereign object store and an integrity hash — it
 * does not store bytes in the DB. Restore is an explicit, audited operation
 * that flips the backup to RESTORING; the actual data move is performed by
 * the sovereign storage layer.
 */
@Injectable()
export class BackupService {
  constructor(private readonly prisma: PrismaService) {}

  list(tenantId: string) {
    return this.prisma.backupRecord.findMany({
      where: { tenantId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async create(tenantId: string, kind: 'FULL' | 'INCREMENTAL') {
    const ts = Date.now();
    return this.prisma.backupRecord.create({
      data: {
        tenantId,
        kind,
        status: 'PENDING',
        encrypted: true,
        location: `sov://backups/${tenantId}/${kind.toLowerCase()}-${ts}.enc`,
      },
    });
  }

  /** The storage layer calls back when the snapshot is durable. */
  async complete(tenantId: string, id: string, sizeBytes: number) {
    const b = await this.prisma.backupRecord.findFirst({
      where: { id, tenantId },
    });
    if (!b) throw new NotFoundException('Backup not found');
    return this.prisma.backupRecord.update({
      where: { id },
      data: {
        status: 'COMPLETED',
        sizeBytes: BigInt(sizeBytes),
        contentHash: sha256(`${b.location}:${sizeBytes}`),
        completedAt: new Date(),
      },
    });
  }

  async restore(tenantId: string, id: string) {
    const b = await this.prisma.backupRecord.findFirst({
      where: { id, tenantId },
    });
    if (!b) throw new NotFoundException('Backup not found');
    if (b.status !== 'COMPLETED') {
      throw new BadRequestException('Only COMPLETED backups can be restored');
    }
    return this.prisma.backupRecord.update({
      where: { id },
      data: { status: 'RESTORING' },
    });
  }
}
