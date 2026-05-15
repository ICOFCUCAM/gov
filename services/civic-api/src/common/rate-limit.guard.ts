import {
  CanActivate,
  ExecutionContext,
  Injectable,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import type { AuthenticatedRequest } from './request-context';

interface Bucket {
  tokens: number;
  resetAt: number;
}

/**
 * Per-principal sliding-window rate limit. In-memory token bucket keyed by
 * principal (API key / user) — sufficient for a single replica or sticky
 * routing. Production swaps the store for Redis (same interface) so the
 * limit is shared across replicas. Fails OPEN if no principal (other guards
 * handle auth); never blocks health/metrics.
 */
@Injectable()
export class RateLimitGuard implements CanActivate {
  private readonly buckets = new Map<string, Bucket>();
  private readonly windowMs = 60_000;
  private readonly defaultRpm = Number(process.env.CIVIC_RATE_RPM ?? 600);

  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const res = context
      .switchToHttp()
      .getResponse<{ setHeader: (k: string, v: string | number) => void }>();

    const path = req.path ?? '';
    // Never throttle health/metrics — they must answer during incidents.
    if (path.includes('/health') || path.endsWith('/metrics')) return true;

    // Global guard runs before route auth, so key by IP here (real edge
    // DoS protection). Per-principal limits layer on at the route level.
    const key = req.principal?.sub ?? `ip:${req.ip ?? 'unknown'}`;
    const limit = this.defaultRpm;
    const now = Date.now();
    let b = this.buckets.get(key);
    if (!b || b.resetAt <= now) {
      b = { tokens: limit, resetAt: now + this.windowMs };
      this.buckets.set(key, b);
    }

    res.setHeader('X-RateLimit-Limit', limit);
    res.setHeader('X-RateLimit-Remaining', Math.max(0, b.tokens - 1));
    res.setHeader('X-RateLimit-Reset', Math.ceil(b.resetAt / 1000));

    if (b.tokens <= 0) {
      throw new HttpException(
        'Rate limit exceeded. Slow down and retry after the reset window.',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
    b.tokens -= 1;
    return true;
  }
}
