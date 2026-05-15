import { Controller, Get, Req, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { AuthGuard } from '../../common/auth.guard';
import {
  PermissionsGuard,
  RequirePermissions,
} from '../../common/permissions.guard';
import type { AuthenticatedRequest } from '../../common/request-context';
import { AuditService } from './audit.service';

@ApiTags('audit')
@ApiBearerAuth()
@UseGuards(AuthGuard, PermissionsGuard)
@Controller('audit')
export class AuditController {
  constructor(private readonly audit: AuditService) {}

  @Get('events')
  @RequirePermissions('audit:read')
  events(@Req() req: AuthenticatedRequest) {
    return this.audit.list(req.principal!.tenantId);
  }

  @Get('verify')
  @RequirePermissions('audit:read')
  verify(@Req() req: AuthenticatedRequest) {
    return this.audit.verifyChain(req.principal!.tenantId);
  }
}
