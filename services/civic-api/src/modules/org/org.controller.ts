import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
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
import { OrgService } from './org.service';
import { OperationsService } from './operations.service';

const ArchetypeEnum = z.enum([
  'HEALTH', 'EDUCATION', 'FINANCE', 'AGRICULTURE', 'ENERGY', 'TRANSPORT',
  'JUSTICE', 'ENVIRONMENT', 'INTERIOR', 'LABOR', 'TRADE', 'GENERIC',
]);
const CreateMinistry = z.object({
  archetype: ArchetypeEnum,
  name: z.string().min(3),
  slug: z.string().regex(/^[a-z0-9-]+$/),
});
const Rename = z.object({ name: z.string().min(3) });
const Merge = z.object({ targetId: z.string().min(1) });
const AddDept = z.object({ name: z.string().min(2) });
const SetModule = z.object({ moduleKey: z.string().min(2), enabled: z.boolean() });

function parse<T>(s: z.ZodSchema<T>, b: unknown): T {
  const r = s.safeParse(b);
  if (!r.success) {
    throw new BadRequestException(r.error.issues.map(i => i.message).join('; '));
  }
  return r.data;
}

@ApiTags('org')
@ApiBearerAuth()
@UseGuards(AuthGuard, PermissionsGuard)
@Controller('org')
export class OrgController {
  constructor(
    private readonly org: OrgService,
    private readonly opsSvc: OperationsService,
  ) {}

  @Get('archetypes')
  @RequirePermissions('org:read')
  archetypes() {
    return this.org.archetypes();
  }

  @Get('ministries')
  @RequirePermissions('org:read')
  list(@Req() req: AuthenticatedRequest) {
    return this.org.list(req.principal!.tenantId);
  }

  @Get('ministries/:id')
  @RequirePermissions('org:read')
  get(@Req() req: AuthenticatedRequest, @Param('id') id: string) {
    return this.org.get(req.principal!.tenantId, id);
  }

  @Get('ministries/:id/operations')
  @RequirePermissions('org:read')
  operations(@Req() req: AuthenticatedRequest, @Param('id') id: string) {
    return this.opsSvc.forMinistry(req.principal!.tenantId, id);
  }

  @Post('ministries')
  @RequirePermissions('org:admin')
  create(@Req() req: AuthenticatedRequest, @Body() body: unknown) {
    return this.org.create(req.principal!.tenantId, parse(CreateMinistry, body));
  }

  @Post('ministries/:id/rename')
  @RequirePermissions('org:admin')
  rename(
    @Req() req: AuthenticatedRequest,
    @Param('id') id: string,
    @Body() body: unknown,
  ) {
    return this.org.rename(
      req.principal!.tenantId,
      id,
      parse(Rename, body).name,
    );
  }

  @Post('ministries/:id/deactivate')
  @RequirePermissions('org:admin')
  deactivate(@Req() req: AuthenticatedRequest, @Param('id') id: string) {
    return this.org.deactivate(req.principal!.tenantId, id);
  }

  @Post('ministries/:id/merge')
  @RequirePermissions('org:admin')
  merge(
    @Req() req: AuthenticatedRequest,
    @Param('id') id: string,
    @Body() body: unknown,
  ) {
    return this.org.merge(
      req.principal!.tenantId,
      id,
      parse(Merge, body).targetId,
    );
  }

  @Post('ministries/:id/departments')
  @RequirePermissions('org:configure')
  addDept(
    @Req() req: AuthenticatedRequest,
    @Param('id') id: string,
    @Body() body: unknown,
  ) {
    return this.org.addDepartment(
      req.principal!.tenantId,
      id,
      parse(AddDept, body).name,
    );
  }

  @Delete('ministries/:id/departments/:deptId')
  @RequirePermissions('org:configure')
  removeDept(
    @Req() req: AuthenticatedRequest,
    @Param('id') id: string,
    @Param('deptId') deptId: string,
  ) {
    return this.org.removeDepartment(req.principal!.tenantId, id, deptId);
  }

  @Post('ministries/:id/modules')
  @RequirePermissions('org:configure')
  setModule(
    @Req() req: AuthenticatedRequest,
    @Param('id') id: string,
    @Body() body: unknown,
  ) {
    const d = parse(SetModule, body);
    return this.org.setModule(
      req.principal!.tenantId,
      id,
      d.moduleKey,
      d.enabled,
    );
  }
}
