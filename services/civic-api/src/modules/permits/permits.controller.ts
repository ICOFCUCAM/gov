import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Req,
  UseGuards,
  BadRequestException,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { AuthGuard } from '../../common/auth.guard';
import {
  PermissionsGuard,
  RequirePermissions,
} from '../../common/permissions.guard';
import type { AuthenticatedRequest } from '../../common/request-context';
import { PermitsService } from './permits.service';
import {
  CreatePermitSchema,
  DecidePermitSchema,
} from './permits.dto';

@ApiTags('permits')
@ApiBearerAuth()
@UseGuards(AuthGuard, PermissionsGuard)
@Controller('permits')
export class PermitsController {
  constructor(private readonly permits: PermitsService) {}

  @Get()
  @RequirePermissions('permit:read')
  list(@Req() req: AuthenticatedRequest) {
    return this.permits.list(req.principal!.tenantId);
  }

  @Get(':id')
  @RequirePermissions('permit:read')
  get(@Req() req: AuthenticatedRequest, @Param('id') id: string) {
    return this.permits.get(req.principal!.tenantId, id);
  }

  @Post()
  @RequirePermissions('permit:create')
  create(@Req() req: AuthenticatedRequest, @Body() body: unknown) {
    const parsed = CreatePermitSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException(parsed.error.issues.map(i => i.message).join('; '));
    }
    return this.permits.create(req.principal!.tenantId, parsed.data);
  }

  @Post(':id/decide')
  @RequirePermissions('permit:decide')
  decide(
    @Req() req: AuthenticatedRequest,
    @Param('id') id: string,
    @Body() body: unknown,
  ) {
    const parsed = DecidePermitSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException(parsed.error.issues.map(i => i.message).join('; '));
    }
    return this.permits.decide(
      req.principal!.tenantId,
      id,
      req.principal!.sub,
      parsed.data,
    );
  }
}
