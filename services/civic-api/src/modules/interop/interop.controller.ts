import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  Req,
  UseGuards,
  BadRequestException,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { z } from 'zod';
import { AuthGuard } from '../../common/auth.guard';
import {
  PermissionsGuard,
  RequirePermissions,
} from '../../common/permissions.guard';
import type { AuthenticatedRequest } from '../../common/request-context';
import { IntegrationService } from './integration.service';
import { FederationService } from './federation.service';
import { WebhookService } from './webhook.service';

const RegisterIntegration = z.object({
  kind: z.enum(['INTEGRATION', 'EXTENSION']),
  name: z.string().min(3),
  ownerOrg: z.string().min(2),
  contact: z.string().min(3),
  scopes: z.array(z.string()).min(1),
});
const ProposeGrant = z.object({
  toTenantId: z.string().min(1),
  scopes: z.array(z.string()).min(1),
  reason: z.string().min(3),
  expiresAt: z.string().optional(),
});
const Subscribe = z.object({
  topic: z.string().min(1),
  url: z.string().url(),
});

function parse<T>(schema: z.ZodSchema<T>, body: unknown): T {
  const r = schema.safeParse(body);
  if (!r.success) {
    throw new BadRequestException(r.error.issues.map(i => i.message).join('; '));
  }
  return r.data;
}

@ApiTags('interop')
@ApiBearerAuth()
@UseGuards(AuthGuard, PermissionsGuard)
@Controller()
export class InteropController {
  constructor(
    private readonly integrations: IntegrationService,
    private readonly federation: FederationService,
    private readonly webhooks: WebhookService,
  ) {}

  // ── Integrations ─────────────────────────────────────────────────
  @Get('integrations')
  @RequirePermissions('integration:read')
  listIntegrations(@Req() req: AuthenticatedRequest) {
    return this.integrations.list(req.principal!.tenantId);
  }

  @Post('integrations')
  @RequirePermissions('integration:register')
  register(@Req() req: AuthenticatedRequest, @Body() body: unknown) {
    return this.integrations.register(
      req.principal!.tenantId,
      parse(RegisterIntegration, body),
    );
  }

  @Post('integrations/:id/approve')
  @RequirePermissions('integration:approve')
  approve(@Req() req: AuthenticatedRequest, @Param('id') id: string) {
    return this.integrations.setStatus(
      req.principal!.tenantId,
      id,
      'APPROVED',
      req.principal!.sub,
    );
  }

  @Post('integrations/:id/revoke')
  @RequirePermissions('integration:approve')
  revoke(@Req() req: AuthenticatedRequest, @Param('id') id: string) {
    return this.integrations.setStatus(
      req.principal!.tenantId,
      id,
      'REVOKED',
      req.principal!.sub,
    );
  }

  // ── Federation ───────────────────────────────────────────────────
  @Get('federation/grants')
  @RequirePermissions('federation:read')
  grants(@Req() req: AuthenticatedRequest) {
    return this.federation.listForTenant(req.principal!.tenantId);
  }

  @Post('federation/propose')
  @RequirePermissions('federation:propose')
  propose(@Req() req: AuthenticatedRequest, @Body() body: unknown) {
    const dto = parse(ProposeGrant, body);
    return this.federation.propose({
      fromTenantId: req.principal!.tenantId,
      ...dto,
    });
  }

  @Post('federation/grants/:id/approve')
  @RequirePermissions('federation:approve')
  approveGrant(@Req() req: AuthenticatedRequest, @Param('id') id: string) {
    return this.federation.setStatus(id, 'APPROVED', req.principal!.sub);
  }

  @Post('federation/grants/:id/revoke')
  @RequirePermissions('federation:approve')
  revokeGrant(@Req() req: AuthenticatedRequest, @Param('id') id: string) {
    return this.federation.setStatus(id, 'REVOKED', req.principal!.sub);
  }

  /** Live policy check — proves the default-deny rule. */
  @Get('federation/check')
  @RequirePermissions('federation:read')
  check(
    @Req() req: AuthenticatedRequest,
    @Query('to') to: string,
    @Query('scope') scope: string,
  ) {
    if (!to || !scope) {
      throw new BadRequestException('to and scope query params required');
    }
    return this.federation.assertAccess(req.principal!.tenantId, to, scope);
  }

  // ── Webhooks ─────────────────────────────────────────────────────
  @Get('webhooks')
  @RequirePermissions('webhook:read')
  listWebhooks(@Req() req: AuthenticatedRequest) {
    return this.webhooks.list(req.principal!.tenantId);
  }

  @Post('webhooks')
  @RequirePermissions('webhook:manage')
  subscribe(@Req() req: AuthenticatedRequest, @Body() body: unknown) {
    return this.webhooks.subscribe(
      req.principal!.tenantId,
      parse(Subscribe, body),
    );
  }

  @Post('webhooks/:id/pause')
  @RequirePermissions('webhook:manage')
  pause(@Req() req: AuthenticatedRequest, @Param('id') id: string) {
    return this.webhooks.setStatus(req.principal!.tenantId, id, 'PAUSED');
  }
}
