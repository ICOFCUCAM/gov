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
import { ReleaseService } from './release.service';
import { DeploymentService } from './deployment.service';
import { TenantLifecycleService } from './tenant-lifecycle.service';
import { BackupService } from './backup.service';
import { ConfigService } from './config.service';

const CreateRelease = z.object({
  version: z.string().regex(/^\d+\.\d+\.\d+$/),
  notes: z.string().min(3),
  schemaMigration: z.string().optional(),
});
const StartDeploy = z.object({
  releaseId: z.string().min(1),
  strategy: z.enum(['ROLLING', 'CANARY', 'BLUE_GREEN']),
});
const Advance = z.object({
  gateResult: z.enum(['pass', 'fail']),
  note: z.string().optional(),
});
const Transition = z.object({
  to: z.enum(['ACTIVE', 'SUSPENDED', 'DECOMMISSIONED', 'PROVISIONING']),
  reason: z.string().min(3),
});
const Backup = z.object({ kind: z.enum(['FULL', 'INCREMENTAL']) });
const PublishConfig = z.object({
  scope: z.enum(['GLOBAL', 'TENANT']),
  payload: z.record(z.unknown()),
});

function parse<T>(s: z.ZodSchema<T>, b: unknown): T {
  const r = s.safeParse(b);
  if (!r.success) {
    throw new BadRequestException(r.error.issues.map(i => i.message).join('; '));
  }
  return r.data;
}

@ApiTags('platform-ops')
@ApiBearerAuth()
@UseGuards(AuthGuard, PermissionsGuard)
@Controller('platform')
export class PlatformOpsController {
  constructor(
    private readonly releases: ReleaseService,
    private readonly deployments: DeploymentService,
    private readonly lifecycle: TenantLifecycleService,
    private readonly backups: BackupService,
    private readonly config: ConfigService,
  ) {}

  // ── Releases ─────────────────────────────────────────────────────
  @Get('releases')
  @RequirePermissions('platform:release')
  listReleases() {
    return this.releases.list();
  }

  @Post('releases')
  @RequirePermissions('platform:release')
  createRelease(@Body() body: unknown) {
    return this.releases.create(parse(CreateRelease, body));
  }

  @Post('releases/:id/promote')
  @RequirePermissions('platform:release')
  promote(@Req() req: AuthenticatedRequest, @Param('id') id: string) {
    return this.releases.promote(id, req.principal!.sub);
  }

  // ── Deployments ──────────────────────────────────────────────────
  @Get('deployments')
  @RequirePermissions('platform:deploy')
  listDeployments(@Req() req: AuthenticatedRequest) {
    return this.deployments.list(req.principal!.tenantId);
  }

  @Post('deployments')
  @RequirePermissions('platform:deploy')
  startDeploy(@Req() req: AuthenticatedRequest, @Body() body: unknown) {
    const d = parse(StartDeploy, body);
    return this.deployments.start(
      req.principal!.tenantId,
      d.releaseId,
      d.strategy,
    );
  }

  @Post('deployments/:id/advance')
  @RequirePermissions('platform:deploy')
  advance(
    @Req() req: AuthenticatedRequest,
    @Param('id') id: string,
    @Body() body: unknown,
  ) {
    const d = parse(Advance, body);
    return this.deployments.advance(
      req.principal!.tenantId,
      id,
      req.principal!.sub,
      d.gateResult,
      d.note,
    );
  }

  @Post('deployments/:id/rollback')
  @RequirePermissions('platform:deploy')
  rollback(
    @Req() req: AuthenticatedRequest,
    @Param('id') id: string,
    @Body() body: unknown,
  ) {
    const note = (body as { note?: string })?.note ?? 'operator rollback';
    return this.deployments.rollback(
      req.principal!.tenantId,
      id,
      req.principal!.sub,
      note,
    );
  }

  // ── Tenant lifecycle ─────────────────────────────────────────────
  @Get('tenants/:id/lifecycle')
  @RequirePermissions('tenant:lifecycle')
  history(@Param('id') id: string) {
    return this.lifecycle.history(id);
  }

  @Post('tenants/:id/transition')
  @RequirePermissions('tenant:lifecycle')
  transition(
    @Req() req: AuthenticatedRequest,
    @Param('id') id: string,
    @Body() body: unknown,
  ) {
    const d = parse(Transition, body);
    return this.lifecycle.transition(id, d.to, d.reason, req.principal!.sub);
  }

  // ── Backups ──────────────────────────────────────────────────────
  @Get('backups')
  @RequirePermissions('backup:manage')
  listBackups(@Req() req: AuthenticatedRequest) {
    return this.backups.list(req.principal!.tenantId);
  }

  @Post('backups')
  @RequirePermissions('backup:manage')
  createBackup(@Req() req: AuthenticatedRequest, @Body() body: unknown) {
    return this.backups.create(
      req.principal!.tenantId,
      parse(Backup, body).kind,
    );
  }

  @Post('backups/:id/restore')
  @RequirePermissions('backup:manage')
  restore(@Req() req: AuthenticatedRequest, @Param('id') id: string) {
    return this.backups.restore(req.principal!.tenantId, id);
  }

  // ── Config / policy ──────────────────────────────────────────────
  @Get('config')
  @RequirePermissions('config:manage')
  listConfig(
    @Req() req: AuthenticatedRequest,
    @Query('scope') scope: 'GLOBAL' | 'TENANT' = 'GLOBAL',
  ) {
    return this.config.list(
      scope,
      scope === 'TENANT' ? req.principal!.tenantId : undefined,
    );
  }

  @Post('config')
  @RequirePermissions('config:manage')
  publishConfig(@Req() req: AuthenticatedRequest, @Body() body: unknown) {
    const d = parse(PublishConfig, body);
    return this.config.publish(
      d.scope,
      d.scope === 'TENANT' ? req.principal!.tenantId : null,
      d.payload,
    );
  }

  @Post('config/:id/sign')
  @RequirePermissions('config:manage')
  signConfig(@Req() req: AuthenticatedRequest, @Param('id') id: string) {
    return this.config.sign(id, req.principal!.sub);
  }

  @Post('config/:id/apply')
  @RequirePermissions('config:manage')
  applyConfig(@Param('id') id: string) {
    return this.config.apply(id);
  }

  @Get('config/drift')
  @RequirePermissions('config:manage')
  drift(
    @Req() req: AuthenticatedRequest,
    @Query('scope') scope: 'GLOBAL' | 'TENANT' = 'GLOBAL',
  ) {
    return this.config.drift(
      scope,
      scope === 'TENANT' ? req.principal!.tenantId : null,
    );
  }
}
