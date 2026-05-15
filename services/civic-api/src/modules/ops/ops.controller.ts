import {
  Body,
  Controller,
  Get,
  Post,
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
import { OpsService } from './ops.service';

const CreateIncidentSchema = z.object({
  severity: z.enum(['SEV1', 'SEV2', 'SEV3', 'SEV4']),
  title: z.string().min(3),
  scope: z.string().min(1),
});

@ApiTags('ops')
@ApiBearerAuth()
@UseGuards(AuthGuard, PermissionsGuard)
@Controller('ops')
export class OpsController {
  constructor(private readonly ops: OpsService) {}

  @Get('overview')
  @RequirePermissions('ops:read')
  overview(@Req() req: AuthenticatedRequest) {
    return this.ops.overview(req.principal!.tenantId);
  }

  @Get('incidents')
  @RequirePermissions('ops:read')
  incidents(@Req() req: AuthenticatedRequest) {
    return this.ops.listIncidents(req.principal!.tenantId);
  }

  @Post('incidents')
  @RequirePermissions('ops:incident')
  create(@Req() req: AuthenticatedRequest, @Body() body: unknown) {
    const parsed = CreateIncidentSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException(
        parsed.error.issues.map(i => i.message).join('; '),
      );
    }
    return this.ops.createIncident(
      req.principal!.tenantId,
      req.principal!.sub,
      parsed.data,
    );
  }
}
