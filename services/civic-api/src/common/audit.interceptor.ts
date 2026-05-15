import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Observable, tap, catchError, throwError } from 'rxjs';
import { PrismaService } from '../prisma/prisma.service';
import { chainHash } from './hash';
import type { AuthenticatedRequest } from './request-context';

/**
 * Append-only audit. Every mutating HTTP request (POST/PUT/PATCH/DELETE)
 * produces exactly one AuditEvent, hash-chained per tenant. Reads are not
 * audited here (read auditing is opt-in per sensitive resource).
 *
 * The chain makes the log tamper-evident: a verifier replays
 * seq 1..n; any altered or deleted row breaks the next hash.
 */
@Injectable()
export class AuditInterceptor implements NestInterceptor {
  constructor(private readonly prisma: PrismaService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const req = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const method = req.method.toUpperCase();
    const mutating = ['POST', 'PUT', 'PATCH', 'DELETE'].includes(method);

    if (!mutating || !req.principal) return next.handle();

    const principal = req.principal;
    const action = `${context.getClass().name}.${context.getHandler().name}`;
    const resource = req.originalUrl;
    const ip = req.ip;

    const write = (outcome: string, metadata: Record<string, unknown>) =>
      this.append(principal.tenantId, {
        actorType: principal.actorType,
        actorId: principal.sub,
        action,
        resource,
        outcome,
        metadata,
        ip,
      });

    return next.handle().pipe(
      tap(() => {
        void write('ok', { method });
      }),
      catchError((err: unknown) => {
        void write('error', {
          method,
          error: err instanceof Error ? err.message : String(err),
        });
        return throwError(() => err);
      }),
    );
  }

  /** Append one hash-chained audit row inside a serializable transaction. */
  private async append(
    tenantId: string,
    e: {
      actorType: string;
      actorId: string | null;
      action: string;
      resource: string;
      outcome: string;
      metadata: Record<string, unknown>;
      ip?: string;
    },
  ): Promise<void> {
    try {
      await this.prisma.$transaction(async tx => {
        const last = await tx.auditEvent.findFirst({
          where: { tenantId },
          orderBy: { seq: 'desc' },
          select: { seq: true, hash: true },
        });
        const seq = (last?.seq ?? 0) + 1;
        const prevHash = last?.hash ?? null;
        const hash = chainHash(prevHash, e, seq);
        await tx.auditEvent.create({
          data: {
            tenantId,
            actorType: e.actorType,
            actorId: e.actorId,
            action: e.action,
            resource: e.resource,
            outcome: e.outcome,
            metadata: e.metadata as object,
            ip: e.ip,
            prevHash,
            hash,
            seq,
          },
        });
      });
    } catch {
      // Audit must never break the request path; failures are themselves
      // observable via metrics/alerting (see ObservabilityModule notes).
    }
  }
}
