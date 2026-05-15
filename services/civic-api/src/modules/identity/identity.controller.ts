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
import { IdentityService } from './identity.service';

const UpsertCitizenSchema = z.object({
  subject: z.string().min(1),
  displayName: z.string().min(1),
  preferredLocale: z.string().default('en'),
});

@ApiTags('identity')
@ApiBearerAuth()
@UseGuards(AuthGuard, PermissionsGuard)
@Controller('identity')
export class IdentityController {
  constructor(private readonly identity: IdentityService) {}

  @Get('citizens')
  @RequirePermissions('citizen:read')
  list(@Req() req: AuthenticatedRequest) {
    return this.identity.list(req.principal!.tenantId);
  }

  @Post('citizens')
  @RequirePermissions('citizen:write')
  upsert(@Req() req: AuthenticatedRequest, @Body() body: unknown) {
    const parsed = UpsertCitizenSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException(parsed.error.issues.map(i => i.message).join('; '));
    }
    return this.identity.upsertCitizen(
      req.principal!.tenantId,
      parsed.data.subject,
      parsed.data.displayName,
      parsed.data.preferredLocale,
    );
  }
}
