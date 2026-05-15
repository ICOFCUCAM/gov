import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { ARCHETYPES, listArchetypes, type ArchetypeKey } from './archetypes';

/**
 * Institutional composition. Ministries are provisioned FROM archetype
 * blueprints, then governed as data: rename, merge, deactivate, add/remove
 * departments, toggle modules — all without touching platform code.
 */
@Injectable()
export class OrgService {
  constructor(private readonly prisma: PrismaService) {}

  archetypes() {
    return listArchetypes();
  }

  list(tenantId: string) {
    return this.prisma.ministry.findMany({
      where: { tenantId },
      orderBy: { createdAt: 'desc' },
      include: { departments: true, modules: true },
    });
  }

  get(tenantId: string, id: string) {
    return this.prisma.ministry
      .findFirst({
        where: { id, tenantId },
        include: { departments: true, modules: true },
      })
      .then(m => {
        if (!m) throw new NotFoundException('Ministry not found');
        return m;
      });
  }

  /** Instantiate a ministry from a blueprint: seeds departments + modules. */
  async create(
    tenantId: string,
    input: { archetype: ArchetypeKey; name: string; slug: string },
  ) {
    const blueprint = ARCHETYPES[input.archetype];
    if (!blueprint) throw new BadRequestException('Unknown archetype');
    const exists = await this.prisma.ministry.findFirst({
      where: { tenantId, slug: input.slug },
    });
    if (exists) throw new ConflictException('slug already used in this tenant');

    return this.prisma.ministry.create({
      data: {
        tenantId,
        slug: input.slug,
        name: input.name,
        archetype: input.archetype,
        status: 'ACTIVE',
        departments: {
          create: blueprint.defaultDepartments.map(name => ({ name })),
        },
        modules: {
          create: blueprint.defaultModules.map(moduleKey => ({
            moduleKey,
            enabled: true,
          })),
        },
      },
      include: { departments: true, modules: true },
    });
  }

  async rename(tenantId: string, id: string, name: string) {
    await this.get(tenantId, id);
    return this.prisma.ministry.update({ where: { id }, data: { name } });
  }

  async deactivate(tenantId: string, id: string) {
    await this.get(tenantId, id);
    return this.prisma.ministry.update({
      where: { id },
      data: { status: 'DEACTIVATED' },
    });
  }

  /** Merge source into target: departments/modules move, source MERGED. */
  async merge(tenantId: string, sourceId: string, targetId: string) {
    if (sourceId === targetId) {
      throw new BadRequestException('Cannot merge a ministry into itself');
    }
    const [source, target] = await Promise.all([
      this.get(tenantId, sourceId),
      this.get(tenantId, targetId),
    ]);
    if (source.status !== 'ACTIVE' || target.status !== 'ACTIVE') {
      throw new BadRequestException('Both ministries must be ACTIVE');
    }
    await this.prisma.$transaction([
      this.prisma.department.updateMany({
        where: { ministryId: sourceId },
        data: { ministryId: targetId },
      }),
      this.prisma.moduleActivation.updateMany({
        where: { ministryId: sourceId },
        data: { ministryId: targetId },
      }),
      this.prisma.ministry.update({
        where: { id: sourceId },
        data: { status: 'MERGED', mergedIntoId: targetId },
      }),
    ]);
    return this.get(tenantId, targetId);
  }

  // ── Departments ──────────────────────────────────────────────────
  async addDepartment(tenantId: string, ministryId: string, name: string) {
    await this.get(tenantId, ministryId);
    try {
      return await this.prisma.department.create({
        data: { ministryId, name },
      });
    } catch {
      throw new ConflictException('Department name already exists');
    }
  }

  async removeDepartment(tenantId: string, ministryId: string, deptId: string) {
    await this.get(tenantId, ministryId);
    const dept = await this.prisma.department.findFirst({
      where: { id: deptId, ministryId },
    });
    if (!dept) throw new NotFoundException('Department not found');
    await this.prisma.department.delete({ where: { id: deptId } });
    return { removed: deptId };
  }

  // ── Module activation ────────────────────────────────────────────
  async setModule(
    tenantId: string,
    ministryId: string,
    moduleKey: string,
    enabled: boolean,
  ) {
    await this.get(tenantId, ministryId);
    return this.prisma.moduleActivation.upsert({
      where: { ministryId_moduleKey: { ministryId, moduleKey } },
      update: { enabled },
      create: { ministryId, moduleKey, enabled },
    });
  }
}
