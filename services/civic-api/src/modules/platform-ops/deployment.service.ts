import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

type State =
  | 'PENDING'
  | 'PRECHECK'
  | 'ROLLOUT'
  | 'VERIFY'
  | 'COMPLETED'
  | 'ROLLED_BACK';

interface Gate {
  at: string;
  gate: string;
  result: 'pass' | 'fail';
  by: string;
  note?: string;
}

/**
 * Deployment orchestration as an explicit, gated state machine:
 *
 *   PENDING → PRECHECK → ROLLOUT → VERIFY → COMPLETED
 *   (any active state) → ROLLED_BACK
 *
 * Each advance records a verification gate result. A failed gate or an
 * operator decision rolls the deployment back — reversible by construction.
 */
@Injectable()
export class DeploymentService {
  constructor(private readonly prisma: PrismaService) {}

  private readonly forward: Record<State, State | null> = {
    PENDING: 'PRECHECK',
    PRECHECK: 'ROLLOUT',
    ROLLOUT: 'VERIFY',
    VERIFY: 'COMPLETED',
    COMPLETED: null,
    ROLLED_BACK: null,
  };

  list(tenantId: string) {
    return this.prisma.deployment.findMany({
      where: { tenantId },
      orderBy: { startedAt: 'desc' },
    });
  }

  async start(
    tenantId: string,
    releaseId: string,
    strategy: 'ROLLING' | 'CANARY' | 'BLUE_GREEN',
  ) {
    const release = await this.prisma.release.findUnique({
      where: { id: releaseId },
    });
    if (!release) throw new NotFoundException('Release not found');
    if (release.status !== 'AVAILABLE') {
      throw new BadRequestException('Release is not AVAILABLE');
    }
    return this.prisma.deployment.create({
      data: { tenantId, releaseId, strategy, state: 'PENDING', gates: [] },
    });
  }

  async advance(
    tenantId: string,
    id: string,
    by: string,
    gateResult: 'pass' | 'fail',
    note?: string,
  ) {
    const dep = await this.prisma.deployment.findFirst({
      where: { id, tenantId },
    });
    if (!dep) throw new NotFoundException('Deployment not found');
    if (dep.state === 'COMPLETED' || dep.state === 'ROLLED_BACK') {
      throw new BadRequestException(`Deployment is ${dep.state}`);
    }
    const gates = [...((dep.gates as unknown as Gate[]) ?? [])];
    const current = dep.state as State;

    if (gateResult === 'fail') {
      gates.push({
        at: new Date().toISOString(),
        gate: current,
        result: 'fail',
        by,
        note,
      });
      return this.prisma.deployment.update({
        where: { id },
        data: {
          state: 'ROLLED_BACK',
          gates: gates as unknown as Prisma.InputJsonValue,
          completedAt: new Date(),
        },
      });
    }

    const next = this.forward[current];
    if (!next) throw new BadRequestException('No forward transition');
    gates.push({
      at: new Date().toISOString(),
      gate: current,
      result: 'pass',
      by,
      note,
    });
    return this.prisma.deployment.update({
      where: { id },
      data: {
        state: next,
        gates: gates as unknown as Prisma.InputJsonValue,
        completedAt: next === 'COMPLETED' ? new Date() : null,
      },
    });
  }

  async rollback(tenantId: string, id: string, by: string, note: string) {
    const dep = await this.prisma.deployment.findFirst({
      where: { id, tenantId },
    });
    if (!dep) throw new NotFoundException('Deployment not found');
    if (dep.state === 'COMPLETED' || dep.state === 'ROLLED_BACK') {
      throw new BadRequestException(`Deployment is ${dep.state}`);
    }
    const gates = [...((dep.gates as unknown as Gate[]) ?? [])];
    gates.push({
      at: new Date().toISOString(),
      gate: dep.state,
      result: 'fail',
      by,
      note: `rollback: ${note}`,
    });
    return this.prisma.deployment.update({
      where: { id },
      data: { state: 'ROLLED_BACK', gates: gates as unknown as Prisma.InputJsonValue, completedAt: new Date() },
    });
  }
}
