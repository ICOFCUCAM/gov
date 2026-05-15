import {
  Body,
  Controller,
  Get,
  Post,
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
import { TenancyService } from './tenancy.service';

const ProvisionSchema = z.object({
  slug: z.string().min(2).regex(/^[a-z0-9-]+$/),
  name: z.string().min(2),
  kind: z.enum(['MUNICIPALITY', 'MINISTRY', 'AGENCY', 'REGION', 'NATIONAL']),
  country: z.string().min(2),
  officialLangs: z.array(z.string()).default([]),
  parentSlug: z.string().optional(),
  inclusionFloor: z.object({
    ussd: z.boolean(),
    ivr: z.boolean(),
    agentNetwork: z.boolean(),
    walkIn: z.boolean(),
  }),
  constitutionalOfficerSignoff: z.boolean(),
});

@ApiTags('tenancy')
@ApiBearerAuth()
@UseGuards(AuthGuard, PermissionsGuard)
@Controller('tenancy')
export class TenancyController {
  constructor(private readonly tenancy: TenancyService) {}

  @Get('tenants')
  @RequirePermissions('tenant:read')
  list() {
    return this.tenancy.list();
  }

  @Post('provision')
  @RequirePermissions('tenant:provision')
  provision(@Body() body: unknown) {
    const parsed = ProvisionSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException(parsed.error.issues.map(i => i.message).join('; '));
    }
    return this.tenancy.provision(parsed.data);
  }
}
