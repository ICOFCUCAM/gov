import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Observable, tap } from 'rxjs';
import {
  Counter,
  Histogram,
  Registry,
  collectDefaultMetrics,
} from 'prom-client';
import type { AuthenticatedRequest } from './request-context';

/**
 * Sovereign-safe observability. Prometheus metrics with bounded, low-card
 * labels only: method, route template, status, tenant. NEVER citizen
 * identifiers, names, or free-form paths (cardinality + privacy).
 */
export const registry = new Registry();
collectDefaultMetrics({ register: registry });

export const httpRequests = new Counter({
  name: 'civicos_http_requests_total',
  help: 'HTTP requests by method, route, status, tenant',
  labelNames: ['method', 'route', 'status', 'tenant'],
  registers: [registry],
});

export const httpLatency = new Histogram({
  name: 'civicos_http_request_duration_seconds',
  help: 'HTTP request duration in seconds',
  labelNames: ['method', 'route', 'status'],
  buckets: [0.01, 0.05, 0.1, 0.25, 0.5, 1, 2, 5],
  registers: [registry],
});

@Injectable()
export class MetricsInterceptor implements NestInterceptor {
  intercept(ctx: ExecutionContext, next: CallHandler): Observable<unknown> {
    const req = ctx.switchToHttp().getRequest<AuthenticatedRequest>();
    const res = ctx.switchToHttp().getResponse<{ statusCode: number }>();
    const route =
      (req.route as { path?: string } | undefined)?.path ?? 'unmatched';
    const tenant = req.principal?.tenantId ?? 'anon';
    const end = httpLatency.startTimer({ method: req.method, route });
    return next.handle().pipe(
      tap({
        next: () => {
          const status = String(res.statusCode);
          httpRequests.inc({ method: req.method, route, status, tenant });
          end({ status });
        },
        error: () => {
          httpRequests.inc({
            method: req.method,
            route,
            status: '500',
            tenant,
          });
          end({ status: '500' });
        },
      }),
    );
  }
}
