import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { sha256 } from './hash';
import type { AuthenticatedRequest, Principal } from './request-context';

/**
 * Integration authentication. External systems present `x-api-key`. The key
 * is hashed and matched to an APPROVED IntegrationClient; the client's
 * granted scopes become the principal's permissions, tenant-scoped, with
 * actorType 'agent' so the audit trail distinguishes machine callers.
 *
 * Default deny: unknown, pending, suspended, or revoked clients are rejected.
 */
@Injectable()
export class ApiKeyGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const key = req.header('x-api-key');
    if (!key) throw new UnauthorizedException('Missing x-api-key');

    const client = await this.prisma.integrationClient.findFirst({
      where: { keyHash: sha256(key) },
      select: {
        id: true,
        tenantId: true,
        name: true,
        status: true,
        scopes: true,
      },
    });
    if (!client) throw new UnauthorizedException('Unknown API key');
    if (client.status !== 'APPROVED') {
      throw new ForbiddenException(
        `Integration is ${client.status.toLowerCase()} — not authorised`,
      );
    }

    const principal: Principal = {
      sub: `integration:${client.id}`,
      tenantId: client.tenantId,
      displayName: client.name,
      roles: ['integration'],
      permissions: client.scopes,
      actorType: 'agent',
    };
    req.principal = principal;
    return true;
  }
}
