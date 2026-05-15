import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
  SetMetadata,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Observable, tap } from 'rxjs';

export const API_VERSION = 'v1';
const DEPRECATED_KEY = 'civic:deprecated';

/**
 * Mark a handler/controller deprecated with an RFC 8594 sunset date.
 * @Deprecated('2027-01-01') -> emits Deprecation + Sunset headers so
 * integrators learn of removal long before it happens (contract discipline).
 */
export const Deprecated = (sunsetISO: string) =>
  SetMetadata(DEPRECATED_KEY, sunsetISO);

@Injectable()
export class VersionHeaderInterceptor implements NestInterceptor {
  constructor(private readonly reflector: Reflector) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const res = context
      .switchToHttp()
      .getResponse<{ setHeader: (k: string, v: string) => void }>();
    res.setHeader('X-API-Version', API_VERSION);

    const sunset = this.reflector.getAllAndOverride<string>(DEPRECATED_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (sunset) {
      res.setHeader('Deprecation', 'true');
      res.setHeader('Sunset', new Date(sunset).toUTCString());
    }
    return next.handle().pipe(tap(() => undefined));
  }
}
