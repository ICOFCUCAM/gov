import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { randomBytes } from 'node:crypto';
import { PrismaService } from '../../prisma/prisma.service';
import { sha256 } from '../../common/hash';

/**
 * Integration client registry. Onboarding is a controlled, human-approved
 * workflow: register -> PENDING -> a ministry operator APPROVES -> usable.
 * The raw API key is returned exactly once (only its hash is stored).
 */
@Injectable()
export class IntegrationService {
  constructor(private readonly prisma: PrismaService) {}

  list(tenantId: string) {
    return this.prisma.integrationClient.findMany({
      where: { tenantId },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        kind: true,
        name: true,
        ownerOrg: true,
        contact: true,
        scopes: true,
        status: true,
        rateLimitRpm: true,
        createdAt: true,
        approvedAt: true,
        approvedBy: true,
      },
    });
  }

  async register(
    tenantId: string,
    input: {
      kind: 'INTEGRATION' | 'EXTENSION';
      name: string;
      ownerOrg: string;
      contact: string;
      scopes: string[];
    },
  ) {
    const existing = await this.prisma.integrationClient.findFirst({
      where: { tenantId, name: input.name },
      select: { id: true },
    });
    if (existing) throw new ConflictException('Name already registered');

    const rawKey = `civ_${randomBytes(24).toString('base64url')}`;
    const client = await this.prisma.integrationClient.create({
      data: {
        tenantId,
        kind: input.kind,
        name: input.name,
        ownerOrg: input.ownerOrg,
        contact: input.contact,
        scopes: input.scopes,
        keyHash: sha256(rawKey),
        status: 'PENDING',
      },
    });
    // The raw key is shown ONCE. It is never persisted or logged.
    return {
      id: client.id,
      status: client.status,
      apiKey: rawKey,
      note: 'Store this key now — it is not recoverable. The integration is PENDING until a ministry operator approves it.',
    };
  }

  async setStatus(
    tenantId: string,
    id: string,
    status: 'APPROVED' | 'SUSPENDED' | 'REVOKED',
    by: string,
  ) {
    const client = await this.prisma.integrationClient.findFirst({
      where: { id, tenantId },
    });
    if (!client) throw new NotFoundException('Integration not found');
    return this.prisma.integrationClient.update({
      where: { id },
      data: {
        status,
        approvedBy: status === 'APPROVED' ? by : client.approvedBy,
        approvedAt: status === 'APPROVED' ? new Date() : client.approvedAt,
      },
      select: { id: true, name: true, status: true, approvedBy: true },
    });
  }
}
